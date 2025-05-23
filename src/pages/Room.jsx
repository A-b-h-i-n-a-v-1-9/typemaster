// Room.js
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
    const mode = query.get("mode") || "2min";

    const [users, setUsers] = useState([]);
    const [prompt, setPrompt] = useState("");
    const [typed, setTyped] = useState("");
    const [startTime, setStartTime] = useState(null);
    const [countdown, setCountdown] = useState(5); // For game start countdown
    const [gameStarted, setGameStarted] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [gameReady, setGameReady] = useState(false);
    const [roomMode, setRoomMode] = useState(mode);

    // For gameplay timer
    const [timeLeft, setTimeLeft] = useState(getModeSeconds(mode));
    const [gameOver, setGameOver] = useState(false);
    const inputRef = useRef(null);

    // Utility to convert mode to seconds
    function getModeSeconds(m) {
        if (m === "2min") return 120;
        if (m === "5min") return 300;
        if (m === "1min") return 60;
        // fallback
        return 120;
    }

    // Socket event handlers
    useEffect(() => {
        if (!username || !roomId) return;

        socket.emit("join-room", { roomId, user: username, mode });

        socket.on("room-joined", ({ users, prompt, mode, hostId }) => {
            setUsers(users);
            setPrompt(prompt);
            setTyped("");
            setStartTime(null);
            setGameStarted(false);
            setGameReady(false);
            setRoomMode(mode);
            setIsHost(hostId === socket.id);
            setTimeLeft(getModeSeconds(mode));
            setGameOver(false);
            setCountdown(5);
        });

        socket.on("game-started", () => {
            setGameReady(true);
            startCountdown();
        });

        socket.on("player-progress", (updatedUsers) => {
            setUsers(updatedUsers);
        });

        socket.on("restart-ack", () => {
            // Reset everything on restart
            setTyped("");
            setStartTime(null);
            setGameStarted(false);
            setGameReady(false);
            setTimeLeft(getModeSeconds(roomMode));
            setGameOver(false);
            setCountdown(5);
        });

        return () => {
            socket.off("room-joined");
            socket.off("game-started");
            socket.off("player-progress");
            socket.off("restart-ack");
        };
    }, [roomId, username, mode, roomMode]);

    // Start game countdown before actual typing time
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
                startGameTimer();
            }
        }, 1000);
    };

    // Timer for gameplay duration based on mode
    const startGameTimer = () => {
        let duration = getModeSeconds(roomMode);
        setTimeLeft(duration);

        const timerInterval = setInterval(() => {
            duration -= 1;
            setTimeLeft(duration);

            if (duration <= 0) {
                clearInterval(timerInterval);
                setGameOver(true);
                setGameStarted(false);
                inputRef.current?.blur();
                // Optionally emit event that game ended
                socket.emit("end-game", { roomId });
            }
        }, 1000);
    };

    const handleStartGame = () => {
        if (isHost) socket.emit("start-game", { roomId });
    };

    const handleKeyDown = (e) => {
        if (!gameStarted || !prompt || gameOver) return;

        if (e.key === "Backspace") {
            setTyped((prev) => prev.slice(0, -1));
        } else if (e.key.length === 1) {
            const next = typed + e.key;
            setTyped(next);

            const correctChars = [...next].filter((ch, idx) => ch === prompt[idx])
                .length;
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

    const handleRestart = () => {
        if (isHost) socket.emit("restart-game", { roomId });
    };

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

    return (
        <div className={styles.roomContainer} onClick={() => inputRef.current?.focus()}>
            <div className={styles.topBar}>
                <div className={styles.roomInfo}>
                    Room: {roomId} | You: {username} | Mode: {roomMode}
                </div>

                {/* Timer shown on top right */}
                {gameStarted && !gameOver && (
                    <div className={styles.gameTimer}>
                        Time Left: {Math.floor(timeLeft / 60)
                            .toString()
                            .padStart(2, "0")}
                        :
                        {(timeLeft % 60).toString().padStart(2, "0")}
                    </div>
                )}
            </div>

            <div className={styles.mainContent}>
                <div className={styles.scoreboard}>
                    {/* Add Start Game button above Restart */}
                    {!gameReady && isHost && !gameStarted && (
                        <button onClick={handleStartGame} className={styles.startBtn}>
                            Start Game
                        </button>
                    )}

                    {isHost && (
                        <button onClick={handleRestart} className={styles.restartBtn}>
                            Restart
                        </button>
                    )}
                    <h4>Leaderboard</h4>
                    <ol>
                        {sortedUsers.map((u, idx) => (
                            <li key={u.id} className={styles.scoreItem}>
                                <span className={styles.rank}>{idx + 1}.</span>
                                <span className={styles.leaderboardName}>{u.name}</span>
                                <span className={styles.leaderboardStats}>
                                    {u.wpm || 0} WPM | {u.accuracy || 0}%
                                </span>
                            </li>
                        ))}
                    </ol>
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
                        disabled={!gameStarted || gameOver}
                    />

                </div>
            </div>

            {!gameStarted && gameReady && countdown > 0 && (
                <div className={styles.countdownPopup}>Starting in {countdown}...</div>
            )}

            {/* Game Over Popup with celebration */}
            {gameOver && (
                <div className={styles.gameOverPopup}>
                    <h2>Game Over!</h2>
                    <h3>Final Rankings:</h3>
                    <ol>
                        {sortedUsers.map((u, idx) => (
                            <li key={u.id}>
                                {idx + 1}. {u.name} — {u.wpm || 0} WPM | {u.accuracy || 0}%
                            </li>
                        ))}
                    </ol>
                    <div className={styles.confetti}>🎉🎊🎉</div>
                    {isHost && (
                        <button onClick={handleRestart} className={styles.restartBtn}>
                            Restart Game
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default Room;
