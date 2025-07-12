import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class AudioDevices {
    static async getOutputDevices() {
        const platform = process.platform;
        
        try {
            if (platform === 'darwin') {
                return await this.getMacOutputDevices();
            } else if (platform === 'linux') {
                return await this.getLinuxOutputDevices();
            } else if (platform === 'win32') {
                return await this.getWindowsOutputDevices();
            } else {
                throw new Error(`Unsupported platform: ${platform}`);
            }
        } catch (error) {
            console.error('Error getting audio devices:', error);
            return [];
        }
    }

    static async getMacOutputDevices() {
        try {
            const { stdout } = await execAsync('system_profiler SPAudioDataType -json');
            const data = JSON.parse(stdout);
            const devices = [];
            
            if (data.SPAudioDataType && data.SPAudioDataType[0]._items) {
                data.SPAudioDataType[0]._items.forEach(item => {
                    if (item._name && item._name.includes('Output')) {
                        devices.push({
                            id: item._name,
                            name: item._name,
                            type: 'output'
                        });
                    }
                });
            }

            const { stdout: coreAudio } = await execAsync(`osascript -e 'set devices to ""
                tell application "System Events"
                    tell process "coreaudiod"
                        set devices to name of every item of (get properties)
                    end tell
                end tell
                return devices'`).catch(() => ({ stdout: '' }));

            const defaultDevice = {
                id: 'default',
                name: 'Default System Output',
                type: 'output'
            };
            
            devices.unshift(defaultDevice);
            
            return devices;
        } catch (error) {
            return [{
                id: 'default',
                name: 'Default System Output',
                type: 'output'
            }];
        }
    }

    static async getLinuxOutputDevices() {
        try {
            const { stdout } = await execAsync('pactl list short sinks');
            const lines = stdout.trim().split('\n');
            const devices = [];
            
            devices.push({
                id: 'default',
                name: 'Default Output',
                type: 'output'
            });
            
            lines.forEach(line => {
                const parts = line.split('\t');
                if (parts.length >= 2) {
                    const id = parts[0];
                    const name = parts[1];
                    devices.push({
                        id: id,
                        name: name.replace(/[._]/g, ' '),
                        type: 'output'
                    });
                }
            });
            
            return devices;
        } catch (error) {
            const { stdout } = await execAsync('aplay -l').catch(() => ({ stdout: '' }));
            const devices = [{
                id: 'default',
                name: 'Default Output',
                type: 'output'
            }];
            
            const cardMatches = stdout.matchAll(/card (\d+):.+\[(.+?)\]/g);
            for (const match of cardMatches) {
                devices.push({
                    id: `hw:${match[1]}`,
                    name: match[2],
                    type: 'output'
                });
            }
            
            return devices;
        }
    }

    static async getWindowsOutputDevices() {
        return [{
            id: 'default',
            name: 'Default Output Device',
            type: 'output'
        }];
    }

    static getDeviceOptions(deviceId) {
        const platform = process.platform;
        
        if (platform === 'darwin') {
            if (deviceId === 'default') {
                return {};
            }
            return {
                device: deviceId
            };
        } else if (platform === 'linux') {
            if (deviceId === 'default') {
                return {};
            }
            if (deviceId.startsWith('hw:')) {
                return {
                    device: deviceId
                };
            }
            return {
                device: `pulse:${deviceId}`
            };
        } else {
            return {};
        }
    }
}