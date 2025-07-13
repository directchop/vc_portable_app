# P2P/Web 音声チャットアプリケーション

クロスプラットフォーム対応の安定したピアツーピアおよびWebベースの音声チャットアプリケーションです。TCPによる信頼性の高い音声ストリーミング（P2P版）と、ブラウザで手軽に利用できるWeb版を提供します。

## 🌟 主要機能

- **マルチプラットフォーム対応**: Windows, macOS, Linux で動作するデスクトップ版と、主要なブラウザで動作するWeb版。
- **P2P直接通信**: TCPを使用した安定した音声通信（デスクトップ版）。
- **Web版**: `socket.io`を利用したリアルタイム音声通信。インストール不要でブラウザからアクセス可能。
- **自動再接続**: 接続が切れた場合の自動復旧機能（デスクトップ版）。
- **デバイス選択**: 音声出力デバイスの選択が可能（デスクトップ版）。
- **CLI・GUI両対応**: コマンドライン版とElectron GUI版（デスクトップ版）。
- **実行ファイル生成**: 各プラットフォーム用の実行ファイルを生成可能。

## 📋 システム要件

### 共通要件
- Node.js 14.0.0以上
- npm または yarn

### プラットフォーム別要件 (デスクトップ版)

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

### 方法1: プリビルド版のダウンロード (デスクトップ版・推奨)
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
```

#### Linux
```bash
# AppImage版 (推奨)
P2P_Voice_Chat.AppImage

# 軽量CLI版 (Ubuntu 24.04対応)
npm run start:linux
```

### 方法2: ソースから利用

#### 1. 依存関係のインストール
```bash
# プロジェクトをクローン
git clone <repository_url>
cd nvoc_iso

# 依存関係をインストール
npm install
```

## 🎯 使用方法

### Web版 (ブラウザ)

1.  **Webサーバーを起動します。**
    ```bash
    npm run start:web
    ```
2.  **ブラウザでアクセスします。**
    -   `http://localhost:3000` を開きます。
    -   マイクへのアクセスを許可してください。
    -   同じネットワーク内の他のユーザーも `http://<あなたのIPアドレス>:3000` でアクセスできます。

### デスクトップ GUI版 (Electron)

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

### デスクトップ CLI版 (コマンドライン)

#### Windows
```bash
# Windows専用版を使用
node app-windows.js
```

#### macOS/Linux
```bash
# 標準版を使用
npm start

# Linux軽量CLI版 (Ubuntu 24.04推奨)
npm run start:linux
```

## 🔧 実行ファイルのビルド (デスクトップ版)

### Windows実行ファイル (.exe)
```bash
npm run build-win
```

### macOS実行ファイル (.dmg)
```bash
npm run build-mac
```

### Linux実行ファイル (.AppImage)
```bash
npm run build-linux
```

## 📁 プロジェクト構成

```
project/
├── 📄 共通ファイル
│   ├── package.json              # プロジェクト設定
│   ├── README-JP.md             # 日本語ドキュメント
│   └── web-server.js            # Web版サーバー
│
├── 🖥️ Windows版 (デスクトップ)
│   ├── app-windows.js           # Windows CLI版
│   └── ... (他Windows関連ファイル)
│
├── 🍎 macOS/Linux版 (デスクトップ)
│   ├── app.js                   # 標準CLI版
│   ├── linux-cli-server.js      # Linux軽量サーバー版
│   └── ... (他標準版関連ファイル)
│
├── 🎨 GUI関連
│   └── gui/
│       ├── index.html           # GUI/Web HTML
│       ├── style.css            # GUI/Web スタイル
│       └── renderer.js          # GUI/Web レンダラー
│
└── ... (その他ビルド設定など)
```

## 🎮 Linux軽量CLI版の使い方

Linux軽量CLI版は、依存関係の問題を回避したシンプルなサーバーアプリケーションです。

### 起動方法
```bash
npm run start:linux
```

### 利用可能なコマンド
```
web [port]          # Webサーバー開始 (デフォルト: 3000)
tcp [port]          # TCPサーバー開始 (デフォルト: 8080)  
both [webport] [tcpport]  # 両サーバー同時開始
status              # サーバー状態確認
clients             # 接続クライアント一覧
stop                # すべてのサーバー停止
help                # ヘルプ表示
exit                # アプリケーション終了
```

### 使用例
```bash
# Webサーバーのみ開始
web 3000

# TCPサーバーのみ開始  
tcp 8080

# 両方同時開始
both 3000 8080

# ブラウザで http://localhost:3000 にアクセス
```

## 🚨 トラブルシューティング

### Web版

- **マイクが動作しない**: ブラウザの設定で、このサイト（`localhost:3000`）のマイクアクセスが許可されているか確認してください。HTTPSでないため、ブラウザのセキュリティポリシーによっては動作しない場合があります。

### デスクトップ版

- **マイクへのアクセス許可エラー**: OSのプライバシー設定で、ターミナルや当アプリケーションにマイクアクセスを許可してください。
- **接続エラー**: ファイアウォールの設定や、ポート番号が他のアプリケーションと競合していないか確認してください。

### Linux軽量CLI版

- **依存関係エラー**: `node-record-lpcm16`や`speaker`のビルド失敗時は、軽量CLI版を使用してください。
- **ポート競合**: 他のアプリケーションがポートを使用している場合は、別のポート番号を指定してください。
- **ネットワークアクセス**: 他のデバイスからアクセスする場合は、ファイアウォールの設定を確認してください。

## 📄 ライセンス

MIT License - 詳細は `LICENSE.txt` をご確認ください。
