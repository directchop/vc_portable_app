import net from 'net';
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

    startAudio(socket) {
        try {
            const deviceOptions = AudioDevices.getDeviceOptions(this.outputDeviceId);
            const speakerOptions = { ...this.audioFormat, ...deviceOptions };
            
            this.speaker = new Speaker(speakerOptions);
            
            this.speaker.on('error', (err) => {
                this.emit('error', `Speaker error: ${err.message}`);
            });

            this.recording = recorder.record({
                sampleRate: this.audioFormat.sampleRate,
                channels: this.audioFormat.channels,
                audioType: 'raw',
                recorder: process.platform === 'darwin' ? 'sox' : 'arecord'
            });

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
                    
                    if (socket && !socket.destroyed && this.isConnected) {
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