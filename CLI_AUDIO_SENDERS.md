# CLI Audio Senders

音声チャットサーバーに音声を送信するための軽量CLIアプリケーション

## 概要

WebブラウザのGUIクライアント以外に、以下の軽量CLIクライアントが利用可能です：

- **Rust版**: `audio-sender-rust/` - 高性能、メモリ安全
- **C++版**: `audio-sender-cpp/` - ネイティブ性能、最小依存関係

## 特徴

✅ **軽量**: メモリ使用量 < 5MB  
✅ **低レイテンシ**: ネイティブ性能  
✅ **クロスプラットフォーム**: Windows/macOS/Linux  
✅ **マイク選択**: デバイス一覧表示と選択  
✅ **TCP/UDP対応**: プロトコル選択可能  
✅ **設定可能**: サンプルレート、チャンネル数調整  

## クイックスタート

### 1. サーバー起動
```bash
# Node.jsサーバー（TCP + UDP両対応）
npm run start:all
```

### 2. Rust版クライアント
```bash
cd audio-sender-rust

# ビルド
cargo build --release

# デバイス一覧
./target/release/audio-sender --list-devices

# 接続（TCP）
./target/release/audio-sender --server localhost:8080

# 接続（UDP）  
./target/release/audio-sender --server localhost:8081 --protocol udp
```

### 3. C++版クライアント
```bash
cd audio-sender-cpp

# ビルド
mkdir build && cd build
cmake .. && cmake --build . --config Release

# デバイス一覧
./audio-sender --list-devices

# 接続（TCP）
./audio-sender --server localhost --port 8080

# 接続（UDP）
./audio-sender --server localhost --port 8081 --protocol udp
```

## 使用例

### 基本的な使用方法
```bash
# 1. サーバー起動
npm run start:all

# 2. Webクライアント（受信専用）をブラウザで開く
open http://localhost:3000

# 3. CLIクライアント（送信専用）で音声送信
./audio-sender --server localhost:8080
```

### リモートサーバー接続
```bash
# サーバー側（クラウドサーバーなど）
npm run start:udp

# クライアント側
./audio-sender --server 203.0.113.100:8081 --protocol udp
```

### 複数クライアント
```bash
# クライアント1: マイク送信のみ
./audio-sender --server 192.168.1.100:8080

# クライアント2: ブラウザで受信 + 送信
open http://192.168.1.100:3000

# クライアント3: 別のマイク送信
./audio-sender --server 192.168.1.100:8080 --device "USB Microphone"
```

### 高品質設定
```bash
# 44.1kHz ステレオ
./audio-sender --sample-rate 44100 --channels 2

# 特定のマイクを使用
./audio-sender --device "Blue Yeti" --sample-rate 48000
```

## パフォーマンス比較

| 項目 | Rust版 | C++版 | Node.js版 |
|------|--------|-------|-----------|
| **メモリ使用量** | ~2MB | ~2MB | ~15MB |
| **CPU使用率** | <0.5% | <0.5% | ~2% |
| **起動時間** | <1秒 | <1秒 | ~3秒 |
| **レイテンシ** | ~5ms | ~5ms | ~15ms |
| **バイナリサイズ** | ~5MB | ~500KB | N/A |

## 用途例

### 1. **放送・配信**
```bash
# 配信者: 高品質マイクで送信
./audio-sender --device "Shure SM7B" --sample-rate 48000

# 視聴者: ブラウザで受信
open http://streaming-server.com:3000
```

### 2. **IoT・組み込み**
```bash
# Raspberry Pi等での音声送信
./audio-sender --server central-server.local:8081 --protocol udp
```

### 3. **サーバー間中継**
```bash
# サーバーA → サーバーB への音声中継
./audio-sender --server server-b.com:8080 --device "Virtual Audio"
```

### 4. **テスト・開発**
```bash
# ローカルテスト
./audio-sender --server localhost:8080 &
open http://localhost:3000
```

## トラブルシューティング

### マイクが認識されない
```bash
# デバイス一覧確認
./audio-sender --list-devices

# 権限確認（macOS）
sudo chmod 755 /usr/local/bin/audio-sender
```

### 接続できない
```bash
# サーバー起動確認
netstat -an | grep 8080

# ファイアウォール確認
# ポート8080, 8081を開放
```

### 音声が途切れる
```bash
# バッファサイズ調整（Rust版）
# Cargo.tomlでbuffer_sizeを変更

# UDP使用（低レイテンシ）
./audio-sender --protocol udp
```

## ビルド済みバイナリ

各プラットフォーム用のビルド済みバイナリが利用可能：

- **Windows**: `audio-sender.exe`
- **macOS**: `audio-sender` (Intel/Apple Silicon)
- **Linux**: `audio-sender` (x86_64)

## 開発・カスタマイズ

### Rust版の拡張
```rust
// src/main.rs
// 音声フィルタリング、エフェクト追加など
```

### C++版の拡張
```cpp
// src/audio_*.cpp  
// プラットフォーム固有機能の追加
```

## ライセンス

MIT License - 商用利用可能