# クイックスタートガイド / Quick Start Guide

## 🚀 3分で始める / Start in 3 Minutes

### 日本語

#### ステップ 1: インストール
```bash
npm install
```

#### ステップ 2: 起動
**CLI版:**
```bash
npm start
```

**GUI版:**
```bash
npm install --save-dev electron
npm run start:gui
```

#### ステップ 3: 接続

**サーバー側（ホスト）:**
```
server 8080
```

**クライアント側（ゲスト）:**
```
connect [サーバーのIPアドレス] 8080
```

---

### English

#### Step 1: Install
```bash
npm install
```

#### Step 2: Launch
**CLI Version:**
```bash
npm start
```

**GUI Version:**
```bash
npm install --save-dev electron
npm run start:gui
```

#### Step 3: Connect

**Server Side (Host):**
```
server 8080
```

**Client Side (Guest):**
```
connect [server IP address] 8080
```

---

## 📋 コマンド一覧 / Command List

| 日本語 | English | コマンド / Command |
|--------|---------|-------------------|
| サーバー起動 | Start Server | `server <port>` |
| 接続 | Connect | `connect <host> <port>` |
| デバイス一覧 | List Devices | `devices` |
| 出力設定 | Set Output | `setoutput <device-id>` |
| 停止 | Stop | `stop` |
| 終了 | Exit | `exit` |

---

## 🎯 使用例 / Usage Example

### シナリオ: 友達と通話 / Scenario: Call with Friend

**太郎さん (Taro) - ホスト / Host:**
```bash
# 1. アプリ起動 / Launch app
npm start

# 2. サーバー起動 / Start server
server 8080

# 3. IPアドレスを花子さんに伝える / Share IP with Hanako
# "私のIPは192.168.1.100です"
```

**花子さん (Hanako) - ゲスト / Guest:**
```bash
# 1. アプリ起動 / Launch app
npm start

# 2. 太郎さんに接続 / Connect to Taro
connect 192.168.1.100 8080

# 3. 通話開始！ / Start talking!
```

---

## ⚡ トラブルシューティング / Troubleshooting

### 音が聞こえない / No Sound
```bash
# デバイス確認 / Check devices
devices

# デバイス変更 / Change device
setoutput default
```

### 接続できない / Cannot Connect
1. ファイアウォールを確認 / Check firewall
2. 正しいIPアドレスか確認 / Verify IP address
3. ポート番号を確認 / Check port number

### macOSエラー / macOS Error
```bash
# SoXをインストール / Install SoX
brew install sox
```

---

## 🔊 音声デバイス設定 / Audio Device Settings

### CLI版 / CLI Version
```bash
# リスト表示 / Show list
devices

# 例 / Example:
# 1. Default System Output (ID: default)
# 2. AirPods Pro (ID: AirPods Pro)

# 変更 / Change
setoutput AirPods Pro
```

### GUI版 / GUI Version
- ドロップダウンから選択 / Select from dropdown
- 即座に反映 / Changes apply immediately

---

## 📱 GUI画面説明 / GUI Interface

```
┌─────────────────────────────┐
│     P2P Voice Chat          │
├─────────────────────────────┤
│ 🟢 Connected                │
├─────────────────────────────┤
│ Output: [AirPods Pro    ▼] │
├─────────────────────────────┤
│ [Start as Server] [Connect] │
├─────────────────────────────┤
│ ～～～ Audio Wave ～～～     │
├─────────────────────────────┤
│ [     Disconnect     ]      │
├─────────────────────────────┤
│ Connection Log:             │
│ [10:30:15] Connected        │
│ [10:30:16] Voice started    │
└─────────────────────────────┘
```

---

## 💡 ヒント / Tips

1. **安定した接続 / Stable Connection**
   - 有線LAN推奨 / Use wired connection
   - 同じネットワーク内で使用 / Use same network

2. **音質向上 / Better Quality**
   - 外部マイク使用 / Use external mic
   - 静かな場所で / Quiet environment

3. **セキュリティ / Security**
   - プライベートネットワークで使用 / Use private network
   - 使用後は終了 / Exit after use

---

**準備完了！楽しい通話を！/ Ready! Enjoy your call! 🎉**