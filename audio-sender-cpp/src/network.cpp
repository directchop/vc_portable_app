#include "network.h"
#include <iostream>
#include <cstring>

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

void Network::initialize() {
#ifdef _WIN32
    WSADATA wsaData;
    int result = WSAStartup(MAKEWORD(2, 2), &wsaData);
    if (result != 0) {
        std::cerr << "WSAStartup failed: " << result << std::endl;
    }
#endif
}

void Network::cleanup() {
#ifdef _WIN32
    WSACleanup();
#endif
}

// TCP Implementation
TCPNetwork::~TCPNetwork() {
    disconnect();
}

bool TCPNetwork::connect(const std::string& host, int port) {
    socket_fd_ = socket(AF_INET, SOCK_STREAM, 0);
    if (socket_fd_ < 0) {
        std::cerr << "Failed to create TCP socket" << std::endl;
        return false;
    }
    
    struct sockaddr_in server_addr;
    std::memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(port);
    
    // Convert hostname to IP
    struct hostent* he = gethostbyname(host.c_str());
    if (he == nullptr) {
        std::cerr << "Failed to resolve hostname: " << host << std::endl;
        disconnect();
        return false;
    }
    
    std::memcpy(&server_addr.sin_addr, he->h_addr_list[0], he->h_length);
    
    if (::connect(socket_fd_, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        std::cerr << "Failed to connect to " << host << ":" << port << std::endl;
        disconnect();
        return false;
    }
    
    return true;
}

bool TCPNetwork::send(const std::vector<uint8_t>& data) {
    if (socket_fd_ < 0) return false;
    
    size_t total_sent = 0;
    while (total_sent < data.size()) {
        ssize_t sent = ::send(socket_fd_, 
                            reinterpret_cast<const char*>(data.data() + total_sent),
                            data.size() - total_sent, 0);
        if (sent < 0) {
            std::cerr << "TCP send failed" << std::endl;
            return false;
        }
        total_sent += sent;
    }
    
    return true;
}

void TCPNetwork::disconnect() {
    if (socket_fd_ >= 0) {
#ifdef _WIN32
        closesocket(socket_fd_);
#else
        close(socket_fd_);
#endif
        socket_fd_ = -1;
    }
}

// UDP Implementation
UDPNetwork::~UDPNetwork() {
    disconnect();
}

bool UDPNetwork::connect(const std::string& host, int port) {
    socket_fd_ = socket(AF_INET, SOCK_DGRAM, 0);
    if (socket_fd_ < 0) {
        std::cerr << "Failed to create UDP socket" << std::endl;
        return false;
    }
    
    std::memset(&server_addr_, 0, sizeof(server_addr_));
    server_addr_.sin_family = AF_INET;
    server_addr_.sin_port = htons(port);
    
    // Convert hostname to IP
    struct hostent* he = gethostbyname(host.c_str());
    if (he == nullptr) {
        std::cerr << "Failed to resolve hostname: " << host << std::endl;
        disconnect();
        return false;
    }
    
    std::memcpy(&server_addr_.sin_addr, he->h_addr_list[0], he->h_length);
    
    return true;
}

bool UDPNetwork::send(const std::vector<uint8_t>& data) {
    if (socket_fd_ < 0) return false;
    
    ssize_t sent = sendto(socket_fd_,
                         reinterpret_cast<const char*>(data.data()),
                         data.size(), 0,
                         (struct sockaddr*)&server_addr_,
                         sizeof(server_addr_));
    
    if (sent < 0) {
        std::cerr << "UDP send failed" << std::endl;
        return false;
    }
    
    return true;
}

void UDPNetwork::disconnect() {
    if (socket_fd_ >= 0) {
#ifdef _WIN32
        closesocket(socket_fd_);
#else
        close(socket_fd_);
#endif
        socket_fd_ = -1;
    }
}