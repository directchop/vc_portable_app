use clap::{Arg, Command};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, Host, SampleRate, StreamConfig};
use std::net::{TcpStream, UdpSocket};
use std::io::Write;
use std::sync::mpsc;
use anyhow::{Result, anyhow};

#[derive(Debug)]
struct AudioConfig {
    device_name: Option<String>,
    server_addr: String,
    protocol: Protocol,
    sample_rate: u32,
    channels: u16,
    buffer_size: u32,
}

#[derive(Debug, Clone)]
enum Protocol {
    TCP,
    UDP,
}

fn main() -> Result<()> {
    let matches = Command::new("Audio Sender")
        .version("0.1.0")
        .about("Sends audio from microphone to voice chat server")
        .arg(
            Arg::new("server")
                .short('s')
                .long("server")
                .value_name("ADDRESS")
                .help("Server address (e.g., 192.168.1.100:8080)")
                .default_value("localhost:8080")
        )
        .arg(
            Arg::new("protocol")
                .short('p')
                .long("protocol")
                .value_name("PROTOCOL")
                .help("Protocol to use (tcp or udp)")
                .default_value("tcp")
        )
        .arg(
            Arg::new("device")
                .short('d')
                .long("device")
                .value_name("DEVICE")
                .help("Microphone device name (use --list-devices to see available)")
        )
        .arg(
            Arg::new("list-devices")
                .short('l')
                .long("list-devices")
                .help("List available audio input devices")
                .action(clap::ArgAction::SetTrue)
        )
        .arg(
            Arg::new("sample-rate")
                .short('r')
                .long("sample-rate")
                .value_name("RATE")
                .help("Sample rate in Hz")
                .default_value("16000")
        )
        .arg(
            Arg::new("channels")
                .short('c')
                .long("channels")
                .value_name("CHANNELS")
                .help("Number of audio channels")
                .default_value("1")
        )
        .get_matches();

    if matches.get_flag("list-devices") {
        list_audio_devices()?;
        println!();
        println!("💡 To use a specific device:");
        println!("   ./audio-sender --device \"MacBook\" --server IP:PORT");
        println!("   ./audio-sender --device \"USB\" --server IP:PORT");
        println!("   (Use part of the device name)");
        return Ok(());
    }

    let protocol = match matches.get_one::<String>("protocol").unwrap().as_str() {
        "tcp" => Protocol::TCP,
        "udp" => Protocol::UDP,
        _ => return Err(anyhow!("Invalid protocol. Use 'tcp' or 'udp'")),
    };

    let config = AudioConfig {
        device_name: matches.get_one::<String>("device").cloned(),
        server_addr: matches.get_one::<String>("server").unwrap().clone(),
        protocol,
        sample_rate: matches.get_one::<String>("sample-rate").unwrap().parse()?,
        channels: matches.get_one::<String>("channels").unwrap().parse()?,
        buffer_size: 1024,
    };

    println!("🎤 Audio Sender starting...");
    println!("📡 Server: {}", config.server_addr);
    println!("🔗 Protocol: {:?}", config.protocol);
    println!("⚙️  Sample rate: {}Hz, {} channels", config.sample_rate, config.channels);

    start_audio_sender(&config)?;

    Ok(())
}

fn list_audio_devices() -> Result<()> {
    println!("🎤 Available audio input devices:");
    println!("{:-<50}", "");
    
    let host = cpal::default_host();
    let devices = host.input_devices()?;
    
    for (index, device) in devices.enumerate() {
        let name = device.name().unwrap_or_else(|_| "Unknown Device".to_string());
        println!("{:2}. {}", index + 1, name);
        
        // Try to get default config
        if let Ok(config) = device.default_input_config() {
            println!("     Format: {:?}, Sample Rate: {} Hz, Channels: {}",
                config.sample_format(),
                config.sample_rate().0,
                config.channels()
            );
        }
        println!();
    }
    
    Ok(())
}

fn find_device_by_name(host: &Host, name: &str) -> Result<Device> {
    let devices = host.input_devices()?;
    
    for device in devices {
        if let Ok(device_name) = device.name() {
            if device_name.contains(name) {
                return Ok(device);
            }
        }
    }
    
    Err(anyhow!("Device '{}' not found", name))
}

fn start_audio_sender(config: &AudioConfig) -> Result<()> {
    let host = cpal::default_host();
    
    // Select audio device
    let device = if let Some(ref name) = config.device_name {
        find_device_by_name(&host, name)?
    } else {
        host.default_input_device()
            .ok_or_else(|| anyhow!("No default input device available"))?
    };
    
    println!("🎯 Using device: {}", device.name().unwrap_or("Unknown".to_string()));
    
    // Configure audio stream
    let stream_config = StreamConfig {
        channels: config.channels,
        sample_rate: SampleRate(config.sample_rate),
        buffer_size: cpal::BufferSize::Fixed(config.buffer_size),
    };
    
    // Create channel for audio data
    let (tx, rx) = mpsc::channel::<Vec<f32>>();
    
    // Build audio stream
    let stream = device.build_input_stream(
        &stream_config,
        move |data: &[f32], _: &cpal::InputCallbackInfo| {
            let audio_data = data.to_vec();
            if tx.send(audio_data).is_err() {
                eprintln!("❌ Failed to send audio data");
            }
        },
        |err| eprintln!("❌ Audio stream error: {}", err),
        None,
    )?;
    
    // Start the stream
    stream.play()?;
    println!("🎙️  Recording started! Press Ctrl+C to stop.");
    
    // Network sender
    match config.protocol {
        Protocol::TCP => send_tcp_audio(&config.server_addr, rx)?,
        Protocol::UDP => send_udp_audio(&config.server_addr, rx)?,
    }
    
    Ok(())
}

fn send_tcp_audio(server_addr: &str, rx: mpsc::Receiver<Vec<f32>>) -> Result<()> {
    println!("🔌 Attempting TCP connection to {}", server_addr);
    let mut stream = match TcpStream::connect(server_addr) {
        Ok(s) => {
            println!("🔗 TCP connection established successfully");
            s
        },
        Err(e) => {
            eprintln!("❌ TCP connection failed: {}", e);
            return Err(anyhow!("TCP connection failed: {}", e));
        }
    };
    
    let mut packet_count = 0;
    for audio_data in rx {
        // Convert f32 to bytes (compatible with the Node.js server)
        let byte_data: Vec<u8> = audio_data
            .iter()
            .flat_map(|&sample| sample.to_le_bytes().to_vec())
            .collect();
        
        if let Err(e) = stream.write_all(&byte_data) {
            eprintln!("❌ TCP send error: {}", e);
            break;
        }
        
        packet_count += 1;
        if packet_count == 1 {
            println!("📦 First packet size: {} bytes", byte_data.len());
        }
        if packet_count % 100 == 0 {
            println!("📡 Sent {} audio packets via TCP ({}B each)", packet_count, byte_data.len());
        }
    }
    
    Ok(())
}

fn send_udp_audio(server_addr: &str, rx: mpsc::Receiver<Vec<f32>>) -> Result<()> {
    println!("🔌 Attempting UDP connection to {}", server_addr);
    let socket = UdpSocket::bind("0.0.0.0:0")?;
    match socket.connect(server_addr) {
        Ok(_) => println!("🔗 UDP connection established successfully"),
        Err(e) => {
            eprintln!("❌ UDP connection failed: {}", e);
            return Err(anyhow!("UDP connection failed: {}", e));
        }
    }
    
    let mut packet_count = 0;
    for audio_data in rx {
        // Convert f32 to bytes
        let byte_data: Vec<u8> = audio_data
            .iter()
            .flat_map(|&sample| sample.to_le_bytes().to_vec())
            .collect();
        
        if let Err(e) = socket.send(&byte_data) {
            eprintln!("❌ UDP send error: {} (packet size: {}B)", e, byte_data.len());
            continue;
        }
        
        packet_count += 1;
        if packet_count == 1 {
            println!("📦 First UDP packet size: {} bytes", byte_data.len());
        }
        if packet_count % 100 == 0 {
            println!("📡 Sent {} audio packets via UDP ({}B each)", packet_count, byte_data.len());
        }
    }
    
    Ok(())
}