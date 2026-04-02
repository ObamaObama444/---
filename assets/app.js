const PROFILE_STORAGE_KEY = "open-room-profile-v1";
const CHAT_MODE_STORAGE_KEY = "open-room-chat-mode-v1";
const AI_THREAD_STORAGE_PREFIX = "open-room-ai-thread-v1:";
const POLL_INTERVAL_MS = 1200;
const TOUCH_OPEN_DELAY_MS = 650;
const AI_MODE = "ai";
const ROOM_MODE = "room";
const MAX_AI_ATTACHMENT_SIZE = 512000;
const MAX_AI_ATTACHMENT_TEXT_LENGTH = 120000;
const TEXT_ATTACHMENT_TYPES = [
  "text/",
  "application/json",
  "application/xml",
  "application/xhtml+xml",
  "application/javascript",
];
const TEXT_ATTACHMENT_EXTENSIONS = [
  ".html",
  ".htm",
  ".txt",
  ".md",
  ".json",
  ".xml",
  ".csv",
  ".js",
  ".ts",
  ".py",
  ".sql",
];

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
const chatModeButton = document.querySelector("#chat-mode-button");
const chatModeMenu = document.querySelector("#chat-mode-menu");
const chatModeLabel = document.querySelector("#chat-mode-label");
const chatModeOptions = [...document.querySelectorAll(".chat-mode-option")];

let profile = loadProfile();
let pendingFiles = [];
let roomMessages = [];
let aiThread = loadAiThread();
let currentMode = loadChatMode();
let dragDepth = 0;
let isDraggingFiles = false;
let isAiSubmitting = false;
let isRoomMessageSubmitting = false;
let activeRoomUploads = 0;
let isChatOpen = false;
let hasUnread = false;
let isHydratingHistory = false;
let renderedMessageIds = new Set();
let lastMessageId = "";
let pollTimerId = null;
let isPolling = false;
let isToggleHovered = false;
let touchOpenTimerId = null;

chatToggle.addEventListener("click", (event) => {
  event.preventDefault();
});

chatToggle.addEventListener("pointerenter", () => {
  isToggleHovered = true;

  if (!isChatOpen) {
    chatToggle.focus({ preventScroll: true });
  }
});

chatToggle.addEventListener("pointerleave", () => {
  isToggleHovered = false;

  if (!isChatOpen && document.activeElement === chatToggle) {
    chatToggle.blur();
  }
});

chatToggle.addEventListener("keydown", (event) => {
  if (event.key !== " " && event.key !== "Spacebar") {
    return;
  }

  if (!isToggleHovered || isChatOpen) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  setChatOpen(true, { focusComposer: true });
});

chatToggle.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch") {
    return;
  }

  clearTouchOpenTimer();
  touchOpenTimerId = window.setTimeout(() => {
    touchOpenTimerId = null;
    setChatOpen(true, { focusComposer: true });
  }, TOUCH_OPEN_DELAY_MS);
});

chatToggle.addEventListener("pointerup", clearTouchOpenTimer);
chatToggle.addEventListener("pointercancel", clearTouchOpenTimer);
chatToggle.addEventListener("pointermove", clearTouchOpenTimer);
chatToggle.addEventListener("blur", () => {
  isToggleHovered = false;
  clearTouchOpenTimer();
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

  if (event.key === "Escape") {
    closeModeMenu();
  }
});

chatModeButton.addEventListener("click", () => {
  const nextExpanded = chatModeButton.getAttribute("aria-expanded") !== "true";
  chatModeButton.setAttribute("aria-expanded", String(nextExpanded));
  chatModeMenu.hidden = !nextExpanded;
});

document.addEventListener("click", (event) => {
  if (!chatModeMenu || !chatModeButton) {
    return;
  }

  if (chatModeMenu.hidden) {
    return;
  }

  const target = event.target;

  if (target instanceof Node && (chatModeMenu.contains(target) || chatModeButton.contains(target))) {
    return;
  }

  closeModeMenu();
});

for (const option of chatModeOptions) {
  option.addEventListener("click", () => {
    setChatMode(option.dataset.mode === AI_MODE ? AI_MODE : ROOM_MODE);
    closeModeMenu();
  });
}

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

window.addEventListener("drop", resetDropState);
window.addEventListener("dragend", resetDropState);
window.addEventListener("blur", resetDropState);

setChatOpen(false);
setChatMode(currentMode);
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
    aiThread = loadAiThread();
    roomMessages = payload.messages || [];
    renderCurrentConversation();
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
    const incoming = payload.messages || [];

    if (incoming.length === 0) {
      return;
    }

    roomMessages = lastMessageId ? [...roomMessages, ...incoming] : incoming;
    roomMessages = roomMessages.slice(-250);

    if (currentMode === ROOM_MODE) {
      for (const message of incoming) {
        appendRoomMessage(message);
      }
    } else if (incoming.some((message) => message.profileId !== profile.profileId)) {
      setUnread(true);
    }
  } catch (_error) {
    // Ignore transient polling errors.
  } finally {
    isPolling = false;
  }
}

function renderCurrentConversation() {
  if (currentMode === AI_MODE) {
    renderAiThread();
    return;
  }

  renderRoomMessages(roomMessages);
}

function renderRoomMessages(items) {
  isHydratingHistory = true;
  renderedMessageIds = new Set();
  lastMessageId = "";
  messagesNode.textContent = "";
  items.forEach((item) => appendRoomMessage(item));
  isHydratingHistory = false;
}

function appendRoomMessage(message) {
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

  const article = renderMessageNode({
    kind: ROOM_MODE,
    role: message.profileId === profile.profileId ? "user" : "assistant",
    author: message.author,
    profileId: message.profileId,
    text: message.text || "",
    file: message.file || null,
    createdAt: message.createdAt,
  });

  messagesNode.append(article);
  messagesNode.scrollTop = messagesNode.scrollHeight;

  if (!isHydratingHistory && message.profileId !== profile.profileId && !isChatOpen) {
    setUnread(true);
  }
}

function renderAiThread() {
  messagesNode.textContent = "";

  if (aiThread.length === 0) {
    const empty = document.createElement("article");
    empty.className = "message";

    const meta = document.createElement("div");
    meta.className = "message__meta";
    meta.textContent = "Ассистент";

    const text = document.createElement("div");
    text.className = "message__text";
    text.textContent = "Можешь отправить вопрос по программированию или математике и приложить HTML-файл с заданием.";

    empty.append(meta, text);
    messagesNode.append(empty);
    messagesNode.scrollTop = 0;
    return;
  }

  aiThread.forEach((entry) => {
    messagesNode.append(renderMessageNode({
      kind: AI_MODE,
      role: entry.role,
      author: entry.role === "assistant" ? "Ассистент" : profile.nickname,
      text: entry.text || "",
      createdAt: entry.createdAt,
      attachments: entry.attachments || [],
    }));
  });

  messagesNode.scrollTop = messagesNode.scrollHeight;
}

function renderMessageNode({ kind, role, author, profileId = "", text = "", file = null, createdAt, attachments = [] }) {
  const article = document.createElement("article");
  article.className = "message";

  if (kind === ROOM_MODE && profileId === profile.profileId) {
    article.classList.add("message--own");
  }

  if (kind === AI_MODE && role === "assistant") {
    article.classList.add("message--assistant");
  }

  const meta = document.createElement("div");
  meta.className = "message__meta";

  const authorNode = document.createElement("span");
  authorNode.className = "message__author";
  authorNode.textContent = author;

  const time = document.createElement("span");
  time.textContent = formatTime(createdAt);
  meta.append(authorNode, time);
  article.append(meta);

  if (text) {
    const textNode = document.createElement("div");
    textNode.className = "message__text";
    textNode.textContent = text;
    article.append(textNode);
  }

  if (attachments.length > 0) {
    const note = document.createElement("div");
    note.className = "message__attachments-note";

    attachments.forEach((attachment) => {
      const chip = document.createElement("span");
      chip.textContent = attachment.name;
      note.append(chip);
    });

    article.append(note);
  }

  if (kind === ROOM_MODE && file) {
    if (isImageFile(file)) {
      const previewLink = document.createElement("a");
      previewLink.className = "message__image-link";
      previewLink.href = buildInlineFileUrl(file.id);
      previewLink.target = "_blank";
      previewLink.rel = "noreferrer";

      const image = document.createElement("img");
      image.className = "message__image";
      image.src = buildInlineFileUrl(file.id);
      image.alt = file.originalName;
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
    name.textContent = file.originalName;

    const size = document.createElement("span");
    size.className = "message__file-size";
    size.textContent = `${formatBytes(file.size)} • ${file.mimeType || "файл"}`;

    info.append(name, size);

    const actions = document.createElement("div");
    actions.className = "file-actions";

    if (isImageFile(file)) {
      const openLink = document.createElement("a");
      openLink.className = "file-link";
      openLink.href = buildInlineFileUrl(file.id);
      openLink.target = "_blank";
      openLink.rel = "noreferrer";
      openLink.textContent = "Открыть";
      actions.append(openLink);
    }

    const downloadLink = document.createElement("a");
    downloadLink.className = "file-link";
    downloadLink.href = buildDownloadFileUrl(file.id);
    downloadLink.textContent = "Скачать";
    downloadLink.setAttribute("download", file.originalName);
    actions.append(downloadLink);

    fileBox.append(info, actions);
    article.append(fileBox);
  }

  return article;
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
  chatModeButton.disabled = isBusy;
}

function updateComposerAvailability() {
  const isBusy = isAiSubmitting;
  setComposerBusy(isBusy);
}

async function submitComposer() {
  if (currentMode === AI_MODE && isAiSubmitting) {
    return;
  }

  if (currentMode === ROOM_MODE && isRoomMessageSubmitting) {
    return;
  }

  const text = messageInput.value.trim();

  if (!text && pendingFiles.length === 0) {
    return;
  }

  try {
    if (currentMode === AI_MODE) {
      isAiSubmitting = true;
      updateComposerAvailability();
      await submitAiMessage(text);
      pendingFiles = [];
    } else {
      isRoomMessageSubmitting = true;
      await submitRoomMessage(text);
    }

    messageInput.value = "";
    renderAttachmentStrip();
    autoResizeComposer();
    messageInput.focus();
  } catch (error) {
    window.alert(error.message || "Не удалось отправить сообщение.");
  } finally {
    isAiSubmitting = false;
    isRoomMessageSubmitting = false;
    updateComposerAvailability();
  }
}

async function submitRoomMessage(text) {
  const filesToUpload = [...pendingFiles];

  pendingFiles = [];
  renderAttachmentStrip();

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

    roomMessages = [...roomMessages, payload.message].slice(-250);
    appendRoomMessage(payload.message);
  }

  if (filesToUpload.length > 0) {
    void uploadRoomFilesInBackground(filesToUpload);
  }
}

async function submitAiMessage(text) {
  const preparedAttachments = await prepareAiAttachments(pendingFiles);

  if (!text && preparedAttachments.length === 0) {
    throw new Error("Для AI-чата нужен текст или поддерживаемый HTML/TXT/JSON-файл.");
  }

  const userEntry = {
    id: generateLocalId(),
    role: "user",
    text: text || "Разбери вложенное задание.",
    createdAt: new Date().toISOString(),
    attachments: preparedAttachments.map((attachment) => ({
      name: attachment.name,
      mimeType: attachment.mimeType,
    })),
  };

  aiThread = [...aiThread, userEntry];
  saveAiThread(aiThread);
  renderAiThread();

  const payload = await requestJson("/api/ai.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profileId: profile.profileId,
      nickname: profile.nickname,
      message: userEntry.text,
      attachments: preparedAttachments,
      history: aiThread.slice(-10).map((entry) => ({
        role: entry.role,
        text: entry.text,
      })),
    }),
  });

  aiThread = [...aiThread, payload.message];
  saveAiThread(aiThread);
  renderAiThread();
}

async function uploadRoomFile(file) {
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

async function uploadRoomFilesInBackground(files) {
  activeRoomUploads += files.length;

  try {
    for (const file of files) {
      try {
        const message = await uploadRoomFile(file);
        roomMessages = [...roomMessages, message].slice(-250);

        if (currentMode === ROOM_MODE) {
          appendRoomMessage(message);
        } else {
          setUnread(true);
        }
      } catch (error) {
        window.alert(error.message || `Не удалось загрузить файл ${file.name}.`);
      } finally {
        activeRoomUploads = Math.max(0, activeRoomUploads - 1);
      }
    }
  } finally {
    activeRoomUploads = Math.max(0, activeRoomUploads);
  }
}

async function prepareAiAttachments(files) {
  const prepared = [];

  for (const file of files) {
    if (!isTextAttachment(file)) {
      throw new Error(`AI-чат пока принимает HTML/TXT/JSON/MD/кодовые текстовые файлы. Файл ${file.name} не поддерживается.`);
    }

    if (file.size > MAX_AI_ATTACHMENT_SIZE) {
      throw new Error(`Файл ${file.name} слишком большой для AI-чата. Лимит 500 КБ на файл.`);
    }

    const raw = await file.text();
    const trimmed = raw.slice(0, MAX_AI_ATTACHMENT_TEXT_LENGTH);

    prepared.push({
      name: file.name,
      mimeType: file.type || "text/plain",
      content: trimmed,
    });
  }

  return prepared;
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
    // Ignore storage failures.
  }
}

function createProfile() {
  return {
    profileId: generateProfileId(),
    nickname: `Гость ${Math.floor(1000 + Math.random() * 9000)}`,
  };
}

function loadChatMode() {
  try {
    return localStorage.getItem(CHAT_MODE_STORAGE_KEY) === AI_MODE ? AI_MODE : ROOM_MODE;
  } catch (_error) {
    return ROOM_MODE;
  }
}

function setChatMode(nextMode) {
  currentMode = nextMode === AI_MODE ? AI_MODE : ROOM_MODE;

  try {
    localStorage.setItem(CHAT_MODE_STORAGE_KEY, currentMode);
  } catch (_error) {
    // Ignore storage failures.
  }

  chatModeLabel.textContent = currentMode === AI_MODE ? "Ассистент" : "Общий чат";
  messageInput.placeholder =
    currentMode === AI_MODE ? "Напиши вопрос по заданию или коду" : "Сообщение";

  chatModeOptions.forEach((option) => {
    option.classList.toggle("is-active", option.dataset.mode === currentMode);
  });

  renderCurrentConversation();
}

function closeModeMenu() {
  chatModeMenu.hidden = true;
  chatModeButton.setAttribute("aria-expanded", "false");
}

function loadAiThread() {
  try {
    const raw = localStorage.getItem(AI_THREAD_STORAGE_PREFIX + profile.profileId);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch (_error) {
    return [];
  }
}

function saveAiThread(thread) {
  try {
    localStorage.setItem(AI_THREAD_STORAGE_PREFIX + profile.profileId, JSON.stringify(thread.slice(-40)));
  } catch (_error) {
    // Ignore storage failures.
  }
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

function generateLocalId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
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
    closeModeMenu();

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

function clearTouchOpenTimer() {
  if (!touchOpenTimerId) {
    return;
  }

  window.clearTimeout(touchOpenTimerId);
  touchOpenTimerId = null;
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

function isTextAttachment(file) {
  const mimeType = String(file.type || "").toLowerCase();
  const fileName = String(file.name || "").toLowerCase();

  if (TEXT_ATTACHMENT_TYPES.some((prefix) => mimeType.startsWith(prefix))) {
    return true;
  }

  return TEXT_ATTACHMENT_EXTENSIONS.some((extension) => fileName.endsWith(extension));
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
