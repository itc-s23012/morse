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
    console.log('MorseTapCounter: 初期化開始', window.location.href);
    
    // サイト情報をログ出力
    this.logSiteInfo();
    
    // 拡張機能の有効/無効状態を取得
    chrome.storage.sync.get(['isEnabled'], (result) => {
      this.isEnabled = result.isEnabled || false;
      console.log('MorseTapCounter: 有効状態:', this.isEnabled);
      
      if (this.isEnabled) {
        this.setupEventListeners();
        this.createFloatingIndicator();
      }
    });

    // ストレージの変更を監視
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.isEnabled) {
        this.isEnabled = changes.isEnabled.newValue;
        console.log('MorseTapCounter: 状態変更:', this.isEnabled);
        
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

  logSiteInfo() {
    console.log('MorseTapCounter: サイト情報');
    console.log('- URL:', window.location.href);
    console.log('- Domain:', window.location.hostname);
    console.log('- Protocol:', window.location.protocol);
    console.log('- Frame:', window.self === window.top ? 'メインフレーム' : 'iframe');
    console.log('- CSP:', document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || 'なし');
    console.log('- Ready State:', document.readyState);
    console.log('- Body exists:', !!document.body);
  }

  setupEventListeners() {
    console.log('MorseTapCounter: イベントリスナー設定');
    
    // 既存のリスナーを削除してから追加
    this.removeEventListeners();
    
    document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
    document.addEventListener('click', this.handleClick.bind(this), true);
    
    console.log('MorseTapCounter: イベントリスナー設定完了');
  }

  removeEventListeners() {
    console.log('MorseTapCounter: イベントリスナー削除');
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
    console.log('MorseTapCounter: タップ登録', source, this.tapCount + 1);
    
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
    console.log('MorseTapCounter: 確定処理開始', this.tapCount);
    
    if (this.timerRef) clearTimeout(this.timerRef);
    this.timerRef = null;

    if (this.tapCount === 0) return;
    
    const n = Math.min(this.tapCount, 5);
    
    console.log('MorseTapCounter: 結果', n, '元のタップ数', this.tapCount);
    
    // Firestoreに送信（実際の実装では適切なFirebase SDKを使用）
    await this.sendToFirestore(n);
    
    // 結果を表示
    const message = this.tapCount > 5 
      ? `結果: ${n} (${this.tapCount}回 → 5に丸め)`
      : `結果: ${n} (${this.tapCount}回)`;
    
    this.updateIndicator(message);
    
    // トースト通知を表示
    this.showResultToast(n, this.tapCount);
    
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
      },
      originalCount: this.tapCount,
      showNotification: true // 常にシステム通知を表示
    });
  }

  createFloatingIndicator() {
    if (document.getElementById('morse-tap-indicator')) return;
    
    console.log('MorseTapCounter: フローティングインジケーター作成');

    try {
      // bodyが存在しない場合は待機
      if (!document.body) {
        console.log('MorseTapCounter: body未準備、待機中');
        setTimeout(() => this.createFloatingIndicator(), 100);
        return;
      }

      const indicator = document.createElement('div');
      indicator.id = 'morse-tap-indicator';
      indicator.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        background: rgba(17, 24, 39, 0.95) !important;
        border: 1px solid rgba(34, 211, 238, 0.5) !important;
        border-radius: 12px !important;
        padding: 8px 12px !important;
        color: #22d3ee !important;
        font-family: ui-sans-serif, system-ui, sans-serif !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        z-index: 2147483646 !important;
        backdrop-filter: blur(10px) !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
        transition: all 0.3s ease !important;
        pointer-events: none !important;
      `;
      indicator.textContent = '待機中';
      
      const container = document.body || document.documentElement;
      container.appendChild(indicator);
      
      console.log('MorseTapCounter: フローティングインジケーター作成成功');
    } catch (error) {
      console.error('MorseTapCounter: フローティングインジケーター作成エラー:', error);
    }
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

  ensureToastStyles() {
    if (document.getElementById('morse-toast-style')) return;
    
    try {
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
      
      // headまたはhtmlに追加（フォールバック）
      const container = document.head || document.documentElement;
      container.appendChild(style);
      
      console.log('MorseTapCounter: スタイル追加成功');
    } catch (error) {
      console.error('MorseTapCounter: スタイル追加エラー:', error);
    }
  }

  showResultToast(result, originalCount) {
    console.log('MorseTapCounter: トースト表示開始', result, originalCount);
    
    try {
      // 既存のトーストがあれば削除
      const existingToast = document.getElementById('morse-result-toast');
      if (existingToast) {
        existingToast.remove();
      }

      // bodyが存在しない場合は待機
      if (!document.body) {
        console.log('MorseTapCounter: body未準備、DOMContentLoaded待機');
        document.addEventListener('DOMContentLoaded', () => {
          this.showResultToast(result, originalCount);
        }, { once: true });
        return;
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
        z-index: 2147483647 !important;
        box-shadow: 0 20px 40px rgba(34, 211, 238, 0.4) !important;
        backdrop-filter: blur(10px) !important;
        border: 2px solid rgba(255, 255, 255, 0.2) !important;
        text-align: center !important;
        min-width: 200px !important;
        pointer-events: none !important;
        animation: morseToastSlide 0.5s ease-out forwards !important;
      `;

      // 安全にスタイルを追加
      this.ensureToastStyles();

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
      
      // bodyまたはhtmlに追加（フォールバック）
      const container = document.body || document.documentElement;
      container.appendChild(toast);
      
      console.log('MorseTapCounter: トースト表示成功');

      // 3秒後にフェードアウト
      setTimeout(() => {
        try {
          toast.style.animation = 'morseToastFadeOut 0.3s ease-out forwards !important';
          setTimeout(() => {
            if (toast.parentNode) {
              toast.remove();
            }
          }, 300);
        } catch (error) {
          console.error('MorseTapCounter: トースト削除エラー:', error);
        }
      }, 3000);
      
    } catch (error) {
      console.error('MorseTapCounter: トースト表示エラー:', error);
    }
  }
}

// 拡張機能を初期化
if (typeof window !== 'undefined') {
  const morseCounter = new MorseTapCounter();
}
