import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from "react-native";
import { Pressable } from "../components/Touchable";
import Svg, { Circle, G } from 'react-native-svg';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang, translations } from '../utils/language';
import BottomNav from '../components/BottomNav';

export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState({ username: storage.getItem('username') || 'Loading...', points: 0, persona: storage.getItem('persona') || 'Green Rookie', scanHistory: [] });
    const [impactStats, setImpactStats] = useState({ chemicals: 0, plastics: 0 });
    const [unreadCount, setUnreadCount] = useState(0);
    const currentLang = getCurrentLang();
    const t = translations[currentLang];
    const H = { 'ngrok-skip-browser-warning': 'true' };

    useEffect(() => {
        const username = storage.getItem('username');
        if (!username) { navigate('/login'); return; }
        axios.get(`${API_BASE_URL}/api/users/${username}`, { headers: H })
            .then((res) => { setUser(res.data); if (res.data.persona) storage.setItem('persona', res.data.persona); if (res.data.impactStats) setImpactStats(res.data.impactStats); })
            .catch((err) => console.error(err));
        axios.get(`${API_BASE_URL}/api/notifications/${username}/inbox`, { headers: H })
            .then((res) => { if (res.data?.success) setUnreadCount(res.data.unread || 0); })
            .catch(() => {});
    }, [navigate]);

    const currentPoints = user.points || 0;
    let currentLevel = 1, nextLevelTarget = 200;
    if (currentPoints >= 1000) { currentLevel = 4; nextLevelTarget = 1000; }
    else if (currentPoints >= 500) { currentLevel = 3; nextLevelTarget = 1000; }
    else if (currentPoints >= 200) { currentLevel = 2; nextLevelTarget = 500; }
    const progressPercent = currentLevel === 4 ? 100 : Math.min((currentPoints / nextLevelTarget) * 100, 100);
    const pointsNeeded = currentLevel === 4 ? 0 : Math.max(nextLevelTarget - currentPoints, 0);

    const badges = [
        { id: 1, icon: 'mdi:magnify-scan', color: '#1B5E37', bg: '#F4FDC6', title: t.badge1, reqLevel: 1 },
        { id: 2, icon: 'mdi:recycle', color: '#1565C0', bg: '#E3F2FD', title: t.badge2, reqLevel: 2 },
        { id: 3, icon: 'mdi:leaf-circle', color: '#E65100', bg: '#FFF3E0', title: t.badge3, reqLevel: 3 },
        { id: 4, icon: 'mdi:earth', color: '#4A148C', bg: '#E1BEE7', title: t.badge4, reqLevel: 4 },
    ];

    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#D5EE7A', '#FAFAFA']} style={{ paddingTop: 40, paddingHorizontal: 25, paddingBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 }}>
                        <Pressable onPress={() => navigate('/home')} style={s.circleBtn}><Icon icon="lucide:arrow-left" width={24} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1B5E37' }}>{t.dashTitle}</Text>
                        <Pressable onPress={() => navigate('/inbox')} style={s.circleBtn}>
                            <Icon icon="lucide:bell" width={22} color="#1B5E37" />
                            {unreadCount > 0 && <View style={s.badgeDot}><Text style={s.badgeDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>}
                        </Pressable>
                    </View>
                    <View style={s.pointsCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: 'white' }}>{user.username}</Text>
                            <View style={s.personaTag}><Icon icon="mdi:star" width={12} color="#1B5E37" /><Text style={{ color: '#1B5E37', fontSize: 11, fontWeight: '900' }}>{user.persona}</Text></View>
                        </View>
                        <View style={{ marginTop: 25 }}>
                            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 5 }}>{t.balance}</Text>
                            <Text style={{ fontSize: 42, fontWeight: '900', color: '#D5EE7A' }}>{user.points} <Text style={{ fontSize: 16, color: 'white', fontWeight: '700' }}>{t.pts}</Text></Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Donut */}
                <View style={{ paddingHorizontal: 25, marginBottom: 30 }}>
                    <View style={s.donutCard}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: '#1E293B', width: '100%' }}>{currentLang === 'TH' ? 'ความคืบหน้าเลเวล' : 'Level Progress'}</Text>
                        <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '500', width: '100%', marginBottom: 20 }}>
                            {currentLevel === 4 ? t.maxLevelReach : `${t.scanMore1}${Math.ceil(pointsNeeded / 30)}${t.scanMore2}`}
                        </Text>
                        <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
                            <Svg width={160} height={160}>
                                <G rotation={-90} origin="80, 80">
                                    <Circle cx={80} cy={80} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={18} />
                                    <Circle cx={80} cy={80} r={radius} fill="none" stroke="#D5EE7A" strokeWidth={18} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
                                </G>
                            </Svg>
                            <View style={s.donutCenter}>
                                <Text style={{ fontSize: 12, color: '#94A3B8', fontWeight: '800', letterSpacing: 1 }}>LEVEL</Text>
                                <Text style={{ fontSize: 38, color: '#1B5E37', fontWeight: '900' }}>{currentLevel}</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 25, paddingHorizontal: 10 }}>
                            <View style={{ alignItems: 'center', flex: 1 }}>
                                <Text style={s.legendLabel}>{currentLang === 'TH' ? 'แต้มปัจจุบัน' : 'Current'}</Text>
                                <Text style={s.legendVal}>{currentPoints}</Text>
                            </View>
                            <View style={{ width: 1, backgroundColor: '#F1F5F9' }} />
                            <View style={{ alignItems: 'center', flex: 1 }}>
                                <Text style={[s.legendLabel, { textAlign: 'center' }]}>{currentLang === 'TH' ? 'เป้าหมายต่อไป:' : 'Next target:'}{'\n'}Core Lohas</Text>
                                <Text style={s.legendVal}>{currentLevel === 4 ? 'MAX' : nextLevelTarget}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Impact */}
                <View style={{ paddingHorizontal: 25, marginBottom: 35 }}>
                    <Text style={s.section}>{t.impactTitle}</Text>
                    <View style={{ flexDirection: 'row', gap: 15 }}>
                        <View style={[s.impactCard, { backgroundColor: '#E8F5E9' }]}>
                            <View style={s.impactIcon}><Icon icon="mdi:flask-off-outline" width={24} color="#2D8048" /></View>
                            <Text style={{ fontSize: 24, fontWeight: '900', color: '#1B5E37' }}>{impactStats.chemicals}</Text>
                            <Text style={{ fontSize: 11, color: '#4CAF50', fontWeight: '700', textAlign: 'center' }}>{t.chemAvoided}</Text>
                        </View>
                        <View style={[s.impactCard, { backgroundColor: '#FFF3E0' }]}>
                            <View style={s.impactIcon}><Icon icon="mdi:bottle-soda-classic-outline" width={24} color="#EF6C00" /></View>
                            <Text style={{ fontSize: 24, fontWeight: '900', color: '#E65100' }}>{impactStats.plastics}</Text>
                            <Text style={{ fontSize: 11, color: '#FF9800', fontWeight: '700', textAlign: 'center' }}>{t.plasticSaved}</Text>
                        </View>
                    </View>
                </View>

                {/* Badges */}
                <View style={{ paddingHorizontal: 25 }}>
                    <Text style={s.section}>{t.badgesTitle}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 15, paddingBottom: 10 }}>
                        {badges.map((badge, i) => {
                            const unlocked = currentLevel >= badge.reqLevel;
                            return (
                                <View key={i} style={[s.badgeCard, { backgroundColor: unlocked ? 'white' : '#FAFAFA', borderColor: unlocked ? badge.bg : '#E0E0E0', borderStyle: unlocked ? 'solid' : 'dashed', opacity: unlocked ? 1 : 0.7 }]}>
                                    <View style={[s.badgeIcon, { backgroundColor: unlocked ? badge.bg : '#EEEEEE' }]}>
                                        <Icon icon={unlocked ? badge.icon : 'mdi:lock'} width={unlocked ? 30 : 24} color={unlocked ? badge.color : '#BDBDBD'} />
                                    </View>
                                    <Text style={{ fontSize: 13, fontWeight: '900', color: unlocked ? '#333' : '#9E9E9E', textAlign: 'center' }}>{unlocked ? badge.title : t.badgeLocked}</Text>
                                    <Text style={{ fontSize: 10, color: unlocked ? '#888' : '#BDBDBD', fontWeight: '700' }}>{t.lvl} {badge.reqLevel}</Text>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </ScrollView>
            <BottomNav active="/dashboard" />
        </View>
    );
}

const s = StyleSheet.create({
    circleBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
    badgeDot: { position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#D14545', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
    badgeDotText: { color: 'white', fontSize: 10, fontWeight: '900' },
    pointsCard: { backgroundColor: '#1B5E37', borderRadius: 30, padding: 25, shadowColor: '#1B5E20', shadowOpacity: 0.25, shadowRadius: 35, shadowOffset: { width: 0, height: 15 }, elevation: 5 },
    personaTag: { backgroundColor: '#D5EE7A', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
    donutCard: { backgroundColor: 'white', borderRadius: 30, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 40, elevation: 2 },
    donutCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    legendLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700', marginBottom: 4 },
    legendVal: { fontSize: 18, color: '#1E293B', fontWeight: '900' },
    section: { fontSize: 18, fontWeight: '900', color: '#1B5E37', marginBottom: 20 },
    impactCard: { flex: 1, borderRadius: 25, padding: 20, alignItems: 'center', gap: 10 },
    impactIcon: { width: 50, height: 50, backgroundColor: 'white', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    badgeCard: { width: 120, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 10, alignItems: 'center', gap: 10, borderWidth: 2 },
    badgeIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
