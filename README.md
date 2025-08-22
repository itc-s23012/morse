# 🎯 モールス風タップカウンター

リアルタイム共有機能付きのタップカウンターアプリです。スペースキー連打で1〜5の数字に変換し、複数ユーザー間でリアルタイム共有できます。

![demo](https://img.shields.io/badge/demo-live-brightgreen) ![version](https://img.shields.io/badge/version-2.0-blue)

## ✨ 機能

- 🎹 **タップ→数字変換**: スペースキー連打を1〜5の数字に自動変換
- 🌐 **リアルタイム共有**: Firebase使用で複数ユーザー間でのライブ共有
- 🔧 **ブラウザ拡張機能**: どのWebサイトでも使用可能な拡張機能版
- 📱 **レスポンシブUI**: 美しい現代的なデザイン
- ⚙️ **カスタマイズ**: 検出時間やキーの設定変更可能

## 🚀 使用方法

### **方法1: Webアプリ版（推奨・共有簡単）**

1. **環境設定**
   ```bash
   git clone https://github.com/itc-s23012/morse.git
   cd morse
   npm install
   ```

2. **Firebase設定**
   - `.env.local`ファイルを作成
   - Firebase設定を記述（詳細は下記）

3. **実行**
   ```bash
   npm run dev
   ```
   http://localhost:3000 でアクセス

### **方法2: ブラウザ拡張機能版（どこでも使用）**

1. **Chrome拡張機能として読み込み**
   - `chrome://extensions/` を開く
   - 「デベロッパーモード」ON
   - 「パッケージ化されていない拡張機能を読み込む」
   - `extension`フォルダを選択

2. **使用開始**
   - 拡張機能アイコンをクリック
   - 「拡張機能を有効にする」
   - どのWebサイトでもスペースキー連打で動作

## 🔥 共有機能

### **リアルタイムデータ共有**
- Webアプリ版と拡張機能版は**同じFirebaseデータベース**を使用
- git cloneした人同士で即座にタップ結果を共有
- オンラインユーザー数と拡張機能使用者数を表示

### **共有例**
```
👤 Aさん: Webアプリで「3」をタップ → 全員に表示
👤 Bさん: 拡張機能で「5」をタップ → 全員に表示  
👤 Cさん: git cloneして参加 → 過去の履歴も見える
```

## ⚙️ Firebase設定

`.env.local`ファイルを作成:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
```

## 📁 プロジェクト構成

```
morse-app/
├── app/
│   ├── page.tsx          # メインWebアプリ
│   ├── layout.tsx        # レイアウト
│   └── globals.css       # グローバルスタイル
├── lib/
│   └── firebase.ts       # Firebase設定
├── extension/            # ブラウザ拡張機能
│   ├── manifest.json     # 拡張機能設定
│   ├── content.js        # コンテンツスクリプト
│   ├── background.js     # バックグラウンド処理
│   ├── popup.html        # ポップアップUI
│   ├── popup.js          # ポップアップロジック
│   └── result.html       # 結果表示ウィンドウ
└── README.md
```

## 🤝 コラボレーション

1. **リポジトリをフォーク/クローン**
2. **同じFirebase設定を共有**
3. **即座にリアルタイム協調が可能**

複数人での開発やイベントでの使用に最適です！

## 🛠 技術スタック

- **Frontend**: Next.js 14, React, TypeScript
- **Database**: Firebase Firestore
- **Extension**: Chrome Extension Manifest V3
- **Styling**: Inline CSS (CSP対応)
- **Real-time**: Firebase onSnapshot
# morse
