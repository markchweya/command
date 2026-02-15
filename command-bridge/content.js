let lastWrittenMessageId = null;
let debounceTimer = null;

function writeFirstCodeBlock() {
  try {
    const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
    if (!assistantMessages.length) return;

    const lastMessage = assistantMessages[assistantMessages.length - 1];

    const messageId = lastMessage.getAttribute("data-message-id") || assistantMessages.length;

    if (messageId === lastWrittenMessageId) {
      return; // Already processed
    }

    const codeBlock = lastMessage.querySelector("pre");
    if (!codeBlock) return;

    const codeToWrite = codeBlock.innerText
      .replace(/^javascript\s*/i, "")
      .replace(/Copy code\s*/i, "");

    lastWrittenMessageId = messageId;

    chrome.runtime.sendMessage(
      {
        type: "WRITE_FILE",
        path: "auto-generated.js",
        content: codeToWrite
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn("Extension context error:", chrome.runtime.lastError.message);
          return;
        }

        console.log("Auto write response:", response);
      }
    );

  } catch (err) {
    console.warn("Content script error:", err.message);
  }
}

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    writeFirstCodeBlock();
  }, 600); // debounce 600ms
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
