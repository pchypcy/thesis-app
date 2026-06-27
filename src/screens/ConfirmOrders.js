import React, { useState, useEffect, useRef } from 'react';
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

export default function ConfirmOrders() {
    const navigate = useNavigate();
    const username = storage.getItem('username');
    const isTH = getCurrentLang() === 'TH';
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(Date.now());
    const pollRef = useRef(null);
    const tickRef = useRef(null);

    const load = async () => {
        try { const res = await axios.get(`${API_BASE_URL}/api/coupons/pending-confirm/${username}`, { headers: H }); if (res.data?.success) setItems(res.data.items || []); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => {
        if (!username) { navigate('/login'); return; }
        load();
        pollRef.current = setInterval(load, 5000);
        tickRef.current = setInterval(() => setNow(Date.now()), 1000);
        return () => { clearInterval(pollRef.current); clearInterval(tickRef.current); };
    }, []);

    const handleConfirm = async (couponCode) => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/coupons/confirm`, { couponCode, username }, { headers: H });
            if (res.data?.success) { toast.success(isTH ? 'ยืนยันแล้ว — ร้านสรุปรายการได้แล้ว' : 'Confirmed!'); load(); }
            else toast.error(res.data?.message || (isTH ? 'ผิดพลาด' : 'Error'));
        } catch (e) { toast.error(e.response?.data?.message || (isTH ? 'ผิดพลาด' : 'Error')); }
    };

    const handleReject = (couponCode) => {
        Alert.alert(isTH ? 'ยืนยันการปฏิเสธ?' : 'Reject confirmation?', isTH ? 'ปฏิเสธยอดนี้หากไม่ตรงกับใบเสร็จ' : 'Reject if amount is wrong', [
            { text: isTH ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
            { text: isTH ? 'ปฏิเสธ' : 'Reject', style: 'destructive', onPress: async () => {
                try { await axios.post(`${API_BASE_URL}/api/coupons/reject`, { couponCode, username, reason: '' }, { headers: H }); toast(isTH ? 'ปฏิเสธยอดแล้ว' : 'Rejected', { kind: 'error' }); load(); }
                catch (e) { toast.error(e.response?.data?.message || (isTH ? 'ผิดพลาด' : 'Error')); }
            } },
        ]);
    };

    const fmtSec = (sc) => `${Math.floor(sc / 60)}:${String(sc % 60).padStart(2, '0')}`;
    const baht = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#D5EE7A', '#FAFAFA']} style={s.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                        <Pressable onPress={() => navigate('/profile')} style={s.backBtn}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'ยืนยันยอดร้านค้า' : 'Confirm charges'}</Text>
                        <View style={{ width: 42 }} />
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <View style={s.hintPill}><Icon icon="mdi:receipt-text-check-outline" width={16} color="#1B5E37" /><Text style={{ fontSize: 12, fontWeight: '800', color: '#1B5E37' }}>{isTH ? 'ตรวจสอบยอดให้ตรงกับใบเสร็จ' : 'Verify amount with receipt'}</Text></View>
                    </View>
                </LinearGradient>

                <View style={{ padding: 25 }}>
                    {loading ? (
                        <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator size="large" color="#1B5E37" /></View>
                    ) : items.length === 0 ? (
                        <View style={s.empty}>
                            <Icon icon="mdi:inbox-outline" width={48} color="#D5EE7A" />
                            <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '800', color: '#1B5E37' }}>{isTH ? 'ไม่มีคำขอที่รอยืนยัน' : 'No pending confirmations'}</Text>
                            <Text style={{ marginTop: 4, fontSize: 12, color: '#888', textAlign: 'center' }}>{isTH ? 'เมื่อร้านขอยืนยันยอด คุณจะเห็นที่นี่' : "When a shop requests confirmation, you'll see it here"}</Text>
                        </View>
                    ) : items.map((it) => {
                        const secsLeft = Math.max(0, Math.floor((new Date(it.confirmExpiresAt).getTime() - now) / 1000));
                        const isUrgent = secsLeft < 30;
                        return (
                            <View key={it.couponCode} style={[s.card, { borderColor: isUrgent ? '#D14545' : '#F0F0F0', borderWidth: isUrgent ? 2 : 1 }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                    <View>
                                        <Text style={{ fontSize: 11, color: '#888', fontWeight: '700' }}>{isTH ? 'ร้าน' : 'SHOP'}</Text>
                                        <Text style={{ fontSize: 17, fontWeight: '900', color: '#1B5E37' }}>{it.shopName}</Text>
                                        <Text style={{ fontSize: 11, color: '#AAA', fontWeight: '700', marginTop: 2 }}>{it.couponCode}</Text>
                                    </View>
                                    <View style={[s.timer, { backgroundColor: isUrgent ? '#FFEBEE' : '#F1F8E9' }]}>
                                        <Icon icon="lucide:clock" width={14} color={isUrgent ? '#D14545' : '#1B5E37'} />
                                        <Text style={{ fontSize: 13, fontWeight: '900', color: isUrgent ? '#D14545' : '#1B5E37' }}>{fmtSec(secsLeft)}</Text>
                                    </View>
                                </View>

                                <View style={s.summaryBox}>
                                    <Text style={s.summaryLabel}><Icon icon="mdi:receipt-text-outline" width={13} color="#1B5E37" /> {isTH ? 'สรุปยอดคูปอง' : 'ORDER SUMMARY'}</Text>
                                    <View style={s.summaryRow}><Text style={{ fontSize: 13, color: '#666', fontWeight: '700' }}>{isTH ? 'ราคาเต็ม' : 'Original'}</Text><Text style={{ fontSize: 15, fontWeight: '800', color: '#333' }}>฿{baht(it.originalAmount ?? it.totalAmount)}</Text></View>
                                    <View style={s.summaryRow}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Text style={{ fontSize: 13, color: '#E89938', fontWeight: '700' }}>{isTH ? 'ส่วนลด' : 'Discount'}</Text>{it.discountValue ? <View style={s.discTag}><Text style={{ fontSize: 10, color: '#E89938', fontWeight: '800' }}>{it.discountValue}</Text></View> : null}</View>
                                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#E89938' }}>- ฿{baht(it.discountAmount)}</Text>
                                    </View>
                                    <View style={[s.summaryRow, { borderTopWidth: 1.5, borderTopColor: '#E8F5E9', paddingTop: 10, marginTop: 4 }]}>
                                        <Text style={{ fontSize: 14, color: '#1B5E37', fontWeight: '900' }}>{isTH ? 'ราคาสุทธิ' : 'Net price'}</Text>
                                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#1B5E37' }}>฿{baht(it.totalAmount)}</Text>
                                    </View>
                                </View>

                                <View style={s.warnBox}>
                                    <Icon icon="mdi:information-outline" width={14} color="#E65100" />
                                    <Text style={{ fontSize: 11, color: '#E65100', fontWeight: '700', flexShrink: 1 }}>{isTH ? 'ตรวจสอบยอดให้ตรงกับใบเสร็จก่อนยืนยัน หากไม่ถูกต้องสามารถปฏิเสธได้' : 'Check against receipt before confirming'}</Text>
                                </View>

                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <Pressable onPress={() => handleReject(it.couponCode)} style={[s.btn, { flex: 1, backgroundColor: '#FFF1F0', borderWidth: 1.5, borderColor: '#FFCDD2' }]}><Icon icon="mdi:close" width={16} color="#D14545" /><Text style={{ color: '#D14545', fontWeight: '900', fontSize: 14 }}>{isTH ? 'ปฏิเสธ' : 'Reject'}</Text></Pressable>
                                    <Pressable onPress={() => handleConfirm(it.couponCode)} style={[s.btn, { flex: 2, backgroundColor: '#1B5E37' }]}><Icon icon="mdi:check-bold" width={16} color="#D5EE7A" /><Text style={{ color: '#D5EE7A', fontWeight: '900', fontSize: 14 }}>{isTH ? 'ยืนยันยอดถูกต้อง' : 'Confirm amount'}</Text></Pressable>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    header: { paddingTop: 40, paddingHorizontal: 25, paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15, elevation: 2 },
    hintPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'white', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
    empty: { backgroundColor: 'white', borderRadius: 24, paddingVertical: 50, alignItems: 'center', borderWidth: 2, borderColor: '#EDF6E1', borderStyle: 'dashed' },
    card: { backgroundColor: 'white', borderRadius: 24, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 30, elevation: 3 },
    timer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14 },
    summaryBox: { borderWidth: 2, borderColor: '#D5EE7A', borderStyle: 'dashed', borderRadius: 16, padding: 14, marginBottom: 14 },
    summaryLabel: { fontSize: 10, color: '#1B5E37', fontWeight: '900', letterSpacing: 0.5, marginBottom: 10 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
    discTag: { backgroundColor: '#FFF8E1', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
    warnBox: { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFD54F', borderStyle: 'dashed', borderRadius: 12, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    btn: { paddingVertical: 14, borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
