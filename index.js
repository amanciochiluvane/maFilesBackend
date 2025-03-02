const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cloudinary = require('cloudinary').v2;


cloudinary.config({
    cloud_name: 'dvetcuxac',
    api_key: '269513831462676',
    api_secret: 'TNl7rqCShvXkpToTFm5lA2n3WJs'
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" }, 
    pingTimeout: 60000,  
    pingInterval: 25000  
});

let rooms = {};
app.get("/", (req, res) => {
    res.send("Servidor está rodando no Vercel!");
});

const receivedFiles = {}; // Para armazenar chunks temporariamente

io.on("connection", (socket) => {
    console.log("Novo usuário conectado:", socket.id);

    // Criação de sala
    socket.on("create-room", (username, callback) => {
        const roomId = Math.random().toString(36).substring(2, 8);
        rooms[roomId] = [{ id: socket.id, username }];
        socket.join(roomId);
        callback(roomId);
        io.to(roomId).emit("update-users", rooms[roomId]);
    });

    // Entrar em uma sala
    socket.on("join-room", ({ roomId, username }, callback) => {
        if (rooms[roomId]) {
            rooms[roomId].push({ id: socket.id, username });
            socket.join(roomId);
            callback(true);
            io.to(roomId).emit("update-users", rooms[roomId]);
        } else {
            callback(false);
        }
    });

    

    // Receber a URL do arquivo do frontend e retransmitir para a sala
    socket.on("send-file", ({ roomId, fileName, fileUrl, senderId }) => {
        console.log(`Arquivo recebido na sala ${roomId}: ${fileName}`);
        io.to(roomId).emit("receive-file", { fileName, fileUrl, senderId });
    });
    // Manter conexão ativa
    socket.on("keep-alive", () => {
        console.log(`Mantendo ${socket.id} ativo`);
    });

    socket.on("send-message", ({ roomId, message }) => {
        io.to(roomId).emit("receive-message", message);
    });

    // Lidar com desconexão
    socket.on("disconnect", () => {
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);
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
