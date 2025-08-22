"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { db } from "../lib/firebase";
import { collection, addDoc, onSnapshot, serverTimestamp, getDocs, deleteDoc, Timestamp } from "firebase/firestore";

export default function Home() {
  const [tapCount, setTapCount] = useState(0);
  const [signals, setSignals] = useState<{id: string, value: number, createdAt: Timestamp | null, userId?: string}[]>([]);
  const [windowMs, setWindowMs] = useState(700);
  const [keyValue, setKeyValue] = useState(" ");
  const [status, setStatus] = useState("待機中");
  const [remainMs, setRemainMs] = useState(0);
  const [progress, setProgress] = useState(0);
  const [overflowMsg, setOverflowMsg] = useState("");
  const [overflowKind, setOverflowKind] = useState("");
  const [outputNumber, setOutputNumber] = useState("–");
  const [userId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [extensionUsers, setExtensionUsers] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTsRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  // Firestore からリアルタイムでデータ取得
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "signals"),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          value: doc.data().value as number,
          createdAt: doc.data().createdAt,
          userId: doc.data().userId,
        }));
        // 最新順にソート
        data.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        });
        setSignals(data);
        
        // 過去5分以内のユニークユーザー数を計算
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const recentSignals = data.filter(signal => 
          signal.createdAt && signal.createdAt.toMillis() > fiveMinutesAgo
        );
        
        const activeUsers = new Set(
          recentSignals
            .map(signal => signal.userId)
            .filter(Boolean)
        );
        setOnlineUsers(activeUsers.size);
        
        // 拡張機能ユーザーを識別（userIdが9文字のランダム文字列の場合）
        const extensionUserIds = new Set(
          recentSignals
            .filter(signal => signal.userId && signal.userId.length === 9 && /^[a-z0-9]+$/.test(signal.userId))
            .map(signal => signal.userId)
        );
        setExtensionUsers(extensionUserIds.size);
      }
    );
    return () => unsubscribe();
  }, []);

  // Firestore に送信
  const sendSignal = useCallback(async (value: number) => {
    await addDoc(collection(db, "signals"), {
      value,
      userId,
      createdAt: serverTimestamp(),
    });
  }, [userId]);

  const beginWindow = useCallback(() => {
    if (!startTsRef.current) startTsRef.current = Date.now();
    const endTs = startTsRef.current + windowMs;
    
    const tick = () => {
      const now = Date.now();
      const remain = Math.max(0, endTs - now);
      const prog = Math.min(1, (now - startTsRef.current) / windowMs);
      setProgress(prog * 100);
      setRemainMs(remain);
      
      if (remain <= 0) return;
      animationRef.current = requestAnimationFrame(tick);
    };
    
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(tick);
  }, [windowMs]);

  const finalize = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    timerRef.current = null;
    startTsRef.current = 0;
    setProgress(0);
    setRemainMs(0);

    if (tapCount === 0) return;
    
    const n = Math.min(tapCount, 5);
    setOutputNumber(n.toString());
    
    // Firestore に送信
    await sendSignal(n);
    
    if (tapCount > 5) {
      setOverflowMsg(`⚠ 6回以上は「5」に丸めました（実際: ${tapCount}回）`);
      setOverflowKind("warn");
    } else {
      setOverflowMsg(`OK（${tapCount}回）`);
      setOverflowKind("ok");
    }
    
    setStatus("待機中");
    setTapCount(0);
  }, [tapCount, sendSignal]);

  const scheduleFinalize = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(finalize, windowMs);
    beginWindow();
  }, [windowMs, finalize, beginWindow]);

  const registerTap = useCallback((source: string = "tap") => {
    if (!timerRef.current) {
      // new burst
      setTapCount(1);
      startTsRef.current = Date.now();
      setOverflowMsg("");
      setStatus(source === "key" ? "キー入力中…" : "タップ入力中…");
    } else {
      setTapCount(prev => prev + 1);
    }
    scheduleFinalize();
  }, [scheduleFinalize]);

  // キー入力を検知
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const hit = keyValue === " " 
        ? e.key === " " || e.code === "Space" 
        : e.key.toLowerCase() === keyValue.toLowerCase();
      
      if (hit) {
        e.preventDefault();
        registerTap("key");
      }
    };

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyValue, registerTap]);

  const clearHistory = () => {
    setOutputNumber("–");
    setOverflowMsg("");
  };

  const clearSharedHistory = async () => {
    if (confirm("全ユーザーの共有履歴をクリアしますか？この操作は元に戻せません。")) {
      try {
        // 全てのsignalsドキュメントを削除
        const snapshot = await getDocs(collection(db, "signals"));
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        setSignals([]);
      } catch (error) {
        console.error("履歴削除エラー:", error);
      }
    }
  };

  const getKeyDisplay = () => {
    return keyValue === " " ? "Space" : keyValue.toUpperCase();
  };

  return (
    <div style={{
      margin: 0,
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      background: `radial-gradient(1200px 600px at 70% -10%, rgba(34,211,238,0.18), transparent),
                   radial-gradient(1200px 600px at -20% 110%, rgba(96,165,250,0.18), transparent),
                   #0f172a`,
      color: '#e5e7eb',
      display: 'grid',
      placeItems: 'center',
      padding: '24px',
      minHeight: '100vh'
    }}>
      <div style={{ width: '100%', maxWidth: '920px' }}>
        <div style={{
          background: 'rgba(17,24,39,0.7)',
          border: '1px solid rgba(148,163,184,0.15)',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(148,163,184,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: '1 1 300px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.2px' }}>
                モールス風タップ → 1〜5 変換
              </div>
              <div style={{ color: '#9ca3af', fontSize: '13px' }}>
                一定時間内に同じキーを連打すると、連打数を 1〜5 の数字として出力します。
              </div>
              <div style={{ color: '#60a5fa', fontSize: '12px', marginTop: '4px' }}>
                💡 <a 
                  href="/extension" 
                  style={{ color: '#60a5fa', textDecoration: 'underline' }}
                  onClick={(e) => {
                    e.preventDefault();
                    window.open('https://github.com/itc-s23012/morse/tree/shared-extension/extension', '_blank');
                  }}
                >
                  ブラウザ拡張機能版
                </a>もあります（どのサイトでも使用可能）
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{
                fontSize: '12px',
                padding: '6px 10px',
                border: '1px solid rgba(148,163,184,0.25)',
                borderRadius: '999px',
                background: 'rgba(2,6,23,0.45)',
                color: overflowKind === 'ok' ? '#34d399' : overflowKind === 'warn' ? '#f87171' : '#9ca3af'
              }}>
                {status}
              </div>
              <div style={{
                fontSize: '12px',
                padding: '6px 10px',
                border: '1px solid rgba(34,211,238,0.25)',
                borderRadius: '999px',
                background: 'rgba(34,211,238,0.1)',
                color: '#22d3ee'
              }}>
                🟢 {onlineUsers} 人オンライン
              </div>
              {extensionUsers > 0 && (
                <div style={{
                  fontSize: '12px',
                  padding: '6px 10px',
                  border: '1px solid rgba(96,165,250,0.25)',
                  borderRadius: '999px',
                  background: 'rgba(96,165,250,0.1)',
                  color: '#60a5fa'
                }}>
                  🔧 {extensionUsers} 拡張機能
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr',
            gap: '16px',
            padding: '16px'
          }}>
            {/* Left Panel */}
            <section style={{
              background: 'rgba(2,6,23,0.6)',
              border: '1px solid rgba(148,163,184,0.12)',
              borderRadius: '16px',
              padding: '16px',
              display: 'grid',
              gap: '12px',
              alignItems: 'start'
            }}>
              <div style={{ color: '#9ca3af', fontSize: '13px' }}>入力</div>
              
              <button 
                onClick={() => registerTap("tap")}
                style={{
                  cursor: 'pointer',
                  border: '1px solid rgba(148,163,184,0.25)',
                  background: 'linear-gradient(180deg, rgba(34,211,238,0.12), rgba(96,165,250,0.08))',
                  color: '#e5e7eb',
                  padding: '26px',
                  borderRadius: '18px',
                  fontSize: '22px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  transition: 'transform 0.05s ease, box-shadow 0.2s ease, background 0.3s ease',
                  boxShadow: '0 10px 30px rgba(2,132,199,0.2)',
                  width: '100%'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translateY(1px) scale(0.997)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                <div>ここをタップ / キー入力</div>
                <div style={{ color: '#9ca3af', fontSize: '13px', marginTop: '6px' }}>
                  使用キー: <span style={{
                    display: 'inline-grid',
                    placeItems: 'center',
                    minWidth: '26px',
                    padding: '4px 8px',
                    borderRadius: '10px',
                    border: '1px solid rgba(148,163,184,0.35)',
                    background: 'rgba(2,6,23,0.5)',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontWeight: 700
                  }}>
                    {getKeyDisplay()}
                  </span>（スペース）
                </div>
              </button>

              {/* Progress Bar */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  flex: '1 1 auto',
                  height: '10px',
                  background: 'rgba(148,163,184,0.15)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  border: '1px solid rgba(148,163,184,0.25)'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #22d3ee, #60a5fa)',
                    transition: 'width 0.08s linear'
                  }} />
                </div>
                <div style={{
                  fontSize: '12px',
                  padding: '6px 10px',
                  border: '1px solid rgba(148,163,184,0.25)',
                  borderRadius: '999px',
                  background: 'rgba(2,6,23,0.45)'
                }}>
                  {Math.round(remainMs)}ms
                </div>
              </div>

              {/* Output */}
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{
                  fontSize: '92px',
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: '-2px',
                  textAlign: 'center',
                  background: 'linear-gradient(180deg, #fff, #c7d2fe)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  filter: 'drop-shadow(0 6px 20px rgba(96,165,250,0.25))'
                }}>
                  {outputNumber}
                </div>
                <div style={{ textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>
                  連打が止まると結果を確定します（1〜5）。
                </div>
                {/* デバッグ用：現在のタップ数を表示 */}
                {tapCount > 0 && (
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '4px 8px', borderRadius: '8px' }}>
                    現在のタップ数: {tapCount}
                  </div>
                )}
              </div>
            </section>

            {/* Right Panel */}
            <section style={{
              background: 'rgba(2,6,23,0.6)',
              border: '1px solid rgba(148,163,184,0.12)',
              borderRadius: '16px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ flex: '1 1 auto', fontSize: '13px', color: '#9ca3af' }}>
                  検出待ち時間（ms）
                  <input 
                    type="number" 
                    min="150" 
                    max="2000" 
                    step="50" 
                    value={windowMs}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 150) {
                        setWindowMs(Math.min(2000, Math.max(150, Math.round(v))));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.6)',
                      color: '#e5e7eb',
                      marginTop: '4px'
                    }}
                  />
                </label>
                <label style={{ width: '160px', fontSize: '13px', color: '#9ca3af' }}>
                  対象キー
                  <select 
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.6)',
                      color: '#e5e7eb',
                      marginTop: '4px'
                    }}
                  >
                    <option value=" ">Space（スペース）</option>
                    <option value="Enter">Enter</option>
                    <option value=".">.</option>
                    <option value=",">,</option>
                    <option value="a">A</option>
                    <option value="j">J</option>
                    <option value="k">K</option>
                    <option value="l">L</option>
                  </select>
                </label>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
                <button 
                  onClick={clearHistory}
                  style={{
                    cursor: 'pointer',
                    border: '1px solid rgba(148,163,184,0.25)',
                    background: 'linear-gradient(180deg, rgba(34,211,238,0.12), rgba(96,165,250,0.08))',
                    color: '#e5e7eb',
                    padding: '12px 16px',
                    borderRadius: '18px',
                    fontSize: '14px',
                    fontWeight: 700,
                    transition: 'transform 0.05s ease, box-shadow 0.2s ease, background 0.3s ease',
                    boxShadow: '0 10px 30px rgba(2,132,199,0.2)'
                  }}
                >
                  ローカル履歴クリア
                </button>
                <button 
                  onClick={clearSharedHistory}
                  style={{
                    cursor: 'pointer',
                    border: '1px solid rgba(248,113,113,0.25)',
                    background: 'linear-gradient(180deg, rgba(248,113,113,0.12), rgba(239,68,68,0.08))',
                    color: '#f87171',
                    padding: '12px 16px',
                    borderRadius: '18px',
                    fontSize: '14px',
                    fontWeight: 700,
                    transition: 'transform 0.05s ease, box-shadow 0.2s ease, background 0.3s ease',
                    boxShadow: '0 10px 30px rgba(248,113,113,0.2)'
                  }}
                >
                  全履歴クリア
                </button>
                <div style={{
                  fontSize: '13px',
                  color: overflowKind === 'ok' ? '#34d399' : overflowKind === 'warn' ? '#f87171' : '#9ca3af',
                  flex: '1 1 auto'
                }}>
                  {overflowMsg}
                </div>
              </div>
              
              <div style={{ marginTop: '12px', color: '#9ca3af', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>リアルタイム履歴（全ユーザー）</span>
                <span style={{ fontSize: '11px', color: '#60a5fa' }}>🔵=自分 ⚪=他人</span>
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                maxHeight: '260px',
                overflow: 'auto',
                marginTop: '8px',
                padding: '4px'
              }}>
                {signals.slice(0, 20).map((signal, index) => (
                  <div 
                    key={signal.id} 
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      animation: index < 3 ? 'pulse 1s ease-in-out' : 'none'
                    }}
                  >
                    <div style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      border: `2px solid ${signal.userId === userId ? 'rgba(34,211,238,0.7)' : 'rgba(148,163,184,0.4)'}`,
                      background: signal.userId === userId ? 'rgba(34,211,238,0.15)' : 'rgba(2,6,23,0.8)',
                      fontWeight: 800,
                      fontSize: '16px',
                      position: 'relative',
                      boxShadow: signal.userId === userId ? '0 0 10px rgba(34,211,238,0.3)' : 'none'
                    }}
                    title={`${signal.userId === userId ? '👤 あなた' : '👥 他のユーザー'}の入力: ${signal.value}`}
                  >
                    {signal.value}
                    {signal.userId === userId && (
                      <div style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#22d3ee',
                        border: '2px solid white',
                        fontSize: '8px',
                        display: 'grid',
                        placeItems: 'center'
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: signal.userId === userId ? '#22d3ee' : '#9ca3af',
                    marginTop: '2px',
                    textAlign: 'center'
                  }}>
                    {signal.userId === userId ? '自分' : '他人'}
                  </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
