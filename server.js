const express = require("express");
const http = require("http");
const multer = require("multer");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const PORT = Number(process.env.PORT) || 8000;
const MAX_HISTORY = 250;
const MAX_MESSAGE_LENGTH = 1500;
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const dataDir = path.join(__dirname, "data");
const uploadsDir = path.join(__dirname, "uploads");
const messagesFile = path.join(dataDir, "messages.json");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

if (!fs.existsSync(messagesFile)) {
  fs.writeFileSync(messagesFile, "[]\n", "utf8");
}

const activeUsers = new Map();
let messages = loadMessages();
let persistQueue = Promise.resolve();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadsDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname)
        .replace(/[^\w.]/g, "")
        .slice(0, 16);

      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    online: activeUsers.size,
    messages: messages.length,
  });
});

app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "Файл не был передан." });
    }

    const socketId = cleanSocketId(req.body.socketId);
    const currentUser = activeUsers.get(socketId);
    const fallbackName = normalizeNickname(req.body.nickname, createGuestNickname());
    const author = currentUser ? currentUser.nickname : fallbackName;
    const profileId = currentUser?.profileId || cleanProfileId(req.body.profileId) || randomUUID();

    const fileMeta = {
      id: randomUUID(),
      originalName: sanitizeFilename(req.file.originalname),
      storedName: req.file.filename,
      mimeType: req.file.mimetype || "application/octet-stream",
      size: req.file.size,
    };

    const message = {
      id: randomUUID(),
      type: "file",
      author,
      profileId,
      createdAt: new Date().toISOString(),
      file: fileMeta,
    };

    appendMessage(message);
    await persistMessages();
    io.emit("chat:message", message);

    return res.status(201).json({ ok: true, message });
  } catch (error) {
    if (req.file?.filename) {
      safeUnlink(path.join(uploadsDir, req.file.filename));
    }

    return res.status(500).json({
      ok: false,
      error: "Не удалось загрузить файл.",
    });
  }
});

app.get("/api/files/:fileId/content", (req, res) => {
  const message = messages.find((item) => item.file?.id === req.params.fileId);

  if (!message?.file) {
    return res.status(404).send("Файл не найден.");
  }

  const target = path.join(uploadsDir, message.file.storedName);

  if (!fs.existsSync(target)) {
    return res.status(404).send("Файл отсутствует на диске.");
  }

  res.type(message.file.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${message.file.originalName}"`);

  return res.sendFile(target);
});

app.get("/api/files/:fileId", (req, res) => {
  const message = messages.find((item) => item.file?.id === req.params.fileId);

  if (!message?.file) {
    return res.status(404).send("Файл не найден.");
  }

  const target = path.join(uploadsDir, message.file.storedName);

  if (!fs.existsSync(target)) {
    return res.status(404).send("Файл отсутствует на диске.");
  }

  return res.download(target, message.file.originalName);
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        ok: false,
        error: `Файл слишком большой. Лимит ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} МБ.`,
      });
    }

    return res.status(400).json({
      ok: false,
      error: "Ошибка загрузки файла.",
    });
  }

  return res.status(500).json({
    ok: false,
    error: "Внутренняя ошибка сервера.",
  });
});

io.on("connection", (socket) => {
  socket.on("session:join", (payload = {}, callback = () => {}) => {
    const profileId = cleanProfileId(payload.profileId) || randomUUID();
    const nickname = normalizeNickname(payload.nickname, createGuestNickname());

    activeUsers.set(socket.id, {
      socketId: socket.id,
      profileId,
      nickname,
      connectedAt: new Date().toISOString(),
    });

    const joinedUser = activeUsers.get(socket.id);
    broadcastParticipants();
    broadcastSystemNotice(`${nickname} вошёл в чат`, socket.id);

    callback({
      ok: true,
      session: {
        socketId: socket.id,
        profileId: joinedUser.profileId,
        nickname: joinedUser.nickname,
      },
      messages,
      participants: getParticipants(),
    });
  });

  socket.on("profile:update", (payload = {}, callback = () => {}) => {
    const currentUser = activeUsers.get(socket.id);

    if (!currentUser) {
      return callback({ ok: false, error: "Сессия не найдена." });
    }

    const previousNickname = currentUser.nickname;
    const nextNickname = normalizeNickname(payload.nickname, previousNickname);

    currentUser.nickname = nextNickname;
    activeUsers.set(socket.id, currentUser);

    broadcastParticipants();

    if (previousNickname !== nextNickname) {
      io.emit("profile:updated", {
        profileId: currentUser.profileId,
        previousNickname,
        nickname: nextNickname,
      });
      broadcastSystemNotice(`${previousNickname} теперь известен как ${nextNickname}`);
    }

    return callback({
      ok: true,
      session: {
        socketId: socket.id,
        profileId: currentUser.profileId,
        nickname: currentUser.nickname,
      },
    });
  });

  socket.on("chat:send", async (payload = {}, callback = () => {}) => {
    const currentUser = activeUsers.get(socket.id);

    if (!currentUser) {
      return callback({ ok: false, error: "Сначала нужно войти в чат." });
    }

    const text = normalizeMessage(payload.text);

    if (!text) {
      return callback({ ok: false, error: "Сообщение пустое." });
    }

    const message = {
      id: randomUUID(),
      type: "text",
      author: currentUser.nickname,
      profileId: currentUser.profileId,
      text,
      createdAt: new Date().toISOString(),
    };

    appendMessage(message);
    await persistMessages();
    io.emit("chat:message", message);

    return callback({ ok: true });
  });

  socket.on("disconnect", () => {
    const currentUser = activeUsers.get(socket.id);

    if (!currentUser) {
      return;
    }

    activeUsers.delete(socket.id);
    broadcastParticipants();
    broadcastSystemNotice(`${currentUser.nickname} вышел из чата`);
  });
});

server.listen(PORT, () => {
  console.log(`Chat is running on http://localhost:${PORT}`);
});

function loadMessages() {
  try {
    const raw = fs.readFileSync(messagesFile, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.slice(-MAX_HISTORY);
  } catch (_error) {
    return [];
  }
}

function persistMessages() {
  persistQueue = persistQueue
    .then(() => fs.promises.writeFile(messagesFile, `${JSON.stringify(messages, null, 2)}\n`, "utf8"))
    .catch((error) => {
      console.error("Failed to save messages:", error);
    });

  return persistQueue;
}

function appendMessage(message) {
  messages = [...messages, message].slice(-MAX_HISTORY);
}

function getParticipants() {
  return [...activeUsers.values()]
    .map((user) => ({
      socketId: user.socketId,
      profileId: user.profileId,
      nickname: user.nickname,
      connectedAt: user.connectedAt,
    }))
    .sort((left, right) => left.nickname.localeCompare(right.nickname, "ru"));
}

function broadcastParticipants() {
  io.emit("participants:update", getParticipants());
}

function broadcastSystemNotice(text, excludedSocketId) {
  const payload = {
    id: randomUUID(),
    type: "system",
    text,
    createdAt: new Date().toISOString(),
  };

  if (excludedSocketId) {
    return io.except(excludedSocketId).emit("chat:system", payload);
  }

  return io.emit("chat:system", payload);
}

function normalizeNickname(value, fallback) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);

  return text || fallback;
}

function normalizeMessage(value) {
  const text = String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);

  return text;
}

function cleanProfileId(value) {
  const text = String(value || "")
    .replace(/[^\w-]/g, "")
    .slice(0, 64);

  return text;
}

function cleanSocketId(value) {
  return String(value || "")
    .replace(/[^\w-]/g, "")
    .slice(0, 64);
}

function sanitizeFilename(value) {
  const clean = path.basename(String(value || "file"))
    .replace(/[^\w.\-() ]/g, "_")
    .slice(0, 120)
    .trim();

  return clean || "file";
}

function createGuestNickname() {
  return `Гость ${Math.floor(1000 + Math.random() * 9000)}`;
}

function safeUnlink(target) {
  fs.promises.unlink(target).catch(() => {});
}
