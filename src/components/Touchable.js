import React from 'react';
import { Pressable as RNPressable } from 'react-native';

// Pressable ที่มี feedback ตอนกด — หรี่ลงเล็กน้อย (iOS) + ripple (Android)
// ใช้แทน Pressable ของ react-native ได้ทันที (drop-in) เพื่อให้ทั้งแอปกดแล้วลื่นขึ้น ไม่ดูแข็ง
export function Pressable({ style, android_ripple, ...rest }) {
    return (
        <RNPressable
            android_ripple={android_ripple ?? { color: 'rgba(0,0,0,0.06)' }}
            style={(state) => {
                const base = typeof style === 'function' ? style(state) : style;
                return [base, state.pressed && { opacity: 0.6 }];
            }}
            {...rest}
        />
    );
}

export default Pressable;
