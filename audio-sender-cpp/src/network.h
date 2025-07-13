#pragma once

#include <vector>
#include <string>
#include <cstdint>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <netdb.h>
#endif

class Network {
public:
    virtual ~Network() = default;
    
    // Platform-specific initialization
    static void initialize();
    static void cleanup();
    
    // Connect to server
    virtual bool connect(const std::string& host, int port) = 0;
    
    // Send data
    virtual bool send(const std::vector<uint8_t>& data) = 0;
    
    // Disconnect
    virtual void disconnect() = 0;
};

class TCPNetwork : public Network {
private:
    int socket_fd_ = -1;
    
public:
    ~TCPNetwork() override;
    bool connect(const std::string& host, int port) override;
    bool send(const std::vector<uint8_t>& data) override;
    void disconnect() override;
};

class UDPNetwork : public Network {
private:
    int socket_fd_ = -1;
    struct sockaddr_in server_addr_;
    
public:
    ~UDPNetwork() override;
    bool connect(const std::string& host, int port) override;
    bool send(const std::vector<uint8_t>& data) override;
    void disconnect() override;
};