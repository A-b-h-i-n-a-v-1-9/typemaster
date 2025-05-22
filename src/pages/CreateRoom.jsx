import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./CreateRoom.module.css";

const CreateRoom = () => {
    const [username, setUsername] = useState("");
    const navigate = useNavigate();

    const handleCreate = () => {
        if (!username.trim()) return alert("Enter your name");
        const roomId = crypto.randomUUID();
        navigate(`/room/${roomId}?user=${username}`);
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
            <button className={styles.roomButton} onClick={handleCreate}>
                Create Room
            </button>
        </div>
    );
};

export default CreateRoom;
