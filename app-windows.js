import readline from 'readline';
import { VoiceChatCore } from './voicechat-core-windows.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
});

const voiceChat = new VoiceChatCore();

voiceChat.on('status', (message) => {
    console.log(`[STATUS] ${message}`);
    rl.prompt();
});

voiceChat.on('error', (message) => {
    console.error(`[ERROR] ${message}`);
    rl.prompt();
});

console.log('P2P Voice Chat Application (Windows Compatible)');
console.log('Commands:');
console.log('  server <port>       - Start server on specified port');
console.log('  connect <host> <port> - Connect to peer');
console.log('  devices            - List available output devices');
console.log('  setoutput <device-id> - Set output device');
console.log('  stop               - Stop voice chat');
console.log('  exit               - Exit application');
console.log('');

rl.prompt();

rl.on('line', async (line) => {
    const [command, ...args] = line.trim().split(' ');
    
    switch (command) {
        case 'server':
            if (args.length !== 1) {
                console.log('Usage: server <port>');
            } else {
                const port = parseInt(args[0]);
                voiceChat.startServer(port);
            }
            break;
            
        case 'connect':
            if (args.length !== 2) {
                console.log('Usage: connect <host> <port>');
            } else {
                const host = args[0];
                const port = parseInt(args[1]);
                voiceChat.connectToPeer(host, port);
            }
            break;
            
        case 'devices':
            const devices = await voiceChat.getOutputDevices();
            console.log('Available output devices:');
            devices.forEach(device => {
                console.log(`  ${device.id}: ${device.name}`);
            });
            break;
            
        case 'setoutput':
            if (args.length !== 1) {
                console.log('Usage: setoutput <device-id>');
            } else {
                voiceChat.setOutputDevice(args[0]);
            }
            break;
            
        case 'stop':
            voiceChat.stop();
            break;
            
        case 'exit':
            voiceChat.stop();
            process.exit(0);
            break;
            
        default:
            if (command) {
                console.log(`Unknown command: ${command}`);
            }
    }
    
    rl.prompt();
});

rl.on('close', () => {
    voiceChat.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    voiceChat.stop();
    process.exit(0);
});