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
  "level1_primitives": {
    "string": "hello",
    "number": 123,
    "float": 12.34,
    "boolean_true": true,
    "boolean_false": false
  },

  "level2_simple_object": {
    "id": 1,
    "name": "John Doe",
    "active": true
  },

  "level3_arrays": {
    "number_array": [1, 2, 3, 4],
    "string_array": ["a", "b", "c"],
    "boolean_array": [true, false, true],
    "mixed_array": [1, "text", true, null],
    "object_array": [
      { "id": 1, "name": "A" },
      { "id": 2, "name": "B" }
    ]
  },

  "level4_nested_object": {
    "user": {
      "id": 1,
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "contact": {
          "email": "john@example.com",
          "phone": "123456789"
        }
      }
    }
  },

  "level5_mixed_nesting": {
    "users": [
      {
        "id": 1,
        "tags": ["admin", "editor"],
        "profile": {
          "age": 30,
          "skills": [
            { "name": "JS", "level": "advanced" },
            { "name": "TS", "level": "intermediate" }
          ]
        }
      },
      {
        "id": 2,
        "tags": [],
        "profile": {
          "age": 25,
          "skills": []
        }
      }
    ]
  },

  "level6_deep_nesting": {
    "a": {
      "b": {
        "c": {
          "d": {
            "e": {
              "value": "deep"
            }
          }
        }
      }
    }
  },

  "level7_edge_cases": {
    "null_value": null,
    "empty_object": {},
    "empty_array": [],
    "array_with_nulls": [null, null],
    "object_with_empty_values": {
      "a": "",
      "b": null,
      "c": []
    }
  },

  "level8_complex_real_world": {
    "meta": {
      "requestId": "abc-123",
      "timestamp": "2026-04-30T21:00:00Z"
    },
    "data": {
      "users": [
        {
          "id": 1,
          "name": "Alice",
          "roles": ["admin"],
          "orders": [
            {
              "orderId": "ORD-1",
              "items": [
                { "productId": "P1", "qty": 2 },
                { "productId": "P2", "qty": 1 }
              ],
              "total": 100.5
            }
          ]
        }
      ]
    },
    "errors": []
  }
}`;

let currentParsedData = null;
let hiddenFields = new Set();
let hiddenRows = new Set();

// ===== Hide/Unhide =====
window.hideField = function (encodedPath) {
  hiddenFields.add(decodeURIComponent(encodedPath));
  renderGrid();
};
window.unhideField = function (encodedPath) {
  hiddenFields.delete(decodeURIComponent(encodedPath));
  renderGrid();
};
window.hideRow = function (encodedPath) {
  hiddenRows.add(decodeURIComponent(encodedPath));
  renderGrid();
};
window.unhideRow = function (encodedPath) {
  hiddenRows.delete(decodeURIComponent(encodedPath));
  renderGrid();
};
window.unhideAll = function () {
  hiddenFields.clear();
  hiddenRows.clear();
  renderGrid();
};

function renderHiddenChips() {
  if (hiddenFields.size === 0 && hiddenRows.size === 0) {
    hiddenFieldsBar.innerHTML = "";
    updateTrimBtn();
    return;
  }
  let html =
    '<span style="font-size:12px;color:var(--text-muted);">Hidden:</span>';
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
  if (!currentParsedData) {
    gridOutput.innerHTML = "";
    return;
  }
  gridOutput.innerHTML = buildTable(currentParsedData, "root", true);
  renderHiddenChips();
}

function escapeHtml(unsafe) {
  return (unsafe || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ===== Resizer =====
let isResizing = false;
resizer.addEventListener("mousedown", () => {
  isResizing = true;
  document.body.style.cursor = "col-resize";
  jsonInput.style.pointerEvents = "none";
});
document.addEventListener("mousemove", (e) => {
  if (!isResizing) return;
  const minWidth = 300,
    offsetRight = document.body.offsetWidth - e.clientX;
  if (e.clientX > minWidth && offsetRight > minWidth)
    leftPanel.style.width = `${(e.clientX / document.body.offsetWidth) * 100}%`;
});
document.addEventListener("mouseup", () => {
  if (isResizing) {
    isResizing = false;
    document.body.style.cursor = "default";
    jsonInput.style.pointerEvents = "auto";
  }
});

// ===== Zoom =====
let jsonFontSize = 14,
  gridFontSize = 13;
function applyZoom(el, size, delta) {
  const n = size + delta;
  if (n >= 8 && n <= 48) {
    el.style.fontSize = n + "px";
    return n;
  }
  return size;
}
jsonInput.addEventListener(
  "wheel",
  (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      jsonFontSize = applyZoom(jsonInput, jsonFontSize, e.deltaY < 0 ? 1 : -1);
    }
  },
  { passive: false },
);
gridOutput.addEventListener(
  "wheel",
  (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      gridFontSize = applyZoom(gridOutput, gridFontSize, e.deltaY < 0 ? 1 : -1);
    }
  },
  { passive: false },
);

// ===== History & Auto-highlight =====
let historyStack = [],
  historyIndex = -1,
  saveTimeout,
  highlightTimeout;
const MAX_HIGHLIGHT_SIZE = 50000; // skip highlight if > 50KB

function saveState() {
  const content = jsonInput.innerHTML;
  if (historyStack[historyIndex] !== content) {
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(content);
    historyIndex++;
  }
}

function updateStats() {
  const text = jsonInput.innerText.trim();
  if (!text) {
    jsonStats.textContent = "";
    return;
  }
  const bytes = new TextEncoder().encode(text).length,
    len = text.length;
  jsonStats.textContent = `${len.toLocaleString()} chars · ${bytes >= 1024 ? (bytes / 1024).toFixed(1) + " KB" : bytes + " B"}`;
}

function debouncedHighlight() {
  clearTimeout(highlightTimeout);
  highlightTimeout = setTimeout(() => {
    const text = jsonInput.textContent.trim();
    if (text.length > MAX_HIGHLIGHT_SIZE) return; // skip for large JSON
    try {
      const parsed = JSON.parse(text);
      jsonInput.innerHTML = syntaxHighlight(JSON.stringify(parsed, null, 2));
    } catch (e) {
      // invalid JSON — keep as-is, don't highlight
    }
  }, 800);
}

jsonInput.addEventListener("input", () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveState, 400);
  updateStats();
  debouncedHighlight();
});

jsonInput.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        jsonInput.innerHTML = historyStack[historyIndex];
      }
    } else {
      if (historyIndex > 0) {
        historyIndex--;
        jsonInput.innerHTML = historyStack[historyIndex];
      }
    }
  }
});

jsonInput.addEventListener("paste", (e) => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData("text/plain");
  document.execCommand("insertText", false, text);
  saveState();
  // immediate highlight for paste if not too large
  if (text.length <= MAX_HIGHLIGHT_SIZE) {
    clearTimeout(highlightTimeout);
    highlightTimeout = setTimeout(() => {
      try {
        const parsed = JSON.parse(jsonInput.textContent.trim());
        jsonInput.innerHTML = syntaxHighlight(JSON.stringify(parsed, null, 2));
      } catch (e) {}
    }, 100);
  }
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
  json = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    function (match) {
      let color = "var(--json-number)";
      if (/^"/.test(match))
        color = /:$/.test(match) ? "var(--json-key)" : "var(--json-string)";
      else if (/true|false/.test(match)) color = "var(--json-boolean)";
      else if (/null/.test(match)) color = "var(--json-null)";
      return `<p style="display:inline;margin:0;color:${color};">${match}</p>`;
    },
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
    let snippet = "";

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
      const lines = textBeforeError.split("\n");
      line = lines.length;
      column = lines[lines.length - 1].length + 1;
    }

    if (line !== null && column !== null) {
      const allLines = jsonString.split("\n");
      const errorLineText = allLines[line - 1] || "";
      snippet = `${errorLineText}\n${" ".repeat(Math.max(0, column - 1))}^`;
    }

    return { success: false, error: errMsg, position, line, column, snippet };
  }
}

function parseAndFormatJSON() {
  const rawText = jsonInput.textContent.trim();
  if (!rawText) return null;
  let result = betterJsonParse(rawText);
  if (result.success && typeof result.data === "string")
    result = betterJsonParse(result.data);
  if (!result.success) throw result;
  const formatted = JSON.stringify(result.data, null, 2);
  jsonInput.innerHTML =
    formatted.length <= MAX_HIGHLIGHT_SIZE
      ? syntaxHighlight(formatted)
      : escapeHtml(formatted);
  saveState();
  return result.data;
}

function handleJsonError(err) {
  console.log(err);
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

    jsonInput
      .querySelector("span[style*='background:#cf222e']")
      ?.scrollIntoView({ block: "center" });
  }
}

formatBtn.addEventListener("click", () => {
  errorMsg.style.whiteSpace = "";
  errorMsg.textContent = "";
  try {
    parseAndFormatJSON();
  } catch (e) {
    handleJsonError(e);
  }
});

generateBtn.addEventListener("click", () => {
  errorMsg.style.whiteSpace = "";
  errorMsg.textContent = "";
  try {
    const parsed = parseAndFormatJSON();
    currentParsedData = parsed;
    expandState = {};
    nodeCache = {};
    renderGrid();
  } catch (e) {
    handleJsonError(e);
  }
});

// ===== Fold/Unfold (Lazy Expansion System) =====
// expandState: Record<nodeId, boolean> — true = expanded, absent/false = collapsed
// nodeCache: Record<nodeId, {data, cols?, keys?}> — parsed node cache
let expandState = {};
let nodeCache = {};

/**
 * Generate a stable path-based node ID.
 * For array items, prefer item.id if it exists: users[id=123]
 * Otherwise fallback to index: users[0]
 */
function getNodeId(parentPath, index, item) {
  if (
    item !== null &&
    typeof item === "object" &&
    !Array.isArray(item) &&
    item.id !== undefined
  ) {
    return `${parentPath}[id=${item.id}]`;
  }
  return `${parentPath}[${index}]`;
}
function getPathLineMap(data) {
  const map = {};
  let line = 1;

  function traverse(obj, currentPath) {
    map[currentPath] = line;
    if (obj === null || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      if (obj.length === 0) return;
      obj.forEach((item, index) => {
        line++;
        const childPath = getNodeId(currentPath, index, item);
        traverse(item, childPath);
      });
      line++;
    } else {
      const keys = Object.keys(obj);
      if (keys.length === 0) return;
      keys.forEach((key) => {
        line++;
        traverse(obj[key], currentPath + "." + key);
      });
      line++;
    }
  }

  traverse(data, "root");
  return map;
}

function scrollToPath(targetPath) {
  if (!currentParsedData) return;
  const map = getPathLineMap(currentParsedData);
  const targetLine = map[targetPath];
  if (targetLine) {
    const style = window.getComputedStyle(jsonInput);
    const lh = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
    const paddingTop = parseFloat(style.paddingTop) || 15;

    // calculate Y offset and center in viewport
    const yOffset = paddingTop + (targetLine - 1) * lh;
    const centerOffset = Math.max(
      0,
      yOffset - jsonInput.clientHeight / 2 + lh / 2,
    );

    jsonInput.scrollTo({ top: centerOffset, behavior: "smooth" });
  }
  return `${parentPath}[${index}]`;
}

/**
 * Toggle expand state of a single node — no cascading.
 */
window.toggleExpand = function (encodedId) {
  const id = decodeURIComponent(encodedId);
  expandState[id] = !expandState[id];
  renderGrid();
  scrollToPath(id);
};

/**
 * Check if a node is currently expanded.
 * A node is expanded only when expandState[id] === true.
 * Parent state does NOT affect this check.
 */
function isExpanded(id) {
  return expandState[id] === true;
}

/**
 * Get or create a cached parsed representation of a node.
 */
function getCachedNode(id, data) {
  if (nodeCache[id]) return nodeCache[id];
  const node = { data };
  if (Array.isArray(data)) {
    const isObjArray = data.some(
      (item) =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    );
    node.isObjArray = isObjArray;
    if (isObjArray) {
      const keysSet = new Set();
      data.forEach((item) => {
        if (typeof item === "object" && item !== null)
          Object.keys(item).forEach((k) => keysSet.add(k));
      });
      node.cols = Array.from(keysSet);
    }
  } else if (typeof data === "object" && data !== null) {
    node.keys = Object.keys(data);
  }
  nodeCache[id] = node;
  return node;
}

// ===== Build Table =====
function formatGridValue(val) {
  if (val === null)
    return '<p style="display:inline;margin:0;font-style:italic;color:var(--json-null);">null</p>';
  if (typeof val === "boolean")
    return `<p style="display:inline;margin:0;font-weight:bold;color:var(--json-boolean);">${val}</p>`;
  if (typeof val === "number")
    return `<p style="display:inline;margin:0;color:var(--json-number);">${val}</p>`;
  if (typeof val === "string")
    return `<p style="display:inline;margin:0;color:var(--json-string);">${escapeHtml(val)}</p>`;
  return val;
}

/**
 * Build the HTML table for a given data node.
 * @param {*} data - The data value to render.
 * @param {string} id - The stable path-based node ID.
 * @param {boolean} [isRoot=false] - Whether this is the root node (always rendered expanded).
 */
function buildTable(data, id = "root", isRoot = false) {
  // Primitives: render inline
  if (data === null || typeof data !== "object") return formatGridValue(data);

  const cached = getCachedNode(id, data);
  const expanded = isRoot || isExpanded(id);

  // Collapsed state: show a clickable placeholder, do NOT render children
  if (!expanded) {
    const count = Array.isArray(data) ? data.length : Object.keys(data).length;
    const label = Array.isArray(data)
      ? `[…${count} items]`
      : `{…${count} fields}`;
    return `<button class="fold-placeholder" onclick="toggleExpand('${encodeURIComponent(id)}')" title="Click to expand">▶ ${label}</button>`;
  }

  let html = "<table>";

  if (Array.isArray(data)) {
    if (data.length === 0)
      return '<span style="color:var(--text-muted);">[]</span>';

    if (cached.isObjArray) {
      // --- Object Array: render as table with columns ---
      const cols = cached.cols.filter((c) => !hiddenFields.has(`${id}.${c}`));

      // Header row — nested columns are plain labels, no global toggle
      html += '<tr><th class="index-col">#</th>';
      cols.forEach((col) => {
        const colId = `${id}.${col}`;
        html +=
          `<th class="field-th">` +
          `<span class="cell-inner"><span>${escapeHtml(col)}</span>` +
          `<button class="hide-btn" onclick="event.stopPropagation();hideField('${encodeURIComponent(colId)}')" title="Hide column">✕</button>` +
          `</span></th>`;
      });
      html += "</tr>";

      // Data rows — each nested cell expands/collapses independently via cellId
      data.forEach((row, index) => {
        const rowId = getNodeId(id, index, row);
        if (hiddenRows.has(rowId) || hiddenRows.has(`${id}[${index}]`)) return;
        html += `<tr><td class="index-col" onclick="hideRow('${encodeURIComponent(rowId)}')" title="Hide row">${index}</td>`;
        cols.forEach((col) => {
          const val = row && typeof row === "object" ? row[col] : undefined;
          const cellId = `${rowId}.${col}`;
          if (val !== null && typeof val === "object" && val !== undefined) {
            const exp = isExpanded(cellId);
            const arrow = exp ? "▼ " : "▶ ";
            const count = Array.isArray(val)
              ? val.length
              : Object.keys(val).length;
            const summary = Array.isArray(val)
              ? `[…${count} items]`
              : `{…${count} fields}`;
            if (!exp) {
              html += `<td class="key-cell foldable" onclick="toggleExpand('${encodeURIComponent(cellId)}')" title="Expand"><span>${arrow}${summary}</span></td>`;
            } else {
              html +=
                `<td class="key-cell foldable" onclick="toggleExpand('${encodeURIComponent(cellId)}')" title="Collapse" style="vertical-align:middle">` +
                `<div style="display:flex;align-items:center;gap:4px">` +
                `<span style="flex-shrink:0">${arrow}</span>` +
                `<div onclick="event.stopPropagation()">${buildTable(val, cellId, true)}</div>` +
                `</div>` +
                `</td>`;
            }
          } else {
            html += `<td>${val !== undefined ? formatGridValue(val) : ""}</td>`;
          }
        });
        html += "</tr>";
      });
    } else {
      // --- Primitive/mixed array: simple index + value ---
      html += '<tr><th class="index-col">#</th><th>Value</th></tr>';
      data.forEach((item, index) => {
        const itemId = getNodeId(id, index, item);
        if (hiddenRows.has(itemId) || hiddenRows.has(`${id}[${index}]`)) return;
        html +=
          `<tr>` +
          `<td class="index-col" onclick="hideRow('${encodeURIComponent(itemId)}')" title="Hide row">${index}</td>` +
          `<td>${buildTable(item, itemId)}</td>` +
          `</tr>`;
      });
    }
  } else {
    // --- Object: render as key-value grid ---
    const keys = (cached.keys || Object.keys(data)).filter(
      (k) => !hiddenFields.has(`${id}.${k}`),
    );
    if (keys.length === 0)
      return '<span style="color:var(--text-muted);">{}\u200b</span>';
    keys.forEach((key) => {
      const keyId = `${id}.${key}`;
      const val = data[key];
      const isNested = val !== null && typeof val === "object";
      const isExp = isNested && isExpanded(keyId);
      const arrow = isNested ? (isExp ? "▼ " : "▶ ") : "";
      const foldable = isNested ? " foldable" : "";
      const clickHandler = isNested
        ? `onclick="toggleExpand('${encodeURIComponent(keyId)}')"`
        : "";
      html +=
        `<tr>` +
        `<td class="key-cell${foldable}" ${clickHandler}>` +
        `<span class="cell-inner">` +
        `<span>${arrow}<strong>${escapeHtml(key)}</strong></span>` +
        `<button class="hide-btn" onclick="event.stopPropagation();hideField('${encodeURIComponent(keyId)}')" title="Hide field">✕</button>` +
        `</span></td>` +
        `<td>${buildTable(val, keyId)}</td>` +
        `</tr>`;
    });
  }

  html += "</table>";
  return html;
}

// ===== Column hover highlight =====
gridOutput.addEventListener("mouseover", (e) => {
  const cell = e.target.closest("td");
  if (!cell) return;
  const table = cell.closest("table"),
    index = cell.cellIndex;
  Array.from(table.rows).forEach((row) => {
    if (row.cells[index])
      row.cells[index].style.backgroundColor = "rgba(47,129,247,0.05)";
  });
});
gridOutput.addEventListener("mouseout", (e) => {
  const cell = e.target.closest("td");
  if (!cell) return;
  const table = cell.closest("table"),
    index = cell.cellIndex;
  Array.from(table.rows).forEach((row) => {
    if (row.cells[index]) row.cells[index].style.backgroundColor = "";
  });
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
  hiddenFields.clear();
  hiddenRows.clear();
  nodeCache = {};
  currentParsedData = trimmed;
  jsonInput.innerHTML = syntaxHighlight(JSON.stringify(trimmed, null, 2));
  saveState();
  updateStats();
  renderGrid();
});
function trimData(data, path) {
  if (data === null || typeof data !== "object") return data;
  if (Array.isArray(data)) {
    const result = [];
    data.forEach((item, i) => {
      const indexPath = `${path}[${i}]`;
      const idPath = getNodeId(path, i, item);
      if (hiddenRows.has(indexPath) || hiddenRows.has(idPath)) return;
      result.push(trimData(item, indexPath));
    });
    return result;
  }
  const result = {};
  for (const key of Object.keys(data)) {
    const exactPath = `${path}.${key}`;
    // strip array index variants: root[0].key → root.key, root[id=x].key → root.key
    const basePath = path.replace(/\[.*?\]$/, "");
    const colPath = `${basePath}.${key}`;
    if (hiddenFields.has(exactPath) || hiddenFields.has(colPath)) continue;
    result[key] = trimData(data[key], exactPath);
  }
  return result;
}

// ===== Share =====
shareBtn.addEventListener("click", () => {
  if (!currentParsedData) {
    errorMsg.textContent = "Generate a grid first before sharing.";
    return;
  }
  const compressed = LZString.compressToBase64(
    JSON.stringify(currentParsedData),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
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
    const parsed = JSON.parse(
      LZString.decompressFromBase64(data.replace(/-/g, "+").replace(/_/g, "/")),
    );
    currentParsedData = parsed;
    expandState = {};
    nodeCache = {};
    jsonInput.innerHTML = syntaxHighlight(JSON.stringify(parsed, null, 2));
    saveState();
    renderGrid();
    return true;
  } catch (e) {
    errorMsg.textContent = "Failed to load shared data.";
    return false;
  }
}

// ===== Init =====
jsonInput.innerHTML = syntaxHighlight(defaultJson);
saveState();
updateStats();
if (!location.search.includes("drive=") && !loadFromUrl()) generateBtn.click();

// ===== Tooltip: show after 3s hover delay =====
document.querySelectorAll(".tooltip-wrapper").forEach((wrapper) => {
  let tooltipTimer = null;
  const content = wrapper.querySelector(".tooltip-content");
  if (!content) return;
  wrapper.addEventListener("mouseenter", () => {
    tooltipTimer = setTimeout(
      () => content.classList.add("tooltip-visible"),
      1000,
    );
  });
  wrapper.addEventListener("mouseleave", () => {
    clearTimeout(tooltipTimer);
    content.classList.remove("tooltip-visible");
  });
});
