import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, LayoutAnimation } from "react-native";
import { Pressable } from "../components/Touchable";
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { toast } from '../components/Toast';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang, switchLanguage } from '../utils/language';
import { clearAuth } from '../utils/api';

export default function Settings() {
    const navigate = useNavigate();
    const username = storage.getItem('username');
    const currentLang = getCurrentLang();
    const isTH = currentLang === 'TH';
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const [user, setUser] = useState(null);
    const [haptic, setHaptic] = useState(() => storage.getItem('haptic') !== '0');
    const [vipStatus, setVipStatus] = useState(null);

    useEffect(() => {
        if (!username) { navigate('/login'); return; }
        axios.get(`${API_BASE_URL}/api/users/${username}`, { headers: H }).then((r) => setUser(r.data)).catch(() => {});
        axios.get(`${API_BASE_URL}/api/vip/status/${username}`, { headers: H }).then((r) => setVipStatus(r.data)).catch(() => {});
    }, [username, navigate]);

    const toggleHaptic = () => { LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity')); const next = !haptic; setHaptic(next); storage.setItem('haptic', next ? '1' : '0'); };

    const handleCancelVip = () => {
        Alert.alert(isTH ? 'ยกเลิก VIP?' : 'Cancel VIP?',
            isTH ? `ใช้งานต่อได้จนหมดอายุ (เหลือ ${vipStatus?.daysRemaining || 0} วัน) หลังจากนั้นไม่ต่ออัตโนมัติ` : `You'll keep access until expiry (${vipStatus?.daysRemaining || 0} days). Won't auto-renew.`,
            [
                { text: isTH ? 'ไม่ยกเลิก' : 'Keep', style: 'cancel' },
                { text: isTH ? 'ยกเลิก VIP' : 'Cancel VIP', style: 'destructive', onPress: async () => {
                    try {
                        const res = await axios.post(`${API_BASE_URL}/api/vip/cancel`, { username }, { headers: H });
                        if (res.data?.success) { toast.success(res.data.message); const sres = await axios.get(`${API_BASE_URL}/api/vip/status/${username}`, { headers: H }); setVipStatus(sres.data); }
                    } catch (e) { toast.error(e.response?.data?.message || (isTH ? 'ยกเลิกไม่สำเร็จ' : 'Failed')); }
                } },
            ]);
    };

    const handleLogout = () => {
        Alert.alert(isTH ? 'ออกจากระบบ?' : 'Logout?', isTH ? 'จะต้องเข้าสู่ระบบใหม่' : 'You will need to sign in again',
            [{ text: isTH ? 'ยกเลิก' : 'Cancel', style: 'cancel' }, { text: isTH ? 'ออกจากระบบ' : 'Logout', style: 'destructive', onPress: () => { clearAuth(); storage.clear(); navigate('/login'); } }]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(isTH ? 'ลบบัญชี?' : 'Delete account?', isTH ? 'ข้อมูลทั้งหมดจะถูกลบและกู้ไม่ได้' : 'All your data will be permanently deleted',
            [{ text: isTH ? 'ยกเลิก' : 'Cancel', style: 'cancel' }, { text: isTH ? 'ลบบัญชี' : 'Delete', style: 'destructive', onPress: () => toast.error(isTH ? 'ฟีเจอร์นี้อยู่ระหว่างพัฒนา' : 'Feature under development') }]);
    };

    const aboutAlert = () => Alert.alert('InGreen', `${isTH ? 'แอปดูแลสุขภาพและรักษ์โลก' : 'Health + Sustainability App'}\nv5.1 · 2026`);

    const langToggle = (
        <View style={s.langToggle}>
            {['EN', 'TH'].map((L) => (
                <Pressable key={L} onPress={() => { if (L !== currentLang) switchLanguage(L); }} style={[s.langOpt, currentLang === L && s.langActive]}>
                    <Text style={{ color: currentLang === L ? '#1B5E37' : '#888', fontWeight: '900', fontSize: 11 }}>{L}</Text>
                </Pressable>
            ))}
        </View>
    );
    const hapticToggle = (
        <Pressable onPress={toggleHaptic} style={[s.switch, { backgroundColor: haptic ? '#2D8048' : '#CCC' }]}>
            <View style={[s.knob, { left: haptic ? 23 : 3 }]} />
        </Pressable>
    );

    const sections = [
        { title: isTH ? 'บัญชี' : 'Account', items: [
            { icon: 'lucide:user', color: '#2D8048', label: isTH ? 'ชื่อผู้ใช้' : 'Username', value: user?.username || '—' },
            { icon: 'lucide:mail', color: '#1565C0', label: isTH ? 'อีเมล' : 'Email', value: user?.email || (isTH ? 'ยังไม่ตั้ง' : 'Not set') },
            { icon: 'lucide:key', color: '#7B1FA2', label: isTH ? 'เปลี่ยนรหัสผ่าน' : 'Change password', onPress: () => navigate('/change-password') },
        ] },
        { title: isTH ? 'ทั่วไป' : 'General', items: [
            { icon: 'lucide:globe', color: '#1565C0', label: isTH ? 'ภาษา' : 'Language', valueComponent: langToggle },
            { icon: 'lucide:vibrate', color: '#E89938', label: isTH ? 'สั่นเมื่อแจ้งเตือน' : 'Haptic feedback', valueComponent: hapticToggle },
            { icon: 'lucide:bell', color: '#558B2F', label: isTH ? 'การแจ้งเตือน' : 'Notifications', onPress: () => navigate('/notifications') },
        ] },
        { title: isTH ? 'สุขภาพและความปลอดภัย' : 'Health & Privacy', items: [
            { icon: 'mdi:shield-cross', color: '#D14545', label: isTH ? 'โปรไฟล์การแพ้อาหาร' : 'Allergy profile', onPress: () => navigate('/allergy-profile') },
            { icon: 'lucide:lock', color: '#1B5E37', label: isTH ? 'ข้อมูลส่วนตัวและความปลอดภัย' : 'Privacy & Security', onPress: () => navigate('/support') },
            { icon: 'mdi:transit-connection-variant', color: '#2D8048', label: isTH ? 'การเชื่อมต่อภายนอก' : 'External connections', value: isTH ? 'Green Profile API · แชร์ข้อมูลให้แอปอื่น' : 'Green Profile API · share with other apps', badge: isTH ? 'ใหม่' : 'New', onPress: () => navigate('/connections') },
        ] },
        ...(vipStatus?.isVip && vipStatus?.status !== 'cancelled' ? [{ title: isTH ? 'สมาชิก VIP' : 'VIP Membership', items: [
            { icon: 'mdi:crown', color: '#F9A825', label: isTH ? 'สถานะ' : 'Status', value: vipStatus.status === 'trial' ? (isTH ? `ทดลองใช้ • เหลือ ${vipStatus.daysRemaining} วัน` : `Trial • ${vipStatus.daysRemaining}d`) : (isTH ? `Active • เหลือ ${vipStatus.daysRemaining} วัน` : `Active • ${vipStatus.daysRemaining}d`) },
            ...(vipStatus.status === 'active' ? [{ icon: 'lucide:x-circle', color: '#D14545', label: isTH ? 'ยกเลิกสมาชิก VIP' : 'Cancel VIP', onPress: handleCancelVip }] : []),
        ] }] : []),
        { title: isTH ? 'ช่วยเหลือ' : 'Help', items: [
            { icon: 'lucide:help-circle', color: '#2196F3', label: isTH ? 'ศูนย์ช่วยเหลือ' : 'Support center', onPress: () => navigate('/support') },
            { icon: 'lucide:info', color: '#2D8048', label: isTH ? 'เกี่ยวกับ InGreen' : 'About InGreen', onPress: aboutAlert },
        ] },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#D5EE7A', '#FAFAFA']} style={s.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Pressable onPress={() => navigate('/profile')} style={s.backBtn}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'ตั้งค่า' : 'Settings'}</Text>
                        <View style={{ width: 42 }} />
                    </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 22, paddingTop: 14 }}>
                    {sections.map((sec, si) => (
                        <View key={si} style={{ marginBottom: 20 }}>
                            <Text style={s.secTitle}>{sec.title}</Text>
                            <View style={s.secCard}>
                                {sec.items.map((item, i) => (
                                    <Pressable key={i} onPress={item.onPress} disabled={!item.onPress} style={[s.row, { borderBottomWidth: i < sec.items.length - 1 ? 1 : 0, borderBottomColor: '#F5F5F5' }]}>
                                        <View style={[s.rowIcon, { backgroundColor: `${item.color}26` }]}><Icon icon={item.icon} width={20} color={item.color} /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1B5E37' }}>{item.label}</Text>
                                            {item.value ? <Text style={{ fontSize: 11, color: '#888', fontWeight: '600', marginTop: 2 }}>{item.value}</Text> : null}
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            {item.badge ? <View style={s.badge}><Text style={s.badgeText}>{item.badge}</Text></View> : null}
                                            {item.valueComponent ? item.valueComponent : item.onPress ? <Icon icon="lucide:chevron-right" width={18} color="#CCC" /> : null}
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    ))}

                    <Pressable onPress={handleLogout} style={s.logoutBtn}>
                        <Icon icon="lucide:log-out" width={16} color="#D14545" /><Text style={{ color: '#D14545', fontWeight: '900', fontSize: 14 }}>{isTH ? 'ออกจากระบบ' : 'Logout'}</Text>
                    </Pressable>

                    <View style={s.dangerZone}>
                        <Text style={{ fontSize: 11, color: '#D14545', fontWeight: '900', letterSpacing: 0.5, marginBottom: 8 }}>DANGER ZONE</Text>
                        <Pressable onPress={handleDeleteAccount} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Icon icon="lucide:trash-2" width={16} color="#D14545" /><Text style={{ fontSize: 13, fontWeight: '800', color: '#D14545' }}>{isTH ? 'ลบบัญชี' : 'Delete account'}</Text>
                            </View>
                            <Icon icon="lucide:chevron-right" width={16} color="#D14545" />
                        </Pressable>
                    </View>
                    <Text style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#AAA', fontWeight: '600' }}>InGreen v5.1 · 2026</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    header: { paddingTop: 36, paddingHorizontal: 22, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    secTitle: { fontSize: 11, color: '#888', fontWeight: '900', letterSpacing: 0.5, marginBottom: 8, paddingLeft: 4 },
    secCard: { backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 20, elevation: 2 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    badge: { backgroundColor: '#2D8048', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
    badgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },
    rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    langToggle: { flexDirection: 'row', backgroundColor: '#E0E0E0', borderRadius: 20, padding: 3 },
    langOpt: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: 15 },
    langActive: { backgroundColor: 'white' },
    switch: { width: 46, height: 26, borderRadius: 14, justifyContent: 'center' },
    knob: { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
    logoutBtn: { width: '100%', paddingVertical: 14, backgroundColor: 'white', borderWidth: 1.5, borderColor: '#FFCDD2', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
    dangerZone: { backgroundColor: '#FFF8F5', borderWidth: 1, borderColor: '#FFCDD2', borderStyle: 'dashed', borderRadius: 16, padding: 14, marginTop: 12 },
});
