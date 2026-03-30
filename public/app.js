const PROFILE_STORAGE_KEY = "open-room-profile-v1";

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
let currentSocketId = "";
let pendingFiles = [];
let dragDepth = 0;
let isDraggingFiles = false;
let isSubmitting = false;

const socket = io({
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  joinSession();
});

socket.on("disconnect", () => {
  currentSocketId = "";
});

socket.on("chat:message", (message) => {
  appendMessage(message);
});

socket.on("chat:system", () => {});

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

function joinSession() {
  socket.emit("session:join", profile, (response) => {
    if (!response?.ok) {
      return;
    }

    currentSocketId = response.session.socketId;
    profile.profileId = response.session.profileId;
    profile.nickname = response.session.nickname;
    saveProfile(profile);
    renderMessages(response.messages || []);
  });
}

function renderMessages(items) {
  messagesNode.textContent = "";
  items.forEach((item) => appendMessage(item));
}

function appendMessage(message) {
  if (message.type === "system") {
    return;
  }

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
    downloadLink.href = `/api/files/${message.file.id}`;
    downloadLink.textContent = "Скачать";
    downloadLink.setAttribute("download", message.file.originalName);
    actions.append(downloadLink);

    fileBox.append(info, actions);
    article.append(fileBox);
  }

  messagesNode.append(article);
  messagesNode.scrollTop = messagesNode.scrollHeight;
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
      await sendText(text);
      messageInput.value = "";
    }

    if (pendingFiles.length > 0) {
      const filesToUpload = [...pendingFiles];

      pendingFiles = [];
      renderAttachmentStrip();

      for (const file of filesToUpload) {
        await uploadFile(file);
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

function sendText(text) {
  return new Promise((resolve, reject) => {
    socket.emit("chat:send", { text }, (response) => {
      if (!response?.ok) {
        reject(new Error(response?.error || "Не удалось отправить сообщение."));
        return;
      }

      resolve();
    });
  });
}

async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("socketId", currentSocketId);
  formData.append("profileId", profile.profileId);
  formData.append("nickname", profile.nickname);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `Не удалось загрузить ${file.name}.`);
  }
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
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
}

function createProfile() {
  return {
    profileId: crypto.randomUUID(),
    nickname: `Гость ${Math.floor(1000 + Math.random() * 9000)}`,
  };
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
  return `/api/files/${fileId}/content`;
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
