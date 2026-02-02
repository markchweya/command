// server.js
import { createServer } from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

/* -------------------- Config -------------------- */
const port = Number(process.env.PORT ?? 8787);
const MCP_PATH = "/mcp";

// Set this to your repo/workspace root (the folder you open in VS Code)
const ROOT = path.resolve(process.env.COMMAND_ROOT ?? process.cwd());

// Optional: require a token so random people on the internet can’t call your tools
const TOKEN = process.env.COMMAND_TOKEN ?? ""; // if empty, auth is disabled

// Basic exclusions for repo walking
const DENY_DIRS = new Set([".git", "node_modules", ".next", "dist", "build", "out"]);
const MAX_FILE_BYTES = 400_000; // ~400KB per read
const MAX_SEARCH_FILES = 4000;  // safety cap
const MAX_RESULTS = 200;

// Command allow-list (tight by default)
const ALLOWED_EXECUTABLES = new Set([
  "npm", "pnpm", "yarn",
  "node",
  "python", "python3",
  "pytest",
  "git"
]);

// For git, allow only read-only-ish subcommands
const GIT_ALLOWED_SUBCOMMANDS = new Set([
  "status", "diff", "log", "show", "branch", "rev-parse"
]);

/* -------------------- Helpers -------------------- */
function isSubpath(child, parent) {
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function safeResolve(p) {
  const resolved = path.resolve(ROOT, p ?? ".");
  if (resolved === ROOT) return resolved;
  if (!isSubpath(resolved, ROOT)) {
    throw new Error("Path escapes COMMAND_ROOT.");
  }
  return resolved;
}

function isProbablyBinary(buf) {
  let zeros = 0;
  const step = Math.max(1, Math.ceil(buf.length / 200));
  for (let i = 0; i < buf.length; i += step) {
    if (buf[i] === 0) zeros++;
    if (zeros >= 2) return true;
  }
  return false;
}

async function walkDir(baseAbs, relBase, maxDepth, out) {
  if (maxDepth < 0) return;

  const entries = await fs.readdir(baseAbs, { withFileTypes: true });
  for (const ent of entries) {
    const name = ent.name;

    // hide dotfiles by default (you can loosen later)
    if (name.startsWith(".") && name !== ".env.example") continue;

    if (ent.isDirectory() && DENY_DIRS.has(name)) continue;

    const relPath = path.join(relBase, name);
    const absPath = path.join(baseAbs, name);

    if (ent.isDirectory()) {
      out.push({ type: "dir", path: relPath });
      await walkDir(absPath, relPath, maxDepth - 1, out);
    } else if (ent.isFile()) {
      const st = await fs.stat(absPath);
      out.push({ type: "file", path: relPath, bytes: st.size });
    }
  }
}

function requireAuth(req) {
  if (!TOKEN) return; // auth disabled
  const header = req.headers["authorization"] ?? "";
  if (header !== `Bearer ${TOKEN}`) throw new Error("Unauthorized (bad/missing Bearer token).");
}

function jsonText(obj) {
  return [{ type: "text", text: JSON.stringify(obj) }];
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/* -------------------- MCP Server -------------------- */
function createCommandServer() {
  const server = new McpServer({ name: "command", version: "0.1.0" });

  // list_files
  server.registerTool(
    "list_files",
    {
      title: "List files",
      description: "Lists files under COMMAND_ROOT (repo). Skips node_modules/.git/etc.",
      inputSchema: {
        path: z.string().optional(),
        maxDepth: z.number().int().min(0).max(10).optional()
      }
    },
    async (args) => {
      const rel = args?.path ?? ".";
      const depth = clamp(args?.maxDepth ?? 4, 0, 10);
      const abs = safeResolve(rel);

      const st = await fs.stat(abs);
      if (!st.isDirectory()) {
        return { content: jsonText({ error: "path is not a directory" }) };
      }

      const items = [];
      await walkDir(abs, rel === "." ? "" : rel, depth, items);

      return {
        content: jsonText({
          root: ROOT,
          listedPath: rel,
          maxDepth: depth,
          items
        })
      };
    }
  );

  // read_file
  server.registerTool(
    "read_file",
    {
      title: "Read file",
      description: "Reads a text file under COMMAND_ROOT with optional line range.",
      inputSchema: {
        path: z.string().min(1),
        startLine: z.number().int().min(1).optional(),
        endLine: z.number().int().min(1).optional()
      }
    },
    async (args) => {
      const rel = args?.path;
      const abs = safeResolve(rel);

      const st = await fs.stat(abs);
      if (!st.isFile()) return { content: jsonText({ error: "not a file" }) };
      if (st.size > MAX_FILE_BYTES) return { content: jsonText({ error: `file too large (${st.size} bytes)` }) };

      const buf = await fs.readFile(abs);
      if (isProbablyBinary(buf)) return { content: jsonText({ error: "looks like a binary file" }) };

      const text = buf.toString("utf8");
      const lines = text.split(/\r?\n/);

      const start = clamp(args?.startLine ?? 1, 1, lines.length);
      const end = clamp(args?.endLine ?? lines.length, start, lines.length);

      const slice = lines.slice(start - 1, end).map((ln, i) => {
        const n = start + i;
        return `${String(n).padStart(4, " ")} | ${ln}`;
      });

      return { content: [{ type: "text", text: slice.join("\n") }] };
    }
  );

  // search_in_files
  server.registerTool(
    "search_in_files",
    {
      title: "Search in repo",
      description: "Search literal string (or regex) across text files under COMMAND_ROOT.",
      inputSchema: {
        query: z.string().min(1),
        useRegex: z.boolean().optional(),
        maxResults: z.number().int().min(1).max(MAX_RESULTS).optional()
      }
    },
    async (args) => {
      const query = args?.query ?? "";
      const useRegex = !!args?.useRegex;
      const maxResults = clamp(args?.maxResults ?? 80, 1, MAX_RESULTS);

      let re;
      if (useRegex) re = new RegExp(query, "i");

      const results = [];
      let filesScanned = 0;

      async function scanDir(dirAbs, dirRel) {
        if (results.length >= maxResults) return;
        if (filesScanned >= MAX_SEARCH_FILES) return;

        const entries = await fs.readdir(dirAbs, { withFileTypes: true });
        for (const ent of entries) {
          if (results.length >= maxResults) return;
          if (filesScanned >= MAX_SEARCH_FILES) return;

          const name = ent.name;
          if (name.startsWith(".")) continue;
          if (ent.isDirectory() && DENY_DIRS.has(name)) continue;

          const nextAbs = path.join(dirAbs, name);
          const nextRel = dirRel ? path.join(dirRel, name) : name;

          if (ent.isDirectory()) {
            await scanDir(nextAbs, nextRel);
          } else if (ent.isFile()) {
            filesScanned++;
            const st = await fs.stat(nextAbs);
            if (st.size > MAX_FILE_BYTES) continue;

            const buf = await fs.readFile(nextAbs);
            if (isProbablyBinary(buf)) continue;

            const text = buf.toString("utf8");
            const lines = text.split(/\r?\n/);

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const hit = useRegex ? re.test(line) : line.toLowerCase().includes(query.toLowerCase());
              if (hit) {
                results.push({ file: nextRel, line: i + 1, text: line.slice(0, 400) });
                if (results.length >= maxResults) break;
              }
            }
          }
        }
      }

      await scanDir(ROOT, "");

      return { content: jsonText({ query, useRegex, filesScanned, results }) };
    }
  );

  // run_command (restricted)
  server.registerTool(
    "run_command",
    {
      title: "Run command",
      description: "Runs a restricted command under COMMAND_ROOT (build/test/lint). Destructive patterns blocked.",
      inputSchema: {
        command: z.string().min(1),
        args: z.array(z.string()).optional(),
        cwd: z.string().optional(),
        timeoutMs: z.number().int().min(1000).max(120000).optional()
      }
    },
    async (args) => {
      const command = (args?.command ?? "").trim();
      const argv = args?.args ?? [];
      const cwdRel = args?.cwd ?? ".";
      const cwdAbs = safeResolve(cwdRel);
      const timeoutMs = clamp(args?.timeoutMs ?? 45000, 1000, 120000);

      if (!ALLOWED_EXECUTABLES.has(command)) {
        return { content: jsonText({ error: `command not allowed: ${command}` }) };
      }

      if (command === "git") {
        const sub = (argv[0] ?? "").trim();
        if (!GIT_ALLOWED_SUBCOMMANDS.has(sub)) {
          return { content: jsonText({ error: `git subcommand not allowed: ${sub}` }) };
        }
      }

      const joined = [command, ...argv].join(" ").toLowerCase();
      const banned = ["rm -rf", "del /f", "format", "shutdown", "reboot", "wipe", "diskpart", "mkfs"];
      if (banned.some((b) => joined.includes(b))) {
        return { content: jsonText({ error: "blocked: looks destructive" }) };
      }

      const started = Date.now();

      const child = spawn(command, argv, { cwd: cwdAbs, shell: false, windowsHide: true });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (d) => (stdout += d.toString("utf8")));
      child.stderr.on("data", (d) => (stderr += d.toString("utf8")));

      const exitCode = await new Promise((resolve) => {
        const to = setTimeout(() => {
          try { child.kill("SIGKILL"); } catch {}
          resolve(-1);
        }, timeoutMs);

        child.on("close", (code) => {
          clearTimeout(to);
          resolve(code ?? 0);
        });
      });

      const durationMs = Date.now() - started;
      const trim = (s) => (s.length > 12000 ? s.slice(0, 12000) + "\n(truncated)" : s);

      return {
        content: jsonText({
          cwd: cwdRel,
          command,
          args: argv,
          exitCode,
          durationMs,
          stdout: trim(stdout),
          stderr: trim(stderr)
        })
      };
    }
  );

  return server;
}

/* -------------------- HTTP host (/mcp) -------------------- */
const httpServer = createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    //  Public health check (NO auth)
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/plain" }).end("Command MCP server");
      return;
    }

    //  Public CORS preflight for MCP (NO auth)
    if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "content-type, mcp-session-id, authorization",
        "Access-Control-Expose-Headers": "Mcp-Session-Id"
      });
      res.end();
      return;
    }

    //  Only /mcp requires auth
    if (url.pathname === MCP_PATH) {
      requireAuth(req);
    }

    const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
    if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

      const server = createCommandServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });

      res.on("close", () => {
        transport.close();
        server.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(404).end("Not Found");
  } catch (e) {
    const msg = e?.message ?? "Internal error";
    if (!res.headersSent) res.writeHead(401).end(msg);
  }
});

httpServer.listen(port, () => {
  console.log(`Command MCP listening on http://localhost:${port}${MCP_PATH}`);
  console.log(`ROOT: ${ROOT}`);
  console.log(`Auth: ${TOKEN ? "enabled" : "disabled"}`);
});
