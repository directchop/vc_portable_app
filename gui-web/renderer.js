document.addEventListener('DOMContentLoaded', () => {
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const refreshDevicesBtn = document.getElementById('refreshDevicesBtn');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const logArea = document.getElementById('logArea');
    const audioCanvas = document.getElementById('audioCanvas');
    const canvasCtx = audioCanvas.getContext('2d');
    const serverUrlInput = document.getElementById('serverUrl');
    const micSelect = document.getElementById('micSelect');
    const speakerSelect = document.getElementById('speakerSelect');
    const bufferSizeSelect = document.getElementById('bufferSizeSelect');

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

    async function refreshDeviceList() {
        try {
            // Check if mediaDevices is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                addLog('Media devices not supported in this browser', 'error');
                return;
            }
            
            // First, ensure we have permission by requesting a dummy stream
            let stream = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (permErr) {
                addLog('Microphone permission required for device list', 'info');
            }
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            // Clear existing options
            micSelect.innerHTML = '';
            speakerSelect.innerHTML = '';
            
            // Always add default options
            const defaultMicOption = new Option('Default Microphone', 'default');
            const defaultSpeakerOption = new Option('Default Speaker', 'default');
            defaultMicOption.selected = true;
            defaultSpeakerOption.selected = true;
            micSelect.appendChild(defaultMicOption);
            speakerSelect.appendChild(defaultSpeakerOption);
            
            // Count devices by type
            let micCount = 0;
            let speakerCount = 0;
            
            // Add device options
            devices.forEach(device => {
                if (device.kind === 'audioinput' && device.deviceId && device.deviceId !== 'default') {
                    micCount++;
                    const label = device.label || `Microphone ${micCount}`;
                    const option = new Option(label, device.deviceId);
                    micSelect.appendChild(option);
                } else if (device.kind === 'audiooutput' && device.deviceId && device.deviceId !== 'default') {
                    speakerCount++;
                    const label = device.label || `Speaker ${speakerCount}`;
                    const option = new Option(label, device.deviceId);
                    speakerSelect.appendChild(option);
                }
            });
            
            // Stop the stream if we created one
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            
            // Check if we're on iOS/Safari
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                addLog('iOS detected: Only default audio devices available', 'info');
                // Hide speaker selection on iOS as it's not supported
                const speakerGroup = speakerSelect.parentElement;
                if (speakerGroup) {
                    speakerGroup.style.display = 'none';
                }
            }
            
            addLog(`Found ${micCount} microphone(s) and ${speakerCount} speaker(s)`, 'info');
        } catch (err) {
            addLog(`Error refreshing devices: ${err.message}`, 'error');
        }
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

    refreshDevicesBtn.addEventListener('click', refreshDeviceList);

    connectBtn.addEventListener('click', async () => {
        if (isConnected) return;
        addLog('Connecting to server...');
        updateStatus('connecting', 'Connecting...');

        // Get server URL from input or use current location
        const serverUrl = serverUrlInput.value || window.location.origin;
        
        try {
            socket = io(serverUrl, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 3,
                timeout: 5000
            });
        } catch (err) {
            addLog(`Failed to create socket connection: ${err.message}`, 'error');
            updateStatus('disconnected', 'Connection Failed');
            return;
        }

        socket.on('connect', async () => {
            addLog(`Connected to server at ${serverUrl}!`, 'success');
            updateStatus('connected', 'Connected');
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;

            try {
                // Create audio context with proper vendor prefix handling
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioContextClass) {
                    throw new Error('Web Audio API not supported');
                }
                
                audioContext = new AudioContextClass();
                
                // Resume context for iOS
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
                
                analyser = audioContext.createAnalyser();
                
                // Get selected microphone
                const selectedMicId = micSelect.value;
                const constraints = {
                    audio: selectedMicId === 'default' || !selectedMicId ? true : { deviceId: { exact: selectedMicId } }
                };
                
                mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                const source = audioContext.createMediaStreamSource(mediaStream);
                
                // Get selected buffer size
                const bufferSize = parseInt(bufferSizeSelect.value) || 4096;
                
                // Use createScriptProcessor (deprecated but still needed for compatibility)
                if (audioContext.createScriptProcessor) {
                    scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
                } else {
                    throw new Error('Script processor not supported');
                }
                
                source.connect(scriptProcessor);
                scriptProcessor.connect(audioContext.destination);
                source.connect(analyser);

                scriptProcessor.onaudioprocess = (e) => {
                    if (socket && socket.connected) {
                        const inputData = e.inputBuffer.getChannelData(0);
                        // Convert to ArrayBuffer for compatibility
                        const buffer = new ArrayBuffer(inputData.length * 4);
                        const view = new Float32Array(buffer);
                        view.set(inputData);
                        socket.emit('voice', buffer);
                    }
                };

                startAudioVisualization();
                addLog(`Microphone access granted. Using buffer size: ${bufferSize}`, 'info');

                // Set audio output device if supported (not available on iOS)
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                if (!isIOS && speakerSelect.value !== 'default') {
                    // Note: setSinkId is typically on HTMLMediaElement, not AudioContext
                    // For now, we'll skip this as it requires a different implementation
                    addLog('Note: Custom speaker selection requires additional implementation', 'info');
                }

            } catch (err) {
                const errorMessage = err.message || err.toString() || 'Unknown error';
                addLog(`Error accessing microphone: ${errorMessage}`, 'error');
                updateStatus('disconnected', 'Mic Error');
                if (socket) socket.disconnect();
            }
        });

        socket.on('voice', (data) => {
            if (!audioContext || audioContext.state === 'closed') return;
            
            try {
                const buffer = new Float32Array(data);
                const audioBuffer = audioContext.createBuffer(1, buffer.length, audioContext.sampleRate);
                audioBuffer.copyToChannel(buffer, 0);

                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();
            } catch (err) {
                console.error('Error playing audio:', err);
            }
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

    // Initialize device list on load
    // Check if we're using HTTPS or localhost
    const isSecureContext = window.isSecureContext;
    if (!isSecureContext) {
        addLog('Warning: HTTPS required for full functionality. Some features may not work over HTTP.', 'error');
        addLog('Audio devices may not be accessible. Consider using HTTPS.', 'error');
    }
    
    // Initial device refresh
    setTimeout(() => {
        refreshDeviceList();
    }, 100);

    // Initial state
    updateStatus('disconnected', 'Ready');
    disconnectBtn.disabled = true;
});