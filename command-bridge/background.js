chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "WRITE_FILE") return;

  (async () => {
    try {
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
            name: "write_file",
            arguments: {
              path: message.path,
              content: message.content
            }
          }
        })
      });

      const data = await response.json();

      sendResponse({ success: true, data });

    } catch (err) {
      sendResponse({
        success: false,
        error: err.message || "Unknown error"
      });
    }
  })();

  return true; // critical: keeps port open
});
