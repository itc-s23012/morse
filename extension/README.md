# モールス風タップカウンター Chrome拡張機能

## 🚀 機能

- **どのWebサイトでも動作**：ブラウザ拡張機能なので、任意のサイトでタップカウント可能
- **リアルタイム共有**：Firebase Firestoreを使用して複数ユーザー間でリアルタイム同期
- **フローティング表示**：右上に状態インジケーターを表示
- **カスタマイズ可能**：検出時間やキーを設定可能

## 📋 使用方法

### **基本操作**
1. 拡張機能アイコンをクリック
2. 「拡張機能を有効にする」ボタンを押す
3. 任意のWebサイトで以下の操作：
   - **スペースキー連打** → 数字変換（1-5）
   - **Ctrl+クリック** → 手動タップ

### **設定**
- **検出待ち時間**：タップ間隔の判定時間（150-2000ms）
- **対象キー**：反応するキーを選択

## 🛠 インストール方法

### **1. 開発版インストール**
1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `extension` フォルダを選択

### **2. Firebase設定**
1. `content.js` の `firebaseConfig` を実際の設定に変更
2. `popup.js` と `background.js` のFirebase URLとAPIキーを設定

## 🔧 Firebase設定例

```javascript
// content.js
this.firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 📁 ファイル構成

```
extension/
├── manifest.json          # 拡張機能の設定
├── content.js             # 全サイトで実行されるスクリプト
├── popup.html             # ポップアップUI
├── popup.js               # ポップアップのJavaScript
├── background.js          # バックグラウンド処理
└── README.md             # このファイル
```

## ⚡ 動作原理

1. **コンテンツスクリプト**が全てのWebページに注入される
2. **キーボード/マウスイベント**を監視
3. **タップカウント**をリアルタイム処理
4. **Firebase Firestore**にデータ送信
5. **フローティングUI**で状態表示

## 🌐 対応ブラウザ

- Google Chrome (Manifest V3)
- Microsoft Edge
- その他Chromiumベースブラウザ

## 🔒 権限

- `activeTab`: アクティブタブでの動作
- `storage`: 設定の保存
- `host_permissions`: 全サイトでの実行

## 🚀 今後の機能

- [ ] Firefox版対応
- [ ] キーカスタマイズ
- [ ] 統計表示
- [ ] 複数プロファイル対応
- [ ] ダークモード切り替え
