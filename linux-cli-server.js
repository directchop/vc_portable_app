#!/usr/bin/env node

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import net from 'net';
import dgram from 'dgram';
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
        this.udpServer = null;
        this.io = null;
        this.clients = new Map();
        this.udpClients = new Map();
        this.rooms = new Map();
        this.bridgeMode = false; // WebSocket to UDP bridge mode
        this.udpBridge = null;
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
                if (this.bridgeMode && this.udpBridge) {
                    // Bridge mode: relay to UDP clients
                    for (const [id, client] of this.udpClients.entries()) {
                        const buffer = Buffer.from(data);
                        this.udpBridge.send(buffer, client.port, client.address);
                    }
                    console.log(`[Bridge] WebSocket→UDP from ${clientId}: ${data.length} bytes`);
                } else {
                    // Normal mode: broadcast to other WebSocket clients
                    socket.broadcast.emit('voice', data);
                    console.log(`[WebSocket] Voice data relayed from ${clientId}: ${data.length} bytes`);
                }
            });
            
            socket.on('setProtocol', (protocol) => {
                if (protocol === 'udp') {
                    console.log(`[WebSocket] Client ${clientId} requested UDP bridge mode`);
                    socket.emit('protocolSet', { protocol: 'udp-bridge', message: 'Using WebSocket to UDP bridge' });
                }
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
    
    startUDPServer(port = 8081) {
        this.udpServer = dgram.createSocket('udp4');
        
        this.udpServer.on('message', (msg, rinfo) => {
            const clientId = `${rinfo.address}:${rinfo.port}`;
            
            // Add client if not already known
            if (!this.udpClients.has(clientId)) {
                this.udpClients.set(clientId, {
                    address: rinfo.address,
                    port: rinfo.port,
                    connectedAt: new Date()
                });
                console.log(`[UDP] Client connected: ${clientId}`);
            }
            
            // Broadcast to all other UDP clients
            for (const [id, client] of this.udpClients.entries()) {
                if (id !== clientId) {
                    this.udpServer.send(msg, client.port, client.address);
                }
            }
            
            // If bridge mode is enabled, also send to WebSocket clients
            if (this.bridgeMode && this.io) {
                const arrayBuffer = new ArrayBuffer(msg.length);
                const view = new Uint8Array(arrayBuffer);
                for (let i = 0; i < msg.length; i++) {
                    view[i] = msg[i];
                }
                this.io.emit('voice', arrayBuffer);
                console.log(`[Bridge] UDP→WebSocket: ${msg.length} bytes`);
            }
            
            console.log(`[UDP] Data relayed from ${clientId}: ${msg.length} bytes`);
        });
        
        this.udpServer.on('error', (err) => {
            console.error('[UDP] Server error:', err.message);
        });
        
        this.udpServer.bind(port, '0.0.0.0', () => {
            console.log(`[UDP] Server started on port ${port}`);
            this.udpBridge = this.udpServer;
        });
    }
    
    enableBridgeMode() {
        this.bridgeMode = true;
        console.log('[Bridge] WebSocket↔UDP bridge mode enabled');
    }
    
    disableBridgeMode() {
        this.bridgeMode = false;
        console.log('[Bridge] Bridge mode disabled');
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
        if (this.udpServer) {
            this.udpServer.close();
            console.log('[UDP] Server stopped');
        }
        this.clients.clear();
        this.udpClients.clear();
    }

    getStatus() {
        return {
            webServer: this.webServer ? 'running' : 'stopped',
            tcpServer: this.tcpServer ? 'running' : 'stopped',
            udpServer: this.udpServer ? 'running' : 'stopped',
            clients: this.clients.size,
            udpClients: this.udpClients.size
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
    console.log('  udp [port]     - Start UDP server (default: 8081)');
    console.log('  both [webport] [tcpport] - Start web and TCP servers');
    console.log('  all [webport] [tcpport] [udpport] - Start all servers');
    console.log('  bridge         - Enable WebSocket↔UDP bridge mode');
    console.log('  nobridge       - Disable bridge mode');
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
                
            case 'udp':
                const udpPort = parseInt(args[0]) || 8081;
                server.startUDPServer(udpPort);
                break;

            case 'both':
                const wp = parseInt(args[0]) || 3000;
                const tp = parseInt(args[1]) || 8080;
                server.startWebServer(wp);
                server.startTCPServer(tp);
                break;
                
            case 'all':
                const awp = parseInt(args[0]) || 3000;
                const atp = parseInt(args[1]) || 8080;
                const aup = parseInt(args[2]) || 8081;
                server.startWebServer(awp);
                server.startTCPServer(atp);
                server.startUDPServer(aup);
                break;
                
            case 'bridge':
                server.enableBridgeMode();
                break;
                
            case 'nobridge':
                server.disableBridgeMode();
                break;

            case 'status':
                const status = server.getStatus();
                console.log('Server Status:');
                console.log(`  Web Server: ${status.webServer}`);
                console.log(`  TCP Server: ${status.tcpServer}`);
                console.log(`  UDP Server: ${status.udpServer}`);
                console.log(`  Bridge Mode: ${server.bridgeMode ? 'Enabled' : 'Disabled'}`);
                console.log(`  TCP Clients: ${status.clients}`);
                console.log(`  UDP Clients: ${status.udpClients}`);
                break;

            case 'clients':
                console.log('Connected TCP Clients:');
                if (server.clients.size === 0) {
                    console.log('  No TCP clients connected');
                } else {
                    server.clients.forEach((client, id) => {
                        console.log(`  ${id} - Connected: ${client.connectedAt.toISOString()}`);
                    });
                }
                console.log('\nConnected UDP Clients:');
                if (server.udpClients.size === 0) {
                    console.log('  No UDP clients connected');
                } else {
                    server.udpClients.forEach((client, id) => {
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
                console.log('  udp [port]     - Start UDP server (default: 8081)');
                console.log('  both [webport] [tcpport] - Start web and TCP servers');
                console.log('  all [webport] [tcpport] [udpport] - Start all servers');
                console.log('  bridge         - Enable WebSocket↔UDP bridge mode');
                console.log('  nobridge       - Disable bridge mode');
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