// components/GoogleSignInButton.js — native (iOS/Android)
//
// Sign in with Google บน native ต้องใช้ Client ID แยกของ iOS/Android + ตั้งค่าใน app.json
// ตอนนี้แอปใช้งานผ่านเว็บ/PWA เป็นหลัก จึงซ่อนปุ่มบน native ไว้ก่อน
// (ของจริงฝั่งเว็บอยู่ที่ GoogleSignInButton.web.js)

export const isGoogleSignInAvailable = false;

export default function GoogleSignInButton() {
    return null;
}
