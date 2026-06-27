// components/BottomNav.js — แถบนำทางล่าง (ลอย) ใช้ร่วมหลายหน้า
import React from 'react';
import { View, StyleSheet } from "react-native";
import { Pressable } from "./Touchable";
import { Text } from './Text';
import { Icon } from './Icon';
import { useNavigate } from '../shims/router';
import { getCurrentLang, translations } from '../utils/language';

export default function BottomNav({ active = '/home' }) {
    const navigate = useNavigate();
    const t = translations[getCurrentLang()];
    const items = [
        { to: '/home', icon: 'majesticons:home-line', label: t.navHome },
        { to: '/dashboard', icon: 'ion:trophy-outline', label: t.navRank },
        { to: '/scan', icon: 'lucide:scan-barcode', center: true },
        { to: '/rewards', icon: 'mynaui:gift', label: t.navRewards },
        { to: '/profile', icon: 'lucide:user', label: t.navProfile, size: 26 },
    ];
    return (
        <View style={styles.nav}>
            {items.map((n, i) => {
                const isActive = active === n.to;
                return (
                    <Pressable key={i} onPress={() => navigate(n.to)} style={styles.item}>
                        {n.center ? (
                            <View style={styles.center}><Icon icon={n.icon} width={24} color="#1B5E37" /></View>
                        ) : (
                            <>
                                <Icon icon={n.icon} width={n.size || 24} color={isActive ? '#D5EE7A' : 'white'} style={{ opacity: isActive ? 1 : 0.6 }} />
                                <Text style={[styles.label, { color: isActive ? '#D5EE7A' : 'white', opacity: isActive ? 1 : 0.6 }]}>{n.label}</Text>
                            </>
                        )}
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    nav: { position: 'absolute', bottom: 30, alignSelf: 'center', width: '85%', maxWidth: 380, backgroundColor: '#1B5E37', borderRadius: 40, paddingVertical: 12, paddingHorizontal: 10, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: 20 }, elevation: 10 },
    item: { flex: 1, alignItems: 'center' },
    center: { width: 45, height: 45, backgroundColor: '#D5EE7A', borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 10, marginTop: 3, fontWeight: '800' },
});
