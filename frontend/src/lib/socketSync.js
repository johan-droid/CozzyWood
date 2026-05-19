import { io } from "socket.io-client";

function stripApiSuffix(url) {
  if (!url) {
    return "";
  }
  return url.replace(/\/api\/?$/, "");
}

export function getSocketServerUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
  return import.meta.env.VITE_SOCKET_URL || stripApiSuffix(apiUrl);
}

export function createSyncSocket(accessToken) {
  return io(getSocketServerUrl(), {
    path: import.meta.env.VITE_SOCKET_PATH || "/socket.io",
    withCredentials: true,
    transports: ["websocket", "polling"],
    autoConnect: false,
    auth: {
      token: accessToken || "",
    },
  });
}
