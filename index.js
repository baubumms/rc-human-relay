require("dotenv").config();
const express = require("express");
const WebSocket = require("ws");
const config = require(__dirname + "/config.json");

const {SHARED_SECRET} = process.env;
const verificationTimeout = 5000;
const verifiedSockets = [];


const appResources = config.webRoot.indexOf("/") === 0 ? config.webRoot : __dirname + "/" + config.webRoot;
const app = express();
const server = app.listen(config.port);
const wss = new WebSocket.Server({server: server});
app.use("/", express.static(appResources));


const info = (msg) => {
    const date = new Date();

    console.info("[" + date.toLocaleDateString() + "-" + date.toLocaleTimeString() + "] - " + msg)
}

wss.on("connection", (socket) => {

    setTimeout(() => {
        if(!verifiedSockets.includes(socket)){
           info("Closed unverified socket after timeout");
            try{
                socket.close();
            }catch(error){}
        }
    }, verificationTimeout);

    info("Received new connection attempt");
    
    socket.on("message", (data) => {
        if(!verifiedSockets.includes(socket)){
            const args = data.split(" --");
            info("Received new connection attempt");
            if(args[0] === SHARED_SECRET){
                verifiedSockets.push(socket);

                if(args[1] !== "silent"){
                    socket.send("initialized");
                    info("Verified silently");
                }else {
                    info("Verified socket and send response");
                }
            }else {
                socket.close();
                info("Closed socket after failed verification");
            }
            return;
        }

        
        verifiedSockets.forEach((s) => {
            if (s !== socket) {
                s.send(data);
            }
        });

        info("Received and relayed message");
    });

    socket.on("close", () => {
        var idx = verifiedSockets.indexOf(socket);
        if(idx >= 0){
            verifiedSockets.splice(idx, 1);
        }

        info("Closed socket");
    });
});

info("Server listening on port " + config.port);