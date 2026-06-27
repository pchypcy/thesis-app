import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, Modal, StyleSheet, ActivityIndicator } from "react-native";
import { Pressable } from "../components/Touchable";
import axios from 'axios';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { toast } from '../components/Toast';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang, translations } from '../utils/language';
import BottomNav from '../components/BottomNav';

export default function Rewards() {
    const navigate = useNavigate();
    const username = storage.getItem('username');
    const currentLang = getCurrentLang();
    const t = translations[currentLang];
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const [user, setUser] = useState({ points: 0, username: 'Guest' });
    const [rewardsList, setRewardsList] = useState([]);
    const [isLoadingRewards, setIsLoadingRewards] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedReward, setSelectedReward] = useState(null);
    const [confirmReward, setConfirmReward] = useState(null);
    const [redeemLoading, setRedeemLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [generatedCode, setGeneratedCode] = useState('');
    const [couponExpiresAt, setCouponExpiresAt] = useState(null);
    const [activeCoupons, setActiveCoupons] = useState([]);
    const [now, setNow] = useState(Date.now());

    const tabLabels = { All: t.tabAll, Cafe: t.tabCafe, Food: t.tabFood, 'Eco-Shop': t.tabEcoShop };

    const loadActiveCoupons = () => {
        if (!username) return;
        axios.get(`${API_BASE_URL}/api/coupons/active/${username}`, { headers: H })
            .then((res) => setActiveCoupons(res.data?.items || [])).catch(() => setActiveCoupons([]));
    };

    useEffect(() => {
        if (!username) { navigate('/login'); return; }
        axios.get(`${API_BASE_URL}/api/users/${username}`, { headers: H }).then((res) => setUser(res.data)).catch((e) => console.error(e));
        setIsLoadingRewards(true);
        axios.get(`${API_BASE_URL}/api/rewards`, { headers: H })
            .then((res) => { setRewardsList(res.data); setIsLoadingRewards(false); })
            .catch((e) => { console.error(e); setIsLoadingRewards(false); });
        loadActiveCoupons();
    }, [username, navigate]);

    useEffect(() => {
        if (activeCoupons.length === 0 && !showModal) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [activeCoupons.length, showModal]);

    const handleViewCoupon = (coupon) => {
        const reward = rewardsList.find((r) => r.shopName === coupon.shopName) || { shopName: coupon.shopName, image: 'https://placehold.co/200x200/E8F5E9/1B5E37?text=Coupon', discountValue: '' };
        setSelectedReward(reward); setGeneratedCode(coupon.couponCode); setCouponExpiresAt(coupon.expiresAt || null); setShowModal(true);
    };

    const handleCloseModal = () => { setShowModal(false); setCouponExpiresAt(null); };

    const doRedeem = async (reward) => {
        setConfirmReward(null);
        setRedeemLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/users/redeem`, { username, pointsToUse: reward.cost, merchantName: reward.shopName, rewardDetail: reward.discountValue }, { headers: H });
            setUser((prev) => ({ ...prev, points: res.data.currentPoints }));
            setGeneratedCode(res.data.couponCode);
            setCouponExpiresAt(res.data.expiresAt || null);
            setSelectedReward(reward);
            setShowModal(true);
            loadActiveCoupons();
        } catch {
            toast.error(currentLang === 'TH' ? 'เกิดข้อผิดพลาด หรือแต้มไม่พอ' : 'Failed. Please try again.');
        } finally { setRedeemLoading(false); }
    };

    const filteredRewards = activeTab === 'All' ? rewardsList : rewardsList.filter((item) => {
        const m = `${item.category || ''} ${item.tag || ''} ${item.type || ''} ${item.shopName || ''}`.toLowerCase();
        if (activeTab === 'Cafe') return /cafe|คาเฟ่|coffee|กาแฟ|ชา|เครื่องดื่ม/.test(m);
        if (activeTab === 'Food') return /food|อาหาร|restaurant|vegan|ข้าว/.test(m);
        if (activeTab === 'Eco-Shop') return /eco|รักษ์โลก|zero waste|organic|store|สินค้า/.test(m);
        return item.category === activeTab;
    });

    const modalTimeLeft = (() => {
        if (!couponExpiresAt) return null;
        const diff = new Date(couponExpiresAt) - now;
        if (diff <= 0) return '00:00';
        const m = Math.floor(diff / 60000), sec = Math.floor((diff % 60000) / 1000);
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    })();
    const timerColor = !modalTimeLeft ? '#558B2F' : (Number(modalTimeLeft.split(':')[0]) < 5 ? '#F5222D' : Number(modalTimeLeft.split(':')[0]) < 10 ? '#F9A825' : '#1B5E37');

    const CATS = [
        { id: 'All', label: tabLabels.All, icon: 'lucide:layout-grid' },
        { id: 'Cafe', label: tabLabels.Cafe, icon: 'lucide:coffee' },
        { id: 'Food', label: tabLabels.Food, icon: 'lucide:utensils' },
        { id: 'Eco-Shop', label: tabLabels['Eco-Shop'], icon: 'lucide:shopping-bag' },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#D5EE7A', '#FFFFFF']} style={s.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Pressable onPress={() => navigate('/home')} style={s.headerBtn}><Icon icon="lucide:arrow-left" width={24} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1B5E37' }}>{t.rewTitle}</Text>
                        <View style={s.headerBtn}><Icon icon="lucide:shopping-bag" width={22} color="#1B5E37" /></View>
                    </View>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: '#1B5E37', marginBottom: 5 }}>{t.rewHeader}</Text>
                    <Text style={{ fontSize: 14, color: '#558B2F', fontWeight: '600', marginBottom: 20 }}>{t.rewSub}</Text>
                    <View style={s.pointBadge}><Icon icon="mdi:star-four-points" width={20} color="#F9A825" /><Text style={{ fontSize: 18, fontWeight: '900', color: '#1B5E37' }}>{user.points} {t.points}</Text></View>
                </LinearGradient>

                {activeCoupons.length > 0 && (
                    <View style={{ paddingHorizontal: 25, paddingTop: 25 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Icon icon="mdi:ticket-confirmation-outline" width={20} color="#1B5E37" />
                                <Text style={{ fontSize: 15, fontWeight: '900', color: '#1B5E37' }}>{currentLang === 'TH' ? 'คูปองของฉัน' : 'My Coupons'}</Text>
                                <View style={s.countBadge}><Text style={{ color: '#D5EE7A', fontSize: 10, fontWeight: '900' }}>{activeCoupons.length}</Text></View>
                            </View>
                            <Text style={{ fontSize: 11, color: '#888', fontWeight: '700' }}>{currentLang === 'TH' ? 'แตะเพื่อดู QR' : 'Tap for QR'}</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
                            {activeCoupons.map((c) => {
                                const expMs = c.expiresAt ? new Date(c.expiresAt).getTime() : null;
                                const secsLeft = expMs ? Math.max(0, Math.floor((expMs - now) / 1000)) : null;
                                const timeLeftStr = secsLeft != null ? `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, '0')}` : '∞';
                                const isUrgent = secsLeft != null && secsLeft < 300;
                                return (
                                    <Pressable key={c.couponCode} onPress={() => handleViewCoupon(c)} style={s.couponCard}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 9, color: '#888', fontWeight: '800' }}>{currentLang === 'TH' ? 'ร้าน' : 'SHOP'}</Text>
                                                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '900', color: '#1B5E37' }}>{c.shopName}</Text>
                                            </View>
                                            {secsLeft != null && (
                                                <View style={[s.couponTimer, { backgroundColor: isUrgent ? '#FFEBEE' : '#F1F8E9' }]}>
                                                    <Icon icon="lucide:clock" width={10} color={isUrgent ? '#D14545' : '#1B5E37'} />
                                                    <Text style={{ fontSize: 10, fontWeight: '900', color: isUrgent ? '#D14545' : '#1B5E37' }}>{timeLeftStr}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={s.couponCodeBox}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 9, color: '#888', fontWeight: '700' }}>CODE</Text>
                                                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '900', color: '#1B5E37', letterSpacing: 1 }}>{c.couponCode}</Text>
                                            </View>
                                            <View style={s.couponQrIcon}><Icon icon="lucide:qr-code" width={20} color="#D5EE7A" /></View>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 25, paddingVertical: 18 }}>
                    {CATS.map((cat) => {
                        const active = activeTab === cat.id;
                        return (
                            <Pressable key={cat.id} onPress={() => setActiveTab(cat.id)} style={[s.cat, { backgroundColor: active ? '#1B5E37' : 'white', borderColor: active ? '#1B5E37' : '#F0F0F0' }]}>
                                <Icon icon={cat.icon} width={18} color={active ? '#D5EE7A' : '#888'} />
                                <Text style={{ fontWeight: '800', fontSize: 14, color: active ? '#D5EE7A' : '#888' }}>{cat.label}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                <View style={{ paddingHorizontal: 25, gap: 14 }}>
                    {isLoadingRewards ? (
                        <View style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}><ActivityIndicator color="#1B5E37" /><Text style={{ color: '#888', fontWeight: '600' }}>{t.loadingRewards}</Text></View>
                    ) : filteredRewards.length === 0 ? (
                        <View style={s.emptyRewards}>
                            <Icon icon="lucide:package-open" width={40} color="#D0D0D0" />
                            <Text style={{ fontSize: 15, color: '#A0A0A0', fontWeight: '600', marginTop: 10 }}>{t.noRewards}</Text>
                        </View>
                    ) : filteredRewards.map((item) => {
                        const canAfford = user.points >= item.cost;
                        return (
                            <View key={item._id} style={[s.rewardCard, { opacity: canAfford ? 1 : 0.7 }]}>
                                <View style={s.rewardImgWrap}>
                                    {item.image ? <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} /> : <View style={{ flex: 1, backgroundColor: '#F0F0F0' }} />}
                                    {item.tag ? <View style={s.rewardTag}><Text style={{ color: '#D5EE7A', fontSize: 9, fontWeight: '900' }}>{item.tag}</Text></View> : null}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B' }}>{item.shopName}</Text>
                                    <Text numberOfLines={1} style={{ fontSize: 12, color: '#888', fontWeight: '500', marginVertical: 4 }}>{item.description}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <Icon icon="mdi:star-four-points" color={canAfford ? '#F9A825' : '#CCC'} width={14} />
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: canAfford ? '#F9A825' : '#CCC' }}>{item.cost} {t.points}</Text>
                                    </View>
                                </View>
                                <Pressable onPress={() => canAfford && setConfirmReward(item)} disabled={!canAfford || redeemLoading} style={[s.redeemBtn, { backgroundColor: canAfford ? '#1B5E37' : '#F5F5F5' }]}>
                                    <Text style={{ color: canAfford ? '#D5EE7A' : '#BBB', fontWeight: '800', fontSize: 12 }}>{canAfford ? t.btnRedeem : t.btnLocked}</Text>
                                    <Text style={{ fontSize: 10, fontWeight: '600', color: canAfford ? '#D5EE7A' : '#BBB', opacity: 0.8 }}>{item.discountValue}</Text>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Redeem confirm modal */}
            <Modal visible={!!confirmReward} transparent animationType="fade" onRequestClose={() => setConfirmReward(null)}>
                <Pressable style={s.overlay} onPress={() => setConfirmReward(null)}>
                    {confirmReward && (
                        <Pressable style={s.confirmCard} onPress={() => {}}>
                            {confirmReward.image ? <Image source={{ uri: confirmReward.image }} style={s.confirmImg} /> : null}
                            <View style={{ padding: 20, alignItems: 'center' }}>
                                <Text style={{ fontSize: 18, fontWeight: '900', color: '#333' }}>{currentLang === 'TH' ? 'ยืนยันการทำรายการ' : 'Confirm Order'}</Text>
                                <Text style={{ fontSize: 12, color: '#888', fontWeight: '500', marginTop: 4, marginBottom: 15, textAlign: 'center' }}>{currentLang === 'TH' ? 'โปรดตรวจสอบข้อมูลคูปองก่อนยืนยัน' : 'Please check coupon info.'}</Text>
                                <View style={s.confirmStats}>
                                    <View><Text style={s.confirmStatLabel}>{currentLang === 'TH' ? 'แต้มของคุณ' : 'Balance'}</Text><Text style={{ fontSize: 18, color: '#333', fontWeight: '900' }}>{user.points}</Text></View>
                                    <Icon icon="lucide:arrow-right" width={18} color="#CCC" />
                                    <View style={{ alignItems: 'flex-end' }}><Text style={s.confirmStatLabel}>{currentLang === 'TH' ? 'ใช้แต้มแลก' : 'Redeem'}</Text><View style={s.minusTag}><Text style={{ fontSize: 16, color: '#F5222D', fontWeight: '900' }}>-{confirmReward.cost}</Text></View></View>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 16 }}>
                                    <Pressable onPress={() => setConfirmReward(null)} style={[s.confirmBtn, { backgroundColor: '#F5F5F5', flex: 1 }]}><Text style={{ color: '#888', fontWeight: '700' }}>{currentLang === 'TH' ? 'ยกเลิก' : 'Cancel'}</Text></Pressable>
                                    <Pressable onPress={() => doRedeem(confirmReward)} style={[s.confirmBtn, { backgroundColor: '#1B5E37', flex: 1.2 }]}><Text style={{ color: '#D5EE7A', fontWeight: '800' }}>{currentLang === 'TH' ? 'ยืนยันแลกสิทธิ์' : 'Confirm'}</Text></Pressable>
                                </View>
                            </View>
                        </Pressable>
                    )}
                </Pressable>
            </Modal>

            {/* Success / QR modal */}
            <Modal visible={showModal && !!selectedReward} transparent animationType="fade" onRequestClose={handleCloseModal}>
                <Pressable style={s.overlay} onPress={handleCloseModal}>
                    {selectedReward && (
                        <Pressable style={s.qrCard} onPress={() => {}}>
                            <View style={{ alignItems: 'center', paddingTop: 30, paddingHorizontal: 20 }}>
                                {selectedReward.image ? <Image source={{ uri: selectedReward.image }} style={s.qrShopImg} /> : null}
                                <Text style={{ fontSize: 18, color: '#1B5E37', fontWeight: '800', marginTop: 12 }}>{selectedReward.shopName}</Text>
                                <Text style={{ fontSize: 32, fontWeight: '900', color: '#333' }}>{selectedReward.discountValue}</Text>
                            </View>
                            <View style={{ paddingHorizontal: 25, paddingBottom: 30, paddingTop: 20, alignItems: 'center' }}>
                                <Text style={{ fontSize: 12, color: '#888', fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>PROMO CODE</Text>
                                <View style={s.qrBox}>
                                    <View style={{ backgroundColor: 'white', padding: 10, borderRadius: 10, marginBottom: 10 }}>
                                        <QRCode value={generatedCode || 'GRN-0000'} size={120} />
                                    </View>
                                    <Text style={{ fontSize: 20, fontWeight: '900', color: '#1B5E37', letterSpacing: 2 }}>{generatedCode}</Text>
                                </View>
                                {modalTimeLeft && (
                                    <View style={[s.timerBox, { backgroundColor: modalTimeLeft === '00:00' ? '#FFF1F0' : '#F1F8E9' }]}>
                                        <Icon icon={modalTimeLeft === '00:00' ? 'lucide:clock-x' : 'lucide:clock'} width={16} color={timerColor} />
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: timerColor }}>{modalTimeLeft === '00:00' ? (currentLang === 'TH' ? 'คูปองหมดอายุแล้ว' : 'Expired') : (currentLang === 'TH' ? `ใช้ได้อีก ${modalTimeLeft} นาที` : `Valid ${modalTimeLeft} min`)}</Text>
                                    </View>
                                )}
                                <Pressable onPress={handleCloseModal} style={s.closeBtn}><Text style={{ color: '#D5EE7A', fontWeight: '800', fontSize: 16 }}>{t.closeBtn}</Text></Pressable>
                            </View>
                        </Pressable>
                    )}
                </Pressable>
            </Modal>

            <BottomNav active="/rewards" />
        </View>
    );
}

const s = StyleSheet.create({
    header: { paddingTop: 40, paddingHorizontal: 25, paddingBottom: 25, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    headerBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
    pointBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 2 },
    countBadge: { backgroundColor: '#1B5E37', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    couponCard: { width: 190, backgroundColor: 'white', borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: '#C8E6C9', shadowColor: '#1B5E20', shadowOpacity: 0.08, shadowRadius: 20, elevation: 2 },
    couponTimer: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10 },
    couponCodeBox: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#C8E6C9', borderStyle: 'dashed' },
    couponQrIcon: { width: 36, height: 36, backgroundColor: '#1B5E37', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    cat: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 30, borderWidth: 2 },
    emptyRewards: { alignItems: 'center', paddingVertical: 40, backgroundColor: 'white', borderRadius: 25, borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed' },
    rewardCard: { backgroundColor: 'white', borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, elevation: 1 },
    rewardImgWrap: { width: 95, height: 95, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F8FAFC' },
    rewardTag: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1B5E37', paddingVertical: 4, paddingHorizontal: 8, borderTopLeftRadius: 10, borderBottomRightRadius: 14 },
    redeemBtn: { borderRadius: 16, padding: 10, minWidth: 75, alignItems: 'center', gap: 2 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    confirmCard: { width: '88%', maxWidth: 340, backgroundColor: 'white', borderRadius: 28, overflow: 'hidden' },
    confirmImg: { width: '100%', height: 100 },
    confirmStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', backgroundColor: '#FAFAFA', borderWidth: 1.2, borderColor: '#D0D0D0', borderStyle: 'dashed', borderRadius: 15, padding: 12 },
    confirmStatLabel: { fontSize: 11, color: '#888', fontWeight: '700' },
    minusTag: { backgroundColor: '#FFF1F0', paddingVertical: 2, paddingHorizontal: 10, borderRadius: 8, marginTop: 2 },
    confirmBtn: { paddingVertical: 15, borderRadius: 50, alignItems: 'center' },
    qrCard: { width: '85%', maxWidth: 340, backgroundColor: 'white', borderRadius: 24, overflow: 'hidden' },
    qrShopImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#F1F8E9' },
    qrBox: { backgroundColor: '#FAFAFA', padding: 20, borderRadius: 15, alignItems: 'center', borderWidth: 2, borderColor: '#C8E6C9', borderStyle: 'dashed', marginBottom: 15 },
    timerBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginBottom: 15 },
    closeBtn: { width: '100%', paddingVertical: 16, backgroundColor: '#1B5E37', borderRadius: 50, alignItems: 'center' },
});
