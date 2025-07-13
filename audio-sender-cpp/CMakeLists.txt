cmake_minimum_required(VERSION 3.16)
project(AudioSender)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find packages
find_package(PkgConfig REQUIRED)

# Platform-specific audio libraries
if(WIN32)
    # Windows: Use WASAPI
    set(PLATFORM_LIBS wsock32 ws2_32 winmm)
    set(PLATFORM_SOURCES src/audio_windows.cpp)
elseif(APPLE)
    # macOS: Use Core Audio
    find_library(CORE_AUDIO_FRAMEWORK CoreAudio)
    find_library(AUDIO_UNIT_FRAMEWORK AudioUnit)
    find_library(CORE_FOUNDATION_FRAMEWORK CoreFoundation)
    set(PLATFORM_LIBS ${CORE_AUDIO_FRAMEWORK} ${AUDIO_UNIT_FRAMEWORK} ${CORE_FOUNDATION_FRAMEWORK})
    set(PLATFORM_SOURCES src/audio_macos.cpp)
else()
    # Linux: Use ALSA
    pkg_check_modules(ALSA REQUIRED alsa)
    set(PLATFORM_LIBS ${ALSA_LIBRARIES})
    set(PLATFORM_SOURCES src/audio_linux.cpp)
endif()

# Include directories
include_directories(src)
if(NOT WIN32 AND NOT APPLE)
    include_directories(${ALSA_INCLUDE_DIRS})
endif()

# Source files
set(SOURCES
    src/main.cpp
    src/network.cpp
    src/audio_base.cpp
    ${PLATFORM_SOURCES}
)

# Create executable
add_executable(audio-sender ${SOURCES})

# Link libraries
target_link_libraries(audio-sender ${PLATFORM_LIBS})

# Compiler-specific options
if(MSVC)
    target_compile_options(audio-sender PRIVATE /W4)
else()
    target_compile_options(audio-sender PRIVATE -Wall -Wextra -pedantic)
endif()

# Install target
install(TARGETS audio-sender DESTINATION bin)