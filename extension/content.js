// コンテンツスクリプト：全てのWebページで実行される
class MorseTapCounter {
  constructor() {
    this.tapCount = 0;
    this.windowMs = 700;
    this.keyValue = " ";
    this.timerRef = null;
    this.startTs = 0;
    this.userId = this.generateUserId();
    this.isEnabled = false;
    this.isActive = false;
    this.currentValue = null;
    this.realtimeSignals = []; // リアルタイム受信データ
    this.onlineUsers = 0; // オンラインユーザー数
    this.lastShownSignals = new Set(); // 既に表示したシグナルのID追跡
    this.messageListener = null; // メッセージリスナーの参照
    
    console.log('MorseTapCounter: 初期化 - ユーザーID:', this.userId);
    
    // Firebase設定（実際のFirebase設定を使用）
    this.firebaseConfig = {
      apiKey: "AIzaSyC-lPLjd6RR0YAQ5T_iC3bVEVpM4Z38Jpw",
      authDomain: "morse-ae272.firebaseapp.com",
      projectId: "morse-ae272",
      storageBucket: "morse-ae272.firebasestorage.app",
      messagingSenderId: "369151380978",
      appId: "1:369151380978:web:16573047f1019ed966af6b"
    };
    
    this.init();
  }

  generateUserId() {
    return Math.random().toString(36).substr(2, 9);
  }

  init() {
    console.log('MorseTapCounter: init開始');
    
    // 拡張機能の有効/無効状態を取得
    chrome.storage.sync.get(['isEnabled'], (result) => {
      this.isEnabled = result.isEnabled || false;
      console.log('MorseTapCounter: 有効状態取得:', this.isEnabled);
      
      if (this.isEnabled) {
        console.log('MorseTapCounter: 拡張機能を有効化中...');
        this.setupEventListeners();
        this.createFloatingIndicator();
        this.startRealtimeMonitoring();
      } else {
        console.log('MorseTapCounter: 拡張機能は無効状態');
        // 無効でも基本のインジケーターを作成
        this.createFloatingIndicator();
      }
    });

    // ストレージの変更を監視
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.isEnabled) {
        console.log('MorseTapCounter: 有効状態変更:', changes.isEnabled.oldValue, '→', changes.isEnabled.newValue);
        this.isEnabled = changes.isEnabled.newValue;
        if (this.isEnabled) {
          console.log('MorseTapCounter: 拡張機能を有効化...');
          this.setupEventListeners();
          this.createFloatingIndicator();
          this.startRealtimeMonitoring();
        } else {
          console.log('MorseTapCounter: 拡張機能を無効化...');
          this.removeEventListeners();
          this.removeFloatingIndicator();
          this.stopRealtimeMonitoring();
        }
      }
    });
  }

  // Firebase リアルタイム監視開始
  startRealtimeMonitoring() {
    console.log('MorseTapCounter: リアルタイム監視開始 - ユーザーID:', this.userId);
    
    // バックグラウンドスクリプトにリアルタイム監視開始を要求
    chrome.runtime.sendMessage({
      action: 'startRealtimeMonitoring',
      userId: this.userId
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('MorseTapCounter: リアルタイム監視開始エラー:', chrome.runtime.lastError);
      } else {
        console.log('MorseTapCounter: リアルタイム監視開始応答:', response);
      }
    });
    
    // バックグラウンドからのリアルタイムデータを受信
    if (!this.messageListener) {
      this.messageListener = (message, sender, sendResponse) => {
        if (message.action === 'realtimeUpdate') {
          console.log('MorseTapCounter: リアルタイムデータ受信:', {
            signalsCount: message.signals?.length || 0,
            onlineUsers: message.onlineUsers || 0,
            myUserId: this.userId,
            signals: message.signals
          });
          
          this.realtimeSignals = message.signals || [];
          this.onlineUsers = message.onlineUsers || 0;
          this.updateRealtimeDisplay();
          
          console.log('MorseTapCounter: リアルタイムデータ更新完了 - 信号数:', this.realtimeSignals.length, 'オンライン:', this.onlineUsers);
        }
      };
      chrome.runtime.onMessage.addListener(this.messageListener);
      console.log('MorseTapCounter: メッセージリスナー登録完了');
    }
  }

  // Firebase リアルタイム監視停止
  stopRealtimeMonitoring() {
    console.log('MorseTapCounter: リアルタイム監視停止');
    chrome.runtime.sendMessage({
      action: 'stopRealtimeMonitoring'
    });
    
    // メッセージリスナーをクリーンアップ
    if (this.messageListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = null;
    }
    
    this.removeRealtimeDisplay();
  }

  // リアルタイム表示更新
  updateRealtimeDisplay() {
    this.updateFloatingIndicator();
    this.showRealtimeSignals();
  }

  // リアルタイムシグナル表示（新しいものだけ一時的に表示）
  showRealtimeSignals() {
    console.log('MorseTapCounter: リアルタイム信号チェック - 受信数:', this.realtimeSignals.length);
    
    // 新しく受信したシグナルのみを表示
    const newSignals = this.realtimeSignals.filter(signal => {
      const signalAge = Date.now() - signal.timestamp;
      const signalId = `${signal.userId}-${signal.timestamp}`;
      const isNew = signalAge < 5000 && // 5秒以内
                   signal.userId !== this.userId && // 他人のもの
                   !this.lastShownSignals.has(signalId); // 未表示
      
      if (isNew) {
        this.lastShownSignals.add(signalId);
        console.log('MorseTapCounter: 新しいシグナル発見:', signal);
      }
      
      return isNew;
    });

    console.log('MorseTapCounter: 表示対象のシグナル数:', newSignals.length);

    // 古いIDをクリーンアップ（メモリリーク防止）
    if (this.lastShownSignals.size > 50) {
      console.log('MorseTapCounter: シグナル履歴をクリーンアップ');
      this.lastShownSignals.clear();
    }

    if (newSignals.length > 0) {
      console.log('MorseTapCounter: 新しいシグナルを表示します:', newSignals);
      
      newSignals.forEach((signal, index) => {
        // 遅延して表示（複数ある場合は少しずつ表示）
        setTimeout(() => {
          this.createOtherUserTapDisplay(signal);
        }, index * 200);
      });
    }
  }

  // 他人のタップ結果を目立つように表示（2秒で消える）
  createOtherUserTapDisplay(signal) {
    try {
      console.log('MorseTapCounter: 他人のタップ表示作成:', signal);
      
      const tapDisplay = document.createElement('div');
      const uniqueId = `morse-other-tap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      tapDisplay.id = uniqueId;
      
      tapDisplay.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) scale(0) !important;
        background: linear-gradient(135deg, #f59e0b, #f97316) !important;
        color: #ffffff !important;
        padding: 20px 30px !important;
        border-radius: 20px !important;
        font-family: ui-sans-serif, system-ui, sans-serif !important;
        font-size: 28px !important;
        font-weight: 800 !important;
        z-index: 2147483647 !important;
        box-shadow: 0 20px 40px rgba(245, 158, 11, 0.5) !important;
        backdrop-filter: blur(10px) !important;
        border: 3px solid rgba(255, 255, 255, 0.3) !important;
        text-align: center !important;
        min-width: 200px !important;
        animation: otherTapPulse 0.4s ease-out forwards !important;
        pointer-events: none !important;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
      `;

      // アニメーション定義を追加
      if (!document.getElementById('morse-other-tap-animations')) {
        const style = document.createElement('style');
        style.id = 'morse-other-tap-animations';
        style.textContent = `
          @keyframes otherTapPulse {
            0% {
              transform: translate(-50%, -50%) scale(0) !important;
              opacity: 0 !important;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.1) !important;
              opacity: 1 !important;
            }
            100% {
              transform: translate(-50%, -50%) scale(1) !important;
              opacity: 1 !important;
            }
          }
          @keyframes otherTapFadeOut {
            0% {
              transform: translate(-50%, -50%) scale(1) !important;
              opacity: 1 !important;
            }
            100% {
              transform: translate(-50%, -50%) scale(0.8) !important;
              opacity: 0 !important;
            }
          }
        `;
        document.head.appendChild(style);
      }

      // メイン数字表示
      const mainNumber = document.createElement('div');
      mainNumber.style.cssText = `
        font-size: 48px !important;
        margin-bottom: 8px !important;
        font-weight: 900 !important;
      `;
      mainNumber.textContent = signal.value;

      // サブテキスト表示
      const subText = document.createElement('div');
      subText.style.cssText = `
        font-size: 16px !important;
        opacity: 0.9 !important;
        font-weight: 600 !important;
      `;
      subText.textContent = '相手のタップ結果';

      // ユーザーID表示（短縮版）
      const userIdText = document.createElement('div');
      userIdText.style.cssText = `
        font-size: 12px !important;
        opacity: 0.7 !important;
        font-weight: 500 !important;
        margin-top: 4px !important;
      `;
      userIdText.textContent = `ID: ${signal.userId.substr(0, 6)}...`;

      tapDisplay.appendChild(mainNumber);
      tapDisplay.appendChild(subText);
      tapDisplay.appendChild(userIdText);

      const container = document.body || document.documentElement;
      container.appendChild(tapDisplay);

      // 2秒後にフェードアウトして削除
      setTimeout(() => {
        tapDisplay.style.animation = 'otherTapFadeOut 0.3s ease-in forwards';
        setTimeout(() => {
          if (tapDisplay.parentNode) {
            tapDisplay.parentNode.removeChild(tapDisplay);
          }
        }, 300);
      }, 2000); // 2秒間表示

      console.log('MorseTapCounter: 他人のタップ表示作成成功 - 値:', signal.value);
    } catch (error) {
      console.error('MorseTapCounter: 他人のタップ表示作成エラー:', error);
    }
  }

  // 一時的なシグナル表示作成（旧バージョン・今は使用されない）
  createTemporarySignalDisplay(signal) {
    // この関数は createOtherUserTapDisplay に置き換えられました
    this.createOtherUserTapDisplay(signal);
  }

  // フローティングインジケーター更新
  updateFloatingIndicator() {
    this.updateFloatingIndicatorContent();
  }

  // リアルタイム表示削除
  removeRealtimeDisplay() {
    // 他人のタップ表示をすべて削除
    const otherTaps = document.querySelectorAll('[id^="morse-other-tap-"]');
    otherTaps.forEach(tap => tap.remove());
    console.log('MorseTapCounter: リアルタイム表示をクリーンアップしました');
  }

  setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
    document.addEventListener('click', this.handleClick.bind(this), true);
  }

  removeEventListeners() {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this), true);
    document.removeEventListener('click', this.handleClick.bind(this), true);
  }

  handleKeyDown(e) {
    if (!this.isEnabled) return;
    
    const hit = this.keyValue === " " 
      ? e.key === " " || e.code === "Space" 
      : e.key.toLowerCase() === this.keyValue.toLowerCase();
    
    if (hit) {
      e.preventDefault();
      this.registerTap("key");
    }
  }

  handleClick(e) {
    if (!this.isEnabled) return;
    
    // Ctrl+クリックでタップカウント
    if (e.ctrlKey) {
      e.preventDefault();
      this.registerTap("click");
    }
  }

  registerTap(source) {
    if (!this.timerRef) {
      // 新しいバースト開始
      this.tapCount = 1;
      this.startTs = Date.now();
      this.isActive = true;
      this.updateFloatingIndicator();
    } else {
      this.tapCount++;
      this.updateFloatingIndicator();
    }
    this.scheduleFinalize();
  }

  scheduleFinalize() {
    if (this.timerRef) clearTimeout(this.timerRef);
    this.timerRef = setTimeout(() => this.finalize(), this.windowMs);
  }

  async finalize() {
    if (this.timerRef) clearTimeout(this.timerRef);
    this.timerRef = null;

    if (this.tapCount === 0) return;
    
    const n = Math.min(this.tapCount, 5);
    this.currentValue = n;
    this.isActive = false;
    
    // Firestoreに送信（実際の実装では適切なFirebase SDKを使用）
    await this.sendToFirestore(n);
    
    // 結果を表示
    const message = this.tapCount > 5 
      ? `結果: ${n} (${this.tapCount}回 → 5に丸め)`
      : `結果: ${n} (${this.tapCount}回)`;
    
    this.updateFloatingIndicator();
    
    // トースト通知を表示
    this.showResultToast(n, this.tapCount);
    
    // 3秒後に非表示
    setTimeout(() => {
      this.updateFloatingIndicator();
    }, 3000);
    
    this.tapCount = 0;
  }

  async sendToFirestore(value) {
    // ポップアップ経由でFirestoreに送信
    chrome.runtime.sendMessage({
      action: 'sendSignal',
      data: {
        value,
        userId: this.userId,
        timestamp: Date.now()
      },
      originalCount: this.tapCount,
      showNotification: true // 常にシステム通知を表示
    });
  }

  createFloatingIndicator() {
    // 既存のインジケーターを削除
    const existingIndicator = document.getElementById('morse-floating-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    const indicator = document.createElement('div');
    indicator.id = 'morse-floating-indicator';
    indicator.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: rgba(55, 65, 81, 0.95) !important;
      border: 1px solid rgba(75, 85, 99, 0.7) !important;
      border-radius: 12px !important;
      padding: 8px 12px !important;
      color: #e5e7eb !important;
      font-family: ui-sans-serif, system-ui, sans-serif !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      z-index: 2147483647 !important;
      backdrop-filter: blur(10px) !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
      transition: all 0.3s ease !important;
      pointer-events: auto !important;
    `;
    
    // 初期状態の表示を設定
    this.updateFloatingIndicatorContent(indicator);
    
    const container = document.body || document.documentElement;
    container.appendChild(indicator);
    
    console.log('MorseTapCounter: フローティングインジケーター作成完了');
  }

  updateFloatingIndicatorContent(indicator = null) {
    if (!indicator) {
      indicator = document.getElementById('morse-floating-indicator');
    }
    if (!indicator) return;

    try {
      // 拡張機能の状態に応じた表示
      let statusText = '';
      let backgroundColor = '';
      let borderColor = '';
      
      if (!this.isEnabled) {
        statusText = '⏸️ 無効';
        backgroundColor = 'rgba(75, 85, 99, 0.95)';
        borderColor = 'rgba(107, 114, 128, 0.7)';
      } else if (this.isActive) {
        statusText = '📊 アクティブ';
        backgroundColor = 'rgba(34, 211, 238, 0.15)';
        borderColor = 'rgba(34, 211, 238, 0.7)';
      } else {
        statusText = '✅ 待機中';
        backgroundColor = 'rgba(55, 65, 81, 0.95)';
        borderColor = 'rgba(34, 211, 238, 0.5)';
      }

      // オンライン情報を表示
      const onlineInfo = this.onlineUsers > 1 ? ` (${this.onlineUsers}人オンライン)` : '';
      
      // 基本情報
      const basicInfo = `タップ: ${this.tapCount} | 結果: ${this.currentValue || '-'}${onlineInfo}`;

      // 基本情報の表示部分
      const contentDiv = document.createElement('div');
      contentDiv.style.cssText = `
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        font-weight: 600 !important;
        font-size: 11px !important;
      `;
      
      contentDiv.innerHTML = `
        <span style="color: #22d3ee !important;">${statusText}</span>
        <span style="color: #e5e7eb !important;">${basicInfo}</span>
      `;
      
      // インジケーターの内容をクリア
      indicator.innerHTML = '';
      indicator.appendChild(contentDiv);

      // 背景色とボーダーを更新
      indicator.style.background = backgroundColor;
      indicator.style.borderColor = borderColor;
      
      console.log('MorseTapCounter: フローティングインジケーター更新:', statusText);
    } catch (error) {
      console.error('MorseTapCounter: フローティングインジケーター更新エラー:', error);
    }
  }

  removeFloatingIndicator() {
    const indicator = document.getElementById('morse-floating-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  showResultToast(result, originalCount) {
    // 既存のトーストがあれば削除
    const existingToast = document.getElementById('morse-result-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // トースト要素を作成
    const toast = document.createElement('div');
    toast.id = 'morse-result-toast';
    toast.style.cssText = `
      position: fixed !important;
      top: 50px !important;
      left: 50% !important;
      transform: translateX(-50%) translateY(-100px) !important;
      background: linear-gradient(135deg, #22d3ee, #60a5fa) !important;
      color: #ffffff !important;
      padding: 16px 24px !important;
      border-radius: 16px !important;
      font-family: ui-sans-serif, system-ui, sans-serif !important;
      font-size: 24px !important;
      font-weight: 800 !important;
      z-index: 2147483648 !important;
      box-shadow: 0 20px 40px rgba(34, 211, 238, 0.4) !important;
      backdrop-filter: blur(10px) !important;
      border: 2px solid rgba(255, 255, 255, 0.2) !important;
      text-align: center !important;
      min-width: 200px !important;
      animation: morseToastSlide 0.5s ease-out forwards !important;
      pointer-events: none !important;
    `;

    // アニメーションキーフレームを追加
    if (!document.getElementById('morse-toast-style')) {
      const style = document.createElement('style');
      style.id = 'morse-toast-style';
      style.textContent = `
        @keyframes morseToastSlide {
          0% {
            transform: translateX(-50%) translateY(-100px) !important;
            opacity: 0 !important;
          }
          100% {
            transform: translateX(-50%) translateY(0) !important;
            opacity: 1 !important;
          }
        }
        @keyframes morseToastFadeOut {
          0% {
            transform: translateX(-50%) translateY(0) !important;
            opacity: 1 !important;
          }
          100% {
            transform: translateX(-50%) translateY(-50px) !important;
            opacity: 0 !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // コンテンツを設定
    const resultText = document.createElement('div');
    resultText.style.cssText = `
      font-size: 36px !important;
      margin-bottom: 4px !important;
    `;
    resultText.textContent = result;

    const detailText = document.createElement('div');
    detailText.style.cssText = `
      font-size: 14px !important;
      opacity: 0.9 !important;
      font-weight: 600 !important;
    `;
    
    if (originalCount > 5) {
      detailText.innerHTML = `${originalCount}回タップ → <strong>${result}</strong> に変換`;
    } else {
      detailText.innerHTML = `<strong>${originalCount}回タップ</strong>`;
    }

    toast.appendChild(resultText);
    toast.appendChild(detailText);
    
    const container = document.body || document.documentElement;
    container.appendChild(toast);

    // 3秒後にフェードアウト
    setTimeout(() => {
      toast.style.animation = 'morseToastFadeOut 0.3s ease-out forwards !important';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 3000);
  }
}

// 拡張機能を初期化
if (typeof window !== 'undefined') {
  const morseCounter = new MorseTapCounter();
  // ボタンからアクセスできるようにグローバルに登録
  window.morseCounter = morseCounter;
}
