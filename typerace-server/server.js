const express = require("express");
const http = require("http");
const cors = require("cors");
const axios = require("axios");
const https = require("https");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

const rooms = {};
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const modeWordCounts = {
    "2min": 120,
    "5min": 300,
    "10min": 600,
    "30min": 1800,
};

const fallbackWords = [
    "the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog",
    "keyboard", "practice", "speed", "accuracy", "challenge", "typing",
    "javascript", "code", "socket", "network", "race", "game", "player",
    "focus", "skill", "test", "time", "clock", "word", "letter", "hands"
];

async function fetchPrompt(mode = "2min") {
    const wordCount = modeWordCounts[mode] || 120;

    try {
        const res = await axios.get(
            `https://random-word-api.herokuapp.com/word?number=${wordCount}`,
            { httpsAgent }
        );
        return res.data.join(" ");
    } catch (err) {
        console.error("⚠️ Prompt API failed, using fallback:", err.message);
        const words = Array.from({ length: wordCount }, () =>
            fallbackWords[Math.floor(Math.random() * fallbackWords.length)]
        );
        return words.join(" ");
    }
}

io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    socket.on("join-room", async ({ roomId, user, mode = "2min" }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            const prompt = await fetchPrompt(mode);
            rooms[roomId] = {
                users: [],
                prompt,
                mode,
                hostId: socket.id,
            };
        }

        const room = rooms[roomId];
        const isHost = room.hostId === socket.id;

        const existingUser = room.users.find((u) => u.name === user);
        if (!existingUser) {
            room.users.push({
                id: socket.id,
                name: user,
                progress: 0,
                wpm: 0,
                accuracy: 0,
                isHost,
            });
        }

        io.to(roomId).emit("room-joined", {
            users: room.users,
            prompt: room.prompt,
            mode: room.mode,
            hostId: room.hostId,
        });
    });

    socket.on("update-progress", ({ roomId, user, progress, wpm, accuracy }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.users.find((u) => u.name === user);
        if (player) {
            player.progress = progress;
            player.wpm = wpm;
            player.accuracy = accuracy;
        }

        io.to(roomId).emit("player-progress", room.users);
    });

    socket.on("start-game", async ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;

        // Start a 5-second countdown and emit countdown ticks every second
        let countdown = 5;
        const countdownInterval = setInterval(() => {
            if (countdown > 0) {
                io.to(roomId).emit("countdown-tick", countdown);
                countdown--;
            } else {
                clearInterval(countdownInterval);
                io.to(roomId).emit("countdown-tick", 0);
                // Notify clients that game starts now
                io.to(roomId).emit("game-start", { prompt: room.prompt, mode: room.mode });
            }
        }, 1000);
    });

    socket.on("restart-game", async ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;

        // Fetch a new prompt for the existing mode
        const newPrompt = await fetchPrompt(room.mode);
        room.prompt = newPrompt;

        // Reset all users progress and stats
        room.users.forEach((u) => {
            u.progress = 0;
            u.wpm = 0;
            u.accuracy = 0;
        });

        // Emit updated room state
        io.to(roomId).emit("room-joined", {
            users: room.users,
            prompt: newPrompt,
            mode: room.mode,
            hostId: room.hostId,
        });
    });

    socket.on("disconnect", () => {
        console.log("🔌 User disconnected:", socket.id);

        for (const roomId in rooms) {
            const room = rooms[roomId];
            const wasHost = room.hostId === socket.id;

            room.users = room.users.filter((u) => u.id !== socket.id);

            if (wasHost && room.users.length > 0) {
                room.users.forEach(u => u.isHost = false);

                room.hostId = room.users[0].id;
                room.users[0].isHost = true;
            }

            if (room.users.length === 0) {
                delete rooms[roomId];
                continue;
            }

            io.to(roomId).emit("player-progress", room.users);
        }
    });
});

server.listen(3001, () => {
    console.log("🚀 Server running on port 3001");
});
