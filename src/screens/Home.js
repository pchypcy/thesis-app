import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, StyleSheet } from "react-native";
import { Pressable } from "../components/Touchable";
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Text, TextInput } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang, translations } from '../utils/language';
import { theme } from '../utils/theme';
import TrialBanner from '../components/TrialBanner';
import VIPUpgradeSheet from '../components/VIPUpgradeSheet';

export default function Home() {
    const navigate = useNavigate();
    const [user, setUser] = useState({ username: 'User', points: 0, persona: 'Newbie', scanHistory: [] });
    const [nearbyShops, setNearbyShops] = useState([]);
    const [vipStatus, setVipStatus] = useState(null);
    const [showUpgradeSheet, setShowUpgradeSheet] = useState(false);
    const [allergyCount, setAllergyCount] = useState(0);

    const currentLang = getCurrentLang();
    const t = translations[currentLang];

    useEffect(() => {
        const username = storage.getItem('username');
        if (!username) { navigate('/login'); return; }

        axios.get(`${API_BASE_URL}/api/users/${username}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then((res) => setUser(res.data)).catch(() => setUser((u) => ({ ...u, username })));

        axios.get(`${API_BASE_URL}/api/vip/status/${username}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then((res) => {
                if (res.data?.success) setVipStatus(res.data);
                if (res.data?.success && res.data?.status === null) {
                    axios.post(`${API_BASE_URL}/api/vip/start-trial`, { username }, { headers: { 'ngrok-skip-browser-warning': 'true' } })
                        .then((r) => {
                            if (r.data?.success) setVipStatus({ isVip: r.data.isVip, status: r.data.status, trialEndsAt: r.data.trialEndsAt, daysRemaining: 3 });
                        }).catch(() => {});
                }
            }).catch(() => {});

        axios.get(`${API_BASE_URL}/api/health-profile/${username}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then((res) => { if (res.data?.success) setAllergyCount(res.data.profile?.allergens?.length || 0); })
            .catch(() => {});

        axios.get(`${API_BASE_URL}/api/rewards`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then((res) => {
                const rewardsData = res.data;
                const uniqueShops = [];
                const shopNamesSet = new Set();
                rewardsData.forEach((reward) => {
                    if (!shopNamesSet.has(reward.shopName)) {
                        shopNamesSet.add(reward.shopName);
                        uniqueShops.push({
                            id: reward.shopName, name: reward.shopName,
                            type: `${reward.category || 'Shop'} • 1.5 km`,
                            img: reward.image, tag: reward.tag || 'Eco-Friendly',
                            desc: reward.description || 'ร้านค้ารักษ์โลก', time: '10:00 - 20:00',
                        });
                    }
                });
                setNearbyShops(uniqueShops);
            })
            .catch((err) => console.error('Error fetching shops:', err));
    }, [navigate]);

    const dailyTarget = 3;
    const currentProgress = user.scanHistory ? user.scanHistory.length : 0;
    const progressPercent = Math.min((currentProgress / dailyTarget) * 100, 100);
    const isGoalCompleted = currentProgress >= dailyTarget;

    const handleVipUpgrade = async () => {
        const username = storage.getItem('username');
        try {
            const res = await axios.post(`${API_BASE_URL}/api/vip/upgrade`, {
                username, amount: 69, method: 'in_app', reference: `DEMO-${Date.now()}`,
            }, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            if (res.data?.success) {
                setShowUpgradeSheet(false);
                setVipStatus({ isVip: true, status: 'active', daysRemaining: res.data.daysRemaining || 30 });
            }
        } catch (err) { console.error(err); }
    };

    const QUICK_ACTIONS = [
        { to: '/scan', small: t.start || 'เริ่มเลย', label: t.scanNow || 'สแกนเลย', icon: 'lucide:scan-barcode', bgIcon: 'lucide:scan', bg: '#E8F5E9', color: '#1B5E37', small_color: '#4CAF50', badge: null },
        { to: '/scan-receipt', small: currentLang === 'TH' ? 'ลองใช้เลย' : 'Try AI', small_color: '#2D8048', badge: 'AI', label: currentLang === 'TH' ? 'สแกนใบเสร็จ' : 'Scan Receipt', icon: 'lucide:receipt-text', bgIcon: 'lucide:receipt', bg: '#F6FAEC', color: '#2D8048' },
        { to: '/history', small: currentLang === 'TH' ? 'ดูย้อนหลัง' : 'View past', label: t.viewHistory || 'ประวัติ', icon: 'lucide:history', bgIcon: 'lucide:history', bg: '#FFF8E1', color: '#F9A825', small_color: '#F9A825', badge: null },
        { to: '/community', small: currentLang === 'TH' ? 'ช่วยกันตรวจ' : 'Help verify', label: currentLang === 'TH' ? 'ชุมชนตรวจสอบ' : 'Community', icon: 'solar:users-group-rounded-bold', bgIcon: 'solar:users-group-rounded-bold', bg: '#E3F2FD', color: '#1565C0', small_color: '#1565C0', badge: null },
    ];

    const NAV = [
        { to: '/home', icon: 'majesticons:home-line', label: t.navHome, active: true },
        { to: '/dashboard', icon: 'ion:trophy-outline', label: t.navRank },
        { to: '/scan', icon: 'lucide:scan-barcode', center: true },
        { to: '/rewards', icon: 'mynaui:gift', label: t.navRewards },
        { to: '/profile', icon: 'lucide:user', label: t.navProfile, size: 26 },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <LinearGradient colors={theme.gradients.homeHeader} locations={[0, 0.35]} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                        <View style={styles.avatar}><Icon icon="lucide:user" width={28} color="#CCC" /></View>
                        <View>
                            <Text style={styles.welcome}>{t.welcome}</Text>
                            <Text style={styles.username}>{user.username}</Text>
                        </View>
                    </View>
                    <View style={styles.pointPill}>
                        <Icon icon="mdi:star-four-points" width={16} color="#F9A825" />
                        <Text style={styles.pointText}>{user.points}</Text>
                    </View>
                </View>

                {/* Headline + search */}
                <View style={{ paddingHorizontal: 25, paddingBottom: 20 }}>
                    <Text style={styles.headline}>{t.headline1}{'\n'}{t.headline1_br}</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={styles.searchBox}>
                            <TextInput placeholder={t.searchPlaceholder} placeholderTextColor="#999" style={styles.searchInput} />
                        </View>
                        <Pressable onPress={() => navigate('/rewards')} style={styles.searchBtn}>
                            <Icon icon="lucide:search" width={16} color="#D5EE7A" />
                            <Text style={styles.searchBtnText}>{t.searchBtn}</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Daily goal card */}
                <View style={{ paddingHorizontal: 25, marginBottom: 28 }}>
                    <View style={styles.goalCard}>
                        <View style={{ flexShrink: 1 }}>
                            <Text style={styles.goalTitle}>Label Detective</Text>
                            <Text style={styles.goalSub}>{t.scanItemsToday}: {dailyTarget}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 8 }}>
                            <View style={[styles.goalBadge, { backgroundColor: isGoalCompleted ? '#E8F5E9' : '#FFF3E0' }]}>
                                <Text style={[styles.goalBadgeText, { color: isGoalCompleted ? '#2D8048' : '#F57C00' }]}>{isGoalCompleted ? 'COMPLETED' : 'GOAL'}</Text>
                            </View>
                            <View style={styles.goalBarBg}>
                                <View style={[styles.goalBarFill, { width: `${progressPercent}%` }]} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Trial banner */}
                {vipStatus && (vipStatus.status === 'trial' || vipStatus.status === 'expired' || (vipStatus.status === 'active' && vipStatus.daysRemaining <= 7)) && (
                    <View style={{ paddingHorizontal: 25, marginBottom: 20 }}>
                        <TrialBanner vipStatus={vipStatus} onUpgradeClick={() => setShowUpgradeSheet(true)} />
                    </View>
                )}

                {/* Allergy shield */}
                <View style={{ paddingHorizontal: 25, marginBottom: 20 }}>
                    <Pressable onPress={() => navigate('/allergy-profile')}>
                        <LinearGradient
                            colors={allergyCount > 0 ? theme.gradients.allergyOn : theme.gradients.allergyOff}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={[styles.allergyCard, { borderColor: allergyCount > 0 ? '#FFCDD2' : '#E0E0E0' }]}>
                            <View style={[styles.allergyIcon, { backgroundColor: allergyCount > 0 ? '#D32F2F' : '#1B5E37' }]}>
                                <Icon icon={allergyCount > 0 ? 'mdi:shield-cross' : 'mdi:shield-plus-outline'} width={24} color={allergyCount > 0 ? 'white' : '#D5EE7A'} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <Text style={[styles.allergyTitle, { color: allergyCount > 0 ? '#B71C1C' : '#1B5E37' }]}>{currentLang === 'TH' ? 'โล่ป้องกันภูมิแพ้' : 'Allergy Shield'}</Text>
                                    <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>FREE</Text></View>
                                </View>
                                <Text style={styles.allergyDesc}>
                                    {allergyCount > 0
                                        ? (currentLang === 'TH' ? `เปิดอยู่ · เฝ้าระวัง ${allergyCount} ชนิด` : `Active · monitoring ${allergyCount} allergens`)
                                        : (currentLang === 'TH' ? 'แตะเพื่อเปิดใช้งานการแจ้งเตือนสารก่อภูมิแพ้' : 'Tap to enable allergen alerts')}
                                </Text>
                            </View>
                            <Icon icon="lucide:chevron-right" width={20} color={allergyCount > 0 ? '#D32F2F' : '#1B5E37'} />
                        </LinearGradient>
                    </Pressable>
                </View>

                {/* Quick actions */}
                <View style={{ paddingHorizontal: 25, marginBottom: 32 }}>
                    <Text style={styles.sectionTitle}>{t.quickActions}</Text>
                    <View style={styles.quickGrid}>
                        {QUICK_ACTIONS.map((a, i) => (
                            <Pressable key={i} onPress={() => navigate(a.to)} style={[styles.quickCard, { backgroundColor: a.bg }]}>
                                <Icon icon={a.bgIcon} style={{ position: 'absolute', right: -10, bottom: -10, fontSize: 100, color: a.color, opacity: 0.06 }} />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={styles.quickIconBox}><Icon icon={a.icon} width={24} color={a.color} /></View>
                                    {a.badge && <View style={[styles.quickBadge, { backgroundColor: a.color }]}><Text style={styles.quickBadgeText}>{a.badge}</Text></View>}
                                </View>
                                <View>
                                    {a.small && <Text style={[styles.quickSmall, { color: a.small_color || a.color }]}>{a.small}</Text>}
                                    <Text style={styles.quickLabel}>{a.label}</Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Nearby shops */}
                <View style={{ paddingHorizontal: 25 }}>
                    <View style={styles.shopHeader}>
                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t.nearbyShops}</Text>
                        <Pressable onPress={() => navigate('/rewards')}><Text style={styles.viewAll}>{t.viewAll}</Text></Pressable>
                    </View>
                    {nearbyShops.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 15, paddingBottom: 10 }}>
                            {nearbyShops.map((item, index) => (
                                <Pressable key={index} onPress={() => navigate('/shop-detail', { state: { shop: item } })} style={{ width: 160 }}>
                                    <View style={styles.shopImgWrap}>
                                        <View style={styles.shopArrow}><Icon icon="lucide:arrow-right" width={20} color="#1B5E37" /></View>
                                        {item.img ? <Image source={{ uri: item.img }} style={styles.shopImg} /> : <View style={[styles.shopImg, { backgroundColor: '#EEE' }]} />}
                                        <View style={styles.shopTag}><Text style={styles.shopTagText}>{item.tag}</Text></View>
                                    </View>
                                    <Text numberOfLines={1} style={styles.shopName}>{item.name}</Text>
                                    <Text style={styles.shopType}>{item.type}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={styles.loadingShops}>กำลังค้นหาร้านค้ารักษ์โลก...</Text>
                    )}
                </View>
            </ScrollView>

            {/* Bottom nav (fixed) */}
            <View style={styles.bottomNav}>
                {NAV.map((n, i) => (
                    <Pressable key={i} onPress={() => navigate(n.to)} style={styles.navItem}>
                        {n.center ? (
                            <View style={styles.navCenter}><Icon icon={n.icon} width={24} color="#1B5E37" /></View>
                        ) : (
                            <>
                                <Icon icon={n.icon} width={n.size || 24} color={n.active ? '#D5EE7A' : 'white'} style={{ opacity: n.active ? 1 : 0.6 }} />
                                <Text style={[styles.navLabel, { color: n.active ? '#D5EE7A' : 'white', opacity: n.active ? 1 : 0.6 }]}>{n.label}</Text>
                            </>
                        )}
                    </Pressable>
                ))}
            </View>

            <VIPUpgradeSheet
                open={showUpgradeSheet}
                onClose={() => setShowUpgradeSheet(false)}
                onUpgrade={handleVipUpgrade}
                trialDaysLeft={vipStatus?.status === 'trial' ? vipStatus?.daysRemaining : null}
                price={69}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    header: { paddingTop: 55, paddingHorizontal: 25, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'white', borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
    welcome: { fontSize: 13, color: '#1B5E37', opacity: 0.8, fontWeight: '600' },
    username: { fontSize: 20, color: '#1B5E37', fontWeight: '800' },
    pointPill: { backgroundColor: 'white', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
    pointText: { fontSize: 14, fontWeight: '800', color: '#1B5E37' },
    headline: { fontSize: 28, fontWeight: '800', color: '#1B5E37', marginBottom: 20, lineHeight: 34 },
    searchBox: { flex: 1, backgroundColor: 'white', borderRadius: 50, paddingHorizontal: 20, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
    searchInput: { fontSize: 15, fontWeight: '500', color: '#555', paddingVertical: 15 },
    searchBtn: { backgroundColor: '#1B5E37', borderRadius: 50, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
    searchBtnText: { fontWeight: '700', fontSize: 13, color: '#D5EE7A' },
    goalCard: { backgroundColor: 'white', borderRadius: 25, paddingVertical: 20, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 40, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
    goalTitle: { fontSize: 17, fontWeight: '800', color: '#1B5E37', marginBottom: 8 },
    goalSub: { fontSize: 13, color: '#888', fontWeight: '600' },
    goalBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
    goalBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    goalBarBg: { width: 100, height: 8, backgroundColor: '#F5F5F5', borderRadius: 10, overflow: 'hidden' },
    goalBarFill: { height: '100%', backgroundColor: '#D5EE7A', borderRadius: 10 },
    allergyCard: { borderRadius: 20, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 25, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
    allergyIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    allergyTitle: { fontSize: 14, fontWeight: '900' },
    freeBadge: { backgroundColor: 'white', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    freeBadgeText: { fontSize: 9, fontWeight: '900', color: '#1B5E37', letterSpacing: 0.5 },
    allergyDesc: { fontSize: 11, color: '#666', fontWeight: '600', marginTop: 2 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1B5E37', marginBottom: 15 },
    quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 15 },
    quickCard: { width: '48%', borderRadius: 25, padding: 20, height: 150, justifyContent: 'space-between', overflow: 'hidden' },
    quickIconBox: { backgroundColor: 'white', width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
    quickBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8 },
    quickBadgeText: { fontSize: 10, color: 'white', fontWeight: '900', letterSpacing: 0.5 },
    quickSmall: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
    quickLabel: { fontSize: 17, fontWeight: '800', color: '#1B5E37', lineHeight: 21, marginTop: 2 },
    shopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
    viewAll: { fontSize: 13, color: '#1B5E37', fontWeight: '700' },
    shopImgWrap: { backgroundColor: '#FAFAFA', borderRadius: 25, height: 180, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
    shopArrow: { position: 'absolute', top: 10, right: 10, width: 35, height: 35, backgroundColor: '#D5EE7A', borderRadius: 18, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    shopImg: { width: '100%', height: '100%' },
    shopTag: { position: 'absolute', bottom: 10, left: 12, backgroundColor: '#1B5E37', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    shopTagText: { color: '#D5EE7A', fontSize: 10, fontWeight: '900' },
    shopName: { fontSize: 15, color: '#1B5E37', fontWeight: '800', marginTop: 10, marginBottom: 2 },
    shopType: { fontSize: 12, color: '#9E9E9E', fontWeight: '500' },
    loadingShops: { fontSize: 14, color: '#888', textAlign: 'center', paddingVertical: 20 },
    bottomNav: { position: 'absolute', bottom: 30, alignSelf: 'center', width: '85%', maxWidth: 380, backgroundColor: '#1B5E37', borderRadius: 40, paddingVertical: 12, paddingHorizontal: 10, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: 20 }, elevation: 10 },
    navItem: { flex: 1, alignItems: 'center' },
    navCenter: { width: 45, height: 45, backgroundColor: '#D5EE7A', borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
    navLabel: { fontSize: 10, marginTop: 3, fontWeight: '800' },
});
