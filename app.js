import { VoiceChatCore } from './voicechat-core.js';
import readline from 'readline';

async function main() {
    const app = new VoiceChatCore();
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    app.on('status', (message) => {
        console.log(`[Status] ${message}`);
    });

    app.on('error', (error) => {
        console.error(`[Error] ${error}`);
    });

    console.log('P2P Voice Chat Application');
    console.log('==========================');
    console.log('Commands:');
    console.log('  server <port>       - Start as server');
    console.log('  connect <host> <port> - Connect to peer');
    console.log('  devices            - List available output devices');
    console.log('  setoutput <device> - Set output device (use device ID from devices list)');
    console.log('  stop               - Stop voice chat');
    console.log('  exit               - Exit application');
    console.log('');

    rl.on('line', async (input) => {
        const [command, ...args] = input.trim().split(' ');

        switch (command) {
            case 'server':
                if (args.length !== 1) {
                    console.log('Usage: server <port>');
                    break;
                }
                const serverPort = parseInt(args[0]);
                if (isNaN(serverPort)) {
                    console.log('Invalid port number');
                    break;
                }
                app.startServer(serverPort);
                break;

            case 'connect':
                if (args.length !== 2) {
                    console.log('Usage: connect <host> <port>');
                    break;
                }
                const host = args[0];
                const clientPort = parseInt(args[1]);
                if (isNaN(clientPort)) {
                    console.log('Invalid port number');
                    break;
                }
                app.connectToPeer(host, clientPort);
                break;

            case 'devices':
                console.log('\nAvailable output devices:');
                const devices = await app.getOutputDevices();
                devices.forEach((device, index) => {
                    console.log(`  ${index + 1}. ${device.name} (ID: ${device.id})`);
                });
                console.log('');
                break;

            case 'setoutput':
                if (args.length !== 1) {
                    console.log('Usage: setoutput <device-id>');
                    break;
                }
                app.setOutputDevice(args[0]);
                break;

            case 'stop':
                app.stop();
                console.log('Voice chat stopped');
                break;

            case 'exit':
                app.stop();
                process.exit(0);
                break;

            default:
                console.log('Unknown command. Type a valid command.');
        }
    });

    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        app.stop();
        process.exit(0);
    });
}

main();