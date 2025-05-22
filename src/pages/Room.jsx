import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import socket from "../socket";
import styles from "./Room.module.css";

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

function Room() {
    const { roomId } = useParams();
    const query = useQuery();
    const username = query.get("user");

    const [users, setUsers] = useState([]);
    const [prompt, setPrompt] = useState("");
    const [input, setInput] = useState("");
    const inputRef = useRef();

    useEffect(() => {
        if (!username || !roomId) return;

        socket.emit("join-room", { roomId, user: username });

        socket.on("room-joined", ({ users, prompt }) => {
            setUsers(users);
            setPrompt(prompt);
            setInput("");
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        });

        socket.on("player-progress", (users) => {
            setUsers(users);
        });

        socket.on("disconnect", () => {
            console.log("Disconnected from server");
        });

        socket.on("connect_error", (err) => {
            console.error("Connection error:", err.message);
        });

        return () => {
            socket.off("room-joined");
            socket.off("player-progress");
            socket.off("disconnect");
            socket.off("connect_error");
        };
    }, [roomId, username]);

    const handleInput = (e) => {
        const value = e.target.value;
        setInput(value);

        const progress = value.length;
        socket.emit("update-progress", {
            roomId,
            user: username,
            progress,
        });
    };

    return (
        <div className={styles.roomWrapper}>
            <h2 className={styles.title}>Room: {roomId}</h2>
            <h3 className={styles.subtitle}>Welcome, {username}</h3>

            <div className={styles.promptDisplay}>
                {prompt.split("").map((char, idx) => {
                    let className = styles.defaultChar;
                    if (idx < input.length) {
                        className =
                            input[idx] === char ? styles.correctChar : styles.wrongChar;
                    }
                    return (
                        <span key={idx} className={className}>
                            {char}
                        </span>
                    );
                })}
            </div>

            <input
                ref={inputRef}
                className={styles.invisibleInput}
                value={input}
                onChange={handleInput}
                disabled={!prompt}
                autoFocus
            />

            <div className={styles.scoreboard}>
                <h4>Live Scoreboard</h4>
                <ul>
                    {users.map((user) => (
                        <li key={user.id}>
                            {user.name}: {user.progress}/{prompt.length} chars
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default Room;
