import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Pressable } from "../components/Touchable";
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Text, TextInput } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang, translations } from '../utils/language';
import { setToken } from '../utils/api';
import { theme } from '../utils/theme';

export default function Login() {
    const navigate = useNavigate();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState(null); // 'google' | 'apple' | null
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const currentLang = getCurrentLang();
    const t = translations[currentLang] || {};

    const tempPersona = storage.getItem('temp_persona');
    const tempHealthJson = storage.getItem('temp_health_profile');

    let healthProfile = {};
    let healthTags = [];
    if (tempHealthJson) {
        try {
            healthProfile = JSON.parse(tempHealthJson);
            if (healthProfile.diabetes) healthTags.push(t.sugarWatch || 'เฝ้าระวังน้ำตาล');
            if (healthProfile.kidney_disease) healthTags.push(t.sodiumWatch || 'เฝ้าระวังโซเดียม');
            if (healthProfile.allergies?.length > 0) healthTags.push(t.allergies || 'ข้อมูลภูมิแพ้');
        } catch (e) {}
    }

    useEffect(() => {
        if (tempPersona) setIsLoginMode(false);
        if (storage.getItem('username')) navigate('/home');
    }, []);

    const setField = (name, value) => {
        setErrorMessage('');
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // เก็บ session + เริ่ม VIP trial + ไปหน้า Home (ใช้ร่วมทั้ง login/signup/social)
    const finishAuth = async (data, fallbackUsername) => {
        const uname = data?.username || fallbackUsername;
        storage.setItem('username', uname);
        storage.setItem('persona', data?.persona || tempPersona || 'New User');
        storage.removeItem('temp_persona');
        storage.removeItem('temp_health_profile');
        if (data?.token) setToken(data.token);
        try {
            const a = Math.floor(Math.random() * 255);
            const b = Math.floor(Math.random() * 254) + 1;
            storage.setItem('demoVoterIp', `10.42.${a}.${b}`);
        } catch {}
        try {
            await axios.post(`${API_BASE_URL}/api/vip/start-trial`, { username: uname }, {
                headers: { 'ngrok-skip-browser-warning': 'true' },
            });
        } catch {}
        navigate('/home');
    };

    // เข้าสู่ระบบ/สมัครด้วย Google หรือ Apple
    //   - มีบัญชี social อยู่แล้ว → login; ยังไม่มี → create จาก identity ของ provider
    //   - identity จริงมาจาก OAuth ของ provider (เดโมนี้ใช้บัญชี demo ต่อ provider)
    const handleSocialAuth = async (provider) => {
        if (socialLoading || isLoading) return;
        setErrorMessage('');
        setSocialLoading(provider);
        const H = { headers: { 'ngrok-skip-browser-warning': 'true' } };
        const username = `${provider}_demo`;
        const password = `${provider}_demo_2026`;
        try {
            let data;
            try {
                const r = await axios.post(`${API_BASE_URL}/api/users/login`, { username, password }, H);
                data = r.data;
            } catch (e) {
                const r = await axios.post(`${API_BASE_URL}/api/users/create`, {
                    username, password,
                    email: `${username}@${provider === 'google' ? 'gmail.com' : 'privaterelay.appleid.com'}`,
                    persona: tempPersona || 'New User',
                    has_diabetes: healthProfile.diabetes || false,
                    has_kidney_disease: healthProfile.kidney_disease || false,
                    allergies: healthProfile.allergies || [],
                }, H);
                data = r.data;
            }
            await finishAuth(data, username);
        } catch (err) {
            setErrorMessage(err.response?.data?.message || (t.loginFailed || 'เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่'));
        } finally {
            setSocialLoading(null);
        }
    };

    const handleSubmit = async () => {
        setErrorMessage('');
        if (!formData.username || !formData.password) {
            return setErrorMessage(t.fillFields || 'กรุณากรอกข้อมูลให้ครบถ้วน');
        }
        if (!isLoginMode) {
            if (!formData.email) return setErrorMessage(t.fillEmail || 'กรุณากรอกอีเมลของคุณ');
            if (formData.password !== formData.confirmPassword) {
                return setErrorMessage(t.passwordMismatch || 'รหัสผ่านไม่ตรงกัน');
            }
        }

        setIsLoading(true);
        const endpoint = isLoginMode ? '/api/users/login' : '/api/users/create';

        try {
            const cleanUsername = formData.username.trim();
            const payload = {
                username: cleanUsername,
                password: formData.password,
                ...(!isLoginMode && {
                    email: formData.email,
                    persona: tempPersona || 'New User',
                    has_diabetes: healthProfile.diabetes || false,
                    has_kidney_disease: healthProfile.kidney_disease || false,
                    allergies: healthProfile.allergies || [],
                }),
            };

            const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload, {
                headers: { 'ngrok-skip-browser-warning': 'true' },
            });

            await finishAuth(response.data, cleanUsername);
        } catch (err) {
            setErrorMessage(`${t.errorPrefix || ''}${err.response?.data?.message || (t.loginFailed || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')}`);
        } finally {
            setIsLoading(false);
        }
    };

    // NOTE: เรียกเป็นฟังก์ชัน {renderField(...)} ไม่ใช่ <Field/> เพื่อไม่ให้ TextInput
    // ถูก remount ทุกครั้งที่พิมพ์ (คีย์บอร์ดจะเด้งปิด)
    const renderField = ({ icon, name, placeholder, secure, keyboardType, trailing }) => (
        <View style={styles.inputContainer}>
            <Icon icon={icon} color="#BDBDBD" width={22} />
            <TextInput
                style={styles.inputField}
                placeholder={placeholder}
                placeholderTextColor="#BDBDBD"
                value={formData[name]}
                onChangeText={(v) => setField(name, v)}
                secureTextEntry={secure}
                keyboardType={keyboardType}
                autoCapitalize="none"
            />
            {trailing}
        </View>
    );

    const eyeToggle = (
        <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} width={22} color="#BDBDBD" />
        </Pressable>
    );

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={theme.gradients.limeWhite} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.card}>
                    {!isLoginMode && tempPersona ? (
                        <View style={{ marginBottom: 40, alignItems: 'center' }}>
                            <View style={styles.personaIcon}>
                                <Icon icon={tempPersona.includes('Green') ? 'lucide:leaf' : 'lucide:heart'} width={36} color="#1B5E37" />
                            </View>
                            <Text style={styles.personaTitle}>{t.profileReady || 'โปรไฟล์ของคุณพร้อมแล้ว'}</Text>
                            <View style={styles.personaBadge}>
                                <Icon icon="lucide:star" width={18} color="#1B5E37" />
                                <Text style={styles.personaBadgeText}>{tempPersona}</Text>
                            </View>
                            {healthTags.length > 0 && (
                                <View style={styles.tagWrap}>
                                    {healthTags.map((tag, i) => (
                                        <View key={i} style={styles.healthTag}>
                                            <Icon icon="lucide:activity" width={14} color="#1B5E37" />
                                            <Text style={styles.healthTagText}>{tag}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={{ marginBottom: 35, alignItems: 'center' }}>
                            <View style={styles.userIcon}>
                                <Icon icon="lucide:user" width={32} color="#1B5E37" />
                            </View>
                            <Text style={styles.headTitle}>{isLoginMode ? (t.welcomeBack || 'ยินดีต้อนรับกลับมา') : (t.createAcc || 'สร้างบัญชีใหม่')}</Text>
                            <Text style={styles.headSub}>{isLoginMode ? (t.signInSub || 'เข้าสู่ระบบเพื่อดำเนินการต่อ') : 'เข้าร่วมกับเราเพื่อเริ่มต้นเส้นทางสีเขียวของคุณ'}</Text>
                        </View>
                    )}

                    {!tempPersona && (
                        <View style={styles.tabs}>
                            <Pressable onPress={() => { setIsLoginMode(true); setErrorMessage(''); }} style={[styles.tab, isLoginMode && styles.tabActive]}>
                                <Text style={[styles.tabText, { color: isLoginMode ? '#1B5E37' : '#888' }]}>{t.signIn || 'เข้าสู่ระบบ'}</Text>
                            </Pressable>
                            <Pressable onPress={() => { setIsLoginMode(false); setErrorMessage(''); }} style={[styles.tab, !isLoginMode && styles.tabActive]}>
                                <Text style={[styles.tabText, { color: !isLoginMode ? '#1B5E37' : '#888' }]}>{t.signUp || 'สมัครสมาชิก'}</Text>
                            </Pressable>
                        </View>
                    )}

                    {errorMessage ? (
                        <View style={styles.errorBox}>
                            <Icon icon="lucide:alert-circle" width={20} color="#D32F2F" />
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}

                    <View style={{ gap: 20, marginBottom: 35 }}>
                        {renderField({ icon: 'lucide:user', name: 'username', placeholder: t.username || 'ชื่อผู้ใช้งาน' })}
                        {!isLoginMode && renderField({ icon: 'lucide:mail', name: 'email', placeholder: t.email || 'อีเมล', keyboardType: 'email-address' })}
                        {renderField({ icon: 'lucide:lock', name: 'password', placeholder: t.password || 'รหัสผ่าน', secure: !showPassword, trailing: eyeToggle })}
                        {!isLoginMode && renderField({ icon: 'lucide:shield-check', name: 'confirmPassword', placeholder: t.confirmPassword || 'ยืนยันรหัสผ่าน', secure: !showPassword, trailing: eyeToggle })}

                        {isLoginMode && (
                            <Pressable onPress={() => navigate('/forgot-password')} style={{ alignSelf: 'flex-end' }}>
                                <Text style={styles.forgot}>{t.forgotPassword || 'ลืมรหัสผ่าน?'}</Text>
                            </Pressable>
                        )}

                        <Pressable onPress={handleSubmit} disabled={isLoading} style={[styles.submitBtn, { opacity: isLoading ? 0.7 : 1 }]}>
                            {isLoading && <ActivityIndicator color="#1B5E37" />}
                            <Text style={styles.submitText}>
                                {isLoading ? (t.processing || 'กำลังดำเนินการ...') : (isLoginMode ? (t.signIn || 'เข้าสู่ระบบ') : (t.createAcc || 'สมัครสมาชิก'))}
                            </Text>
                        </Pressable>
                    </View>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>{t.orContinueWith || 'หรือเข้าสู่ระบบด้วย'}</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={{ gap: 12 }}>
                        <Pressable onPress={() => handleSocialAuth('google')} disabled={!!socialLoading || isLoading} style={[styles.socialBtnFull, { opacity: (socialLoading && socialLoading !== 'google') ? 0.6 : 1 }]}>
                            {socialLoading === 'google' ? <ActivityIndicator color="#1B5E37" /> : <Icon icon="logos:google-icon" width={22} />}
                            <Text style={styles.socialBtnText}>{t.continueGoogle || 'ดำเนินการต่อด้วย Google'}</Text>
                        </Pressable>
                        <Pressable onPress={() => handleSocialAuth('apple')} disabled={!!socialLoading || isLoading} style={[styles.socialBtnFull, styles.appleBtn, { opacity: (socialLoading && socialLoading !== 'apple') ? 0.6 : 1 }]}>
                            {socialLoading === 'apple' ? <ActivityIndicator color="#fff" /> : <Icon icon="mdi:apple" width={22} color="#fff" />}
                            <Text style={[styles.socialBtnText, { color: '#fff' }]}>{t.continueApple || 'ดำเนินการต่อด้วย Apple'}</Text>
                        </Pressable>
                    </View>

                    <Pressable onPress={() => { setIsLoginMode(!isLoginMode); setErrorMessage(''); }} style={{ marginTop: 22, alignSelf: 'center' }}>
                        <Text style={styles.toggleText}>
                            {isLoginMode ? (t.noAccountYet || 'ยังไม่มีบัญชี? ') : (t.haveAccount || 'มีบัญชีอยู่แล้ว? ')}
                            <Text style={styles.toggleLink}>{isLoginMode ? (t.signUp || 'สมัครสมาชิก') : (t.signIn || 'เข้าสู่ระบบ')}</Text>
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 25 },
    card: { backgroundColor: 'white', paddingVertical: 45, paddingHorizontal: 35, borderRadius: 40, width: '100%', maxWidth: 420, alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 70, shadowOffset: { width: 0, height: 30 }, elevation: 4 },
    personaIcon: { width: 80, height: 80, backgroundColor: '#F4FDC6', borderRadius: 25, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
    personaTitle: { color: '#1B5E37', fontSize: 24, fontWeight: '800', marginBottom: 15, textAlign: 'center' },
    personaBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D5EE7A', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 30, marginBottom: 12 },
    personaBadgeText: { color: '#1B5E37', fontWeight: '700', fontSize: 15 },
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    healthTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F4FDC6', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    healthTagText: { fontSize: 12, color: '#1B5E37', fontWeight: '600' },
    userIcon: { width: 70, height: 70, backgroundColor: '#F4FDC6', borderRadius: 25, marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
    headTitle: { fontSize: 30, fontWeight: '800', color: '#1B5E37', textAlign: 'center' },
    headSub: { color: '#888', fontSize: 15, marginTop: 12, fontWeight: '500', textAlign: 'center' },
    tabs: { flexDirection: 'row', backgroundColor: '#FAFAFA', borderRadius: 30, padding: 6, marginBottom: 35, borderWidth: 2, borderColor: '#F0F0F0' },
    tab: { flex: 1, paddingVertical: 14, borderRadius: 25, alignItems: 'center' },
    tabActive: { backgroundColor: '#D5EE7A' },
    tabText: { fontWeight: '700', fontSize: 15 },
    errorBox: { backgroundColor: '#FFF0F0', borderWidth: 2, borderColor: '#FFD6D6', padding: 14, borderRadius: 20, marginBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 10 },
    errorText: { color: '#D32F2F', fontSize: 14, fontWeight: '600', flexShrink: 1 },
    inputContainer: { backgroundColor: '#FAFAFA', borderRadius: 28, paddingHorizontal: 20, borderWidth: 2, borderColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center' },
    inputField: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, fontSize: 16, fontWeight: '600', color: '#333' },
    eyeBtn: { paddingLeft: 8 },
    forgot: { fontSize: 14, color: '#1B5E37', fontWeight: '700', borderBottomWidth: 2, borderBottomColor: '#D5EE7A' },
    submitBtn: { width: '100%', paddingVertical: 20, marginTop: 4, backgroundColor: '#D5EE7A', borderRadius: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#B4DC00', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 15 }, elevation: 5 },
    submitText: { color: '#1B5E37', fontSize: 18, fontWeight: '800' },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 30, gap: 12 },
    dividerLine: { flex: 1, height: 2, backgroundColor: '#F0F0F0' },
    dividerText: { color: '#BDBDBD', fontSize: 14, fontWeight: '600' },
    socialBtnFull: { width: '100%', paddingVertical: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: '#EBEBEB', borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    appleBtn: { backgroundColor: '#111', borderColor: '#111' },
    socialBtnText: { fontSize: 16, fontWeight: '700', color: '#333' },
    toggleText: { fontSize: 14, color: '#888', fontWeight: '600' },
    toggleLink: { color: '#1B5E37', fontWeight: '800' },
});
