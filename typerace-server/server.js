// server.js

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

// ✅ Create HTTPS agent to ignore expired certs (dev use only)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ✅ Fetch prompt with certificate fix
const fallbackPrompts = [
    "Typing fast is not enough; accuracy wins the race.",
    "The only way to get better at typing is to keep typing every day.",
    "Consistent practice builds consistent performance.",
    "When your fingers flow with your thoughts, you've mastered typing.",
    "Each keystroke brings you closer to mastery.",
];

async function fetchPrompt(mode = "quote") {
    try {
        // Try online first
        const res = await axios.get("https://zenquotes.io/api/random");
        return res.data[0].q + " — " + res.data[0].a;
    } catch (err) {
        console.error("⚠️ Prompt fetch failed:", err.message);
        // Fallback to local
        const randomIndex = Math.floor(Math.random() * fallbackPrompts.length);
        return fallbackPrompts[randomIndex];
    }
}


io.on("connection", (socket) => {
    console.log("🔌 User connected:", socket.id);

    socket.on("join-room", async ({ roomId, user }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            const prompt = await fetchPrompt("quote");
            rooms[roomId] = {
                users: [],
                prompt,
            };
        }

        const existingUser = rooms[roomId].users.find((u) => u.name === user);
        if (!existingUser) {
            rooms[roomId].users.push({
                id: socket.id,
                name: user,
                progress: 0,
            });
        }

        io.to(roomId).emit("room-joined", {
            users: rooms[roomId].users,
            prompt: rooms[roomId].prompt,
        });
    });

    socket.on("update-progress", ({ roomId, user, progress }) => {
        const room = rooms[roomId];
        if (!room) return;

        const player = room.users.find((u) => u.name === user);
        if (player) {
            player.progress = progress;
        }

        io.to(roomId).emit("player-progress", room.users);
    });

    socket.on("disconnect", () => {
        console.log("🔌 User disconnected:", socket.id);
        for (const roomId in rooms) {
            const room = rooms[roomId];
            room.users = room.users.filter((u) => u.id !== socket.id);
            io.to(roomId).emit("player-progress", room.users);
        }
    });
});

server.listen(3001, () => {
    console.log("🚀 Server running on port 3001");
});
