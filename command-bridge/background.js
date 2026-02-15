chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

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
          arguments: args
        }
      })
    });

    return response.json();
  }

  (async () => {
    try {

      // WRITE FILE
      if (message.type === "WRITE_FILE") {
        const data = await callMcp("write_file", {
          path: message.path,
          content: message.content
        });

        sendResponse({ success: true, data });
        return;
      }

      // APPLY PATCH
      if (message.type === "APPLY_PATCH") {
        const data = await callMcp("apply_patch", {
          path: message.path,
          find: message.find,
          replace: message.replace
        });

        sendResponse({ success: true, data });
        return;
      }

      // READ FILE
      if (message.type === "READ_FILE") {
        const data = await callMcp("read_file", {
          path: message.path
        });

        sendResponse({ success: true, data });
        return;
      }

      // LIST FILES
      if (message.type === "LIST_FILES") {
        const data = await callMcp("list_files", {
          path: message.path || "."
        });

        sendResponse({ success: true, data });
        return;
      }

      // Unknown message type
      sendResponse({ success: false, error: "Unknown message type" });

    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep message port open
});
