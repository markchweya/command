/* ===============================
   Session + MCP Bridge Layer
   =============================== */

const STORAGE_KEY = "copilot_sessions";
const LOCK_KEY = "copilot_project_locks";

/* ---------- MCP CALL ---------- */

async function callMcp(toolName, args) {
  const response = await fetch("http://localhost:8787/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args || {}
      }
    })
  });

  return response.json();
}

/* ---------- STORAGE HELPERS ---------- */

function getStorage(keys) {
  return new Promise(resolve => {
    chrome.storage.local.get(keys, resolve);
  });
}

function setStorage(data) {
  return new Promise(resolve => {
    chrome.storage.local.set(data, resolve);
  });
}

/* ---------- SESSION HELPERS ---------- */

function extractConversationId(url) {
  const match = url.match(/\/c\/([a-f0-9\-]+)/i);
  return match ? match[1] : null;
}

async function getSession(conversationId) {
  const data = await getStorage([STORAGE_KEY]);
  return data[STORAGE_KEY]?.[conversationId] || null;
}

async function connectSession(conversationId) {
  const rootResponse = await callMcp("get_root");

  const root =
    rootResponse?.result?.content?.[0]?.text &&
    JSON.parse(rootResponse.result.content[0].text).root;

  if (!root) throw new Error("Could not determine project root.");

  const data = await getStorage([STORAGE_KEY, LOCK_KEY]);

  const sessions = data[STORAGE_KEY] || {};
  const locks = data[LOCK_KEY] || {};

  // Enforce single chat per project
  if (locks[root] && locks[root] !== conversationId) {
    throw new Error("Project already connected to another chat.");
  }

  sessions[conversationId] = {
    projectRoot: root,
    connectedAt: Date.now()
  };

  locks[root] = conversationId;

  await setStorage({
    [STORAGE_KEY]: sessions,
    [LOCK_KEY]: locks
  });

  return root;
}

async function disconnectSession(conversationId) {
  const data = await getStorage([STORAGE_KEY, LOCK_KEY]);

  const sessions = data[STORAGE_KEY] || {};
  const locks = data[LOCK_KEY] || {};

  const session = sessions[conversationId];
  if (!session) return;

  delete locks[session.projectRoot];
  delete sessions[conversationId];

  await setStorage({
    [STORAGE_KEY]: sessions,
    [LOCK_KEY]: locks
  });
}

/* ===============================
   MESSAGE LISTENER
   =============================== */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const conversationId = extractConversationId(sender.url || "");
      if (!conversationId) {
        sendResponse({ success: false, error: "No conversation ID." });
        return;
      }

      /* ---------- CHAT COMMANDS ---------- */

      if (message.type === "CONNECT_SESSION") {
        const root = await connectSession(conversationId);
        sendResponse({ success: true, root });
        return;
      }

      if (message.type === "DISCONNECT_SESSION") {
        await disconnectSession(conversationId);
        sendResponse({ success: true });
        return;
      }

      if (message.type === "SESSION_STATUS") {
        const session = await getSession(conversationId);
        sendResponse({ success: true, session });
        return;
      }

      /* ---------- GUARD CHECK ---------- */

      const session = await getSession(conversationId);
      if (!session) {
        sendResponse({
          success: false,
          error: "Chat not connected to any project."
        });
        return;
      }

      /* ---------- MCP FILE OPERATIONS ---------- */

      if (message.type === "WRITE_FILE") {
        const data = await callMcp("write_file", {
          path: message.path,
          content: message.content
        });

        sendResponse({ success: true, data });
        return;
      }

      if (message.type === "APPLY_PATCH") {
        const data = await callMcp("apply_patch", {
          path: message.path,
          find: message.find,
          replace: message.replace
        });

        sendResponse({ success: true, data });
        return;
      }

      if (message.type === "READ_FILE") {
        const data = await callMcp("read_file", {
          path: message.path
        });

        sendResponse({ success: true, data });
        return;
      }

      if (message.type === "LIST_FILES") {
        const data = await callMcp("list_files", {
          path: message.path || "."
        });

        sendResponse({ success: true, data });
        return;
      }

      sendResponse({ success: false, error: "Unknown message type" });

    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});
