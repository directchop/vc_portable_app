import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { VoiceChatCore } from './voicechat-core-windows.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;
let voiceChat;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: join(__dirname, 'preload-windows.js')
        }
    });

    mainWindow.loadFile('gui/index.html');

    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    voiceChat = new VoiceChatCore();

    voiceChat.on('status', (message) => {
        mainWindow.webContents.send('status-update', message);
    });

    voiceChat.on('error', (message) => {
        mainWindow.webContents.send('error-update', message);
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (voiceChat) {
        voiceChat.stop();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
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

ipcMain.handle('connect-to-peer', async (event, host, port) => {
    try {
        voiceChat.connectToPeer(host, port);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
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

ipcMain.handle('stop-voice-chat', async () => {
    try {
        voiceChat.stop();
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});