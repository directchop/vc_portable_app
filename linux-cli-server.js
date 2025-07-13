#!/usr/bin/env node

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import net from 'net';
import { EventEmitter } from 'events';
import os from 'os';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LinuxCLIServer extends EventEmitter {
    constructor() {
        super();
        this.webServer = null;
        this.tcpServer = null;
        this.io = null;
        this.clients = new Map();
        this.rooms = new Map();
    }

    startWebServer(port = 3000) {
        const app = express();
        this.webServer = http.createServer(app);
        
        this.io = new Server(this.webServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        // CORS middleware
        app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            next();
        });

        // Serve the GUI files
        app.use(express.static(path.join(__dirname, 'gui-web')));

        // Fallback HTML client for testing (when gui-web files are not available)
        app.get('/test', (req, res) => {
            res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Linux Voice Chat Server</title>
    <script src="/socket.io/socket.io.js"></script>
</head>
<body>
    <h1>Linux Voice Chat Server</h1>
    <p>Server Status: <span id="status">Connecting...</span></p>
    <div>
        <button id="startRecord" disabled>Start Recording</button>
        <button id="stopRecord" disabled>Stop Recording</button>
    </div>
    <div>
        <p>Connected Clients: <span id="clientCount">0</span></p>
        <ul id="clientList"></ul>
    </div>
    
    <script>
        const socket = io();
        const status = document.getElementById('status');
        const clientCount = document.getElementById('clientCount');
        const clientList = document.getElementById('clientList');
        const startBtn = document.getElementById('startRecord');
        const stopBtn = document.getElementById('stopRecord');
        
        let mediaRecorder;
        let audioChunks = [];
        
        socket.on('connect', () => {
            status.textContent = 'Connected';
            startBtn.disabled = false;
        });
        
        socket.on('disconnect', () => {
            status.textContent = 'Disconnected';
            startBtn.disabled = true;
            stopBtn.disabled = true;
        });
        
        socket.on('clientUpdate', (data) => {
            clientCount.textContent = data.count;
            clientList.innerHTML = data.clients.map(c => \`<li>\${c}</li>\`).join('');
        });
        
        socket.on('voice', (data) => {
            // Handle incoming voice data
            console.log('Received voice data:', data.length);
        });
        
        startBtn.addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                        // Send audio data to server
                        const reader = new FileReader();
                        reader.onload = () => {
                            socket.emit('voice', reader.result);
                        };
                        reader.readAsArrayBuffer(event.data);
                    }
                };
                
                mediaRecorder.start(100); // Collect data every 100ms
                startBtn.disabled = true;
                stopBtn.disabled = false;
            } catch (err) {
                console.error('Error accessing microphone:', err);
            }
        });
        
        stopBtn.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            startBtn.disabled = false;
            stopBtn.disabled = true;
            audioChunks = [];
        });
    </script>
</body>
</html>
            `);
        });

        this.io.on('connection', (socket) => {
            const clientId = socket.id;
            const clientInfo = {
                id: clientId,
                address: socket.handshake.address,
                connectedAt: new Date()
            };
            
            this.clients.set(clientId, clientInfo);
            console.log(`[WebSocket] Client connected: ${clientId} from ${clientInfo.address}`);
            
            this.broadcastClientUpdate();

            socket.on('voice', (data) => {
                // Broadcast voice data to all other clients
                socket.broadcast.emit('voice', data);
                console.log(`[WebSocket] Voice data relayed from ${clientId}: ${data.length} bytes`);
            });

            socket.on('disconnect', () => {
                this.clients.delete(clientId);
                console.log(`[WebSocket] Client disconnected: ${clientId}`);
                this.broadcastClientUpdate();
            });
        });

        this.webServer.listen(port, '0.0.0.0', () => {
            console.log(`[WebServer] Started on port ${port}`);
            this.showNetworkInfo(port);
        });
    }

    startTCPServer(port = 8080) {
        this.tcpServer = net.createServer((socket) => {
            const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
            console.log(`[TCP] Client connected: ${clientId}`);

            socket.on('data', (data) => {
                // Broadcast data to all other TCP clients
                for (const [id, client] of this.clients.entries()) {
                    if (id !== clientId && client.socket) {
                        client.socket.write(data);
                    }
                }
                console.log(`[TCP] Data relayed from ${clientId}: ${data.length} bytes`);
            });

            socket.on('end', () => {
                console.log(`[TCP] Client disconnected: ${clientId}`);
                this.clients.delete(clientId);
            });

            socket.on('error', (err) => {
                console.error(`[TCP] Client error ${clientId}:`, err.message);
                this.clients.delete(clientId);
            });

            this.clients.set(clientId, { socket, connectedAt: new Date() });
        });

        this.tcpServer.on('error', (err) => {
            console.error('[TCP] Server error:', err.message);
        });

        this.tcpServer.listen(port, '0.0.0.0', () => {
            console.log(`[TCP] Server started on port ${port}`);
        });
    }

    broadcastClientUpdate() {
        if (this.io) {
            const clientData = {
                count: this.clients.size,
                clients: Array.from(this.clients.keys())
            };
            this.io.emit('clientUpdate', clientData);
        }
    }

    showNetworkInfo(port) {
        console.log('Server accessible at:');
        console.log(`  - Local:   http://localhost:${port}`);
        console.log(`  - Local:   http://127.0.0.1:${port}`);
        
        const interfaces = os.networkInterfaces();
        Object.keys(interfaces).forEach(name => {
            interfaces[name].forEach(iface => {
                if (iface.family === 'IPv4' && !iface.internal) {
                    console.log(`  - Network: http://${iface.address}:${port}`);
                }
            });
        });
    }

    stop() {
        if (this.webServer) {
            this.webServer.close();
            console.log('[WebServer] Stopped');
        }
        if (this.tcpServer) {
            this.tcpServer.close();
            console.log('[TCP] Server stopped');
        }
        this.clients.clear();
    }

    getStatus() {
        return {
            webServer: this.webServer ? 'running' : 'stopped',
            tcpServer: this.tcpServer ? 'running' : 'stopped',
            clients: this.clients.size
        };
    }
}

// CLI Interface
async function main() {
    const server = new LinuxCLIServer();
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('=================================');
    console.log('Linux CLI Voice Chat Server');
    console.log('=================================');
    console.log('Commands:');
    console.log('  web [port]     - Start web server (default: 3000)');
    console.log('  tcp [port]     - Start TCP server (default: 8080)');
    console.log('  both [webport] [tcpport] - Start both servers');
    console.log('  status         - Show server status');
    console.log('  clients        - List connected clients');
    console.log('  stop           - Stop all servers');
    console.log('  help           - Show this help');
    console.log('  exit           - Exit application');
    console.log('');

    rl.on('line', (input) => {
        const [command, ...args] = input.trim().split(' ');

        switch (command) {
            case 'web':
                const webPort = parseInt(args[0]) || 3000;
                server.startWebServer(webPort);
                break;

            case 'tcp':
                const tcpPort = parseInt(args[0]) || 8080;
                server.startTCPServer(tcpPort);
                break;

            case 'both':
                const wp = parseInt(args[0]) || 3000;
                const tp = parseInt(args[1]) || 8080;
                server.startWebServer(wp);
                server.startTCPServer(tp);
                break;

            case 'status':
                const status = server.getStatus();
                console.log('Server Status:');
                console.log(`  Web Server: ${status.webServer}`);
                console.log(`  TCP Server: ${status.tcpServer}`);
                console.log(`  Connected Clients: ${status.clients}`);
                break;

            case 'clients':
                console.log('Connected Clients:');
                if (server.clients.size === 0) {
                    console.log('  No clients connected');
                } else {
                    server.clients.forEach((client, id) => {
                        console.log(`  ${id} - Connected: ${client.connectedAt.toISOString()}`);
                    });
                }
                break;

            case 'stop':
                server.stop();
                console.log('All servers stopped');
                break;

            case 'help':
                console.log('Commands:');
                console.log('  web [port]     - Start web server (default: 3000)');
                console.log('  tcp [port]     - Start TCP server (default: 8080)');
                console.log('  both [webport] [tcpport] - Start both servers');
                console.log('  status         - Show server status');
                console.log('  clients        - List connected clients');
                console.log('  stop           - Stop all servers');
                console.log('  help           - Show this help');
                console.log('  exit           - Exit application');
                break;

            case 'exit':
                server.stop();
                console.log('Goodbye!');
                process.exit(0);
                break;

            default:
                if (command) {
                    console.log(`Unknown command: ${command}. Type 'help' for available commands.`);
                }
        }
    });

    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        server.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\nShutting down...');
        server.stop();
        process.exit(0);
    });
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { LinuxCLIServer };