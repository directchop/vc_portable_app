# Audio Sender (Rust)

A lightweight CLI application to send microphone audio to the voice chat server.

## Features

- 🎤 Microphone device selection
- 🔗 TCP/UDP protocol support
- ⚙️ Configurable audio settings
- 🖥️ Cross-platform (Windows/macOS/Linux)
- 📡 Real-time audio streaming

## Installation

```bash
# Build the application
cargo build --release

# The binary will be available at:
# target/release/audio-sender (Linux/macOS)
# target/release/audio-sender.exe (Windows)
```

## Usage

### List available microphones
```bash
./audio-sender --list-devices
```

### Basic usage (TCP to localhost)
```bash
./audio-sender
```

### Specify server and protocol
```bash
# TCP connection
./audio-sender --server 192.168.1.100:8080 --protocol tcp

# UDP connection  
./audio-sender --server 192.168.1.100:8081 --protocol udp
```

### Select specific microphone
```bash
# Use part of the device name
./audio-sender --device "USB Microphone"
```

### Custom audio settings
```bash
./audio-sender --sample-rate 44100 --channels 2
```

## Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--server` | `-s` | Server address (host:port) | `localhost:8080` |
| `--protocol` | `-p` | Protocol (tcp/udp) | `tcp` |
| `--device` | `-d` | Microphone device name | Default device |
| `--list-devices` | `-l` | List available devices | - |
| `--sample-rate` | `-r` | Sample rate in Hz | `16000` |
| `--channels` | `-c` | Number of channels | `1` |

## Examples

```bash
# List devices and find your microphone
./audio-sender -l

# Connect to remote server with UDP
./audio-sender -s 10.0.1.50:8081 -p udp

# Use specific microphone with high quality
./audio-sender -d "Blue Yeti" -r 44100 -c 2

# Quick local test
./audio-sender -s localhost:8080
```

## Server Compatibility

This client is compatible with the Node.js voice chat server:
- TCP mode: connects to `linux-cli-server.js` TCP server
- UDP mode: connects to `linux-cli-server.js` UDP server

## Building for Different Platforms

### Windows
```bash
cargo build --release --target x86_64-pc-windows-msvc
```

### macOS
```bash
cargo build --release --target x86_64-apple-darwin
# or for Apple Silicon:
cargo build --release --target aarch64-apple-darwin
```

### Linux
```bash
cargo build --release --target x86_64-unknown-linux-gnu
```