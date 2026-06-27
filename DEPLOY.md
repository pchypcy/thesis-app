# คู่มือ Deploy InGreen (Stack จริง)

> สแต็กจริงต่างจากคู่มือต้นฉบับ (ที่เขียนสำหรับ Next.js + Supabase)
> ของจริงคือ: **Expo (React Native) + Express + MongoDB Atlas + Vite (admin)**

| ส่วน | เทคโนโลยี | Deploy ที่ไหน | ได้อะไร |
|---|---|---|---|
| Backend | Express + Mongoose | **Render** (free Web Service) | URL `https://...onrender.com` |
| Database | MongoDB Atlas | (มีอยู่แล้ว) | — |
| App | Expo / React Native | **Expo Go** (ผ่าน QR) | สแกนเปิดบนมือถือ |
| Admin | React + Vite | **Vercel** | เว็บไซต์ + URL |

ลำดับ: **Backend ก่อน** (เพราะ App/Admin ต้องรู้ URL ของมัน) → Admin → App

---

## 1) Backend → Render

1. push โฟลเดอร์ `ingreen-backend` ขึ้น GitHub (repo แยก หรือ subfolder)
2. ไป **render.com** → New → **Web Service** → เชื่อม repo
3. ตั้งค่า:
   - Root Directory: `ingreen-backend` (ถ้าเป็น subfolder)
   - Build Command: `npm install`
   - Start Command: `npm start`
4. **Environment** → ใส่ค่าตาม `ingreen-backend/.env.example`
   (อย่างน้อย `MONGO_URI`, `SMTP_*`) — ดูค่าจริงได้จากไฟล์ `.env` ในเครื่อง
5. MongoDB Atlas → **Network Access** → Add IP → `0.0.0.0/0` (ให้ Render เข้าได้)
6. Deploy → ได้ URL เช่น `https://ingreen-backend.onrender.com`
7. เช็ก: เปิด URL นั้นในเบราว์เซอร์ → ต้องเห็น `InGreen Backend is Running! 🌿`

> ⚠️ Render free tier จะ "หลับ" หลังไม่มี request ~15 นาที — request แรกหลังหลับจะช้า ~30 วิ
> (ก่อนวันทดสอบจริง ลองยิง URL ให้ตื่นก่อน)

---

## 2) Admin → Vercel

1. push `ingreen-admin` ขึ้น GitHub
2. ไป **vercel.com** → Add New → Project → import repo
3. Framework: **Vite** (auto), Root Directory: `ingreen-admin` (ถ้า subfolder)
4. **Environment Variables**: `VITE_API_BASE_URL = <URL backend จากข้อ 1>`
5. Deploy → ได้ URL เช่น `https://ingreen-admin.vercel.app`
   (`vercel.json` ใส่ SPA rewrites ให้แล้ว — refresh หน้าลึกไม่ 404)

---

## 3) App → Expo Go

1. แก้ไฟล์ `ingreen-expo/.env` (คัดลอกจาก `.env.example`):
   ```
   EXPO_PUBLIC_API_URL=https://ingreen-backend.onrender.com
   ```
2. ที่เครื่อง dev:
   ```
   cd ingreen-expo
   npx expo start            # หรือ --tunnel ถ้า WiFi คนละวง
   ```
3. ผู้ทดสอบลงแอป **Expo Go** (App Store / Play Store) → สแกน QR ที่ขึ้นใน terminal
4. ทดสอบ network ห้องแล็บล่วงหน้า 1 วัน (บาง WiFi บล็อก tunnel)

### ทดสอบในเครื่อง (LAN) ก่อน deploy backend
ตั้ง `EXPO_PUBLIC_API_URL=http://<IP เครื่อง>:5001` (อย่าใช้ localhost)
แล้วรัน backend (`cd ingreen-backend && npm run dev`) + `npx expo start`

---

## สถานะการพอร์ตหน้าจอ (Expo)
✅ พอร์ตครบทั้ง 23 หน้า + 11 components — bundle ผ่าน (Hermes 3.7MB):
Quiz, Login, Home, Scan (กล้อง expo-camera), Result, Dashboard, History, Rewards,
Profile, Settings, Support, NotificationInbox, NotificationSettings, ChangePassword,
ForgotPassword, ShopDetail, AddProduct (expo-image-picker), Community, ConfirmOrders,
PublicAudit, SugarTracker, AllergyProfile, ScanReceipt
