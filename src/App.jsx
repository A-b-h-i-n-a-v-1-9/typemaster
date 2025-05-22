import React, { useEffect, useState } from "react";
import socket from "../socket";

function Room({ roomId, username }) {
    const [users, setUsers] = useState([]);
    const [prompt, setPrompt] = useState("");

    useEffect(() => {
        console.log(`🔌 Connecting to room: ${roomId} as user: ${username}`);
        socket.emit("join-room", { roomId, user: username });

        socket.on("room-joined", ({ users, prompt }) => {
            console.log("✅ Room joined:", users);
            setUsers(users);
            setPrompt(prompt);
        });

        socket.on("player-progress", (users) => {
            setUsers(users);
        });

        socket.on("disconnect", () => {
            console.log("❌ Disconnected from server");
        });

        socket.on("connect_error", (err) => {
            console.error("❌ Connection error:", err.message);
        });

        return () => {
            socket.off("room-joined");
            socket.off("player-progress");
            socket.off("disconnect");
            socket.off("connect_error");
        };
    }, [roomId, username]);

    return (
        <div>
            <h2>Room: {roomId}</h2>
            <p><strong>Prompt:</strong> {prompt || "⏳ Loading prompt... please wait."}</p>
            <ul>
                {users.map(user => (
                    <li key={user.id}>{user.name}: {user.progress}%</li>
                ))}
            </ul>
        </div>
    );
}

export default Room;

