import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Pressable } from "../components/Touchable";
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextInput } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang, translations } from '../utils/language';
import BottomNav from '../components/BottomNav';

export default function History() {
    const navigate = useNavigate();
    const username = storage.getItem('username');
    const currentLang = getCurrentLang();
    const t = translations[currentLang];
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const [userData, setUserData] = useState(null);
    const [vipSub, setVipSub] = useState(null);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!username) { navigate('/login'); return; }
        Promise.all([
            axios.get(`${API_BASE_URL}/api/users/${username}`, { headers: H }),
            axios.get(`${API_BASE_URL}/api/vip/status/${username}`, { headers: H }).catch(() => null),
        ]).then(([userRes, vipRes]) => { setUserData(userRes.data); setVipSub(vipRes?.data); })
          .catch((err) => console.error(err));
    }, [username, navigate]);

    const timeline = useMemo(() => {
        if (!userData) return [];
        const items = [];
        (userData.scanHistory || []).forEach((sc) => {
            const isBonus = sc.barcode === 'BONUS';
            items.push({ kind: isBonus ? 'bonus' : 'scan', date: new Date(sc.scannedAt), title: sc.productName || (isBonus ? 'Bonus' : 'Unknown product'), sub: isBonus ? (currentLang === 'TH' ? 'รับแต้มพิเศษ' : 'Bonus points') : (currentLang === 'TH' ? 'สแกนสินค้า' : 'Product scan'), points: sc.points || 0, icon: isBonus ? 'solar:gift-bold' : 'solar:scanner-bold', colorBg: isBonus ? '#FFF8E1' : '#F1F8E9', colorFg: isBonus ? '#F9A825' : '#2D8048' });
        });
        (userData.redeemHistory || []).forEach((r) => {
            items.push({ kind: 'reward', date: new Date(r.redeemedAt), title: r.merchantName, sub: r.rewardDetail || (currentLang === 'TH' ? 'แลกคูปอง' : 'Coupon'), points: -(r.pointsUsed || 0), icon: 'solar:ticket-bold', colorBg: '#FFF1F0', colorFg: '#D14545' });
        });
        (vipSub?.paymentHistory || []).forEach((p) => {
            items.push({ kind: 'vip', date: new Date(p.paidAt), title: currentLang === 'TH' ? 'อัปเกรด VIP' : 'VIP Upgrade', sub: `฿${p.amount} · ${p.method}`, points: null, amount: `฿${p.amount}`, icon: 'mdi:crown', colorBg: '#FFF3E0', colorFg: '#F57C00' });
        });
        return items.sort((a, b) => b.date - a.date);
    }, [userData, vipSub, currentLang]);

    const filtered = timeline.filter((it) => filter === 'all' || it.kind === filter).filter((it) => !search || it.title.toLowerCase().includes(search.toLowerCase()));

    const fmtDate = (d) => {
        try { return d.toLocaleDateString(currentLang === 'TH' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
        catch { return `${d.getDate()}/${d.getMonth() + 1}`; }
    };

    if (!userData) return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
            <ActivityIndicator size="large" color="#1B5E37" />
            <Text style={{ marginTop: 12, color: '#1B5E37', fontWeight: '700' }}>{t.loadingHist}</Text>
        </View>
    );

    const tabs = [
        { id: 'all', icon: 'lucide:layers', labelTH: 'ทั้งหมด', labelEN: 'All' },
        { id: 'scan', icon: 'solar:scanner-bold', labelTH: 'สแกน', labelEN: 'Scan' },
        { id: 'reward', icon: 'solar:ticket-bold', labelTH: 'คูปอง', labelEN: 'Coupons' },
        { id: 'bonus', icon: 'solar:gift-bold', labelTH: 'โบนัส', labelEN: 'Bonus' },
        { id: 'vip', icon: 'mdi:crown', labelTH: 'VIP', labelEN: 'VIP' },
    ];
    const totalEarned = timeline.filter((it) => it.kind !== 'reward' && it.kind !== 'vip' && it.points > 0).reduce((acc, i) => acc + i.points, 0);
    const totalSpent = timeline.filter((it) => it.kind === 'reward').reduce((acc, i) => acc + Math.abs(i.points), 0);

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#D5EE7A', '#FAFAFA']} style={{ paddingTop: 40, paddingHorizontal: 22, paddingBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                        <Pressable onPress={() => navigate(-1)} style={s.backBtn}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: '#1B5E37', marginLeft: 14 }}>{t.histTitle}</Text>
                    </View>
                    <View style={s.balanceCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View>
                                <Text style={{ fontSize: 11, color: '#D5EE7A', fontWeight: '800', letterSpacing: 1 }}>{t.balance}</Text>
                                <Text style={{ fontSize: 28, fontWeight: '900', color: 'white', marginTop: 2 }}>{userData.points} <Text style={{ fontSize: 13, fontWeight: '700', opacity: 0.7 }}>{t.pts}</Text></Text>
                            </View>
                            <View style={s.balanceIcon}><Icon icon="mdi:star-four-points" width={28} color="#D5EE7A" /></View>
                        </View>
                        <View style={s.miniStats}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.miniLabel}>{currentLang === 'TH' ? 'รับรวม' : 'Earned'}</Text>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#D5EE7A' }}>+{totalEarned}</Text>
                            </View>
                            <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(213,238,122,0.15)', paddingLeft: 12 }}>
                                <Text style={s.miniLabel}>{currentLang === 'TH' ? 'ใช้ไป' : 'Spent'}</Text>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFCDD2' }}>−{totalSpent}</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 22, paddingTop: 14 }}>
                    <View style={s.searchBox}>
                        <Icon icon="lucide:search" width={16} color="#888" />
                        <TextInput value={search} onChangeText={setSearch} placeholder={currentLang === 'TH' ? 'ค้นหารายการ...' : 'Search...'} placeholderTextColor="#AAA" style={s.searchInput} />
                        {search ? <Pressable onPress={() => setSearch('')}><Icon icon="lucide:x" width={14} color="#AAA" /></Pressable> : null}
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 22, paddingVertical: 12 }}>
                    {tabs.map((tb) => {
                        const active = filter === tb.id;
                        return (
                            <Pressable key={tb.id} onPress={() => setFilter(tb.id)} style={[s.tab, { backgroundColor: active ? '#1B5E37' : 'white', borderColor: active ? '#1B5E37' : '#E0E0E0' }]}>
                                <Icon icon={tb.icon} width={13} color={active ? '#D5EE7A' : '#666'} />
                                <Text style={{ color: active ? '#D5EE7A' : '#666', fontWeight: '800', fontSize: 12 }}>{currentLang === 'TH' ? tb.labelTH : tb.labelEN}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                <View style={{ paddingHorizontal: 22 }}>
                    {filtered.length === 0 ? (
                        <View style={s.empty}>
                            <Icon icon="solar:inbox-bold" width={50} color="#DDD" />
                            <Text style={{ marginTop: 10, fontSize: 14, fontWeight: '800', color: '#1B5E37' }}>{t.noHistory}</Text>
                        </View>
                    ) : filtered.map((it, i) => (
                        <View key={i} style={s.item}>
                            <View style={[s.itemIcon, { backgroundColor: it.colorBg }]}><Icon icon={it.icon} width={20} color={it.colorFg} /></View>
                            <View style={{ flex: 1 }}>
                                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: '#1B5E37' }}>{it.title}</Text>
                                <Text style={{ fontSize: 11, color: '#888', fontWeight: '600', marginTop: 2 }}>{it.sub} · {fmtDate(it.date)}</Text>
                            </View>
                            {it.amount ? (
                                <View style={[s.pointTag, { backgroundColor: '#FFF3E0' }]}><Text style={{ fontSize: 14, fontWeight: '900', color: '#F57C00' }}>{it.amount}</Text></View>
                            ) : it.points !== null && it.points !== 0 ? (
                                <View style={[s.pointTag, { backgroundColor: it.points > 0 ? '#E8F5E9' : '#FFF1F0' }]}><Text style={{ fontSize: 14, fontWeight: '900', color: it.points > 0 ? '#2D8048' : '#D14545' }}>{it.points > 0 ? '+' : ''}{it.points}</Text></View>
                            ) : null}
                        </View>
                    ))}
                </View>
            </ScrollView>
            <BottomNav active="" />
        </View>
    );
}

const s = StyleSheet.create({
    backBtn: { width: 42, height: 42, backgroundColor: 'white', borderRadius: 21, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
    balanceCard: { backgroundColor: '#1B5E37', borderRadius: 22, padding: 18, shadowColor: '#1B5E20', shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 4 },
    balanceIcon: { width: 50, height: 50, backgroundColor: 'rgba(213,238,122,0.2)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    miniStats: { flexDirection: 'row', gap: 12, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(213,238,122,0.15)' },
    miniLabel: { fontSize: 10, color: 'rgba(213,238,122,0.7)', fontWeight: '700' },
    searchBox: { backgroundColor: 'white', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 12, elevation: 1 },
    searchInput: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333', paddingVertical: 2 },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5 },
    empty: { alignItems: 'center', paddingVertical: 50, backgroundColor: 'white', borderRadius: 22, borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed', marginTop: 8 },
    item: { backgroundColor: 'white', borderRadius: 16, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F5F5F5', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 1 },
    itemIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    pointTag: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
});
