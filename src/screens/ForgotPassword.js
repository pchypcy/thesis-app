import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Pressable } from "../components/Touchable";
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextInput } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { getCurrentLang } from '../utils/language';
import { theme } from '../utils/theme';

const STEP = { IDENTIFIER: 1, OTP_PASSWORD: 2, SUCCESS: 3 };

export default function ForgotPassword() {
    const navigate = useNavigate();
    const TH = getCurrentLang() === 'TH';

    const [step, setStep] = useState(STEP.IDENTIFIER);
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [emailMasked, setEmailMasked] = useState('');
    const [countdown, setCountdown] = useState(0);
    const otpRefs = useRef([]);

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const otpString = otp.join('');
    const mins = Math.floor(countdown / 60);
    const secs = countdown % 60;
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const requestOtp = async () => {
        setError('');
        if (!identifier.trim()) return setError(TH ? 'กรุณากรอก username หรือ email' : 'Enter username or email');
        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/users/forgot-password`, { identifier: identifier.trim() }, { headers: H });
            if (res.data?.success) {
                setEmailMasked(res.data.email_masked || '');
                setCountdown(res.data.expiresInSec || 600);
                setStep(STEP.OTP_PASSWORD);
                setTimeout(() => otpRefs.current[0]?.focus(), 100);
            } else setError(res.data?.message || (TH ? 'เกิดข้อผิดพลาด' : 'Error'));
        } catch (err) { setError(err.response?.data?.message || (TH ? 'เกิดข้อผิดพลาด' : 'Error')); }
        finally { setLoading(false); }
    };

    const handleOtpChange = (i, val) => {
        const v = val.replace(/\D/g, '').slice(-1);
        const next = [...otp]; next[i] = v; setOtp(next);
        if (v && i < 5) otpRefs.current[i + 1]?.focus();
    };
    const handleOtpKey = (i, e) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
    };

    const resetPassword = async () => {
        setError('');
        if (otpString.length !== 6) return setError(TH ? 'กรุณากรอก OTP 6 หลัก' : 'Enter 6-digit OTP');
        if (newPassword.length < 6) return setError(TH ? 'รหัสผ่านต้องอย่างน้อย 6 ตัว' : 'Min 6 chars');
        if (newPassword !== confirmPwd) return setError(TH ? 'รหัสผ่านไม่ตรงกัน' : 'Passwords do not match');
        setLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/users/reset-password`, { identifier: identifier.trim(), otp: otpString, newPassword }, { headers: H });
            if (res.data?.success) { setStep(STEP.SUCCESS); setTimeout(() => navigate('/login'), 3000); }
            else setError(res.data?.message || 'Error');
        } catch (err) { setError(err.response?.data?.message || (TH ? 'OTP ไม่ถูกต้องหรือหมดอายุ' : 'Invalid or expired OTP')); }
        finally { setLoading(false); }
    };

    const errorBox = error ? <View style={s.errorBox}><Icon icon="lucide:alert-circle" width={18} color="#D32F2F" /><Text style={s.errorText}>{error}</Text></View> : null;

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={theme.gradients.limeWhite} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 25 }} keyboardShouldPersistTaps="handled">
                <View style={s.card}>
                    <Pressable onPress={() => (step === STEP.IDENTIFIER ? navigate('/login') : setStep(STEP.IDENTIFIER))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                        <Icon icon="lucide:arrow-left" width={18} color="#1B5E37" /><Text style={{ color: '#1B5E37', fontWeight: '700', fontSize: 14 }}>{step === STEP.IDENTIFIER ? (TH ? 'กลับไปเข้าสู่ระบบ' : 'Back to Sign In') : (TH ? 'ย้อนกลับ' : 'Back')}</Text>
                    </Pressable>

                    {step !== STEP.SUCCESS && (
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 30 }}>
                            {[1, 2].map((sp) => <View key={sp} style={{ width: step >= sp ? 32 : 10, height: 6, borderRadius: 50, backgroundColor: step >= sp ? '#1B5E37' : '#E0E0E0' }} />)}
                        </View>
                    )}

                    {step === STEP.IDENTIFIER && (
                        <>
                            <View style={{ alignItems: 'center', marginBottom: 30 }}>
                                <View style={s.headIcon}><Icon icon="lucide:key-round" width={34} color="#1B5E37" /></View>
                                <Text style={{ fontSize: 26, fontWeight: '800', color: '#1B5E37' }}>{TH ? 'ลืมรหัสผ่าน?' : 'Forgot Password?'}</Text>
                                <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', marginTop: 8 }}>{TH ? 'กรอก username หรือ email เราจะส่งรหัส OTP ให้' : "Enter username or email, we'll send an OTP"}</Text>
                            </View>
                            {errorBox}
                            <View style={[s.inputBox, { marginBottom: 24 }]}>
                                <Icon icon="lucide:at-sign" color="#BDBDBD" width={22} />
                                <TextInput value={identifier} onChangeText={(v) => { setError(''); setIdentifier(v); }} placeholder={TH ? 'username หรือ email' : 'username or email'} placeholderTextColor="#BDBDBD" autoCapitalize="none" style={s.input} />
                            </View>
                            <Pressable onPress={requestOtp} disabled={loading} style={[s.submitBtn, { backgroundColor: '#D5EE7A', opacity: loading ? 0.7 : 1 }]}>
                                {loading && <ActivityIndicator color="#1B5E37" />}
                                <Text style={s.submitText}>{loading ? (TH ? 'กำลังส่ง...' : 'Sending...') : (TH ? 'ส่งรหัส OTP' : 'Send OTP')}</Text>
                            </Pressable>
                        </>
                    )}

                    {step === STEP.OTP_PASSWORD && (
                        <>
                            <View style={{ alignItems: 'center', marginBottom: 24 }}>
                                <View style={s.headIcon}><Icon icon="lucide:mail-check" width={34} color="#1B5E37" /></View>
                                <Text style={{ fontSize: 24, fontWeight: '800', color: '#1B5E37' }}>{TH ? 'กรอกรหัส OTP' : 'Enter OTP'}</Text>
                                <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', marginTop: 8 }}>{TH ? `ส่งรหัส 6 หลักไปยัง ${emailMasked || identifier}` : `6-digit code sent to ${emailMasked || identifier}`}</Text>
                                {countdown > 0 && <Text style={{ fontSize: 12, color: countdown < 60 ? '#D32F2F' : '#888', fontWeight: '700', marginTop: 6 }}>{mins}:{String(secs).padStart(2, '0')} {TH ? 'นาที' : 'left'}</Text>}
                            </View>
                            {errorBox}
                            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 22 }}>
                                {otp.map((v, i) => (
                                    <TextInput key={i} ref={(el) => (otpRefs.current[i] = el)} value={v} onChangeText={(val) => handleOtpChange(i, val)} onKeyPress={(e) => handleOtpKey(i, e)} keyboardType="number-pad" maxLength={1}
                                        style={[s.otpBox, { borderColor: v ? '#1B5E37' : '#E0E0E0', backgroundColor: v ? '#F4FDC6' : '#FAFAFA' }]} />
                                ))}
                            </View>
                            <View style={[s.inputBox, { marginBottom: 14 }]}>
                                <Icon icon="lucide:lock" color="#BDBDBD" width={22} />
                                <TextInput value={newPassword} onChangeText={(v) => { setError(''); setNewPassword(v); }} placeholder={TH ? 'รหัสผ่านใหม่' : 'New password'} placeholderTextColor="#BDBDBD" secureTextEntry={!showPwd} autoCapitalize="none" style={s.input} />
                                <Pressable onPress={() => setShowPwd(!showPwd)}><Icon icon={showPwd ? 'lucide:eye-off' : 'lucide:eye'} width={20} color="#BDBDBD" /></Pressable>
                            </View>
                            <View style={[s.inputBox, { marginBottom: 22 }]}>
                                <Icon icon="lucide:shield-check" color="#BDBDBD" width={22} />
                                <TextInput value={confirmPwd} onChangeText={(v) => { setError(''); setConfirmPwd(v); }} placeholder={TH ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm new password'} placeholderTextColor="#BDBDBD" secureTextEntry={!showPwd} autoCapitalize="none" style={s.input} />
                            </View>
                            <Pressable onPress={resetPassword} disabled={loading || otpString.length !== 6 || newPassword.length < 6} style={[s.submitBtn, { backgroundColor: otpString.length === 6 && newPassword.length >= 6 ? '#D5EE7A' : '#E0E0E0', opacity: loading ? 0.7 : 1 }]}>
                                {loading && <ActivityIndicator color="#1B5E37" />}
                                <Text style={s.submitText}>{loading ? (TH ? 'กำลังตรวจสอบ...' : 'Verifying...') : (TH ? 'รีเซ็ตรหัสผ่าน' : 'Reset Password')}</Text>
                            </Pressable>
                            {countdown <= 0 && (
                                <Pressable onPress={requestOtp} disabled={loading} style={s.resendBtn}>
                                    <Icon icon="lucide:refresh-cw" width={14} color="#1B5E37" /><Text style={{ color: '#1B5E37', fontSize: 13, fontWeight: '700' }}>{TH ? 'ขอ OTP ใหม่' : 'Resend OTP'}</Text>
                                </Pressable>
                            )}
                        </>
                    )}

                    {step === STEP.SUCCESS && (
                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                            <LinearGradient colors={['#1B5E37', '#2E7D32']} style={s.successIcon}><Icon icon="lucide:check-circle-2" width={44} color="#D5EE7A" /></LinearGradient>
                            <Text style={{ fontSize: 24, fontWeight: '900', color: '#1B5E37', marginBottom: 12 }}>{TH ? 'รีเซ็ตสำเร็จ!' : 'Password Reset!'}</Text>
                            <Text style={{ color: '#666', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 }}>{TH ? 'รหัสผ่านถูกเปลี่ยนแล้ว เข้าสู่ระบบด้วยรหัสผ่านใหม่' : 'Password changed. Sign in with your new password.'}</Text>
                            <Pressable onPress={() => navigate('/login')} style={[s.submitBtn, { backgroundColor: '#D5EE7A' }]}><Text style={s.submitText}>{TH ? 'ไปหน้าเข้าสู่ระบบ' : 'Go to Sign In'}</Text></Pressable>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    card: { backgroundColor: 'white', paddingVertical: 40, paddingHorizontal: 32, borderRadius: 40, width: '100%', maxWidth: 420, alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 70, elevation: 4 },
    headIcon: { width: 76, height: 76, backgroundColor: '#F4FDC6', borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    successIcon: { width: 90, height: 90, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
    inputBox: { backgroundColor: '#FAFAFA', borderRadius: 28, paddingHorizontal: 22, borderWidth: 2, borderColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center' },
    input: { flex: 1, paddingVertical: 16, paddingHorizontal: 10, fontSize: 15, fontWeight: '600', color: '#333' },
    otpBox: { width: 46, height: 56, borderWidth: 2, borderRadius: 16, textAlign: 'center', fontSize: 22, fontWeight: '900', color: '#1B5E37' },
    errorBox: { backgroundColor: '#FFF0F0', borderWidth: 2, borderColor: '#FFD6D6', padding: 12, borderRadius: 18, marginBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
    errorText: { color: '#D32F2F', fontSize: 13, fontWeight: '600', flexShrink: 1 },
    submitBtn: { width: '100%', paddingVertical: 20, borderRadius: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
    submitText: { color: '#1B5E37', fontSize: 17, fontWeight: '800' },
    resendBtn: { marginTop: 14, paddingVertical: 14, borderWidth: 2, borderColor: '#D5EE7A', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
});
