document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const logArea = document.getElementById('logArea');
    const audioCanvas = document.getElementById('audioCanvas');
    const canvasCtx = audioCanvas.getContext('2d');

    let socket;
    let audioContext;
    let mediaStream;
    let scriptProcessor;
    let analyser;
    let animationId;
    let isConnected = false;

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
        isConnected = status === 'connected';
        statusIndicator.classList.toggle('connected', isConnected);
        statusIndicator.classList.toggle('disconnected', !isConnected);
    }

    function startAudioVisualization() {
        if (!analyser) return;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const width = audioCanvas.width;
        const height = audioCanvas.height;

        function draw() {
            if (!isConnected) return;
            animationId = requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);

            canvasCtx.fillStyle = '#1a1a1a';
            canvasCtx.fillRect(0, 0, width, height);
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = '#4a9eff';
            canvasCtx.beginPath();

            const sliceWidth = width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * height / 2;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }
                x += sliceWidth;
            }
            canvasCtx.stroke();
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

    connectBtn.addEventListener('click', async () => {
        if (isConnected) return;
        addLog('Connecting to server...');
        updateStatus('connecting', 'Connecting...');

        socket = io();

        socket.on('connect', async () => {
            addLog('Connected to server!', 'success');
            updateStatus('connected', 'Connected');
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;

            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const source = audioContext.createMediaStreamSource(mediaStream);
                
                scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
                source.connect(scriptProcessor);
                scriptProcessor.connect(audioContext.destination);
                source.connect(analyser);

                scriptProcessor.onaudioprocess = (e) => {
                    if (socket && socket.connected) {
                        const inputData = e.inputBuffer.getChannelData(0);
                        socket.emit('voice', inputData.buffer);
                    }
                };

                startAudioVisualization();
                addLog('Microphone access granted.', 'info');

            } catch (err) {
                addLog(`Error accessing microphone: ${err.message}`, 'error');
                updateStatus('disconnected', 'Mic Error');
                if (socket) socket.disconnect();
            }
        });

        socket.on('voice', (data) => {
            if (!audioContext) return;
            const buffer = new Float32Array(data);
            const audioBuffer = audioContext.createBuffer(1, buffer.length, audioContext.sampleRate);
            audioBuffer.copyToChannel(buffer, 0);

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
        });

        socket.on('disconnect', () => {
            addLog('Disconnected from server.', 'info');
            updateStatus('disconnected', 'Disconnected');
            stopAudioProcessing();
        });

        socket.on('connect_error', (err) => {
            addLog(`Connection failed: ${err.message}`, 'error');
            updateStatus('disconnected', 'Connection Failed');
            stopAudioProcessing();
        });
    });

    disconnectBtn.addEventListener('click', () => {
        if (socket) {
            socket.disconnect();
        }
        stopAudioProcessing();
    });

    function stopAudioProcessing() {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            mediaStream = null;
        }
        if (scriptProcessor) {
            scriptProcessor.disconnect();
            scriptProcessor = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        stopAudioVisualization();
        updateStatus('disconnected', 'Disconnected');
        addLog('Disconnected.', 'info');
    }

    // Initial state
    updateStatus('disconnected', 'Ready');
    disconnectBtn.disabled = true;
});
