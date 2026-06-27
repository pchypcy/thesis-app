// utils/theme.js — InGreen Brand Theme (ported to RN)
// คงค่าสีเดิมจาก web ทุกตัว — เพิ่ม "gradients" เป็น array สำหรับ expo-linear-gradient
// (RN ไม่รองรับ CSS linear-gradient ใน style ต้องใช้ <LinearGradient colors={[...]} />)

export const theme = {
    // ── core brand ──
    primary:        '#2D8048',
    primaryDark:    '#1B5E37',
    primaryLight:   '#5BA37A',
    primaryGlow:    'rgba(46,125,79,0.18)',

    // ── accent ──
    accent:         '#D5EE7A',
    accentSoft:     '#DCE89A',
    accentLeaf:     '#B6D26B',

    // ── surfaces ──
    surface:        '#F6FAEC',
    surfaceMuted:   '#FAFCF5',
    surfaceSoft:    '#EDF6E1',

    // ── alert palette ──
    danger:         '#D14545',
    warn:           '#E89938',
    safe:           '#2D8048',

    // ── text ──
    textBase:       '#1B1B1B',
    textMute:       '#777',
    textHint:       '#A5A5A5',

    // ── gradients (colors array สำหรับ LinearGradient) ──
    gradients: {
        limeWhite:  ['#F4FDC6', '#FFFFFF'],   // พื้นหลัง Quiz / Login (180deg)
        homeHeader: ['#D5EE7A', '#FFFFFF'],   // พื้นหลัง Home (180deg, จบที่ 35%)
        primary:    ['#2D8048', '#1B5E37'],
        soft:       ['#F6FAEC', '#D5EE7A'],
        danger:     ['#D14545', '#B71C1C'],
        allergyOn:  ['#FFEBEE', '#FFCDD2'],
        allergyOff: ['#FFFFFF', '#F1F8E9'],
    },
};

export const colors = {
    LEGACY_PRIMARY: theme.primaryDark,
    LEGACY_ACCENT:  theme.accent,
};

export default theme;
