#!/usr/bin/env node

import WebSocket from "ws";
import { spawn } from "child_process";
import { v4 as uuid } from "uuid";
import { fileURLToPath } from "url";
import path from "path";

const RELAY = "wss://command-9342.onrender.com";

if (process.argv.includes("connect")) {

  const sessionId = uuid();
  const token = uuid();

  console.log("Session ID:", sessionId);
  console.log("Token:", token);
  console.log("");
  console.log("Connect ChatGPT to:");
  console.log(`https://command-9342.onrender.com/mcp/${sessionId}`);
  console.log("");

  const ws = new WebSocket(`${RELAY}?session=${sessionId}`);

  ws.on("open", () => {
    console.log("Connected to relay.");

    // Resolve path to internal server.js (NOT project folder)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const serverPath = path.join(__dirname, "server.js");

    // Start local MCP server scoped to current working directory
    const mcp = spawn("node", [serverPath], {
      env: {
        ...process.env,
        COMMAND_TOKEN: token,
        COMMAND_ROOT: process.cwd() // scope to current folder
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    mcp.stdout.on("data", (data) => {
      process.stdout.write(data.toString());
    });

    mcp.stderr.on("data", (data) => {
      process.stderr.write(data.toString());
    });

    // Forward relay messages to local MCP
    ws.on("message", async (msg) => {
      const { requestId, payload } = JSON.parse(msg.toString());

      try {
        const response = await fetch("http://localhost:8787/mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        ws.send(JSON.stringify({
          requestId,
          payload: result
        }));

      } catch (err) {
        ws.send(JSON.stringify({
          requestId,
          payload: {
            jsonrpc: "2.0",
            error: {
              code: -32099,
              message: err.message
            },
            id: null
          }
        }));
      }
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log("\nShutting down...");
      ws.close();
      mcp.kill();
      process.exit();
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });

} else {
  console.log("Usage:");
  console.log("  command connect");
}
