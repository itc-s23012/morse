// バックグラウンドスクリプト
chrome.runtime.onInstalled.addListener(() => {
  // 初期設定
  chrome.storage.sync.set({
    isEnabled: false,
    windowMs: 700,
    keyValue: ' '
  });
  
  console.log('モールス風タップカウンター拡張機能がインストールされました');
});

// コンテンツスクリプトからのメッセージを処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendSignal') {
    // Firestoreにデータを送信
    handleFirestoreSignal(message.data);
    

    // システム通知を表示（常時有効）
    if (message.showNotification) {
      const originalCount = message.originalCount || message.data.value;
      const notificationMessage = originalCount > 5 
        ? `結果: ${message.data.value} (${originalCount}回 → 5に変換)`
        : `結果: ${message.data.value} (${originalCount}回タップ)`;
        
      chrome.notifications.create({
        type: 'basic',
        iconUrl: createResultIcon(message.data.value),
        title: '🎯 モールスタップ結果',
        message: notificationMessage
      }, (notificationId) => {
        // 3秒後に通知を自動削除
        setTimeout(() => {
          chrome.notifications.clear(notificationId);
        }, 3000);
      });
      
      // 追加：小さな結果ウィンドウを表示
      showResultWindow(message.data.value, originalCount);
    }
    
    sendResponse({ success: true });
  }
});

async function handleFirestoreSignal(data) {
  try {
    // Firebase Admin SDKまたはREST APIを使用してFirestoreに送信
    // 実際の実装では適切な認証とAPI呼び出しを行う
    
    console.log('Sending signal to Firestore:', data);
    
    // ここで実際のFirestore送信処理を実装
    // 例：Firebase REST API使用
    const response = await sendToFirestoreAPI(data);
    
    if (response.ok) {
      console.log('Successfully sent signal to Firestore');
    } else {
      console.error('Failed to send signal to Firestore');
    }
  } catch (error) {
    console.error('Error in handleFirestoreSignal:', error);
  }
}

async function sendToFirestoreAPI(data) {
  // 実際のFirebase設定を使用
  const projectId = 'morse-ae272';
  
  return fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/signals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 実際の認証トークンまたはAPIキーを使用
    },
    body: JSON.stringify({
      fields: {
        value: { integerValue: data.value },
        userId: { stringValue: data.userId },
        createdAt: { timestampValue: new Date(data.timestamp).toISOString() }
      }
    })
  });
}

// 結果に応じたアイコンを生成
function createResultIcon(value) {
  // SVGアイコンをBase64エンコード
  const svg = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#22d3ee"/>
      <text x="24" y="32" font-family="sans-serif" font-size="18" font-weight="800" fill="white" text-anchor="middle">${value}</text>
    </svg>
  `;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// 小さな結果ウィンドウを表示
function showResultWindow(value, originalCount) {
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
