// モールス風タップカウンター拡張機能 - バックグラウンドスクリプト

class MorseFirebaseManager {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.lastConnection = null;
    this.realtimeListeners = new Map(); // リアルタイムリスナー管理
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Background: メッセージ受信:', message);
      
      if (message.action === 'sendSignal') {
        this.sendSignalToFirebase(message.data)
          .then(success => {
            console.log('Background: Firebase送信結果:', success);
            sendResponse({ success });
          })
          .catch(error => {
            console.error('Background: Firebase送信エラー:', error);
            sendResponse({ success: false, error: error.message });
          });
        
        // システム通知を表示（常時有効）
        if (message.showNotification) {
          this.showNotification(message);
        }
        
        return true; // 非同期レスポンス
      }
      
      if (message.action === 'startRealtimeMonitoring') {
        this.startRealtimeMonitoring(message.userId, sender.tab.id)
          .then(() => {
            console.log('Background: リアルタイム監視開始成功');
            sendResponse({ success: true });
          })
          .catch(error => {
            console.error('Background: リアルタイム監視開始エラー:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      if (message.action === 'stopRealtimeMonitoring') {
        this.stopRealtimeMonitoring(sender.tab.id);
        sendResponse({ success: true });
      }
    });
  }

  async sendSignalToFirebase(data) {
    try {
      console.log('Sending signal to Firestore:', data);
      
      const projectId = 'morse-ae272';
      const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/signals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            value: { integerValue: data.value },
            userId: { stringValue: data.userId },
            createdAt: { timestampValue: new Date(data.timestamp).toISOString() }
          }
        })
      });
      
      if (response.ok) {
        console.log('Successfully sent signal to Firestore');
        return true;
      } else {
        console.error('Failed to send signal to Firestore:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('Error in sendSignalToFirebase:', error);
      return false;
    }
  }

  async startRealtimeMonitoring(userId, tabId) {
    try {
      console.log('Background: リアルタイム監視開始 - userId:', userId, 'tabId:', tabId);
      
      // 既存のリスナーを停止
      this.stopRealtimeMonitoring(tabId);
      
      // 模擬的なリアルタイム監視（実際にはFirestoreのリアルタイムリスナーを使用）
      const intervalId = setInterval(async () => {
        try {
          const signals = await this.fetchRecentSignals(userId);
          const onlineUsers = await this.getOnlineUserCount();
          
          // コンテンツスクリプトにデータを送信
          chrome.tabs.sendMessage(tabId, {
            action: 'realtimeUpdate',
            signals: signals,
            onlineUsers: onlineUsers
          });
        } catch (error) {
          console.error('Background: リアルタイムデータ取得エラー:', error);
        }
      }, 2000); // 2秒ごとにチェック
      
      this.realtimeListeners.set(tabId, intervalId);
      console.log('Background: リアルタイム監視開始成功');
    } catch (error) {
      console.error('Background: リアルタイム監視開始エラー:', error);
      throw error;
    }
  }

  stopRealtimeMonitoring(tabId) {
    const intervalId = this.realtimeListeners.get(tabId);
    if (intervalId) {
      clearInterval(intervalId);
      this.realtimeListeners.delete(tabId);
      console.log('Background: リアルタイム監視停止 - tabId:', tabId);
    }
  }

  async fetchRecentSignals(currentUserId) {
    try {
      const projectId = 'morse-ae272';
      const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/signals?orderBy=createdAt desc&pageSize=10`);
      
      if (response.ok) {
        const data = await response.json();
        const signals = data.documents?.map(doc => ({
          value: parseInt(doc.fields.value.integerValue),
          userId: doc.fields.userId.stringValue,
          timestamp: new Date(doc.fields.createdAt.timestampValue).getTime()
        })) || [];
        
        return signals.filter(signal => {
          const age = Date.now() - signal.timestamp;
          return age < 60000; // 1分以内のデータのみ
        });
      }
      return [];
    } catch (error) {
      console.error('Background: 最新シグナル取得エラー:', error);
      return [];
    }
  }

  async getOnlineUserCount() {
    // 実際の実装では、より精密なオンラインユーザー数計算を行う
    return Math.floor(Math.random() * 3) + 1; // 模擬データ
  }

  showNotification(message) {
    const originalCount = message.originalCount || message.data.value;
    const notificationMessage = originalCount > 5 
      ? `結果: ${message.data.value} (${originalCount}回 → 5に変換)`
      : `結果: ${message.data.value} (${originalCount}回タップ)`;
      
    chrome.notifications.create({
      type: 'basic',
      iconUrl: this.createResultIcon(message.data.value),
      title: '🎯 モールスタップ結果',
      message: notificationMessage
    }, (notificationId) => {
      // 3秒後に通知を自動削除
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, 3000);
    });
    
    // 追加：小さな結果ウィンドウを表示
    this.showResultWindow(message.data.value, originalCount);
  }

  // 結果に応じたアイコンを生成
  createResultIcon(value) {
    const svg = `
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="20" fill="#22d3ee"/>
        <text x="24" y="32" font-family="sans-serif" font-size="18" font-weight="800" fill="white" text-anchor="middle">${value}</text>
      </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  // 小さな結果ウィンドウを表示
  showResultWindow(value, originalCount) {
    const resultData = {
      value: value,
      originalCount: originalCount,
      timestamp: Date.now()
    };
    
    // 結果データを保存（ポップアップで使用）
    chrome.storage.local.set({ lastResult: resultData });
    
    // 既存のresultWindowがあるかチェック
    chrome.windows.getAll({ type: 'popup' }, (windows) => {
      // 既存の結果ウィンドウを閉じる
      windows.forEach(window => {
        if (window.url && window.url.includes('result.html')) {
          chrome.windows.remove(window.id);
        }
      });
      
      // 新しい結果ウィンドウを作成
      chrome.windows.create({
        url: 'result.html',
        type: 'popup',
        width: 300,
        height: 200,
        left: 100,
        top: 100,
        focused: false
      }, (window) => {
        // 3秒後に自動閉じ
        setTimeout(() => {
          chrome.windows.remove(window.id);
        }, 3000);
      });
    });
  }
}

// 拡張機能インストール時の初期化
chrome.runtime.onInstalled.addListener(() => {
  // 初期設定
  chrome.storage.sync.set({
    isEnabled: false,
    windowMs: 700,
    keyValue: ' '
  });
  
  console.log('モールス風タップカウンター拡張機能がインストールされました');
});

// Firebaseマネージャーのインスタンス作成
const firebaseManager = new MorseFirebaseManager();
