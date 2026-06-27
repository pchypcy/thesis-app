// utils/storage.js — synchronous mirror over AsyncStorage
//
// ทำไมต้องมี: โค้ดเดิม (web) เรียก localStorage.getItem/setItem แบบ "synchronous"
// เต็มไปหมด แต่ AsyncStorage บน RN เป็น async ล้วน ๆ — ถ้าแก้ทุกจุดให้ await
// จะกระทบ logic เกือบทุกหน้า
//
// วิธีแก้: hydrate ค่าทั้งหมดเข้า cache ใน memory ตอน boot (await ครั้งเดียวใน App.js)
// จากนั้นให้ getItem อ่านจาก cache (sync) และ setItem เขียน cache ทันที + sync ลง
// AsyncStorage แบบ fire-and-forget → API หน้าตาเหมือน localStorage เป๊ะ

import AsyncStorage from '@react-native-async-storage/async-storage';

const cache = {};
let hydrated = false;

export async function hydrateStorage() {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const entries = await AsyncStorage.multiGet(keys);
        entries.forEach(([k, v]) => { cache[k] = v; });
    } catch (e) {
        console.warn('[storage] hydrate failed:', e?.message);
    } finally {
        hydrated = true;
    }
}

export const isHydrated = () => hydrated;

export const storage = {
    getItem(key) {
        return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : null;
    },
    setItem(key, value) {
        const v = value == null ? '' : String(value);
        cache[key] = v;
        AsyncStorage.setItem(key, v).catch(() => {});
    },
    removeItem(key) {
        delete cache[key];
        AsyncStorage.removeItem(key).catch(() => {});
    },
    clear() {
        Object.keys(cache).forEach((k) => delete cache[k]);
        AsyncStorage.clear().catch(() => {});
    },
};

export default storage;
