// config.js — InGreen (Expo / React Native)
//
// ★ Native ไม่มี Vite dev-proxy แล้ว — ต้องชี้ตรงไปที่ backend ที่ deploy จริง
//   ตั้งค่าได้ 2 ทาง (เรียงตามลำดับความสำคัญ):
//     1) ไฟล์ .env  →  EXPO_PUBLIC_API_URL=https://your-backend.onrender.com
//     2) แก้ DEFAULT_API_URL ด้านล่างตรง ๆ
//
//   ระหว่าง dev บน LAN: ใช้ IP เครื่องที่รัน backend เช่น http://192.168.1.50:5001
//   (อย่าใช้ localhost — บนมือถือ localhost = ตัวมือถือเอง)

const DEFAULT_API_URL = ''; // เว้นว่างไว้ก่อน — ใส่ผ่าน .env (EXPO_PUBLIC_API_URL)

export const API_BASE_URL =
    (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/$/, '');

if (!API_BASE_URL) {
    // ไม่ throw — แค่เตือน เพื่อให้ scaffold รันได้ก่อนตั้งค่า backend
    console.warn(
        '[InGreen] API_BASE_URL ยังว่างอยู่ — ตั้งค่า EXPO_PUBLIC_API_URL ใน .env ' +
        'ก่อน ไม่งั้น request /api ทั้งหมดจะ fail'
    );
}
