import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./CreateRoom.module.css";

const CreateRoom = () => {
    const [username, setUsername] = useState("");
    const [mode, setMode] = useState("2min");
    const navigate = useNavigate();

    const handleCreate = () => {
        if (!username.trim()) return alert("Enter your name");
        const roomId = crypto.randomUUID();
        navigate(`/room/${roomId}?user=${username}&host=true&mode=${mode}`);
    };

    return (
        <div className={styles.roomContainer}>
            <h2 className={styles.roomTitle}>Create a New Typing Room</h2>
            <input
                className={styles.roomInput}
                type="text"
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <select
                className={styles.roomSelect}
                value={mode}
                onChange={(e) => setMode(e.target.value)}
            >
                <option value="2min">2 Minutes</option>
                <option value="5min">5 Minutes</option>
                <option value="10min">10 Minutes</option>
                <option value="30min">30 Minutes</option>
            </select>
            <button className={styles.roomButton} onClick={handleCreate}>
                Create Room
            </button>
        </div>
    );
};

export default CreateRoom;
