// import { io } from "socket.io-client";
// import { SOCKET_URL } from "./api";

// let socket;
// let activeToken = null;

// export function getSocket() {
//   const token = localStorage.getItem("token");
//   if (!token) return null;

//   if (!socket) {
//     socket = io(SOCKET_URL, {
//       autoConnect: false,
//       withCredentials: true,
//       auth: { token },
//     });
//     activeToken = token;
//   } else {
//     if (activeToken !== token) {
//       socket.disconnect();
//       socket.auth = { token };
//       activeToken = token;
//     }
//   }

//   if (!socket.connected) {
//     socket.connect();
//   }

//   return socket;
// }

// export function disconnectSocket() {
//   if (socket) {
//     socket.disconnect();
//     socket = null;
//   }
//   activeToken = null;
// }


import { io } from "socket.io-client";
import { SOCKET_URL } from "./api";

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}