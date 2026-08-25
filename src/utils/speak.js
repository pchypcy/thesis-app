// utils/speak.js — เสียงพูดผลลัพธ์ (Inclusive Design)
//
// ลำดับการทำงาน:
//   1) เรียก backend /api/tts → เสียง Neural (Gemini/Google) ฟังเป็นมนุษย์
//   2) ถ้าไม่มี/เรียกไม่สำเร็จ → ใช้ speechSynthesis ของเบราว์เซอร์
//
// ★ iOS Safari: การเล่นเสียงต้องเริ่ม "ภายใน user gesture" เท่านั้น
//   แต่เราต้อง await fetch ก่อน (เสีย gesture) → iOS จะบล็อกแบบเงียบ
//   วิธีแก้: ใช้ <audio> ตัวเดียวที่ถูก "ปลดล็อก" ด้วยไฟล์เงียบตอนแตะปุ่ม
//   (ก่อน await) แล้วนำ element เดิมกลับมาเล่นเสียงจริงทีหลัง — iOS ยอมเล่น
//
// ใช้ได้เฉพาะบนเว็บ/PWA (native ไม่มี window.speechSynthesis — ปุ่มถูกซ่อนอยู่แล้ว)

import { API_BASE_URL } from '../config';

let sharedAudio = null;    // <audio> ตัวเดียว reuse — ปลดล็อกครั้งเดียวใช้ได้ทั้ง session
let cancelled = false;

export function isSpeechSupported() {
    return typeof window !== 'undefined' &&
        (!!window.speechSynthesis || typeof Audio !== 'undefined');
}

function getSharedAudio() {
    if (!sharedAudio && typeof Audio !== 'undefined') sharedAudio = new Audio();
    return sharedAudio;
}

// สร้าง data-URI ของ WAV เงียบสั้นๆ (~0.02s) ไว้ "ปลดล็อก" เสียงบน iOS
let SILENT_URI = null;
function getSilentUri() {
    if (SILENT_URI) return SILENT_URI;
    try {
        const sr = 8000, n = 160, dataLen = n * 2;
        const buf = new ArrayBuffer(44 + dataLen);
        const dv = new DataView(buf);
        const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
        ws(0, 'RIFF'); dv.setUint32(4, 36 + dataLen, true); ws(8, 'WAVE'); ws(12, 'fmt ');
        dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
        dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
        ws(36, 'data'); dv.setUint32(40, dataLen, true); // ข้อมูลเป็นศูนย์ = เงียบ
        let bin = ''; const u8 = new Uint8Array(buf);
        for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
        SILENT_URI = 'data:audio/wav;base64,' + (typeof btoa !== 'undefined' ? btoa(bin) : '');
    } catch { SILENT_URI = ''; }
    return SILENT_URI;
}

// เลือกเสียงเบราว์เซอร์ที่เป็นธรรมชาติที่สุด (fallback)
function pickBestVoice(langCode) {
    try {
        const all = window.speechSynthesis.getVoices() || [];
        const prefix = langCode.slice(0, 2).toLowerCase();
        const byLang = all.filter((v) => v.lang && v.lang.toLowerCase().startsWith(prefix));
        if (!byLang.length) return null;
        return (
            byLang.find((v) => /google/i.test(v.name)) ||
            byLang.find((v) => /(neural|natural|premium|enhanced|online|siri)/i.test(v.name)) ||
            byLang.find((v) => v.localService === false) ||
            byLang[0]
        );
    } catch { return null; }
}

export function stopSpeech() {
    cancelled = true;
    try { if (sharedAudio) { sharedAudio.pause(); sharedAudio.currentTime = 0; } } catch {}
    try { if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel(); } catch {}
}

function browserSpeak(text, lang, onEnd, onError) {
    try {
        if (typeof window === 'undefined' || !window.speechSynthesis) { onError && onError(); onEnd && onEnd(); return; }
        const u = new window.SpeechSynthesisUtterance(text);
        u.lang = lang === 'TH' ? 'th-TH' : 'en-US';
        const v = pickBestVoice(u.lang);
        if (v) u.voice = v;
        u.rate = 1.0;
        u.pitch = 1.05;
        u.onend = () => onEnd && onEnd();
        u.onerror = () => { onError && onError(); onEnd && onEnd(); };
        window.speechSynthesis.speak(u);
    } catch { onError && onError(); onEnd && onEnd(); }
}

/**
 * speak(text, { lang, onEnd, onError })
 *   ต้องเรียกจาก user gesture (onPress) — ส่วนก่อน await จะปลดล็อกเสียงให้ iOS
 */
export async function speak(text, { lang = 'TH', onEnd, onError } = {}) {
    stopSpeech();
    cancelled = false;
    const clean = String(text || '').trim();
    if (!clean) { onEnd && onEnd(); return { engine: 'none' }; }

    // ★ ปลดล็อกเสียง iOS ภายใน gesture นี้ (ก่อน await) ด้วยไฟล์เงียบ
    const audio = getSharedAudio();
    if (audio) {
        try { audio.src = getSilentUri(); const p = audio.play(); if (p && p.catch) p.catch(() => {}); } catch {}
    }

    // 1) ลองเสียง Neural จาก backend
    try {
        if (API_BASE_URL && audio) {
            const res = await fetch(`${API_BASE_URL}/api/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ text: clean, lang }),
            });
            const data = await res.json().catch(() => null);
            if (cancelled) return { engine: 'cancelled' };
            if (data && data.success && data.audioContent) {
                audio.onended = () => { onEnd && onEnd(); };
                audio.onerror = () => { browserSpeak(clean, lang, onEnd, onError); };
                audio.src = `data:${data.mime || 'audio/mpeg'};base64,${data.audioContent}`;
                try {
                    await audio.play();          // element ปลดล็อกแล้ว → iOS ยอมเล่น
                    return { engine: 'cloud', voice: data.voice };
                } catch (e) {
                    browserSpeak(clean, lang, onEnd, onError);
                    return { engine: 'browser' };
                }
            }
        }
    } catch { /* ตกไป fallback */ }

    // 2) fallback เสียงเบราว์เซอร์
    if (cancelled) return { engine: 'cancelled' };
    browserSpeak(clean, lang, onEnd, onError);
    return { engine: 'browser' };
}
