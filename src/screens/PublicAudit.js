import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Pressable } from "../components/Touchable";
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate, useParams } from '../shims/router';
import { API_BASE_URL } from '../config';

const ACTION_MAP = {
    submit: { icon: 'mdi:account-plus', color: '#9C27B0', label: 'ผู้ใช้ส่งข้อมูล' },
    vote: { icon: 'mdi:thumb-up-down', color: '#1976D2', label: 'ชุมชนโหวต' },
    community_approve: { icon: 'mdi:account-group', color: '#1976D2', label: 'ชุมชนยืนยัน' },
    admin_sign: { icon: 'mdi:shield-account', color: '#1B5E37', label: 'แอดมินลงนาม' },
    fda_verify: { icon: 'mdi:bank', color: '#0D47A1', label: 'ตรวจกับ อย.' },
    finalize: { icon: 'mdi:check-decagram', color: '#1B5E37', label: 'อนุมัติขั้นสุดท้าย' },
    reject: { icon: 'mdi:close-octagon', color: '#C62828', label: 'ปฏิเสธ' },
};
const fmtDate = (d) => (!d ? '-' : new Date(d).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }));
const fmtRel = (d) => {
    if (!d) return '-';
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return 'เมื่อสักครู่';
    if (m < 60) return `${m} นาทีที่แล้ว`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ชม.ที่แล้ว`;
    return `${Math.floor(h / 24)} วันที่แล้ว`;
};

function TrustRing({ score = 0, size = 120 }) {
    const c = score >= 80 ? '#1B5E37' : score >= 50 ? '#1976D2' : score >= 25 ? '#F57C00' : '#C62828';
    const r = (size - 18) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    const label = score >= 80 ? 'น่าเชื่อถือสูง' : score >= 50 ? 'น่าเชื่อถือปานกลาง' : score >= 25 ? 'ยังไม่ครบ' : 'ต้องตรวจสอบ';
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
                <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
                    <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E8F5E9" strokeWidth={12} fill="none" />
                    <Circle cx={size / 2} cy={size / 2} r={r} stroke={c} strokeWidth={12} fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
                </G>
            </Svg>
            <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 36, fontWeight: '900', color: c }}>{Math.round(score)}</Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#666', letterSpacing: 1 }}>/ 100</Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: c, marginTop: 4 }}>{label}</Text>
            </View>
        </View>
    );
}

const BREAKDOWN_LABELS = {
    off_match: '🌍 ข้อมูลตรงกับ OpenFoodFacts', admin_curated: '🛡️ แอดมินจัดข้อมูลเอง', curated_seed: '🌱 Demo data',
    fda_source: '🏛️ มาจากแหล่ง อย.', community_source: '👥 ผู้ใช้ส่งข้อมูล', fda_format: '✅ เลข อย. รูปแบบถูกต้อง',
    fda_verified: '🏛️ แอดมินตรวจกับ อย. แล้ว', label_photo: '📷 มีรูปฉลาก', community_votes: '👍 ชุมชนยืนยัน', admin_signoff: '🖊️ แอดมินลงนาม',
};

export default function PublicAudit() {
    const { barcode, from } = useParams();
    const navigate = useNavigate();
    const fromInside = from === 'app';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        axios.get(`${API_BASE_URL}/api/products/audit/${barcode}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then((r) => { if (!cancelled) setData(r.data); })
            .catch((e) => { if (!cancelled) setError(e.response?.data?.message || 'ไม่พบสินค้า'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [barcode]);

    if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}><ActivityIndicator size="large" color="#1B5E37" /></View>;
    if (error || !data?.success) {
        return (
            <View style={{ flex: 1, backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', padding: 25 }}>
                <Icon icon="mdi:alert-circle-outline" width={60} color="#C62828" />
                <Text style={{ color: '#C62828', fontWeight: '900', marginTop: 16, fontSize: 18 }}>ไม่พบสินค้า</Text>
                <Text style={{ color: '#666', marginTop: 4 }}>{error}</Text>
                <Pressable onPress={() => navigate(-1)} style={{ marginTop: 20, paddingVertical: 12, paddingHorizontal: 30, backgroundColor: '#1B5E37', borderRadius: 50 }}><Text style={{ color: 'white', fontWeight: '800' }}>ย้อนกลับ</Text></Pressable>
            </View>
        );
    }

    const { product, admin_reviews, audit_chain, integrity, trust } = data;
    const approvals = (admin_reviews || []).filter((r) => r.decision === 'approve');

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#1B5E37', '#2E7D32']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Pressable onPress={() => (fromInside ? navigate(-1) : navigate('/home'))} style={s.backBtn}><Icon icon="lucide:arrow-left" width={20} color="white" /></Pressable>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#D5EE7A', letterSpacing: 1.5 }}>PUBLIC AUDIT</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <View style={{ alignItems: 'center', marginTop: 20 }}>
                        <View style={s.barcodeBadge}><Icon icon="lucide:barcode" width={14} color="white" /><Text style={{ color: 'white', fontSize: 11, fontWeight: '800' }}>{product.barcode}</Text></View>
                        <Text style={{ color: 'white', fontSize: 22, fontWeight: '900', marginTop: 8, textAlign: 'center' }}>{product.name}</Text>
                        <Text style={{ color: '#D5EE7A', fontWeight: '700', fontSize: 13 }}>{product.brand}</Text>
                    </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 25, marginTop: -30 }}>
                    <View style={s.trustCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                            <TrustRing score={trust?.score || 0} size={120} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#888', letterSpacing: 1 }}>TRUST SCORE</Text>
                                <Text style={{ fontSize: 15, fontWeight: '900', color: '#1B5E37', marginVertical: 6 }}>คะแนนความน่าเชื่อถือ</Text>
                                <Text style={{ fontSize: 12, color: '#666', lineHeight: 18 }}>คำนวณจากแหล่งข้อมูล + ชุมชน + แอดมิน + อย.</Text>
                            </View>
                        </View>
                        {trust?.breakdown && Object.keys(trust.breakdown).length > 0 && (
                            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                                <Text style={{ fontSize: 10, fontWeight: '900', color: '#666', letterSpacing: 1, marginBottom: 10 }}>วิธีคำนวณ</Text>
                                {Object.entries(trust.breakdown).map(([key, val]) => (
                                    <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                                        <Text style={{ color: '#555', fontWeight: '600', fontSize: 12, flex: 1 }}>{BREAKDOWN_LABELS[key] || key}</Text>
                                        <Text style={{ color: '#1B5E37', fontWeight: '900', fontSize: 12 }}>+{val}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                <View style={{ paddingHorizontal: 25, paddingTop: 16 }}>
                    <View style={[s.integrityBox, { backgroundColor: integrity?.valid ? '#E8F5E9' : '#FFEBEE', borderColor: integrity?.valid ? '#66BB6A' : '#EF5350' }]}>
                        <View style={[s.integrityIcon, { backgroundColor: integrity?.valid ? '#1B5E37' : '#C62828' }]}><Icon icon={integrity?.valid ? 'mdi:shield-check' : 'mdi:shield-alert'} width={24} color={integrity?.valid ? '#D5EE7A' : 'white'} /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: integrity?.valid ? '#1B5E37' : '#C62828' }}>{integrity?.valid ? '✓ Hash Chain ตรวจสอบแล้ว' : '⚠ Hash Chain พบความผิดปกติ'}</Text>
                            <Text style={{ fontSize: 11, color: integrity?.valid ? '#1B5E37' : '#C62828', fontWeight: '600', marginTop: 2 }}>{integrity?.total} entries · SHA-256 · {integrity?.valid ? 'ต้นฉบับครบถ้วน' : `ผิดที่ #${integrity?.brokenAt}`}</Text>
                        </View>
                    </View>
                </View>

                {approvals.length > 0 && (
                    <View style={{ paddingHorizontal: 25, paddingTop: 16 }}>
                        <Text style={s.secLabel}>ADMIN SIGN-OFF (DUAL)</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {[0, 1].map((i) => {
                                const ap = approvals[i];
                                return (
                                    <View key={i} style={[s.signCard, { borderColor: ap ? '#66BB6A' : '#E0E0E0', borderStyle: ap ? 'solid' : 'dashed' }]}>
                                        {ap ? (
                                            <>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon icon="mdi:check-circle" width={14} color="#1B5E37" /><Text style={{ fontSize: 10, fontWeight: '900', color: '#1B5E37' }}>Admin #{i + 1}</Text></View>
                                                <Text style={{ fontSize: 13, fontWeight: '800', color: '#333', marginTop: 4 }}>{ap.admin}</Text>
                                                <Text style={{ fontSize: 10, color: '#888', fontWeight: '600' }}>{fmtRel(ap.at)}</Text>
                                            </>
                                        ) : (
                                            <View style={{ alignItems: 'center', paddingVertical: 6 }}><Icon icon="mdi:clock-outline" width={20} color="#BDBDBD" /><Text style={{ fontSize: 11, color: '#999', fontWeight: '700', marginTop: 2 }}>รอลงนาม</Text></View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                <View style={{ paddingHorizontal: 25, paddingTop: 20 }}>
                    <Text style={s.secLabel}>AUDIT TRAIL · {audit_chain?.length || 0} ENTRIES</Text>
                    <View style={s.timelineCard}>
                        {!audit_chain || audit_chain.length === 0 ? (
                            <Text style={{ textAlign: 'center', padding: 20, color: '#999', fontSize: 13, fontWeight: '600' }}>ไม่มีบันทึก audit chain</Text>
                        ) : audit_chain.map((entry, i) => {
                            const a = ACTION_MAP[entry.action] || { icon: 'mdi:circle', color: '#999', label: entry.action };
                            const isLast = i === audit_chain.length - 1;
                            return (
                                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                                    <View style={{ alignItems: 'center' }}>
                                        <View style={[s.timelineDot, { backgroundColor: a.color }]}><Icon icon={a.icon} width={18} color="white" /></View>
                                        {!isLast && <View style={s.timelineLine} />}
                                    </View>
                                    <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <View style={[s.seqTag, { backgroundColor: `${a.color}26` }]}><Text style={{ fontSize: 10, fontWeight: '900', color: a.color }}>#{entry.seq}</Text></View>
                                            <Text style={{ fontSize: 13, fontWeight: '900', color: '#333' }}>{a.label}</Text>
                                        </View>
                                        <Text style={{ fontSize: 11, color: '#666', fontWeight: '600', marginTop: 4 }}>โดย <Text style={{ fontWeight: '900', color: '#333' }}>{entry.actor}</Text> · {fmtRel(entry.at)}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                                            <Icon icon="mdi:pound" width={11} color="#BDBDBD" />
                                            <Text style={{ fontSize: 9, color: '#BDBDBD' }}>{entry.hash?.slice(0, 16)}…{entry.hash?.slice(-8)}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                <View style={{ paddingHorizontal: 25, paddingTop: 20 }}>
                    <View style={s.disclaimer}>
                        <Icon icon="mdi:information" width={20} color="#E65100" />
                        <Text style={{ fontSize: 11, color: '#5D4037', fontWeight: '600', lineHeight: 17, flexShrink: 1 }}>
                            <Text style={{ color: '#E65100', fontWeight: '900' }}>ข้อจำกัด: </Text>ไม่มีระบบใดยืนยันข้อมูลอาหารได้ 100% โปรดอ่านฉลากด้วยตนเอง และปรึกษาแพทย์หากแพ้รุนแรง ระบบนี้เป็น defense-in-depth ไม่ใช่การการันตี
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    header: { paddingTop: 30, paddingHorizontal: 25, paddingBottom: 50 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    barcodeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 50 },
    trustCard: { backgroundColor: 'white', borderRadius: 24, padding: 22, borderWidth: 1, borderColor: '#E0E0E0', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 50, elevation: 4 },
    integrityBox: { borderWidth: 2, borderRadius: 20, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
    integrityIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    secLabel: { fontSize: 11, fontWeight: '900', color: '#888', letterSpacing: 1, marginBottom: 10 },
    signCard: { flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 12, borderWidth: 2 },
    timelineCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E0E0E0' },
    timelineDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    timelineLine: { flex: 1, width: 2, backgroundColor: '#E0E0E0', minHeight: 20 },
    seqTag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 50 },
    disclaimer: { backgroundColor: '#FFF8E1', borderWidth: 1.5, borderColor: '#FFE082', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10 },
});
