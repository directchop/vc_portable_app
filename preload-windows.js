import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    startServer: (port) => ipcRenderer.invoke('start-server', port),
    connectToPeer: (host, port) => ipcRenderer.invoke('connect-to-peer', host, port),
    getOutputDevices: () => ipcRenderer.invoke('get-output-devices'),
    setOutputDevice: (deviceId) => ipcRenderer.invoke('set-output-device', deviceId),
    stopVoiceChat: () => ipcRenderer.invoke('stop-voice-chat'),
    
    onStatusUpdate: (callback) => {
        ipcRenderer.on('status-update', (event, message) => callback(message));
    },
    
    onErrorUpdate: (callback) => {
        ipcRenderer.on('error-update', (event, message) => callback(message));
    }
});