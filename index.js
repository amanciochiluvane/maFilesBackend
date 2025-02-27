const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let rooms = {};
app.get("/", (req, res) => {
    res.send("Servidor está rodando no Vercel!");
});


io.on("connection", (socket) => {
    console.log("Novo usuário conectado:", socket.id);

    socket.on("create-room", (callback) => {
        const roomId = Math.random().toString(36).substring(2, 8);
        rooms[roomId] = [socket.id];
        socket.join(roomId);
        callback(roomId);
        io.to(roomId).emit("update-users", rooms[roomId]);
    });

    socket.on("join-room", (roomId, callback) => {
        if (rooms[roomId]) {
            rooms[roomId].push(socket.id);
            socket.join(roomId);
            callback(true);
            io.to(roomId).emit("update-users", rooms[roomId]);
        } else {
            callback(false);
        }
    });

    socket.on("send-file-chunk", ({ roomId, chunk, fileName, last, senderId }) => {
        socket.to(roomId).emit("receive-file", { fileName, fileData: chunk, senderId });
    });

    socket.on("disconnect", () => {
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
            if (rooms[roomId].length === 0) {
                delete rooms[roomId];
            } else {
                io.to(roomId).emit("update-users", rooms[roomId]);
            }
        }
    });
});

server.listen(5000, () => {
    console.log("Servidor rodando na porta 5000");
});
