# P2P Voice Chat Application

A stable peer-to-peer voice chat application using TCP for reliable audio streaming, available as both CLI and GUI versions.

## Features

- Direct P2P voice communication over TCP
- Automatic reconnection for stability
- Simple command-line interface
- Optional Electron GUI interface
- Buffered audio streaming for smooth playback
- Output device selection for routing audio to specific speakers/headphones
- Cross-platform support (macOS, Linux)

## Prerequisites

- Node.js 14.0.0 or higher
- On macOS: SoX (install with `brew install sox`)
- On Linux: ALSA tools (usually pre-installed)

## Installation

```bash
npm install
```

For GUI version (optional):
```bash
npm install --save-dev electron
```

For Linux lightweight CLI server (Ubuntu 24.04 compatible):
```bash
npm run start:linux
```

## Usage

### CLI Version

Start the command-line application:

```bash
npm start
```

### Linux Lightweight CLI Server

For Ubuntu 24.04 and systems with native dependency issues:

```bash
npm run start:linux
```

**Available commands:**
- `web [port]` - Start web server (default: 3000)
- `tcp [port]` - Start TCP server (default: 8080)
- `both [webport] [tcpport]` - Start both servers
- `status` - Show server status
- `clients` - List connected clients
- `stop` - Stop all servers
- `help` - Show help
- `exit` - Exit application

**Example usage:**
```bash
# Start web server only
web 3000

# Start TCP server only
tcp 8080

# Start both servers
both 3000 8080

# Access via browser at http://localhost:3000
```

### Original CLI Version

**Commands:**
- `server <port>` - Start as server and listen for incoming connections
- `connect <host> <port>` - Connect to a peer
- `devices` - List available audio output devices
- `setoutput <device-id>` - Set the output device for incoming audio
- `stop` - Stop the current voice chat session
- `exit` - Exit the application

**Example:**

Peer 1 (Server):
```
server 8080
```

Peer 2 (Client):
```
connect 192.168.1.100 8080
```

### GUI Version (Optional)

Start the Electron GUI application:

```bash
npm run start:gui
```

The GUI provides:
- Visual connection status indicator
- Easy server/client mode selection
- Output device selection dropdown
- Connection logs
- Audio visualization
- Simple disconnect button

To remove the GUI, simply delete these files:
- `electron-main.js`
- `preload.js`
- `gui/` directory
- Remove electron from devDependencies in package.json

## Technical Details

- Audio Format: 16-bit PCM, 16kHz, Mono
- Buffering: 4KB chunks for stable streaming
- Reconnection: Automatic retry with exponential backoff
- Protocol: TCP for reliable delivery
- Architecture: Modular design with shared core logic

## Project Structure

```
├── app.js              # CLI application
├── linux-cli-server.js # Linux lightweight CLI server
├── voicechat-core.js   # Shared voice chat logic
├── audio-devices.js    # Audio device enumeration
├── electron-main.js    # Electron main process (GUI)
├── preload.js          # Electron preload script
├── web-server.js       # Web server for browser clients
└── gui/                # GUI frontend files
    ├── index.html
    ├── style.css
    └── renderer.js
```

## Audio Output Selection

### CLI
1. Run `devices` to list available output devices
2. Note the device ID (e.g., "default", "hw:1", etc.)
3. Run `setoutput <device-id>` to change the output device
4. The change takes effect immediately, even during an active call

### GUI
1. Select your preferred output device from the dropdown menu
2. Click the refresh button (⟳) to update the device list
3. Changes take effect immediately

## Troubleshooting

### Original CLI/GUI Version
1. **Permission denied for microphone**: Grant microphone access to your terminal/app
2. **SoX not found on macOS**: Install with `brew install sox`
3. **Connection refused**: Ensure the server is running and port is not blocked by firewall
4. **Electron not starting**: Run `npm install --save-dev electron` first
5. **Audio device not working**: Try refreshing the device list or use "default" device

### Linux Lightweight CLI Server
1. **Native dependency build errors**: Use the lightweight server instead of the original CLI
2. **Port conflicts**: Specify different port numbers if default ports are in use
3. **Network access issues**: Check firewall settings for external device access
4. **Browser microphone not working**: Ensure HTTPS or localhost access for microphone permissions
5. **WebSocket connection failed**: Verify the web server is running and accessible