// ===== Google Drive Integration =====
var DRIVE_CLIENT_ID = "290260834551-44ggtg0jsdg1fva4bhdbn90u8ljnusa2.apps.googleusercontent.com";
var DRIVE_API_KEY = "AIzaSyA0E6mPXAShLt1zRM3yOh5WdZ-RD6M4ea8";
var DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
var FOLDER_NAME = "JSON Grid Viewer";
var FOLDER_KEY = "drive_folder_id";
var HINT_KEY = "drive_user_hint";
var driveToken = localStorage.getItem("drive_token") || null;
var _tokenClient = null;

// ===== Token Client =====
function buildTokenClient() {
  if (_tokenClient) return _tokenClient;
  _tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: DRIVE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: function(resp) {
      if (resp.error) {
        if (resp.error === "interaction_required" || resp.error === "consent_required") {
          _tokenClient.requestAccessToken({ prompt: "select_account" });
        } else {
          showDriveError(resp.error);
        }
        return;
      }
      driveToken = resp.access_token;
      localStorage.setItem("drive_token", driveToken);
      fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: "Bearer " + driveToken }
      }).then(function(r) { return r.json(); }).then(function(info) {
        if (info.email) localStorage.setItem(HINT_KEY, info.email);
        updateDriveUserUI(info);
        showUploadStep();
      });
    }
  });
  return _tokenClient;
}

// ===== Silent Auth =====
function silentAuth(onSuccess) {
  var hint = localStorage.getItem(HINT_KEY);
  if (driveToken) {
    updateDriveUserUI({ email: hint || "" });
    if (onSuccess) onSuccess();
    return;
  }
  if (!hint || !window.google || !google.accounts) return;
  var client = buildTokenClient();
  var orig = client.callback;
  client.callback = function(resp) {
    client.callback = orig;
    if (!resp.error) {
      driveToken = resp.access_token;
      localStorage.setItem("drive_token", driveToken);
      updateDriveUserUI({ email: hint });
      if (onSuccess) onSuccess();
    }
  };
  client.requestAccessToken({ prompt: "", login_hint: hint });
}

function updateDriveUserUI(info) {
  if (!info || !info.email) return;
  document.getElementById("google-user-info").style.display = "flex";
  if (info.picture) document.getElementById("google-avatar").src = info.picture;
  document.getElementById("google-username").textContent = info.name || info.email;
}

// ===== Login / Logout =====
window.driveLogin = function() {
  var hint = localStorage.getItem(HINT_KEY);
  buildTokenClient().requestAccessToken({ prompt: hint ? "" : "select_account", login_hint: hint || undefined });
};

document.getElementById("google-signout-btn").addEventListener("click", function() {
  localStorage.removeItem(HINT_KEY);
  localStorage.removeItem(FOLDER_KEY);
  localStorage.removeItem("drive_token");
  driveToken = null; _tokenClient = null;
  document.getElementById("google-user-info").style.display = "none";
});

// ===== Modal =====
window.closeDriveModal = function() {
  document.getElementById("drive-modal").style.display = "none";
};

document.getElementById("drive-modal").addEventListener("click", function(e) {
  if (e.target === document.getElementById("drive-modal")) closeDriveModal();
});

function showUploadStep() {
  document.getElementById("drive-step-login").style.display = "none";
  document.getElementById("drive-step-upload").style.display = "block";
  var ts = new Date().toLocaleString("sv-SE").slice(0, 16).replace(" ", "-").replace(":", "-");
  document.getElementById("drive-filename").value = "data-" + ts;
}

function openDriveModal() {
  var modal = document.getElementById("drive-modal");
  modal.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;align-items:center;justify-content:center;";
  document.getElementById("drive-result").style.display = "none";
  document.getElementById("drive-error").style.display = "none";
  if (driveToken) {
    showUploadStep();
  } else {
    document.getElementById("drive-step-login").style.display = "block";
    document.getElementById("drive-step-upload").style.display = "none";
    var hint = localStorage.getItem(HINT_KEY);
    if (hint && window.google && google.accounts) silentAuth(function() { showUploadStep(); });
  }
}

document.getElementById("drive-btn").addEventListener("click", function() {
  if (!currentParsedData) {
    try {
      var parsed = parseAndFormatJSON();
      if (!parsed) { errorMsg.textContent = "No JSON to upload."; return; }
      currentParsedData = parsed; renderGrid();
    } catch(e) { errorMsg.textContent = "Fix JSON errors before uploading."; return; }
  }
  openDriveModal();
});

// ===== Upload =====
window.driveUpload = async function() {
  var btn = document.querySelector("#drive-step-upload .btn-primary");
  var origText = btn.textContent;
  btn.textContent = "Uploading..."; btn.disabled = true;
  document.getElementById("drive-error").style.display = "none";
  document.getElementById("drive-result").style.display = "none";
  try {
    var folderId = await getOrCreateFolder();
    var filename = (document.getElementById("drive-filename").value.trim() || "data") + ".json";
    var content = JSON.stringify(currentParsedData);
    var boundary = "json_grid_boundary";
    var body = "--" + boundary + "\r\nContent-Type: application/json\r\n\r\n"
      + JSON.stringify({ name: filename, parents: [folderId] })
      + "\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n"
      + content + "\r\n--" + boundary + "--";
    var uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
      method: "POST",
      headers: { Authorization: "Bearer " + driveToken, "Content-Type": "multipart/related; boundary=" + boundary },
      body: body
    });
    if (uploadRes.status === 401) {
      localStorage.removeItem("drive_token"); driveToken = null; _tokenClient = null;
      showDriveError("Session expired. Please sign in again.");
      document.getElementById("drive-step-login").style.display = "block";
      document.getElementById("drive-step-upload").style.display = "none";
      return;
    }
    var file = await uploadRes.json();
    if (!file.id) throw new Error((file.error && file.error.message) || "Upload failed");

    var accessVal = document.querySelector("input[name='drive-access']:checked").value;
    if (accessVal === "public") {
      await fetch("https://www.googleapis.com/drive/v3/files/" + file.id + "/permissions", {
        method: "POST",
        headers: { Authorization: "Bearer " + driveToken, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "reader", type: "anyone" })
      });
    } else if (accessVal === "link") {
      await fetch("https://www.googleapis.com/drive/v3/files/" + file.id + "/permissions?supportsAllDrives=true", {
        method: "POST",
        headers: { Authorization: "Bearer " + driveToken, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "reader", type: "anyone", allowFileDiscovery: false })
      });
    }
    var appLink = accessVal !== "private"
      ? location.origin + location.pathname + "?drive=" + file.id
      : "https://drive.google.com/file/d/" + file.id + "/view";
    document.getElementById("drive-link").value = appLink;
    document.getElementById("drive-result").style.display = "block";
  } catch(e) {
    showDriveError(e.message);
  } finally {
    btn.textContent = origText; btn.disabled = false;
  }
};

async function getOrCreateFolder() {
  var cached = localStorage.getItem(FOLDER_KEY);
  if (cached) return cached;
  var q = encodeURIComponent("name='" + FOLDER_NAME + "' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  var res = await fetch("https://www.googleapis.com/drive/v3/files?q=" + q + "&fields=files(id)", { headers: { Authorization: "Bearer " + driveToken } });
  var data = await res.json();
  if (data.files && data.files.length > 0) { localStorage.setItem(FOLDER_KEY, data.files[0].id); return data.files[0].id; }
  var create = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: "Bearer " + driveToken, "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" })
  });
  var folder = await create.json();
  localStorage.setItem(FOLDER_KEY, folder.id);
  return folder.id;
}

window.copyDriveLink = function() {
  var link = document.getElementById("drive-link").value;
  navigator.clipboard.writeText(link).then(function() {
    var btn = document.querySelector("#drive-result .btn");
    btn.textContent = "Copied!";
    setTimeout(function() { btn.textContent = "Copy"; }, 2000);
  });
};

window.openDriveFolder = function() {
  var folderId = localStorage.getItem(FOLDER_KEY);
  window.open(folderId ? "https://drive.google.com/drive/folders/" + folderId : "https://drive.google.com/drive/my-drive", "_blank");
};

function showDriveError(msg) {
  var el = document.getElementById("drive-error");
  el.textContent = "Error: " + msg; el.style.display = "block";
}

// ===== Loading overlay =====
function showLoading(msg) {
  var el = document.getElementById("loading-overlay");
  document.getElementById("loading-msg").textContent = msg || "Loading from Drive...";
  el.style.cssText = "display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;";
}
function hideLoading() {
  document.getElementById("loading-overlay").style.display = "none";
}

// ===== Wait for GSI =====
(function waitForGSI() {
  if (window.google && google.accounts) {
    silentAuth();
  } else {
    setTimeout(waitForGSI, 200);
  }
})();

// ===== Load from ?drive= =====
(function loadFromDrive() {
  var driveId = new URLSearchParams(location.search).get("drive");
  if (!driveId) { generateBtn.click(); return; }
  requestAnimationFrame(function() { showLoading("Loading from Drive..."); });
  fetch("https://www.googleapis.com/drive/v3/files/" + driveId + "?alt=media&key=" + DRIVE_API_KEY)
    .then(function(r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function(parsed) {
      hideLoading();
      errorMsg.textContent = "";
      currentParsedData = parsed;
      jsonInput.innerHTML = syntaxHighlight(JSON.stringify(parsed, null, 2));
      saveState(); updateStats(); renderGrid();
    })
    .catch(function(e) {
      hideLoading();
      errorMsg.textContent = "Failed to load from Drive: " + e.message;
      generateBtn.click();
    });
})();
