// components/TrackedNutrientsSheet.js — เลือก nutrient ที่อยาก track (ported to RN)
import React, { useState, useEffect } from 'react';
import { View, Modal, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Pressable } from "./Touchable";
import axios from 'axios';
import { Text, TextInput } from './Text';
import { Icon } from './Icon';
import { toast } from './Toast';
import { API_BASE_URL } from '../config';
import { getCurrentLang } from '../utils/language';

const PRESETS = [
    { key: 'zinc_mg', label: 'Zinc', labelTH: 'ซิงค์', unit: 'mg', goal: 11, iconHint: 'mdi:atom' },
    { key: 'magnesium_mg', label: 'Magnesium', labelTH: 'แมกนีเซียม', unit: 'mg', goal: 400, iconHint: 'mdi:periodic-table' },
    { key: 'fiber_g', label: 'Fiber', labelTH: 'ไฟเบอร์', unit: 'g', goal: 25, iconHint: 'lucide:wheat' },
    { key: 'calcium_mg', label: 'Calcium', labelTH: 'แคลเซียม', unit: 'mg', goal: 1000, iconHint: 'mdi:bone' },
    { key: 'iron_mg', label: 'Iron', labelTH: 'ธาตุเหล็ก', unit: 'mg', goal: 18, iconHint: 'mdi:magnet' },
    { key: 'vitamin_c_mg', label: 'Vitamin C', labelTH: 'วิตามินซี', unit: 'mg', goal: 90, iconHint: 'mdi:fruit-citrus' },
    { key: 'vitamin_d_mcg', label: 'Vitamin D', labelTH: 'วิตามินดี', unit: 'mcg', goal: 20, iconHint: 'mdi:white-balance-sunny' },
    { key: 'potassium_mg', label: 'Potassium', labelTH: 'โพแทสเซียม', unit: 'mg', goal: 3500, iconHint: 'mdi:flask-outline' },
];
const UNITS = ['mg', 'g', 'mcg', 'IU', 'kcal'];

export default function TrackedNutrientsSheet({ open, onClose, username, current = [], onSaved }) {
    const isTH = getCurrentLang() === 'TH';
    const [list, setList] = useState([]);
    const [customLabel, setCustomLabel] = useState('');
    const [customUnit, setCustomUnit] = useState('mg');
    const [customGoal, setCustomGoal] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (open) setList([...current]); }, [open]);

    const isTracked = (key) => list.some((n) => n.key === key);
    const togglePreset = (p) => setList((l) => (isTracked(p.key) ? l.filter((n) => n.key !== p.key) : [...l, { ...p }]));
    const addCustom = () => {
        const label = customLabel.trim();
        if (!label) return toast.error(isTH ? 'กรุณาใส่ชื่อสารอาหาร' : 'Please enter a name');
        const key = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 28) + '_' + customUnit;
        if (isTracked(key)) return toast.error(isTH ? 'มีอยู่ในรายการแล้ว' : 'Already in list');
        setList((l) => [...l, { key, label, unit: customUnit, goal: Number(customGoal) || 0, iconHint: 'mdi:pill' }]);
        setCustomLabel(''); setCustomGoal('');
    };
    const updateGoal = (key, goal) => setList((l) => l.map((n) => (n.key === key ? { ...n, goal: Number(goal) || 0 } : n)));
    const remove = (key) => setList((l) => l.filter((n) => n.key !== key));

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await axios.patch(`${API_BASE_URL}/api/health-profile/${username}`, { tracked_nutrients: list }, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            if (res.data?.success) { toast.success(isTH ? 'อัปเดตรายการเรียบร้อย' : 'Updated'); onSaved?.(res.data.profile?.tracked_nutrients || list); onClose?.(); }
        } catch (e) { toast.error(e.response?.data?.message || (isTH ? 'อัปเดตไม่สำเร็จ' : 'Failed')); } finally { setSaving(false); }
    };

    return (
        <Modal visible={!!open} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={s.overlay} onPress={onClose}>
                <Pressable style={s.sheet} onPress={() => {}}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                        <View style={s.handle} />
                        <View style={{ paddingHorizontal: 24, paddingTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View>
                                <Text style={{ fontSize: 20, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'สารอาหารที่ติดตาม' : 'Tracked Nutrients'}</Text>
                                <Text style={{ fontSize: 12, color: '#888', fontWeight: '600', marginTop: 4 }}>{isTH ? 'เลือกสารอาหารที่อยากเห็นในกราฟ' : 'Choose nutrients to track daily'}</Text>
                            </View>
                            <Pressable onPress={onClose} style={s.closeX}><Icon icon="lucide:x" width={20} color="#666" /></Pressable>
                        </View>

                        {list.length > 0 && (
                            <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
                                <Text style={s.secLabel}>{isTH ? `ที่ติดตาม (${list.length})` : `TRACKED (${list.length})`}</Text>
                                {list.map((n) => (
                                    <View key={n.key} style={s.trackedRow}>
                                        <View style={s.trackedIcon}><Icon icon={n.iconHint || 'mdi:pill'} width={18} color="#1B5E37" /></View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '900', color: '#1B5E37' }}>{n.label}</Text>
                                            <Text style={{ fontSize: 11, color: '#888', fontWeight: '700' }}>{isTH ? 'เป้าหมาย/วัน' : 'Daily goal'}</Text>
                                        </View>
                                        <TextInput value={String(n.goal)} onChangeText={(v) => updateGoal(n.key, v)} keyboardType="number-pad" style={s.goalInput} />
                                        <Text style={{ fontSize: 12, color: '#666', fontWeight: '800', minWidth: 28 }}>{n.unit}</Text>
                                        <Pressable onPress={() => remove(n.key)} style={s.removeBtn}><Icon icon="lucide:trash-2" width={14} color="#D14545" /></Pressable>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={{ paddingHorizontal: 24, paddingTop: 14 }}>
                            <Text style={s.secLabel}>{isTH ? 'แนะนำ' : 'SUGGESTED'}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
                                {PRESETS.map((p) => {
                                    const tracked = isTracked(p.key);
                                    return (
                                        <Pressable key={p.key} onPress={() => togglePreset(p)} style={[s.preset, { backgroundColor: tracked ? '#D5EE7A' : 'white', borderColor: tracked ? '#1B5E37' : '#E5E5E5' }]}>
                                            <View style={[s.presetIcon, { backgroundColor: tracked ? '#1B5E37' : '#F1F8E9' }]}><Icon icon={p.iconHint} width={16} color={tracked ? '#D5EE7A' : '#1B5E37'} /></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 12, fontWeight: '900', color: tracked ? '#1B5E37' : '#333' }}>{isTH ? p.labelTH : p.label}</Text>
                                                <Text style={{ fontSize: 10, opacity: 0.7, fontWeight: '700', color: tracked ? '#1B5E37' : '#888' }}>{p.goal}{p.unit}/วัน</Text>
                                            </View>
                                            {tracked && <Icon icon="mdi:check-circle" width={16} color="#1B5E37" />}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
                            <Text style={s.secLabel}>{isTH ? 'เพิ่มเอง' : 'CUSTOM'}</Text>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                <TextInput value={customLabel} onChangeText={setCustomLabel} placeholder={isTH ? 'เช่น Omega-3' : 'e.g. Omega-3'} placeholderTextColor="#BDBDBD" style={[s.customInput, { flex: 2 }]} />
                                <TextInput value={customGoal} onChangeText={setCustomGoal} placeholder={isTH ? 'เป้า' : 'goal'} placeholderTextColor="#BDBDBD" keyboardType="number-pad" style={[s.customInput, { flex: 1, textAlign: 'center' }]} />
                                <Pressable onPress={() => setCustomUnit(UNITS[(UNITS.indexOf(customUnit) + 1) % UNITS.length])} style={s.unitBtn}><Text style={{ fontSize: 12, fontWeight: '800', color: '#1B5E37' }}>{customUnit}</Text></Pressable>
                                <Pressable onPress={addCustom} style={s.addBtn}><Icon icon="lucide:plus" width={16} color="#D5EE7A" /></Pressable>
                            </View>
                        </View>

                        <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
                            <Pressable onPress={handleSave} disabled={saving} style={[s.saveBtn, { opacity: saving ? 0.75 : 1 }]}>
                                {saving ? <ActivityIndicator color="#D5EE7A" /> : <Icon icon="lucide:check-check" width={18} color="#D5EE7A" />}
                                <Text style={{ color: '#D5EE7A', fontWeight: '900', fontSize: 15 }}>{isTH ? 'ใช้รายการนี้' : 'Apply'}</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: { width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '92%' },
    handle: { width: 46, height: 5, backgroundColor: '#E0E0E0', borderRadius: 4, alignSelf: 'center', marginTop: 12 },
    closeX: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
    secLabel: { fontSize: 11, color: '#888', fontWeight: '900', letterSpacing: 0.5, marginBottom: 10 },
    trackedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginBottom: 8, backgroundColor: '#F8FFF0', borderRadius: 14, borderWidth: 1.5, borderColor: '#D5EE7A' },
    trackedIcon: { width: 34, height: 34, backgroundColor: '#D5EE7A', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    goalInput: { width: 60, paddingVertical: 6, paddingHorizontal: 8, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 8, fontSize: 14, fontWeight: '800', color: '#1B5E37', textAlign: 'right' },
    removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF1F0', alignItems: 'center', justifyContent: 'center' },
    preset: { width: '48.5%', padding: 12, borderWidth: 1.5, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
    presetIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    customInput: { paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, fontSize: 13, fontWeight: '600', color: '#333' },
    unitBtn: { paddingVertical: 10, paddingHorizontal: 10, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, minWidth: 44, alignItems: 'center' },
    addBtn: { paddingVertical: 11, paddingHorizontal: 12, backgroundColor: '#1B5E37', borderRadius: 12 },
    saveBtn: { width: '100%', paddingVertical: 16, backgroundColor: '#1B5E37', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#1B5E20', shadowOpacity: 0.3, shadowRadius: 30, elevation: 4 },
});
