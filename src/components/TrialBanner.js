// components/TrialBanner.js — สถานะ trial/VIP (ported to RN)
import React from 'react';
import { View, StyleSheet } from "react-native";
import { Pressable } from "./Touchable";
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { Icon } from './Icon';
import { getCurrentLang } from '../utils/language';

export default function TrialBanner({ vipStatus, onUpgradeClick, compact = false }) {
    const currentLang = getCurrentLang();
    if (!vipStatus) return null;

    const { isVip, status, daysRemaining } = vipStatus;
    if (status === 'active' && daysRemaining > 7) return null;

    let variant = null;
    if (status === 'trial' && isVip) {
        if (daysRemaining > 1) {
            variant = { bg: ['#F4FDC6', '#D5EE7A'], fg: '#1B5E37', icon: 'mdi:gift-outline',
                title: currentLang === 'TH' ? '🎁 กำลังทดลองใช้ VIP ฟรี' : '🎁 Free VIP Trial',
                desc: currentLang === 'TH' ? `เหลืออีก ${daysRemaining} วัน · ใช้งานทุกฟีเจอร์ฟรี` : `${daysRemaining} days left · all features unlocked`,
                cta: currentLang === 'TH' ? 'อัปเกรดเลย' : 'Upgrade' };
        } else {
            variant = { bg: ['#FFE082', '#FFA726'], fg: 'white', icon: 'mdi:alarm',
                title: currentLang === 'TH' ? 'ทดลองใช้ใกล้หมด!' : 'Trial ending soon!',
                desc: currentLang === 'TH' ? 'เหลือวันสุดท้ายแล้ว — อัปเกรด ฿69 เพื่อใช้ต่อ' : 'Last day — upgrade ฿69 to continue',
                cta: currentLang === 'TH' ? 'ต่ออายุเลย' : 'Continue' };
        }
    } else if (!isVip && status === 'trial') {
        variant = { bg: ['#FFCDD2', '#EF5350'], fg: 'white', icon: 'mdi:lock',
            title: currentLang === 'TH' ? 'ทดลองใช้หมดอายุ' : 'Trial expired',
            desc: currentLang === 'TH' ? 'Sugar Tracker ถูกล็อก — อัปเกรดเพื่อใช้ต่อ' : 'Sugar Tracker locked — upgrade to continue',
            cta: currentLang === 'TH' ? 'อัปเกรด' : 'Upgrade' };
    } else if (status === 'expired' || status === 'cancelled' || !isVip) {
        if (status === 'expired') {
            variant = { bg: ['#FFCDD2', '#EF5350'], fg: 'white', icon: 'mdi:lock-alert',
                title: currentLang === 'TH' ? 'VIP หมดอายุแล้ว' : 'VIP expired',
                desc: currentLang === 'TH' ? 'ต่ออายุ ฿69 เพื่อใช้ Sugar Tracker ต่อ' : 'Renew ฿69 to continue',
                cta: currentLang === 'TH' ? 'ต่ออายุ' : 'Renew' };
        } else return null;
    } else if (status === 'active' && daysRemaining <= 7) {
        variant = { bg: ['#FFF8E1', '#FFC107'], fg: '#5D4037', icon: 'mdi:clock-alert',
            title: currentLang === 'TH' ? 'VIP ใกล้หมดอายุ' : 'VIP expiring',
            desc: currentLang === 'TH' ? `เหลืออีก ${daysRemaining} วัน — ต่ออายุไว้ก่อนหมด` : `${daysRemaining} days left — renew now`,
            cta: currentLang === 'TH' ? 'ต่ออายุ' : 'Renew' };
    }
    if (!variant) return null;

    const ctaBg = variant.fg === 'white' ? 'rgba(255,255,255,0.95)' : '#1B5E37';
    const ctaColor = variant.fg === 'white' ? '#D32F2F' : '#D5EE7A';

    return (
        <Pressable onPress={onUpgradeClick}>
            <LinearGradient colors={variant.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[styles.banner, { borderRadius: compact ? 14 : 20, padding: compact ? 12 : 16 }]}>
                <View style={styles.left}>
                    <View style={[styles.iconBox, { width: compact ? 32 : 40, height: compact ? 32 : 40, borderRadius: compact ? 10 : 12 }]}>
                        <Icon icon={variant.icon} width={compact ? 18 : 22} color={variant.fg} />
                    </View>
                    <View style={{ flexShrink: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: compact ? 12 : 14, fontWeight: '900', color: variant.fg }}>{variant.title}</Text>
                        <Text numberOfLines={1} style={{ fontSize: compact ? 10 : 11, fontWeight: '600', color: variant.fg, opacity: 0.85 }}>{variant.desc}</Text>
                    </View>
                </View>
                <Pressable onPress={onUpgradeClick} style={[styles.ctaBtn, { backgroundColor: ctaBg }]}>
                    <Text style={{ color: ctaColor, fontSize: compact ? 11 : 12, fontWeight: '900' }}>{variant.cta}</Text>
                </Pressable>
            </LinearGradient>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 25, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
    left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    iconBox: { backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
    ctaBtn: { borderRadius: 50, paddingHorizontal: 16, paddingVertical: 8 },
});
