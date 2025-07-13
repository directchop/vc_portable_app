# 音声送信クライアント使用ガイド

## 📋 手順

### 1. サーバー起動

```bash
# すべてのサーバーを起動（推奨）
npm run start:all

# または個別に起動
npm run start:tcp    # TCPサーバー（ポート8080）
npm run start:udp    # UDPサーバー（ポート8081）
npm run start:web    # Webサーバー（ポート3000）
```

### 2. 利用可能なマイクデバイス確認

```bash
# Rust版
./audio-sender-rust/target/release/audio-sender --list-devices

# C++版  
./audio-sender-cpp/build/audio-sender --list-devices
```

**出力例：**
```
🎤 Available audio input devices:
--------------------------------------------------
1. ‎hajime iPhoneのマイク
     Format: F32, Sample Rate: 48000 Hz, Channels: 1

2. NDI Audio
     Format: F32, Sample Rate: 44100 Hz, Channels: 2

3. MacBook Airのマイク
     Format: F32, Sample Rate: 44100 Hz, Channels: 1

💡 To use a specific device:
   ./audio-sender --device "MacBook" --server IP:PORT
   ./audio-sender --device "USB" --server IP:PORT
   (Use part of the device name)
```

### 3. デバイス選択方法

デバイス名の**一部**を指定するだけでOK：

```bash
# "MacBook Airのマイク" を使用
./audio-sender --device "MacBook" --server localhost:8080

# "USB Microphone" を使用
./audio-sender --device "USB" --server localhost:8080

# "Blue Yeti" を使用
./audio-sender --device "Blue" --server localhost:8080
```

### 4. 接続方法

#### TCP接続（安定性重視）
```bash
# Rust版
./audio-sender-rust/target/release/audio-sender --server 192.168.1.100:8080

# C++版
./audio-sender-cpp/build/audio-sender --server 192.168.1.100 --port 8080
```

#### UDP接続（低レイテンシ）
```bash
# Rust版
./audio-sender-rust/target/release/audio-sender --server 192.168.1.100:8081 --protocol udp

# C++版
./audio-sender-cpp/build/audio-sender --server 192.168.1.100 --port 8081 --protocol udp
```

## 🔧 よくある問題と解決策

### ❌ "The requested stream configuration is not supported"

**原因**: サンプルレートがデバイスでサポートされていない

**解決策**:
```bash
# デバイスがサポートするレートを確認
./audio-sender --list-devices

# サポートされているレートを指定
./audio-sender --sample-rate 44100 --server IP:PORT
./audio-sender --sample-rate 48000 --server IP:PORT
```

### ❌ "UDP send error: Message too long"

**原因**: UDPパケットサイズが大きすぎる

**解決策**:
```bash
# TCPを使用（推奨）
./audio-sender --server IP:8080 --protocol tcp

# またはサンプルレートを下げる
./audio-sender --server IP:8081 --protocol udp --sample-rate 16000
```

### ❌ Web GUIで音声が聞こえない

**原因**: 音声フォーマットの互換性問題

**確認事項**:
1. サーバーが正常に起動しているか
2. 正しいポートに接続しているか
3. Web GUIで音量設定が適切か

**解決策**:
```bash
# 16kHz（WebGUIと同じ設定）で送信
./audio-sender --sample-rate 16000 --server IP:8080

# デバッグ情報付きで実行（修正版）
./audio-sender --server IP:8080 2>&1 | grep -E "(packet|connect|error)"
```

## 📖 完全な使用例

### ローカルテスト
```bash
# 1. サーバー起動
npm run start:all

# 2. Webブラウザで受信側を開く
open http://localhost:3000

# 3. CLIクライアントで音声送信
./audio-sender --server localhost:8080 --device "MacBook"
```

### リモートサーバー使用
```bash
# サーバー側（クラウドサーバー等）
npm run start:all

# クライアント側1（音声送信）
./audio-sender --server 203.0.113.100:8080 --device "Blue Yeti"

# クライアント側2（Web受信）
open http://203.0.113.100:3000
```

### 複数クライアント
```bash
# クライアント1: メインマイク
./audio-sender --server 192.168.1.100:8080 --device "MacBook"

# クライアント2: USBマイク  
./audio-sender --server 192.168.1.100:8080 --device "USB"

# 全員: Webブラウザで受信
open http://192.168.1.100:3000
```

## ⚙️ 詳細設定

### 音質設定
```bash
# 標準品質（推奨）
./audio-sender --sample-rate 16000 --channels 1

# 高品質
./audio-sender --sample-rate 44100 --channels 1

# 最高品質（TCP推奨）
./audio-sender --sample-rate 48000 --channels 2 --protocol tcp
```

### ネットワーク設定
```bash
# TCP（安定性重視）
./audio-sender --server IP:8080 --protocol tcp

# UDP（低レイテンシ、パケットロス可能性あり）
./audio-sender --server IP:8081 --protocol udp
```

## 🎯 推奨設定

| 用途 | 設定 |
|------|------|
| **一般的な使用** | `--sample-rate 16000 --protocol tcp` |
| **高品質音楽** | `--sample-rate 44100 --protocol tcp` |
| **ゲーム配信** | `--sample-rate 48000 --protocol tcp` |
| **低レイテンシ通話** | `--sample-rate 16000 --protocol udp` |
| **放送・ストリーミング** | `--sample-rate 48000 --channels 2 --protocol tcp` |

## 📱 動作確認

成功時のログ例：
```
🎤 Audio Sender starting...
📡 Server: 192.168.1.100:8080
🔗 Protocol: TCP
⚙️  Sample rate: 16000Hz, 1 channels
🎯 Using device: MacBook Airのマイク
🔌 Attempting TCP connection to 192.168.1.100:8080
🔗 TCP connection established successfully
🎙️  Recording started! Press Ctrl+C to stop.
📦 First packet size: 4096 bytes
📡 Sent 100 audio packets via TCP (4096B each)
```