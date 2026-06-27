import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Linking, Modal, LayoutAnimation } from "react-native";
import { Pressable } from "../components/Touchable";
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { toast } from '../components/Toast';
import { useNavigate } from '../shims/router';
import { getCurrentLang } from '../utils/language';

const FAQ_TH = [
    { q: 'ระบบตรวจสารก่อภูมิแพ้แม่นยำแค่ไหน?', a: 'ระบบใช้ข้อมูลส่วนผสมจาก OpenFoodFacts ตรวจกับรายการอาการแพ้ EU 14 ของคุณ ความแม่นยำ "ไม่ใช่ 100%" — บางสินค้ามีสารผสมแฝง กรุณาอ่านฉลากเองทุกครั้ง โดยเฉพาะถ้าแพ้รุนแรง' },
    { q: 'ทดลอง VIP ฟรี 3 วันได้อย่างไร?', a: 'ผู้ใช้ใหม่ได้ทดลอง Sugar & Starch Tracker ฟรี 3 วันอัตโนมัติ หลังครบ 3 วันฟีเจอร์จะถูกล็อกจนกว่าจะอัปเกรด VIP (฿69/เดือน)' },
    { q: 'ระบบแพ้อาหารต้องจ่ายเงินไหม?', a: 'ไม่ต้อง — เป็นฟีเจอร์ฟรีถาวร เพราะเราถือว่าเรื่องนี้สำคัญต่อชีวิตของผู้ใช้' },
    { q: 'สแกนแล้วไม่เจอสินค้า ทำอย่างไร?', a: 'ระบบจะถามว่าต้องการเพิ่มข้อมูลสินค้าเองหรือไม่ ถ้าเพิ่ม รับ 50 แต้มทันที และข้อมูลจะเข้าสู่ "รอตรวจสอบ" โดยผู้ใช้คนอื่นช่วยโหวต' },
    { q: 'แต้มสะสม ×1.5 สำหรับ VIP ทำงานอย่างไร?', a: 'ทุกครั้งที่ VIP สแกน ระบบคูณแต้มด้วย 1.5 อัตโนมัติ เช่น +50 → VIP ได้ +75' },
    { q: 'คูปองหมดอายุเมื่อไหร่?', a: 'หลังแลกแต้ม มีเวลา 30 นาทีในการให้ร้านสแกน ถ้าเกินเวลาคูปองจะ expired (แต้มไม่คืน)' },
    { q: 'ข้อมูลของฉันปลอดภัยไหม?', a: 'รหัสผ่านเข้ารหัส bcrypt เก็บใน MongoDB Atlas (TLS) ทุก API call ผ่าน JWT token' },
    { q: 'ยกเลิก VIP ได้อย่างไร?', a: 'ไปที่ Profile → VIP card → "ยกเลิก" ใช้งานต่อได้จนถึงวันหมดอายุ ไม่มีค่าธรรมเนียม' },
];
const FAQ_EN = [
    { q: 'How accurate is the allergy detection?', a: 'We use OpenFoodFacts data and match against your EU14 allergens. NOT 100% — always read the label.' },
    { q: 'How does the 3-day free VIP trial work?', a: 'Every new user gets 3 days of Sugar Tracker free. After that, upgrade (฿69/mo).' },
    { q: 'Is the allergy system paid?', a: "No — it's permanently FREE." },
    { q: 'Product not found on scan?', a: "You'll be asked to add it (+50 points). Enters Pending review for community voting." },
    { q: 'How does VIP ×1.5 points work?', a: 'Every VIP scan multiplies points by 1.5. Shown as "+75 ×1.5 VIP".' },
    { q: 'When do coupons expire?', a: '30 minutes after redemption (no refund on points).' },
    { q: 'Is my data secure?', a: 'Passwords bcrypt-hashed in MongoDB Atlas (TLS). JWT-authenticated API.' },
    { q: 'How to cancel VIP?', a: 'Profile → VIP card → "Cancel". Keeps working until period ends.' },
];

// ── เอกสาร/นโยบายจริง (แสดงเป็นหน้าเต็มเมื่อกด) ─────────────────────────────
const UPDATED_TH = 'ปรับปรุงล่าสุด 26 มิถุนายน 2026';
const UPDATED_EN = 'Last updated 26 June 2026';
const LEGAL = {
    privacy: {
        icon: 'mdi:file-document-outline',
        th: {
            title: 'นโยบายความเป็นส่วนตัว',
            sections: [
                { h: 'ข้อมูลที่เราเก็บ', b: 'เราเก็บเฉพาะข้อมูลที่จำเป็นต่อการให้บริการ ได้แก่ ชื่อผู้ใช้ อีเมล รหัสผ่าน (จัดเก็บแบบเข้ารหัส) ข้อมูลสุขภาพที่คุณกรอกเอง (อาการแพ้อาหาร โรคประจำตัว เป้าหมายสุขภาพ) ประวัติการสแกนสินค้า และแต้มสะสม' },
                { h: 'เราใช้ข้อมูลอย่างไร', b: 'เพื่อตรวจจับสารก่อภูมิแพ้ในสินค้าที่คุณสแกน แนะนำอาหารที่เหมาะกับสุขภาพและไลฟ์สไตล์ของคุณ คำนวณแต้มและของรางวัล และพัฒนาคุณภาพบริการ เราไม่ใช้ข้อมูลเพื่อการโฆษณาติดตามตัว' },
                { h: 'การแชร์ข้อมูลให้บุคคลที่สาม', b: 'เราไม่ขายข้อมูลของคุณ การแชร์ข้อมูลให้แอปภายนอก (เช่น แอปสั่งอาหาร) จะเกิดขึ้นเฉพาะเมื่อคุณกด "ยินยอม" ในหน้าการเชื่อมต่อภายนอกเท่านั้น และแอปเหล่านั้นจะเห็นเพียง "ผลลัพธ์" เช่น เมนูปลอดภัยกับคุณไหม หรือคะแนนความเหมาะสม โดยไม่เห็นข้อมูลส่วนตัวดิบของคุณ' },
                { h: 'สิทธิของคุณ (PDPA)', b: 'ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล คุณมีสิทธิเข้าถึง แก้ไข หรือลบข้อมูลของคุณ และถอนความยินยอมการแชร์ได้ทุกเมื่อผ่านหน้า "การเชื่อมต่อภายนอก"' },
                { h: 'ติดต่อเรา', b: 'หากมีคำถามเกี่ยวกับข้อมูลส่วนบุคคล ติดต่อ support@ingreen.app' },
            ],
        },
        en: {
            title: 'Privacy Policy',
            sections: [
                { h: 'What we collect', b: 'We collect only what is needed to provide the service: username, email, encrypted password, the health data you enter yourself (allergies, conditions, health goals), scan history, and points.' },
                { h: 'How we use it', b: 'To detect allergens in products you scan, recommend food that fits your health and lifestyle, calculate points and rewards, and improve the service. We do not use your data for tracking advertising.' },
                { h: 'Sharing with third parties', b: 'We never sell your data. Sharing with external apps (e.g. food-delivery apps) happens only when you tap "Allow" in External Connections, and those apps see only results — such as whether a dish is safe for you — never your raw data.' },
                { h: 'Your rights', b: 'You may access, edit, or delete your data, and revoke any sharing consent at any time via External Connections.' },
                { h: 'Contact', b: 'For privacy questions, contact support@ingreen.app' },
            ],
        },
    },
    terms: {
        icon: 'mdi:file-sign',
        th: {
            title: 'ข้อตกลงการใช้งาน',
            sections: [
                { h: 'การยอมรับเงื่อนไข', b: 'การสมัครและใช้งาน InGreen ถือว่าคุณยอมรับข้อตกลงนี้ หากไม่ยอมรับ กรุณางดใช้บริการ' },
                { h: 'บัญชีผู้ใช้', b: 'คุณมีหน้าที่รักษารหัสผ่านให้ปลอดภัย และให้ข้อมูลตามความเป็นจริง การกระทำใดๆ ภายใต้บัญชีของคุณถือเป็นความรับผิดชอบของคุณ' },
                { h: 'การใช้งานที่ยอมรับได้', b: 'ห้ามใช้แอปเพื่อการผิดกฎหมาย ปั่นแต้ม สร้างบัญชีปลอม หรือกรอกข้อมูลสินค้าอันเป็นเท็จ เราขอสงวนสิทธิ์ระงับบัญชีที่ละเมิด' },
                { h: 'แต้มและของรางวัล', b: 'แต้มสะสมไม่มีมูลค่าเทียบเท่าเงินสด ไม่สามารถโอนหรือแลกเป็นเงินได้ คูปองที่แลกแล้วมีอายุ 30 นาที หากเกินเวลาถือว่าสิ้นสุด (ไม่คืนแต้ม)' },
                { h: 'สมาชิก VIP', b: 'ค่าสมาชิก ฿69/เดือน ยกเลิกได้ทุกเมื่อ โดยใช้งานต่อได้จนหมดรอบที่ชำระไว้' },
                { h: 'ข้อจำกัดความรับผิด', b: 'ระบบตรวจสารก่อภูมิแพ้และคำแนะนำสุขภาพมีไว้เพื่อช่วยตัดสินใจเท่านั้น ความแม่นยำไม่ใช่ 100% กรุณาอ่านฉลากสินค้าด้วยตนเองทุกครั้ง โดยเฉพาะหากคุณแพ้รุนแรง InGreen ไม่รับผิดต่อความเสียหายที่เกิดจากการพึ่งพาข้อมูลในแอปเพียงอย่างเดียว' },
            ],
        },
        en: {
            title: 'Terms of Service',
            sections: [
                { h: 'Acceptance', b: 'By registering and using InGreen, you accept these terms. If you do not agree, please discontinue use.' },
                { h: 'Your account', b: 'You are responsible for keeping your password safe and providing accurate information. Activity under your account is your responsibility.' },
                { h: 'Acceptable use', b: 'Do not use the app for unlawful purposes, point farming, fake accounts, or submitting false product data. We may suspend violating accounts.' },
                { h: 'Points & rewards', b: 'Points have no cash value and cannot be transferred or redeemed for money. Redeemed coupons expire after 30 minutes (no point refund).' },
                { h: 'VIP membership', b: '฿69/month, cancel anytime; access continues until the end of the paid period.' },
                { h: 'Disclaimer', b: 'Allergen detection and health advice are decision aids only and are not 100% accurate. Always read product labels yourself, especially for severe allergies. InGreen is not liable for harm from relying on the app alone.' },
            ],
        },
    },
    security: {
        icon: 'mdi:shield-lock-outline',
        th: {
            title: 'ความปลอดภัยของข้อมูล',
            sections: [
                { h: 'การเข้ารหัส', b: 'รหัสผ่านถูกแฮชด้วย bcrypt (ไม่เก็บแบบข้อความธรรมดา) และการรับส่งข้อมูลทั้งหมดผ่าน HTTPS/TLS' },
                { h: 'การยืนยันตัวตน', b: 'ทุกคำขอ API ต้องมี JWT token ที่ออกหลังเข้าสู่ระบบ ป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต' },
                { h: 'ที่จัดเก็บข้อมูล', b: 'ข้อมูลจัดเก็บบน MongoDB Atlas (คลาวด์ที่มีการเข้ารหัสและสำรองข้อมูล) เข้าถึงได้เฉพาะระบบที่ได้รับอนุญาต' },
                { h: 'บันทึกการเข้าถึงแบบตรวจสอบได้', b: 'ทุกครั้งที่แอปภายนอกเข้าถึงข้อมูลของคุณ จะถูกบันทึกแบบ hash chain ที่ตรวจจับการแก้ไขย้อนหลังได้ คุณดูบันทึกได้ในหน้าการเชื่อมต่อภายนอก' },
                { h: 'คุณคือผู้ควบคุม', b: 'คุณเลือกได้เองว่าจะแชร์อะไรกับใคร และถอนสิทธิ์ได้ทันที เมื่อถอนแล้วแอปนั้นจะเข้าถึงข้อมูลไม่ได้อีก' },
            ],
        },
        en: {
            title: 'Data Security',
            sections: [
                { h: 'Encryption', b: 'Passwords are bcrypt-hashed (never stored in plain text), and all traffic uses HTTPS/TLS.' },
                { h: 'Authentication', b: 'Every API request requires a JWT token issued after login, preventing unauthorized access.' },
                { h: 'Storage', b: 'Data is stored on MongoDB Atlas (encrypted, backed-up cloud), accessible only by authorized systems.' },
                { h: 'Tamper-evident audit log', b: 'Each time an external app accesses your data it is recorded in a hash chain that detects tampering. You can view the log in External Connections.' },
                { h: 'You are in control', b: 'You choose what to share and with whom, and can revoke instantly — after which the app can no longer access your data.' },
            ],
        },
    },
    cookies: {
        icon: 'mdi:cookie-outline',
        th: {
            title: 'การใช้ Cookies และข้อมูลในเครื่อง',
            sections: [
                { h: 'InGreen เป็นแอปมือถือ', b: 'แทนการใช้ cookies แบบเว็บไซต์ InGreen ใช้ที่จัดเก็บในเครื่อง (local storage) เพื่อจำการเข้าสู่ระบบและการตั้งค่าของคุณ' },
                { h: 'เราเก็บอะไรในเครื่อง', b: 'โทเคนเข้าสู่ระบบ ภาษาที่เลือก และการตั้งค่าต่างๆ เพื่อให้คุณไม่ต้องเข้าสู่ระบบใหม่ทุกครั้ง' },
                { h: 'เราไม่ติดตามคุณ', b: 'เราไม่ใช้ cookies หรือเครื่องมือติดตามเพื่อการโฆษณา และไม่แชร์พฤติกรรมการใช้งานของคุณให้บุคคลที่สาม' },
                { h: 'การล้างข้อมูล', b: 'คุณล้างข้อมูลที่เก็บในเครื่องได้โดยออกจากระบบ หรือถอนการติดตั้งแอป' },
            ],
        },
        en: {
            title: 'Cookies & Local Data',
            sections: [
                { h: 'InGreen is a mobile app', b: 'Instead of web cookies, InGreen uses on-device local storage to remember your login and settings.' },
                { h: 'What we store on device', b: 'Your login token, selected language, and preferences — so you don\'t have to sign in every time.' },
                { h: 'We do not track you', b: 'We use no advertising cookies or trackers, and never share your usage behavior with third parties.' },
                { h: 'Clearing data', b: 'You can clear local data by logging out or uninstalling the app.' },
            ],
        },
    },
    about: {
        icon: 'mdi:information-outline',
        th: {
            title: 'เกี่ยวกับ InGreen',
            sections: [
                { h: 'พันธกิจของเรา', b: 'InGreen ช่วยให้การเลือกซื้ออาหารในชีวิตประจำวันปลอดภัยต่อสุขภาพและเป็นมิตรต่อโลกมากขึ้น เพียงสแกนก็รู้ทันที' },
                { h: 'เราทำอะไร', b: 'สแกนบาร์โค้ด/ฉลากสินค้า ตรวจสารก่อภูมิแพ้ตามโปรไฟล์ของคุณ ให้คะแนนความยั่งยืน (Green Score) ให้ชุมชนช่วยกันตรวจสอบข้อมูลสินค้าใหม่ และให้คุณแชร์ Green Profile กับแอปพาร์ตเนอร์ได้อย่างปลอดภัย' },
                { h: 'เทคโนโลยี', b: 'ใช้ฐานข้อมูล OpenFoodFacts ระบบโหวตตรวจสอบแบบถ่วงน้ำหนัก และ Green Profile API สำหรับการเชื่อมต่อภายนอกที่ควบคุมด้วยความยินยอม' },
                { h: 'เวอร์ชัน', b: 'InGreen v5.1 · 2026 — พัฒนาเป็นส่วนหนึ่งของโครงการจุลนิพนธ์' },
            ],
        },
        en: {
            title: 'About InGreen',
            sections: [
                { h: 'Our mission', b: 'InGreen helps make everyday food choices safer for your health and kinder to the planet — just scan and know instantly.' },
                { h: 'What we do', b: 'Scan barcodes/labels, detect allergens against your profile, give a sustainability Green Score, let the community verify new product data, and let you share your Green Profile with partner apps securely.' },
                { h: 'Technology', b: 'Powered by OpenFoodFacts data, a weighted community-voting system, and a consent-controlled Green Profile API.' },
                { h: 'Version', b: 'InGreen v5.1 · 2026 — built as part of a senior thesis project.' },
            ],
        },
    },
};
const DOC_ORDER = ['privacy', 'terms', 'security', 'cookies', 'about'];

export default function Support() {
    const navigate = useNavigate();
    const currentLang = getCurrentLang();
    const isTH = currentLang === 'TH';
    const FAQ = isTH ? FAQ_TH : FAQ_EN;
    const [openIdx, setOpenIdx] = useState(null);
    const [activeDoc, setActiveDoc] = useState(null); // key ของเอกสารที่เปิด

    const contactItems = [
        { icon: 'mdi:email-outline', color: '#1565C0', labelTH: 'อีเมล', labelEN: 'Email', val: 'support@ingreen.app', href: 'mailto:support@ingreen.app' },
        { icon: 'mdi:phone-outline', color: '#2D8048', labelTH: 'โทรศัพท์', labelEN: 'Phone', val: '02-XXX-XXXX', href: 'tel:020000000' },
        { icon: 'mdi:facebook-messenger', color: '#0084FF', labelTH: 'แชต Facebook', labelEN: 'FB Messenger', val: 'm.me/ingreen', href: 'https://m.me/ingreen' },
        { icon: 'mdi:chat-processing-outline', color: '#06C755', labelTH: 'LINE Official', labelEN: 'LINE OA', val: '@ingreen', href: 'https://line.me/R/ti/p/@ingreen' },
    ];
    const legal = DOC_ORDER.map((key) => ({ key, icon: LEGAL[key].icon, label: (isTH ? LEGAL[key].th : LEGAL[key].en).title }));
    const doc = activeDoc ? (isTH ? LEGAL[activeDoc].th : LEGAL[activeDoc].en) : null;

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#D5EE7A', '#FAFAFA']} locations={[0, 0.6]} style={{ paddingTop: 36, paddingHorizontal: 22, paddingBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Pressable onPress={() => navigate('/profile')} style={s.backBtn}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'ศูนย์ช่วยเหลือ' : 'Support'}</Text>
                        <View style={{ width: 42 }} />
                    </View>
                    <View style={s.heroCard}>
                        <View style={s.heroIcon}><Icon icon="mdi:lifebuoy" width={24} color="#1B5E37" /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'มีคำถาม? เราอยู่ตรงนี้' : "Questions? We're here"}</Text>
                            <Text style={{ fontSize: 11, color: '#888', fontWeight: '600', marginTop: 2 }}>{isTH ? 'ตอบกลับใน 24 ชม. · จ–ส 9:00–18:00' : 'Reply within 24h · Mon–Sat 9–18'}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
                    <Text style={s.secLabel}>{isTH ? 'ติดต่อเรา' : 'CONTACT US'}</Text>
                    <View style={s.contactGrid}>
                        {contactItems.map((c, i) => (
                            <Pressable key={i} onPress={() => Linking.openURL(c.href)} style={s.contactCard}>
                                <View style={[s.contactIcon, { backgroundColor: `${c.color}26` }]}><Icon icon={c.icon} width={20} color={c.color} /></View>
                                <Text style={{ fontSize: 11, color: '#888', fontWeight: '700' }}>{isTH ? c.labelTH : c.labelEN}</Text>
                                <Text style={{ fontSize: 13, color: '#1B5E37', fontWeight: '800', marginTop: 2 }}>{c.val}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={{ paddingHorizontal: 22, paddingTop: 20 }}>
                    <Text style={s.secLabel}>{isTH ? 'คำถามที่พบบ่อย' : 'FAQ'}</Text>
                    <View style={s.faqCard}>
                        {FAQ.map((f, i) => {
                            const open = openIdx === i;
                            return (
                                <View key={i} style={{ borderBottomWidth: i < FAQ.length - 1 ? 1 : 0, borderBottomColor: '#F5F5F5' }}>
                                    <Pressable onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpenIdx(open ? null : i); }} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: '#1B5E37', lineHeight: 20 }}>{f.q}</Text>
                                        <Icon icon={open ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} color="#999" />
                                    </Pressable>
                                    {open && <Text style={s.faqAnswer}>{f.a}</Text>}
                                </View>
                            );
                        })}
                    </View>
                </View>

                <View style={{ paddingHorizontal: 22, paddingTop: 20 }}>
                    <Text style={s.secLabel}>{isTH ? 'ข้อมูลและนโยบาย' : 'LEGAL & INFO'}</Text>
                    <View style={s.faqCard}>
                        {legal.map((it, i) => (
                            <Pressable key={it.key} onPress={() => setActiveDoc(it.key)} style={[s.legalRow, { borderBottomWidth: i < legal.length - 1 ? 1 : 0, borderBottomColor: '#F5F5F5' }]}>
                                <View style={s.legalIcon}><Icon icon={it.icon} width={18} color="#2D8048" /></View>
                                <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: '#333' }}>{it.label}</Text>
                                <Icon icon="lucide:chevron-right" width={18} color="#CCC" />
                            </Pressable>
                        ))}
                    </View>
                </View>
                <Text style={{ textAlign: 'center', paddingTop: 24, fontSize: 11, color: '#AAA', fontWeight: '600' }}>InGreen v5.1 · 2026</Text>
            </ScrollView>

            {/* ── หน้าเอกสาร/นโยบาย (เนื้อหาจริง) ── */}
            <Modal visible={!!doc} animationType="slide" onRequestClose={() => setActiveDoc(null)}>
                <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
                    <LinearGradient colors={['#D5EE7A', '#FAFAFA']} locations={[0, 0.8]} style={{ paddingTop: 36, paddingHorizontal: 22, paddingBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Pressable onPress={() => setActiveDoc(null)} style={s.backBtn}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                            <Text style={{ flex: 1, fontSize: 16, fontWeight: '900', color: '#1B5E37' }} numberOfLines={1}>{doc?.title}</Text>
                        </View>
                    </LinearGradient>
                    <ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                        <Text style={{ fontSize: 11, color: '#AAA', fontWeight: '700', marginBottom: 18 }}>{isTH ? UPDATED_TH : UPDATED_EN}</Text>
                        {doc?.sections.map((sec, i) => (
                            <View key={i} style={s.docSection}>
                                <Text style={s.docHeading}>{sec.h}</Text>
                                <Text style={s.docBody}>{sec.b}</Text>
                            </View>
                        ))}
                        <View style={s.docFooter}>
                            <Icon icon="mdi:leaf" width={16} color="#2D8048" />
                            <Text style={{ fontSize: 11, color: '#999', fontWeight: '600' }}>InGreen · support@ingreen.app</Text>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    heroCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 25, elevation: 2 },
    heroIcon: { width: 46, height: 46, backgroundColor: '#F4FDC6', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    secLabel: { fontSize: 11, color: '#888', fontWeight: '900', letterSpacing: 0.5, marginBottom: 8 },
    contactGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
    contactCard: { width: '48.5%', backgroundColor: 'white', borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: '#F5F5F5', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, elevation: 1 },
    contactIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    faqCard: { backgroundColor: 'white', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, elevation: 1 },
    faqAnswer: { paddingHorizontal: 14, paddingBottom: 14, fontSize: 13, color: '#666', fontWeight: '500', lineHeight: 21, backgroundColor: '#FAFAFA' },
    legalRow: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    legalIcon: { width: 36, height: 36, backgroundColor: '#F1F8E9', borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    docSection: { marginBottom: 18 },
    docHeading: { fontSize: 15, fontWeight: '900', color: '#1B5E37', marginBottom: 6 },
    docBody: { fontSize: 13.5, color: '#555', fontWeight: '500', lineHeight: 22 },
    docFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingTop: 18, borderTopWidth: 1, borderTopColor: '#EEE' },
});
