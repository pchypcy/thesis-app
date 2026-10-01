// components/GoogleSignInButton.web.js — ปุ่ม "ดำเนินการต่อด้วย Google" ของจริง (เว็บ/PWA)
//
// ใช้ Google Identity Services (GIS): Google วาดปุ่มและเปิดหน้าต่างเลือกบัญชีเอง
// ผู้ใช้เลือกบัญชีแล้วจะได้ ID token (credential) → ส่งให้ backend /api/users/google ตรวจลายเซ็น
//
// ต้องตั้ง EXPO_PUBLIC_GOOGLE_CLIENT_ID ใน .env (Client ID แบบ "Web application") ก่อน export
// และใน Google Cloud ต้องใส่โดเมนของแอปไว้ใน "Authorized JavaScript origins"

import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
export const isGoogleSignInAvailable = !!CLIENT_ID;

let gisPromise = null;
function loadGis() {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (!gisPromise) {
        gisPromise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://accounts.google.com/gsi/client';
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => { gisPromise = null; reject(new Error('gis_load_failed')); };
            document.head.appendChild(s);
        });
    }
    return gisPromise;
}

// GIS ควร initialize ครั้งเดียวต่อหน้า → callback เรียกผ่าน handler ล่าสุดของปุ่มที่แสดงอยู่
let initialized = false;
let currentHandler = null;

export default function GoogleSignInButton({ onCredential, onError, disabled = false, locale = 'th' }) {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(0);

    useEffect(() => { currentHandler = onCredential; }, [onCredential]);

    useEffect(() => {
        if (!CLIENT_ID || !width) return undefined;
        let cancelled = false;
        loadGis()
            .then(() => {
                if (cancelled || !containerRef.current) return;
                const gid = window.google.accounts.id;
                if (!initialized) {
                    gid.initialize({
                        client_id: CLIENT_ID,
                        callback: (resp) => currentHandler && currentHandler(resp.credential),
                        ux_mode: 'popup',
                        auto_select: false,
                        cancel_on_tap_outside: true,
                    });
                    initialized = true;
                }
                containerRef.current.innerHTML = '';
                gid.renderButton(containerRef.current, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    shape: 'pill',
                    text: 'continue_with',
                    logo_alignment: 'center',
                    width: Math.max(200, Math.min(400, Math.floor(width))),   // GIS รองรับ 200–400px
                    locale,
                });
            })
            .catch((e) => onError && onError(e));
        return () => { cancelled = true; };
    }, [width, locale]);

    if (!CLIENT_ID) return null;
    return (
        <View
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            style={{ width: '100%', alignItems: 'center', minHeight: 44, opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
        >
            <View ref={containerRef} />
        </View>
    );
}
