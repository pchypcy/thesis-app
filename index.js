import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

import App from './App';

// ── ปิด LogBox ──────────────────────────────────────────────────────────────
// ใน Expo Go (โหมด dev) ทุก console.error/warn จะเด้งเป็นกล่องแดง/เหลืองบนจอ
// ทำให้ผู้ทดสอบตกใจ ทั้งที่ error ทุกตัวถูก catch + มี fallback อยู่แล้ว
// (เช่น สแกนไม่เจอสินค้า → โชว์ "ไม่พบสินค้า", cold start → ลองใหม่)
LogBox.ignoreAllLogs(true);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
