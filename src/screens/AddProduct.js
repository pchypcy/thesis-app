import React, { useState, useMemo } from 'react';
import { View, ScrollView, Image, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Pressable } from "../components/Touchable";
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextInput } from '../components/Text';
import { Icon } from '../components/Icon';
import { toast } from '../components/Toast';
import { useNavigate, useLocation } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang, translations } from '../utils/language';

const FDA_REGEX = /^\d{2}-\d{1}-\d{5}-\d{1}-\d{4}$/;
function formatFda(raw) {
    const digits = String(raw).replace(/\D/g, '').slice(0, 13);
    return [digits.slice(0, 2), digits.slice(2, 3), digits.slice(3, 8), digits.slice(8, 9), digits.slice(9, 13)].filter(Boolean).join('-');
}

const TIER_GRADIENT = { 1: ['#FFE082', '#FFB300'], 2: ['#64B5F6', '#1565C0'], 3: ['#66BB6A', '#1B5E37'] };

export default function AddProduct() {
    const navigate = useNavigate();
    const { state } = useLocation();
    const barcode = state?.barcode || '';
    const username = storage.getItem('username');
    const currentLang = getCurrentLang();
    const t = translations[currentLang];
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const [formData, setFormData] = useState({ name: '', brand: '', ingredients: '', category: 'Food' });
    const [fdaNumber, setFdaNumber] = useState('');
    const [labelPhoto, setLabelPhoto] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const tier = useMemo(() => {
        const hasFda = FDA_REGEX.test(fdaNumber);
        const hasPhoto = !!labelPhoto;
        if (hasFda && hasPhoto) return 3;
        if (hasFda || hasPhoto) return 2;
        return 1;
    }, [fdaNumber, labelPhoto]);
    const isFdaValid = FDA_REGEX.test(fdaNumber);
    const isFdaTyping = fdaNumber.length > 0 && !isFdaValid;

    const tierConfig = {
        1: { icon: 'mdi:shield-outline', label: t.tier1Label, desc: t.tier1Desc, percent: 33 },
        2: { icon: 'mdi:shield-half-full', label: t.tier2Label, desc: t.tier2Desc, percent: 66 },
        3: { icon: 'mdi:shield-check', label: t.tier3Label, desc: t.tier3Desc, percent: 100 },
    };
    const tc = tierConfig[tier];

    const pickImage = async (fromCamera) => {
        const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { toast.error(currentLang === 'TH' ? 'ไม่ได้รับสิทธิ์กล้อง/คลังรูป' : 'Permission denied'); return; }
        const opts = { mediaTypes: ['images'], quality: 0.6, base64: true };
        const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
        if (!res.canceled && res.assets?.[0]?.base64) setLabelPhoto(`data:image/jpeg;base64,${res.assets[0].base64}`);
    };
    const choosePhoto = () => {
        Alert.alert(t.labelPhotoAdd, '', [
            { text: currentLang === 'TH' ? 'ถ่ายรูป' : 'Camera', onPress: () => pickImage(true) },
            { text: currentLang === 'TH' ? 'เลือกจากคลัง' : 'Gallery', onPress: () => pickImage(false) },
            { text: currentLang === 'TH' ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
        ]);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.brand) return toast.error(t.fillNameBrand);
        if (fdaNumber.length > 0 && !isFdaValid) return toast.error(t.fdaInvalid);
        setIsLoading(true);
        try {
            const productData = {
                barcode, name: formData.name, brand: formData.brand,
                ingredients: formData.ingredients.split(',').map((i) => i.trim()).filter(Boolean),
                marketing_text: currentLang === 'TH' ? 'ข้อมูลจากผู้ใช้งาน InGreen (รอชุมชนตรวจสอบ)' : 'Data contributed by InGreen user (pending review)',
                earned: 15, is_green: false, submitted_by: username,
                fdaNumber: isFdaValid ? fdaNumber : null, labelPhoto: labelPhoto || null,
            };
            const addRes = await axios.post(`${API_BASE_URL}/api/products/add`, productData, { headers: H });
            await axios.post(`${API_BASE_URL}/api/users/add-points`, { username, points: 50, activity: 'Contribution:', productName: formData.name, barcode }, { headers: H });
            toast.success(t.addSuccess);
            navigate('/result', { state: { product: { ...productData, verification_status: addRes.data?.verification_status || 'pending', verification_tier: addRes.data?.verification_tier || tier, data_source: addRes.data?.data_source || 'community', fda_number: isFdaValid ? fdaNumber : null, label_photo: labelPhoto } } });
        } catch (err) { console.error(err); toast.error(t.errorSave); }
        finally { setIsLoading(false); }
    };

    const fieldLabel = (txt, req) => <Text style={s.label}>{txt}{req ? ' *' : ''}</Text>;

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#D5EE7A', '#FFFFFF']} style={s.header}>
                    <Pressable onPress={() => navigate('/scan')} style={s.backBtn}><Icon icon="lucide:arrow-left" width={24} color="#1B5E37" /></Pressable>
                    <View style={{ alignItems: 'center', marginTop: 10 }}>
                        <View style={s.headIcon}><Icon icon="lucide:package-plus" width={35} color="#D5EE7A" /></View>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#1B5E37' }}>{t.addProdTitle}</Text>
                        <Text style={{ color: '#558B2F', fontWeight: '600', fontSize: 14, marginTop: 5 }}>{t.addProdSub}</Text>
                    </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 25, marginTop: -30 }}>
                    <View style={s.bonusCard}>
                        <View style={s.bonusIcon}><Icon icon="mynaui:gift" color="#1B5E37" width={28} /></View>
                        <View><Text style={{ fontWeight: '900', color: '#1B5E37', fontSize: 18 }}>{t.bonusBadge}</Text><Text style={{ fontSize: 12, color: '#666', fontWeight: '600' }}>{t.bonusDesc}</Text></View>
                    </View>
                </View>

                <View style={{ paddingHorizontal: 25, paddingTop: 20 }}>
                    <LinearGradient colors={TIER_GRADIENT[tier]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tierCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <View style={s.tierIcon}><Icon icon={tc.icon} width={34} color="white" /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: 'white', opacity: 0.9, letterSpacing: 1.5 }}>{t.verifTierTitle}</Text>
                                <Text style={{ fontSize: 20, fontWeight: '900', color: 'white' }}>Tier {tier} · {tc.label}</Text>
                                <Text style={{ fontSize: 12, color: 'white', opacity: 0.95, lineHeight: 17 }}>{tc.desc}</Text>
                            </View>
                        </View>
                        <View style={{ marginTop: 15 }}>
                            <View style={s.tierTrack}><View style={{ width: `${tc.percent}%`, height: '100%', backgroundColor: 'white', borderRadius: 50 }} /></View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                                {[1, 2, 3].map((n) => <Text key={n} style={{ fontSize: 10, fontWeight: '700', color: 'white', opacity: tier >= n ? 1 : 0.4 }}>Tier {n}</Text>)}
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                            <View style={[s.evidence, { backgroundColor: isFdaValid ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }]}>
                                <Icon icon={isFdaValid ? 'mdi:check-circle' : 'mdi:circle-outline'} width={18} color="white" />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: 'white', opacity: isFdaValid ? 1 : 0.6 }}>{currentLang === 'TH' ? 'เลข อย.' : 'FDA'}</Text>
                            </View>
                            <View style={[s.evidence, { backgroundColor: labelPhoto ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' }]}>
                                <Icon icon={labelPhoto ? 'mdi:check-circle' : 'mdi:circle-outline'} width={18} color="white" />
                                <Text style={{ fontSize: 11, fontWeight: '700', color: 'white', opacity: labelPhoto ? 1 : 0.6 }}>{currentLang === 'TH' ? 'รูปฉลาก' : 'Photo'}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                    <Text style={{ marginTop: 10, fontSize: 11, color: '#888', fontWeight: '600', textAlign: 'center' }}>💡 {t.verifTierSub}</Text>
                </View>

                <View style={{ padding: 25 }}>
                    <View style={{ marginBottom: 25 }}>
                        {fieldLabel(t.barcodeNum)}
                        <View style={s.barcodeBox}><Icon icon="lucide:barcode" width={22} color="#1B5E37" style={{ opacity: 0.5 }} /><Text style={{ color: '#1B5E37', fontWeight: '800', fontSize: 18 }}>{barcode || '---'}</Text></View>
                    </View>
                    <View style={{ marginBottom: 25 }}>
                        {fieldLabel(t.prodName, true)}
                        <View style={s.inputBox}><Icon icon="lucide:tag" color="#BDBDBD" width={20} /><TextInput value={formData.name} onChangeText={(v) => setFormData({ ...formData, name: v })} placeholder={`${t.reqInput}${t.prodName}...`} placeholderTextColor="#BDBDBD" style={s.input} /></View>
                    </View>
                    <View style={{ marginBottom: 25 }}>
                        {fieldLabel(t.brandName, true)}
                        <View style={s.inputBox}><Icon icon="lucide:shield-check" color="#BDBDBD" width={20} /><TextInput value={formData.brand} onChangeText={(v) => setFormData({ ...formData, brand: v })} placeholder={`${t.reqInput}${t.brandName}...`} placeholderTextColor="#BDBDBD" style={s.input} /></View>
                    </View>
                    <View style={{ marginBottom: 25 }}>
                        {fieldLabel(t.ingredientsInput, true)}
                        <View style={[s.inputBox, { alignItems: 'flex-start', paddingVertical: 12 }]}><Icon icon="lucide:list" color="#BDBDBD" width={20} style={{ marginTop: 6 }} /><TextInput value={formData.ingredients} onChangeText={(v) => setFormData({ ...formData, ingredients: v })} placeholder="Sugar, Milk..." placeholderTextColor="#BDBDBD" multiline numberOfLines={4} style={[s.input, { height: 90, textAlignVertical: 'top' }]} /></View>
                    </View>

                    <View style={{ marginBottom: 25 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon icon="mdi:certificate" width={16} color="#1B5E37" /><Text style={s.label}>{t.fdaLabel}</Text></View>
                            {isFdaValid && <View style={s.fdaValid}><Icon icon="mdi:check-circle" width={14} color="#1B5E37" /><Text style={{ fontSize: 11, fontWeight: '800', color: '#1B5E37' }}>{t.fdaValid}</Text></View>}
                            {isFdaTyping && <View style={s.fdaTyping}><Text style={{ fontSize: 11, fontWeight: '700', color: '#F57C00' }}>{currentLang === 'TH' ? 'กำลังกรอก…' : 'Typing…'}</Text></View>}
                        </View>
                        <View style={[s.inputBox, { borderColor: isFdaValid ? '#66BB6A' : isFdaTyping ? '#FFB74D' : '#F0F0F0' }]}>
                            <Icon icon="mdi:shield-star-outline" color={isFdaValid ? '#1B5E37' : '#BDBDBD'} width={20} />
                            <TextInput value={fdaNumber} onChangeText={(v) => setFdaNumber(formatFda(v))} placeholder={t.fdaPlaceholder} placeholderTextColor="#BDBDBD" keyboardType="number-pad" maxLength={17} style={[s.input, { letterSpacing: 1 }]} />
                        </View>
                        <Text style={{ marginTop: 8, fontSize: 11, color: '#888', fontWeight: '600' }}>{t.fdaHint}</Text>
                    </View>

                    <View style={{ marginBottom: 30 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}><Icon icon="mdi:camera-document" width={16} color="#1B5E37" /><Text style={s.label}>{t.labelPhotoTitle}</Text></View>
                        {!labelPhoto ? (
                            <Pressable onPress={choosePhoto} style={s.uploadBox}>
                                <View style={s.uploadIcon}><Icon icon="mdi:camera-plus-outline" width={32} color="#D5EE7A" /></View>
                                <Text style={{ fontWeight: '800', color: '#1B5E37', fontSize: 16, marginBottom: 4 }}>{t.labelPhotoAdd}</Text>
                                <Text style={{ fontSize: 11, color: '#888', fontWeight: '600' }}>{t.labelPhotoDesc}</Text>
                            </Pressable>
                        ) : (
                            <View style={s.photoWrap}>
                                <Image source={{ uri: labelPhoto }} style={{ width: '100%', height: 220 }} />
                                <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 8 }}>
                                    <Pressable onPress={choosePhoto} style={[s.photoBtn, { backgroundColor: 'rgba(255,255,255,0.95)' }]}><Icon icon="mdi:image-edit-outline" width={14} color="#1B5E37" /><Text style={{ fontSize: 12, fontWeight: '800', color: '#1B5E37' }}>{t.labelPhotoChange}</Text></Pressable>
                                    <Pressable onPress={() => setLabelPhoto(null)} style={[s.photoBtn, { backgroundColor: 'rgba(244,67,54,0.95)' }]}><Icon icon="mdi:trash-can-outline" width={14} color="white" /><Text style={{ fontSize: 12, fontWeight: '800', color: 'white' }}>{t.labelPhotoRemove}</Text></Pressable>
                                </View>
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={s.photoFooter}><Icon icon="mdi:check-circle" width={18} color="#D5EE7A" /><Text style={{ color: 'white', fontSize: 12, fontWeight: '700', flexShrink: 1 }}>{currentLang === 'TH' ? 'อัปโหลดสำเร็จ — เพิ่มความน่าเชื่อถือ' : 'Uploaded — boosts trust tier'}</Text></LinearGradient>
                            </View>
                        )}
                    </View>

                    <Pressable onPress={handleSubmit} disabled={isLoading} style={[s.submitBtn, { opacity: isLoading ? 0.7 : 1 }]}>
                        {isLoading ? <ActivityIndicator color="#D5EE7A" /> : <>{tier === 3 && <Icon icon="mdi:shield-check" width={20} color="#D5EE7A" />}<Text style={{ color: '#D5EE7A', fontSize: 18, fontWeight: '900' }}>{t.saveGetPoints}</Text></>}
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    header: { paddingTop: 40, paddingHorizontal: 25, paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    backBtn: { position: 'absolute', top: 40, left: 25, width: 45, height: 45, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    headIcon: { width: 70, height: 70, backgroundColor: '#1B5E37', borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    bonusCard: { backgroundColor: 'white', borderRadius: 24, paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1, borderColor: 'rgba(204,255,0,0.4)', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 35, elevation: 3 },
    bonusIcon: { backgroundColor: '#F4FDC6', width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#D5EE7A' },
    tierCard: { borderRadius: 24, paddingVertical: 20, paddingHorizontal: 22, overflow: 'hidden' },
    tierIcon: { backgroundColor: 'rgba(255,255,255,0.25)', width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
    tierTrack: { backgroundColor: 'rgba(255,255,255,0.25)', height: 8, borderRadius: 50, overflow: 'hidden' },
    evidence: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: { fontSize: 13, fontWeight: '800', color: '#1B5E37', letterSpacing: 1 },
    barcodeBox: { backgroundColor: '#F5F5F5', paddingVertical: 18, paddingHorizontal: 25, borderRadius: 25, borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
    inputBox: { backgroundColor: 'white', borderRadius: 25, paddingHorizontal: 20, borderWidth: 2, borderColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 15, elevation: 1 },
    input: { flex: 1, paddingVertical: 15, paddingHorizontal: 12, fontSize: 16, fontWeight: '600', color: '#333' },
    fdaValid: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 50 },
    fdaTyping: { backgroundColor: '#FFF3E0', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 50 },
    uploadBox: { backgroundColor: '#F4FDC6', borderRadius: 24, paddingVertical: 28, paddingHorizontal: 20, borderWidth: 2.5, borderColor: '#D5EE7A', borderStyle: 'dashed', alignItems: 'center' },
    uploadIcon: { width: 60, height: 60, backgroundColor: '#1B5E37', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    photoWrap: { borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 35, elevation: 4 },
    photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 50, paddingVertical: 8, paddingHorizontal: 14 },
    photoFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 20, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
    submitBtn: { width: '100%', paddingVertical: 22, backgroundColor: '#1B5E37', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, shadowColor: '#1B5E20', shadowOpacity: 0.3, shadowRadius: 35, elevation: 5 },
});
