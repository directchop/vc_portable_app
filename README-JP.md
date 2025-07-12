# P2P音声チャットアプリケーション

クロスプラットフォーム対応の安定したピアツーピア音声チャットアプリケーションです。TCPによる信頼性の高い音声ストリーミングを提供し、CLI版とGUI版の両方をサポートします。

## 🌟 主要機能

- **クロスプラットフォーム対応**: Windows, macOS, Linux で動作
- **P2P直接通信**: TCPを使用した安定した音声通信
- **自動再接続**: 接続が切れた場合の自動復旧機能
- **デバイス選択**: 音声出力デバイスの選択が可能
- **CLI・GUI両対応**: コマンドライン版とElectron GUI版
- **実行ファイル生成**: 各プラットフォーム用の実行ファイルを生成可能

## 📋 システム要件

### 共通要件
- Node.js 14.0.0以上
- npm または yarn

### プラットフォーム別要件

#### Windows
- Windows 10/11 (推奨)
- Visual Studio Build Tools 2019以降
- Python 3.7以上 (ビルド時)

#### macOS
- macOS 10.14以降
- Xcode Command Line Tools
- SoX (`brew install sox`)

#### Linux
- Ubuntu 18.04以降 / CentOS 7以降
- ALSA開発ライブラリ
- PulseAudio (推奨)

## 🚀 インストール

### 方法1: プリビルド版のダウンロード (推奨)
各プラットフォーム用のプリビルド版をダウンロードして使用できます。

#### Windows
```bash
# インストーラー版
P2P Voice Chat Setup.exe

# ポータブル版
P2P Voice Chat.exe
```

#### macOS
```bash
# DMGファイル
P2P Voice Chat.dmg

# またはApp Store経由でインストール
```

#### Linux
```bash
# AppImage版 (推奨)
P2P_Voice_Chat.AppImage

# Debian/Ubuntu用
sudo dpkg -i p2p-voice-chat_1.0.0_amd64.deb

# Red Hat/CentOS用
sudo rpm -i p2p-voice-chat-1.0.0.x86_64.rpm
```

### 方法2: ソースからビルド

#### 1. 依存関係のインストール

**Windows:**
```bash
# Node.js LTSをインストール
# Visual Studio Build Toolsをインストール
npm install -g windows-build-tools
npm install
```

**macOS:**
```bash
# Homebrewをインストール
brew install sox
npm install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install build-essential libasound2-dev
npm install
```

**Linux (CentOS/RHEL):**
```bash
sudo yum groupinstall "Development Tools"
sudo yum install alsa-lib-devel
npm install
```

#### 2. GUI版の依存関係 (オプション)
```bash
npm install --save-dev electron electron-builder
```

## 🎯 使用方法

### CLI版 (コマンドライン)

#### Windows
```bash
# Windows専用版を使用
node app-windows.js
```

#### macOS/Linux
```bash
# 標準版を使用
npm start
```

#### 基本コマンド
```bash
# サーバーとして起動
server 8080

# クライアントとして接続
connect 192.168.1.100 8080

# 音声出力デバイス一覧
devices

# 音声出力デバイス設定
setoutput <device-id>

# 音声チャット停止
stop

# アプリケーション終了
exit
```

#### 使用例
**ピア1 (サーバー):**
```bash
> server 8080
[STATUS] Server listening on port 8080
```

**ピア2 (クライアント):**
```bash
> connect 192.168.1.100 8080
[STATUS] Connected to peer
[STATUS] Voice chat started
```

### GUI版 (Electron)

#### Windows
```bash
# Windows専用GUI版
electron electron-main-windows.js
```

#### macOS/Linux
```bash
# 標準GUI版
npm run start:gui
```

#### GUI機能
- 📊 **接続状態表示**: リアルタイムで接続状況を確認
- 🎛️ **簡単操作**: サーバー/クライアント モードの切り替え
- 🔊 **デバイス選択**: ドロップダウンメニューから出力デバイスを選択
- 📝 **接続ログ**: 接続履歴とエラーメッセージの表示
- 🎵 **音声視覚化**: 音声レベルの可視化
- 🔌 **簡単切断**: ワンクリックで切断

## 🔧 実行ファイルのビルド

### Windows実行ファイル (.exe)
```bash
# package.jsonを置き換え
copy package-windows.json package.json

# 依存関係インストール
npm install

# Windows用ビルド
npm run build-win

# 出力ファイル
# dist/P2P Voice Chat Setup.exe (インストーラー)
# dist/P2P Voice Chat.exe (ポータブル版)
```

### macOS実行ファイル (.dmg)
```bash
# macOS用ビルド
npm run build-mac

# 出力ファイル
# dist/P2P Voice Chat.dmg
```

### Linux実行ファイル (.AppImage)
```bash
# Linux用ビルド
npm run build-linux

# 出力ファイル
# dist/P2P_Voice_Chat.AppImage
# dist/p2p-voice-chat_1.0.0_amd64.deb
```

### 全プラットフォーム同時ビルド
```bash
# 全プラットフォーム用ビルド
npm run build-all
```

## 🎵 音声出力デバイス設定

### CLI版での設定
```bash
# デバイス一覧表示
> devices
Available output devices:
  -1: Default System Output
  0: Internal Speakers
  1: Headphones
  2: External USB Audio

# デバイス設定
> setoutput 1
[STATUS] Output device set to: 1
```

### GUI版での設定
1. デバイス選択ドロップダウンメニューを開く
2. 使用したいデバイスを選択
3. 更新ボタン (⟳) をクリックしてデバイスリストを更新
4. 変更は即座に反映されます

## 🔧 技術仕様

### 音声フォーマット
- **サンプリングレート**: 16kHz
- **ビット深度**: 16bit
- **チャンネル**: モノラル (1ch)
- **バッファリング**: 4KBチャンク

### ネットワーク
- **プロトコル**: TCP
- **再接続**: 指数バックオフによる自動再接続
- **最大再接続回数**: 5回
- **接続タイムアウト**: 2秒

### 音声バックエンド

#### Windows
- **ライブラリ**: naudiodon
- **バックエンド**: Windows WASAPI
- **外部依存**: なし

#### macOS
- **ライブラリ**: node-record-lpcm16 + speaker
- **バックエンド**: Core Audio (SoX経由)
- **外部依存**: SoX

#### Linux
- **ライブラリ**: node-record-lpcm16 + speaker
- **バックエンド**: ALSA / PulseAudio
- **外部依存**: ALSA tools

## 📁 プロジェクト構成

```
p2p-voicechat/
├── 📄 共通ファイル
│   ├── package.json              # プロジェクト設定
│   ├── README-JP.md             # 日本語ドキュメント
│   └── LICENSE.txt              # ライセンス
│
├── 🖥️ Windows版
│   ├── app-windows.js           # Windows CLI版
│   ├── voicechat-core-windows.js # Windows音声処理
│   ├── audio-devices-windows.js  # Windowsデバイス管理
│   ├── electron-main-windows.js  # Windows Electronメイン
│   ├── preload-windows.js       # Windows Electronプリロード
│   └── package-windows.json     # Windows設定
│
├── 🍎 macOS/Linux版
│   ├── app.js                   # 標準CLI版
│   ├── voicechat-core.js        # 標準音声処理
│   ├── audio-devices.js         # 標準デバイス管理
│   ├── electron-main.js         # 標準Electronメイン
│   └── preload.js               # 標準Electronプリロード
│
├── 🎨 GUI関連
│   └── gui/
│       ├── index.html           # GUI HTML
│       ├── style.css            # GUI スタイル
│       └── renderer.js          # GUI レンダラー
│
├── 🔧 ビルド設定
│   └── build/
│       ├── icon.ico             # Windows アイコン
│       ├── icon.icns            # macOS アイコン
│       └── icon.png             # Linux アイコン
│
└── 📦 出力ディレクトリ
    └── dist/                    # ビルド済み実行ファイル
```

## 🚨 トラブルシューティング

### 共通問題

#### 1. マイクへのアクセス許可エラー
**問題**: マイクアクセスが拒否される
**解決法**:
- **Windows**: 設定 → プライバシー → マイク → アプリにマイクアクセスを許可
- **macOS**: システム環境設定 → セキュリティとプライバシー → マイク → アプリにチェック
- **Linux**: `sudo usermod -a -G audio $USER` でオーディオグループに追加

#### 2. 接続エラー
**問題**: ピアへの接続が失敗する
**解決法**:
- ファイアウォールの設定確認
- ポート番号の確認 (1024-65535)
- ネットワーク接続の確認
- サーバーが起動しているか確認

#### 3. 音声が聞こえない
**問題**: 音声の送受信ができない
**解決法**:
- 音声デバイスの確認 (`devices` コマンド)
- 音量レベルの確認
- 他のアプリケーションでの音声テスト
- デバイスドライバーの更新

### Windows固有の問題

#### 1. naudiodonのインストールエラー
**問題**: `npm install` 時にnaudiodonでエラー
**解決法**:
```bash
# Build toolsをインストール
npm install -g windows-build-tools

# 強制的にソースからビルド
npm install naudiodon --build-from-source

# 管理者権限で実行
```

#### 2. Electron Builder でのビルドエラー
**問題**: Windows実行ファイルの生成に失敗
**解決法**:
```bash
# 証明書なしでビルド
set CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build-win

# 一時的にウイルス対策ソフトを無効化
# ビルド用ディレクトリを除外設定に追加
```

#### 3. WASAPIエラー
**問題**: Windows音声APIでエラー
**解決法**:
- 音声ドライバーの更新
- 音声サービスの再起動
- 管理者権限でアプリケーションを実行

### macOS固有の問題

#### 1. SoXが見つからない
**問題**: `sox: command not found`
**解決法**:
```bash
# Homebrewでインストール
brew install sox

# パスの確認
which sox
```

#### 2. 権限エラー
**問題**: アクセス許可の問題
**解決法**:
- システム環境設定 → セキュリティとプライバシー
- マイク・スピーカーのアクセス許可を確認
- 必要に応じてアプリケーションを許可リストに追加

#### 3. Core Audio エラー
**問題**: 音声デバイスの初期化失敗
**解決法**:
- Audio MIDI設定でデバイス確認
- システムの音声設定をリセット
- 他の音声アプリケーションを終了

### Linux固有の問題

#### 1. ALSA エラー
**問題**: ALSA関連のエラー
**解決法**:
```bash
# Ubuntu/Debian
sudo apt-get install libasound2-dev

# CentOS/RHEL
sudo yum install alsa-lib-devel

# 音声デバイスの確認
aplay -l
arecord -l
```

#### 2. PulseAudio 問題
**問題**: PulseAudioとの競合
**解決法**:
```bash
# PulseAudioの再起動
pulseaudio --kill
pulseaudio --start

# 設定の確認
pactl info
```

#### 3. 権限エラー
**問題**: 音声デバイスへのアクセス権限なし
**解決法**:
```bash
# audioグループに追加
sudo usermod -a -G audio $USER

# 再ログイン後に確認
groups
```

## 🔐 セキュリティ

### ネットワークセキュリティ
- **暗号化**: 現在は非暗号化通信 (今後のバージョンで対応予定)
- **認証**: 基本的な接続認証のみ
- **ファイアウォール**: 使用ポートの開放が必要

### 音声プライバシー
- **録音**: 通話中のみ一時的に録音
- **保存**: 音声データの永続化なし
- **送信**: P2P直接通信のみ

### 推奨セキュリティ設定
```bash
# 信頼できるネットワークでのみ使用
# VPN経由での使用を推奨
# 不要な時はアプリケーションを終了
```

## 🌟 高度な設定

### 音声品質の調整
```javascript
// voicechat-core.js または voicechat-core-windows.js
this.audioFormat = {
    sampleRate: 16000,    // 8000, 16000, 22050, 44100
    channels: 1,          // 1 (mono), 2 (stereo)
    bitDepth: 16         // 8, 16, 24, 32
};
```

### バッファサイズの変更
```javascript
// チャンクサイズの調整 (レイテンシと安定性のバランス)
const chunkSize = 4096;  // 1024, 2048, 4096, 8192
```

### 再接続設定
```javascript
// 再接続の試行回数と間隔
this.maxReconnectAttempts = 5;    // 最大試行回数
this.reconnectDelay = 2000;       // 再接続間隔(ms)
```

## 📊 パフォーマンス最適化

### リソース使用量
- **CPU使用率**: ~5-10% (通常時)
- **メモリ使用量**: ~50-100MB
- **ネットワーク帯域**: ~128kbps (音声品質による)

### 最適化設定
```bash
# 高品質設定 (高CPU/帯域使用)
sampleRate: 44100, bitDepth: 16

# 標準設定 (バランス型)
sampleRate: 16000, bitDepth: 16

# 低品質設定 (低CPU/帯域使用)
sampleRate: 8000, bitDepth: 16
```

## 🔄 アップデート

### 自動アップデート
現在は手動アップデートのみ対応。将来のバージョンで自動アップデート機能を追加予定。

### 手動アップデート
```bash
# 新しいバージョンをダウンロード
# または
git pull origin main
npm install
```

## 🤝 コントリビュート

### 開発環境の構築
```bash
# リポジトリのクローン
git clone https://github.com/your-repo/p2p-voicechat.git
cd p2p-voicechat

# 依存関係のインストール
npm install

# 開発モードで実行
npm run dev
```

### バグレポート
- GitHub Issues で報告
- エラーログの添付
- 再現手順の記載

### 機能リクエスト
- 詳細な説明
- 使用ケースの提示
- 実装案の提案

## 📄 ライセンス

MIT License - 詳細は `LICENSE.txt` をご確認ください。

## 🆘 サポート

### ドキュメント
- [クイックスタート](QUICKSTART.md)
- [API リファレンス](API.md)
- [FAQ](FAQ.md)

### コミュニティ
- GitHub Discussions
- Discord サーバー
- Reddit コミュニティ

### 商用サポート
企業向けサポートについては、メールでお問い合わせください。

---

**🎉 P2P音声チャットアプリケーションをお楽しみください！**

作成者: [Your Name]  
最終更新: 2025年1月
バージョン: 1.0.0