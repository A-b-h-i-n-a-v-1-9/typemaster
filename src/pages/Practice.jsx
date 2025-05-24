import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import styles from "./Room.module.css";

const SERVER_URL = "http://localhost:3001"; // Your backend server URL

function PracticePage({ roomId = "practice-room", userName = "Guest" }) {
    const [prompt, setPrompt] = useState("Loading prompt...");
    const [typed, setTyped] = useState("");
    const [timeLeft, setTimeLeft] = useState(120); // default 2min
    const [gameOver, setGameOver] = useState(false);
    const [inputEnabled, setInputEnabled] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [mode, setMode] = useState("2min");

    const inputRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        const socket = io(SERVER_URL);

        socketRef.current = socket;

        socket.emit("join-room", { roomId, user: userName, mode });

        socket.on("room-joined", ({ prompt: newPrompt, mode: newMode }) => {
            setPrompt(newPrompt);
            setMode(newMode);
            setTimeLeft(getModeSeconds(newMode));
            setTyped("");
            setGameOver(false);
            setInputEnabled(false);
            setCountdown(null);
        });

        socket.on("countdown-tick", (count) => {
            setCountdown(count > 0 ? count : null);
            if (count === 0) {
                setInputEnabled(true);
                inputRef.current?.focus();
            }
        });

        socket.on("game-start", ({ prompt: newPrompt, mode: newMode }) => {
            setPrompt(newPrompt);
            setMode(newMode);
            setTimeLeft(getModeSeconds(newMode));
            setGameOver(false);
            setInputEnabled(true);
            setCountdown(null);
            setTyped("");
            inputRef.current?.focus();
            startTimer(getModeSeconds(newMode));
        });

        socket.on("player-progress", (users) => {
            // Optional: Could show other players progress here
        });

        return () => {
            socket.disconnect();
        };
    }, [roomId, userName, mode]);

    const timerRef = useRef(null);

    const clearTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const startTimer = (duration) => {
        clearTimer();
        let time = duration;
        setTimeLeft(time);
        timerRef.current = setInterval(() => {
            time -= 1;
            setTimeLeft(time);
            if (time <= 0) {
                clearTimer();
                setGameOver(true);
                setInputEnabled(false);
                inputRef.current?.blur();
            }
        }, 1000);
    };

    const getModeSeconds = (m) => {
        if (m === "2min") return 120;
        if (m === "5min") return 300;
        if (m === "10min") return 600;
        if (m === "30min") return 1800;
        return 120;
    };

    const handleKeyDown = (e) => {
        if (!inputEnabled || gameOver) return;
        e.preventDefault();

        if (e.key === "Backspace") {
            setTyped((prev) => prev.slice(0, -1));
            sendProgress(typed.length - 1);
        } else if (e.key.length === 1 && typed.length < prompt.length) {
            const newTyped = typed + e.key;
            setTyped(newTyped);
            sendProgress(newTyped.length);
        }
    };

    const sendProgress = (progress) => {
        if (!socketRef.current) return;
        const correctChars = [...typed].filter((ch, idx) => ch === prompt[idx]).length;
        const totalTyped = typed.length;
        const accuracy = totalTyped > 0 ? (correctChars / totalTyped) * 100 : 100;
        const timeElapsedMin = (getModeSeconds(mode) - timeLeft) / 60;
        const wpm = timeElapsedMin > 0 ? typed.split(" ").length / timeElapsedMin : 0;

        socketRef.current.emit("update-progress", {
            roomId,
            user: userName,
            progress,
            wpm: Math.round(wpm),
            accuracy: Math.round(accuracy),
        });
    };

    const handleRestart = () => {
        if (!socketRef.current) return;
        socketRef.current.emit("restart-game", { roomId });
    };

    const handleStart = () => {
        if (!socketRef.current) return;
        socketRef.current.emit("start-game", { roomId });
    };

    const renderPrompt = () => (
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

    // Metrics calculation
    const correctChars = [...typed].filter((ch, idx) => ch === prompt[idx]).length;
    const totalTyped = typed.length;
    const accuracy = totalTyped > 0 ? ((correctChars / totalTyped) * 100).toFixed(0) : 100;
    const timeElapsedMin = (getModeSeconds(mode) - timeLeft) / 60;
    const wpm = timeElapsedMin > 0 ? (typed.split(" ").length / timeElapsedMin).toFixed(0) : 0;

    return (
        <div className={styles.roomContainer} onClick={() => inputRef.current?.focus()}>
            <div className={styles.topBar}>
                <div className={styles.roomInfo}>
                    Practice Mode | Time Left:{" "}
                    {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
                    {String(timeLeft % 60).padStart(2, "0")}
                </div>
            </div>

            <div className={styles.mainContent}>
                <div className={styles.scoreboard}>
                    <div className={styles.buttonGroup}>
                        <button
                            onClick={handleStart}
                            className={styles.startBtn}
                            disabled={inputEnabled && !gameOver}
                        >
                            Start
                        </button>
                        <button onClick={handleRestart} className={styles.restartBtn}>
                            Restart
                        </button>
                    </div>
                    <h4>Your Stats</h4>
                    <p>{wpm} WPM | {accuracy}% Accuracy</p>
                </div>

                <div className={styles.typingArea}>
                    {renderPrompt()}
                    <input
                        ref={inputRef}
                        className={styles.hiddenInput}
                        onKeyDown={handleKeyDown}
                        value=""
                        onChange={() => { }}
                        autoFocus
                        disabled={!inputEnabled || gameOver}
                        spellCheck={false}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                    />
                </div>
            </div>

            {countdown !== null && (
                <div className={styles.countdownPopup}>Starting in {countdown}...</div>
            )}

            {gameOver && (
                <div className={styles.gameOverOverlay}>
                    <div className={styles.gameOverContent}>
                        <h1>Practice Over!</h1>
                        <p>WPM: {wpm}</p>
                        <p>Accuracy: {accuracy}%</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PracticePage;
