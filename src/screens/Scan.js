import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, ActivityIndicator, Linking } from "react-native";
import { Pressable } from "../components/Touchable";
import { CameraView, useCameraPermissions } from 'expo-camera';
import axios from 'axios';
import { Text, TextInput } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang, translations } from '../utils/language';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14', 'qr'];

export default function Scan() {
    const navigate = useNavigate();
    const [username, setUsername] = useState(null);
    const [isManualInput, setIsManualInput] = useState(false);
    const [barcode, setBarcode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [vipStatus, setVipStatus] = useState(null);
    const [pointsToast, setPointsToast] = useState(null);
    const [notFound, setNotFound] = useState(null); // { code }
    const [permission, requestPermission] = useCameraPermissions();
    const lockRef = useRef(false);

    const currentLang = getCurrentLang();
    const t = translations[currentLang];
    const [debugCode, setDebugCode] = useState(t.searchBarcode);

    useEffect(() => {
        const storedUser = storage.getItem('username');
        if (!storedUser) { navigate('/login'); return; }
        setUsername(storedUser);
        axios.get(`${API_BASE_URL}/api/vip/status/${storedUser}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then((res) => { if (res.data.success) setVipStatus(res.data); })
            .catch(() => setVipStatus({ isVip: false }));
    }, [navigate]);

    useEffect(() => {
        if (permission && !permission.granted && permission.canAskAgain) requestPermission();
    }, [permission]);

    const showPointsToast = (points, isVip) => {
        setPointsToast({ points, isVip });
        setTimeout(() => setPointsToast(null), 3000);
    };

    const logIntakeIfVip = async (productData) => {
        if (!vipStatus?.isVip) return;
        try {
            await axios.post(`${API_BASE_URL}/api/intake/log`, {
                username,
                product: {
                    barcode: productData.barcode, name: productData.name,
                    sugar_g: productData.sugar_g || 0, carbs_g: productData.carbs_g || 0,
                    sodium_mg: productData.sodium_mg || 0, fat_g: productData.fat_g || 0,
                    energy_kcal: productData.energy_kcal || 0,
                },
            }, { headers: { 'ngrok-skip-browser-warning': 'true' }, timeout: 8000 });
        } catch (e) {
            console.error('Intake log failed (non-critical):', e.message);
        }
    };

    const checkProduct = async (codeToCheck) => {
        if (!codeToCheck || lockRef.current) return;
        lockRef.current = true;
        setIsScanning(true);

        let searchCode = String(codeToCheck);
        if (searchCode.length === 12) searchCode = '0' + searchCode;

        try {
            const response = await axios.get(`${API_BASE_URL}/api/products/${searchCode}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }, timeout: 12000,
            });
            const productData = response.data;

            let isLimitReached = false;
            let actualPoints = productData.earned;
            let isVipFromScan = false;

            try {
                const scanRes = await axios.post(`${API_BASE_URL}/api/users/scan`, {
                    username, barcode: searchCode, productName: productData.name, points: productData.earned,
                }, { headers: { 'ngrok-skip-browser-warning': 'true' } });

                if (scanRes.data && scanRes.data.limitReached) {
                    isLimitReached = true;
                    actualPoints = 0;
                } else if (scanRes.data?.pointsAwarded !== undefined) {
                    actualPoints = scanRes.data.pointsAwarded;
                    isVipFromScan = scanRes.data?.isVip || false;
                }
                if (!isLimitReached && actualPoints > 0) showPointsToast(actualPoints, isVipFromScan);
            } catch (e) {
                console.error('Error logging user scan:', e);
            }

            logIntakeIfVip(productData);

            const finalProductData = { ...productData, limitReached: isLimitReached, actualEarned: actualPoints };
            storage.setItem('lastScannedProduct', JSON.stringify(finalProductData));
            await new Promise((r) => setTimeout(r, 600));
            navigate('/result', { state: { product: finalProductData } });
        } catch (err) {
            // 404 = ไม่พบสินค้าใน DB/OpenFoodFacts → เรื่องปกติ ไม่ใช่ error
            if (err.response?.status !== 404) console.error('Scan Error:', err);
            setNotFound({ code: searchCode });
        } finally {
            setIsScanning(false);
            // ปลดล็อกหลังหน่วงเล็กน้อย กันสแกนซ้ำรัว ๆ
            setTimeout(() => { lockRef.current = false; }, 1200);
        }
    };

    const onBarcodeScanned = ({ data }) => {
        const code = String(data).trim();
        setDebugCode(`READ: ${code}`);
        if (!lockRef.current && /^\d{8,14}$/.test(code)) checkProduct(code);
    };

    // ── permission states ──
    if (!permission) {
        return <View style={styles.permWrap}><ActivityIndicator color="#D5EE7A" size="large" /></View>;
    }
    if (!permission.granted) {
        return (
            <View style={styles.permWrap}>
                <Icon icon="lucide:camera" width={56} color="#D5EE7A" />
                <Text style={styles.permTitle}>{currentLang === 'TH' ? 'ขอสิทธิ์ใช้กล้อง' : 'Camera permission needed'}</Text>
                <Text style={styles.permSub}>{currentLang === 'TH' ? 'เพื่อสแกนบาร์โค้ดสินค้า' : 'To scan product barcodes'}</Text>
                <Pressable style={styles.permBtn} onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}>
                    <Text style={styles.permBtnText}>{currentLang === 'TH' ? 'อนุญาตกล้อง' : 'Grant camera'}</Text>
                </Pressable>
                <Pressable style={{ marginTop: 14 }} onPress={() => navigate('/home')}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>{t.cancel}</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                onBarcodeScanned={isScanning ? undefined : onBarcodeScanned}
                barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
            />

            {/* dim overlay */}
            <View pointerEvents="none" style={styles.dimAll} />

            {/* close */}
            <Pressable onPress={() => navigate('/home')} style={styles.closeBtn}>
                <Icon icon="lucide:x" width={24} color="white" />
            </Pressable>

            <Text style={styles.title}>{t.scanTitle}</Text>
            <View style={styles.debugBar}><Text style={styles.debugText}>{debugCode}</Text></View>

            {vipStatus?.isVip && (
                <View style={styles.vipBadge}>
                    <Icon icon="mdi:crown" width={16} color="#1B5E37" />
                    <Text style={styles.vipText}>VIP ×1.5</Text>
                </View>
            )}

            {pointsToast && (
                <View style={[styles.pointsToast, { backgroundColor: pointsToast.isVip ? 'rgba(204,255,0,0.95)' : 'rgba(27,94,32,0.95)' }]}>
                    <Icon icon="mdi:star-four-points" width={18} color={pointsToast.isVip ? '#1B5E37' : 'white'} />
                    <Text style={{ fontSize: 16, fontWeight: '900', color: pointsToast.isVip ? '#1B5E37' : 'white' }}>
                        +{pointsToast.points}{pointsToast.isVip ? '  ×1.5 VIP' : ''}
                    </Text>
                </View>
            )}

            {/* scan frame corners */}
            <View pointerEvents="none" style={styles.frame}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
                <View style={styles.scanLine} />
            </View>

            <Text style={styles.guide}>{t.scanGuide}</Text>

            <View style={styles.manualWrap}>
                <Pressable onPress={() => setIsManualInput(true)} style={styles.manualBtn}>
                    <Icon icon="lucide:keyboard" width={20} color="white" />
                    <Text style={styles.manualBtnText}>{t.manualBtn}</Text>
                </Pressable>
            </View>

            {isScanning && (
                <View style={styles.scanningOverlay}>
                    <ActivityIndicator size="large" color="#D5EE7A" />
                    <Text style={styles.scanningText}>{t.scanning}</Text>
                </View>
            )}

            {/* Manual input modal */}
            <Modal visible={isManualInput} transparent animationType="fade" onRequestClose={() => setIsManualInput(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setIsManualInput(false)}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={styles.modalIcon}><Icon icon="lucide:barcode" width={28} color="#1B5E37" /></View>
                            <Text style={styles.modalTitle}>{t.modalTitle}</Text>
                            <Text style={styles.modalSub}>{t.modalSub}</Text>
                        </View>
                        <View style={styles.modalInputBox}>
                            <Icon icon="lucide:hash" color="#BDBDBD" width={20} />
                            <TextInput value={barcode} onChangeText={setBarcode} placeholder={t.placeholder} placeholderTextColor="#BDBDBD" keyboardType="number-pad" style={styles.modalInput} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Pressable onPress={() => setIsManualInput(false)} style={[styles.modalBtn, { flex: 1, backgroundColor: '#F5F5F5' }]}>
                                <Text style={{ color: '#888', fontWeight: '800', fontSize: 15 }}>{t.cancel}</Text>
                            </Pressable>
                            <Pressable onPress={() => { setIsManualInput(false); checkProduct(barcode); }} style={[styles.modalBtn, { flex: 1.5, backgroundColor: '#1B5E37' }]}>
                                <Text style={{ color: '#D5EE7A', fontWeight: '800', fontSize: 15 }}>{t.check}</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Not-found modal */}
            <Modal visible={!!notFound} transparent animationType="fade" onRequestClose={() => setNotFound(null)}>
                <Pressable style={styles.modalOverlay} onPress={() => setNotFound(null)}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <View style={[styles.modalIcon, { backgroundColor: '#FFF1F0', borderColor: '#FFD6D6' }]}>
                                <Icon icon="lucide:alert-circle" width={28} color="#F5222D" />
                            </View>
                            <Text style={styles.modalTitle}>{t.notFoundTitle}</Text>
                            <Text style={styles.modalSub}>{t.notFoundDesc}</Text>
                        </View>
                        <View style={styles.rewardRow}>
                            <Text style={{ fontSize: 13, color: '#666', fontWeight: '700' }}>{t.rewardAdding}</Text>
                            <View style={styles.rewardBadge}><Text style={{ color: '#2D8048', fontWeight: '900', fontSize: 15 }}>50 POINTS</Text></View>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                            <Pressable onPress={() => setNotFound(null)} style={[styles.modalBtn, { flex: 1, backgroundColor: '#F5F5F5' }]}>
                                <Text style={{ color: '#888', fontWeight: '800', fontSize: 15 }}>{t.cancel}</Text>
                            </Pressable>
                            <Pressable onPress={() => { const c = notFound.code; setNotFound(null); navigate('/add-product', { state: { barcode: c } }); }} style={[styles.modalBtn, { flex: 1.5, backgroundColor: '#1B5E37' }]}>
                                <Text style={{ color: '#D5EE7A', fontWeight: '800', fontSize: 15 }}>{t.yesAddIt}</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const FRAME_W = 300, FRAME_H = 180;
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: 'black' },
    dimAll: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
    permWrap: { flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 30 },
    permTitle: { color: 'white', fontSize: 20, fontWeight: '800', marginTop: 10 },
    permSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', marginBottom: 10 },
    permBtn: { backgroundColor: '#D5EE7A', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 40, marginTop: 10 },
    permBtnText: { color: '#1B5E37', fontWeight: '800', fontSize: 15 },
    closeBtn: { position: 'absolute', top: 40, right: 25, zIndex: 30, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 23, width: 45, height: 45, alignItems: 'center', justifyContent: 'center' },
    title: { position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center', color: 'white', zIndex: 20, fontSize: 20, fontWeight: '800' },
    debugBar: { position: 'absolute', top: 95, left: 0, right: 0, alignItems: 'center', zIndex: 20, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 5 },
    debugText: { color: '#D5EE7A', fontSize: 14, fontWeight: '700' },
    vipBadge: { position: 'absolute', top: 42, left: 25, zIndex: 30, backgroundColor: 'rgba(204,255,0,0.9)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
    vipText: { fontSize: 11, fontWeight: '900', color: '#1B5E37' },
    pointsToast: { position: 'absolute', top: 130, alignSelf: 'center', zIndex: 60, borderRadius: 30, paddingVertical: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
    frame: { position: 'absolute', top: '50%', left: '50%', width: FRAME_W, height: FRAME_H, marginLeft: -FRAME_W / 2, marginTop: -FRAME_H / 2, zIndex: 15 },
    corner: { position: 'absolute', width: 40, height: 40, borderColor: '#D5EE7A' },
    tl: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 20 },
    tr: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 20 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 20 },
    br: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 20 },
    scanLine: { position: 'absolute', top: '50%', left: '5%', width: '90%', height: 3, backgroundColor: '#D5EE7A', borderRadius: 2 },
    guide: { position: 'absolute', bottom: 130, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', zIndex: 20 },
    manualWrap: { position: 'absolute', bottom: 55, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
    manualBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 10 },
    manualBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
    scanningOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 50, alignItems: 'center', justifyContent: 'center', gap: 15 },
    scanningText: { fontSize: 16, fontWeight: '700', color: '#D5EE7A' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    modalCard: { width: '85%', maxWidth: 320, backgroundColor: 'white', borderRadius: 28, padding: 24 },
    modalIcon: { width: 60, height: 60, backgroundColor: '#F4FDC6', borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: '#D5EE7A' },
    modalTitle: { fontSize: 22, color: '#1B5E37', fontWeight: '900', textAlign: 'center' },
    modalSub: { fontSize: 14, color: '#888', fontWeight: '500', textAlign: 'center', marginTop: 8 },
    modalInputBox: { backgroundColor: '#FAFAFA', borderRadius: 16, paddingHorizontal: 15, borderWidth: 1.5, borderColor: '#F0F0F0', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    modalInput: { flex: 1, paddingVertical: 12, fontSize: 16, fontWeight: '600', color: '#333' },
    modalBtn: { paddingVertical: 14, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
    rewardRow: { backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rewardBadge: { backgroundColor: '#F1F8E9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
});
