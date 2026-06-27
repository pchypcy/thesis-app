// components/AllergyAlertModal.js — 2-Layer Allergen Alert (ported to RN)
import React, { useState } from 'react';
import { View, Modal, ScrollView, StyleSheet } from "react-native";
import { Pressable } from "./Touchable";
import { Text } from './Text';
import { Icon } from './Icon';
import { getCurrentLang } from '../utils/language';

function getBaseTheme(baseSeverity, isTH) {
    if (baseSeverity === 'critical') return { band: '#D32F2F', bodyBg: '#FFEBEE', cardBorder: '#EF9A9A', text: '#B71C1C', headline: isTH ? 'สารนี้จัดอยู่ในกลุ่มอันตรายร้ายแรง' : 'This is a CRITICAL-risk allergen', tagline: isTH ? 'ประเมินโดยระบบ' : 'System assessment' };
    if (baseSeverity === 'high') return { band: '#E53935', bodyBg: '#FFEBEE', cardBorder: '#EF9A9A', text: '#B71C1C', headline: isTH ? 'สารนี้จัดอยู่ในกลุ่มอันตรายสูง' : 'This is a HIGH-risk allergen', tagline: isTH ? 'ประเมินโดยระบบ' : 'System assessment' };
    return { band: '#FB8C00', bodyBg: '#FFF3E0', cardBorder: '#FFCC80', text: '#E65100', headline: isTH ? 'สารนี้อาจทำให้แพ้ได้' : 'This may cause an allergic reaction', tagline: isTH ? 'ประเมินโดยระบบ' : 'System assessment' };
}

function getUserTheme(userSeverity, isTH) {
    if (userSeverity === 'severe') return { bg: '#FFEBEE', border: '#EF9A9A', text: '#B71C1C', bar: '#D32F2F', bars: 3, label: isTH ? 'รุนแรง' : 'Severe', line: isTH ? 'คุณตั้งค่าว่าแพ้รุนแรง' : 'You marked this as severe', caveat: { lead: isTH ? 'การแพ้รุนแรงอาจเกิดอาการเฉียบพลันได้แม้ได้รับเพียงเล็กน้อย' : 'A severe allergy can cause acute reactions from even a trace', body: isTH ? 'โปรดหลีกเลี่ยงอย่างเคร่งครัด และพบแพทย์ทันทีหากมีอาการ' : 'Avoid it strictly, and seek medical help immediately' } };
    if (userSeverity === 'medium') return { bg: '#FFF1E8', border: '#FFAB91', text: '#D84315', bar: '#F4511E', bars: 2, label: isTH ? 'ปานกลาง' : 'Medium', line: isTH ? 'คุณตั้งค่าว่าแพ้ปานกลาง' : 'You marked this as medium', caveat: { lead: isTH ? 'การแพ้ปานกลางอาจมีอาการชัดเจนขึ้นเมื่อได้รับในปริมาณมาก' : 'A moderate allergy can cause clearer symptoms with larger amounts', body: isTH ? 'ควรหลีกเลี่ยงเมื่อเป็นไปได้ และตรวจสอบกับแพทย์เป็นระยะ' : 'Avoid it when you can' } };
    if (userSeverity === 'mild') return { bg: '#FFFDE7', border: '#FFE082', text: '#F57F17', bar: '#FBC02D', bars: 1, label: isTH ? 'เล็กน้อย' : 'Mild', line: isTH ? 'คุณตั้งค่าว่าแพ้เล็กน้อย' : 'You marked this as mild', caveat: { lead: isTH ? 'การแพ้เล็กน้อยมักมีอาการไม่รุนแรง แต่ก็ยังควรเฝ้าระวัง' : 'A mild allergy usually causes only minor symptoms', body: isTH ? 'สังเกตอาการของตัวเองทุกครั้ง' : 'Watch for symptoms each time' } };
    return null;
}

function weightedSeverity(baseSev, userSev) {
    const baseRank = { critical: 4, high: 3, medium: 2, low: 1 };
    const userToBase = { severe: 'critical', medium: 'medium', mild: 'low' };
    const candidates = [];
    if (baseSev) candidates.push(baseSev);
    if (userSev && userToBase[userSev]) candidates.push(userToBase[userSev]);
    if (!candidates.length) return baseSev || 'medium';
    return candidates.reduce((a, b) => ((baseRank[b] || 0) > (baseRank[a] || 0) ? b : a));
}

function getLayer1Body(effSev, name, isTH) {
    if (effSev === 'critical' || effSev === 'high') {
        return isTH
            ? `${name} เป็นสารก่อภูมิแพ้ที่อันตราย แม้เพียงเล็กน้อยก็อาจกระตุ้นอาการรุนแรงได้ — ระบบจึงเตือนทุกครั้งที่พบ ไม่ว่าจะตั้งระดับไว้แบบใด`
            : `${name} is a high-risk allergen — even a small amount can trigger a severe reaction. We alert you every time, whatever level you set.`;
    }
    return isTH
        ? `${name} อาจกระตุ้นอาการแพ้ได้ — โปรดพิจารณาตามระดับการแพ้ของคุณ และอ่านฉลากทุกครั้ง`
        : `${name} may trigger an allergic reaction. Consider it against your sensitivity level and always read the label.`;
}

export default function AllergyAlertModal({ alert, productName, onClose, visible = true }) {
    const currentLang = getCurrentLang();
    const isTH = currentLang === 'TH';
    const [confirmStep, setConfirmStep] = useState(0);

    if (!alert || !alert.hasMatch) return null;

    const { matches = [], highestBaseSeverity, highestUserSeverity, highestSeverity, crossContamination, disclaimer } = alert;
    const baseSev = highestBaseSeverity || highestSeverity || 'medium';
    const userSev = highestUserSeverity;
    const effSev = weightedSeverity(baseSev, userSev);
    const baseTheme = getBaseTheme(effSev, isTH);
    const userTheme = getUserTheme(userSev, isTH);
    const needsFriction = baseSev === 'critical' || baseSev === 'high';

    const handleAction = () => {
        if (needsFriction && confirmStep === 0) { setConfirmStep(1); return; }
        onClose?.();
    };

    const primaryMatch = [...matches].sort((a, b) => {
        const rank = { critical: 3, high: 2, medium: 1, low: 0 };
        return (rank[b.baseSeverity || b.severity] || 0) - (rank[a.baseSeverity || a.severity] || 0);
    })[0];
    const sortedMatches = [...matches].sort((a, b) => (isTH ? a.labelTH : a.labelEN).localeCompare(isTH ? b.labelTH : b.labelEN, isTH ? 'th' : 'en'));

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.countPill}>
                        <Icon icon="mdi:alert-octagon" width={18} color="white" />
                        <Text style={styles.countText}>
                            {isTH ? `พบสารที่คุณแพ้ ${matches.length} รายการ` : `${matches.length} allergen${matches.length > 1 ? 's' : ''} found`}
                        </Text>
                    </View>

                    {/* LAYER 1 */}
                    <View style={[styles.layer1, { borderColor: baseTheme.band }]}>
                        <View style={[styles.layer1Bar, { backgroundColor: baseTheme.band }]}>
                            <View style={styles.layer1Icon}><Icon icon="mdi:exclamation" width={24} color="white" /></View>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Icon icon="mdi:shield-half-full" width={13} color="white" />
                                    <Text style={styles.layer1Tag}>{baseTheme.tagline}</Text>
                                </View>
                                <Text style={styles.layer1Head}>{baseTheme.headline}</Text>
                            </View>
                        </View>
                        <View style={[styles.layer1Body, { backgroundColor: baseTheme.bodyBg }]}>
                            {primaryMatch && (
                                <Text style={[styles.layer1Text, { color: baseTheme.text }]}>
                                    {getLayer1Body(effSev, (isTH ? primaryMatch.labelTH : primaryMatch.labelEN).replace(/\(.*?\)/g, '').trim(), isTH)}
                                </Text>
                            )}
                            <View style={{ marginTop: 14, gap: 8 }}>
                                {sortedMatches.map((m, i) => {
                                    const mBase = m.baseSeverity || m.severity;
                                    const mBadge = mBase === 'critical' ? '#D32F2F' : mBase === 'high' ? '#E53935' : '#FB8C00';
                                    const mBadgeLabel = mBase === 'critical' ? 'CRITICAL' : mBase === 'high' ? 'HIGH' : 'MEDIUM';
                                    return (
                                        <View key={i} style={[styles.matchCard, { borderColor: baseTheme.cardBorder }]}>
                                            <View style={[styles.matchIcon, { backgroundColor: `${mBadge}22` }]}>
                                                <Icon icon={m.icon || 'mdi:alert-circle'} width={24} color={mBadge} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.matchName}>{isTH ? m.labelTH : m.labelEN}</Text>
                                                <Text style={styles.matchFound}>
                                                    {isTH ? 'พบจาก: ' : 'Found in: '}{(m.matchedKeywords || []).slice(0, 3).join(', ')}
                                                </Text>
                                            </View>
                                            <View style={[styles.badge, { backgroundColor: mBadge }]}><Text style={styles.badgeText}>{mBadgeLabel}</Text></View>
                                        </View>
                                    );
                                })}
                            </View>
                            {productName ? (
                                <Text style={[styles.foundIn, { color: baseTheme.text }]}>{isTH ? 'พบในสินค้า: ' : 'Found in: '}<Text style={{ fontWeight: '700' }}>{productName}</Text></Text>
                            ) : null}
                            {crossContamination ? (
                                <View style={[styles.crossBox, { borderColor: `${baseTheme.band}80` }]}>
                                    <Icon icon="mdi:flask-outline" width={16} color={baseTheme.text} />
                                    <Text style={[styles.crossText, { color: baseTheme.text }]}>
                                        {isTH ? `ฉลากระบุ "${crossContamination}" — อาจมีสารผสมแฝง` : `Label mentions "${crossContamination}" — may contain traces`}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>

                    {/* LAYER 2 */}
                    {userTheme && (
                        <View style={[styles.layer2, { backgroundColor: userTheme.bg, borderColor: userTheme.border }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Icon icon="mdi:account-heart" width={28} color={userTheme.text} />
                                <Text style={{ flex: 1, fontSize: 12, color: userTheme.text, fontWeight: '700', opacity: 0.78 }}>{isTH ? 'โปรไฟล์ของคุณ' : 'Your profile'}</Text>
                                <View style={{ flexDirection: 'row', gap: 3 }}>
                                    {[1, 2, 3].map((i) => <View key={i} style={{ width: 20, height: 6, borderRadius: 3, backgroundColor: i <= userTheme.bars ? userTheme.bar : '#E0E0E0' }} />)}
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: userTheme.text }}>{userTheme.label}</Text>
                            </View>
                            <Text style={{ marginTop: 10, fontSize: 14, fontWeight: '800', color: '#333' }}>{userTheme.line}</Text>
                            {userTheme.caveat && (
                                <View style={[styles.caveat, { borderColor: `${userTheme.border}80` }]}>
                                    <Icon icon="mdi:lightning-bolt" width={16} color={userTheme.bar} />
                                    <Text style={styles.caveatText}>{userTheme.caveat.lead}{'\n'}<Text style={{ color: userTheme.text, fontWeight: '800' }}>{userTheme.caveat.body}</Text></Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.disclaimer}>
                        <Icon icon="mdi:information-outline" width={14} color="#999" />
                        <Text style={styles.disclaimerText}>
                            {isTH ? (disclaimer?.th || 'ระบบอาจไม่แม่นยำ 100% ข้อมูลส่วนผสมอาจไม่ครบ กรุณาอ่านฉลากด้วยตนเองทุกครั้ง') : (disclaimer?.en || 'NOT 100% accurate. Always read the label yourself.')}
                        </Text>
                    </View>

                    <Pressable onPress={handleAction} style={[styles.actionBtn, { backgroundColor: confirmStep === 1 ? '#B71C1C' : baseTheme.band }]}>
                        {confirmStep === 1 && <Icon icon="mdi:hand-back-right-outline" width={18} color="white" />}
                        <Text style={styles.actionText}>
                            {confirmStep === 1 ? (isTH ? 'แตะอีกครั้งเพื่อยืนยัน' : 'Tap again to confirm') : (isTH ? 'ฉันเข้าใจความเสี่ยง → ดำเนินการต่อ' : 'I understand the risk → Continue')}
                        </Text>
                    </Pressable>
                    <Text style={styles.frictionHint}>
                        {needsFriction ? (isTH ? 'กดยืนยัน 2 ครั้ง ก่อนดำเนินการ' : 'Tap twice to confirm') : (isTH ? 'กดยืนยันก่อนดำเนินการ' : 'Confirm to continue')}
                    </Text>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(20,0,0,0.72)' },
    scroll: { padding: 16, paddingTop: 50, gap: 16 },
    countPill: { alignSelf: 'center', backgroundColor: '#D32F2F', borderRadius: 999, paddingVertical: 9, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
    countText: { color: 'white', fontWeight: '900', fontSize: 14 },
    layer1: { backgroundColor: 'white', borderRadius: 24, borderWidth: 3, overflow: 'hidden' },
    layer1Bar: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    layer1Icon: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
    layer1Tag: { fontSize: 11, fontWeight: '700', color: 'white', opacity: 0.92 },
    layer1Head: { fontSize: 17, fontWeight: '900', color: 'white', lineHeight: 22, marginTop: 2 },
    layer1Body: { padding: 16 },
    layer1Text: { fontSize: 13, fontWeight: '700', lineHeight: 20 },
    matchCard: { backgroundColor: 'white', borderWidth: 1.5, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
    matchIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    matchName: { fontSize: 14, fontWeight: '900', color: '#1B1B1B' },
    matchFound: { fontSize: 11, color: '#777', fontWeight: '600', marginTop: 3 },
    badge: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: 999 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    foundIn: { marginTop: 12, fontSize: 12, fontStyle: 'italic', opacity: 0.85 },
    crossBox: { marginTop: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    crossText: { fontSize: 11, fontWeight: '700', lineHeight: 16, flexShrink: 1 },
    layer2: { borderWidth: 2, borderRadius: 20, padding: 14 },
    caveat: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    caveatText: { fontSize: 12, color: '#5D4037', fontWeight: '600', lineHeight: 18, flexShrink: 1 },
    disclaimer: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', paddingHorizontal: 4 },
    disclaimerText: { fontSize: 11, color: '#ccc', fontWeight: '600', lineHeight: 16, flexShrink: 1 },
    actionBtn: { width: '100%', paddingVertical: 16, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    actionText: { color: 'white', fontWeight: '900', fontSize: 15 },
    frictionHint: { fontSize: 11, color: '#bbb', textAlign: 'center', fontWeight: '600', marginTop: -8 },
});
