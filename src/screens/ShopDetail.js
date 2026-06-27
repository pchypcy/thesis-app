import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, StyleSheet, ActivityIndicator } from "react-native";
import { Pressable } from "../components/Touchable";
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate, useLocation } from '../shims/router';
import { API_BASE_URL } from '../config';
import { getCurrentLang, translations } from '../utils/language';
import BottomNav from '../components/BottomNav';

export default function ShopDetail() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const shop = state?.shop;
    const currentLang = getCurrentLang();
    const t = translations[currentLang];

    const [shopRewards, setShopRewards] = useState([]);
    const [loadingRewards, setLoadingRewards] = useState(true);

    useEffect(() => {
        if (!shop?.name) return;
        axios.get(`${API_BASE_URL}/api/rewards`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then((res) => {
                const all = res.data || [];
                const target = (shop.name || '').toLowerCase().trim();
                setShopRewards(all.filter((r) => {
                    const rName = (r.shopName || '').toLowerCase().trim();
                    return rName === target || rName.includes(target) || target.includes(rName);
                }));
            })
            .catch(() => setShopRewards([]))
            .finally(() => setLoadingRewards(false));
    }, [shop?.name]);

    useEffect(() => { if (!shop) navigate('/home'); }, [shop]);
    if (!shop) return null;

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
                <View style={{ height: 350 }}>
                    {shop.img ? <Image source={{ uri: shop.img }} style={{ width: '100%', height: '100%' }} /> : <View style={{ flex: 1, backgroundColor: '#C8E6C9' }} />}
                    <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%' }} />
                    <Pressable onPress={() => navigate(-1)} style={s.backBtn}><Icon icon="lucide:arrow-left" width={24} color="#1B5E37" /></Pressable>
                </View>

                <View style={s.content}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                        <View style={{ flex: 1 }}>
                            <View style={s.tagChip}><Text style={{ color: '#2D8048', fontSize: 12, fontWeight: '800' }}>{shop.tag}</Text></View>
                            <Text style={{ fontSize: 28, fontWeight: '900', color: '#1B5E37', lineHeight: 34 }}>{shop.name}</Text>
                            <Text style={{ fontSize: 14, color: '#888', fontWeight: '600', marginTop: 5 }}>{shop.type}</Text>
                        </View>
                        <View style={s.pinBox}><Icon icon="lucide:map-pin" width={24} color="#1B5E37" /></View>
                    </View>

                    <View style={s.divider} />

                    <View style={{ flexDirection: 'row', gap: 15, marginBottom: 30 }}>
                        <View style={s.infoCard}>
                            <View style={[s.infoIcon, { backgroundColor: '#FFF3E0' }]}><Icon icon="lucide:clock" color="#F57C00" width={20} /></View>
                            <View><Text style={s.infoLabel}>{t.openTime}</Text><Text style={s.infoVal}>{shop.time}</Text></View>
                        </View>
                        <View style={s.infoCard}>
                            <View style={[s.infoIcon, { backgroundColor: '#E3F2FD' }]}><Icon icon="lucide:navigation" color="#1565C0" width={20} /></View>
                            <View><Text style={s.infoLabel}>{t.distance}</Text><Text style={s.infoVal}>{shop.type.split('•')[1]?.trim() || 'N/A'}</Text></View>
                        </View>
                    </View>

                    <Text style={s.section}>{t.aboutShop}</Text>
                    <Text style={{ fontSize: 15, color: '#555', lineHeight: 26, fontWeight: '500', marginBottom: 40 }}>{shop.desc}</Text>

                    <View style={{ marginBottom: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Icon icon="mdi:ticket-percent-outline" width={22} color="#1B5E37" />
                                <Text style={[s.section, { marginBottom: 0 }]}>{currentLang === 'TH' ? 'คูปองที่ร้านนี้แจก' : 'Coupons'}</Text>
                            </View>
                            {!loadingRewards && shopRewards.length > 0 && <View style={s.countTag}><Text style={{ color: '#1B5E37', fontSize: 11, fontWeight: '900' }}>{shopRewards.length} {currentLang === 'TH' ? 'แคมเปญ' : 'campaigns'}</Text></View>}
                        </View>
                        {loadingRewards ? (
                            <View style={{ paddingVertical: 30, alignItems: 'center' }}><ActivityIndicator color="#1B5E37" /></View>
                        ) : shopRewards.length === 0 ? (
                            <View style={s.emptyCoupons}>
                                <Icon icon="mdi:ticket-outline" width={32} color="#D0D0D0" />
                                <Text style={{ color: '#888', fontSize: 13, fontWeight: '700', marginTop: 6 }}>{currentLang === 'TH' ? 'ยังไม่มีคูปองในตอนนี้' : 'No coupons available'}</Text>
                            </View>
                        ) : shopRewards.map((r) => {
                            const q = r.quota;
                            const hasQuota = q && q.maxTotal != null;
                            const percent = hasQuota ? Math.min(100, Math.round((q.usedTotal / q.maxTotal) * 100)) : 0;
                            const remaining = hasQuota ? q.remaining : null;
                            const isFull = hasQuota && q.isFull;
                            const isLow = hasQuota && remaining > 0 && percent >= 80;
                            return (
                                <View key={r._id} style={[s.couponRow, { borderColor: isFull ? '#FFCDD2' : '#F0F0F0', opacity: isFull ? 0.7 : 1 }]}>
                                    <View style={s.couponImg}>{r.image ? <Image source={{ uri: r.image }} style={{ width: '100%', height: '100%' }} /> : <View style={{ flex: 1, backgroundColor: '#EEE' }} />}</View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '900', color: '#1E293B', flex: 1 }}>{r.discountValue}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Icon icon="mdi:star-four-points" width={12} color="#F9A825" /><Text style={{ fontSize: 12, fontWeight: '900', color: '#F9A825' }}>{r.cost}</Text></View>
                                        </View>
                                        <Text numberOfLines={1} style={{ fontSize: 11, color: '#888', fontWeight: '600', marginVertical: 4 }}>{r.description}</Text>
                                        {hasQuota ? (
                                            <>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <Text style={{ fontSize: 10, color: '#888', fontWeight: '700' }}>{currentLang === 'TH' ? 'สิทธิ์คงเหลือ' : 'Available'}</Text>
                                                    <Text style={{ fontSize: 11, fontWeight: '900', color: isFull ? '#D14545' : isLow ? '#E89938' : '#1B5E37' }}>{isFull ? (currentLang === 'TH' ? 'หมดแล้ว' : 'Sold out') : `${remaining}/${q.maxTotal}`}</Text>
                                                </View>
                                                <View style={s.quotaTrack}><View style={{ width: `${percent}%`, height: '100%', backgroundColor: isFull ? '#D14545' : isLow ? '#E89938' : '#1B5E37', borderRadius: 10 }} /></View>
                                            </>
                                        ) : (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon icon="mdi:infinity" width={12} color="#888" /><Text style={{ fontSize: 10, color: '#888', fontWeight: '700' }}>{currentLang === 'TH' ? 'ไม่จำกัดสิทธิ์' : 'Unlimited'}</Text></View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    <Pressable onPress={() => navigate('/rewards')} style={s.cta}>
                        <Icon icon="mynaui:gift" width={24} color="#D5EE7A" /><Text style={{ color: '#D5EE7A', fontSize: 16, fontWeight: '900' }}>{t.viewShopRewards}</Text>
                    </Pressable>
                </View>
            </ScrollView>
            <BottomNav active="/home" />
        </View>
    );
}

const s = StyleSheet.create({
    backBtn: { position: 'absolute', top: 40, left: 25, width: 45, height: 45, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 3 },
    content: { backgroundColor: '#FAFAFA', borderTopLeftRadius: 40, borderTopRightRadius: 40, marginTop: -40, padding: 25 },
    tagChip: { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, marginBottom: 10 },
    pinBox: { width: 50, height: 50, backgroundColor: '#D5EE7A', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 20 },
    infoCard: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    infoLabel: { fontSize: 11, color: '#AAA', fontWeight: '700' },
    infoVal: { fontSize: 14, color: '#333', fontWeight: '800' },
    section: { fontSize: 18, fontWeight: '900', color: '#1B5E37', marginBottom: 10 },
    countTag: { backgroundColor: '#F1F8E9', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10 },
    emptyCoupons: { backgroundColor: '#FAFAFA', borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed', borderRadius: 18, padding: 24, alignItems: 'center' },
    couponRow: { backgroundColor: 'white', borderRadius: 18, padding: 14, borderWidth: 1, flexDirection: 'row', gap: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 12, elevation: 1 },
    couponImg: { width: 70, height: 70, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F8FAFC' },
    quotaTrack: { width: '100%', height: 5, backgroundColor: '#F0F0F0', borderRadius: 10, overflow: 'hidden' },
    cta: { width: '100%', paddingVertical: 20, backgroundColor: '#1B5E37', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#1B5E20', shadowOpacity: 0.25, shadowRadius: 35, elevation: 4 },
});
