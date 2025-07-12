const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('voiceChat', {
    startServer: (port) => ipcRenderer.invoke('start-server', port),
    connectPeer: (host, port) => ipcRenderer.invoke('connect-peer', host, port),
    stopChat: () => ipcRenderer.invoke('stop-chat'),
    getStatus: () => ipcRenderer.invoke('get-status'),
    getOutputDevices: () => ipcRenderer.invoke('get-output-devices'),
    setOutputDevice: (deviceId) => ipcRenderer.invoke('set-output-device', deviceId),
    
    onStatusUpdate: (callback) => {
        ipcRenderer.on('status-update', (event, message) => callback(message));
    },
    
    onErrorUpdate: (callback) => {
        ipcRenderer.on('error-update', (event, error) => callback(error));
    }
});