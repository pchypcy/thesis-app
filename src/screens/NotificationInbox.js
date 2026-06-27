import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Pressable } from "../components/Touchable";
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang } from '../utils/language';

const TYPE_META = {
    vip_trial_reminder: { icon: 'mdi:crown-outline', color: '#E89938', bg: '#FFF8E1' },
    vip_expired: { icon: 'mdi:crown-off-outline', color: '#D14545', bg: '#FFF1F0' },
    allergy: { icon: 'mdi:shield-alert', color: '#D32F2F', bg: '#FFEBEE' },
    reward: { icon: 'mdi:gift-outline', color: '#1B5E37', bg: '#F1F8E9' },
    system: { icon: 'mdi:information-outline', color: '#1565C0', bg: '#E3F2FD' },
};

export default function NotificationInbox() {
    const navigate = useNavigate();
    const username = storage.getItem('username');
    const currentLang = getCurrentLang();
    const isTH = currentLang === 'TH';
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!username) { navigate('/login'); return; }
        (async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/notifications/${username}/inbox`, { headers: H });
                if (res.data?.success) {
                    setItems(res.data.items || []);
                    if (res.data.unread > 0) axios.post(`${API_BASE_URL}/api/notifications/${username}/inbox/read`, {}, { headers: H }).catch(() => {});
                }
            } catch (err) { console.error('inbox load error:', err); }
            finally { setLoading(false); }
        })();
    }, []);

    const fmtTime = (d) => {
        const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (mins < 1) return isTH ? 'เมื่อสักครู่' : 'just now';
        if (mins < 60) return `${mins} ${isTH ? 'นาทีที่แล้ว' : 'min ago'}`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} ${isTH ? 'ชม.ที่แล้ว' : 'hr ago'}`;
        return `${Math.floor(hrs / 24)} ${isTH ? 'วันที่แล้ว' : 'days ago'}`;
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <LinearGradient colors={['#D5EE7A', '#FAFAFA']} style={{ paddingTop: 40, paddingHorizontal: 25, paddingBottom: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Pressable onPress={() => navigate(-1)} style={s.circleBtn}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'การแจ้งเตือน' : 'Notifications'}</Text>
                    <Pressable onPress={() => navigate('/notifications')} style={s.circleBtn}><Icon icon="lucide:settings" width={20} color="#1B5E37" /></Pressable>
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={{ padding: 22 }}>
                {loading ? (
                    <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator size="large" color="#1B5E37" /></View>
                ) : items.length === 0 ? (
                    <View style={s.empty}>
                        <Icon icon="solar:inbox-bold" width={56} color="#D5EE7A" />
                        <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '800', color: '#1B5E37' }}>{isTH ? 'ยังไม่มีการแจ้งเตือน' : 'No notifications yet'}</Text>
                    </View>
                ) : items.map((n) => {
                    const meta = TYPE_META[n.type] || TYPE_META.system;
                    return (
                        <View key={n._id} style={[s.item, { borderColor: n.read ? '#F0F0F0' : `${meta.color}66`, borderWidth: n.read ? 1 : 1.5 }]}>
                            {!n.read && <View style={[s.unreadDot, { backgroundColor: meta.color }]} />}
                            <View style={[s.itemIcon, { backgroundColor: meta.bg }]}><Icon icon={meta.icon} width={22} color={meta.color} /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#1B1B1B', marginBottom: 3 }}>{n.title}</Text>
                                <Text style={{ fontSize: 13, color: '#666', fontWeight: '500', lineHeight: 20 }}>{n.message}</Text>
                                <Text style={{ fontSize: 11, color: '#AAA', fontWeight: '700', marginTop: 6 }}>{fmtTime(n.createdAt)}</Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    circleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15, elevation: 2 },
    empty: { alignItems: 'center', paddingVertical: 60, backgroundColor: 'white', borderRadius: 24, borderWidth: 2, borderColor: '#EDF6E1', borderStyle: 'dashed' },
    item: { backgroundColor: 'white', borderRadius: 18, padding: 16, marginBottom: 12, flexDirection: 'row', gap: 12, alignItems: 'flex-start', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 18, elevation: 2 },
    unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4 },
    itemIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
