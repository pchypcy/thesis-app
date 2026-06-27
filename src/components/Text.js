// components/Text.js — Text/TextInput ที่แม็พ fontWeight → ไฟล์ฟอนต์ IBM Plex Sans Thai
//
// ★ FIX สระ/วรรณยุกต์ไทยโดนบัง:
//   RN ตัดสระบน/วรรณยุกต์ทิ้งถ้า lineHeight แคบเกินไป → บังคับ lineHeight ขั้นต่ำ ≈1.45× ของ fontSize
//   (ภาษาไทยมีอักขระซ้อน 2-3 ชั้น เช่น "ปิ่" "ตื้" ต้องการพื้นที่แนวตั้งมากกว่าภาษาอังกฤษ)
//   + เปิด includeFontPadding (Android) เพื่อกันตัดหัว/ท้าย
//
// วิธีใช้: ใน screen ให้ import { Text, TextInput } from '../components/Text'

import React from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';

const FAMILY = {
    '100': 'IBMPlexSansThai_400Regular',
    '200': 'IBMPlexSansThai_400Regular',
    '300': 'IBMPlexSansThai_400Regular',
    '400': 'IBMPlexSansThai_400Regular',
    '500': 'IBMPlexSansThai_500Medium',
    '600': 'IBMPlexSansThai_600SemiBold',
    '700': 'IBMPlexSansThai_700Bold',
    '800': 'IBMPlexSansThai_700Bold',
    '900': 'IBMPlexSansThai_700Bold',
    normal: 'IBMPlexSansThai_400Regular',
    bold: 'IBMPlexSansThai_700Bold',
};

// ratio ที่ปลอดภัยกับภาษาไทย (กันสระบน/วรรณยุกต์ เช่น "ที่" โดนตัด)
const THAI_LH = 1.6;

function familyFor(flat) {
    const w = flat.fontWeight != null ? String(flat.fontWeight) : '400';
    return FAMILY[w] || FAMILY['400'];
}

export function Text({ style, ...props }) {
    const flat = StyleSheet.flatten(style) || {};
    const fontSize = typeof flat.fontSize === 'number' ? flat.fontSize : 14;
    const minLH = Math.ceil(fontSize * THAI_LH);
    // ใช้ค่า lineHeight เดิมถ้ามันกว้างพอ ไม่งั้นบังคับขั้นต่ำ
    const lineHeight = (typeof flat.lineHeight === 'number' && flat.lineHeight >= minLH) ? flat.lineHeight : minLH;
    return (
        <RNText
            {...props}
            style={[style, { fontFamily: familyFor(flat), fontWeight: undefined, lineHeight, includeFontPadding: true }]}
        />
    );
}

export function TextInput({ style, ...props }) {
    const flat = StyleSheet.flatten(style) || {};
    // TextInput: ไม่บังคับ lineHeight (ทำให้ตัวอักษรเลื่อนใน input บน Android) — แค่ฟอนต์ + padding
    return (
        <RNTextInput
            {...props}
            style={[style, { fontFamily: familyFor(flat), fontWeight: undefined, includeFontPadding: true }]}
        />
    );
}

export default Text;
