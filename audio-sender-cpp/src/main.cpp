#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <thread>
#include <atomic>
#include <chrono>
#include <cstring>
#include <csignal>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <netdb.h>
#endif

#include "audio_base.h"
#include "network.h"

struct Config {
    std::string server_addr = "localhost";
    int server_port = 8080;
    std::string protocol = "tcp";
    std::string device_name;
    int sample_rate = 16000;
    int channels = 1;
    int buffer_size = 4096;
    bool list_devices = false;
};

void print_usage(const char* program_name) {
    std::cout << "🎤 Audio Sender v1.0\n";
    std::cout << "Usage: " << program_name << " [OPTIONS]\n\n";
    std::cout << "Options:\n";
    std::cout << "  -s, --server ADDR      Server address (default: localhost)\n";
    std::cout << "  -p, --port PORT        Server port (default: 8080)\n";
    std::cout << "  --protocol PROTO       Protocol tcp/udp (default: tcp)\n";
    std::cout << "  -d, --device NAME      Microphone device name\n";
    std::cout << "  -r, --sample-rate RATE Sample rate in Hz (default: 16000)\n";
    std::cout << "  -c, --channels NUM     Number of channels (default: 1)\n";
    std::cout << "  -l, --list-devices     List available audio devices\n";
    std::cout << "  -h, --help             Show this help\n\n";
    std::cout << "Examples:\n";
    std::cout << "  " << program_name << " -l                    # List devices\n";
    std::cout << "  " << program_name << " -s 192.168.1.100     # Connect to remote server\n";
    std::cout << "  " << program_name << " --protocol udp       # Use UDP\n";
    std::cout << "  " << program_name << " -d \"USB Microphone\" # Use specific mic\n";
}

Config parse_args(int argc, char* argv[]) {
    Config config;
    
    for (int i = 1; i < argc; i++) {
        std::string arg = argv[i];
        
        if (arg == "-h" || arg == "--help") {
            print_usage(argv[0]);
            exit(0);
        } else if (arg == "-l" || arg == "--list-devices") {
            config.list_devices = true;
        } else if ((arg == "-s" || arg == "--server") && i + 1 < argc) {
            config.server_addr = argv[++i];
        } else if ((arg == "-p" || arg == "--port") && i + 1 < argc) {
            config.server_port = std::stoi(argv[++i]);
        } else if (arg == "--protocol" && i + 1 < argc) {
            config.protocol = argv[++i];
        } else if ((arg == "-d" || arg == "--device") && i + 1 < argc) {
            config.device_name = argv[++i];
        } else if ((arg == "-r" || arg == "--sample-rate") && i + 1 < argc) {
            config.sample_rate = std::stoi(argv[++i]);
        } else if ((arg == "-c" || arg == "--channels") && i + 1 < argc) {
            config.channels = std::stoi(argv[++i]);
        } else {
            std::cerr << "Unknown argument: " << arg << std::endl;
            print_usage(argv[0]);
            exit(1);
        }
    }
    
    return config;
}

std::atomic<bool> running{true};

void signal_handler(int) {
    std::cout << "\n🛑 Stopping audio sender...\n";
    running = false;
}

int main(int argc, char* argv[]) {
    try {
        Config config = parse_args(argc, argv);
        
        // Initialize platform-specific networking
        Network::initialize();
        
        // Create audio interface
        auto audio = AudioInterface::create();
        if (!audio) {
            std::cerr << "❌ Failed to create audio interface\n";
            return 1;
        }
        
        // List devices if requested
        if (config.list_devices) {
            std::cout << "🎤 Available audio input devices:\n";
            std::cout << std::string(50, '-') << "\n";
            
            auto devices = audio->list_input_devices();
            for (size_t i = 0; i < devices.size(); i++) {
                std::cout << (i + 1) << ". " << devices[i].name << "\n";
                std::cout << "     Channels: " << devices[i].channels 
                         << ", Sample Rate: " << devices[i].sample_rate << " Hz\n\n";
            }
            return 0;
        }
        
        std::cout << "🎤 Audio Sender starting...\n";
        std::cout << "📡 Server: " << config.server_addr << ":" << config.server_port << "\n";
        std::cout << "🔗 Protocol: " << config.protocol << "\n";
        std::cout << "⚙️  Sample rate: " << config.sample_rate << "Hz, " << config.channels << " channels\n";
        
        // Configure audio
        AudioConfig audio_config;
        audio_config.device_name = config.device_name;
        audio_config.sample_rate = config.sample_rate;
        audio_config.channels = config.channels;
        audio_config.buffer_size = config.buffer_size;
        
        if (!audio->initialize(audio_config)) {
            std::cerr << "❌ Failed to initialize audio\n";
            return 1;
        }
        
        std::cout << "🎯 Using device: " << audio->get_device_name() << "\n";
        
        // Create network connection
        std::unique_ptr<Network> network;
        if (config.protocol == "tcp") {
            network = std::make_unique<TCPNetwork>();
        } else if (config.protocol == "udp") {
            network = std::make_unique<UDPNetwork>();
        } else {
            std::cerr << "❌ Invalid protocol. Use 'tcp' or 'udp'\n";
            return 1;
        }
        
        if (!network->connect(config.server_addr, config.server_port)) {
            std::cerr << "❌ Failed to connect to server\n";
            return 1;
        }
        
        std::cout << "🔗 Connection established\n";
        
        // Set up signal handling
        std::signal(SIGINT, signal_handler);
        
        // Start audio capture
        audio->start_capture([&network](const std::vector<float>& audio_data) {
            if (running) {
                // Convert float to bytes (little-endian)
                std::vector<uint8_t> byte_data;
                byte_data.reserve(audio_data.size() * sizeof(float));
                
                for (float sample : audio_data) {
                    auto bytes = reinterpret_cast<const uint8_t*>(&sample);
                    for (size_t i = 0; i < sizeof(float); i++) {
                        byte_data.push_back(bytes[i]);
                    }
                }
                
                network->send(byte_data);
            }
        });
        
        std::cout << "🎙️  Recording started! Press Ctrl+C to stop.\n";
        
        // Keep running until signal
        int packet_count = 0;
        while (running) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            packet_count++;
            
            if (packet_count % 100 == 0) {
                std::cout << "📡 Audio streaming... (packets: " << packet_count << ")\n";
            }
        }
        
        // Cleanup
        audio->stop_capture();
        network->disconnect();
        Network::cleanup();
        
        std::cout << "✅ Audio sender stopped.\n";
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}