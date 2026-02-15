let lastWrittenMessageId = null;
let debounceTimer = null;

function tryParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function processAssistantMessage() {
  try {
    const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
    if (!assistantMessages.length) return;

    const lastMessage = assistantMessages[assistantMessages.length - 1];

    const messageId =
      lastMessage.getAttribute("data-message-id") ||
      assistantMessages.length;

    if (messageId === lastWrittenMessageId) return;

    const codeElement = lastMessage.querySelector("pre code");
    if (!codeElement) return;

    const rawText = codeElement.textContent.trim();

    lastWrittenMessageId = messageId;

    console.log("Raw extracted code:", rawText);

    // Try structured patch
    const parsed = tryParseJSON(rawText);

    if (
      parsed &&
      parsed.file &&
      parsed.operation === "patch" &&
      parsed.find &&
      parsed.replace
    ) {
      console.log("Detected PATCH operation");

      chrome.runtime.sendMessage(
        {
          type: "APPLY_PATCH",
          path: parsed.file,
          find: parsed.find,
          replace: parsed.replace
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Extension context error:", chrome.runtime.lastError.message);
            return;
          }
          console.log("Patch response:", response);
        }
      );

      return;
    }

    // Normal overwrite mode
    console.log("Detected normal code block → overwrite mode");

    chrome.runtime.sendMessage(
      {
        type: "WRITE_FILE",
        path: "auto-generated.js",
        content: rawText
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
    processAssistantMessage();
  }, 600);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
