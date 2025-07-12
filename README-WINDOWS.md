# P2P Voice Chat Application - Windows Version

A stable peer-to-peer voice chat application using TCP for reliable audio streaming, with full Windows support and .exe packaging.

## Windows Features

- **Full Windows Support**: Uses `naudiodon` for native Windows audio support
- **Executable Packaging**: Create standalone .exe files with Electron Builder
- **WASAPI Integration**: High-quality audio through Windows Audio Session API
- **No External Dependencies**: No need for SoX or other audio tools

## Windows Installation

### Option 1: Download Pre-built .exe (Recommended)
1. Download the latest release from the releases page
2. Run the installer or portable version
3. Launch the application

### Option 2: Build from Source
1. Install Node.js 14.0.0 or higher
2. Clone/download the project
3. Install dependencies:
   ```bash
   npm install -g windows-build-tools  # If needed for naudiodon
   npm install
   ```
4. For GUI version:
   ```bash
   npm install --save-dev electron electron-builder
   ```

## Building Windows Executable

### Replace package.json
First, replace the existing package.json with the Windows-compatible version:
```bash
copy package-windows.json package.json
```

### Build Commands
```bash
# Build Windows .exe only
npm run build-win

# Build for all platforms (Windows, Mac, Linux)
npm run build-all

# Build and create installer
npm run dist
```

### Output Files
The built files will be in the `dist/` directory:
- `P2P Voice Chat Setup.exe` - Windows installer
- `P2P Voice Chat.exe` - Portable executable

## Windows Usage

### CLI Version (Windows)
```bash
# Use Windows-compatible version
node app-windows.js
```

### GUI Version (Windows)
```bash
# Use Windows-compatible Electron app
npm run start:gui
```

### Windows-Specific Commands
Same as original, but with Windows audio device support:
- `devices` - Lists Windows audio devices (uses WASAPI)
- `setoutput <device-id>` - Sets Windows output device by ID number

## Technical Details (Windows)

- **Audio Format**: 16-bit PCM, 16kHz, Mono
- **Audio Backend**: naudiodon with WASAPI
- **Device Detection**: Native Windows audio device enumeration
- **No External Dependencies**: Self-contained audio handling
- **Build System**: Electron Builder with NSIS installer

## Windows File Structure

```
├── app-windows.js              # Windows-compatible CLI
├── voicechat-core-windows.js   # Windows audio core
├── audio-devices-windows.js    # Windows device management
├── electron-main-windows.js    # Windows Electron main
├── preload-windows.js          # Windows preload script
├── package-windows.json        # Windows package config
├── build/                      # Build assets
│   ├── icon.ico               # Windows icon
│   └── ...
└── dist/                       # Built executables
    ├── P2P Voice Chat Setup.exe
    └── P2P Voice Chat.exe
```

## Troubleshooting Windows

1. **Audio not working**: Ensure Windows audio drivers are updated
2. **Build fails**: Install `windows-build-tools` globally
3. **naudiodon installation issues**: Use `npm install --build-from-source`
4. **Antivirus blocking**: Add the app to antivirus exclusions
5. **Permission errors**: Run as administrator if needed

## Windows Build Requirements

- Node.js 14+ 
- Python 3.7+ (for naudiodon compilation)
- Visual Studio Build Tools 2019 or later
- Windows 10/11 (recommended)

## Migration from Original Version

1. Replace `package.json` with `package-windows.json`
2. Use Windows-specific entry points (`app-windows.js`)
3. Install Windows dependencies (`naudiodon`)
4. Build with Electron Builder