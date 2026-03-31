const PROFILE_STORAGE_KEY = "open-room-profile-v1";
const POLL_INTERVAL_MS = 2000;

const chatToggle = document.querySelector("#chat-toggle");
const chatBackdrop = document.querySelector("#chat-backdrop");
const chatPanel = document.querySelector("#chat-panel");
const chatClose = document.querySelector("#chat-close");
const chatShell = document.querySelector("#chat-shell");
const messagesNode = document.querySelector("#messages");
const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const fileInput = document.querySelector("#file-input");
const attachButton = document.querySelector("#attach-button");
const sendButton = document.querySelector("#send-button");
const attachmentStrip = document.querySelector("#attachment-strip");
const dropIndicator = document.querySelector("#drop-indicator");

let profile = loadProfile();
let pendingFiles = [];
let dragDepth = 0;
let isDraggingFiles = false;
let isSubmitting = false;
let isChatOpen = false;
let hasUnread = false;
let isHydratingHistory = false;
let renderedMessageIds = new Set();
let lastMessageId = "";
let pollTimerId = null;
let isPolling = false;

chatToggle.addEventListener("click", () => {
  setChatOpen(!isChatOpen, { focusComposer: true });
});

chatClose.addEventListener("click", () => {
  setChatOpen(false, { restoreToggleFocus: true });
});

chatBackdrop.addEventListener("click", () => {
  setChatOpen(false, { restoreToggleFocus: true });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isChatOpen) {
    setChatOpen(false, { restoreToggleFocus: true });
  }
});

attachButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  queueFiles(fileInput.files);
  fileInput.value = "";
});

messageInput.addEventListener("paste", (event) => {
  const pastedFiles = extractFilesFromClipboard(event.clipboardData);

  if (pastedFiles.length === 0) {
    return;
  }

  event.preventDefault();
  queueFiles(pastedFiles);
});

messageInput.addEventListener("input", () => {
  autoResizeComposer();
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void submitComposer();
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    void submitComposer();
  }
});

chatShell.addEventListener("dragenter", (event) => {
  if (!event.dataTransfer?.types?.includes("Files")) {
    return;
  }

  event.preventDefault();
  dragDepth += 1;
  isDraggingFiles = true;
  setDropTarget(true);
});

chatShell.addEventListener("dragover", (event) => {
  if (!event.dataTransfer?.types?.includes("Files")) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  isDraggingFiles = true;
  setDropTarget(true);
});

chatShell.addEventListener("dragleave", (event) => {
  if (!event.dataTransfer?.types?.includes("Files")) {
    return;
  }

  event.preventDefault();
  dragDepth = Math.max(0, dragDepth - 1);

  if (dragDepth === 0) {
    setDropTarget(false);
  }
});

chatShell.addEventListener("drop", (event) => {
  if (!event.dataTransfer?.files?.length) {
    return;
  }

  event.preventDefault();
  dragDepth = 0;
  isDraggingFiles = false;
  setDropTarget(false);
  queueFiles(event.dataTransfer.files);
});

window.addEventListener("dragover", (event) => {
  if (!event.dataTransfer?.types?.includes("Files")) {
    return;
  }

  isDraggingFiles = true;
});

window.addEventListener("dragleave", (event) => {
  if (!isDraggingFiles) {
    return;
  }

  if (event.clientX === 0 && event.clientY === 0) {
    resetDropState();
  }
});

window.addEventListener("drop", () => {
  resetDropState();
});

window.addEventListener("dragend", () => {
  resetDropState();
});

window.addEventListener("blur", () => {
  resetDropState();
});

setChatOpen(false);
autoResizeComposer();
void bootstrapSession();

async function bootstrapSession() {
  try {
    const payload = await requestJson("/api/session.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    });

    profile.profileId = payload.session.profileId;
    profile.nickname = payload.session.nickname;
    saveProfile(profile);
    renderMessages(payload.messages || []);
    clearUnread();
    startPolling();
  } catch (error) {
    window.alert(error.message || "Не удалось подключиться к чату.");
  }
}

function startPolling() {
  stopPolling();
  pollTimerId = window.setInterval(() => {
    void pollMessages();
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimerId) {
    window.clearInterval(pollTimerId);
    pollTimerId = null;
  }
}

async function pollMessages() {
  if (isPolling) {
    return;
  }

  isPolling = true;

  try {
    const suffix = lastMessageId ? `?after=${encodeURIComponent(lastMessageId)}` : "";
    const payload = await requestJson(`/api/messages.php${suffix}`);

    for (const message of payload.messages || []) {
      appendMessage(message);
    }
  } catch (_error) {
    // The next poll will retry automatically.
  } finally {
    isPolling = false;
  }
}

function renderMessages(items) {
  isHydratingHistory = true;
  renderedMessageIds = new Set();
  lastMessageId = "";
  messagesNode.textContent = "";
  items.forEach((item) => appendMessage(item));
  isHydratingHistory = false;
}

function appendMessage(message) {
  if (!message?.id) {
    return;
  }

  if (renderedMessageIds.has(message.id)) {
    lastMessageId = message.id;
    return;
  }

  if (message.type === "system") {
    lastMessageId = message.id;
    renderedMessageIds.add(message.id);
    return;
  }

  renderedMessageIds.add(message.id);
  lastMessageId = message.id;

  const article = document.createElement("article");
  article.className = "message";

  if (message.profileId === profile.profileId) {
    article.classList.add("message--own");
  }

  const meta = document.createElement("div");
  meta.className = "message__meta";

  const author = document.createElement("span");
  author.className = "message__author";
  author.textContent = message.author;

  const time = document.createElement("span");
  time.textContent = formatTime(message.createdAt);

  meta.append(author, time);
  article.append(meta);

  if (message.type === "text") {
    const text = document.createElement("div");
    text.className = "message__text";
    text.textContent = message.text;
    article.append(text);
  }

  if (message.type === "file" && message.file) {
    if (isImageFile(message.file)) {
      const previewLink = document.createElement("a");
      previewLink.className = "message__image-link";
      previewLink.href = buildInlineFileUrl(message.file.id);
      previewLink.target = "_blank";
      previewLink.rel = "noreferrer";

      const image = document.createElement("img");
      image.className = "message__image";
      image.src = buildInlineFileUrl(message.file.id);
      image.alt = message.file.originalName;
      image.loading = "lazy";

      previewLink.append(image);
      article.append(previewLink);
    }

    const fileBox = document.createElement("div");
    fileBox.className = "message__file";

    const info = document.createElement("div");
    info.className = "message__file-info";

    const name = document.createElement("span");
    name.className = "message__file-name";
    name.textContent = message.file.originalName;

    const size = document.createElement("span");
    size.className = "message__file-size";
    size.textContent = `${formatBytes(message.file.size)} • ${message.file.mimeType || "файл"}`;

    info.append(name, size);

    const actions = document.createElement("div");
    actions.className = "file-actions";

    if (isImageFile(message.file)) {
      const openLink = document.createElement("a");
      openLink.className = "file-link";
      openLink.href = buildInlineFileUrl(message.file.id);
      openLink.target = "_blank";
      openLink.rel = "noreferrer";
      openLink.textContent = "Открыть";
      actions.append(openLink);
    }

    const downloadLink = document.createElement("a");
    downloadLink.className = "file-link";
    downloadLink.href = buildDownloadFileUrl(message.file.id);
    downloadLink.textContent = "Скачать";
    downloadLink.setAttribute("download", message.file.originalName);
    actions.append(downloadLink);

    fileBox.append(info, actions);
    article.append(fileBox);
  }

  messagesNode.append(article);
  messagesNode.scrollTop = messagesNode.scrollHeight;

  if (!isHydratingHistory && message.profileId !== profile.profileId && !isChatOpen) {
    setUnread(true);
  }
}

function queueFiles(fileList) {
  const files = [...(fileList || [])].filter((file) => file.size > 0);

  if (!files.length) {
    return;
  }

  pendingFiles = [...pendingFiles, ...files];
  renderAttachmentStrip();
}

function renderAttachmentStrip() {
  attachmentStrip.textContent = "";
  attachmentStrip.hidden = pendingFiles.length === 0;

  pendingFiles.forEach((file, index) => {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";

    const name = document.createElement("span");
    name.className = "attachment-chip__name";
    name.textContent = file.name;

    const removeButton = document.createElement("button");
    removeButton.className = "attachment-chip__remove";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Убрать ${file.name}`);
    removeButton.textContent = "x";
    removeButton.addEventListener("click", () => {
      pendingFiles = pendingFiles.filter((_, currentIndex) => currentIndex !== index);
      renderAttachmentStrip();
    });

    chip.append(name, removeButton);
    attachmentStrip.append(chip);
  });
}

function setDropTarget(isActive) {
  chatShell.classList.toggle("is-drop-target", isActive);
  dropIndicator.hidden = !isActive;
}

function resetDropState() {
  dragDepth = 0;
  isDraggingFiles = false;
  setDropTarget(false);
}

function setComposerBusy(isBusy) {
  attachButton.disabled = isBusy;
  sendButton.disabled = isBusy;
}

async function submitComposer() {
  if (isSubmitting) {
    return;
  }

  const text = messageInput.value.trim();

  if (!text && pendingFiles.length === 0) {
    return;
  }

  isSubmitting = true;
  setComposerBusy(true);

  try {
    if (text) {
      const payload = await requestJson("/api/messages.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileId: profile.profileId,
          nickname: profile.nickname,
          text,
        }),
      });

      appendMessage(payload.message);
      messageInput.value = "";
      autoResizeComposer();
    }

    if (pendingFiles.length > 0) {
      const filesToUpload = [...pendingFiles];

      pendingFiles = [];
      renderAttachmentStrip();

      for (const file of filesToUpload) {
        const message = await uploadFile(file);
        appendMessage(message);
      }
    }

    messageInput.focus();
  } catch (error) {
    window.alert(error.message || "Не удалось отправить сообщение.");
  } finally {
    isSubmitting = false;
    setComposerBusy(false);
  }
}

async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("profileId", profile.profileId);
  formData.append("nickname", profile.nickname);

  const payload = await requestJson("/api/upload.php", {
    method: "POST",
    body: formData,
  });

  return payload.message;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const raw = await response.text();

  let payload = null;

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch (_error) {
    payload = {};
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Запрос завершился с ошибкой.");
  }

  return payload;
}

function loadProfile() {
  try {
    const saved = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (!saved) {
      const nextProfile = createProfile();
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      return nextProfile;
    }

    const parsed = JSON.parse(saved);

    if (!parsed.profileId || !parsed.nickname) {
      const nextProfile = createProfile();
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
      return nextProfile;
    }

    return {
      profileId: String(parsed.profileId),
      nickname: String(parsed.nickname),
    };
  } catch (_error) {
    return createProfile();
  }
}

function saveProfile(nextProfile) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
  } catch (_error) {
    // Ignore storage write failures and continue with the in-memory profile.
  }
}

function createProfile() {
  return {
    profileId: generateProfileId(),
    nickname: `Гость ${Math.floor(1000 + Math.random() * 9000)}`,
  };
}

function generateProfileId() {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    if (typeof crypto.getRandomValues === "function") {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
      return [
        hex.slice(0, 4).join(""),
        hex.slice(4, 6).join(""),
        hex.slice(6, 8).join(""),
        hex.slice(8, 10).join(""),
        hex.slice(10, 16).join(""),
      ].join("-");
    }
  }

  return `guest-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function setChatOpen(nextState, options = {}) {
  const { focusComposer = false, restoreToggleFocus = false } = options;

  isChatOpen = nextState;
  chatPanel.classList.toggle("is-open", nextState);
  chatPanel.setAttribute("aria-hidden", String(!nextState));
  chatBackdrop.hidden = !nextState;
  chatToggle.setAttribute("aria-expanded", String(nextState));
  document.body.classList.toggle("chat-open", nextState);

  if ("inert" in chatPanel) {
    chatPanel.inert = !nextState;
  }

  if (!nextState) {
    resetDropState();

    if (restoreToggleFocus) {
      chatToggle.focus({ preventScroll: true });
    }

    return;
  }

  clearUnread();

  requestAnimationFrame(() => {
    messagesNode.scrollTop = messagesNode.scrollHeight;
    autoResizeComposer();

    if (focusComposer) {
      messageInput.focus();
    }
  });
}

function setUnread(nextState) {
  hasUnread = nextState;
  chatToggle.classList.toggle("has-unread", hasUnread);
}

function clearUnread() {
  setUnread(false);
}

function autoResizeComposer() {
  messageInput.style.height = "auto";
  messageInput.style.height = `${Math.min(Math.max(messageInput.scrollHeight, 54), 180)}px`;
}

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch (_error) {
    return "--:--";
  }
}

function formatBytes(value) {
  if (!Number.isFinite(value)) {
    return "0 Б";
  }

  const units = ["Б", "КБ", "МБ", "ГБ"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function isImageFile(file) {
  return String(file.mimeType || "").startsWith("image/");
}

function buildInlineFileUrl(fileId) {
  return `/api/file.php?id=${encodeURIComponent(fileId)}&mode=inline`;
}

function buildDownloadFileUrl(fileId) {
  return `/api/file.php?id=${encodeURIComponent(fileId)}&mode=download`;
}

function extractFilesFromClipboard(clipboardData) {
  if (!clipboardData?.items?.length) {
    return [];
  }

  const files = [];

  for (const item of clipboardData.items) {
    if (item.kind !== "file") {
      continue;
    }

    const file = item.getAsFile();

    if (!file || !String(file.type || "").startsWith("image/")) {
      continue;
    }

    const extension = getExtensionFromMimeType(file.type);
    const name = file.name && file.name !== "image.png" ? file.name : `clipboard-image.${extension}`;
    files.push(new File([file], name, { type: file.type }));
  }

  return files;
}

function getExtensionFromMimeType(mimeType) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "png";
  }
}
