// ポップアップのJavaScript
document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleButton');
  const statusText = document.getElementById('statusText');
  const windowMsInput = document.getElementById('windowMs');
  const keyValueSelect = document.getElementById('keyValue');
  
  let isEnabled = false;

  // 初期設定を読み込み
  chrome.storage.sync.get(['isEnabled', 'windowMs', 'keyValue'], (result) => {
    isEnabled = result.isEnabled || false;
    windowMsInput.value = result.windowMs || 700;
    keyValueSelect.value = result.keyValue || ' ';
    
    updateUI();
  });

  // トグルボタンのクリック
  toggleButton.addEventListener('click', () => {
    isEnabled = !isEnabled;
    chrome.storage.sync.set({ isEnabled });
    updateUI();
  });

  // 設定の変更を保存
  windowMsInput.addEventListener('change', () => {
    const value = parseInt(windowMsInput.value);
    if (value >= 150 && value <= 2000) {
      chrome.storage.sync.set({ windowMs: value });
    }
  });

  keyValueSelect.addEventListener('change', () => {
    chrome.storage.sync.set({ keyValue: keyValueSelect.value });
  });

  function updateUI() {
    if (isEnabled) {
      toggleButton.textContent = '拡張機能を無効にする';
      toggleButton.className = 'toggle-button enabled';
      statusText.textContent = '拡張機能が有効です';
    } else {
      toggleButton.textContent = '拡張機能を有効にする';
      toggleButton.className = 'toggle-button disabled';
      statusText.textContent = '拡張機能が無効です';
    }
  }

  // Firebase設定の確認
  chrome.storage.sync.get(['firebaseConfig'], (result) => {
    if (!result.firebaseConfig) {
      // Firebase設定が未設定の場合の処理
      console.log('Firebase設定が必要です');
    }
  });
});

// バックグラウンドからのメッセージを処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendSignal') {
    // Firestoreにデータを送信（実際の実装）
    sendToFirestore(message.data);
  }
});

async function sendToFirestore(data) {
  // 実際のFirebase設定とAPIキーを使用してFirestoreに送信
  try {
    // ここで実際のFirestore APIを呼び出す
    console.log('Sending to Firestore:', data);
    
    // Web APIアプローチ（Firebase REST API使用）
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents/signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
      },
      body: JSON.stringify({
        fields: {
          value: { integerValue: data.value },
          userId: { stringValue: data.userId },
          createdAt: { timestampValue: new Date().toISOString() }
        }
      })
    });
    
    if (response.ok) {
      console.log('Successfully sent to Firestore');
    }
  } catch (error) {
    console.error('Error sending to Firestore:', error);
  }
}
