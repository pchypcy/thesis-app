// components/VIPUpgradeSheet.js — paywall bottom sheet (ported to RN Modal)
import React, { useState } from 'react';
import { View, Modal, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Pressable } from "./Touchable";
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { Icon } from './Icon';
import { getCurrentLang } from '../utils/language';

const VIP_FEATURES = [
    { icon: 'mdi:chart-donut', titleTH: 'สมุดสุขภาพประจำวัน', descTH: 'ติดตามน้ำตาล + แป้งรายวัน เปรียบกับ WHO', titleEN: 'Daily Health Diary', descEN: 'Daily sugar + starch tracking vs WHO' },
    { icon: 'mdi:lightbulb-on', titleTH: 'AI Insight ส่วนตัว', descTH: 'คำแนะนำจากข้อมูลบริโภคจริงของคุณ', titleEN: 'Personalized AI Insight', descEN: 'Recommendations from your real intake' },
    { icon: 'mdi:star-four-points', titleTH: 'แต้มสะสม ×1.5', descTH: 'ทุกการสแกน รับแต้มเพิ่ม 50%', titleEN: 'Points ×1.5', descEN: 'Earn 50% more points per scan' },
    { icon: 'mdi:file-pdf-box', titleTH: 'รายงานสุขภาพรายเดือน', descTH: 'PDF สรุปการบริโภคและคำแนะนำเดือนละครั้ง', titleEN: 'Monthly Health Report', descEN: 'PDF report monthly' },
    { icon: 'mdi:crown', titleTH: 'VIP Badge + Priority', descTH: 'แสดงสถานะ VIP บนโปรไฟล์', titleEN: 'VIP Badge', descEN: 'VIP status on your profile' },
];

export default function VIPUpgradeSheet({ open, onClose, onUpgrade, trialDaysLeft = null, price = 69 }) {
    const currentLang = getCurrentLang();
    const [loading, setLoading] = useState(false);

    const inTrial = typeof trialDaysLeft === 'number' && trialDaysLeft > 0;

    const handleUpgrade = async () => {
        if (loading) return;
        setLoading(true);
        try { await onUpgrade?.(); } finally { setLoading(false); }
    };

    return (
        <Modal visible={!!open} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={() => {}}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                        <View style={styles.handle} />
                        <Pressable onPress={onClose} style={styles.closeX}>
                            <Icon icon="lucide:x" width={20} color="#666" />
                        </Pressable>

                        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, alignItems: 'center' }}>
                            <LinearGradient colors={['#F4FDC6', '#D5EE7A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.crownCircle}>
                                <Icon icon="mdi:crown" width={38} color="#1B5E37" />
                            </LinearGradient>
                            <Text style={styles.title}>{currentLang === 'TH' ? 'อัปเกรด VIP' : 'Upgrade to VIP'}</Text>
                            <Text style={styles.subtitle}>
                                {inTrial
                                    ? (currentLang === 'TH' ? `คุณกำลังทดลองใช้ฟรี เหลืออีก ${trialDaysLeft} วัน` : `Free trial: ${trialDaysLeft} days left`)
                                    : (currentLang === 'TH' ? 'ทดลองฟรี 3 วัน — ยกเลิกได้ทุกเมื่อ' : '3-day free trial — cancel anytime')}
                            </Text>
                        </View>

                        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
                            <LinearGradient colors={['#1B5E37', '#2D8048']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.priceCard}>
                                <Text style={styles.priceLabel}>{currentLang === 'TH' ? 'ราคาพิเศษ' : 'BEST PRICE'}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                                    <Text style={styles.priceBig}>฿{price}</Text>
                                    <Text style={styles.priceUnit}>{currentLang === 'TH' ? '/ เดือน' : '/ month'}</Text>
                                </View>
                                <Text style={styles.priceNote}>
                                    {currentLang === 'TH' ? 'น้อยกว่าราคากาแฟ 1 แก้วต่อเดือน · ดูแลสุขภาพได้ทั้งเดือน' : 'Less than a cup of coffee per month'}
                                </Text>
                            </LinearGradient>
                        </View>

                        <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
                            <Text style={styles.sectionLabel}>{currentLang === 'TH' ? 'สิ่งที่คุณจะได้รับ' : 'WHAT YOU GET'}</Text>
                            {VIP_FEATURES.map((f, i) => (
                                <View key={i} style={[styles.featureRow, i < VIP_FEATURES.length - 1 && styles.featureBorder]}>
                                    <View style={styles.featureIcon}><Icon icon={f.icon} width={20} color="#1B5E37" /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.featureTitle}>{currentLang === 'TH' ? f.titleTH : f.titleEN}</Text>
                                        <Text style={styles.featureDesc}>{currentLang === 'TH' ? f.descTH : f.descEN}</Text>
                                    </View>
                                    <Icon icon="mdi:check-circle" width={20} color="#4CAF50" />
                                </View>
                            ))}
                        </View>

                        <View style={{ paddingHorizontal: 24, paddingTop: 18 }}>
                            <Pressable onPress={handleUpgrade} disabled={loading} style={[styles.cta, { opacity: loading ? 0.75 : 1 }]}>
                                {loading ? <ActivityIndicator color="#D5EE7A" /> : <Icon icon="mdi:crown" width={18} color="#D5EE7A" />}
                                <Text style={styles.ctaText}>
                                    {loading
                                        ? (currentLang === 'TH' ? 'กำลังดำเนินการ...' : 'Processing...')
                                        : (currentLang === 'TH' ? `เริ่มทดลองฟรี → ฿${price}/เดือน` : `Start free trial → ฿${price}/month`)}
                                </Text>
                            </Pressable>
                            <Pressable onPress={onClose} style={{ paddingVertical: 12, alignItems: 'center' }}>
                                <Text style={styles.later}>{currentLang === 'TH' ? 'ดูทีหลัง' : 'Maybe later'}</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: { width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '92%' },
    handle: { width: 46, height: 5, backgroundColor: '#E0E0E0', borderRadius: 4, alignSelf: 'center', marginTop: 12 },
    closeX: { position: 'absolute', top: 14, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    crownCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    title: { fontSize: 24, fontWeight: '900', color: '#1B5E37' },
    subtitle: { marginTop: 6, fontSize: 13, color: '#666', fontWeight: '700', textAlign: 'center' },
    priceCard: { borderRadius: 20, padding: 20, overflow: 'hidden' },
    priceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    priceBig: { fontSize: 40, fontWeight: '900', color: '#D5EE7A' },
    priceUnit: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '700' },
    priceNote: { marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
    sectionLabel: { fontSize: 12, color: '#888', fontWeight: '800', letterSpacing: 0.5, marginBottom: 10 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    featureBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    featureIcon: { width: 38, height: 38, backgroundColor: '#F1F8E9', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    featureTitle: { fontSize: 14, fontWeight: '800', color: '#1B5E37' },
    featureDesc: { fontSize: 11, color: '#888', fontWeight: '600', marginTop: 2 },
    cta: { width: '100%', paddingVertical: 17, backgroundColor: '#1B5E37', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    ctaText: { color: '#D5EE7A', fontWeight: '900', fontSize: 16 },
    later: { color: '#888', fontSize: 13, fontWeight: '700' },
});
