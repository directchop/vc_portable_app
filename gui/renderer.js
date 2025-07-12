const serverModeBtn = document.getElementById('serverModeBtn');
const clientModeBtn = document.getElementById('clientModeBtn');
const serverConfig = document.getElementById('serverConfig');
const clientConfig = document.getElementById('clientConfig');
const connectedSection = document.getElementById('connectedSection');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const logArea = document.getElementById('logArea');

const serverPort = document.getElementById('serverPort');
const clientHost = document.getElementById('clientHost');
const clientPort = document.getElementById('clientPort');

const startServerBtn = document.getElementById('startServerBtn');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');

const audioCanvas = document.getElementById('audioCanvas');
const canvasCtx = audioCanvas.getContext('2d');

const outputDevice = document.getElementById('outputDevice');
const refreshDevicesBtn = document.getElementById('refreshDevicesBtn');

let currentMode = null;
let isConnected = false;
let animationId = null;

function addLog(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logArea.appendChild(entry);
    logArea.scrollTop = logArea.scrollHeight;
}

function updateStatus(status, message) {
    statusText.textContent = message;
    statusIndicator.className = 'status-indicator';
    
    switch(status) {
        case 'connected':
            statusIndicator.classList.add('connected');
            isConnected = true;
            break;
        case 'connecting':
            statusIndicator.classList.add('connecting');
            break;
        case 'disconnected':
            isConnected = false;
            break;
    }
}

function showMode(mode) {
    currentMode = mode;
    serverConfig.style.display = 'none';
    clientConfig.style.display = 'none';
    connectedSection.style.display = 'none';
    
    serverModeBtn.classList.remove('active');
    clientModeBtn.classList.remove('active');
    
    if (mode === 'server') {
        serverConfig.style.display = 'block';
        serverModeBtn.classList.add('active');
    } else if (mode === 'client') {
        clientConfig.style.display = 'block';
        clientModeBtn.classList.add('active');
    }
}

function showConnected() {
    serverConfig.style.display = 'none';
    clientConfig.style.display = 'none';
    connectedSection.style.display = 'block';
    startAudioVisualization();
}

function startAudioVisualization() {
    const width = audioCanvas.width;
    const height = audioCanvas.height;
    
    function draw() {
        canvasCtx.fillStyle = '#1a1a1a';
        canvasCtx.fillRect(0, 0, width, height);
        
        canvasCtx.strokeStyle = '#4a9eff';
        canvasCtx.lineWidth = 2;
        canvasCtx.beginPath();
        
        const sliceWidth = width / 100;
        let x = 0;
        
        for (let i = 0; i < 100; i++) {
            const y = height / 2 + (Math.random() - 0.5) * height * 0.6;
            
            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        canvasCtx.stroke();
        
        if (isConnected) {
            animationId = requestAnimationFrame(draw);
        }
    }
    
    draw();
}

function stopAudioVisualization() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    canvasCtx.fillStyle = '#1a1a1a';
    canvasCtx.fillRect(0, 0, audioCanvas.width, audioCanvas.height);
}

serverModeBtn.addEventListener('click', () => showMode('server'));
clientModeBtn.addEventListener('click', () => showMode('client'));

startServerBtn.addEventListener('click', async () => {
    const port = parseInt(serverPort.value);
    if (isNaN(port) || port < 1024 || port > 65535) {
        addLog('Invalid port number', 'error');
        return;
    }
    
    updateStatus('connecting', 'Starting server...');
    addLog(`Starting server on port ${port}`, 'info');
    
    const result = await window.voiceChat.startServer(port);
    
    if (result.success) {
        addLog(`Server started on port ${port}`, 'success');
        updateStatus('connecting', `Listening on port ${port}`);
    } else {
        addLog(`Failed to start server: ${result.error}`, 'error');
        updateStatus('disconnected', 'Disconnected');
    }
});

connectBtn.addEventListener('click', async () => {
    const host = clientHost.value.trim();
    const port = parseInt(clientPort.value);
    
    if (!host) {
        addLog('Please enter a host address', 'error');
        return;
    }
    
    if (isNaN(port) || port < 1024 || port > 65535) {
        addLog('Invalid port number', 'error');
        return;
    }
    
    updateStatus('connecting', 'Connecting...');
    addLog(`Connecting to ${host}:${port}`, 'info');
    
    const result = await window.voiceChat.connectPeer(host, port);
    
    if (result.success) {
        addLog(`Connection initiated to ${host}:${port}`, 'success');
    } else {
        addLog(`Failed to connect: ${result.error}`, 'error');
        updateStatus('disconnected', 'Disconnected');
    }
});

disconnectBtn.addEventListener('click', async () => {
    addLog('Disconnecting...', 'info');
    
    const result = await window.voiceChat.stopChat();
    
    if (result.success) {
        addLog('Disconnected', 'info');
        updateStatus('disconnected', 'Disconnected');
        stopAudioVisualization();
        showMode(currentMode);
    }
});

window.voiceChat.onStatusUpdate((message) => {
    addLog(message, 'info');
    
    if (message.includes('Connected') || message.includes('Client connected')) {
        updateStatus('connected', 'Connected');
        showConnected();
    } else if (message.includes('disconnected') || message.includes('closed')) {
        updateStatus('disconnected', 'Disconnected');
        stopAudioVisualization();
        showMode(currentMode);
    }
});

window.voiceChat.onErrorUpdate((error) => {
    addLog(error, 'error');
});

async function loadOutputDevices() {
    const result = await window.voiceChat.getOutputDevices();
    
    if (result.success && result.devices) {
        outputDevice.innerHTML = '';
        
        result.devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.textContent = device.name;
            outputDevice.appendChild(option);
        });
        
        addLog(`Loaded ${result.devices.length} output devices`, 'info');
    } else {
        addLog('Failed to load output devices', 'error');
    }
}

outputDevice.addEventListener('change', async () => {
    const deviceId = outputDevice.value;
    const result = await window.voiceChat.setOutputDevice(deviceId);
    
    if (result.success) {
        const selectedText = outputDevice.options[outputDevice.selectedIndex].text;
        addLog(`Output device changed to: ${selectedText}`, 'success');
    } else {
        addLog(`Failed to change output device: ${result.error}`, 'error');
    }
});

refreshDevicesBtn.addEventListener('click', async () => {
    addLog('Refreshing audio devices...', 'info');
    await loadOutputDevices();
});

loadOutputDevices();
updateStatus('disconnected', 'Disconnected');