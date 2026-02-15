function writeFirstCodeBlock() {
  if (!window.chrome || !chrome.runtime) return;

  const blocks = Array.from(document.querySelectorAll("pre"));

  if (blocks.length === 0) return;

  const cleaned = blocks.map(pre =>
    pre.innerText
      .replace(/^javascript\s*/i, "")
      .replace(/Copy code\s*/i, "")
  );

  const codeToWrite = cleaned[0];

  chrome.runtime.sendMessage({
    type: "WRITE_FILE",
    path: "auto-generated.js",
    content: codeToWrite
  }, response => {
    console.log("Auto write response:", response);
  });
}

function observeChatGPT() {
  const observer = new MutationObserver(() => {
    writeFirstCodeBlock();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

window.addEventListener("load", () => {
  setTimeout(() => {
    observeChatGPT();
  }, 1000);
});
