// screens/Connections.js — Green Profile API (DPSE-03) — React Native port
//
// "การเชื่อมต่อภายนอก" — ผู้ใช้คุมว่าจะแชร์ Green Profile ให้แอปไหน + scope ไหน
//   - ดูรายชื่อ partner (GET /api/connections)
//   - อนุญาต + เลือก scope (POST /api/connections/grant) → ได้รหัสจับคู่ (consent token)
//   - เพิกถอนสิทธิ์ (POST /api/connections/revoke)
//   - ดูบันทึกการเข้าถึง + ตรวจ integrity (GET /api/connections/:slug/audit)
//
// Route: /connections (เข้าจาก หน้า Settings → สุขภาพและความปลอดภัย)

import React, { useState, useEffect } from 'react';
import { View, ScrollView, Modal, StyleSheet, Alert, Linking } from "react-native";
import { Pressable } from "../components/Touchable";
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../config';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { toast } from '../components/Toast';
import { useNavigate } from '../shims/router';
import { api } from '../utils/api';
import { getCurrentLang } from '../utils/language';

// แอปสั่งอาหารที่มีหน้าจอเดโมให้เปิด (redirect แบบ OAuth พร้อม token+key ใน URL)
// backend เสิร์ฟหน้าเดโมที่ /mockfood (ธีมตามแบรนด์ที่ส่งไป) → ไม่ต้องกรอกรหัสจับคู่เอง
const DEMO_APP_URL = `${API_BASE_URL}/mockfood`;
const FOOD_APP_SLUGS = ['grabfood', 'lineman', 'shopeefood'];
const hasDemoApp = (slug) => FOOD_APP_SLUGS.includes(slug);

const SCOPE_META = {
    allergy:        { th: 'การแพ้อาหาร',   en: 'Allergies',      icon: 'mdi:shield-cross', color: '#D14545', dth: 'เตือนเมนูที่คุณแพ้',                den: 'Warn about menus you are allergic to' },
    health:         { th: 'เป้าหมายสุขภาพ', en: 'Health goals',   icon: 'mdi:heart-pulse',  color: '#185FA5', dth: 'แคลอรี่ · โซเดียม · น้ำตาล',        den: 'Calorie · sodium · sugar goals' },
    sustainability: { th: 'ความยั่งยืน',    en: 'Sustainability', icon: 'mdi:leaf',         color: '#2D8048', dth: 'Green Score · ลดพลาสติก · คาร์บอน', den: 'Green Score · plastic · carbon' },
    account:        { th: 'ข้อมูลบัญชี',    en: 'Account',        icon: 'lucide:user',      color: '#777',    dth: 'ชื่อ · persona',                    den: 'Name · persona' },
};

function iconifyName(name) {
    if (!name) return 'mdi:application';
    return name.startsWith('ti-') ? 'tabler:' + name.slice(3) : name;
}

function timeAgo(iso, lang) {
    if (!iso) return lang === 'TH' ? 'ยังไม่เคยเข้าถึง' : 'never accessed';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (lang === 'TH') {
        if (m < 1) return 'เมื่อสักครู่'; if (h < 1) return `${m} นาทีที่แล้ว`;
        if (d < 1) return `${h} ชม.ที่แล้ว`; return `${d} วันที่แล้ว`;
    }
    if (m < 1) return 'just now'; if (h < 1) return `${m}m ago`;
    if (d < 1) return `${h}h ago`; return `${d}d ago`;
}

export default function Connections() {
    const navigate = useNavigate();
    const lang = getCurrentLang();
    const TH = lang === 'TH';

    const [partners, setPartners] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [sheet, setSheet]       = useState(null);   // partner ที่กำลังขออนุญาต
    const [sel, setSel]           = useState([]);     // scope ที่เลือกใน sheet
    const [audit, setAudit]       = useState(null);   // { partner, entries, integrity }

    const load = async () => {
        try {
            const r = await api.get('/api/connections');
            setPartners(r.data?.partners || []);
        } catch (e) {
            toast.error(TH ? 'โหลดข้อมูลไม่สำเร็จ' : 'Failed to load');
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const openConsent = (p) => {
        setSel(p.allowed_scopes.filter((s) => s !== 'account')); // default เปิดทุกข้อ ยกเว้นบัญชี
        setSheet(p);
    };
    const toggle = (s) => setSel((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

    // เปิดแอป partner พร้อมแนบ consent token + api key + แบรนด์ ใน URL
    // → ดึงข้อมูล user คนนั้นเอง และธีมหน้าเดโมตามแอป (ไม่ต้องกรอกรหัส)
    const openPartnerApp = (partner, token) => {
        if (!partner || !hasDemoApp(partner.slug) || !token) return;
        const q =
            `ct=${encodeURIComponent(token)}` +
            `&key=${encodeURIComponent(partner.api_key || '')}` +
            `&app=${encodeURIComponent(partner.name || '')}` +
            `&color=${encodeURIComponent(String(partner.brand_color || '').replace('#', ''))}`;
        Linking.openURL(`${DEMO_APP_URL}?${q}`).catch(() =>
            toast.error(TH ? 'เปิดแอปไม่สำเร็จ' : 'Could not open app'));
    };

    const grant = async () => {
        if (sel.length === 0) { toast.error(TH ? 'เลือกอย่างน้อย 1 อย่าง' : 'Pick at least one'); return; }
        const partner = sheet;
        try {
            const res = await api.post('/api/connections/grant', { partner_slug: partner.slug, scopes: sel });
            toast.success(TH ? `อนุญาต ${partner.name} แล้ว` : `${partner.name} connected`);
            setSheet(null); load();
            // เชื่อมแล้ว → พาไปหน้าแอป partner พร้อมข้อมูลของ user คนนี้เลย
            if (hasDemoApp(partner.slug)) openPartnerApp(partner, res.data?.consent_token);
        } catch (e) { toast.error(e.response?.data?.message || 'error'); }
    };

    const revoke = (p) => {
        Alert.alert(
            TH ? `เพิกถอน ${p.name}?` : `Revoke ${p.name}?`,
            TH ? 'แอปนี้จะเข้าถึงข้อมูลของคุณไม่ได้อีกทันที' : 'It will lose access immediately',
            [
                { text: TH ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
                { text: TH ? 'เพิกถอน' : 'Revoke', style: 'destructive', onPress: async () => {
                    try {
                        await api.post('/api/connections/revoke', { partner_slug: p.slug });
                        toast.success(TH ? 'เพิกถอนแล้ว' : 'Revoked'); load();
                    } catch (e) { toast.error(e.response?.data?.message || 'error'); }
                } },
            ],
        );
    };

    const copyCode = async (code) => {
        try { await Clipboard.setStringAsync(String(code)); toast.success(TH ? 'คัดลอกรหัสแล้ว' : 'Copied'); } catch {}
    };

    const showAudit = async (p) => {
        try {
            const r = await api.get(`/api/connections/${p.slug}/audit`);
            const { entries = [], integrity } = r.data || {};
            setAudit({ partner: p, entries: entries.slice().reverse(), integrity });
        } catch (e) { toast.error('error'); }
    };

    const connected = partners.filter((p) => p.status === 'active');
    const others    = partners.filter((p) => p.status !== 'active');

    const PartnerCard = (p) => {
        const isOn = p.status === 'active';
        return (
            <View key={p.slug} style={s.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                    <View style={[s.logo, { backgroundColor: p.brand_color }]}>
                        <Icon icon={iconifyName(p.logo_icon)} width={24} color="#fff" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#222' }}>{p.name}</Text>
                        <Text style={{ fontSize: 11, color: '#999', lineHeight: 16 }}>{p.description}</Text>
                    </View>
                    {isOn ? (
                        <View style={s.connectedBadge}><Text style={{ fontSize: 10, fontWeight: '700', color: '#2D8048' }}>{TH ? 'เชื่อมแล้ว' : 'Connected'}</Text></View>
                    ) : (
                        <Pressable onPress={() => openConsent(p)} style={s.connectBtn}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>{TH ? 'เชื่อมต่อ' : 'Connect'}</Text>
                        </Pressable>
                    )}
                </View>

                {isOn && (
                    <>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
                            {p.scopes.map((sc) => {
                                const m = SCOPE_META[sc] || {};
                                return (
                                    <View key={sc} style={{ backgroundColor: `${m.color}18`, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8 }}>
                                        <Text style={{ fontSize: 10.5, color: m.color, fontWeight: '700' }}>{TH ? m.th : m.en}</Text>
                                    </View>
                                );
                            })}
                        </View>

                        {hasDemoApp(p.slug) && p.consent_token ? (
                            <Pressable onPress={() => openPartnerApp(p, p.consent_token)} style={[s.openBtn, { backgroundColor: p.brand_color || '#00B14F' }]}>
                                <Icon icon="lucide:external-link" width={16} color="#fff" />
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{TH ? `เปิด ${p.name}` : `Open ${p.name}`}</Text>
                            </Pressable>
                        ) : null}

                        <View style={s.metaRow}>
                            <Pressable onPress={() => showAudit(p)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Icon icon="lucide:history" width={13} color="#B58a1a" />
                                <Text style={{ fontSize: 11, color: '#B58a1a', fontWeight: '700' }}>{TH ? `บันทึกการเข้าถึง (${p.access_count})` : `Access log (${p.access_count})`}</Text>
                            </Pressable>
                            <Text style={{ fontSize: 10.5, color: '#aaa' }}>{TH ? 'ใช้ล่าสุด ' : 'last '}{timeAgo(p.last_access_at, lang)}</Text>
                        </View>

                        <Pressable onPress={() => revoke(p)} style={s.revokeBtn}>
                            <Text style={{ color: '#D14545', fontWeight: '800', fontSize: 12.5 }}>{TH ? 'เพิกถอนสิทธิ์' : 'Revoke access'}</Text>
                        </Pressable>
                    </>
                )}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#D5EE7A', '#FAFAFA']} style={s.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Pressable onPress={() => navigate('/settings')} style={s.backBtn}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1B5E37' }}>{TH ? 'การเชื่อมต่อภายนอก' : 'External connections'}</Text>
                        <View style={{ width: 42 }} />
                    </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 22, paddingTop: 14 }}>
                    <Text style={{ fontSize: 12.5, color: '#777', lineHeight: 20, marginBottom: 16 }}>
                        {TH
                            ? 'แชร์ข้อมูลสุขภาพและไลฟ์สไตล์รักษ์โลกของคุณให้แอปที่เชื่อถือได้ เพื่อรับคำแนะนำอาหารที่ปลอดภัยและดีต่อโลกในแบบของคุณ คุณเลือกได้เองว่าจะแชร์อะไร กับใคร และยกเลิกได้ทุกเมื่อ'
                            : 'Share your health and eco-lifestyle profile with trusted apps to get safer, greener food suggestions made for you. You choose what to share, with whom, and can disconnect anytime.'}
                    </Text>

                    {loading ? (
                        <Text style={{ textAlign: 'center', color: '#aaa', paddingVertical: 40, fontSize: 13 }}>{TH ? 'กำลังโหลด…' : 'Loading…'}</Text>
                    ) : (
                        <>
                            {connected.length > 0 && (
                                <View style={{ marginBottom: 8 }}>
                                    <Text style={s.secLabel}>{TH ? 'เชื่อมต่ออยู่' : 'CONNECTED'}</Text>
                                    {connected.map(PartnerCard)}
                                </View>
                            )}
                            <Text style={[s.secLabel, { marginTop: 6 }]}>{TH ? 'แอปที่เชื่อมได้' : 'AVAILABLE'}</Text>
                            {others.map(PartnerCard)}
                        </>
                    )}

                    <View style={s.privacyNote}>
                        <Icon icon="mdi:shield-lock" width={18} color="#185FA5" />
                        <Text style={{ flex: 1, fontSize: 11.5, color: '#185FA5', lineHeight: 17 }}>
                            {TH ? 'แอปที่เชื่อมต่อจะเห็นเพียงผลลัพธ์ที่จำเป็น เช่น เมนูนี้ปลอดภัยกับคุณไหม หรือคะแนนความเหมาะสม โดยไม่เห็นข้อมูลส่วนตัวดิบของคุณ' : 'Connected apps only see the results they need — like whether a dish is safe for you, or a suitability score — never your raw personal data.'}
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* ── Consent bottom sheet ───────────────────────────────────── */}
            <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
                <Pressable style={s.sheetBackdrop} onPress={() => setSheet(null)}>
                    <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
                        <View style={s.sheetHandle} />
                        {sheet && (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 4 }}>
                                    <View style={[s.logo, { backgroundColor: sheet.brand_color }]}>
                                        <Icon icon={iconifyName(sheet.logo_icon)} width={24} color="#fff" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#222' }}>{sheet.name}</Text>
                                        <Text style={{ fontSize: 11, color: '#999' }}>{TH ? 'อยากเชื่อมกับ Green Profile ของคุณ' : 'wants to connect to your Green Profile'}</Text>
                                    </View>
                                </View>
                                <Text style={{ fontSize: 12, color: '#777', marginTop: 12, marginBottom: 6 }}>{TH ? 'เลือกข้อมูลที่จะแชร์ (เปิด/ปิดได้):' : 'Choose what to share:'}</Text>

                                {sheet.allowed_scopes.map((sc) => {
                                    const m = SCOPE_META[sc] || {};
                                    const on = sel.includes(sc);
                                    return (
                                        <Pressable key={sc} onPress={() => toggle(sc)} style={s.scopeRow}>
                                            <View style={[s.scopeIcon, { backgroundColor: `${m.color}18` }]}><Icon icon={m.icon} width={19} color={m.color} /></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#222' }}>{TH ? m.th : m.en}</Text>
                                                <Text style={{ fontSize: 11, color: '#999' }}>{TH ? m.dth : m.den}</Text>
                                            </View>
                                            <Icon icon={on ? 'mdi:checkbox-marked' : 'mdi:checkbox-blank-outline'} width={22} color={on ? '#2D8048' : '#ccc'} />
                                        </Pressable>
                                    );
                                })}

                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                                    <Pressable onPress={() => setSheet(null)} style={s.denyBtn}><Text style={{ fontSize: 13, fontWeight: '800', color: '#888' }}>{TH ? 'ปฏิเสธ' : 'Deny'}</Text></Pressable>
                                    <Pressable onPress={grant} style={s.allowBtn}><Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>{TH ? 'อนุญาต' : 'Allow'}</Text></Pressable>
                                </View>
                            </>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* ── Audit log modal ────────────────────────────────────────── */}
            <Modal visible={!!audit} transparent animationType="fade" onRequestClose={() => setAudit(null)}>
                <Pressable style={s.auditBackdrop} onPress={() => setAudit(null)}>
                    <Pressable style={s.auditCard} onPress={(e) => e.stopPropagation()}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: '#1B5E37', marginBottom: 10, textAlign: 'center' }}>{TH ? 'บันทึกการเข้าถึง' : 'Access log'}</Text>
                        {audit && (() => {
                            const ok = audit.integrity?.valid;
                            return (
                                <>
                                    <View style={[s.integrityBadge, { backgroundColor: ok ? '#EAF3DE' : '#FCEBEB' }]}>
                                        <Icon icon={ok ? 'mdi:shield-check' : 'mdi:shield-alert'} width={15} color={ok ? '#3B6D11' : '#A32D2D'} />
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: ok ? '#3B6D11' : '#A32D2D' }}>
                                            {ok ? (TH ? 'ข้อมูลครบถ้วน ไม่ถูกแก้ไข' : 'Integrity verified') : (TH ? 'ตรวจพบการแก้ไข!' : 'Tampering detected!')}
                                        </Text>
                                    </View>
                                    <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                                        {audit.entries.length ? audit.entries.map((e, i) => (
                                            <View key={i} style={s.auditRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontWeight: '700', color: '#1B5E37', fontSize: 13 }}>{e.action}</Text>
                                                    <Text style={{ fontSize: 11, color: '#999' }}>#{e.seq} · {new Date(e.at).toLocaleString()}</Text>
                                                </View>
                                                <Text style={{ fontSize: 10, color: '#bbb' }}>{String(e.hash).slice(0, 8)}…</Text>
                                            </View>
                                        )) : (
                                            <Text style={{ color: '#999', fontSize: 13, padding: 12, textAlign: 'center' }}>{TH ? 'ยังไม่มีการเข้าถึง' : 'No access yet'}</Text>
                                        )}
                                    </ScrollView>
                                </>
                            );
                        })()}
                        <Pressable onPress={() => setAudit(null)} style={s.auditClose}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{TH ? 'ปิด' : 'Close'}</Text></Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    header: { paddingTop: 36, paddingHorizontal: 22, paddingBottom: 18, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    secLabel: { fontSize: 11, color: '#888', fontWeight: '900', letterSpacing: 0.5, marginBottom: 8 },
    card: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#eee', borderRadius: 18, padding: 14, marginBottom: 12 },
    logo: { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    connectedBadge: { backgroundColor: '#E7F6EC', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10 },
    connectBtn: { backgroundColor: '#2D8048', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 11 },
    codeBox: { marginTop: 11, backgroundColor: '#F7FBF0', borderWidth: 1, borderColor: '#C7DEA8', borderStyle: 'dashed', borderRadius: 11, paddingVertical: 9, paddingHorizontal: 11 },
    openBtn: { marginTop: 11, backgroundColor: '#00B14F', borderRadius: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#F4F4F4' },
    revokeBtn: { width: '100%', marginTop: 10, paddingVertical: 9, backgroundColor: '#fff', borderWidth: 1, borderColor: '#FFCDD2', borderRadius: 11, alignItems: 'center' },
    privacyNote: { marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#F2F7FB', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12 },
    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(20,30,15,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 },
    sheetHandle: { width: 42, height: 4, borderRadius: 3, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 16 },
    scopeRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#F2F2F2' },
    scopeIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    denyBtn: { flex: 1, paddingVertical: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 13, alignItems: 'center' },
    allowBtn: { flex: 2, paddingVertical: 13, backgroundColor: '#2D8048', borderRadius: 13, alignItems: 'center' },
    auditBackdrop: { flex: 1, backgroundColor: 'rgba(20,30,15,0.5)', justifyContent: 'center', paddingHorizontal: 28 },
    auditCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18 },
    integrityBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, marginBottom: 10 },
    auditRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
    auditClose: { marginTop: 14, paddingVertical: 12, backgroundColor: '#2D8048', borderRadius: 13, alignItems: 'center' },
});
