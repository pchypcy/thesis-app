import React, { useRef, useEffect, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

// สแกนบาร์โค้ดบนเว็บด้วย ZXing (getUserMedia) — ใช้แทน expo-camera ที่ไม่รองรับสแกนบนเว็บ
// คืน <video> ของกล้องหลัง + เรียก onScanned(code) เมื่ออ่านบาร์โค้ดได้
export default function WebScanner({ onScanned }) {
    const videoRef = useRef(null);
    const cbRef = useRef(onScanned);
    cbRef.current = onScanned;
    const lastRef = useRef({ code: '', t: 0 });
    const [err, setErr] = useState('');

    useEffect(() => {
        const reader = new BrowserMultiFormatReader();
        let controls;
        let cancelled = false;
        reader
            .decodeFromConstraints(
                { video: { facingMode: { ideal: 'environment' } } }, // กล้องหลัง
                videoRef.current,
                (result) => {
                    if (!result) return;
                    const code = result.getText();
                    const now = Date.now();
                    // กันอ่านซ้ำรัวๆ ของบาร์โค้ดเดิม
                    if (code === lastRef.current.code && now - lastRef.current.t < 2500) return;
                    lastRef.current = { code, t: now };
                    cbRef.current?.(code);
                },
            )
            .then((c) => { controls = c; if (cancelled) c.stop(); })
            .catch((e) => setErr(e?.message || 'ไม่สามารถเปิดกล้องได้'));
        return () => { cancelled = true; try { controls?.stop(); } catch {} };
    }, []);

    return (
        <>
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
            />
            {err ? (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', padding: 24, fontWeight: 600, lineHeight: 1.6 }}>
                    เปิดกล้องไม่ได้: {err}<br />กรุณาอนุญาตสิทธิ์กล้องในเบราว์เซอร์ แล้วรีเฟรช
                </div>
            ) : null}
        </>
    );
}
