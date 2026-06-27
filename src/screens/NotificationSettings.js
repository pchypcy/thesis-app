import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Pressable } from "../components/Touchable";
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { toast } from '../components/Toast';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang } from '../utils/language';

const SECTIONS = (lang) => [
    { title: lang === 'TH' ? 'การแจ้งเตือนสำคัญ' : 'Critical alerts', items: [
        { key: 'allergyAlerts', icon: 'mdi:shield-cross', color: '#D32F2F', titleTH: 'แจ้งเตือนสารก่อภูมิแพ้', descTH: 'เด้ง popup ทันทีเมื่อพบสารที่คุณแพ้', titleEN: 'Allergy alerts', descEN: 'Popup when product contains your allergens' },
        { key: 'vipTrialReminder', icon: 'mdi:alarm', color: '#F9A825', titleTH: 'แจ้งเตือน Trial ใกล้หมด', descTH: '1 วันก่อนทดลองหมด', titleEN: 'Trial expiry reminder', descEN: '1 day before trial ends' },
    ] },
    { title: lang === 'TH' ? 'สุขภาพ' : 'Health', items: [
        { key: 'sugarDailySummary', icon: 'mdi:water-percent', color: '#1B5E37', titleTH: 'สรุปน้ำตาลประจำวัน', descTH: 'แจ้งเตือนสรุปก่อนนอน', titleEN: 'Daily sugar summary', descEN: 'Before bedtime' },
        { key: 'weeklyReport', icon: 'mdi:file-chart', color: '#2196F3', titleTH: 'รายงานรายสัปดาห์', descTH: 'ทุกวันอาทิตย์', titleEN: 'Weekly report', descEN: 'Every Sunday' },
    ] },
    { title: lang === 'TH' ? 'การใช้งาน' : 'Engagement', items: [
        { key: 'scanReminders', icon: 'mdi:barcode-scan', color: '#558B2F', titleTH: 'แจ้งเตือนสแกน', descTH: 'เตือนสแกน 3 ครั้ง/วัน', titleEN: 'Scan reminders', descEN: '3 scans per day' },
        { key: 'rewardUpdates', icon: 'mdi:gift-outline', color: '#E91E63', titleTH: 'คูปอง / รางวัลใหม่', descTH: 'แคมเปญและรางวัลใหม่', titleEN: 'Reward updates', descEN: 'New campaigns & rewards' },
        { key: 'marketingEmail', icon: 'mdi:email-newsletter', color: '#9E9E9E', titleTH: 'ข่าวสาร & โปรโมชั่น', descTH: 'อีเมลข่าวสาร (ไม่บังคับ)', titleEN: 'Marketing & promo', descEN: 'Newsletter (optional)' },
    ] },
];

function Switch({ on, onChange, disabled }) {
    return (
        <Pressable onPress={() => !disabled && onChange?.(!on)} style={[st.switch, { backgroundColor: on ? '#1B5E37' : '#E0E0E0', opacity: disabled ? 0.5 : 1 }]}>
            <View style={[st.knob, { left: on ? 23 : 3, backgroundColor: on ? '#D5EE7A' : 'white' }]} />
        </Pressable>
    );
}

export default function NotificationSettings() {
    const navigate = useNavigate();
    const username = storage.getItem('username');
    const currentLang = getCurrentLang();
    const isTH = currentLang === 'TH';
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const [prefs, setPrefs] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!username) { navigate('/login'); return; }
        (async () => {
            try { const res = await axios.get(`${API_BASE_URL}/api/notifications/${username}`, { headers: H }); if (res.data?.success) setPrefs(res.data.preferences); }
            catch (e) { console.error(e); } finally { setLoading(false); }
        })();
    }, []);

    const updateOne = async (key, value) => {
        setPrefs((p) => ({ ...p, [key]: value }));
        try { await axios.patch(`${API_BASE_URL}/api/notifications/${username}`, { [key]: value }, { headers: H }); }
        catch { setPrefs((p) => ({ ...p, [key]: !value })); toast.error(isTH ? 'อัปเดตไม่สำเร็จ' : 'Update failed'); }
    };
    const updateChannel = async (ch, value) => {
        setPrefs((p) => ({ ...p, channels: { ...(p.channels || {}), [ch]: value } }));
        try { await axios.patch(`${API_BASE_URL}/api/notifications/${username}`, { channels: { [ch]: value } }, { headers: H }); } catch {}
    };
    const updateQuietHours = async (patch) => {
        setPrefs((p) => ({ ...p, quietHours: { ...(p.quietHours || {}), ...patch } }));
        try { await axios.patch(`${API_BASE_URL}/api/notifications/${username}`, { quietHours: patch }, { headers: H }); } catch {}
    };
    const resetAll = () => {
        Alert.alert(isTH ? 'รีเซ็ตการตั้งค่า?' : 'Reset preferences?', '', [
            { text: isTH ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
            { text: isTH ? 'รีเซ็ต' : 'Reset', style: 'destructive', onPress: async () => {
                setSaving(true);
                try { const res = await axios.post(`${API_BASE_URL}/api/notifications/${username}/reset`, {}, { headers: H }); if (res.data?.success) { setPrefs(res.data.preferences); toast.success(isTH ? 'รีเซ็ตเรียบร้อย' : 'Reset done'); } }
                catch { toast.error(isTH ? 'รีเซ็ตไม่สำเร็จ' : 'Reset failed'); } finally { setSaving(false); }
            } },
        ]);
    };

    if (loading || !prefs) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}><ActivityIndicator size="large" color="#1B5E37" /></View>;

    const sections = SECTIONS(currentLang);
    const qh = prefs.quietHours || {};

    const renderItem = (it, last) => (
        <View key={it.key} style={[st.row, { borderBottomWidth: last ? 0 : 1 }]}>
            <View style={[st.rowIcon, { backgroundColor: `${it.color}26` }]}><Icon icon={it.icon} width={20} color={it.color} /></View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1B5E37' }}>{isTH ? it.titleTH : it.titleEN}</Text>
                <Text style={{ fontSize: 11, color: '#888', fontWeight: '600', marginTop: 2, lineHeight: 16 }}>{isTH ? it.descTH : it.descEN}</Text>
            </View>
            <Switch on={!!prefs[it.key]} onChange={(v) => updateOne(it.key, v)} />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#D5EE7A', '#FAFAFA']} locations={[0, 0.6]} style={{ paddingTop: 36, paddingHorizontal: 22, paddingBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Pressable onPress={() => navigate('/profile')} style={st.backBtn}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'การแจ้งเตือน' : 'Notifications'}</Text>
                        <View style={{ width: 42 }} />
                    </View>
                    <View style={st.hero}>
                        <View style={st.heroIcon}><Icon icon="mdi:bell-ring" width={22} color="#1B5E37" /></View>
                        <View>
                            <Text style={{ fontSize: 14, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'ปรับให้เหมาะกับคุณ' : 'Customize for you'}</Text>
                            <Text style={{ fontSize: 11, color: '#888', fontWeight: '600', marginTop: 2 }}>{isTH ? 'เปิด/ปิดแต่ละประเภทได้อิสระ' : 'Toggle each type independently'}</Text>
                        </View>
                    </View>
                </LinearGradient>

                {sections.map((sec, si) => (
                    <View key={si} style={{ paddingHorizontal: 22, paddingTop: 16 }}>
                        <Text style={st.secLabel}>{sec.title}</Text>
                        <View style={st.card}>{sec.items.map((it, ii) => renderItem(it, ii === sec.items.length - 1))}</View>
                    </View>
                ))}

                <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
                    <Text style={st.secLabel}>{isTH ? 'ช่องทาง' : 'CHANNELS'}</Text>
                    <View style={st.card}>
                        {[{ key: 'inApp', icon: 'mdi:cellphone-message', th: 'ในแอป', en: 'In-app' }, { key: 'push', icon: 'mdi:bell-outline', th: 'Push', en: 'Push' }, { key: 'email', icon: 'mdi:email-outline', th: 'อีเมล', en: 'Email' }].map((c, i, a) => (
                            <View key={c.key} style={[st.row, { borderBottomWidth: i < a.length - 1 ? 1 : 0 }]}>
                                <View style={[st.rowIcon, { backgroundColor: '#F1F8E9' }]}><Icon icon={c.icon} width={20} color="#2D8048" /></View>
                                <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: '#1B5E37' }}>{isTH ? c.th : c.en}</Text>
                                <Switch on={!!prefs.channels?.[c.key]} onChange={(v) => updateChannel(c.key, v)} />
                            </View>
                        ))}
                    </View>
                </View>

                <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
                    <Text style={st.secLabel}>{isTH ? 'การแจ้งเตือนทางกายภาพ' : 'PHYSICAL ALERTS'}</Text>
                    <View style={st.card}>
                        {[{ key: 'vibrate', icon: 'mdi:vibrate', th: 'การสั่น', en: 'Vibrate' }, { key: 'sound', icon: 'mdi:volume-high', th: 'เสียง', en: 'Sound' }].map((c, i, a) => (
                            <View key={c.key} style={[st.row, { borderBottomWidth: i < a.length - 1 ? 1 : 0 }]}>
                                <View style={[st.rowIcon, { backgroundColor: '#FFF3E0' }]}><Icon icon={c.icon} width={20} color="#E65100" /></View>
                                <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: '#1B5E37' }}>{isTH ? c.th : c.en}</Text>
                                <Switch on={!!prefs[c.key]} onChange={(v) => updateOne(c.key, v)} />
                            </View>
                        ))}
                    </View>
                </View>

                <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
                    <Text style={st.secLabel}>{isTH ? 'โหมดเงียบ' : 'QUIET HOURS'}</Text>
                    <View style={[st.card, { padding: 16 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[st.rowIcon, { backgroundColor: '#E3F2FD' }]}><Icon icon="mdi:moon-waning-crescent" width={20} color="#1565C0" /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1B5E37' }}>{isTH ? 'เปิดโหมดเงียบ' : 'Enable quiet hours'}</Text>
                                <Text style={{ fontSize: 11, color: '#888', fontWeight: '600', marginTop: 2 }}>{isTH ? 'ไม่แจ้งเตือนในช่วงที่กำหนด' : 'No alerts during set hours'}</Text>
                            </View>
                            <Switch on={!!qh.enabled} onChange={(v) => updateQuietHours({ enabled: v })} />
                        </View>
                        {qh.enabled && (
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F5F5F5' }}>
                                {[{ label: isTH ? 'เริ่ม' : 'Start', key: 'startHour' }, { label: isTH ? 'สิ้นสุด' : 'End', key: 'endHour' }].map((f) => (
                                    <View key={f.key} style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 11, color: '#888', fontWeight: '700', marginBottom: 4 }}>{f.label}</Text>
                                        <View style={st.stepper}>
                                            <Pressable onPress={() => updateQuietHours({ [f.key]: (((qh[f.key] || 0) + 23) % 24) })}><Icon icon="lucide:chevron-left" width={20} color="#1B5E37" /></Pressable>
                                            <Text style={{ fontSize: 16, fontWeight: '900', color: '#1B5E37' }}>{String(qh[f.key] || 0).padStart(2, '0')}:00</Text>
                                            <Pressable onPress={() => updateQuietHours({ [f.key]: (((qh[f.key] || 0) + 1) % 24) })}><Icon icon="lucide:chevron-right" width={20} color="#1B5E37" /></Pressable>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                <View style={{ paddingHorizontal: 22, paddingTop: 24 }}>
                    <Pressable onPress={resetAll} disabled={saving} style={st.resetBtn}>
                        <Icon icon="mdi:restore" width={16} color="#D32F2F" /><Text style={{ color: '#D32F2F', fontWeight: '900', fontSize: 13 }}>{isTH ? 'รีเซ็ตเป็นค่าเริ่มต้น' : 'Reset to defaults'}</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}

const st = StyleSheet.create({
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    hero: { backgroundColor: 'white', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 25, elevation: 2 },
    heroIcon: { width: 42, height: 42, backgroundColor: '#F4FDC6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    secLabel: { fontSize: 11, color: '#888', fontWeight: '900', letterSpacing: 0.5, marginBottom: 8 },
    card: { backgroundColor: 'white', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, elevation: 1 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomColor: '#F5F5F5' },
    rowIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    switch: { width: 46, height: 26, borderRadius: 20, justifyContent: 'center' },
    knob: { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 2 },
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFAFA', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 10, paddingVertical: 8 },
    resetBtn: { width: '100%', paddingVertical: 14, backgroundColor: '#FFF1F0', borderWidth: 1.5, borderColor: '#FFCDD2', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
