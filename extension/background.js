// バックグラウンドスクリプト
chrome.runtime.onInstalled.addListener(() => {
  // 初期設定
  chrome.storage.sync.set({
    isEnabled: false,
    windowMs: 700,
    keyValue: ' '
  });
});

// コンテンツスクリプトからのメッセージを処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendSignal') {
    // Firestoreにデータを送信
    handleFirestoreSignal(message.data);
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
