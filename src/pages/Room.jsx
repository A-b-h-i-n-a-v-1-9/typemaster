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
    const [typed, setTyped] = useState("");
    const [startTime, setStartTime] = useState(null);
    const [countdown, setCountdown] = useState(5);
    const [gameStarted, setGameStarted] = useState(false);

    const inputRef = useRef(null);

    useEffect(() => {
        if (!username || !roomId) return;

        socket.emit("join-room", { roomId, user: username });

        socket.on("room-joined", ({ users, prompt }) => {
            setUsers(users);
            setPrompt(prompt);
            setTyped("");
            setStartTime(null);
            setGameStarted(false);
            startCountdown();
        });

        socket.on("player-progress", (updatedUsers) => {
            setUsers(updatedUsers);
        });

        return () => {
            socket.off("room-joined");
            socket.off("player-progress");
        };
    }, [roomId, username]);

    const startCountdown = () => {
        let timeLeft = 5;
        setCountdown(timeLeft);

        const interval = setInterval(() => {
            timeLeft -= 1;
            setCountdown(timeLeft);

            if (timeLeft <= 0) {
                clearInterval(interval);
                setGameStarted(true);
                setStartTime(Date.now());
                inputRef.current?.focus();
            }
        }, 1000);
    };

    const handleKeyDown = (e) => {
        if (!gameStarted || !prompt) return;

        if (e.key === "Backspace") {
            setTyped((prev) => prev.slice(0, -1));
        } else if (e.key.length === 1) {
            const next = typed + e.key;
            setTyped(next);

            const correctChars = [...next].filter((ch, idx) => ch === prompt[idx]).length;
            const totalTyped = next.length;
            const accuracyCalc = totalTyped > 0 ? (correctChars / totalTyped) * 100 : 100;

            const timeElapsedMin = (Date.now() - startTime) / 1000 / 60;
            const grossWpm = (next.split(" ").length / timeElapsedMin) || 0;

            const roundedAccuracy = Math.round(accuracyCalc);
            const roundedWpm = Math.round(grossWpm);

            const finished = next.length >= prompt.length;

            socket.emit("update-progress", {
                roomId,
                user: username,
                progress: correctChars,
                wpm: roundedWpm,
                accuracy: roundedAccuracy,
                finished,
            });
        }
    };

    // Sort users by WPM desc, then accuracy desc for leaderboard
    const sortedUsers = [...users].sort((a, b) => {
        if ((b.wpm || 0) === (a.wpm || 0)) {
            return (b.accuracy || 0) - (a.accuracy || 0);
        }
        return (b.wpm || 0) - (a.wpm || 0);
    });

    const renderPrompt = () => {
        return (
            <div className={styles.promptDisplay}>
                {prompt.split("").map((char, idx) => {
                    let className = styles.defaultChar;

                    if (idx < typed.length) {
                        className = typed[idx] === char ? styles.correctChar : styles.wrongChar;
                    } else if (idx === typed.length) {
                        className = styles.activeChar;
                    }

                    return (
                        <span key={idx} className={className}>
                            {char}
                        </span>
                    );
                })}
            </div>
        );
    };

    const handleRestart = () => {
        socket.emit("restart-game", { roomId });
    };

    return (
        <div className={styles.roomContainer} onClick={() => inputRef.current?.focus()}>
            <div className={styles.topBar}>
                <div className={styles.roomInfo}>
                    Room: {roomId} | You: {username}
                </div>
            </div>

            <div className={styles.mainContent}>
                {/* Leaderboard on left (unchanged) */}
                <div className={styles.leaderboard}>
                    <h4>Leaderboard</h4>
                    <ol>
                        {sortedUsers.map((u, idx) => (
                            <li key={u.id} className={styles.leaderboardItem}>
                                <span className={styles.rank}>{idx + 1}.</span>
                                <span className={styles.leaderboardName}>{u.name}</span>
                                <span className={styles.leaderboardStats}>
                                    {u.wpm || 0} WPM | {u.accuracy || 0}%
                                </span>
                            </li>
                        ))}
                    </ol>
                    <button onClick={handleRestart} className={styles.restartBtn}>
                        Restart
                    </button>
                </div>

                {/* Typing area */}
                <div className={styles.typingArea}>
                    {renderPrompt()}
                    <input
                        ref={inputRef}
                        className={styles.hiddenInput}
                        onKeyDown={handleKeyDown}
                        value=""
                        onChange={() => { }}
                        autoFocus
                        disabled={!gameStarted}
                    />
                </div>
            </div>

            {/* Countdown bubble popup */}
            {!gameStarted && countdown > 0 && (
                <div className={styles.countdownPopup}>
                    Starting in {countdown}...
                </div>
            )}
        </div>
    );
}

export default Room;
