import { exec } from 'child_process';
import { promisify } from 'util';
import portAudio from 'naudiodon';

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
            const devices = portAudio.getDevices();
            const outputDevices = [{
                id: '-1',
                name: 'Default System Output',
                type: 'output'
            }];
            
            devices.forEach((device, index) => {
                if (device.maxOutputChannels > 0) {
                    outputDevices.push({
                        id: index.toString(),
                        name: device.name,
                        type: 'output'
                    });
                }
            });
            
            return outputDevices;
        } catch (error) {
            return [{
                id: '-1',
                name: 'Default System Output',
                type: 'output'
            }];
        }
    }

    static async getLinuxOutputDevices() {
        try {
            const devices = portAudio.getDevices();
            const outputDevices = [{
                id: '-1',
                name: 'Default Output',
                type: 'output'
            }];
            
            devices.forEach((device, index) => {
                if (device.maxOutputChannels > 0) {
                    outputDevices.push({
                        id: index.toString(),
                        name: device.name,
                        type: 'output'
                    });
                }
            });
            
            return outputDevices;
        } catch (error) {
            const { stdout } = await execAsync('aplay -l').catch(() => ({ stdout: '' }));
            const devices = [{
                id: '-1',
                name: 'Default Output',
                type: 'output'
            }];
            
            const cardMatches = stdout.matchAll(/card (\d+):.+\[(.+?)\]/g);
            for (const match of cardMatches) {
                devices.push({
                    id: match[1],
                    name: match[2],
                    type: 'output'
                });
            }
            
            return devices;
        }
    }

    static async getWindowsOutputDevices() {
        try {
            const devices = portAudio.getDevices();
            const outputDevices = [{
                id: '-1',
                name: 'Default Output Device',
                type: 'output'
            }];
            
            devices.forEach((device, index) => {
                if (device.maxOutputChannels > 0 && device.hostAPIName === 'Windows WASAPI') {
                    outputDevices.push({
                        id: index.toString(),
                        name: device.name,
                        type: 'output'
                    });
                }
            });
            
            return outputDevices;
        } catch (error) {
            return [{
                id: '-1',
                name: 'Default Output Device',
                type: 'output'
            }];
        }
    }

    static getDeviceOptions(deviceId) {
        // For naudiodon, we just need to return the device ID as a number
        return parseInt(deviceId) || -1;
    }
}