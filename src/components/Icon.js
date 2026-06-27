// components/Icon.js — render ไอคอน iconify "ตัวจริง" (SVG เป๊ะเหมือนเว็บ)
//
// ★ ใช้ SVG จาก iconify (เก็บไว้ใน iconData.js) render ผ่าน react-native-svg
//   → ได้ไอคอนเหมือน @iconify/react บนเว็บทุกตัว (รวมโลโก้สีเต็ม เช่น logos:google-icon)
//
// ★ ห่อด้วย View เพื่อให้ style เช่น opacity / position:absolute / margin ทำงานถูกต้อง
//   (เช่นไอคอนจาง ๆ พื้นหลังการ์ด Home ที่ใช้ opacity 0.06 + position absolute)

import React, { useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ICON_DATA } from './iconData';

const ALIAS = {
    'lucide:clock-x': 'lucide:clock',
    'mdi:crown-off': 'mdi:crown-outline',
    'mdi:crown-off-outline': 'mdi:crown-outline',
    'mdi:thumb-up-down': 'lucide:thumbs-up',
};

function num(v) {
    if (v == null) return null;
    const n = parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
}

function IconBase({ icon, width, height, size, color, style }) {
    const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : (style || {});
    const resolvedSize = num(size) ?? num(width) ?? num(height) ?? num(flat.fontSize) ?? 24;
    const resolvedColor = color ?? flat.color ?? '#000';
    // เหลือไว้แต่ style เชิง layout (ตัด fontSize/color ที่ส่งผ่าน prop แล้ว)
    const { fontSize, color: _c, ...layout } = flat;

    const name = ICON_DATA[icon] ? icon : (ALIAS[icon] || icon);
    const data = ICON_DATA[name];

    const xml = useMemo(
        () => (data ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${data.w} ${data.h}">${data.body}</svg>` : null),
        [name]
    );

    return (
        <View style={[layout, { width: resolvedSize, height: resolvedSize }]} pointerEvents="none">
            {xml ? <SvgXml xml={xml} width={resolvedSize} height={resolvedSize} color={resolvedColor} /> : null}
        </View>
    );
}

export const Icon = React.memo(IconBase);
export default Icon;
