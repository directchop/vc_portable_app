import net from 'net';
import dgram from 'dgram';
import { PassThrough } from 'stream';
import recorder from 'node-record-lpcm16';
import Speaker from 'speaker';
import { EventEmitter } from 'events';
import { AudioDevices } from './audio-devices.js';

export class VoiceChatCore extends EventEmitter {
    constructor() {
        super();
        this.server = null;
        this.client = null;
        this.udpServer = null;
        this.udpClient = null;
        this.udpRemote = null;
        this.protocol = 'tcp';
        this.recording = null;
        this.speaker = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.outputDeviceId = 'default';
        
        this.audioFormat = {
            channels: 1,
            bitDepth: 16,
            sampleRate: 16000
        };
    }

    startServer(port, protocol = 'tcp') {
        this.protocol = protocol;
        
        if (protocol === 'udp') {
            this.startUDPServer(port);
        } else {
            this.startTCPServer(port);
        }
    }
    
    startTCPServer(port) {
        this.server = net.createServer((socket) => {
            this.emit('status', `Client connected from ${socket.remoteAddress}:${socket.remotePort}`);
            this.handleConnection(socket);
        });

        this.server.on('error', (err) => {
            this.emit('error', `Server error: ${err.message}`);
        });

        this.server.listen(port, () => {
            this.emit('status', `Server listening on port ${port}`);
        });
    }

    connectToPeer(host, port, protocol = 'tcp') {
        this.protocol = protocol;
        
        if (protocol === 'udp') {
            this.connectUDP(host, port);
        } else {
            this.connectTCP(host, port);
        }
    }
    
    connectTCP(host, port) {
        this.emit('status', `Attempting to connect to ${host}:${port}`);
        
        this.client = net.createConnection({ host, port }, () => {
            this.emit('status', 'Connected to peer');
            this.reconnectAttempts = 0;
            this.handleConnection(this.client);
        });

        this.client.on('error', (err) => {
            this.emit('error', `Connection error: ${err.message}`);
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnect(host, port);
            }
        });

        this.client.on('close', () => {
            this.emit('status', 'Connection closed');
            if (this.isConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnect(host, port);
            }
        });
    }

    attemptReconnect(host, port) {
        this.reconnectAttempts++;
        this.emit('status', `Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(() => {
            this.connectTCP(host, port);
        }, this.reconnectDelay);
    }

    handleConnection(socket) {
        this.isConnected = true;
        
        socket.on('data', (data) => {
            if (this.speaker && !this.speaker.destroyed) {
                this.speaker.write(data);
            }
        });

        socket.on('close', () => {
            this.isConnected = false;
            this.stopAudio();
            this.emit('status', 'Peer disconnected');
        });

        socket.on('error', (err) => {
            this.emit('error', `Socket error: ${err.message}`);
        });

        this.startAudio(socket);
    }

    async getOutputDevices() {
        return await AudioDevices.getOutputDevices();
    }

    setOutputDevice(deviceId) {
        this.outputDeviceId = deviceId;
        this.emit('status', `Output device set to: ${deviceId}`);
        
        if (this.isConnected && this.speaker) {
            this.restartSpeaker();
        }
    }

    async restartSpeaker() {
        if (this.speaker) {
            this.speaker.end();
            this.speaker = null;
        }
        
        const deviceOptions = AudioDevices.getDeviceOptions(this.outputDeviceId);
        const speakerOptions = { ...this.audioFormat, ...deviceOptions };
        
        this.speaker = new Speaker(speakerOptions);
        this.speaker.on('error', (err) => {
            this.emit('error', `Speaker error: ${err.message}`);
        });
    }

    startAudio(socket = null) {
        try {
            try {
                const deviceOptions = AudioDevices.getDeviceOptions(this.outputDeviceId);
                const speakerOptions = { ...this.audioFormat, ...deviceOptions };
                
                this.speaker = new Speaker(speakerOptions);
                
                this.speaker.on('error', (err) => {
                    this.emit('error', `Speaker error: ${err.message}`);
                });
            } catch (speakerErr) {
                this.emit('error', `Speaker initialization failed: ${speakerErr.message}. Running without audio output.`);
            }

            try {
                this.recording = recorder.record({
                    sampleRate: this.audioFormat.sampleRate,
                    channels: this.audioFormat.channels,
                    audioType: 'raw',
                    recorder: process.platform === 'darwin' ? 'sox' : 'arecord'
                });
            } catch (recordErr) {
                this.emit('error', `Recording initialization failed: ${recordErr.message}. Running without microphone input.`);
                return;
            }

            const audioStream = this.recording.stream();
            
            audioStream.on('error', (err) => {
                this.emit('error', `Recording error: ${err.message}`);
            });

            const bufferStream = new PassThrough();
            let buffer = Buffer.alloc(0);
            const chunkSize = 4096;

            audioStream.on('data', (data) => {
                buffer = Buffer.concat([buffer, data]);
                
                while (buffer.length >= chunkSize) {
                    const chunk = buffer.slice(0, chunkSize);
                    buffer = buffer.slice(chunkSize);
                    
                    if (this.protocol === 'udp' && this.udpRemote) {
                        const udpSocket = this.udpClient || this.udpServer;
                        if (udpSocket && this.isConnected) {
                            udpSocket.send(chunk, this.udpRemote.port, this.udpRemote.address);
                        }
                    } else if (socket && !socket.destroyed && this.isConnected) {
                        socket.write(chunk);
                    }
                }
            });

            this.emit('status', 'Voice chat started');
        } catch (err) {
            this.emit('error', `Failed to start audio: ${err.message}`);
        }
    }

    stopAudio() {
        if (this.recording) {
            this.recording.stop();
            this.recording = null;
        }
        
        if (this.speaker) {
            this.speaker.end();
            this.speaker = null;
        }
        
        this.emit('status', 'Voice chat stopped');
    }

    startUDPServer(port) {
        this.udpServer = dgram.createSocket('udp4');
        
        this.udpServer.on('error', (err) => {
            this.emit('error', `UDP Server error: ${err.message}`);
        });
        
        this.udpServer.on('message', (msg, rinfo) => {
            if (!this.udpRemote) {
                this.udpRemote = { address: rinfo.address, port: rinfo.port };
                this.emit('status', `UDP Client connected from ${rinfo.address}:${rinfo.port}`);
                this.isConnected = true;
                this.startAudio();
            }
            
            if (this.speaker && !this.speaker.destroyed) {
                this.speaker.write(msg);
            }
        });
        
        this.udpServer.bind(port, () => {
            this.emit('status', `UDP Server listening on port ${port}`);
        });
    }
    
    connectUDP(host, port) {
        this.emit('status', `Attempting UDP connection to ${host}:${port}`);
        
        this.udpClient = dgram.createSocket('udp4');
        this.udpRemote = { address: host, port: port };
        
        this.udpClient.on('error', (err) => {
            this.emit('error', `UDP Connection error: ${err.message}`);
        });
        
        this.udpClient.on('message', (msg) => {
            if (this.speaker && !this.speaker.destroyed) {
                this.speaker.write(msg);
            }
        });
        
        this.isConnected = true;
        this.emit('status', 'UDP connection established');
        this.startAudio();
    }
    
    stop() {
        this.isConnected = false;
        this.stopAudio();
        
        if (this.client) {
            this.client.destroy();
            this.client = null;
        }
        
        if (this.server) {
            this.server.close();
            this.server = null;
        }
        
        if (this.udpServer) {
            this.udpServer.close();
            this.udpServer = null;
        }
        
        if (this.udpClient) {
            this.udpClient.close();
            this.udpClient = null;
        }
        
        this.udpRemote = null;
    }
}