const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const activeSockets = new Map();
let ioInstance;

function getOrigins() {
  const raw = process.env.CLIENT_ORIGIN || process.env.CLIENT_ORIGINS || "";
  if (!raw) return ["*"];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function attachSocket(server) {
  if (ioInstance) {
    return ioInstance;
  }

  const allowedOrigins = getOrigins();

  ioInstance = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  ioInstance.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error("Not authorized"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = decoded?.id?.toString?.();
      if (!socket.data.userId) {
        return next(new Error("Not authorized"));
      }
      return next();
    } catch (_err) {
      return next(new Error("Not authorized"));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.data.userId;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    if (!activeSockets.has(userId)) {
      activeSockets.set(userId, new Set());
    }
    const userSockets = activeSockets.get(userId);
    userSockets.add(socket);

    socket.on("disconnect", () => {
      const sockets = activeSockets.get(userId);
      if (!sockets) {
        return;
      }
      sockets.delete(socket);
      if (sockets.size === 0) {
        activeSockets.delete(userId);
      }
    });
  });

  return ioInstance;
}

function emitToUser(userId, event, payload) {
  if (!userId) return;
  const sockets = activeSockets.get(userId.toString());
  if (!sockets?.size) {
    return;
  }
  sockets.forEach((socket) => {
    socket.emit(event, payload);
  });
}

function getIO() {
  return ioInstance;
}

module.exports = {
  attachSocket,
  emitToUser,
  getIO,
};
