import express from "express";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";
import http from "http";

/* -------------------- Setup -------------------- */

const app = express();
app.use(bodyParser.json({ limit: "5mb" }));

// CORS for ChatGPT
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const sessions = new Map();

/* -------------------- WebSocket (CLI Tunnel) -------------------- */

wss.on("connection", (ws, req) => {
  try {
    const url = new URL(req.url, "http://dummy");
    const sessionId = url.searchParams.get("session");

    if (!sessionId) {
      ws.close();
      return;
    }

    console.log("CLI connected:", sessionId);
    sessions.set(sessionId, ws);

    ws.on("close", () => {
      console.log("CLI disconnected:", sessionId);
      sessions.delete(sessionId);
    });

  } catch (err) {
    console.error("WebSocket connection error:", err);
    ws.close();
  }
});

/* -------------------- MCP Endpoint (ChatGPT) -------------------- */

app.post("/mcp/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const ws = sessions.get(sessionId);

  if (!ws) {
    return res.status(404).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Session not found" },
      id: null
    });
  }

  const requestId = Date.now().toString();

  const message = {
    requestId,
    payload: req.body
  };

  // Timeout protection (15s)
  const timeout = setTimeout(() => {
    res.status(504).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Tunnel timeout" },
      id: null
    });
  }, 15000);

  try {
    ws.send(JSON.stringify(message));

    ws.once("message", (data) => {
      clearTimeout(timeout);

      try {
        const response = JSON.parse(data.toString());

        if (response.requestId === requestId) {
          return res.json(response.payload);
        }

        return res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32002, message: "Mismatched response" },
          id: null
        });

      } catch (err) {
        return res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32003, message: "Invalid response from client" },
          id: null
        });
      }
    });

  } catch (err) {
    clearTimeout(timeout);
    return res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32004, message: "Relay send failed" },
      id: null
    });
  }
});

/* -------------------- Health Check -------------------- */

app.get("/", (req, res) => {
  res.send("Command Relay Running");
});

/* -------------------- Start Server -------------------- */

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Relay running on port ${PORT}`);
});
