import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { Pressable } from "../components/Touchable";
import Svg, { Circle, G } from 'react-native-svg';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang } from '../utils/language';
import VIPUpgradeSheet from '../components/VIPUpgradeSheet';
import TrackedNutrientsSheet from '../components/TrackedNutrientsSheet';
import WHOInfoChip from '../components/WHOInfoChip';
import BottomNav from '../components/BottomNav';

export default function SugarTracker() {
    const navigate = useNavigate();
    const username = storage.getItem('username');
    const isTH = getCurrentLang() === 'TH';
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const [period, setPeriod] = useState('week');
    const [metric, setMetric] = useState('sugar');
    const [data, setData] = useState([]);
    const [whoLimits, setWhoLimits] = useState({ sugar_g: 50, starch_g: 300 });
    const [summary, setSummary] = useState(null);
    const [vipStatus, setVipStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [trackedNutrients, setTrackedNutrients] = useState([]);
    const [showTrackedSheet, setShowTrackedSheet] = useState(false);

    const isVip = vipStatus?.isVip ?? null;

    const loadData = async () => {
        setLoading(true); setErrorMsg(null);
        try {
            const vipRes = await axios.get(`${API_BASE_URL}/api/vip/status/${username}`, { headers: H, timeout: 8000 });
            setVipStatus(vipRes.data);
            if (!vipRes.data?.isVip) { setLoading(false); return; }
            const intakeRes = await axios.get(`${API_BASE_URL}/api/intake/summary/${username}?period=${period}`, { headers: H, timeout: 10000 });
            if (intakeRes.data?.success) { setData(intakeRes.data.data || []); setWhoLimits(intakeRes.data.whoLimits || { sugar_g: 50, starch_g: 300 }); setSummary(intakeRes.data.summary || null); }
            try { const hpRes = await axios.get(`${API_BASE_URL}/api/health-profile/${username}`, { headers: H, timeout: 6000 }); if (hpRes.data?.success) setTrackedNutrients(hpRes.data.profile?.tracked_nutrients || []); } catch {}
        } catch (err) { console.error(err); setErrorMsg(err.response?.data?.message || err.message || 'Failed to load'); }
        finally { setLoading(false); }
    };
    useEffect(() => { if (!username) { navigate('/login'); return; } loadData(); }, [period]);

    const handleUpgrade = async () => {
        try { const res = await axios.post(`${API_BASE_URL}/api/vip/upgrade`, { username, amount: 69, method: 'in_app', reference: `DEMO-${Date.now()}` }, { headers: H }); if (res.data?.success) { setShowUpgrade(false); await loadData(); } } catch (e) { console.error(e); }
    };

    const formatDay = (k) => { try { const d = new Date(k + 'T00:00:00+07:00'); return (isTH ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])[d.getDay()]; } catch { return '–'; } };

    const todayRec = data.length > 0 ? data[data.length - 1] : null;
    const yesterdayRec = data.length > 1 ? data[data.length - 2] : null;
    const todaySugar = todayRec?.total_sugar_g || 0;
    const todayStarch = todayRec?.total_starch_g || 0;
    const todayProtein = todayRec?.total_protein_g || 0;
    const sugarPct = whoLimits.sugar_g ? Math.round((todaySugar / whoLimits.sugar_g) * 100) : 0;
    const starchPct = whoLimits.starch_g ? Math.round((todayStarch / whoLimits.starch_g) * 100) : 0;
    const proteinPct = whoLimits.protein_g ? Math.round((todayProtein / whoLimits.protein_g) * 100) : 0;
    const sugarDelta = todaySugar - (yesterdayRec?.total_sugar_g || 0);

    const currentVal = metric === 'sugar' ? todaySugar : metric === 'starch' ? todayStarch : todayProtein;
    const currentLim = metric === 'sugar' ? whoLimits.sugar_g : metric === 'starch' ? whoLimits.starch_g : (whoLimits.protein_g || 50);
    const currentPct = metric === 'sugar' ? sugarPct : metric === 'starch' ? starchPct : proteinPct;
    const statusInfo = useMemo(() => {
        if (currentPct >= 100) return { color: '#D32F2F', bg: '#FFEBEE', text: isTH ? 'เกินขีดจำกัด' : 'Over limit', icon: 'mdi:alert-octagon' };
        if (currentPct >= 75) return { color: '#E65100', bg: '#FFF3E0', text: isTH ? 'ใกล้ขีดจำกัด' : 'Near limit', icon: 'mdi:alert' };
        if (currentPct >= 30) return { color: '#1B5E37', bg: '#E8F5E9', text: isTH ? 'ปลอดภัย' : 'On track', icon: 'mdi:check-circle' };
        return { color: '#558B2F', bg: '#F4FDC6', text: isTH ? 'เริ่มต้นวันดี' : 'Great start', icon: 'mdi:star' };
    }, [currentPct, isTH]);

    const R = 72, CIRC = 2 * Math.PI * R;
    const ringDash = CIRC * Math.max(0, 1 - currentPct / 100);

    if (isVip === false) {
        return (
            <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
                <Pressable onPress={() => navigate(-1)} style={st.floatBack}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                <ScrollView contentContainerStyle={{ paddingTop: 90, paddingHorizontal: 28, paddingBottom: 40, alignItems: 'center' }}>
                    <LinearGradient colors={['#F4FDC6', '#D5EE7A']} style={st.gateIcon}><Icon icon="mdi:chart-donut-variant" width={56} color="#1B5E37" /></LinearGradient>
                    <Text style={{ fontSize: 26, fontWeight: '900', color: '#1B5E37', marginBottom: 6 }}>{isTH ? 'สมุดสุขภาพประจำวัน' : 'Daily Health Diary'}</Text>
                    <Text style={{ fontSize: 14, color: '#888', fontWeight: '600', textAlign: 'center', lineHeight: 22 }}>{isTH ? 'ติดตามน้ำตาล + แป้งรายวัน เปรียบมาตรฐาน WHO อัตโนมัติ' : 'Track sugar + starch daily, auto compare with WHO'}</Text>
                    <View style={st.gateCard}>
                        {[{ icon: 'mdi:chart-bar', c: '#1B5E37', t: isTH ? 'กราฟ 7 วันย้อนหลัง' : 'Last 7 days chart' }, { icon: 'mdi:check-circle', c: '#4CAF50', t: isTH ? 'มาตรฐาน WHO อัตโนมัติ' : 'WHO standard auto' }, { icon: 'mdi:star-four-points', c: '#F9A825', t: isTH ? 'แต้ม ×1.5 ทุกการสแกน' : 'Points ×1.5' }, { icon: 'mdi:lightbulb-on', c: '#2196F3', t: isTH ? 'AI Insight จากข้อมูลคุณ' : 'AI Insight' }].map((f, i, a) => (
                            <View key={i} style={[st.gateRow, { borderBottomWidth: i < a.length - 1 ? 1 : 0 }]}>
                                <View style={[st.gateRowIcon, { backgroundColor: `${f.c}26` }]}><Icon icon={f.icon} width={18} color={f.c} /></View>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#333' }}>{f.t}</Text>
                            </View>
                        ))}
                    </View>
                    <Pressable onPress={() => setShowUpgrade(true)} style={st.gateBtn}><Icon icon="mdi:crown" width={18} color="#D5EE7A" /><Text style={{ color: '#D5EE7A', fontWeight: '900', fontSize: 15 }}>{isTH ? 'อัปเกรด VIP — ฿69/เดือน' : 'Upgrade VIP — ฿69/month'}</Text></Pressable>
                </ScrollView>
                <VIPUpgradeSheet open={showUpgrade} onClose={() => setShowUpgrade(false)} onUpgrade={handleUpgrade} trialDaysLeft={vipStatus?.status === 'trial' ? vipStatus?.daysRemaining : null} price={69} />
            </View>
        );
    }

    if (isVip === null || loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}><ActivityIndicator size="large" color="#1B5E37" /></View>;
    if (errorMsg) return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA', gap: 14, padding: 30 }}>
            <Icon icon="lucide:wifi-off" width={48} color="#CCC" />
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'โหลดข้อมูลไม่สำเร็จ' : 'Failed to load'}</Text>
            <Pressable onPress={loadData} style={{ paddingVertical: 12, paddingHorizontal: 28, backgroundColor: '#1B5E37', borderRadius: 50 }}><Text style={{ color: '#D5EE7A', fontWeight: '900' }}>{isTH ? 'ลองใหม่' : 'Retry'}</Text></Pressable>
        </View>
    );

    const chartField = metric === 'sugar' ? 'total_sugar_g' : metric === 'starch' ? 'total_starch_g' : 'total_protein_g';
    const limit = metric === 'sugar' ? whoLimits.sugar_g : metric === 'starch' ? whoLimits.starch_g : (whoLimits.protein_g || 50);
    const barColor = metric === 'protein' ? '#FFA726' : metric === 'sugar' ? '#D14545' : '#F4923B';
    const safeColor = metric === 'protein' ? '#43A047' : metric === 'sugar' ? '#2D8048' : '#26A69A';
    const maxVal = Math.max(...data.map((r) => r[chartField] || 0), limit, 1);

    const customMap = (todayRec?.custom_nutrients && typeof todayRec.custom_nutrients === 'object') ? todayRec.custom_nutrients : {};
    const mergedNutrients = [];
    trackedNutrients.forEach((n) => mergedNutrients.push({ ...n, value: customMap[n.key] || 0, tracked: true }));
    Object.entries(customMap).forEach(([k, v]) => {
        if (!trackedNutrients.some((n) => n.key === k)) {
            const m = k.match(/^(.+)_(g|mg|mcg|kcal|IU)$/i);
            const label = (m ? m[1] : k).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            mergedNutrients.push({ key: k, label, unit: m ? m[2] : '', goal: 0, value: v, tracked: false, iconHint: 'mdi:flask-outline' });
        }
    });

    const METRICS = [{ id: 'sugar', icon: 'mdi:water', th: 'น้ำตาล', en: 'Sugar' }, { id: 'starch', icon: 'lucide:wheat', th: 'แป้ง', en: 'Starch' }, { id: 'protein', icon: 'tabler:meat', th: 'โปรตีน', en: 'Protein' }];

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#D5EE7A', '#FAFAFA']} locations={[0, 0.5]} style={{ paddingTop: 36, paddingHorizontal: 22, paddingBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                        <Pressable onPress={() => navigate(-1)} style={st.backBtn}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'สมุดสุขภาพ' : 'Health Diary'}</Text>
                        {vipStatus && <View style={st.vipTag}><Icon icon="mdi:crown" width={12} color="#D5EE7A" /><Text style={{ fontSize: 10, fontWeight: '900', color: '#D5EE7A' }}>{vipStatus.status === 'trial' ? `${vipStatus.daysRemaining}d` : 'VIP'}</Text></View>}
                    </View>
                    <View style={st.heroCard}>
                        <View style={{ width: 160, height: 160 }}>
                            <Svg width={160} height={160}>
                                <G rotation={-90} origin="80, 80">
                                    <Circle cx={80} cy={80} r={R} fill="none" stroke="#F5F5F5" strokeWidth={14} />
                                    <Circle cx={80} cy={80} r={R} fill="none" stroke={statusInfo.color} strokeWidth={14} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={ringDash} />
                                </G>
                            </Svg>
                            <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 36, fontWeight: '900', color: statusInfo.color }}>{currentPct}<Text style={{ fontSize: 18 }}>%</Text></Text>
                                <Text style={{ fontSize: 11, color: '#888', fontWeight: '700' }}>{isTH ? 'ของ WHO' : 'of WHO'}</Text>
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <View style={[st.statusPill, { backgroundColor: statusInfo.bg }]}><Icon icon={statusInfo.icon} width={14} color={statusInfo.color} /><Text style={{ fontSize: 11, fontWeight: '900', color: statusInfo.color }}>{statusInfo.text}</Text></View>
                            <Text style={{ fontSize: 32, fontWeight: '900', color: '#1B5E37' }}>{Math.round(currentVal * 10) / 10}<Text style={{ fontSize: 14, color: '#888' }}>g</Text></Text>
                            <Text style={{ fontSize: 12, color: '#888', fontWeight: '700' }}>{isTH ? 'จาก' : 'of'} {currentLim}g · {metric === 'sugar' ? (isTH ? 'น้ำตาล' : 'sugar') : metric === 'starch' ? (isTH ? 'แป้ง' : 'starch') : (isTH ? 'โปรตีน' : 'protein')}</Text>
                            {metric === 'sugar' && yesterdayRec && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                                    <Icon icon={sugarDelta > 0 ? 'mdi:arrow-up-bold' : 'mdi:arrow-down-bold'} width={12} color={sugarDelta > 0 ? '#D32F2F' : '#2D8048'} />
                                    <Text style={{ fontSize: 11, fontWeight: '800', color: sugarDelta > 0 ? '#D32F2F' : '#2D8048' }}>{Math.abs(Math.round(sugarDelta * 10) / 10)}g</Text>
                                    <Text style={{ fontSize: 11, color: '#888', fontWeight: '600' }}>{isTH ? 'เทียบเมื่อวาน' : 'vs yesterday'}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 22, marginBottom: 14, flexDirection: 'row', gap: 10 }}>
                    <View style={[st.switcher, { flex: 1.4 }]}>
                        {METRICS.map((m) => (
                            <Pressable key={m.id} onPress={() => setMetric(m.id)} style={[st.switchBtn, { backgroundColor: metric === m.id ? '#1B5E37' : 'transparent' }]}>
                                <Icon icon={m.icon} width={14} color={metric === m.id ? '#D5EE7A' : '#888'} />
                                <Text style={{ fontWeight: '900', fontSize: 12, color: metric === m.id ? '#D5EE7A' : '#888' }}>{isTH ? m.th : m.en}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <View style={[st.switcher, { flex: 1 }]}>
                        {[{ id: 'day', l: isTH ? 'วันนี้' : 'Today' }, { id: 'week', l: isTH ? '7 วัน' : '7 days' }].map((p) => (
                            <Pressable key={p.id} onPress={() => setPeriod(p.id)} style={[st.switchBtn, { backgroundColor: period === p.id ? '#F4FDC6' : 'transparent' }]}>
                                <Text style={{ fontWeight: '900', fontSize: 12, color: period === p.id ? '#1B5E37' : '#888' }}>{p.l}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={{ paddingHorizontal: 22, marginBottom: 20 }}>
                    <View style={st.chartCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#1B5E37' }}>{metric === 'sugar' ? (isTH ? 'น้ำตาลสะสม' : 'Sugar trend') : metric === 'starch' ? (isTH ? 'แป้งสะสม' : 'Starch trend') : (isTH ? 'โปรตีนสะสม' : 'Protein')}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><WHOInfoChip /><Text style={{ fontSize: 11, color: '#999', fontWeight: '700' }}>{limit}g</Text></View>
                        </View>
                        {data.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <Icon icon="mdi:chart-bar-stacked" width={48} color="#DDD" />
                                <Text style={{ marginTop: 10, fontSize: 14, fontWeight: '700', color: '#AAA' }}>{isTH ? 'ยังไม่มีข้อมูล' : 'No data yet'}</Text>
                                <Text style={{ fontSize: 12, color: '#BBB', marginTop: 5 }}>{isTH ? 'เริ่มสแกนสินค้าเพื่อบันทึก' : 'Start scanning to record'}</Text>
                            </View>
                        ) : (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 170, gap: 6 }}>
                                    {data.map((rec, i) => {
                                        const val = rec[chartField] || 0;
                                        const isOver = val > limit;
                                        const h = Math.max((val / maxVal) * 150, val > 0 ? 4 : 2);
                                        return (
                                            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                                                <Text style={{ fontSize: 10, fontWeight: '900', color: isOver ? barColor : '#666', marginBottom: 4 }}>{val > 0 ? Math.round(val) : ''}</Text>
                                                <View style={{ width: '70%', height: h, backgroundColor: isOver ? barColor : safeColor, borderTopLeftRadius: 6, borderTopRightRadius: 6, opacity: val > 0 ? 1 : 0.2 }} />
                                            </View>
                                        );
                                    })}
                                </View>
                                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                                    {data.map((rec, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#666' }}>{formatDay(rec.dateKey)}</Text>)}
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {summary && period === 'week' && (
                    <View style={{ paddingHorizontal: 22, marginBottom: 20 }}>
                        <Text style={st.secLabel}>{isTH ? 'สรุปรายสัปดาห์' : 'WEEKLY SUMMARY'}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
                            {[
                                { lbl: isTH ? 'น้ำตาลเฉลี่ย' : 'Avg sugar', val: `${summary.avg_sugar_g}g`, icon: 'mdi:water', color: '#D14545' },
                                { lbl: isTH ? 'แป้งเฉลี่ย' : 'Avg starch', val: `${summary.avg_starch_g}g`, icon: 'lucide:wheat', color: '#E89938' },
                                { lbl: isTH ? 'โปรตีนเฉลี่ย' : 'Avg protein', val: `${summary.avg_protein_g || 0}g`, icon: 'tabler:meat', color: '#A35F2A' },
                                { lbl: isTH ? 'น้ำตาลเกิน' : 'Sugar over', val: `${summary.days_over_sugar} ${isTH ? 'วัน' : 'd'}`, icon: 'mynaui:danger-waves-solid', color: summary.days_over_sugar > 0 ? '#D14545' : '#43A047' },
                                { lbl: isTH ? 'แป้งเกิน' : 'Starch over', val: `${summary.days_over_starch} ${isTH ? 'วัน' : 'd'}`, icon: 'jam:triangle-danger-f', color: summary.days_over_starch > 0 ? '#E89938' : '#43A047' },
                                { lbl: isTH ? 'โปรตีนถึงเป้า' : 'Protein met', val: `${summary.days_meeting_protein || 0} ${isTH ? 'วัน' : 'd'}`, icon: 'lucide:trophy', color: (summary.days_meeting_protein || 0) >= 4 ? '#43A047' : '#888' },
                            ].map((sm, i) => (
                                <View key={i} style={st.summaryCard}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}><Icon icon={sm.icon} width={13} color={sm.color} /><Text style={{ fontSize: 9, color: '#888', fontWeight: '800' }}>{sm.lbl}</Text></View>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: sm.color }}>{sm.val}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {summary && (
                    <View style={{ paddingHorizontal: 22, marginBottom: 20 }}>
                        <View style={[st.tipCard, { backgroundColor: summary.days_over_sugar > 3 ? '#FFF1F0' : summary.days_over_sugar === 0 ? '#E8F5E9' : '#FFF8E1', borderColor: summary.days_over_sugar > 3 ? '#FFCDD2' : summary.days_over_sugar === 0 ? '#C8E6C9' : '#FFE082' }]}>
                            <Icon icon="mdi:lightbulb-on" width={22} color={summary.days_over_sugar > 3 ? '#D32F2F' : summary.days_over_sugar === 0 ? '#2D8048' : '#E65100'} />
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#333', lineHeight: 19, flexShrink: 1 }}>
                                {summary.days_over_sugar > 3 ? (isTH ? `น้ำตาลเกินมาตรฐาน ${summary.days_over_sugar} วันในสัปดาห์นี้ ลองเลือกเครื่องดื่มไม่หวานและสินค้าฉลากเขียวเพิ่มขึ้น` : `Sugar over WHO ${summary.days_over_sugar} days. Try unsweetened drinks.`) : summary.days_over_sugar === 0 ? (isTH ? 'คุณดูแลตัวเองได้ดีมาก น้ำตาลอยู่ในเกณฑ์ WHO ทุกวัน — รักษามาตรฐานนี้ต่อไป' : "Great work — sugar within WHO all week.") : (isTH ? `น้ำตาลเกิน ${summary.days_over_sugar} วัน — ลองลดเครื่องดื่มหวาน` : `Sugar over ${summary.days_over_sugar} day(s).`)}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={{ paddingHorizontal: 22, marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={st.secLabel}>{isTH ? 'สารอาหารที่ติดตาม' : 'TRACKED NUTRIENTS'}</Text><View style={st.vipMini}><Text style={{ fontSize: 10, color: '#1B5E37', fontWeight: '900' }}>VIP</Text></View></View>
                        <Pressable onPress={() => setShowTrackedSheet(true)} style={st.manageBtn}><Icon icon={mergedNutrients.length > 0 ? 'lucide:settings-2' : 'lucide:plus'} width={13} color="#1B5E37" /><Text style={{ fontSize: 11, fontWeight: '900', color: '#1B5E37' }}>{mergedNutrients.length > 0 ? (isTH ? 'จัดการ' : 'Manage') : (isTH ? 'เพิ่ม' : 'Add')}</Text></Pressable>
                    </View>
                    <View style={[st.nutCard, { paddingVertical: mergedNutrients.length > 0 ? 6 : 24 }]}>
                        {mergedNutrients.length === 0 ? (
                            <View style={{ alignItems: 'center' }}>
                                <Icon icon="mdi:pill-off" width={42} color="#DDD" />
                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#1B5E37', marginTop: 6 }}>{isTH ? 'ยังไม่ได้เลือกสารอาหารที่อยากติดตาม' : 'No tracked nutrients yet'}</Text>
                                <Text style={{ fontSize: 11, color: '#999', marginTop: 4, fontWeight: '600' }}>{isTH ? 'เช่น Zinc, Magnesium, Fiber' : 'e.g. Zinc, Magnesium, Fiber'}</Text>
                                <Pressable onPress={() => setShowTrackedSheet(true)} style={st.addFirstBtn}><Icon icon="lucide:plus" width={14} color="#D5EE7A" /><Text style={{ color: '#D5EE7A', fontWeight: '900', fontSize: 12 }}>{isTH ? 'เพิ่มสารอาหารแรก' : 'Add first nutrient'}</Text></Pressable>
                            </View>
                        ) : mergedNutrients.map((n, i) => {
                            const pct = n.goal > 0 ? Math.min(100, Math.round((n.value / n.goal) * 100)) : 0;
                            const status = !n.tracked ? '#999' : pct >= 100 ? '#2D8048' : pct >= 50 ? '#E89938' : '#D14545';
                            return (
                                <View key={n.key} style={[st.nutRow, { borderBottomWidth: i < mergedNutrients.length - 1 ? 1 : 0 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: n.goal > 0 ? 6 : 0 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                            <View style={[st.nutIcon, { backgroundColor: n.tracked ? '#EDF6E1' : '#F5F5F5' }]}><Icon icon={n.iconHint || 'mdi:pill'} width={16} color={n.tracked ? '#1B5E37' : '#999'} /></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#1B5E37' }}>{n.label}{!n.tracked ? '  ' : ''}{!n.tracked && <Text style={{ fontSize: 9, color: '#E65100' }}>({isTH ? 'จากสินค้า' : 'scan'})</Text>}</Text>
                                                {n.goal > 0 && <Text style={{ fontSize: 10, color: '#888', fontWeight: '700' }}>{isTH ? 'เป้า' : 'Goal'} {n.goal}{n.unit}</Text>}
                                            </View>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ fontSize: 17, fontWeight: '900', color: status }}>{Math.round((n.value || 0) * 10) / 10}<Text style={{ fontSize: 10, color: '#888' }}>{n.unit}</Text></Text>
                                            {n.goal > 0 && <Text style={{ fontSize: 10, fontWeight: '800', color: status }}>{pct}%</Text>}
                                        </View>
                                    </View>
                                    {n.goal > 0 && <View style={st.nutTrack}><View style={{ width: `${pct}%`, height: '100%', backgroundColor: status }} /></View>}
                                </View>
                            );
                        })}
                    </View>
                </View>

                <View style={{ paddingHorizontal: 22, marginBottom: 14 }}>
                    <Pressable onPress={() => Linking.openURL(`${API_BASE_URL}/api/health-report/${username}/html`)} style={st.reportBtn}><Icon icon="mdi:file-pdf-box" width={16} color="#1B5E37" /><Text style={{ color: '#1B5E37', fontWeight: '900', fontSize: 13 }}>{isTH ? 'รายงานสุขภาพรายเดือน (PDF)' : 'Monthly Report (PDF)'}</Text></Pressable>
                </View>
                <View style={{ paddingHorizontal: 22 }}>
                    <Pressable onPress={() => navigate('/scan')} style={st.scanCta}><Icon icon="lucide:scan-barcode" width={18} color="#D5EE7A" /><Text style={{ color: '#D5EE7A', fontWeight: '900', fontSize: 14 }}>{isTH ? 'สแกนสินค้า เพื่อบันทึกเพิ่ม' : 'Scan to record more'}</Text></Pressable>
                </View>
            </ScrollView>

            <BottomNav active="/dashboard" />
            <VIPUpgradeSheet open={showUpgrade} onClose={() => setShowUpgrade(false)} onUpgrade={handleUpgrade} trialDaysLeft={vipStatus?.status === 'trial' ? vipStatus?.daysRemaining : null} price={69} />
            <TrackedNutrientsSheet open={showTrackedSheet} onClose={() => setShowTrackedSheet(false)} username={username} current={trackedNutrients} onSaved={(l) => setTrackedNutrients(l)} />
        </View>
    );
}

const st = StyleSheet.create({
    floatBack: { position: 'absolute', top: 40, left: 20, zIndex: 10, width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15, elevation: 2 },
    gateIcon: { width: 108, height: 108, borderRadius: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    gateCard: { marginVertical: 24, width: '100%', maxWidth: 320, backgroundColor: 'white', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 30, elevation: 2 },
    gateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomColor: '#F5F5F5' },
    gateRowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    gateBtn: { paddingVertical: 14, paddingHorizontal: 32, backgroundColor: '#1B5E37', borderRadius: 50, flexDirection: 'row', alignItems: 'center', gap: 8 },
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15, elevation: 2 },
    vipTag: { backgroundColor: '#1B5E37', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
    heroCard: { backgroundColor: 'white', borderRadius: 28, paddingVertical: 20, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: '#1B5E20', shadowOpacity: 0.08, shadowRadius: 40, elevation: 3 },
    statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginBottom: 10 },
    switcher: { backgroundColor: 'white', borderRadius: 14, padding: 4, flexDirection: 'row', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, elevation: 1 },
    switchBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
    chartCard: { backgroundColor: 'white', borderRadius: 24, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 25, elevation: 2 },
    secLabel: { fontSize: 13, fontWeight: '900', color: '#1B5E37', letterSpacing: 0.5, marginBottom: 10 },
    summaryCard: { width: '31.5%', backgroundColor: 'white', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#F5F5F5', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 },
    tipCard: { borderWidth: 1.5, borderRadius: 20, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    vipMini: { backgroundColor: '#F4FDC6', paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20 },
    manageBtn: { backgroundColor: 'white', borderWidth: 1.5, borderColor: '#D5EE7A', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
    nutCard: { backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 20, elevation: 1 },
    addFirstBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 22, backgroundColor: '#1B5E37', borderRadius: 50, flexDirection: 'row', alignItems: 'center', gap: 6 },
    nutRow: { paddingVertical: 10, borderBottomColor: '#F5F5F5' },
    nutIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    nutTrack: { height: 4, backgroundColor: '#F5F5F5', borderRadius: 4, overflow: 'hidden' },
    reportBtn: { width: '100%', paddingVertical: 12, backgroundColor: 'white', borderWidth: 1.5, borderColor: '#D5EE7A', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    scanCta: { width: '100%', paddingVertical: 14, backgroundColor: '#1B5E37', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#1B5E20', shadowOpacity: 0.25, shadowRadius: 25, elevation: 4 },
});
