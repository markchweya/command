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
const ROOT = path.resolve(process.env.COMMAND_ROOT ?? process.cwd());
const TOKEN = process.env.COMMAND_TOKEN ?? "";

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

function requireAuth(req) {
  if (!TOKEN) return;
  const header = req.headers["authorization"] ?? "";
  if (header !== `Bearer ${TOKEN}`) {
    throw new Error("Unauthorized");
  }
}

function jsonText(obj) {
  return [{ type: "text", text: JSON.stringify(obj) }];
}

/* -------------------- MCP Server -------------------- */

function createCommandServer() {
  const server = new McpServer({ name: "command", version: "0.2.0" });

  /* ---------- WRITE FILE ---------- */
  server.registerTool(
    "write_file",
    {
      title: "Write file",
      description: "Creates or overwrites a file.",
      inputSchema: {
        path: z.string().min(1),
        content: z.string()
      }
    },
    async (args) => {
      const abs = safeResolve(args.path);

      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, args.content, "utf8");

      return {
        content: jsonText({ success: true })
      };
    }
  );

  /* ---------- APPLY PATCH (NEW) ---------- */
  server.registerTool(
    "apply_patch",
    {
      title: "Apply patch",
      description: "Applies a find/replace patch to a file safely.",
      inputSchema: {
        path: z.string().min(1),
        find: z.string().min(1),
        replace: z.string()
      }
    },
    async (args) => {
      const abs = safeResolve(args.path);

      const original = await fs.readFile(abs, "utf8");

      if (!original.includes(args.find)) {
        throw new Error("Target text not found in file.");
      }

      const updated = original.replace(args.find, args.replace);

      await fs.writeFile(abs, updated, "utf8");

      return {
        content: jsonText({
          success: true,
          message: "Patch applied"
        })
      };
    }
  );

  return server;
}

const mcpServer = createCommandServer();

/* -------------------- HTTP Layer -------------------- */

const httpServer = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // Health check
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("Command MCP server");
      return;
    }

    // Simple write endpoint (optional legacy support)
    if (req.method === "POST" && url.pathname === "/write") {
      let body = "";

      req.on("data", chunk => body += chunk);

      req.on("end", async () => {
        try {
          const { path: relPath, content } = JSON.parse(body);

          const abs = safeResolve(relPath);

          await fs.mkdir(path.dirname(abs), { recursive: true });
          await fs.writeFile(abs, content, "utf8");

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));

        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      return;
    }

    // MCP preflight
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

    // MCP handler
    if (url.pathname === MCP_PATH) {
      requireAuth(req);

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

      const transport = new StreamableHTTPServerTransport({
        enableJsonResponse: true
      });

      res.on("close", () => transport.close());

      await mcpServer.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(404).end("Not Found");

  } catch (e) {
    if (!res.headersSent) {
      res.writeHead(500).end(e?.message ?? "Error");
    }
  }
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Command MCP listening on http://localhost:${port}`);
  console.log(`MCP endpoint: http://localhost:${port}${MCP_PATH}`);
  console.log(`ROOT: ${ROOT}`);
});
