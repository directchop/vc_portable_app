#include "audio_base.h"

// This file provides the factory method implementation
// Platform-specific implementations are in separate files

#if !defined(__APPLE__) && !defined(_WIN32) && !defined(__linux__)
// Fallback implementation for unsupported platforms
class DummyAudioInterface : public AudioInterface {
public:
    std::vector<AudioDevice> list_input_devices() override {
        return {};
    }
    
    bool initialize(const AudioConfig& config) override {
        current_config_ = config;
        current_device_name_ = "Dummy Audio Device";
        return true;
    }
    
    bool start_capture(AudioCallback callback) override {
        audio_callback_ = callback;
        // Generate dummy audio data for testing
        std::vector<float> dummy_data(current_config_.buffer_size, 0.0f);
        if (audio_callback_) {
            audio_callback_(dummy_data);
        }
        return true;
    }
    
    void stop_capture() override {
        audio_callback_ = nullptr;
    }
    
    std::string get_device_name() const override {
        return current_device_name_;
    }
};

std::unique_ptr<AudioInterface> AudioInterface::create() {
    return std::make_unique<DummyAudioInterface>();
}
#endif