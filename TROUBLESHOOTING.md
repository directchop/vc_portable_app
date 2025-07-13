# Troubleshooting Guide

## 音声送信クライアントのトラブルシューティング

### 1. "The requested stream configuration is not supported by the device"

**問題**: 指定したサンプルレートがデバイスでサポートされていない

**解決策**:
```bash
# macOSの標準サンプルレートを使用
./audio-sender --sample-rate 44100

# または48kHzを試す
./audio-sender --sample-rate 48000

# デバイスがサポートするレートを確認
./audio-sender --list-devices
```

**デフォルト設定変更済み**: 16kHz → 44.1kHz

### 2. "UDP send error: Message too long"

**問題**: UDPパケットサイズが大きすぎる

**解決策**:
```bash
# 小さいバッファサイズを使用（修正済み）
./audio-sender --server IP:PORT --protocol udp

# TCPを使用（パケットサイズ制限なし）
./audio-sender --server IP:PORT --protocol tcp
```

**バッファサイズ変更済み**: 4096 → 1024バイト

### 3. "Failed to resolve hostname"

**問題**: C++版でIP:PORT形式の解析エラー

**解決策**:
```bash
# ✅ 正しい形式
./audio-sender --server 192.168.1.100:8080

# または分けて指定
./audio-sender --server 192.168.1.100 --port 8080
```

**修正済み**: server引数でIP:PORT解析対応

### 4. マイクアクセス権限エラー

**macOS**:
```bash
# システム環境設定 → セキュリティとプライバシー → マイク
# アプリケーションにマイクアクセスを許可
```

**Linux**:
```bash
# ユーザーをaudioグループに追加
sudo usermod -a -G audio $USER

# ALSAデバイス確認
arecord -l
```

### 5. 接続できない

**サーバー側確認**:
```bash
# サーバーが起動しているか確認
netstat -an | grep 8080
netstat -an | grep 8081

# Node.jsサーバー起動
npm run start:tcp    # TCPサーバー (8080)
npm run start:udp    # UDPサーバー (8081)
npm run start:all    # 全サーバー
```

**ファイアウォール確認**:
```bash
# macOS
sudo pfctl -f /etc/pf.conf

# Linux
sudo ufw allow 8080
sudo ufw allow 8081
```

### 6. 音声が途切れる・遅延が大きい

**低レイテンシ設定**:
```bash
# UDPプロトコル使用
./audio-sender --server IP:8081 --protocol udp

# 小さいバッファサイズ（既に適用済み）
# buffer_size = 1024

# 高いサンプルレート
./audio-sender --sample-rate 48000
```

**ネットワーク最適化**:
- 有線LAN接続推奨
- QoS設定でオーディオ優先度UP
- ルーター設定でUDPポート優先

### 7. デバイスが見つからない

**デバイス確認**:
```bash
# 利用可能デバイス一覧
./audio-sender --list-devices

# 部分文字列でデバイス選択
./audio-sender --device "MacBook"
./audio-sender --device "USB"
./audio-sender --device "Blue"
```

**仮想オーディオデバイス**:
```bash
# macOS: BlackHole/Loopback
./audio-sender --device "BlackHole"

# Windows: VB-Cable
./audio-sender --device "VB-Cable"
```

### 8. コンパイルエラー

**macOS**:
```bash
# Xcode Command Line Tools
xcode-select --install

# Homebrew
brew install cmake

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Linux**:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install build-essential cmake libasound2-dev

# CentOS/RHEL
sudo yum install gcc-c++ cmake alsa-lib-devel
```

## 推奨設定

### 高品質音声
```bash
./audio-sender --server IP:8080 --protocol tcp --sample-rate 48000 --channels 2
```

### 低レイテンシ
```bash
./audio-sender --server IP:8081 --protocol udp --sample-rate 44100 --channels 1
```

### 安定性重視
```bash
./audio-sender --server IP:8080 --protocol tcp --sample-rate 44100 --channels 1
```

## よくある使用例

### 1. ローカルテスト
```bash
# サーバー起動
npm run start:tcp

# クライアント接続
./audio-sender --server localhost:8080
```

### 2. リモート配信
```bash
# 配信サーバー
npm run start:all

# 配信者（音声送信）
./audio-sender --server配信サーバーIP:8080 --device "プロマイク"

# 視聴者（Webブラウザで受信）
http://配信サーバーIP:3000
```

### 3. IoT音声送信
```bash
# Raspberry Pi等
./audio-sender --server 中央サーバーIP:8081 --protocol udp --sample-rate 16000
```