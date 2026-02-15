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

    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});
