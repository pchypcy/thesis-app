import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
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

const FILTER_OPTIONS = [
    { key: 'all', th: 'ทั้งหมด', en: 'All', color: '#455A64' },
    { key: 'critical', th: 'ร้ายแรง', en: 'Critical', color: '#D32F2F' },
    { key: 'high', th: 'รุนแรง', en: 'High', color: '#F44336' },
    { key: 'medium', th: 'ระคายเคือง', en: 'Medium', color: '#FF9800' },
];
const SEVERITY_OPTIONS = [
    { key: 'mild', th: 'เล็กน้อย', en: 'Mild', color: '#FBC02D', bars: 1 },
    { key: 'medium', th: 'ปานกลาง', en: 'Medium', color: '#FB8C00', bars: 2 },
    { key: 'severe', th: 'รุนแรง', en: 'Severe', color: '#D32F2F', bars: 3 },
];
const defaultUserSeverity = (b) => (b === 'critical' || b === 'high' ? 'severe' : b === 'medium' ? 'medium' : 'mild');

export default function AllergyProfile() {
    const navigate = useNavigate();
    const username = storage.getItem('username');
    const isTH = getCurrentLang() === 'TH';
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const [allAllergens, setAllAllergens] = useState([]);
    const [selected, setSelected] = useState([]);
    const [severities, setSeverities] = useState({});
    const [conditions, setConditions] = useState({ has_diabetes: false, has_kidney_disease: false, has_high_pressure: false });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [disclaimer, setDisclaimer] = useState(null);
    const [filterSev, setFilterSev] = useState('all');

    useEffect(() => {
        if (!username) { navigate('/login'); return; }
        (async () => {
            try {
                const [listRes, profileRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/health-profile/allergen-list`, { headers: H }),
                    axios.get(`${API_BASE_URL}/api/health-profile/${username}`, { headers: H }),
                ]);
                if (listRes.data.success) { setAllAllergens(listRes.data.allergens || []); setDisclaimer(listRes.data.disclaimer || null); }
                if (profileRes.data.success) {
                    const p = profileRes.data.profile;
                    if (Array.isArray(p.allergen_entries) && p.allergen_entries.length) {
                        setSelected(p.allergen_entries.map((e) => e.allergenId));
                        setSeverities(Object.fromEntries(p.allergen_entries.map((e) => [e.allergenId, e.severity])));
                    } else { setSelected(p.allergens || []); setSeverities(p.allergen_severities || {}); }
                    setConditions(p.conditions || {});
                }
            } catch (err) { console.error('Allergy load error:', err); } finally { setLoading(false); }
        })();
    }, []);

    const toggleAllergen = (id) => {
        setSelected((prev) => {
            if (prev.includes(id)) { setSeverities((sv) => { const n = { ...sv }; delete n[id]; return n; }); return prev.filter((a) => a !== id); }
            const allergen = allAllergens.find((a) => a.id === id);
            setSeverities((sv) => (sv[id] ? sv : { ...sv, [id]: defaultUserSeverity(allergen?.severity_default) }));
            return [...prev, id];
        });
    };
    const setSeverityFor = (id, sev) => setSeverities((prev) => ({ ...prev, [id]: sev }));
    const toggleCondition = (key) => setConditions((prev) => ({ ...prev, [key]: !prev[key] }));

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const allergen_entries = selected.map((id) => ({ allergenId: id, severity: severities[id] || defaultUserSeverity(allAllergens.find((a) => a.id === id)?.severity_default) }));
            const res = await axios.patch(`${API_BASE_URL}/api/health-profile/${username}`, { allergen_entries, conditions }, { headers: H });
            if (res.data.success) toast.success(isTH ? 'ปรับการตั้งค่าเรียบร้อย' : 'Settings applied');
        } catch (err) { console.error('save error:', err); toast.error(isTH ? 'ปรับไม่สำเร็จ' : 'Update failed'); }
        finally { setSaving(false); }
    };

    const sorted = [...allAllergens].sort((a, b) => (isTH ? a.labelTH : a.labelEN).localeCompare(isTH ? b.labelTH : b.labelEN, isTH ? 'th' : 'en'));
    const filtered = filterSev === 'all' ? sorted : sorted.filter((a) => a.severity_default === filterSev);

    const renderCard = (a) => {
        const isOn = selected.includes(a.id);
        const isCritical = a.severity_default === 'critical';
        const accent = isCritical ? '#D32F2F' : a.severity_default === 'high' ? '#F44336' : '#FF9800';
        const curSev = severities[a.id] || defaultUserSeverity(a.severity_default);
        return (
            <View key={a.id} style={[s.card, { backgroundColor: isOn ? `${accent}1A` : 'white', borderColor: isOn ? accent : '#F0F0F0' }]}>
                <Pressable onPress={() => toggleAllergen(a.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[s.cardIcon, { backgroundColor: isOn ? accent : '#F5F5F5' }]}><Icon icon={a.icon || 'mdi:alert-circle'} width={22} color={isOn ? 'white' : '#999'} /></View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 14, fontWeight: '800', color: isOn ? accent : '#333' }}>{isTH ? a.labelTH : a.labelEN}</Text>
                            {isCritical && <View style={s.criticalBadge}><Text style={{ fontSize: 9, color: 'white', fontWeight: '900' }}>CRITICAL</Text></View>}
                        </View>
                        <Text style={{ fontSize: 11, color: '#888', fontWeight: '600', marginTop: 2 }}>
                            {a.severity_default === 'critical' ? (isTH ? 'แพ้ร้ายแรง — อาจถึงตาย' : 'Severe — life-threatening') : a.severity_default === 'high' ? (isTH ? 'อาการรุนแรง' : 'High severity') : (isTH ? 'อาการระคายเคือง' : 'Mild')}
                        </Text>
                    </View>
                    <View style={[s.checkCircle, { backgroundColor: isOn ? accent : 'white', borderColor: isOn ? accent : '#DDD' }]}>{isOn && <Icon icon="mdi:check-bold" width={14} color="white" />}</View>
                </Pressable>
                {isOn && (
                    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: `${accent}66`, borderStyle: 'dashed' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                            <Icon icon="mdi:tune-variant" width={13} color={accent} />
                            <Text style={{ fontSize: 10, color: accent, fontWeight: '800' }}>{isTH ? 'ระดับการแพ้ของคุณ' : 'YOUR SENSITIVITY LEVEL'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            {SEVERITY_OPTIONS.map((opt) => {
                                const active = curSev === opt.key;
                                return (
                                    <Pressable key={opt.key} onPress={() => setSeverityFor(a.id, opt.key)} style={[s.sevBtn, { backgroundColor: active ? opt.color : 'white', borderColor: active ? opt.color : '#E0E0E0' }]}>
                                        <View style={{ flexDirection: 'row', gap: 2 }}>
                                            {[1, 2, 3].map((i) => <View key={i} style={{ width: 10, height: 4, borderRadius: 2, backgroundColor: i <= opt.bars ? (active ? 'white' : opt.color) : (active ? 'rgba(255,255,255,0.3)' : '#E0E0E0') }} />)}
                                        </View>
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: active ? 'white' : '#555', marginTop: 4 }}>{isTH ? opt.th : opt.en}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}><ActivityIndicator size="large" color="#1B5E37" /></View>;

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#FFCDD2', '#FAFAFA']} locations={[0, 0.6]} style={s.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Pressable onPress={() => navigate('/profile')} style={s.backBtn}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#B71C1C' }}>{isTH ? 'โปรไฟล์การแพ้อาหาร' : 'Allergy Profile'}</Text>
                        <View style={s.freeBadge}><Text style={{ fontSize: 11, fontWeight: '900', color: '#1B5E37' }}>FREE</Text></View>
                    </View>
                    <View style={s.heroCard}>
                        <View style={s.heroIcon}><Icon icon="mdi:shield-cross" width={24} color="#D32F2F" /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'เลือกสารที่คุณแพ้' : 'Select your allergens'}</Text>
                            <Text style={{ fontSize: 11, color: '#888', fontWeight: '600', marginTop: 2 }}>{isTH ? 'ระบบจะเตือนทันทีก่อนรับประทาน' : "We'll alert you before you consume them"}</Text>
                        </View>
                        <View style={[s.countBox, { backgroundColor: selected.length > 0 ? '#D32F2F' : '#BDBDBD' }]}>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: 'white' }}>{selected.length}</Text>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: 'white', opacity: 0.92 }}>{isTH ? 'รายการ' : 'items'}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
                    <View style={s.disclaimer}>
                        <Icon icon="mdi:alert-circle-outline" width={20} color="#E65100" />
                        <Text style={{ fontSize: 11, color: '#5D4037', fontWeight: '600', lineHeight: 17, flexShrink: 1 }}>
                            <Text style={{ color: '#E65100', fontWeight: '900' }}>{isTH ? 'คำเตือน: ' : 'Disclaimer: '}</Text>
                            {isTH ? (disclaimer?.th || 'ระบบนี้ไม่ได้แม่นยำ 100% อาจมีสารผสมแฝง กรุณาอ่านฉลากด้วยตนเองทุกครั้ง และปรึกษาแพทย์หากแพ้รุนแรง') : (disclaimer?.en || 'NOT 100% accurate. Always read the label.')}
                        </Text>
                    </View>
                </View>

                {sorted.length > 0 && (
                    <View style={{ paddingHorizontal: 22, paddingTop: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon icon="mdi:format-list-bulleted" width={16} color="#D32F2F" /><Text style={{ fontSize: 12, color: '#D32F2F', fontWeight: '900' }}>{isTH ? 'รายการสารก่อภูมิแพ้' : 'ALLERGENS'}</Text></View>
                            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                {FILTER_OPTIONS.map((opt) => {
                                    const active = filterSev === opt.key;
                                    return <Pressable key={opt.key} onPress={() => setFilterSev(opt.key)} style={[s.filterBtn, { backgroundColor: active ? opt.color : 'white', borderColor: active ? opt.color : '#E0E0E0' }]}><Text style={{ fontSize: 11, fontWeight: '800', color: active ? 'white' : '#666' }}>{isTH ? opt.th : opt.en}</Text></Pressable>;
                                })}
                            </View>
                        </View>
                        {filtered.length > 0 ? <View style={{ gap: 8 }}>{filtered.map(renderCard)}</View> : <Text style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#999', fontWeight: '700' }}>{isTH ? 'ไม่มีรายการในระดับนี้' : 'No items at this level'}</Text>}
                    </View>
                )}

                <View style={{ paddingHorizontal: 22, paddingTop: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}><Icon icon="solar:health-bold" width={16} color="#1B5E37" /><Text style={{ fontSize: 12, color: '#1B5E37', fontWeight: '900' }}>{isTH ? 'โรคประจำตัว' : 'HEALTH CONDITIONS'}</Text></View>
                    <View style={{ gap: 8 }}>
                        {[{ key: 'has_diabetes', icon: 'healthicons:diabetes-24px', th: 'โรคเบาหวาน', en: 'Diabetes' }, { key: 'has_kidney_disease', icon: 'healthicons:kidneys-24px', th: 'โรคไต', en: 'Kidney disease' }, { key: 'has_high_pressure', icon: 'mage:heart-health', th: 'โรคความดันโลหิตสูง', en: 'High blood pressure' }].map((c) => {
                            const isOn = !!conditions[c.key];
                            return (
                                <Pressable key={c.key} onPress={() => toggleCondition(c.key)} style={[s.condCard, { backgroundColor: isOn ? '#E8F5E9' : 'white', borderColor: isOn ? '#4CAF50' : '#F0F0F0' }]}>
                                    <View style={[s.condIcon, { backgroundColor: isOn ? '#4CAF50' : '#F5F5F5' }]}><Icon icon={c.icon} width={20} color={isOn ? 'white' : '#999'} /></View>
                                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '800', color: isOn ? '#1B5E37' : '#333' }}>{isTH ? c.th : c.en}</Text>
                                    <View style={[s.checkCircle, { backgroundColor: isOn ? '#4CAF50' : 'white', borderColor: isOn ? '#4CAF50' : '#DDD' }]}>{isOn && <Icon icon="mdi:check-bold" width={14} color="white" />}</View>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            <View style={s.saveBar}>
                <Text style={{ fontSize: 11, color: '#888', fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>{selected.length > 0 ? (isTH ? `เลือก ${selected.length} ชนิด` : `${selected.length} selected`) : (isTH ? 'ยังไม่ได้เลือกสารใด' : 'No allergens selected')}</Text>
                <Pressable onPress={handleSave} disabled={saving} style={[s.saveBtn, { opacity: saving ? 0.75 : 1 }]}>
                    {saving ? <ActivityIndicator color="#D5EE7A" /> : <Icon icon="lucide:shield-check" width={18} color="#D5EE7A" />}
                    <Text style={{ color: '#D5EE7A', fontWeight: '900', fontSize: 15 }}>{saving ? (isTH ? 'กำลังเปิดเกราะป้องกัน...' : 'Activating...') : (isTH ? 'เปิดใช้งานเกราะป้องกัน' : 'Activate shield')}</Text>
                </Pressable>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    header: { paddingTop: 40, paddingHorizontal: 25, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    freeBadge: { backgroundColor: 'white', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    heroCard: { backgroundColor: 'white', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 25, elevation: 2 },
    heroIcon: { width: 46, height: 46, backgroundColor: '#FFEBEE', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    countBox: { borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', minWidth: 54 },
    disclaimer: { backgroundColor: '#FFF8E1', borderWidth: 1.5, borderColor: '#FFCC80', borderRadius: 14, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    card: { borderWidth: 2, borderRadius: 18, padding: 14, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
    cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    criticalBadge: { backgroundColor: '#D32F2F', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
    checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    sevBtn: { flex: 1, paddingVertical: 8, borderWidth: 1.5, borderRadius: 12, alignItems: 'center' },
    filterBtn: { paddingVertical: 5, paddingHorizontal: 11, borderWidth: 1.5, borderRadius: 999 },
    condCard: { borderWidth: 2, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    condIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    saveBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 20, backgroundColor: 'rgba(255,255,255,0.97)' },
    saveBtn: { width: '100%', paddingVertical: 16, backgroundColor: '#1B5E37', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#1B5E20', shadowOpacity: 0.25, shadowRadius: 25, elevation: 4 },
});
