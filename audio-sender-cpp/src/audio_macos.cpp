#ifdef __APPLE__

#include "audio_base.h"
#include <CoreAudio/CoreAudio.h>
#include <AudioUnit/AudioUnit.h>
#include <CoreFoundation/CoreFoundation.h>
#include <iostream>
#include <vector>
#include <string>

class MacOSAudioInterface : public AudioInterface {
private:
    AudioUnit audio_unit_;
    bool is_initialized_ = false;
    bool is_capturing_ = false;
    
    static OSStatus AudioInputCallback(void* inRefCon,
                                     AudioUnitRenderActionFlags* ioActionFlags,
                                     const AudioTimeStamp* inTimeStamp,
                                     UInt32 inBusNumber,
                                     UInt32 inNumberFrames,
                                     AudioBufferList* ioData) {
        
        MacOSAudioInterface* self = static_cast<MacOSAudioInterface*>(inRefCon);
        
        // Create buffer for audio data
        AudioBufferList bufferList;
        bufferList.mNumberBuffers = 1;
        bufferList.mBuffers[0].mNumberChannels = self->current_config_.channels;
        bufferList.mBuffers[0].mDataByteSize = inNumberFrames * sizeof(float) * self->current_config_.channels;
        
        std::vector<float> audioData(inNumberFrames * self->current_config_.channels);
        bufferList.mBuffers[0].mData = audioData.data();
        
        // Render audio data
        OSStatus status = AudioUnitRender(self->audio_unit_,
                                        ioActionFlags,
                                        inTimeStamp,
                                        inBusNumber,
                                        inNumberFrames,
                                        &bufferList);
        
        if (status == noErr && self->audio_callback_) {
            self->audio_callback_(audioData);
        }
        
        return status;
    }
    
public:
    std::vector<AudioDevice> list_input_devices() override {
        std::vector<AudioDevice> devices;
        
        AudioObjectPropertyAddress propertyAddress = {
            kAudioHardwarePropertyDevices,
            kAudioObjectPropertyScopeGlobal,
            kAudioObjectPropertyElementMaster
        };
        
        UInt32 dataSize = 0;
        OSStatus status = AudioObjectGetPropertyDataSize(kAudioObjectSystemObject,
                                                        &propertyAddress,
                                                        0, nullptr,
                                                        &dataSize);
        
        if (status != noErr) return devices;
        
        UInt32 deviceCount = dataSize / sizeof(AudioDeviceID);
        std::vector<AudioDeviceID> deviceIDs(deviceCount);
        
        status = AudioObjectGetPropertyData(kAudioObjectSystemObject,
                                          &propertyAddress,
                                          0, nullptr,
                                          &dataSize,
                                          deviceIDs.data());
        
        if (status != noErr) return devices;
        
        for (AudioDeviceID deviceID : deviceIDs) {
            // Check if device has input streams
            propertyAddress.mSelector = kAudioDevicePropertyStreamConfiguration;
            propertyAddress.mScope = kAudioDevicePropertyScopeInput;
            
            status = AudioObjectGetPropertyDataSize(deviceID, &propertyAddress, 0, nullptr, &dataSize);
            if (status != noErr) continue;
            
            AudioBufferList* bufferList = (AudioBufferList*)malloc(dataSize);
            status = AudioObjectGetPropertyData(deviceID, &propertyAddress, 0, nullptr, &dataSize, bufferList);
            
            if (status == noErr && bufferList->mNumberBuffers > 0) {
                AudioDevice device;
                
                // Get device name
                propertyAddress.mSelector = kAudioDevicePropertyDeviceNameCFString;
                propertyAddress.mScope = kAudioObjectPropertyScopeGlobal;
                CFStringRef deviceName = nullptr;
                dataSize = sizeof(deviceName);
                
                status = AudioObjectGetPropertyData(deviceID, &propertyAddress, 0, nullptr, &dataSize, &deviceName);
                if (status == noErr && deviceName) {
                    char name[256];
                    CFStringGetCString(deviceName, name, sizeof(name), kCFStringEncodingUTF8);
                    device.name = name;
                    CFRelease(deviceName);
                }
                
                device.id = std::to_string(deviceID);
                device.channels = bufferList->mBuffers[0].mNumberChannels;
                
                // Get sample rate
                propertyAddress.mSelector = kAudioDevicePropertyNominalSampleRate;
                Float64 sampleRate;
                dataSize = sizeof(sampleRate);
                status = AudioObjectGetPropertyData(deviceID, &propertyAddress, 0, nullptr, &dataSize, &sampleRate);
                device.sample_rate = (status == noErr) ? (int)sampleRate : 44100;
                
                devices.push_back(device);
            }
            
            free(bufferList);
        }
        
        return devices;
    }
    
    bool initialize(const AudioConfig& config) override {
        current_config_ = config;
        
        // Create Audio Component Description
        AudioComponentDescription desc;
        desc.componentType = kAudioUnitType_Output;
        desc.componentSubType = kAudioUnitSubType_HALOutput;
        desc.componentManufacturer = kAudioUnitManufacturer_Apple;
        desc.componentFlags = 0;
        desc.componentFlagsMask = 0;
        
        AudioComponent component = AudioComponentFindNext(nullptr, &desc);
        if (!component) {
            std::cerr << "Failed to find audio component" << std::endl;
            return false;
        }
        
        OSStatus status = AudioComponentInstanceNew(component, &audio_unit_);
        if (status != noErr) {
            std::cerr << "Failed to create audio unit: " << status << std::endl;
            return false;
        }
        
        // Enable input
        UInt32 enableInput = 1;
        status = AudioUnitSetProperty(audio_unit_,
                                    kAudioOutputUnitProperty_EnableIO,
                                    kAudioUnitScope_Input,
                                    1,
                                    &enableInput,
                                    sizeof(enableInput));
        
        if (status != noErr) {
            std::cerr << "Failed to enable input: " << status << std::endl;
            return false;
        }
        
        // Disable output
        UInt32 disableOutput = 0;
        status = AudioUnitSetProperty(audio_unit_,
                                    kAudioOutputUnitProperty_EnableIO,
                                    kAudioUnitScope_Output,
                                    0,
                                    &disableOutput,
                                    sizeof(disableOutput));
        
        // Set stream format
        AudioStreamBasicDescription streamFormat;
        streamFormat.mSampleRate = config.sample_rate;
        streamFormat.mFormatID = kAudioFormatLinearPCM;
        streamFormat.mFormatFlags = kAudioFormatFlagsNativeFloatPacked;
        streamFormat.mBytesPerPacket = sizeof(float) * config.channels;
        streamFormat.mFramesPerPacket = 1;
        streamFormat.mBytesPerFrame = sizeof(float) * config.channels;
        streamFormat.mChannelsPerFrame = config.channels;
        streamFormat.mBitsPerChannel = 32;
        
        status = AudioUnitSetProperty(audio_unit_,
                                    kAudioUnitProperty_StreamFormat,
                                    kAudioUnitScope_Output,
                                    1,
                                    &streamFormat,
                                    sizeof(streamFormat));
        
        if (status != noErr) {
            std::cerr << "Failed to set stream format: " << status << std::endl;
            return false;
        }
        
        // Set input callback
        AURenderCallbackStruct callbackStruct;
        callbackStruct.inputProc = AudioInputCallback;
        callbackStruct.inputProcRefCon = this;
        
        status = AudioUnitSetProperty(audio_unit_,
                                    kAudioOutputUnitProperty_SetInputCallback,
                                    kAudioUnitScope_Global,
                                    0,
                                    &callbackStruct,
                                    sizeof(callbackStruct));
        
        if (status != noErr) {
            std::cerr << "Failed to set input callback: " << status << std::endl;
            return false;
        }
        
        // Initialize audio unit
        status = AudioUnitInitialize(audio_unit_);
        if (status != noErr) {
            std::cerr << "Failed to initialize audio unit: " << status << std::endl;
            return false;
        }
        
        current_device_name_ = "Default Audio Input";
        is_initialized_ = true;
        
        return true;
    }
    
    bool start_capture(AudioCallback callback) override {
        if (!is_initialized_) return false;
        
        audio_callback_ = callback;
        
        OSStatus status = AudioOutputUnitStart(audio_unit_);
        if (status != noErr) {
            std::cerr << "Failed to start audio unit: " << status << std::endl;
            return false;
        }
        
        is_capturing_ = true;
        return true;
    }
    
    void stop_capture() override {
        if (is_capturing_) {
            AudioOutputUnitStop(audio_unit_);
            is_capturing_ = false;
        }
        
        if (is_initialized_) {
            AudioUnitUninitialize(audio_unit_);
            AudioComponentInstanceDispose(audio_unit_);
            is_initialized_ = false;
        }
    }
    
    std::string get_device_name() const override {
        return current_device_name_;
    }
};

std::unique_ptr<AudioInterface> AudioInterface::create() {
    return std::make_unique<MacOSAudioInterface>();
}

#endif // __APPLE__