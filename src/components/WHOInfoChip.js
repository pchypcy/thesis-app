// components/WHOInfoChip.js — ป้าย WHO กดได้ → popup อธิบาย (ported to RN)
import React, { useState } from 'react';
import { View, Modal, ScrollView, Linking, StyleSheet } from "react-native";
import { Pressable } from "./Touchable";
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { Icon } from './Icon';
import { getCurrentLang } from '../utils/language';

export default function WHOInfoChip({ variant = 'inline', label }) {
    const currentLang = getCurrentLang();
    const [open, setOpen] = useState(false);
    const text = label || (currentLang === 'TH' ? 'WHO คืออะไร?' : 'What is WHO?');

    return (
        <>
            {variant === 'inline' ? (
                <Pressable onPress={() => setOpen(true)} style={styles.chipInline}>
                    <Icon icon="mdi:information-outline" width={12} color="#2D8048" />
                    <Text style={styles.chipInlineText}>WHO</Text>
                </Pressable>
            ) : (
                <Pressable onPress={() => setOpen(true)} style={styles.chipBlock}>
                    <Icon icon="mdi:information-outline" width={14} color="#2D8048" />
                    <Text style={styles.chipBlockText}>{text}</Text>
                </Pressable>
            )}

            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
                    <Pressable style={styles.card} onPress={() => {}}>
                        <LinearGradient colors={['#2D8048', '#1B5E37']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                            <Pressable onPress={() => setOpen(false)} style={styles.closeX}>
                                <Icon icon="lucide:x" width={16} color="white" />
                            </Pressable>
                            <View style={styles.headerIcon}><Icon icon="mdi:earth" width={28} color="#1B5E37" /></View>
                            <Text style={styles.title}>WHO</Text>
                            <Text style={styles.subtitle}>World Health Organization</Text>
                            <Text style={styles.subtitle2}>{currentLang === 'TH' ? 'องค์การอนามัยโลก' : 'United Nations health agency'}</Text>
                        </LinearGradient>
                        <ScrollView style={{ padding: 22 }}>
                            <Text style={styles.body}>
                                {currentLang === 'TH'
                                    ? 'WHO คือ องค์การอนามัยโลก หน่วยงานของสหประชาชาติที่ดูแลด้านสุขภาพระดับโลก ก่อตั้งปี 1948 ปัจจุบันมีประเทศสมาชิก 194 ประเทศ'
                                    : 'WHO is the World Health Organization, a United Nations agency for global health, founded in 1948 with 194 member states.'}
                            </Text>
                            <View style={styles.stdBox}>
                                <Text style={styles.stdLabel}>{currentLang === 'TH' ? 'มาตรฐานที่ InGreen ใช้' : 'STANDARDS USED BY INGREEN'}</Text>
                                <Text style={styles.stdItem}>• {currentLang === 'TH' ? 'น้ำตาล < 50g/วัน (Free Sugars)' : 'Sugar < 50g/day'}</Text>
                                <Text style={styles.stdItem}>• {currentLang === 'TH' ? 'โซเดียม < 2,000mg/วัน' : 'Sodium < 2,000mg/day'}</Text>
                                <Text style={styles.stdItem}>• {currentLang === 'TH' ? 'ไขมัน < 65g/วัน' : 'Fat < 65g/day'}</Text>
                            </View>
                            <Pressable onPress={() => Linking.openURL('https://www.who.int')} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Icon icon="mdi:link-variant" width={13} color="#2D8048" />
                                <Text style={{ color: '#2D8048', fontWeight: '800', fontSize: 11 }}>who.int</Text>
                            </Pressable>
                            <Pressable onPress={() => setOpen(false)} style={styles.gotIt}>
                                <Text style={styles.gotItText}>{currentLang === 'TH' ? 'เข้าใจแล้ว' : 'Got it'}</Text>
                            </Pressable>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    chipInline: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EDF6E1', borderWidth: 1, borderColor: '#D5EE7A', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
    chipInlineText: { color: '#2D8048', fontSize: 10, fontWeight: '900' },
    chipBlock: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'white', borderWidth: 1, borderColor: '#D5EE7A', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    chipBlockText: { color: '#2D8048', fontSize: 11, fontWeight: '800' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    card: { width: '100%', maxWidth: 380, backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', maxHeight: '80%' },
    header: { padding: 22 },
    closeX: { position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    headerIcon: { width: 52, height: 52, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    title: { color: 'white', fontSize: 20, fontWeight: '900' },
    subtitle: { color: 'white', fontSize: 12, opacity: 0.9, fontWeight: '600', marginTop: 2 },
    subtitle2: { color: 'white', fontSize: 11, opacity: 0.75, fontWeight: '600', marginTop: 2 },
    body: { fontSize: 13, color: '#444', fontWeight: '600', lineHeight: 21 },
    stdBox: { marginTop: 14, backgroundColor: '#F6FAEC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#DCE89A' },
    stdLabel: { fontSize: 11, color: '#2D8048', fontWeight: '900', letterSpacing: 0.5, marginBottom: 6 },
    stdItem: { fontSize: 12, color: '#1B5E37', fontWeight: '700', lineHeight: 22 },
    gotIt: { marginTop: 18, marginBottom: 8, paddingVertical: 13, backgroundColor: '#2D8048', borderRadius: 50, alignItems: 'center' },
    gotItText: { color: 'white', fontSize: 14, fontWeight: '900' },
});
