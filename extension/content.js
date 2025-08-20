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
    // 拡張機能の有効/無効状態を取得
    chrome.storage.sync.get(['isEnabled'], (result) => {
      this.isEnabled = result.isEnabled || false;
      if (this.isEnabled) {
        this.setupEventListeners();
        this.createFloatingIndicator();
      }
    });

    // ストレージの変更を監視
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.isEnabled) {
        this.isEnabled = changes.isEnabled.newValue;
        if (this.isEnabled) {
          this.setupEventListeners();
          this.createFloatingIndicator();
        } else {
          this.removeEventListeners();
          this.removeFloatingIndicator();
        }
      }
    });
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
      this.updateIndicator(`入力中... (${this.tapCount})`);
    } else {
      this.tapCount++;
      this.updateIndicator(`入力中... (${this.tapCount})`);
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
    
    // Firestoreに送信（実際の実装では適切なFirebase SDKを使用）
    await this.sendToFirestore(n);
    
    // 結果を表示
    const message = this.tapCount > 5 
      ? `結果: ${n} (${this.tapCount}回 → 5に丸め)`
      : `結果: ${n} (${this.tapCount}回)`;
    
    this.updateIndicator(message);
    
    // 3秒後に非表示
    setTimeout(() => {
      this.updateIndicator("待機中");
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
      }
    });
  }

  createFloatingIndicator() {
    if (document.getElementById('morse-tap-indicator')) return;

    const indicator = document.createElement('div');
    indicator.id = 'morse-tap-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(17, 24, 39, 0.95);
      border: 1px solid rgba(34, 211, 238, 0.5);
      border-radius: 12px;
      padding: 8px 12px;
      color: #22d3ee;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 12px;
      font-weight: 600;
      z-index: 999999;
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease;
      pointer-events: none;
    `;
    indicator.textContent = '待機中';
    document.body.appendChild(indicator);
  }

  updateIndicator(text) {
    const indicator = document.getElementById('morse-tap-indicator');
    if (indicator) {
      indicator.textContent = text;
      
      // アニメーション効果
      indicator.style.transform = 'scale(1.1)';
      setTimeout(() => {
        indicator.style.transform = 'scale(1)';
      }, 150);
    }
  }

  removeFloatingIndicator() {
    const indicator = document.getElementById('morse-tap-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
}

// 拡張機能を初期化
if (typeof window !== 'undefined') {
  const morseCounter = new MorseTapCounter();
}
