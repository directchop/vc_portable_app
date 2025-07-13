#pragma once

#include <vector>
#include <string>
#include <functional>
#include <memory>

struct AudioDevice {
    std::string name;
    std::string id;
    int channels;
    int sample_rate;
};

struct AudioConfig {
    std::string device_name;
    int sample_rate = 16000;
    int channels = 1;
    int buffer_size = 4096;
};

using AudioCallback = std::function<void(const std::vector<float>&)>;

class AudioInterface {
public:
    virtual ~AudioInterface() = default;
    
    // Factory method to create platform-specific audio interface
    static std::unique_ptr<AudioInterface> create();
    
    // Get list of available input devices
    virtual std::vector<AudioDevice> list_input_devices() = 0;
    
    // Initialize audio with given configuration
    virtual bool initialize(const AudioConfig& config) = 0;
    
    // Start audio capture with callback
    virtual bool start_capture(AudioCallback callback) = 0;
    
    // Stop audio capture
    virtual void stop_capture() = 0;
    
    // Get current device name
    virtual std::string get_device_name() const = 0;
    
protected:
    AudioCallback audio_callback_;
    AudioConfig current_config_;
    std::string current_device_name_;
};