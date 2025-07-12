const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let voiceChat;
let VoiceChatCore;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 500,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, 'gui', 'icon.png'),
        resizable: true,
        autoHideMenuBar: true
    });

    mainWindow.loadFile(path.join(__dirname, 'gui', 'index.html'));

    mainWindow.on('closed', () => {
        if (voiceChat) {
            voiceChat.stop();
        }
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    // Import VoiceChatCore dynamically
    const { VoiceChatCore: VCC } = await import('./voicechat-core.js');
    VoiceChatCore = VCC;
    
    createWindow();
    voiceChat = new VoiceChatCore();

    // Set up event listeners after voiceChat is initialized
    voiceChat.on('status', (message) => {
        if (mainWindow) {
            mainWindow.webContents.send('status-update', message);
        }
    });

    voiceChat.on('error', (error) => {
        if (mainWindow) {
            mainWindow.webContents.send('error-update', error);
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

ipcMain.handle('start-server', async (event, port) => {
    try {
        voiceChat.startServer(port);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('connect-peer', async (event, host, port) => {
    try {
        voiceChat.connectToPeer(host, port);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-chat', async () => {
    try {
        voiceChat.stop();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-status', async () => {
    return {
        isConnected: voiceChat.isConnected,
        isServer: voiceChat.server !== null,
        isClient: voiceChat.client !== null
    };
});

ipcMain.handle('get-output-devices', async () => {
    try {
        const devices = await voiceChat.getOutputDevices();
        return { success: true, devices };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('set-output-device', async (event, deviceId) => {
    try {
        voiceChat.setOutputDevice(deviceId);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

