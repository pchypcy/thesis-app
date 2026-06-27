import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Pressable } from "../components/Touchable";
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextInput } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang } from '../utils/language';
import { theme } from '../utils/theme';

function passwordStrength(p, TH) {
    if (!p) return { score: 0, label: '', color: '#E0E0E0' };
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    const score = Math.min(4, s);
    const labels = TH ? ['อ่อนมาก', 'อ่อน', 'พอใช้', 'ดี', 'ดีมาก'] : ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#C62828', '#F57C00', '#F9A825', '#7CB342', '#1B5E37'];
    return { score, label: labels[score], color: colors[score] };
}

export default function ChangePassword() {
    const navigate = useNavigate();
    const username = storage.getItem('username');
    const TH = getCurrentLang() === 'TH';

    const [current, setCurrent] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const strength = passwordStrength(newPwd, TH);
    const valid = current && newPwd && confirmPwd && newPwd === confirmPwd && newPwd.length >= 6;

    const handleSubmit = async () => {
        setError('');
        if (!current || !newPwd || !confirmPwd) return setError(TH ? 'กรุณากรอกข้อมูลให้ครบ' : 'Please fill all fields');
        if (newPwd.length < 6) return setError(TH ? 'รหัสผ่านใหม่ต้องอย่างน้อย 6 ตัวอักษร' : 'Min 6 characters');
        if (newPwd !== confirmPwd) return setError(TH ? 'รหัสผ่านยืนยันไม่ตรง' : 'Passwords do not match');
        if (current === newPwd) return setError(TH ? 'รหัสผ่านใหม่ต้องไม่เหมือนเดิม' : 'New must differ from current');
        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/users/change-password`, { username, currentPassword: current, newPassword: newPwd }, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            if (res.data?.success) { setSuccess(true); setTimeout(() => navigate('/settings'), 2500); }
            else setError(res.data?.message || 'Error');
        } catch (err) { setError(err.response?.data?.message || (TH ? 'เปลี่ยนรหัสผ่านไม่สำเร็จ' : 'Failed')); }
        finally { setLoading(false); }
    };

    if (success) {
        return (
            <View style={{ flex: 1 }}>
                <LinearGradient colors={theme.gradients.limeWhite} style={StyleSheet.absoluteFill} />
                <View style={{ flex: 1, justifyContent: 'center', padding: 25 }}>
                    <View style={[s.card, { alignItems: 'center' }]}>
                        <LinearGradient colors={['#1B5E37', '#2E7D32']} style={s.successIcon}><Icon icon="lucide:check-circle-2" width={44} color="#D5EE7A" /></LinearGradient>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#1B5E37', marginBottom: 12 }}>{TH ? 'เปลี่ยนรหัสผ่านสำเร็จ!' : 'Password Changed!'}</Text>
                        <Text style={{ color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 21 }}>{TH ? 'เราได้ส่งอีเมลแจ้งเตือนการเปลี่ยนรหัสผ่านแล้ว' : 'A notification email has been sent.'}</Text>
                    </View>
                </View>
            </View>
        );
    }

    const field = (label, val, setter, opts = {}) => (
        <View style={{ marginBottom: 16 }}>
            <Text style={s.label}>{label}</Text>
            <View style={s.inputBox}>
                <Icon icon={opts.icon} color="#BDBDBD" width={20} />
                <TextInput value={val} onChangeText={(v) => { setError(''); setter(v); }} placeholder={opts.placeholder} placeholderTextColor="#BDBDBD" secureTextEntry={opts.secure} autoCapitalize="none" style={s.input} />
                {opts.trailing}
            </View>
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={theme.gradients.limeWhite} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 25 }} keyboardShouldPersistTaps="handled">
                <View style={s.card}>
                    <Pressable onPress={() => navigate('/settings')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                        <Icon icon="lucide:arrow-left" width={18} color="#1B5E37" /><Text style={{ color: '#1B5E37', fontWeight: '700', fontSize: 14 }}>{TH ? 'กลับไปตั้งค่า' : 'Back to Settings'}</Text>
                    </Pressable>
                    <View style={{ alignItems: 'center', marginBottom: 28 }}>
                        <View style={s.headIcon}><Icon icon="lucide:key" width={32} color="#1B5E37" /></View>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: '#1B5E37' }}>{TH ? 'เปลี่ยนรหัสผ่าน' : 'Change Password'}</Text>
                        <Text style={{ color: '#888', fontSize: 13, marginTop: 6, textAlign: 'center' }}>{TH ? 'กรอกรหัสผ่านปัจจุบันและตั้งรหัสผ่านใหม่' : 'Enter current password and set a new one'}</Text>
                    </View>
                    {error ? <View style={s.errorBox}><Icon icon="lucide:alert-circle" width={18} color="#D32F2F" /><Text style={s.errorText}>{error}</Text></View> : null}

                    {field(TH ? 'รหัสผ่านปัจจุบัน' : 'CURRENT PASSWORD', current, setCurrent, { icon: 'lucide:lock', placeholder: TH ? 'รหัสผ่านเดิม' : 'Current password', secure: !showCurrent, trailing: <Pressable onPress={() => setShowCurrent(!showCurrent)}><Icon icon={showCurrent ? 'lucide:eye-off' : 'lucide:eye'} width={20} color="#BDBDBD" /></Pressable> })}
                    {field(TH ? 'รหัสผ่านใหม่' : 'NEW PASSWORD', newPwd, setNewPwd, { icon: 'lucide:shield', placeholder: TH ? 'รหัสผ่านใหม่ (6+ ตัว)' : 'New password (6+)', secure: !showNew, trailing: <Pressable onPress={() => setShowNew(!showNew)}><Icon icon={showNew ? 'lucide:eye-off' : 'lucide:eye'} width={20} color="#BDBDBD" /></Pressable> })}
                    {newPwd ? (
                        <View style={{ marginTop: -8, marginBottom: 12, paddingHorizontal: 4 }}>
                            <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                                {[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 50, backgroundColor: i < strength.score ? strength.color : '#E0E0E0' }} />)}
                            </View>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: strength.color }}>{TH ? `ความปลอดภัย: ${strength.label}` : strength.label}</Text>
                        </View>
                    ) : null}
                    {field(TH ? 'ยืนยันรหัสผ่านใหม่' : 'CONFIRM NEW PASSWORD', confirmPwd, setConfirmPwd, { icon: 'lucide:shield-check', placeholder: TH ? 'พิมพ์รหัสผ่านใหม่อีกครั้ง' : 'Re-enter new password', secure: !showNew, trailing: confirmPwd ? <Icon icon={newPwd === confirmPwd ? 'lucide:check-circle' : 'lucide:x-circle'} width={20} color={newPwd === confirmPwd ? '#1B5E37' : '#EF5350'} /> : null })}

                    <Pressable onPress={() => navigate('/forgot-password')} style={{ alignSelf: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, color: '#1B5E37', fontWeight: '700', borderBottomWidth: 2, borderBottomColor: '#D5EE7A' }}>{TH ? 'จำรหัสผ่านปัจจุบันไม่ได้?' : 'Forgot current password?'}</Text>
                    </Pressable>

                    <Pressable onPress={handleSubmit} disabled={loading || !valid} style={[s.submitBtn, { backgroundColor: valid ? '#D5EE7A' : '#E0E0E0', opacity: loading ? 0.7 : 1 }]}>
                        {loading && <ActivityIndicator color="#1B5E37" />}
                        <Text style={{ color: '#1B5E37', fontSize: 17, fontWeight: '800' }}>{loading ? (TH ? 'กำลังเปลี่ยน...' : 'Updating...') : (TH ? 'เปลี่ยนรหัสผ่าน' : 'Change Password')}</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    card: { backgroundColor: 'white', paddingVertical: 40, paddingHorizontal: 32, borderRadius: 40, width: '100%', maxWidth: 420, alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 70, elevation: 4 },
    headIcon: { width: 70, height: 70, backgroundColor: '#F4FDC6', borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    successIcon: { width: 90, height: 90, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
    label: { fontSize: 12, fontWeight: '800', color: '#1B5E37', marginBottom: 8, letterSpacing: 1 },
    inputBox: { backgroundColor: '#FAFAFA', borderRadius: 24, paddingHorizontal: 20, borderWidth: 2, borderColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center' },
    input: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 15, fontWeight: '600', color: '#333' },
    errorBox: { backgroundColor: '#FFF0F0', borderWidth: 2, borderColor: '#FFD6D6', padding: 12, borderRadius: 18, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
    errorText: { color: '#D32F2F', fontSize: 13, fontWeight: '600', flexShrink: 1 },
    submitBtn: { width: '100%', paddingVertical: 20, marginTop: 8, borderRadius: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
});
