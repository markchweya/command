chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "WRITE_FILE") {
    try {
      const res = await fetch("http://localhost:8787/write", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          path: message.path,
          content: message.content
        })
      });

      const data = await res.json();

      if (!res.ok) {
        sendResponse({ success: false, error: data.error || "Server error" });
        return;
      }

      sendResponse({ success: true, data });

    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }

  return true; // keeps message channel open for async response
});
