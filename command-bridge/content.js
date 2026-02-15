let lastWrittenMessageId = null;
let debounceTimer = null;

/* ===============================
   Utilities
   =============================== */

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

function showLocalMessage(message) {
  const container = document.createElement("div");
  container.textContent = message;
  container.style.position = "fixed";
  container.style.bottom = "20px";
  container.style.right = "20px";
  container.style.background = "#111";
  container.style.color = "#fff";
  container.style.padding = "10px 15px";
  container.style.borderRadius = "8px";
  container.style.zIndex = 999999;
  container.style.fontSize = "12px";
  container.style.boxShadow = "0 0 10px rgba(0,0,0,0.4)";
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 3000);
}

/* ===============================
   Assistant Code Processing
   =============================== */

function processAssistantMessage() {
  try {
    const assistantMessages = document.querySelectorAll(
      '[data-message-author-role="assistant"]'
    );
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

/* ===============================
   Session Command Handler
   =============================== */

async function handleCommand(userText) {
  const trimmed = userText.trim();

  if (!trimmed.startsWith("/")) return false;

  const textarea = document.querySelector("textarea");
  if (textarea) textarea.value = ""; // clear immediately to block ChatGPT slash UI

  if (trimmed === "/connect") {
    const res = await sendMessageToBackground({ type: "CONNECT_SESSION" });
    if (res?.success) {
      showLocalMessage("Connected to project.");
    } else {
      showLocalMessage("Connect failed.");
    }
    return true;
  }

  if (trimmed === "/disconnect") {
    await sendMessageToBackground({ type: "DISCONNECT_SESSION" });
    showLocalMessage("Disconnected.");
    return true;
  }

  if (trimmed === "/status") {
    const res = await sendMessageToBackground({ type: "SESSION_STATUS" });
    if (res?.success && res.session) {
      showLocalMessage("Connected to: " + res.session.projectRoot);
    } else {
      showLocalMessage("Not connected.");
    }
    return true;
  }

  return false;
}

/* ===============================
   Auto Context Injection
   =============================== */

async function interceptAndInject() {
  const textarea = document.querySelector("textarea");
  if (!textarea) return false;

  const userText = textarea.value;
  if (!userText.trim()) return false;

  // Slash commands
  const handled = await handleCommand(userText);
  if (handled) return true;

  // File context injection
  const files = extractFileNames(userText);
  if (!files.length) return false;

  let contextBlock = "\n\n--- PROJECT CONTEXT ---\n";

  for (const file of files) {
    const response = await sendMessageToBackground({
      type: "READ_FILE",
      path: file
    });

    if (!response?.success) {
      showLocalMessage("Not connected to project.");
      return true;
    }

    const content =
      response?.data?.result?.content?.[0]?.text;

    if (content) {
      contextBlock += `\nFile: ${file}\n${content}\n`;
    }
  }

  contextBlock += "\n--- END CONTEXT ---\n\n";
  textarea.value = contextBlock + "User Request:\n" + userText;

  return false;
}

/* ===============================
   Stable Submit Intercept
   =============================== */

function hookSubmit() {
  const observer = new MutationObserver(() => {
    const form = document.querySelector("form");
    if (!form || form.__copilot_hooked) return;

    form.__copilot_hooked = true;

    form.addEventListener(
      "submit",
      async (e) => {
        const textarea = document.querySelector("textarea");
        if (!textarea || !textarea.value.trim()) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        const intercepted = await interceptAndInject();
        if (intercepted) return;

        // Clean re-trigger
        form.__copilot_hooked = false;

        setTimeout(() => {
          form.requestSubmit();
        }, 50);
      },
      true
    );
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/* ===============================
   Observers
   =============================== */

const assistantObserver = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    processAssistantMessage();
  }, 600);
});

assistantObserver.observe(document.body, {
  childList: true,
  subtree: true
});

hookSubmit();
