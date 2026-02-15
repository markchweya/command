import WebSocket from "ws";
import { spawn } from "child_process";
import { v4 as uuid } from "uuid";

const RELAY = "ws://localhost:3000";

if (process.argv[2] === "connect") {
  const sessionId = uuid();
  const token = uuid();

  console.log("Session ID:", sessionId);
  console.log("Token:", token);

  const ws = new WebSocket(`${RELAY}?session=${sessionId}`);

  ws.on("open", () => {
    console.log("Connected to relay.");
  });

  ws.on("message", async (data) => {
    const msg = JSON.parse(data.toString());

    // Forward to local MCP
    const response = await fetch("http://localhost:8787/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json, text/event-stream"
      },
      body: JSON.stringify(msg.payload)
    });

    const json = await response.json();

    ws.send(JSON.stringify({
      requestId: msg.requestId,
      payload: json
    }));
  });

  spawn("node", ["server.js"], {
    stdio: "inherit",
    env: {
      ...process.env,
      COMMAND_TOKEN: token
    }
  });

  console.log(`
Connect ChatGPT to:
http://localhost:3000/mcp/${sessionId}
`);
}
