let lastWrittenMessageId = null;
let debounceTimer = null;

/* -------------------- Utilities -------------------- */

function tryParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function sendMessageToBackground(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Extension context error:", chrome.runtime.lastError.message);
        resolve(null);
        return;
      }
      resolve(response);
    });
  });
}

function extractFileNames(text) {
  const regex = /\b[\w\-\/\.]+\.(js|ts|jsx|tsx|json|css|html)\b/g;
  return text.match(regex) || [];
}

/* -------------------- Assistant Code Processing -------------------- */

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

    const parsed = tryParseJSON(rawText);

    if (!parsed) {
      chrome.runtime.sendMessage({
        type: "WRITE_FILE",
        path: "auto-generated.js",
        content: rawText
      });
      return;
    }

    if (parsed.operation === "patch" && parsed.file) {
      chrome.runtime.sendMessage({
        type: "APPLY_PATCH",
        path: parsed.file,
        find: parsed.find,
        replace: parsed.replace
      });
      return;
    }

  } catch (err) {
    console.warn("Assistant processing error:", err.message);
  }
}

/* -------------------- Auto Context Injection -------------------- */

async function interceptAndInject() {
  const textarea = document.querySelector("textarea");
  if (!textarea) return;

  const userText = textarea.value;
  const files = extractFileNames(userText);

  if (!files.length) return;

  console.log("Detected file references:", files);

  let contextBlock = "\n\n--- PROJECT CONTEXT ---\n";

  for (const file of files) {
    const response = await sendMessageToBackground({
      type: "READ_FILE",
      path: file
    });

    if (response?.data?.result?.content?.[0]?.text) {
      const content = response.data.result.content[0].text;
      contextBlock += `\nFile: ${file}\n${content}\n`;
    }
  }

  contextBlock += "\n--- END CONTEXT ---\n\n";

  textarea.value = contextBlock + "User Request:\n" + userText;
}

/* -------------------- Send Hook -------------------- */

function hookSendButton() {
  document.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const textarea = document.querySelector("textarea");
      if (!textarea || !textarea.value.trim()) return;

      e.preventDefault();
      await interceptAndInject();

      setTimeout(() => {
        textarea.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true
        }));
      }, 100);
    }
  });
}

/* -------------------- Observers -------------------- */

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

hookSendButton();
