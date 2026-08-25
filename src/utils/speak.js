// utils/speak.js — เสียงพูดผลลัพธ์ (Inclusive Design)
//
// ลำดับการทำงาน:
//   1) เรียก backend /api/tts → เสียง Neural ของ Google (ฟังเป็นมนุษย์)
//   2) ถ้าไม่มี key / เรียกไม่สำเร็จ → ใช้ speechSynthesis ของเบราว์เซอร์
//      โดยเลือก "เสียงที่ดีที่สุด" ที่เครื่องมี (Google / Neural / เสียงออนไลน์)
//
// ใช้ได้เฉพาะบนเว็บ/PWA (native ไม่มี window.speechSynthesis — ปุ่มจะถูกซ่อนอยู่แล้ว)

import { API_BASE_URL } from '../config';

let currentAudio = null;   // HTMLAudioElement ของเสียง cloud
let cancelled = false;     // กันเสียงเก่าที่โหลดค้างมาเล่นทับ

export function isSpeechSupported() {
    return typeof window !== 'undefined' &&
        (!!window.speechSynthesis || typeof Audio !== 'undefined');
}

// เลือกเสียงเบราว์เซอร์ที่เป็นธรรมชาติที่สุดสำหรับภาษานั้น
function pickBestVoice(langCode) {
    try {
        const all = window.speechSynthesis.getVoices() || [];
        const prefix = langCode.slice(0, 2).toLowerCase();
        const byLang = all.filter((v) => v.lang && v.lang.toLowerCase().startsWith(prefix));
        if (!byLang.length) return null;
        return (
            byLang.find((v) => /google/i.test(v.name)) ||
            byLang.find((v) => /(neural|natural|premium|enhanced|online)/i.test(v.name)) ||
            byLang.find((v) => v.localService === false) ||   // เสียงออนไลน์มักคุณภาพดีกว่า
            byLang[0]
        );
    } catch { return null; }
}

export function stopSpeech() {
    cancelled = true;
    try { if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; } } catch {}
    currentAudio = null;
    try { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); } catch {}
}

// เสียงเบราว์เซอร์ (fallback)
function browserSpeak(text, lang, onEnd, onError) {
    try {
        if (typeof window === 'undefined' || !window.speechSynthesis) { onError && onError(); onEnd && onEnd(); return; }
        const u = new window.SpeechSynthesisUtterance(text);
        u.lang = lang === 'TH' ? 'th-TH' : 'en-US';
        const v = pickBestVoice(u.lang);
        if (v) u.voice = v;
        u.rate = 1.0;
        u.pitch = 1.05;   // อุ่นขึ้นเล็กน้อย ฟังเป็นมิตร
        u.onend = () => onEnd && onEnd();
        u.onerror = () => { onError && onError(); onEnd && onEnd(); };
        window.speechSynthesis.speak(u);
    } catch { onError && onError(); onEnd && onEnd(); }
}

/**
 * speak(text, { lang, onEnd, onError })
 *   - เริ่มเล่นเสียงทันทีที่พร้อม, เรียก onEnd เมื่อพูดจบ (หรือ fallback จบ)
 *   - ต้องเรียกจาก user gesture (เช่น onPress) เพื่อให้ autoplay ผ่าน
 */
export async function speak(text, { lang = 'TH', onEnd, onError } = {}) {
    stopSpeech();
    cancelled = false;
    const clean = String(text || '').trim();
    if (!clean) { onEnd && onEnd(); return { engine: 'none' }; }

    // 1) ลองเสียง Neural จาก backend ก่อน
    try {
        if (API_BASE_URL) {
            const res = await fetch(`${API_BASE_URL}/api/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ text: clean, lang }),
            });
            const data = await res.json().catch(() => null);
            if (cancelled) return { engine: 'cancelled' };
            if (data && data.success && data.audioContent) {
                const audio = new Audio(`data:${data.mime || 'audio/mpeg'};base64,${data.audioContent}`);
                currentAudio = audio;
                audio.onended = () => { currentAudio = null; onEnd && onEnd(); };
                audio.onerror = () => { currentAudio = null; browserSpeak(clean, lang, onEnd, onError); };
                await audio.play();
                return { engine: 'cloud', voice: data.voice };
            }
        }
    } catch { /* เงียบไว้ แล้วตกไป fallback */ }

    // 2) fallback เสียงเบราว์เซอร์
    if (cancelled) return { engine: 'cancelled' };
    browserSpeak(clean, lang, onEnd, onError);
    return { engine: 'browser' };
}
