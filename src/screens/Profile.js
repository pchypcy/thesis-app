import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Linking } from "react-native";
import { Pressable } from "../components/Touchable";
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { toast } from '../components/Toast';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang, translations, switchLanguage } from '../utils/language';
import VIPUpgradeSheet from '../components/VIPUpgradeSheet';
import BottomNav from '../components/BottomNav';

export default function Profile() {
    const navigate = useNavigate();
    const currentLang = getCurrentLang();
    const t = translations[currentLang];
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const [user, setUser] = useState({ username: storage.getItem('username') || 'Loading...', points: 0, persona: storage.getItem('persona') || 'Member' });
    const [vipStatus, setVipStatus] = useState(null);
    const [showUpgradeSheet, setShowUpgradeSheet] = useState(false);
    const [nowTs, setNowTs] = useState(Date.now());   // ★ ใช้ทำนาฬิกานับถอยหลังสิทธิ์ VIP
    const [allergyCount, setAllergyCount] = useState(0);
    const [monthlySummary, setMonthlySummary] = useState(null);
    const [pendingConfirmCount, setPendingConfirmCount] = useState(0);

    const loadVipStatus = async (username) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/vip/status/${username}`, { headers: H });
            if (res.data.success) setVipStatus(res.data);
        } catch { setVipStatus({ isVip: false, status: null, daysRemaining: 0 }); }
    };

    useEffect(() => {
        const username = storage.getItem('username');
        if (!username) { navigate('/login'); return; }
        axios.get(`${API_BASE_URL}/api/users/${username}`, { headers: H }).then((res) => setUser(res.data)).catch(() => {});
        loadVipStatus(username);
        axios.get(`${API_BASE_URL}/api/health-profile/${username}`, { headers: H }).then((res) => { if (res.data?.success) setAllergyCount(res.data.profile?.allergens?.length || 0); }).catch(() => {});
        axios.get(`${API_BASE_URL}/api/coupons/pending-confirm/${username}`, { headers: H }).then((res) => setPendingConfirmCount(res.data?.total || 0)).catch(() => {});
    }, [navigate]);

    useEffect(() => {
        if (!vipStatus?.isVip) return;
        const username = storage.getItem('username');
        axios.get(`${API_BASE_URL}/api/health-report/${username}`, { headers: H }).then((res) => { if (res.data?.success) setMonthlySummary(res.data.report); }).catch(() => {});
    }, [vipStatus?.isVip]);

    // ★ เดินนาฬิกานับถอยหลังสิทธิ์ VIP (เฉพาะตอนยังมีสิทธิ์อยู่ — ไม่มีสิทธิ์ก็ไม่ต้องเปลือง)
    useEffect(() => {
        if (!vipStatus?.isVip) return;
        const t = setInterval(() => setNowTs(Date.now()), 1000);
        return () => clearInterval(t);
    }, [vipStatus?.isVip]);

    const handleSheetUpgrade = async () => {
        const username = storage.getItem('username');
        try {
            const res = await axios.post(`${API_BASE_URL}/api/vip/upgrade`, { username, amount: 69, method: 'in_app', reference: `DEMO-${Date.now()}` }, { headers: H });
            if (res.data?.success) {
                setShowUpgradeSheet(false);
                await loadVipStatus(username);
                toast.success(currentLang === 'TH' ? 'ยินดีด้วย คุณเป็น VIP แล้ว 🎉' : 'Welcome to VIP 🎉');
            }
        } catch { toast.error(currentLang === 'TH' ? 'เกิดข้อผิดพลาด กรุณาลองใหม่' : 'Something went wrong'); }
    };

    const handleLogout = () => { storage.clear(); navigate('/login'); };
    const toggleLanguage = () => switchLanguage(currentLang === 'EN' ? 'TH' : 'EN');

    const menuItems = [
        ...(pendingConfirmCount > 0 ? [{ icon: 'mdi:check-decagram-outline', label: currentLang === 'TH' ? 'รออนุมัติยอดร้านค้า' : 'Pending confirmations', link: '/confirm-orders', badge: pendingConfirmCount, urgent: true }] : []),
        { icon: 'lucide:history', label: t.menuHist, link: '/history' },
        ...(vipStatus?.isVip ? [{ icon: 'mdi:chart-donut', label: currentLang === 'TH' ? 'สมุดสุขภาพ' : 'Health Diary', link: '/sugar-tracker' }] : []),
        { icon: 'mdi:shield-cross', label: currentLang === 'TH' ? 'โปรไฟล์การแพ้อาหาร' : 'Allergy Profile', link: '/allergy-profile', badge: allergyCount },
        { icon: 'lucide:bell', label: t.menuNoti, link: '/notifications' },
        { icon: 'lucide:help-circle', label: t.menuSupport, link: '/support' },
    ];

    // ★ นับถอยหลังเวลาที่เหลือ — "1 วัน 05 ชม. 12 นาที" หรือ "05 : 12 : 33" เมื่อเหลือไม่ถึงวัน
    const fmtCountdown = (ms) => {
        if (!ms || ms <= 0) return 'หมดเวลาแล้ว';
        const sec = Math.floor(ms / 1000);
        const d = Math.floor(sec / 86400);
        const h = Math.floor((sec % 86400) / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const ss = sec % 60;
        const p = (n) => String(n).padStart(2, '0');
        return d > 0 ? `${d} วัน ${p(h)} ชม. ${p(m)} นาที` : `${p(h)} : ${p(m)} : ${p(ss)}`;
    };

    const VipCard = () => {
        if (!vipStatus) return null;
        const { isVip, status, daysRemaining, period, expiryPolicy } = vipStatus;
        if (isVip) {
            const isTrial = status === 'trial';
            const isLowDays = daysRemaining <= 5;
            const accent = isLowDays ? '#F9A825' : '#D5EE7A';
            const sub = isLowDays ? '#888' : 'rgba(255,255,255,0.7)';
            const strong = isLowDays ? '#555' : '#FFFFFF';

            // ช่วงเวลาสิทธิ์: trial → trialStartedAt–trialEndsAt / VIP จ่ายเงิน → startedAt–expiresAt
            const startRaw = isTrial ? vipStatus.trialStartedAt : vipStatus.startedAt;
            const endRaw = isTrial ? vipStatus.trialEndsAt : vipStatus.expiresAt;
            const msLeft = endRaw ? new Date(endRaw).getTime() - nowTs : 0;
            const total = (startRaw && endRaw) ? new Date(endRaw).getTime() - new Date(startRaw).getTime() : 0;
            const pct = total > 0 ? Math.min(100, Math.max(0, ((nowTs - new Date(startRaw).getTime()) / total) * 100)) : 0;

            return (
                <View style={[s.vipCard, { flexDirection: 'column', alignItems: 'stretch' }, isLowDays ? { backgroundColor: '#FFF8E1', borderWidth: 1.5, borderColor: '#FFE082' } : null]}>
                    {!isLowDays && <LinearGradient colors={['#1B5E37', '#2D8048']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}

                    {/* แถวบน: ไอคอน + ชื่อสิทธิ์ + ปุ่ม */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <View style={[s.vipIcon, { backgroundColor: isLowDays ? '#FFF3CD' : 'rgba(204,255,0,0.15)', borderColor: isLowDays ? '#FFD54F' : 'rgba(204,255,0,0.3)' }]}>
                                <Icon icon="mdi:crown" width={24} color={accent} />
                            </View>
                            <View>
                                <Text style={{ fontSize: 15, fontWeight: '900', color: accent }}>{isTrial ? 'ทดลองใช้ VIP' : 'VIP สมาชิก'}</Text>
                                <Text style={{ fontSize: 12, fontWeight: '600', color: sub }}>{period?.type || (isTrial ? 'ทดลองใช้ฟรี 3 วัน' : 'สมาชิก 30 วัน')}</Text>
                            </View>
                        </View>
                        {isLowDays ? (
                            <Pressable onPress={() => setShowUpgradeSheet(true)} style={s.vipBtn}><Text style={{ color: '#D5EE7A', fontSize: 12, fontWeight: '800' }}>ต่ออายุ</Text></Pressable>
                        ) : (
                            <Pressable onPress={() => navigate('/sugar-tracker')} style={[s.vipBtn, { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(204,255,0,0.3)' }]}><Text style={{ color: '#D5EE7A', fontSize: 12, fontWeight: '800' }}>สมุดสุขภาพ</Text></Pressable>
                        )}
                    </View>

                    {/* ★ นาฬิกานับถอยหลัง */}
                    <View style={{ alignItems: 'center', marginTop: 15 }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: sub, letterSpacing: 1 }}>เหลือเวลาอีก</Text>
                        <Text style={{ fontSize: 27, fontWeight: '900', color: accent, letterSpacing: 1.5, marginTop: 3 }}>{fmtCountdown(msLeft)}</Text>
                    </View>

                    {/* ★ แถบความคืบหน้า */}
                    <View style={{ height: 6, borderRadius: 3, marginTop: 12, overflow: 'hidden', backgroundColor: isLowDays ? '#FFECB3' : 'rgba(255,255,255,0.18)' }}>
                        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: accent }} />
                    </View>

                    {/* ★ เริ่มวันไหน / สิ้นสุดวันไหน */}
                    <View style={{ marginTop: 13, gap: 5 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: sub }}>เริ่มใช้สิทธิ์</Text>
                            <Text style={{ fontSize: 11.5, fontWeight: '800', color: strong }}>{period?.startedAtTH || '-'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 11.5, fontWeight: '700', color: sub }}>ตัดสิทธิ์</Text>
                            <Text style={{ fontSize: 11.5, fontWeight: '900', color: accent }}>{period?.endsAtTH || '-'}</Text>
                        </View>
                    </View>

                    {/* ★ อธิบายกติกาการตัดสิทธิ์ */}
                    {!!expiryPolicy && (
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: isLowDays ? '#FFE082' : 'rgba(255,255,255,0.15)' }}>
                            <Icon icon="mdi:information-outline" width={13} color={sub} />
                            <Text style={{ flex: 1, fontSize: 10.5, lineHeight: 15, fontWeight: '600', color: sub }}>{expiryPolicy}</Text>
                        </View>
                    )}
                </View>
            );
        }
        return (
            <View style={[s.vipCard, { backgroundColor: 'white', borderWidth: 1.5, borderColor: '#D5EE7A', borderStyle: 'dashed' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={[s.vipIcon, { backgroundColor: '#F4FDC6', borderWidth: 0 }]}><Icon icon="mdi:crown-outline" width={24} color="#1B5E37" /></View>
                    <View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1B5E37' }}>{status === 'expired' ? 'VIP หมดอายุแล้ว' : 'สมัคร VIP'}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#888' }}>สมุดสุขภาพ + แต้ม ×1.5 ฿69/เดือน</Text>
                    </View>
                </View>
                <Pressable onPress={() => setShowUpgradeSheet(true)} style={s.vipBtn}><Text style={{ color: '#D5EE7A', fontSize: 12, fontWeight: '800' }}>{status === 'expired' ? 'ต่ออายุ' : 'อัปเกรด'}</Text></Pressable>
            </View>
        );
    };

    const MonthlySummaryCard = () => {
        if (!vipStatus?.isVip || !monthlySummary) return null;
        const sum = monthlySummary.summary || {};
        const whoSugar = monthlySummary.whoLimits?.sugar_g || 50;
        const avgPct = whoSugar ? Math.min(100, Math.round((sum.avg_sugar_g / whoSugar) * 100)) : 0;
        const trend = monthlySummary.trend?.sugar;
        return (
            <View style={s.monthCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Icon icon="mdi:calendar-month" width={18} color="#1B5E37" />
                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#1B5E37' }}>{currentLang === 'TH' ? 'สรุปสุขภาพเดือนนี้' : 'This month'}</Text>
                        <View style={s.vipTag}><Text style={{ fontSize: 10, color: '#1B5E37', fontWeight: '900' }}>VIP</Text></View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#888', fontWeight: '700' }}>{monthlySummary.period?.monthLabel}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={s.monthStat}><Text style={[s.monthStatVal, { color: avgPct > 100 ? '#D14545' : '#1B5E37' }]}>{sum.avg_sugar_g || 0}g</Text><Text style={s.monthStatLabel}>{currentLang === 'TH' ? 'น้ำตาลเฉลี่ย' : 'Avg sugar'}</Text></View>
                    <View style={s.monthStat}><Text style={[s.monthStatVal, { color: sum.days_over_sugar > 0 ? '#E89938' : '#2D8048' }]}>{sum.days_over_sugar || 0}</Text><Text style={s.monthStatLabel}>{currentLang === 'TH' ? 'วันที่เกิน' : 'Days over'}</Text></View>
                    <View style={s.monthStat}><Text style={[s.monthStatVal, { color: '#1B5E37' }]}>{sum.adherencePct || 0}%</Text><Text style={s.monthStatLabel}>{currentLang === 'TH' ? 'สม่ำเสมอ' : 'Adherence'}</Text></View>
                </View>
                <Pressable onPress={() => { const u = storage.getItem('username'); Linking.openURL(`${API_BASE_URL}/api/health-report/${u}/html`); }} style={s.reportBtn}>
                    <Icon icon="mdi:file-pdf-box" width={14} color="#1B5E37" /><Text style={{ color: '#1B5E37', fontWeight: '900', fontSize: 12 }}>{currentLang === 'TH' ? 'ดูรายงานฉบับเต็ม' : 'View full report'}</Text>
                </Pressable>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#D5EE7A', '#FFFFFF']} style={s.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                        <Pressable onPress={() => navigate('/home')} style={s.circleBtn}><Icon icon="lucide:arrow-left" width={24} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1B5E37' }}>{t.profTitle}</Text>
                        <Pressable onPress={() => navigate('/settings')} style={s.smallBtn}><Icon icon="lucide:settings" width={20} color="#1B5E37" /></Pressable>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <View style={s.avatarWrap}>
                            <View style={s.avatar}><Icon icon="lucide:user" width={50} color="#1B5E37" /></View>
                            {vipStatus?.isVip && <View style={s.crownBadge}><Icon icon="mdi:crown" width={14} color="#D5EE7A" /></View>}
                        </View>
                        <Text style={{ fontSize: 28, fontWeight: '900', color: '#1B5E37', marginTop: 15 }}>{user.username}</Text>
                        <View style={s.personaTag}><Text style={{ color: '#D5EE7A', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>{user.persona}</Text></View>
                        <View style={s.pointBadge}><Icon icon="mdi:star-four-points" width={20} color="#F9A825" /><Text style={{ fontSize: 18, fontWeight: '900', color: '#1B5E37' }}>{user.points} {t.points}</Text></View>
                    </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 25, paddingTop: 20 }}>
                    <VipCard />
                    <MonthlySummaryCard />
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#1B5E37', marginBottom: 16, marginTop: 4 }}>{t.accSettings}</Text>
                    <View style={s.menuCard}>
                        <Pressable onPress={toggleLanguage} style={[s.menuRow, { backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                                <View style={[s.menuIcon, { backgroundColor: '#E3F2FD' }]}><Icon icon="lucide:globe" width={20} color="#1565C0" /></View>
                                <Text style={{ fontSize: 16, color: '#333', fontWeight: '700' }}>{t.langLabel}</Text>
                            </View>
                            <View style={s.langToggle}>
                                <View style={[s.langOpt, currentLang === 'EN' && s.langActive]}><Text style={{ color: currentLang === 'EN' ? '#1B5E37' : '#888', fontWeight: '800', fontSize: 12 }}>EN</Text></View>
                                <View style={[s.langOpt, currentLang === 'TH' && s.langActive]}><Text style={{ color: currentLang === 'TH' ? '#1B5E37' : '#888', fontWeight: '800', fontSize: 12 }}>TH</Text></View>
                            </View>
                        </Pressable>
                        {menuItems.map((item, index) => (
                            <Pressable key={index} onPress={() => navigate(item.link)} style={[s.menuRow, { backgroundColor: item.urgent ? '#FFF8F5' : 'white', borderBottomWidth: index !== menuItems.length - 1 ? 1 : 0, borderBottomColor: '#F5F5F5' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                                    <View style={[s.menuIcon, { backgroundColor: item.urgent ? '#FFE0B2' : '#F1F8E9' }]}><Icon icon={item.icon} width={20} color={item.urgent ? '#E65100' : '#2D8048'} /></View>
                                    <Text style={{ fontSize: 16, color: item.urgent ? '#E65100' : '#333', fontWeight: item.urgent ? '900' : '700' }}>{item.label}</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    {item.badge > 0 && <View style={[s.menuBadge, { backgroundColor: item.urgent ? '#FF6F00' : '#FFEBEE' }]}><Text style={{ color: item.urgent ? 'white' : '#D14545', fontSize: 11, fontWeight: '900' }}>{item.badge}</Text></View>}
                                    <Icon icon="lucide:chevron-right" width={20} color="#CCC" />
                                </View>
                            </Pressable>
                        ))}
                    </View>
                    <Pressable onPress={handleLogout} style={s.logoutBtn}>
                        <Icon icon="lucide:log-out" width={20} color="#F5222D" /><Text style={{ color: '#F5222D', fontSize: 16, fontWeight: '900' }}>{t.logout}</Text>
                    </Pressable>
                </View>
            </ScrollView>

            <VIPUpgradeSheet open={showUpgradeSheet} onClose={() => setShowUpgradeSheet(false)} onUpgrade={handleSheetUpgrade} trialDaysLeft={vipStatus?.status === 'trial' ? vipStatus?.daysRemaining : null} price={69} />
            <BottomNav active="/profile" />
        </View>
    );
}

const s = StyleSheet.create({
    header: { paddingTop: 40, paddingHorizontal: 25, paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    circleBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
    smallBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
    dot: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, paddingHorizontal: 4, backgroundColor: '#D14545', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
    dotText: { color: 'white', fontSize: 9, fontWeight: '900' },
    avatarWrap: { width: 110, height: 110, borderRadius: 60, backgroundColor: 'white', padding: 5, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 35, elevation: 4 },
    avatar: { flex: 1, borderRadius: 55, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' },
    crownBadge: { position: 'absolute', bottom: -4, right: -4, width: 30, height: 30, backgroundColor: '#1B5E37', borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'white' },
    personaTag: { backgroundColor: '#1B5E37', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, marginTop: 12, marginBottom: 15 },
    pointBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 2 },
    vipCard: { borderRadius: 20, paddingVertical: 18, paddingHorizontal: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', shadowColor: '#1B5E20', shadowOpacity: 0.2, shadowRadius: 25, elevation: 3 },
    vipIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    vipBtn: { backgroundColor: '#1B5E37', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
    monthCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EDF6E1', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 20, elevation: 2 },
    vipTag: { backgroundColor: '#F4FDC6', paddingVertical: 2, paddingHorizontal: 7, borderRadius: 10 },
    monthStat: { flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: '#FAFAFA', borderRadius: 12 },
    monthStatVal: { fontSize: 20, fontWeight: '900' },
    monthStatLabel: { fontSize: 10, color: '#888', fontWeight: '700' },
    reportBtn: { marginTop: 10, paddingVertical: 10, borderWidth: 1.5, borderColor: '#D5EE7A', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    menuCard: { backgroundColor: 'white', borderRadius: 25, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 40, elevation: 2 },
    menuRow: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    menuIcon: { width: 45, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    menuBadge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20 },
    langToggle: { flexDirection: 'row', backgroundColor: '#E0E0E0', borderRadius: 20, padding: 4 },
    langOpt: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 15 },
    langActive: { backgroundColor: 'white' },
    logoutBtn: { width: '100%', paddingVertical: 18, marginTop: 25, backgroundColor: '#FFF1F0', borderWidth: 1, borderColor: '#FFA39E', borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
