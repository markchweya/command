#!/usr/bin/env node

import WebSocket from "ws";
import { spawn } from "child_process";
import { v4 as uuid } from "uuid";

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

    // Start local MCP server
    const mcp = spawn("node", ["server.js"], {
      env: {
        ...process.env,
        COMMAND_TOKEN: token
      },
      stdio: ["pipe", "pipe", "pipe"]
    });

    mcp.stdout.on("data", (data) => {
      process.stdout.write(data.toString());
    });

    mcp.stderr.on("data", (data) => {
      process.stderr.write(data.toString());
    });

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
            error: { code: -32099, message: err.message },
            id: null
          }
        }));
      }
    });

  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });

}
