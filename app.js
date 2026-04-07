// ===== Core App =====
const jsonInput = document.getElementById("json-input");
const formatBtn = document.getElementById("format-btn");
const generateBtn = document.getElementById("generate-btn");
const errorMsg = document.getElementById("error-msg");
const jsonStats = document.getElementById("json-stats");
const gridOutput = document.getElementById("grid-output");
const themeToggle = document.getElementById("theme-toggle");
const resizer = document.getElementById("resizer");
const leftPanel = document.getElementById("left-panel");
const hiddenFieldsBar = document.getElementById("hidden-fields-bar");
const trimBtn = document.getElementById("trim-btn");
const shareBtn = document.getElementById("share-btn");

const defaultJson = `{
  "id": 123,
  "obj": {
    "id": "456",
    "name": "555-1234"
  },
  "bool": true,
  "arr": ["a","b"],
  "objs": [
    {
      "orderId": "ORD-001",
      "items": [
        { "itemId": "ITEM-101", "name": "item 1"}
      ]
    },
     {
      "orderId": "ORD-002",
      "items": [
        { "itemId": "ITEM-102", "name": "item 2"}
      ]
    },
  ]
}`;

let currentParsedData = null;
let hiddenFields = new Set();
let hiddenRows = new Set();

// ===== Hide/Unhide =====
window.hideField = function(encodedPath) { hiddenFields.add(decodeURIComponent(encodedPath)); renderGrid(); };
window.unhideField = function(encodedPath) { hiddenFields.delete(decodeURIComponent(encodedPath)); renderGrid(); };
window.hideRow = function(encodedPath) { hiddenRows.add(decodeURIComponent(encodedPath)); renderGrid(); };
window.unhideRow = function(encodedPath) { hiddenRows.delete(decodeURIComponent(encodedPath)); renderGrid(); };
window.unhideAll = function() { hiddenFields.clear(); hiddenRows.clear(); renderGrid(); };

function renderHiddenChips() {
  if (hiddenFields.size === 0 && hiddenRows.size === 0) { hiddenFieldsBar.innerHTML = ""; updateTrimBtn(); return; }
  let html = '<span style="font-size:12px;color:var(--text-muted);">Hidden:</span>';
  html += `<div class="hidden-chip hide-all" onclick="unhideAll()" title="Unhide All"> Unhide All <span>&#x2716;</span></div>`;
  hiddenFields.forEach((f) => {
    const safeF = escapeHtml(f.split(".").pop());
    html += `<div class="hidden-chip" onclick="unhideField('${encodeURIComponent(f)}')" title="${escapeHtml(f)}">Field: ${safeF} <span>&#x2716;</span></div>`;
  });
  hiddenRows.forEach((r) => {
    html += `<div class="hidden-chip" onclick="unhideRow('${encodeURIComponent(r)}')" title="Click to show">Row: ${escapeHtml(r)} <span>&#x2716;</span></div>`;
  });
  hiddenFieldsBar.innerHTML = html;
  updateTrimBtn();
}

function renderGrid() {
  if (!currentParsedData) { gridOutput.innerHTML = ""; return; }
  gridOutput.innerHTML = buildTable(currentParsedData, "root");
  renderHiddenChips();
}

function escapeHtml(unsafe) {
  return (unsafe || "").toString()
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// ===== Resizer =====
let isResizing = false;
resizer.addEventListener("mousedown", () => { isResizing = true; document.body.style.cursor = "col-resize"; jsonInput.style.pointerEvents = "none"; });
document.addEventListener("mousemove", (e) => {
  if (!isResizing) return;
  const minWidth = 300, offsetRight = document.body.offsetWidth - e.clientX;
  if (e.clientX > minWidth && offsetRight > minWidth)
    leftPanel.style.width = `${(e.clientX / document.body.offsetWidth) * 100}%`;
});
document.addEventListener("mouseup", () => { if (isResizing) { isResizing = false; document.body.style.cursor = "default"; jsonInput.style.pointerEvents = "auto"; } });

// ===== Zoom =====
let jsonFontSize = 14, gridFontSize = 13;
function applyZoom(el, size, delta) { const n = size + delta; if (n >= 8 && n <= 48) { el.style.fontSize = n + "px"; return n; } return size; }
jsonInput.addEventListener("wheel", (e) => { if (e.ctrlKey) { e.preventDefault(); jsonFontSize = applyZoom(jsonInput, jsonFontSize, e.deltaY < 0 ? 1 : -1); } }, { passive: false });
gridOutput.addEventListener("wheel", (e) => { if (e.ctrlKey) { e.preventDefault(); gridFontSize = applyZoom(gridOutput, gridFontSize, e.deltaY < 0 ? 1 : -1); } }, { passive: false });

// ===== History =====
let historyStack = [], historyIndex = -1, saveTimeout;
function saveState() {
  const content = jsonInput.innerHTML;
  if (historyStack[historyIndex] !== content) { historyStack = historyStack.slice(0, historyIndex + 1); historyStack.push(content); historyIndex++; }
}
function updateStats() {
  const text = jsonInput.innerText.trim();
  if (!text) { jsonStats.textContent = ""; return; }
  const bytes = new TextEncoder().encode(text).length, len = text.length;
  jsonStats.textContent = `${len.toLocaleString()} chars · ${bytes >= 1024 ? (bytes / 1024).toFixed(1) + " KB" : bytes + " B"}`;
}
jsonInput.addEventListener("input", () => { clearTimeout(saveTimeout); saveTimeout = setTimeout(saveState, 400); updateStats(); });
jsonInput.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) { if (historyIndex < historyStack.length - 1) { historyIndex++; jsonInput.innerHTML = historyStack[historyIndex]; } }
    else { if (historyIndex > 0) { historyIndex--; jsonInput.innerHTML = historyStack[historyIndex]; } }
  }
});
jsonInput.addEventListener("paste", (e) => {
  e.preventDefault();
  document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain"));
  saveState();
});

// ===== Theme =====
themeToggle.addEventListener("click", () => {
  const isDark = document.body.getAttribute("data-theme") === "dark";
  document.body.setAttribute("data-theme", isDark ? "light" : "dark");
  themeToggle.textContent = "Theme: " + (isDark ? "Light" : "Dark");
});

// ===== Syntax Highlight =====
function syntaxHighlight(json) {
  if (!json) return "";
  json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function(match) {
      let color = "var(--json-number)";
      if (/^"/.test(match)) color = /:$/.test(match) ? "var(--json-key)" : "var(--json-string)";
      else if (/true|false/.test(match)) color = "var(--json-boolean)";
      else if (/null/.test(match)) color = "var(--json-null)";
      return `<p style="display:inline;margin:0;color:${color};">${match}</p>`;
    }
  );
}

// ===== Parse & Format =====
function betterJsonParse(jsonString) {
  try {
    return { success: true, data: JSON.parse(jsonString) };
  } catch (err) {
    let line = null;
    let column = null;
    let position = -1;
    let snippet = '';

    const errMsg = err.message;

    const posMatch = errMsg.match(/position\s+(\d+)/);
    const lineColMatch = errMsg.match(/line\s+(\d+)\s+column\s+(\d+)/);
    const contextMatch = errMsg.match(/"([\s\S]*)"\s*is not valid JSON/);

    // 1. Node < 19 hoặc Chrome cũ
    if (posMatch) {
      position = parseInt(posMatch[1], 10);
    } 
    // 2. Firefox / Safari
    else if (lineColMatch) {
      line = parseInt(lineColMatch[1], 10);
      column = parseInt(lineColMatch[2], 10);
    } 
    // 3. Node 19+ / Chrome mới (format chuỗi bị cắt)
    else if (contextMatch) {
      const contextStr = contextMatch[1];
      const foundIdx = jsonString.indexOf(contextStr);
      
      if (foundIdx !== -1) {
        position = foundIdx;
        const tokenMatch = errMsg.match(/Unexpected token '(.*?)'/);
        if (tokenMatch) {
          // Cộng dồn index của token lỗi để trỏ chính xác vị trí
          const tokenIdx = contextStr.indexOf(tokenMatch[1]);
          if (tokenIdx !== -1) position += tokenIdx;
        }
      }
    }

    if (position !== -1) {
      const textBeforeError = jsonString.substring(0, position);
      const lines = textBeforeError.split('\n');
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }

    if (line !== null && column !== null) {
      const allLines = jsonString.split('\n');
      const errorLineText = allLines[line - 1] || '';
      snippet = `${errorLineText}\n${' '.repeat(Math.max(0, column - 1))}^`;
    }

    return { success: false, error: errMsg, position, line, column, snippet };
  }
}

function parseAndFormatJSON() {
  // Use textContent to avoid browser adding extra newlines from inline <p> tags
  const rawText = jsonInput.textContent.trim();
  if (!rawText) return null;
  let result = betterJsonParse(rawText);
  if (result.success && typeof result.data === "string") result = betterJsonParse(result.data);
  if (!result.success) throw result;
  jsonInput.innerHTML = syntaxHighlight(JSON.stringify(result.data, null, 2));
  saveState();
  return result.data;
}

function handleJsonError(err) {
    console.log(err)
  const line = err.line || 1;
  const col = err.column || 1;
  const snippet = (err.snippet || "").trim();
  errorMsg.style.whiteSpace = "normal";
  errorMsg.textContent = `JSON Invalid: ${snippet}`;

  // highlight the error snippet in left panel
  const pos = err.position;
  if (pos >= 0) {
    const text = jsonInput.textContent;
    const start = Math.max(0, pos - 10);
    const end = Math.min(text.length, pos + 10);

    // build highlighted HTML: normal | red snippet | normal
    const before = syntaxHighlight(text.slice(0, start));
    const errPart = `<span style="background:#cf222e;color:#fff;border-radius:2px;padding:0 1px;">${escapeHtml(text.slice(start, end))}</span>`;
    const after = syntaxHighlight(text.slice(end));

    jsonInput.innerHTML = before + errPart + after;

    jsonInput.querySelector("span[style*='background:#cf222e']")
      ?.scrollIntoView({ block: "center" });
  }
}

formatBtn.addEventListener("click", () => {
  errorMsg.style.whiteSpace = "";
  errorMsg.textContent = "";
  try { parseAndFormatJSON(); } catch (e) { handleJsonError(e); }
});

generateBtn.addEventListener("click", () => {
  errorMsg.style.whiteSpace = "";
  errorMsg.textContent = "";
  try { const parsed = parseAndFormatJSON(); currentParsedData = parsed; renderGrid(); }
  catch (e) { handleJsonError(e); }
});

// ===== Build Table =====
function formatGridValue(val) {
  if (val === null) return '<p style="display:inline;margin:0;font-style:italic;color:var(--json-null);">null</p>';
  if (typeof val === "boolean") return `<p style="display:inline;margin:0;font-weight:bold;color:var(--json-boolean);">${val}</p>`;
  if (typeof val === "number") return `<p style="display:inline;margin:0;color:var(--json-number);">${val}</p>`;
  if (typeof val === "string") return `<p style="display:inline;margin:0;color:var(--json-string);">${escapeHtml(val)}</p>`;
  return val;
}

function buildTable(data, path = "root") {
  if (data === null || typeof data !== "object") return formatGridValue(data);
  let html = "<table>";
  if (Array.isArray(data)) {
    if (data.length === 0) return "[]";
    const isObjArray = data.some((item) => typeof item === "object" && item !== null && !Array.isArray(item));
    if (isObjArray) {
      let keysSet = new Set();
      data.forEach((item) => { if (typeof item === "object" && item !== null) Object.keys(item).forEach((k) => keysSet.add(k)); });
      const colPath = (col) => `${path}.${col}`;
      let cols = Array.from(keysSet).filter((c) => !hiddenFields.has(colPath(c)));
      html += '<tr><th class="index-col">#</th>';
      cols.forEach((col) => { html += `<th onclick="hideField('${encodeURIComponent(colPath(col))}')" title="Hide field">${escapeHtml(col)} </th>`; });
      html += "</tr>";
      data.forEach((row, index) => {
        const currentPath = `${path}[${index}]`;
        if (hiddenRows.has(currentPath)) return;
        html += `<tr><td class="index-col" onclick="hideRow('${encodeURIComponent(currentPath)}')" title="Hide row">${index}</td>`;
        cols.forEach((col) => { const val = row && typeof row === "object" ? row[col] : undefined; html += `<td>${val !== undefined ? buildTable(val, `${currentPath}.${col}`) : ""}</td>`; });
        html += "</tr>";
      });
    } else {
      html += '<tr><th class="index-col">#</th><th>Value</th></tr>';
      data.forEach((item, index) => {
        const currentPath = `${path}[${index}]`;
        if (hiddenRows.has(currentPath)) return;
        html += `<tr><td class="index-col" onclick="hideRow('${encodeURIComponent(currentPath)}')" title="Hide row">${index}</td><td>${buildTable(item, currentPath)}</td></tr>`;
      });
    }
  } else {
    let keys = Object.keys(data).filter((k) => !hiddenFields.has(`${path}.${k}`));
    if (keys.length === 0) return "{}";
    keys.forEach((key) => { html += `<tr><td onclick="hideField('${encodeURIComponent(`${path}.${key}`)}')" title="Hide field"><strong>${escapeHtml(key)}</strong></td><td>${buildTable(data[key], `${path}.${key}`)}</td></tr>`; });
  }
  html += "</table>";
  return html;
}

// ===== Column hover highlight =====
gridOutput.addEventListener("mouseover", (e) => {
  const cell = e.target.closest("td"); if (!cell) return;
  const table = cell.closest("table"), index = cell.cellIndex;
  Array.from(table.rows).forEach((row) => { if (row.cells[index]) row.cells[index].style.backgroundColor = "rgba(47,129,247,0.05)"; });
});
gridOutput.addEventListener("mouseout", (e) => {
  const cell = e.target.closest("td"); if (!cell) return;
  const table = cell.closest("table"), index = cell.cellIndex;
  Array.from(table.rows).forEach((row) => { if (row.cells[index]) row.cells[index].style.backgroundColor = ""; });
});

// ===== Trim =====
function updateTrimBtn() {
  const hasHidden = hiddenFields.size > 0 || hiddenRows.size > 0;
  trimBtn.style.display = hasHidden ? "inline-block" : "none";
  trimBtn.textContent = `✂️ Trim JSON (${hiddenFields.size + hiddenRows.size})`;
}
trimBtn.addEventListener("click", () => {
  if (!currentParsedData) return;
  const trimmed = trimData(currentParsedData, "root");
  hiddenFields.clear(); hiddenRows.clear();
  currentParsedData = trimmed;
  jsonInput.innerHTML = syntaxHighlight(JSON.stringify(trimmed, null, 2));
  saveState(); updateStats(); renderGrid();
});
function trimData(data, path) {
  if (data === null || typeof data !== "object") return data;
  if (Array.isArray(data)) {
    const result = [];
    data.forEach((item, i) => { if (!hiddenRows.has(`${path}[${i}]`)) result.push(trimData(item, `${path}[${i}]`)); });
    return result;
  }
  const result = {};
  for (const key of Object.keys(data)) {
    const exactPath = `${path}.${key}`, colPath = `${path.replace(/\[\d+\]$/, "")}.${key}`;
    if (hiddenFields.has(exactPath) || hiddenFields.has(colPath)) continue;
    result[key] = trimData(data[key], exactPath);
  }
  return result;
}

// ===== Share =====
shareBtn.addEventListener("click", () => {
  if (!currentParsedData) { errorMsg.textContent = "Generate a grid first before sharing."; return; }
  const compressed = LZString.compressToBase64(JSON.stringify(currentParsedData)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const url = `${location.origin}${location.pathname}?data=${compressed}`;
  navigator.clipboard.writeText(url).then(() => {
    const orig = shareBtn.textContent;
    shareBtn.textContent = "Copied!";
    setTimeout(() => (shareBtn.textContent = orig), 2000);
  });
});

// ===== Load from URL =====
function loadFromUrl() {
  const params = new URLSearchParams(location.search);
  const data = params.get("data");
  if (!data) return false;
  try {
    const parsed = JSON.parse(LZString.decompressFromBase64(data.replace(/-/g, "+").replace(/_/g, "/")));
    currentParsedData = parsed;
    jsonInput.innerHTML = syntaxHighlight(JSON.stringify(parsed, null, 2));
    saveState(); renderGrid();
    return true;
  } catch (e) { errorMsg.textContent = "Failed to load shared data."; return false; }
}

// ===== Init =====
jsonInput.innerHTML = syntaxHighlight(defaultJson);
saveState();
updateStats();
if (!location.search.includes("drive=") && !loadFromUrl()) generateBtn.click();
