const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8, // 100MB
    pingTimeout: 120000,  
    pingInterval: 25000  
});


let rooms = {};
app.get("/", (req, res) => {
    res.send("Servidor está rodando no Railway3!");
});

const receivedFiles = {}; // Para armazenar chunks temporariamente


io.on("connection", (socket) => {
    console.log("Novo usuário conectado:", socket.id);

    socket.on("create-room", (username,callback) => {
        const roomId = Math.random().toString(36).substring(2, 8);
        rooms[roomId] = [ {id: socket.id, username }];
        socket.join(roomId);
        callback(roomId);
        io.to(roomId).emit("update-users", rooms[roomId]);
    });

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

    socket.on("keep-alive", () => {
        console.log(`Mantendo ${socket.id} ativo`);
    });
    

    socket.on("send-file-chunk", ({ roomId, chunk, fileName, last, senderId }) => {
        if (!receivedFiles[roomId]) {
            receivedFiles[roomId] = {};
        }

        if (!receivedFiles[roomId][fileName]) {
            receivedFiles[roomId][fileName] = [];
        }

        // Concatenar os chunks corretamente
        receivedFiles[roomId][fileName].push(Buffer.from(chunk));

        if (last) {
            // Montar arquivo final
            const finalFile = Buffer.concat(receivedFiles[roomId][fileName]);

            // Enviar o arquivo completo para os clientes
            socket.to(roomId).emit("receive-file", {
                fileName,
                fileData: finalFile,
                senderId
            });

            // Limpar buffer
            delete receivedFiles[roomId][fileName];
        }
    });

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
