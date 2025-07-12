import net from 'net';
import { PassThrough } from 'stream';
import { EventEmitter } from 'events';
import { AudioDevices } from './audio-devices-windows.js';
import portAudio from 'naudiodon';

export class VoiceChatCore extends EventEmitter {
    constructor() {
        super();
        this.server = null;
        this.client = null;
        this.audioInput = null;
        this.audioOutput = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.outputDeviceId = -1; // Default device
        
        this.audioFormat = {
            channelCount: 1,
            sampleFormat: portAudio.SampleFormat16Bit,
            sampleRate: 16000,
            deviceId: -1, // Default device
            closeOnError: false
        };
    }

    startServer(port) {
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

    connectToPeer(host, port) {
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
            this.connectToPeer(host, port);
        }, this.reconnectDelay);
    }

    handleConnection(socket) {
        this.isConnected = true;
        
        socket.on('data', (data) => {
            if (this.audioOutput && !this.audioOutput.quit) {
                this.audioOutput.write(data);
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
        this.outputDeviceId = parseInt(deviceId) || -1;
        this.emit('status', `Output device set to: ${deviceId}`);
        
        if (this.isConnected && this.audioOutput) {
            this.restartAudioOutput();
        }
    }

    async restartAudioOutput() {
        if (this.audioOutput) {
            this.audioOutput.quit();
            this.audioOutput = null;
        }
        
        const outputOptions = {
            ...this.audioFormat,
            deviceId: this.outputDeviceId
        };
        
        this.audioOutput = new portAudio.AudioIO({
            outOptions: outputOptions
        });
        
        this.audioOutput.on('error', (err) => {
            this.emit('error', `Audio output error: ${err.message}`);
        });
        
        this.audioOutput.start();
    }

    startAudio(socket) {
        try {
            // Input stream setup
            const inputOptions = {
                ...this.audioFormat,
                deviceId: -1 // Default input device
            };
            
            this.audioInput = new portAudio.AudioIO({
                inOptions: inputOptions
            });
            
            // Output stream setup
            const outputOptions = {
                ...this.audioFormat,
                deviceId: this.outputDeviceId
            };
            
            this.audioOutput = new portAudio.AudioIO({
                outOptions: outputOptions
            });

            this.audioInput.on('error', (err) => {
                this.emit('error', `Audio input error: ${err.message}`);
            });

            this.audioOutput.on('error', (err) => {
                this.emit('error', `Audio output error: ${err.message}`);
            });

            // Handle input audio data
            let buffer = Buffer.alloc(0);
            const chunkSize = 4096;

            this.audioInput.on('data', (data) => {
                buffer = Buffer.concat([buffer, data]);
                
                while (buffer.length >= chunkSize) {
                    const chunk = buffer.slice(0, chunkSize);
                    buffer = buffer.slice(chunkSize);
                    
                    if (socket && !socket.destroyed && this.isConnected) {
                        socket.write(chunk);
                    }
                }
            });

            this.audioInput.start();
            this.audioOutput.start();
            
            this.emit('status', 'Voice chat started');
        } catch (err) {
            this.emit('error', `Failed to start audio: ${err.message}`);
        }
    }

    stopAudio() {
        if (this.audioInput) {
            this.audioInput.quit();
            this.audioInput = null;
        }
        
        if (this.audioOutput) {
            this.audioOutput.quit();
            this.audioOutput = null;
        }
        
        this.emit('status', 'Voice chat stopped');
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
    }
}