import { io } from "socket.io-client";

const socket = io("https://typemaster-io10.onrender.com/", {
    transports: ["websocket"],
    autoConnect: true,
});

export default socket;
