import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import socket from "../socket";
import styles from "./Room.module.css";

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

function getModeSeconds(m) {
    if (m === "2min") return 120;
    if (m === "5min") return 300;
    if (m === "1min") return 60;
    return 120;
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
    const [countdown, setCountdown] = useState(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [gameReady, setGameReady] = useState(false);
    const [roomMode, setRoomMode] = useState(mode);
    const [timeLeft, setTimeLeft] = useState(getModeSeconds(mode));
    const [gameOver, setGameOver] = useState(false);
    const [inputEnabled, setInputEnabled] = useState(false);

    const inputRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const gameTimerIntervalRef = useRef(null);

    const clearIntervals = () => {
        clearInterval(countdownIntervalRef.current);
        clearInterval(gameTimerIntervalRef.current);
        countdownIntervalRef.current = null;
        gameTimerIntervalRef.current = null;
    };

    const startGameTimer = useCallback(() => {
        clearIntervals();
        let duration = getModeSeconds(roomMode);
        setTimeLeft(duration);

        gameTimerIntervalRef.current = setInterval(() => {
            duration -= 1;
            setTimeLeft(duration);
            if (duration <= 0) {
                clearInterval(gameTimerIntervalRef.current);
                gameTimerIntervalRef.current = null;
                setGameOver(true);
                setGameStarted(false);
                setInputEnabled(false);
                inputRef.current?.blur();
                socket.emit("end-game", { roomId });
            }
        }, 1000);
    }, [roomMode, roomId]);

    const startCountdown = useCallback(() => {
        clearIntervals();
        let time = 5;
        setCountdown(time);
        countdownIntervalRef.current = setInterval(() => {
            time -= 1;
            setCountdown(time);
            if (time <= 0) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
                setCountdown(null);
                setGameStarted(true);
                setStartTime(Date.now());
                startGameTimer();
            }
        }, 1000);
    }, [startGameTimer]);

    useEffect(() => {
        if (!username || !roomId) return;

        console.log("Emitting join-room with:", { roomId, user: username, mode });
        socket.emit("join-room", { roomId, user: username, mode });

        socket.on("room-joined", ({ users, prompt, mode, hostId }) => {
            console.log("room-joined event received:", { users, prompt, mode, hostId });
            console.log("socket.id:", socket.id);
            setUsers(users);
            setPrompt(prompt);
            setTyped("");
            setStartTime(null);
            setGameStarted(false);
            setGameReady(false);
            setRoomMode(mode);
            setIsHost(hostId === socket.id);
            console.log("isHost set to:", hostId === socket.id);
            setTimeLeft(getModeSeconds(mode));
            setGameOver(false);
            setCountdown(null);
            setInputEnabled(false);
        });

        socket.on("game-start", ({ prompt, mode }) => {
            console.log("Game started event received", { prompt, mode });
            setGameReady(true);
            setInputEnabled(true);
            inputRef.current?.focus();
            startCountdown();
        });


        socket.on("player-progress", setUsers);

        socket.on("restart-ack", () => {
            console.log("restart-ack event received");
            clearIntervals();
            setTyped("");
            setStartTime(null);
            setGameStarted(false);
            setGameReady(false);
            setTimeLeft(getModeSeconds(roomMode));
            setGameOver(false);
            setCountdown(null);
            setInputEnabled(false);
            inputRef.current?.focus();
        });

        return () => {
            clearIntervals();
            socket.off("room-joined");
            socket.off("game-started");
            socket.off("player-progress");
            socket.off("restart-ack");
        };
    }, [roomId, username, mode, roomMode, startCountdown]);

    const handleStartGame = () => {
        console.log("Start Game button clicked");

        // Log the state you want to check
        const showStartBtn = !gameReady && isHost && !gameStarted;
        console.log({
            isHost,
            gameReady,
            gameStarted,
            showStartBtn,
        });

        if (isHost) {
            console.log("Emitting start-game event", roomId);
            socket.emit("start-game", { roomId });
        } else {
            console.log("User is not host, cannot start game");
        }
    };

    const handleKeyDown = (e) => {
        if (!inputEnabled || !prompt || gameOver) return;
        e.preventDefault();

        if (e.key === "Backspace") {
            setTyped((prev) => prev.slice(0, -1));
        } else if (e.key.length === 1 && typed.length < prompt.length) {
            setTyped((prev) => prev + e.key);
        }
    };

    const handleRestart = () => {
        if (isHost) {
            console.log("Restart button clicked, emitting restart-game");
            socket.emit("restart-game", { roomId });
        }
    };

    useEffect(() => {
        if (!gameStarted || !prompt || !startTime) return;

        const correctChars = [...typed].filter((ch, idx) => ch === prompt[idx]).length;
        const totalTyped = typed.length;
        const accuracy = totalTyped > 0 ? (correctChars / totalTyped) * 100 : 100;
        const timeElapsedMin = (Date.now() - startTime) / 1000 / 60;
        const wpm = timeElapsedMin > 0 ? typed.split(" ").length / timeElapsedMin : 0;
        const finished = typed.length >= prompt.length;

        socket.emit("update-progress", {
            roomId,
            user: username,
            progress: correctChars,
            wpm: Math.round(wpm),
            accuracy: Math.round(accuracy),
            finished,
        });
    }, [typed, gameStarted, prompt, startTime, roomId, username]);

    const sortedUsers = [...users].sort((a, b) => {
        return (b.wpm || 0) - (a.wpm || 0) || (b.accuracy || 0) - (a.accuracy || 0);
    });

    // Debug render conditions for Start Game button
    console.log("Render conditions:", {
        isHost,
        gameReady,
        gameStarted,
        showStartBtn: !gameReady && isHost && !gameStarted,
    });

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

    return (
        <div className={styles.roomContainer} onClick={() => inputRef.current?.focus()}>
            <div className={styles.topBar}>
                <div className={styles.roomInfo}>
                    Room: {roomId} | You: {username} | Mode: {roomMode}
                </div>
                {gameStarted && !gameOver && (
                    <div className={styles.gameTimer}>
                        Time Left:{" "}
                        {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:
                        {String(timeLeft % 60).padStart(2, "0")}
                    </div>
                )}
            </div>

            <div className={styles.mainContent}>
                <div className={styles.scoreboard}>
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
                        disabled={!inputEnabled || gameOver}
                        spellCheck={false}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                    />
                </div>
            </div>

            {!gameStarted && gameReady && countdown !== null && countdown > 0 && (
                <div className={styles.countdownPopup}>Starting in {countdown}...</div>
            )}

            {gameOver && (
                <div className={styles.gameOverOverlay}>
                    <div className={styles.gameOverContent}>
                        <h1>Game Over!</h1>
                        <p>Final results:</p>
                        <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', textAlign: 'left' }}>
                            {sortedUsers.map((u, idx) => (
                                <li key={u.id} style={{ marginBottom: '0.5rem', fontSize: '1.1rem', color: '#2d3748' }}>
                                    <strong>{u.name}</strong> — {u.wpm || 0} WPM, {u.accuracy || 0}%
                                </li>
                            ))}
                        </ol>
                        <button className={styles.restartBtn} onClick={handleRestart}>
                            Restart
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Room;
