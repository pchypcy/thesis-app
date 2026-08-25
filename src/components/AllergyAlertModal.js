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

// ★ สีระดับที่ "ผู้ใช้ตั้งเอง" (Layer 2) — แดง → ส้ม → เหลือง เรียงตามความรุนแรง (ตรงกับการ์ดในหน้า Result)
const USER_SEV = {
    severe: { fg: '#B71C1C', bar: '#D32F2F', bg: '#FFEBEE', border: '#EF9A9A', bars: 3, th: 'รุนแรง', en: 'Severe' },
    medium: { fg: '#D84315', bar: '#F4511E', bg: '#FFF1E8', border: '#FFAB91', bars: 2, th: 'ปานกลาง', en: 'Medium' },
    mild:   { fg: '#F57F17', bar: '#FBC02D', bg: '#FFFDE7', border: '#FFE082', bars: 1, th: 'เล็กน้อย', en: 'Mild' },
};

function getUserTheme(userSeverity, isTH) {
    const c = USER_SEV[userSeverity];
    if (!c) return null;
    const common = { bg: c.bg, border: c.border, text: c.fg, bar: c.bar, bars: c.bars, label: isTH ? c.th : c.en };
    if (userSeverity === 'severe') return { ...common, line: isTH ? 'คุณตั้งค่าว่าแพ้รุนแรง' : 'You marked this as severe', caveat: { lead: isTH ? 'การแพ้รุนแรงอาจเกิดอาการเฉียบพลันได้แม้ได้รับเพียงเล็กน้อย' : 'A severe allergy can cause acute reactions from even a trace', body: isTH ? 'โปรดหลีกเลี่ยงอย่างเคร่งครัด และพบแพทย์ทันทีหากมีอาการ' : 'Avoid it strictly, and seek medical help immediately' } };
    if (userSeverity === 'medium') return { ...common, line: isTH ? 'คุณตั้งค่าว่าแพ้ปานกลาง' : 'You marked this as medium', caveat: { lead: isTH ? 'การแพ้ปานกลางอาจมีอาการชัดเจนขึ้นเมื่อได้รับในปริมาณมาก' : 'A moderate allergy can cause clearer symptoms with larger amounts', body: isTH ? 'ควรหลีกเลี่ยงเมื่อเป็นไปได้ และตรวจสอบกับแพทย์เป็นระยะ' : 'Avoid it when you can' } };
    return { ...common, line: isTH ? 'คุณตั้งค่าว่าแพ้เล็กน้อย' : 'You marked this as mild', caveat: { lead: isTH ? 'การแพ้เล็กน้อยมักมีอาการไม่รุนแรง แต่ก็ยังควรเฝ้าระวัง' : 'A mild allergy usually causes only minor symptoms', body: isTH ? 'สังเกตอาการของตัวเองทุกครั้ง' : 'Watch for symptoms each time' } };
}

function getLayer1Body(baseSev, name, isTH) {
    if (baseSev === 'critical' || baseSev === 'high') {
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
    // ★ หัวกล่อง = เสียงของ "ระบบ" ล้วนเสมอ (ไม่ผสม user) — ป้าย "ประเมินโดยระบบ" จึงพูดความจริง
    const baseTheme = getBaseTheme(baseSev, isTH);
    const userTheme = getUserTheme(userSev, isTH);
    const systemSaysDanger = baseSev === 'critical' || baseSev === 'high';
    // เตือนทั้งที่ระบบไม่ได้จัดว่าอันตราย → เพราะผู้ใช้ตั้งเองว่าแพ้รุนแรง
    const userDriven = !systemSaysDanger && userSev === 'severe';
    const needsFriction = systemSaysDanger || userSev === 'severe';
    const headBand = userDriven ? USER_SEV.severe.bar : baseTheme.band;

    // ★ สรุประดับที่ผู้ใช้ตั้งไว้แบบรายตัว (เลิกยุบเหลือค่าสูงสุดค่าเดียว)
    const userCounts = matches.reduce((acc, m) => { const k = m.userSeverity || 'unset'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
    const userSummary = ['severe', 'medium', 'mild']
        .filter((k) => userCounts[k])
        .map((k) => `${isTH ? USER_SEV[k].th : USER_SEV[k].en} ${userCounts[k]}`)
        .concat(userCounts.unset ? [isTH ? `ยังไม่ได้ตั้ง ${userCounts.unset}` : `not set ${userCounts.unset}`] : [])
        .join(' · ');
    // ★ ชี้ตัวการที่ทำให้ระดับพุ่งไปสูงสุด — ไม่งั้นผู้ใช้หาที่มาของคำว่า "รุนแรง" ไม่เจอ
    const userSevDrivers = matches
        .filter((m) => m.userSeverity === userSev)
        .map((m) => (isTH ? m.labelTH : m.labelEN).replace(/\(.*?\)/g, '').trim());

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
                    <View style={[styles.countPill, { backgroundColor: headBand }]}>
                        <Icon icon="mdi:alert-octagon" width={18} color="white" />
                        <Text style={styles.countText}>
                            {isTH ? `พบสารที่คุณแพ้ ${matches.length} รายการ` : `${matches.length} allergen${matches.length > 1 ? 's' : ''} found`}
                        </Text>
                    </View>

                    {/* ★ เตือนเพราะผู้ใช้ตั้งเอง — ระบุเหตุผลให้ชัด ไม่ยืมปากระบบ */}
                    {userDriven && (
                        <View style={styles.userDrivenRibbon}>
                            <Icon icon="mdi:account-alert" width={16} color="white" />
                            <Text style={styles.userDrivenText}>
                                {isTH ? 'แจ้งเตือนนี้เกิดจากระดับที่คุณตั้งเอง — ระบบไม่ได้จัดสารนี้เป็นกลุ่มอันตรายสูง' : 'This alert comes from your own setting — the system does not class this as high-risk'}
                            </Text>
                        </View>
                    )}

                    {/* LAYER 1 — เสียงของระบบล้วน */}
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
                                    {getLayer1Body(baseSev, (isTH ? primaryMatch.labelTH : primaryMatch.labelEN).replace(/\(.*?\)/g, '').trim(), isTH)}
                                </Text>
                            )}
                            <View style={{ marginTop: 14, gap: 8 }}>
                                {sortedMatches.map((m, i) => {
                                    const mBase = m.baseSeverity || m.severity;
                                    const mBadge = mBase === 'critical' ? '#D32F2F' : mBase === 'high' ? '#E53935' : '#FB8C00';
                                    // ป้ายนี้คือ "ระดับที่ระบบประเมิน" — เขียนกำกับให้ชัด ไม่ให้สับสนกับระดับที่ผู้ใช้ตั้ง
                                    const mBadgeLabel = mBase === 'critical' ? (isTH ? 'ระบบ: ร้ายแรง' : 'System: Critical')
                                        : mBase === 'high' ? (isTH ? 'ระบบ: สูง' : 'System: High')
                                            : (isTH ? 'ระบบ: ปานกลาง' : 'System: Medium');
                                    // ★ กรอบการ์ดยึดระดับที่ "ผู้ใช้ตั้งให้สารตัวนี้" (ไม่ใช่สีรวมของทั้งกล่อง)
                                    const u = m.userSeverity ? USER_SEV[m.userSeverity] : null;
                                    return (
                                        <View key={i} style={[styles.matchCard, { borderColor: u ? u.border : baseTheme.cardBorder, borderWidth: u ? 2 : 1.5 }]}>
                                            <View style={[styles.matchIcon, { backgroundColor: `${mBadge}22` }]}>
                                                <Icon icon={m.icon || 'mdi:alert-circle'} width={24} color={mBadge} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.matchName}>{isTH ? m.labelTH : m.labelEN}</Text>
                                                <Text style={styles.matchFound}>
                                                    {isTH ? 'พบจาก: ' : 'Found in: '}{(m.matchedKeywords || []).slice(0, 3).join(', ')}
                                                </Text>
                                                {/* ★ ระดับที่ผู้ใช้ตั้งไว้ — รายสาร */}
                                                <View style={[styles.userLevelRow, { backgroundColor: u ? u.bg : '#F5F5F5', borderColor: u ? u.border : '#E0E0E0' }]}>
                                                    <Icon icon={u ? 'mdi:account-check' : 'mdi:account-off-outline'} width={11} color={u ? u.fg : '#9E9E9E'} />
                                                    <Text style={[styles.userLevelText, { color: u ? u.fg : '#9E9E9E' }]}>
                                                        {u
                                                            ? (isTH ? `คุณตั้งไว้: ${u.th}` : `You set: ${u.en}`)
                                                            : (isTH ? 'ยังไม่ได้ตั้งระดับ · ใช้ค่าระบบ' : 'Not set · using system level')}
                                                    </Text>
                                                </View>
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
                            {/* หัวแถว: ชื่อหัวข้อซ้าย — ระดับที่ต้องระวังอยู่มุมขวาบน */}
                            <View style={styles.l2Head}>
                                <Icon icon="mdi:account-heart" width={19} color={userTheme.text} />
                                <Text style={[styles.l2HeadText, { color: userTheme.text }]}>{isTH ? 'ระดับที่คุณตั้งไว้' : 'Levels you set'}</Text>
                                <View style={{ flexDirection: 'row', gap: 3 }}>
                                    {[1, 2, 3].map((i) => <View key={i} style={{ width: 18, height: 6, borderRadius: 3, backgroundColor: i <= userTheme.bars ? userTheme.bar : '#E0E0E0' }} />)}
                                </View>
                                <Text style={[styles.l2HeroLevel, { color: userTheme.text }]}>{isTH ? `ต้องระวัง: ${userTheme.label}` : `Act on: ${userTheme.label}`}</Text>
                            </View>

                            {/* ★ ชี้ตัวการ — ระดับข้างบนมาจากสารตัวไหน */}
                            <View style={[styles.l2Hero, { borderColor: userTheme.border }]}>
                                <Text style={styles.l2HeroWhy}>
                                    {matches.length > 1 && userSevDrivers.length > 0 ? (<>
                                        {isTH ? 'เพราะ ' : 'Because '}
                                        <Text style={{ fontWeight: '900', color: userTheme.text }}>{userSevDrivers.join(', ')}</Text>
                                        {isTH ? ` คุณตั้งไว้ว่าแพ้${userTheme.label} และสินค้านี้มีสารนั้นอยู่` : ` — you marked it ${userTheme.label.toLowerCase()}, and this product contains it`}
                                    </>) : userTheme.line}
                                </Text>
                            </View>

                            {/* ★ สรุปรายตัวเป็นชิป — อ่านเร็วกว่าบรรทัดข้อความยาว */}
                            {matches.length > 1 && (
                                <View style={styles.l2Chips}>
                                    {['severe', 'medium', 'mild'].filter((k) => userCounts[k]).map((k) => (
                                        <View key={k} style={[styles.l2Chip, { backgroundColor: USER_SEV[k].bg, borderColor: USER_SEV[k].border }]}>
                                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: USER_SEV[k].bar }} />
                                            <Text style={[styles.l2ChipText, { color: USER_SEV[k].fg }]}>{isTH ? USER_SEV[k].th : USER_SEV[k].en}</Text>
                                            <Text style={[styles.l2ChipNum, { color: USER_SEV[k].fg }]}>{userCounts[k]}</Text>
                                        </View>
                                    ))}
                                    {userCounts.unset ? (
                                        <View style={[styles.l2Chip, { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' }]}>
                                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#BDBDBD' }} />
                                            <Text style={[styles.l2ChipText, { color: '#9E9E9E' }]}>{isTH ? 'ยังไม่ได้ตั้ง' : 'Not set'}</Text>
                                            <Text style={[styles.l2ChipNum, { color: '#9E9E9E' }]}>{userCounts.unset}</Text>
                                        </View>
                                    ) : null}
                                </View>
                            )}

                            {/* ★ ข้อความเตือน — ไม่ใส่ไอคอนข้างซ้าย เพื่อให้ข้อความได้ความกว้างเต็ม ไม่มีคำตกไปโดดบรรทัดใหม่ */}
                            {userTheme.caveat && (
                                <View style={[styles.caveat, { borderColor: `${userTheme.border}80` }]}>
                                    <View style={styles.caveatHead}>
                                        <Icon icon="mdi:lightning-bolt" width={13} color={userTheme.bar} />
                                        <Text style={[styles.caveatHeadText, { color: userTheme.text }]}>{isTH ? 'ข้อควรระวัง' : 'Take care'}</Text>
                                    </View>
                                    <Text style={styles.caveatText}>{userTheme.caveat.lead}</Text>
                                    <Text style={[styles.caveatText, { color: userTheme.text, fontWeight: '800', marginTop: 3 }]}>{userTheme.caveat.body}</Text>
                                </View>
                            )}

                            {/* ★ อธิบายกฎ MAX — สารที่แพ้น้อยกว่าไม่ได้ลดความเสี่ยงของตัวที่แพ้หนักสุด */}
                            {matches.length > 1 && (
                                <View style={styles.ruleRow}>
                                    <Icon icon="mdi:scale-balance" width={12} color="#8A6A55" />
                                    <Text style={styles.ruleText}>
                                        {isTH
                                            ? 'ระบบยึด "ระดับที่รุนแรงที่สุด" เสมอ ไม่ใช่ระดับที่พบบ่อยที่สุด เพราะสารที่คุณแพ้น้อยกว่าไม่ได้ลดความเสี่ยงของสารที่คุณแพ้รุนแรงกว่า'
                                            : 'We always follow the highest level you set — not the most common one. Milder allergens do not reduce the risk from a severe one.'}
                                    </Text>
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

                    <Pressable onPress={handleAction} style={[styles.actionBtn, { backgroundColor: confirmStep === 1 ? '#B71C1C' : headBand }]}>
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
    userLevelRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 7 },
    userLevelText: { fontSize: 10.5, fontWeight: '800' },
    userDrivenRibbon: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#D32F2F', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 13, marginTop: -4 },
    userDrivenText: { flex: 1, color: 'white', fontSize: 11.5, fontWeight: '800', lineHeight: 16 },
    badge: { flexShrink: 0, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 999 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: '900' },
    foundIn: { marginTop: 12, fontSize: 12, fontStyle: 'italic', opacity: 0.85 },
    crossBox: { marginTop: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    crossText: { fontSize: 11, fontWeight: '700', lineHeight: 16, flexShrink: 1 },
    layer2: { borderWidth: 2, borderRadius: 20, padding: 13 },
    l2Head: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
    l2HeadText: { flex: 1, fontSize: 12, fontWeight: '800', opacity: 0.8 },
    l2Hero: { backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1.5, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
    l2HeroLevel: { fontSize: 13, fontWeight: '900' },
    l2HeroWhy: { fontSize: 12.5, fontWeight: '700', color: '#444', lineHeight: 19 },
    l2Chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    l2Chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
    l2ChipText: { fontSize: 11, fontWeight: '800' },
    l2ChipNum: { fontSize: 12, fontWeight: '900' },
    ruleRow: { marginTop: 11, paddingTop: 9, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.08)', flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
    ruleText: { flex: 1, fontSize: 10.5, fontWeight: '600', color: '#8A6A55', lineHeight: 15 },
    caveat: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 10 },
    caveatHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
    caveatHeadText: { fontSize: 11, fontWeight: '900' },
    // 10.5 = ขนาดใหญ่สุดที่ข้อความเตือน (ยาว 58 ตัวอักษร) ยังจบใน 1 บรรทัดบนจอ 360px — ใหญ่กว่านี้จะมีคำตกบรรทัด
    caveatText: { fontSize: 10.5, color: '#5D4037', fontWeight: '600', lineHeight: 15.5 },
    disclaimer: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', paddingHorizontal: 4 },
    disclaimerText: { fontSize: 11, color: '#ccc', fontWeight: '600', lineHeight: 16, flexShrink: 1 },
    actionBtn: { width: '100%', paddingVertical: 16, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    actionText: { color: 'white', fontWeight: '900', fontSize: 15 },
    frictionHint: { fontSize: 11, color: '#bbb', textAlign: 'center', fontWeight: '600', marginTop: -8 },
});
