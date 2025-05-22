import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styles from "./JoinRoom.module.css";

const socket = io("http://localhost:3001");

const JoinRoom = () => {
    const [roomId, setRoomId] = useState("");
    const [username, setUsername] = useState("");
    const [users, setUsers] = useState([]);
    const [prompt, setPrompt] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        // Listen for successful room join from server
        socket.on("room-joined", ({ users, prompt }) => {
            setUsers(users);
            setPrompt(prompt);

            // Navigate to room view
            navigate(`/room/${roomId}?user=${username}`);
        });

        socket.on("player-progress", (users) => {
            setUsers(users);
        });

        return () => {
            socket.off("room-joined");
            socket.off("player-progress");
        };
    }, [roomId, username, navigate]);

    const handleJoin = () => {
        if (!roomId.trim() || !username.trim()) {
            alert("Fill all fields");
            return;
        }
        socket.emit("join-room", { roomId, user: username });
    };

    return (
        <div className={styles.joinRoomContainer}>
            <h2>Join a Race</h2>
            <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className={styles.input}
            />
            <input
                type="text"
                placeholder="Enter Your Name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={styles.input}
            />
            <button onClick={handleJoin} className={styles.button}>
                Join Room
            </button>

            {prompt && (
                <div className={styles.promptSection}>
                    <h4>Prompt:</h4>
                    <p>{prompt}</p>
                </div>
            )}

            {users.length > 0 && (
                <div className={styles.userList}>
                    <h4>Players:</h4>
                    <ul>
                        {users.map((u) => (
                            <li key={u.id}>
                                {u.name} — {u.progress}%
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default JoinRoom;
