javascript: (async function () {
  let oldBox = document.getElementById("my-tool-box");

  if (oldBox) {
    let content = oldBox.querySelector("#toolContent");
    content.style.display = content.style.display === "none" ? "block" : "none";
    return;
  }

  let isRunning = false;
  let data = [];
  let chap = 1;

  let lastUrl = null;
  let lastContent = "";

  function btnStyle() {
    return `
      background:linear-gradient(45deg,#7b2ff7,#9d4edd);
      border:none;
      padding:10px 20px;
      color:#fff;
      border-radius:20px;
      cursor:pointer;
      font-weight:bold;
      box-shadow:0 4px 10px rgba(0,0,0,0.3);
    `;
  }

  // ===== UI =====
  let box = document.createElement("div");
  box.id = "my-tool-box";
  box.style = `
    position:fixed;
    top:50%;
    left:50%;
    transform:translate(-50%,-50%);
    z-index:999999;
    background:#111827;
    padding:20px;
    border-radius:20px;
    width:400px;
    text-align:center;
    box-shadow:0 10px 30px rgba(0,0,0,0.5);
    font-family:'Segoe UI', Roboto, Arial, sans-serif;
    color:#fff;
  `;

  box.innerHTML = `
    <div id="dragHeader" style="cursor:move;font-weight:bold;font-size:16px;">
      ⚙️ TOOL
    </div>

    <div id="toolContent">
      <div style="background:#1e1e1e;border-radius:12px;height:160px;margin:15px 0;overflow:hidden;">
        <textarea id="outputText" style="
          width:100%;height:100%;background:#1e1e1e;color:#ffffff;
          border:none;outline:none;resize:none;padding:12px;
          font-size:14px;line-height:1.6;
        "></textarea>
      </div>

      <div id="status" style="margin-bottom:10px;"></div>

      <div style="display:flex;justify-content:space-around;">
        <button id="autoBtn" style="${btnStyle()}">AUTO</button>
        <button id="runTool" style="${btnStyle()}">GO</button>
        <button id="copyText" style="${btnStyle()}">COPY</button>
      </div>
    </div>
  `;

  document.body.appendChild(box);

  let textarea = document.getElementById("outputText");
  let status = document.getElementById("status");
  let btn = document.getElementById("autoBtn");

  // ===== DRAG =====
  let isDragging = false,
    offsetX = 0,
    offsetY = 0;
  let header = document.getElementById("dragHeader");

  header.onmousedown = (e) => {
    isDragging = true;
    offsetX = e.clientX - box.offsetLeft;
    offsetY = e.clientY - box.offsetTop;
    box.style.transform = "none";
  };

  document.onmousemove = (e) => {
    if (isDragging) {
      box.style.left = e.clientX - offsetX + "px";
      box.style.top = e.clientY - offsetY + "px";
    }
  };

  document.onmouseup = () => (isDragging = false);

  header.onclick = () => {
    let content = document.getElementById("toolContent");
    content.style.display = content.style.display === "none" ? "block" : "none";
  };

  // ===== EXTRACT =====
  function extractText() {
    let mapping = {};

    for (let sheet of document.styleSheets) {
      try {
        for (let rule of sheet.cssRules) {
          if (rule.selectorText && rule.selectorText.includes("::before")) {
            let cls = rule.selectorText.match(/\.([a-z0-9\-]+)/);
            let content = rule.style.content;
            if (cls && content) {
              mapping[cls[1]] = content.replace(/["']/g, "");
            }
          }
        }
      } catch (e) {}
    }

    document.querySelectorAll("span").forEach((span) => {
      let cls = span.className.split(" ")[0];
      if (mapping[cls]) span.outerHTML = mapping[cls];
    });

    let text = document.body.innerText;

    if (text.includes(">>")) {
      text = text.split(">>")[0];
    }

    text = text.replace(/\n{3,}/g, "\n\n").trim();

    return text;
  }

  // ===== WAIT LOAD =====
  async function waitContentChange(oldContent) {
    return new Promise((resolve) => {
      let count = 0;

      let check = setInterval(() => {
        if (!isRunning) {
          clearInterval(check);
          resolve("stop");
        }

        let now = extractText();

        if (now !== oldContent && now.length > 100) {
          clearInterval(check);
          setTimeout(() => resolve("ok"), 500);
        }

        count++;
        if (count > 40) {
          // ~12s timeout
          clearInterval(check);
          resolve("timeout");
        }
      }, 300);
    });
  }

  // ===== NEXT =====
  function nextPage() {
    let btn = [...document.querySelectorAll("a")].find((a) =>
      a.innerText.includes(">>"),
    );

    if (!btn) return false;

    let href = btn.getAttribute("href");
    if (!href || href === "#") return false;

    btn.click();
    return true;
  }

  // ===== DOWNLOAD =====
  function download() {
    let blob = new Blob([data.join("")], { type: "text/plain" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "truyen.txt";
    a.click();
  }

  // ===== AUTO =====
  async function autoRun() {
    isRunning = true;
    status.innerText = "⏳ Đang chạy...";
    btn.innerText = "STOP";

    while (isRunning) {
      let text = extractText();

      // tránh trùng nội dung
      if (text === lastContent) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      lastContent = text;

      data.push(`\n\n===== CHƯƠNG ${chap} =====\n\n` + text);
      textarea.value = `✔️ Đã lấy chương ${chap}`;
      chap++;

      let ok = nextPage();

      if (!ok) {
        status.innerText = "✔️ Hết chương";
        break;
      }

      let result = await waitContentChange(text);

      if (result === "stop") break;
    }

    isRunning = false;
    btn.innerText = "AUTO";
    status.innerText = "💾 Đang tải file...";
    download();
  }

  // ===== BUTTON =====
  btn.onclick = () => {
    if (isRunning) {
      isRunning = false;
      status.innerText = "⛔ Đã dừng";
    } else {
      autoRun();
    }
  };

  document.getElementById("runTool").onclick = () => {
    textarea.value = extractText();
  };

  document.getElementById("copyText").onclick = () => {
    textarea.select();
    document.execCommand("copy");
  };
})();
