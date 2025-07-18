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
    const bufferCountSelect = document.getElementById('bufferCountSelect');
    const muteBtn = document.getElementById('muteBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    const protocolSelect = document.getElementById('protocolSelect');
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');
    const pageTitleInput = document.getElementById('pageTitle');
    const channelSelect = document.getElementById('channelSelect');
    
    // Buffer control buttons
    const refreshAllBtn = document.getElementById('refreshAllBtn');
    const clearReceiveBtn = document.getElementById('clearReceiveBtn');
    const clearSendBtn = document.getElementById('clearSendBtn');
    const bufferStatusBtn = document.getElementById('bufferStatusBtn');
    const bufferStatusDiv = document.getElementById('bufferStatus');

    let socket;
    let audioContext;
    let mediaStream;
    let scriptProcessor;
    let analyser;
    let animationId;
    let isConnected = false;
    
    // Audio buffering system
    let audioBufferQueue = [];
    let isPlaying = false;
    let playbackStartTime = 0;
    let nextPlayTime = 0;
    let sampleRate = 44100;
    let channelCount = 1;
    let bufferDuration = 0.02; // 20ms chunks
    let maxQueueSize = 100; // Increased queue size
    let minQueueSize = 3; // Minimum buffers before starting playback
    let lastScheduledEndTime = 0;
    let isMuted = false;
    let receiveVolume = 1.0; // 0.0 to 2.0
    
    // Buffer monitoring and refresh
    let bufferRefreshInterval = null;
    let maxLatency = 500; // Max allowed latency in ms
    let latencyCheckInterval = 1000; // Check every 1 second
    let bufferStartTime = 0;
    let totalBuffersReceived = 0;
    
    // Adaptive buffer management
    let adaptiveEnabled = true;
    let autoRefreshEnabled = true;
    let averageLatency = 0;
    let latencyHistory = [];
    let latencyHistorySize = 10;
    let autoRefreshCount = 0;
    
    // Send buffer tracking
    let sendBufferCount = 0;
    let sendBufferSize = 0;
    
    // Page title management
    let baseTitle = 'Voice Chat Client';
    let currentStatus = 'Ready';

    function addLog(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logArea.appendChild(entry);
        logArea.scrollTop = logArea.scrollHeight;
    }

    function updatePageTitle() {
        const titlePrefix = isConnected ? '🟢' : (currentStatus === 'Connecting...' ? '🟡' : '🔴');
        document.title = `${titlePrefix} ${baseTitle} - ${currentStatus}`;
    }

    function updateStatus(status, message) {
        statusText.textContent = message;
        statusIndicator.className = 'status-indicator';
        isConnected = status === 'connected';
        statusIndicator.classList.toggle('connected', isConnected);
        statusIndicator.classList.toggle('disconnected', !isConnected);
        
        // Update page title
        currentStatus = message;
        updatePageTitle();
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

    // Mute button event listener
    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        muteBtn.textContent = isMuted ? '🔇 Unmute' : '🎤 Mute';
        muteBtn.classList.toggle('muted', isMuted);
        addLog(isMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
    });

    // Volume slider event listener
    volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt(e.target.value);
        receiveVolume = volume / 100.0;
        volumeValue.textContent = `${volume}%`;
        addLog(`Receive volume set to ${volume}%`, 'info');
    });

    // Buffer control event listeners
    refreshAllBtn.addEventListener('click', () => {
        if (isConnected) {
            refreshAllBuffers();
        } else {
            addLog('Not connected - cannot refresh buffers', 'warning');
        }
    });

    clearReceiveBtn.addEventListener('click', () => {
        if (isConnected) {
            clearReceiveBuffer();
        } else {
            addLog('Not connected - cannot clear receive buffer', 'warning');
        }
    });

    clearSendBtn.addEventListener('click', () => {
        if (isConnected) {
            clearSendBuffer();
        } else {
            addLog('Not connected - cannot clear send buffer', 'warning');
        }
    });

    bufferStatusBtn.addEventListener('click', () => {
        if (isConnected) {
            showBufferStatus();
        } else {
            addLog('Not connected - no buffer status available', 'warning');
        }
    });

    // Auto refresh toggle event listener
    autoRefreshToggle.addEventListener('change', (e) => {
        autoRefreshEnabled = e.target.checked;
        adaptiveEnabled = e.target.checked; // Disable adaptive management too when auto-refresh is off
        
        if (autoRefreshEnabled) {
            addLog('Auto buffer refresh enabled - automatic latency management', 'info');
        } else {
            addLog('Auto buffer refresh disabled - manual control only', 'info');
            addLog('Note: Latency may increase over time, use Refresh Buffer button as needed', 'warning');
            addLog('Manual mode preserves audio continuity (no interruptions)', 'info');
        }
    });

    // Page title input event listener
    pageTitleInput.addEventListener('input', (e) => {
        baseTitle = e.target.value || 'Voice Chat Client';
        updatePageTitle();
        addLog(`Page title updated: ${baseTitle}`, 'info');
    });

    // Channel select event listener
    channelSelect.addEventListener('change', (e) => {
        const channels = parseInt(e.target.value);
        channelCount = channels;
        addLog(`Output channels set to: ${channels}ch`, 'info');
        
        if (isConnected && audioContext) {
            addLog('Note: Channel change will take effect on next connection', 'warning');
        }
    });

    connectBtn.addEventListener('click', async () => {
        if (isConnected) return;
        addLog('Connecting to server...');
        updateStatus('connecting', 'Connecting...');

        // Get server URL from input or use current location
        const serverUrl = serverUrlInput.value || window.location.origin;
        const protocol = protocolSelect.value;
        
        // Note about protocol selection
        if (protocol === 'udp') {
            addLog('Note: Web client uses WebSocket. UDP is available in native client only.', 'info');
        }
        
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
            muteBtn.disabled = false;
            
            // Enable buffer control buttons
            refreshAllBtn.disabled = false;
            clearReceiveBtn.disabled = false;
            clearSendBtn.disabled = false;
            bufferStatusBtn.disabled = false;
            
            // Send protocol preference if UDP is selected
            if (protocol === 'udp') {
                socket.emit('setProtocol', 'udp');
            }

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
                
                // Update audio parameters
                sampleRate = audioContext.sampleRate;
                addLog(`Audio context created - Sample rate: ${sampleRate}Hz`, 'info');
                
                analyser = audioContext.createAnalyser();
                
                // Get selected microphone
                const selectedMicId = micSelect.value;
                const constraints = {
                    audio: selectedMicId === 'default' || !selectedMicId ? true : { deviceId: { exact: selectedMicId } }
                };
                
                mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                const source = audioContext.createMediaStreamSource(mediaStream);
                
                // Get selected buffer size and count
                const bufferSize = parseInt(bufferSizeSelect.value) || 4096;
                const bufferCount = parseInt(bufferCountSelect.value) || 3;
                
                // Update minimum queue size based on user selection
                minQueueSize = bufferCount;
                addLog(`Buffer settings: Size=${bufferSize}, Count=${bufferCount}`, 'info');
                
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
                    if (socket && socket.connected && !isMuted) {
                        const inputData = e.inputBuffer.getChannelData(0);
                        // Convert to ArrayBuffer for compatibility
                        const buffer = new ArrayBuffer(inputData.length * 4);
                        const view = new Float32Array(buffer);
                        view.set(inputData);
                        socket.emit('voice', buffer);
                        
                        // Track send buffer
                        sendBufferCount++;
                        sendBufferSize += buffer.byteLength;
                    }
                };

                startAudioVisualization();
                startBufferMonitoring();
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
        
        socket.on('protocolSet', (response) => {
            addLog(`Protocol: ${response.message}`, 'info');
        });

        socket.on('voice', (data) => {
            if (!audioContext || audioContext.state === 'closed') return;
            
            try {
                const buffer = new Float32Array(data);
                
                // Add to queue instead of playing immediately
                totalBuffersReceived++;
                
                if (audioBufferQueue.length < maxQueueSize) {
                    audioBufferQueue.push({
                        data: buffer,
                        timestamp: audioContext.currentTime,
                        duration: buffer.length / sampleRate,
                        id: totalBuffersReceived
                    });
                    
                    // Start playback only when we have enough buffers
                    if (!isPlaying && audioBufferQueue.length >= minQueueSize) {
                        addLog(`Starting playback with ${audioBufferQueue.length}/${minQueueSize} buffers`, 'info');
                        startContinuousPlayback();
                    }
                } else {
                    // Queue is full
                    if (autoRefreshEnabled) {
                        // Auto mode: drop oldest buffer to prevent lag
                        const dropped = audioBufferQueue.shift();
                        audioBufferQueue.push({
                            data: buffer,
                            timestamp: audioContext.currentTime,
                            duration: buffer.length / sampleRate,
                            id: totalBuffersReceived
                        });
                        addLog(`Buffer overflow: dropped buffer ${dropped.id}`, 'warning');
                    } else {
                        // Manual mode: just drop the new buffer to preserve continuity
                        addLog(`Buffer full in manual mode: dropping new buffer ${totalBuffersReceived}`, 'info');
                        // Don't add the new buffer, preserve existing queue
                    }
                }
            } catch (err) {
                console.error('Error queuing audio:', err);
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

    function startContinuousPlayback() {
        if (isPlaying) return;
        isPlaying = true;
        
        // Start playback slightly in the future to ensure smooth scheduling
        const currentTime = audioContext.currentTime;
        nextPlayTime = currentTime + 0.1; // 100ms delay
        lastScheduledEndTime = nextPlayTime;
        
        addLog(`Starting continuous playback with ${audioBufferQueue.length} buffers`, 'info');
        scheduleNextBuffer();
    }

    function scheduleNextBuffer() {
        if (!isPlaying || !audioContext || audioContext.state === 'closed') {
            isPlaying = false;
            return;
        }

        // Check if we have buffers to play
        if (audioBufferQueue.length === 0) {
            // No buffers available, wait a bit
            setTimeout(() => {
                if (audioBufferQueue.length === 0) {
                    // Still no buffers, stop playback after a timeout
                    const timeSinceLastBuffer = audioContext.currentTime - lastScheduledEndTime;
                    if (timeSinceLastBuffer > 0.5) { // 500ms timeout
                        isPlaying = false;
                        addLog('Playback stopped - no buffers', 'info');
                    } else {
                        scheduleNextBuffer();
                    }
                } else {
                    scheduleNextBuffer();
                }
            }, 5);
            return;
        }

        // Get the next buffer from queue
        const bufferInfo = audioBufferQueue.shift();
        const buffer = bufferInfo.data;

        try {
            // Create audio buffer with selected channel count
            const selectedChannels = parseInt(channelSelect.value) || 1;
            const audioBuffer = audioContext.createBuffer(selectedChannels, buffer.length, sampleRate);
            
            // Copy mono input to all output channels
            for (let channel = 0; channel < selectedChannels; channel++) {
                audioBuffer.copyToChannel(buffer, channel);
            }

            // Create source and schedule playback
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            // Use precise timing
            const currentTime = audioContext.currentTime;
            const scheduleTime = Math.max(currentTime + 0.01, nextPlayTime);
            
            source.start(scheduleTime);
            
            // Update next play time
            nextPlayTime = scheduleTime + audioBuffer.duration;
            lastScheduledEndTime = nextPlayTime;

            // Add crossfade to reduce clicks and apply volume control
            const gainNode = audioContext.createGain();
            source.disconnect();
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Apply receive volume
            const volumeMultiplier = receiveVolume;
            
            // Very short fade in/out to reduce clicks with volume control
            const fadeTime = 0.002; // 2ms
            gainNode.gain.setValueAtTime(0, scheduleTime);
            gainNode.gain.linearRampToValueAtTime(volumeMultiplier, scheduleTime + fadeTime);
            gainNode.gain.setValueAtTime(volumeMultiplier, nextPlayTime - fadeTime);
            gainNode.gain.linearRampToValueAtTime(0, nextPlayTime);

            // Schedule next buffer
            setTimeout(() => scheduleNextBuffer(), 0);

        } catch (err) {
            console.error('Error playing buffered audio:', err);
            // Continue with next buffer
            setTimeout(() => scheduleNextBuffer(), 5);
        }
    }

    function stopContinuousPlayback() {
        isPlaying = false;
        audioBufferQueue = [];
        playbackStartTime = 0;
        nextPlayTime = 0;
        lastScheduledEndTime = 0;
        addLog('Continuous playback stopped', 'info');
    }
    
    function clearReceiveBuffer() {
        const queueSize = audioBufferQueue.length;
        addLog(`Clearing receive buffer: ${queueSize} buffers`, 'info');
        
        // Clear buffer queue
        audioBufferQueue = [];
        
        // Reset playback state
        if (isPlaying) {
            isPlaying = false;
            nextPlayTime = 0;
            lastScheduledEndTime = 0;
        }
        
        // Reset counters
        totalBuffersReceived = 0;
        bufferStartTime = audioContext ? audioContext.currentTime : 0;
        
        // Reset adaptive management
        latencyHistory = [];
        averageLatency = 0;
        
        addLog('Receive buffer cleared', 'success');
    }
    
    function clearSendBuffer() {
        addLog('Clearing send buffer...', 'info');
        
        // Reset send buffer tracking
        sendBufferCount = 0;
        sendBufferSize = 0;
        
        // Stop and restart audio processing to clear internal buffers
        if (scriptProcessor && mediaStream) {
            scriptProcessor.disconnect();
            
            // Reconnect after a brief pause to clear buffers
            setTimeout(() => {
                if (audioContext && scriptProcessor) {
                    scriptProcessor.connect(audioContext.destination);
                    addLog('Send buffer cleared and restarted', 'success');
                }
            }, 50);
        } else {
            addLog('Send buffer cleared', 'success');
        }
    }
    
    function refreshAllBuffers() {
        addLog('Refreshing all buffers...', 'info');
        clearReceiveBuffer();
        clearSendBuffer();
        addLog('All buffers refreshed', 'success');
    }
    
    function showBufferStatus() {
        const receiveLatency = Math.round(audioBufferQueue.length * bufferDuration * 1000);
        const receiveBuffers = audioBufferQueue.length;
        const avgLatency = Math.round(averageLatency);
        const selectedChannels = parseInt(channelSelect.value) || 1;
        const protocol = protocolSelect.value.toUpperCase();
        
        const status = `
            <div class="status-item">📥 Receive: ${receiveBuffers} buffers (${receiveLatency}ms)</div>
            <div class="status-item">📤 Send: ${sendBufferCount} buffers</div>
            <div class="status-item">📊 Avg Latency: ${avgLatency}ms</div>
            <div class="status-item">🔄 Auto Refresh: ${autoRefreshEnabled ? 'ON' : 'OFF'}</div>
            <div class="status-item">⚡ Queue Size: ${receiveBuffers}/${maxQueueSize}</div>
            <div class="status-item">🎵 Output: ${selectedChannels}ch ${protocol}</div>
            <div class="status-item">📝 Title: ${baseTitle}</div>
        `;
        
        bufferStatusDiv.innerHTML = status;
        bufferStatusDiv.style.display = bufferStatusDiv.style.display === 'block' ? 'none' : 'block';
        
        addLog(`Buffer status - Receive: ${receiveBuffers}/${maxQueueSize}, ${selectedChannels}ch, Latency: ${receiveLatency}ms`, 'info');
    }
    
    // Legacy function for backward compatibility
    function refreshAudioBuffer() {
        refreshAllBuffers();
    }
    
    function checkBufferLatency() {
        if (!isPlaying || !audioContext) return;
        
        const currentTime = audioContext.currentTime;
        const estimatedLatency = (audioBufferQueue.length * bufferDuration * 1000); // in ms
        
        // Always update latency history for monitoring, even if auto-refresh is disabled
        latencyHistory.push(estimatedLatency);
        if (latencyHistory.length > latencyHistorySize) {
            latencyHistory.shift();
        }
        
        // Calculate average latency
        averageLatency = latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length;
        
        // Only perform auto-refresh if enabled
        if (!autoRefreshEnabled) {
            // Manual mode: just log the status occasionally
            if (Math.random() < 0.1) { // 10% chance to log status
                addLog(`Buffer status: ${Math.round(estimatedLatency)}ms latency, ${audioBufferQueue.length} buffers (manual mode)`, 'info');
            }
            return;
        }
        
        // Adaptive management (only when auto-refresh is enabled)
        if (adaptiveEnabled) {
            // Adaptive max latency adjustment
            if (autoRefreshCount > 3) {
                // If we've refreshed too many times, increase tolerance
                maxLatency = Math.min(800, maxLatency + 50);
                addLog(`Increased latency tolerance to ${maxLatency}ms`, 'info');
                autoRefreshCount = 0;
            } else if (averageLatency < maxLatency * 0.3 && maxLatency > 200) {
                // If latency is consistently low, we can be more strict
                maxLatency = Math.max(200, maxLatency - 25);
                addLog(`Decreased latency tolerance to ${maxLatency}ms`, 'info');
            }
        }
        
        // Check if latency is too high (only auto-refresh if enabled)
        if (estimatedLatency > maxLatency) {
            autoRefreshCount++;
            addLog(`High latency detected: ${Math.round(estimatedLatency)}ms (avg: ${Math.round(averageLatency)}ms), refreshing buffer...`, 'warning');
            refreshAudioBuffer();
        }
        
        // Auto-refresh if buffer accumulates too much (only if auto-refresh enabled)
        if (audioBufferQueue.length > maxQueueSize * 0.8) {
            addLog(`Buffer overflow prevention: ${audioBufferQueue.length}/${maxQueueSize}`, 'warning');
            refreshAudioBuffer();
        }
        
        // Adaptive queue size adjustment (only when auto-refresh is enabled)
        if (adaptiveEnabled && latencyHistory.length >= 5) {
            if (averageLatency > maxLatency * 0.7) {
                // Reduce minimum queue size for faster response
                minQueueSize = Math.max(1, minQueueSize - 1);
            } else if (averageLatency < maxLatency * 0.3) {
                // Increase minimum queue size for stability
                minQueueSize = Math.min(5, minQueueSize + 1);
            }
        }
    }
    
    function startBufferMonitoring() {
        if (bufferRefreshInterval) {
            clearInterval(bufferRefreshInterval);
        }
        
        bufferRefreshInterval = setInterval(checkBufferLatency, latencyCheckInterval);
        bufferStartTime = audioContext ? audioContext.currentTime : 0;
        addLog('Buffer monitoring started', 'info');
    }
    
    function stopBufferMonitoring() {
        if (bufferRefreshInterval) {
            clearInterval(bufferRefreshInterval);
            bufferRefreshInterval = null;
        }
        addLog('Buffer monitoring stopped', 'info');
    }

    function resetMuteAndVolume() {
        isMuted = false;
        muteBtn.textContent = '🎤 Mute';
        muteBtn.classList.remove('muted');
        muteBtn.disabled = true;
        
        // Disable buffer control buttons
        refreshAllBtn.disabled = true;
        clearReceiveBtn.disabled = true;
        clearSendBtn.disabled = true;
        bufferStatusBtn.disabled = true;
        
        // Hide buffer status
        bufferStatusDiv.style.display = 'none';
        bufferStatusDiv.innerHTML = '';
    }

    function stopAudioProcessing() {
        stopContinuousPlayback();
        stopBufferMonitoring();
        resetMuteAndVolume();
        
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
    muteBtn.disabled = true;
    
    // Initial buffer control state
    refreshAllBtn.disabled = true;
    clearReceiveBtn.disabled = true;
    clearSendBtn.disabled = true;
    bufferStatusBtn.disabled = true;
    
    // Initialize page title
    baseTitle = pageTitleInput.value || 'Voice Chat Client';
    updatePageTitle();
});