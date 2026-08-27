import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, StyleSheet, ActivityIndicator, Alert, Platform } from "react-native";
import { Pressable } from "../components/Touchable";
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { toast } from '../components/Toast';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang } from '../utils/language';
import VIPUpgradeSheet from '../components/VIPUpgradeSheet';

// ย่อรูปบนเว็บด้วย canvas ก่อนอัปโหลด (รูปมือถือหลาย MB → ~200-400KB) กัน timeout บนเน็ตมือถือ
async function downscaleWeb(uri, maxDim = 1600, quality = 0.6) {
    return new Promise((resolve) => {
        try {
            const img = new window.Image();
            img.onload = () => {
                try {
                    let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
                    const scale = Math.min(1, maxDim / Math.max(w, h));
                    w = Math.round(w * scale); h = Math.round(h * scale);
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve((canvas.toDataURL('image/jpeg', quality).split(',')[1]) || null);
                } catch { resolve(null); }
            };
            img.onerror = () => resolve(null);
            img.src = uri;
        } catch { resolve(null); }
    });
}

export default function ScanReceipt() {
    const navigate = useNavigate();
    const username = storage.getItem('username');
    const isTH = getCurrentLang() === 'TH';
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const [quota, setQuota] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [previewUrl, setPreview] = useState(null);
    const [showUpgrade, setShowUpgrade] = useState(false);

    const loadQuota = async () => {
        try { const res = await axios.get(`${API_BASE_URL}/api/ai-scan/quota/${username}`, { headers: H }); if (res.data?.success) setQuota(res.data); }
        catch (e) { console.error(e); }
    };
    useEffect(() => { if (!username) { navigate('/login'); return; } loadQuota(); }, []);

    const handleUpgrade = async () => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/vip/upgrade`, { username, amount: 69, method: 'in_app', reference: `DEMO-${Date.now()}` }, { headers: H });
            if (res.data?.success) { setShowUpgrade(false); await loadQuota(); toast.success(isTH ? 'อัปเกรด VIP สำเร็จ! 20 ครั้ง/วัน' : 'Upgraded! 20 scans/day'); }
        } catch {}
    };

    const performScan = async (base64) => {
        setScanning(true); setError(null); setResult(null);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/ai-scan/receipt`, { username, imageBase64: `data:image/jpeg;base64,${base64}`, mimeType: 'image/jpeg' }, { headers: H, timeout: 60000 });
            if (res.data?.success) { setResult(res.data); setQuota((q) => ({ ...q, used: res.data.quota.used, remaining: res.data.quota.remaining })); }
        } catch (e) {
            const d = e.response?.data;
            if (d?.quotaExceeded) setError({ type: 'quota', ...d });
            else setError({ type: 'generic', message: d?.message || e.message });
        } finally { setScanning(false); }
    };

    const pickImage = async (fromCamera) => {
        // บนเว็บ: ตัวเลือกไฟล์ไม่ต้องขอ permission (native เท่านั้นที่ต้องขอ)
        if (Platform.OS !== 'web') {
            const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) { toast.error(isTH ? 'ไม่ได้รับสิทธิ์' : 'Permission denied'); return; }
        }
        const opts = { mediaTypes: ['images'], quality: 0.6, base64: true };
        let res;
        try {
            res = fromCamera && Platform.OS !== 'web'
                ? await ImagePicker.launchCameraAsync(opts)
                : await ImagePicker.launchImageLibraryAsync(opts);
        } catch (e) { toast.error(isTH ? 'เปิดรูปไม่สำเร็จ' : 'Could not open picker'); return; }
        if (res.canceled || !res.assets?.[0]) return;

        const asset = res.assets[0];
        setPreview(asset.uri);
        let b64 = null;
        // web: ย่อรูปก่อนส่ง (ลดขนาดอัปโหลด กัน timeout บนเน็ตมือถือ)
        if (Platform.OS === 'web' && asset.uri) {
            b64 = await downscaleWeb(asset.uri, 1600, 0.6);
        }
        if (!b64) b64 = asset.base64;
        // web fallback: บางเบราว์เซอร์ไม่คืน base64 → อ่านเองจาก uri
        if (!b64 && asset.uri) {
            try {
                const blob = await (await fetch(asset.uri)).blob();
                b64 = await new Promise((resolve, reject) => {
                    const r = new FileReader();
                    r.onloadend = () => resolve(String(r.result).split(',')[1] || '');
                    r.onerror = reject;
                    r.readAsDataURL(blob);
                });
            } catch {}
        }
        if (b64) performScan(b64);
        else toast.error(isTH ? 'อ่านรูปไม่สำเร็จ ลองใหม่' : 'Could not read image');
    };
    // บนเว็บ Alert หลายปุ่มไม่ทำงาน → เปิดตัวเลือกไฟล์ตรงๆ (มือถือจะมีถ่ายรูป/คลังให้เลือกเอง)
    const choosePhoto = () => {
        if (Platform.OS === 'web') { pickImage(false); return; }
        Alert.alert(isTH ? 'เลือกหรือถ่ายภาพ' : 'Choose or take photo', '', [
            { text: isTH ? 'ถ่ายรูป' : 'Camera', onPress: () => pickImage(true) },
            { text: isTH ? 'เลือกจากคลัง' : 'Gallery', onPress: () => pickImage(false) },
            { text: isTH ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
        ]);
    };

    const reset = () => { setResult(null); setError(null); setPreview(null); };

    const handleConfirm = async () => {
        if (!result?.receipt) return;
        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/users/add-points`, { username, points: result.receipt.suggestedPoints || 0, activity: 'AI Receipt Scan', productName: result.receipt.merchantName }, { headers: H });
            toast.success(isTH ? `รับ ${result.receipt.suggestedPoints} แต้มแล้ว!` : `+${result.receipt.suggestedPoints} pts!`);
            reset();
            setTimeout(() => navigate('/home'), 1200);
        } catch {} finally { setLoading(false); }
    };

    const isVip = quota?.isVip;
    const limit = quota?.limit || 1;
    const used = quota?.used || 0;
    const remaining = quota?.remaining ?? (limit - used);
    const cooldownTime = quota?.nextAvailableAt ? new Date(quota.nextAvailableAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;

    const HOW = [
        { ic: 'solar:scanner-bold', t: isTH ? 'อ่านชื่อร้านและรายการสินค้า' : 'Extract store + items' },
        { ic: 'solar:leaf-bold', t: isTH ? 'นับสินค้า Eco-friendly ในบิล' : 'Count eco items' },
        { ic: 'solar:medal-ribbon-bold', t: isTH ? 'ให้คะแนนรักษ์โลก (Green Score)' : 'Score your green impact' },
        { ic: 'solar:gift-bold', t: isTH ? 'แต้มโบนัสตาม Eco items' : 'Bonus points for eco items' },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#D5EE7A', '#FAFAFA']} locations={[0, 0.7]} style={s.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                        <Pressable onPress={() => navigate(-1)} style={s.backBtn}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'สแกนใบเสร็จด้วย AI' : 'AI Receipt Scan'}</Text>
                        <View style={{ width: 42 }} />
                    </View>
                    {quota && (
                        <View style={s.quotaCard}>
                            <View style={[s.quotaIcon, { backgroundColor: isVip ? '#D5EE7A' : '#F1F8E9' }]}><Icon icon={isVip ? 'mdi:crown' : 'lucide:zap'} width={26} color="#1B5E37" /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, color: '#888', fontWeight: '800' }}>{isVip ? 'VIP' : (isTH ? 'ผู้ใช้ทั่วไป' : 'Free user')}</Text>
                                <Text style={{ fontSize: 15, fontWeight: '900', color: '#1B5E37', marginTop: 2 }}>{isVip ? (isTH ? `ใช้ได้ ${remaining}/${limit} ครั้งวันนี้` : `${remaining}/${limit} scans today`) : (remaining > 0 ? (isTH ? 'พร้อมสแกน 1 ครั้ง' : '1 scan available') : (isTH ? `รอ ${cooldownTime || '~48ชม.'}` : `Wait ${cooldownTime || '~48h'}`))}</Text>
                            </View>
                            {!isVip && <Pressable onPress={() => setShowUpgrade(true)} style={s.vipBtn}><Icon icon="mdi:crown" width={13} color="#D5EE7A" /><Text style={{ color: '#D5EE7A', fontSize: 11, fontWeight: '900' }}>VIP</Text></Pressable>}
                        </View>
                    )}
                </LinearGradient>

                <View style={{ padding: 22 }}>
                    {!result && !error && !scanning && (
                        <>
                            <View style={s.uploadCard}>
                                <LinearGradient colors={['#F4FDC6', '#D5EE7A']} style={s.uploadIcon}><Icon icon="solar:document-add-bold" width={44} color="#1B5E37" /></LinearGradient>
                                <Text style={{ fontSize: 20, fontWeight: '900', color: '#1B5E37', marginBottom: 6 }}>{isTH ? 'ถ่ายภาพใบเสร็จ' : 'Snap your receipt'}</Text>
                                <Text style={{ fontSize: 13, color: '#666', fontWeight: '600', textAlign: 'center', lineHeight: 20, marginBottom: 22 }}>{isTH ? 'AI จะอ่านรายการสินค้า ราคา ร้านค้า และให้คะแนน Eco' : 'AI extracts items, prices, store info and scores eco'}</Text>
                                <Pressable onPress={choosePhoto} disabled={!isVip && remaining === 0} style={[s.uploadBtn, { backgroundColor: !isVip && remaining === 0 ? '#CCC' : '#1B5E37' }]}>
                                    <Icon icon="lucide:camera" width={18} color={!isVip && remaining === 0 ? '#888' : '#D5EE7A'} /><Text style={{ color: !isVip && remaining === 0 ? '#888' : '#D5EE7A', fontWeight: '900', fontSize: 15 }}>{isTH ? 'เลือกหรือถ่ายภาพ' : 'Choose or take photo'}</Text>
                                </Pressable>
                            </View>
                            <Text style={[s.secLabel, { marginTop: 20 }]}>{isTH ? 'AI จะทำอะไรให้คุณ' : 'WHAT AI DOES'}</Text>
                            <View style={s.howCard}>
                                {HOW.map((f, i) => (
                                    <View key={i} style={[s.howRow, { borderBottomWidth: i < HOW.length - 1 ? 1 : 0 }]}>
                                        <View style={s.howIcon}><Icon icon={f.ic} width={18} color="#1B5E37" /></View>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#333', flex: 1 }}>{f.t}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={s.disclaimer}>
                                <Icon icon="mdi:information-outline" width={16} color="#E65100" />
                                <Text style={{ fontSize: 11, color: '#5D4037', fontWeight: '600', lineHeight: 16, flexShrink: 1 }}>{isTH ? 'ผล AI อาจไม่แม่นยำ 100% — เป็นการประมาณการสำหรับสรุปและคำนวณแต้มเท่านั้น' : 'AI not 100% accurate — for summary & points only.'}</Text>
                            </View>
                        </>
                    )}

                    {scanning && (
                        <View style={s.centerCard}>
                            {previewUrl && <Image source={{ uri: previewUrl }} style={{ width: 160, height: 220, borderRadius: 14, marginBottom: 18 }} />}
                            <ActivityIndicator size="large" color="#1B5E37" />
                            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1B5E37', marginTop: 14 }}>{isTH ? 'AI กำลังอ่านใบเสร็จ...' : 'AI is reading...'}</Text>
                            <Text style={{ fontSize: 11, color: '#888', fontWeight: '600', marginTop: 4 }}>{isTH ? 'ใช้เวลาประมาณ 3-5 วินาที' : '~3-5 seconds'}</Text>
                        </View>
                    )}

                    {error?.type === 'quota' && (
                        <View style={s.centerCard}>
                            <View style={[s.errIcon, { backgroundColor: '#FFF1F0' }]}><Icon icon="lucide:clock" width={36} color="#D14545" /></View>
                            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1B5E37' }}>{error.reason === 'VIP_DAILY_LIMIT' ? (isTH ? 'ใช้ครบโควต้าวันนี้แล้ว' : 'Daily quota reached') : (isTH ? 'ครบโควต้าผู้ใช้ทั่วไป' : 'Free quota used')}</Text>
                            <Text style={{ fontSize: 13, color: '#666', fontWeight: '600', textAlign: 'center', marginVertical: 12 }}>{error.hint || error.message}</Text>
                            {!isVip && error.reason === 'FREE_COOLING' && <Pressable onPress={() => setShowUpgrade(true)} style={s.upgradeBtn}><Icon icon="mdi:crown" width={18} color="#D5EE7A" /><Text style={{ color: '#D5EE7A', fontWeight: '900', fontSize: 14 }}>{isTH ? 'อัปเกรด VIP — ฿69/เดือน' : 'Upgrade VIP ฿69/mo'}</Text></Pressable>}
                            <Pressable onPress={reset} style={{ marginTop: 14 }}><Text style={{ color: '#888', fontWeight: '700' }}>{isTH ? 'ปิด' : 'Close'}</Text></Pressable>
                        </View>
                    )}
                    {error?.type === 'generic' && (
                        <View style={[s.centerCard, { backgroundColor: '#FFF1F0' }]}>
                            <Icon icon="lucide:wifi-off" width={32} color="#D14545" />
                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#D14545', marginTop: 10, textAlign: 'center' }}>{error.message}</Text>
                            <Pressable onPress={reset} style={{ marginTop: 12, paddingVertical: 10, paddingHorizontal: 22, backgroundColor: '#D14545', borderRadius: 50 }}><Text style={{ color: 'white', fontWeight: '800' }}>{isTH ? 'ลองใหม่' : 'Retry'}</Text></Pressable>
                        </View>
                    )}

                    {result?.receipt && (
                        <>
                            <LinearGradient colors={result.receipt.greenScore >= 50 ? ['#1B5E37', '#2D8048'] : ['#888', '#555']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.scoreCard}>
                                <View style={{ width: 88, height: 88 }}>
                                    <Svg width={88} height={88}>
                                        <G rotation={-90} origin="44, 44">
                                            <Circle cx={44} cy={44} r={38} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={7} />
                                            <Circle cx={44} cy={44} r={38} fill="none" stroke="#D5EE7A" strokeWidth={7} strokeLinecap="round" strokeDasharray={2 * Math.PI * 38} strokeDashoffset={2 * Math.PI * 38 * (1 - result.receipt.greenScore / 100)} />
                                        </G>
                                    </Svg>
                                    <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 24, fontWeight: '900', color: '#D5EE7A' }}>{result.receipt.greenScore}</Text></View>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 10, opacity: 0.8, fontWeight: '800', color: 'white' }}>GREEN SCORE</Text>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: 'white', marginTop: 2 }}>{result.receipt.merchantName}</Text>
                                    <Text style={{ fontSize: 12, opacity: 0.85, fontWeight: '700', color: 'white', marginTop: 4 }}>{result.receipt.ecoItemCount} / {result.receipt.items.length} {isTH ? 'รายการ Eco' : 'eco items'}</Text>
                                </View>
                            </LinearGradient>

                            <View style={s.itemsCard}>
                                <Text style={[s.secLabel, { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }]}>{isTH ? 'รายการสินค้า' : 'ITEMS'}</Text>
                                {result.receipt.items.map((it, i) => (
                                    <View key={i} style={[s.itemRow, { borderBottomWidth: i < result.receipt.items.length - 1 ? 1 : 0 }]}>
                                        <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: '#1B5E37' }}>{it.name}</Text>{it.qty > 1 && <Text style={{ fontSize: 10, color: '#888', fontWeight: '700' }}>x{it.qty}</Text>}</View>
                                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#333' }}>฿{it.price}</Text>
                                    </View>
                                ))}
                                <View style={[s.itemRow, { borderTopWidth: 2, borderTopColor: '#F5F5F5' }]}>
                                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'รวม' : 'Total'}</Text>
                                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#1B5E37' }}>฿{result.receipt.total}</Text>
                                </View>
                            </View>

                            {result.receipt.suggestedPoints > 0 && (
                                <View style={s.bonusCard}>
                                    <Icon icon="solar:gift-bold" width={28} color="#2D8048" />
                                    <View style={{ flex: 1 }}><Text style={{ fontSize: 12, color: '#666', fontWeight: '700' }}>{isTH ? 'แต้มโบนัสที่ได้รับ' : 'Bonus points'}</Text><Text style={{ fontSize: 20, fontWeight: '900', color: '#2D8048' }}>+{result.receipt.suggestedPoints}</Text></View>
                                </View>
                            )}

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <Pressable onPress={reset} disabled={loading} style={[s.actBtn, { flex: 1, backgroundColor: '#F5F5F5' }]}><Text style={{ color: '#888', fontWeight: '800', fontSize: 14 }}>{isTH ? 'ทิ้ง' : 'Discard'}</Text></Pressable>
                                <Pressable onPress={handleConfirm} disabled={loading} style={[s.actBtn, { flex: 2, backgroundColor: '#1B5E37' }]}>
                                    {loading ? <ActivityIndicator color="#D5EE7A" /> : <Icon icon="lucide:check-check" width={16} color="#D5EE7A" />}
                                    <Text style={{ color: '#D5EE7A', fontWeight: '900', fontSize: 14 }}>{isTH ? 'รับแต้มและจบ' : 'Claim & finish'}</Text>
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
            <VIPUpgradeSheet open={showUpgrade} onClose={() => setShowUpgrade(false)} onUpgrade={handleUpgrade} price={69} />
        </View>
    );
}

const s = StyleSheet.create({
    header: { paddingTop: 36, paddingHorizontal: 22, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    quotaCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 25, elevation: 2 },
    quotaIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    vipBtn: { backgroundColor: '#1B5E37', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 4 },
    uploadCard: { backgroundColor: 'white', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 2, borderColor: '#DCE89A', borderStyle: 'dashed', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 30, elevation: 2 },
    uploadIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    uploadBtn: { width: '100%', paddingVertical: 16, borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    secLabel: { fontSize: 11, color: '#888', fontWeight: '900', letterSpacing: 0.5, marginBottom: 10 },
    howCard: { backgroundColor: 'white', borderRadius: 18, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, elevation: 1 },
    howRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomColor: '#F5F5F5' },
    howIcon: { width: 32, height: 32, backgroundColor: '#F1F8E9', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    disclaimer: { marginTop: 14, backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFE082', borderRadius: 14, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    centerCard: { backgroundColor: 'white', borderRadius: 24, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 30, elevation: 2 },
    errIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    upgradeBtn: { paddingVertical: 14, paddingHorizontal: 32, backgroundColor: '#1B5E37', borderRadius: 50, flexDirection: 'row', alignItems: 'center', gap: 8 },
    scoreCard: { borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 },
    itemsCard: { backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 2 },
    itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomColor: '#F5F5F5' },
    bonusCard: { backgroundColor: '#F6FAEC', borderWidth: 1.5, borderColor: '#DCE89A', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    actBtn: { paddingVertical: 14, borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
