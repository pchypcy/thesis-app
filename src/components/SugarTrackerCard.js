// components/SugarTrackerCard.js — สมุดสุขภาพวันนี้ (ported to RN)
import React from 'react';
import { View, StyleSheet } from "react-native";
import { Pressable } from "./Touchable";
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { Icon } from './Icon';
import { getCurrentLang } from '../utils/language';
import WHOInfoChip from './WHOInfoChip';

export default function SugarTrackerCard({
    isVip, todayIntake, weekData, whoLimits, product,
    onUnlockClick, onOpenFullTracker, trialDaysLeft = null,
}) {
    const currentLang = getCurrentLang();

    const sugarLim = whoLimits?.sugar_g || 50;
    const starchLim = whoLimits?.starch_g || 260;
    const proteinGoal = whoLimits?.protein_g || 50;
    const sugarVal = isVip ? Math.round((todayIntake?.total_sugar_g || 0) * 10) / 10 : 37;
    const starchVal = isVip ? Math.round((todayIntake?.total_starch_g || 0) * 10) / 10 : 148;
    const proteinVal = isVip ? Math.round((todayIntake?.total_protein_g || 0) * 10) / 10 : 28;
    const thisSugar = Math.round((product?.sugar_g || 0) * 10) / 10;
    const sugarPct = Math.min(Math.round((sugarVal / sugarLim) * 100), 999);
    const starchPct = Math.min(Math.round((starchVal / starchLim) * 100), 999);
    const proteinPct = Math.min(Math.round((proteinVal / proteinGoal) * 100), 999);
    const projectedSugar = Math.round((sugarVal + thisSugar) * 10) / 10;
    const projectedPct = Math.min(Math.round((projectedSugar / sugarLim) * 100), 999);
    const willOverflow = projectedSugar > sugarLim;

    const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    const enDays = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
    const dayLbls = currentLang === 'TH' ? thaiDays : enDays;
    const dayOfWeekFromKey = (key) => { try { return dayLbls[new Date(key + 'T00:00:00+07:00').getDay()]; } catch { return '–'; } };

    const fallbackWeek = [22, 18, 35, 41, 29, 33, sugarVal];
    const chartBars = (isVip && weekData && weekData.length > 0)
        ? weekData.map((r) => ({ d: dayOfWeekFromKey(r.dateKey), v: Math.round(r.total_sugar_g || 0) }))
        : fallbackWeek.map((v, i) => ({ d: dayLbls[(new Date().getDay() - 6 + i + 7) % 7], v }));
    const maxBar = Math.max(...chartBars.map((b) => b.v), sugarLim, 1);

    const statusPill = sugarPct >= 100
        ? { txt: currentLang === 'TH' ? 'เกินขีดจำกัด' : 'Over limit', bg: '#FFEBEE', fg: '#C62828' }
        : sugarPct >= 75
            ? { txt: currentLang === 'TH' ? 'ระวัง' : 'Caution', bg: '#FFF3E0', fg: '#E65100' }
            : { txt: currentLang === 'TH' ? 'ปลอดภัย' : 'On track', bg: '#E8F5E9', fg: '#2D8048' };

    const R = 56;
    const CIRC = 2 * Math.PI * R;
    const ringOffset = CIRC * Math.max(0, Math.min(1, 1 - sugarPct / 100));
    const ringStroke = sugarPct >= 100 ? '#F44336' : sugarPct >= 75 ? '#FF9800' : '#1B5E37';

    const Bar = ({ icon, iconColor, label, val, lim, pct, valColor, fillColor }) => (
        <>
            <View style={styles.barRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Icon icon={icon} width={13} color={iconColor} />
                    <Text style={styles.barLabel}>{label}</Text>
                </View>
                <Text style={[styles.barVal, { color: valColor }]}>{val}<Text style={styles.barUnit}>g/{lim}g</Text></Text>
            </View>
            <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: fillColor }]} />
            </View>
        </>
    );

    return (
        <View style={styles.wrap}>
            <View style={styles.card}>
                {/* header */}
                <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={styles.headerIcon}><Icon icon="solar:notebook-bookmark-bold" width={18} color="#D5EE7A" /></View>
                        <View>
                            <Text style={styles.headerTitle}>{currentLang === 'TH' ? 'สมุดสุขภาพวันนี้' : "Today's Diary"}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                <Text style={styles.headerSub}>{currentLang === 'TH' ? 'เทียบกับเกณฑ์' : 'Compared to'}</Text>
                                <WHOInfoChip />
                            </View>
                        </View>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
                        <Text style={{ color: statusPill.fg, fontSize: 11, fontWeight: '900' }}>{statusPill.txt}</Text>
                    </View>
                </View>

                {/* hero */}
                <View style={styles.hero}>
                    <View style={{ width: 128, height: 128 }}>
                        <Svg width={128} height={128}>
                            <G rotation={-90} origin="64, 64">
                                <Circle cx={64} cy={64} r={R} fill="none" stroke="#F5F5F5" strokeWidth={10} />
                                <Circle cx={64} cy={64} r={R} fill="none" stroke={ringStroke} strokeWidth={10} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={ringOffset} />
                            </G>
                        </Svg>
                        <View style={styles.ringCenter}>
                            <Text style={{ fontSize: 30, fontWeight: '900', color: ringStroke }}>{sugarPct}<Text style={{ fontSize: 15, fontWeight: '800' }}>%</Text></Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Text style={styles.ringSub}>{currentLang === 'TH' ? 'ของ' : 'of'}</Text>
                                <WHOInfoChip />
                            </View>
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Bar icon="mdi:water" iconColor="#D14545" label={currentLang === 'TH' ? 'น้ำตาล' : 'Sugar'} val={sugarVal} lim={sugarLim} pct={sugarPct} valColor="#1B5E37" fillColor={ringStroke} />
                        <View style={{ height: 10 }} />
                        <Bar icon="lucide:wheat" iconColor="#E89938" label={currentLang === 'TH' ? 'แป้ง' : 'Starch'} val={starchVal} lim={starchLim} pct={starchPct} valColor="#26A69A" fillColor={starchPct >= 100 ? '#FF9800' : '#26A69A'} />
                        <View style={{ height: 10 }} />
                        <Bar icon="tabler:meat" iconColor="#A35F2A" label={currentLang === 'TH' ? 'โปรตีน' : 'Protein'} val={proteinVal} lim={proteinGoal} pct={proteinPct} valColor="#A35F2A" fillColor={proteinPct >= 100 ? '#43A047' : '#C58A56'} />
                        {thisSugar > 0 && (
                            <View style={[styles.projBox, { backgroundColor: willOverflow ? '#FFF1F0' : '#F1F8E9', borderColor: willOverflow ? '#FFCDD2' : '#C8E6C9' }]}>
                                <Icon icon={willOverflow ? 'mdi:alert-circle' : 'mdi:plus-circle'} width={16} color={willOverflow ? '#D32F2F' : '#2D8048'} />
                                <Text style={[styles.projText, { color: willOverflow ? '#C62828' : '#2D8048' }]}>
                                    {currentLang === 'TH'
                                        ? `หากกินสินค้านี้ → ${projectedSugar}g (${projectedPct}%)${willOverflow ? ' ⚠️ เกิน!' : ''}`
                                        : `If consumed → ${projectedSugar}g (${projectedPct}%)${willOverflow ? ' over!' : ''}`}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* mini chart */}
                <View>
                    <View style={styles.chartHeader}>
                        <Text style={styles.chartTitle}>{currentLang === 'TH' ? '7 วันย้อนหลัง' : 'LAST 7 DAYS'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <WHOInfoChip />
                            <Text style={{ fontSize: 10, color: '#999', fontWeight: '700' }}>{sugarLim}g</Text>
                        </View>
                    </View>
                    <View style={styles.chartBars}>
                        {chartBars.map((b, i) => {
                            const isToday = i === chartBars.length - 1;
                            const isOver = b.v > sugarLim;
                            const h = Math.max((b.v / maxBar) * 56, b.v > 0 ? 4 : 2);
                            const color = isOver ? '#F44336' : isToday ? '#1B5E37' : 'rgba(27,94,32,0.35)';
                            return (
                                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                                    <View style={{ width: '70%', height: h, backgroundColor: color, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                                    <Text style={{ fontSize: 9, fontWeight: isToday ? '900' : '700', color: isToday ? '#1B5E37' : '#AAA' }}>{b.d}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                <Pressable onPress={onOpenFullTracker} style={styles.fullBtn}>
                    <Icon icon="mdi:arrow-expand-all" width={15} color="#D5EE7A" />
                    <Text style={styles.fullBtnText}>{currentLang === 'TH' ? 'ดูรายละเอียดทั้งหมด' : 'View full details'}</Text>
                </Pressable>
            </View>

            {/* Lock overlay for free user */}
            {!isVip && (
                <View style={styles.lockOverlay}>
                    <View style={styles.lockCard}>
                        <LinearGradient colors={['#F4FDC6', '#D5EE7A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.lockIcon}>
                            <Icon icon={trialDaysLeft != null && trialDaysLeft > 0 ? 'mdi:gift-outline' : 'mdi:crown'} width={30} color="#1B5E37" />
                        </LinearGradient>
                        <Text style={styles.lockTitle}>
                            {trialDaysLeft != null && trialDaysLeft > 0
                                ? (currentLang === 'TH' ? `ทดลองฟรี — เหลือ ${trialDaysLeft} วัน` : `Free trial — ${trialDaysLeft} days left`)
                                : (currentLang === 'TH' ? 'สมุดสุขภาพ' : 'Health Diary')}
                        </Text>
                        <Text style={styles.lockSub}>
                            {currentLang === 'TH' ? 'ติดตามน้ำตาล + แป้งรายวัน เปรียบกับ WHO อัตโนมัติ' : 'Track sugar + starch daily vs WHO'}
                        </Text>
                        <Pressable onPress={onUnlockClick} style={styles.unlockBtn}>
                            <Icon icon="mdi:lock-open-variant" width={15} color="#D5EE7A" />
                            <Text style={styles.unlockText}>{currentLang === 'TH' ? 'ปลดล็อกด้วย VIP ฿69' : 'Unlock VIP ฿69'}</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { paddingHorizontal: 25, marginBottom: 24, position: 'relative' },
    card: { backgroundColor: 'white', borderRadius: 28, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#1B5E20', shadowOpacity: 0.08, shadowRadius: 50, shadowOffset: { width: 0, height: 16 }, elevation: 3, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    headerIcon: { width: 34, height: 34, backgroundColor: '#1B5E37', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 14, fontWeight: '900', color: '#1B5E37' },
    headerSub: { fontSize: 10, color: '#888', fontWeight: '700' },
    statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    hero: { flexDirection: 'row', gap: 18, alignItems: 'center', marginBottom: 18 },
    ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    ringSub: { fontSize: 10, color: '#888', fontWeight: '700' },
    barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
    barLabel: { fontSize: 12, fontWeight: '800', color: '#444' },
    barVal: { fontSize: 13, fontWeight: '900' },
    barUnit: { fontSize: 10, color: '#888' },
    barTrack: { height: 8, backgroundColor: '#F5F5F5', borderRadius: 10, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 10 },
    projBox: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    projText: { fontSize: 11, fontWeight: '800', flexShrink: 1, lineHeight: 15 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    chartTitle: { fontSize: 11, fontWeight: '800', color: '#666', letterSpacing: 0.5 },
    chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 56, gap: 4 },
    fullBtn: { marginTop: 14, paddingVertical: 12, backgroundColor: '#1B5E37', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    fullBtnText: { color: '#D5EE7A', fontWeight: '900', fontSize: 13 },
    lockOverlay: { position: 'absolute', top: 0, left: 25, right: 25, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    lockCard: { backgroundColor: 'white', borderRadius: 24, padding: 22, alignItems: 'center', width: '88%', maxWidth: 280, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 60, shadowOffset: { width: 0, height: 24 }, elevation: 12 },
    lockIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    lockTitle: { fontSize: 15, fontWeight: '900', color: '#1B5E37', marginBottom: 4, textAlign: 'center' },
    lockSub: { fontSize: 11, color: '#888', fontWeight: '600', lineHeight: 17, marginBottom: 14, textAlign: 'center' },
    unlockBtn: { width: '100%', paddingVertical: 12, backgroundColor: '#1B5E37', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    unlockText: { color: '#D5EE7A', fontWeight: '900', fontSize: 13 },
});
