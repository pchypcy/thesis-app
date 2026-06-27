import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, Image, Modal, StyleSheet, Animated, Easing } from "react-native";
import { Pressable } from "../components/Touchable";
import Svg, { Path, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate, useLocation } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang, translations } from '../utils/language';
import AllergyAlertModal from '../components/AllergyAlertModal';
import VIPUpgradeSheet from '../components/VIPUpgradeSheet';
import SugarTrackerCard from '../components/SugarTrackerCard';
import BottomNav from '../components/BottomNav';

const ingredientEncyclopedia = {
    'Tartrazine': { category: 'Artificial Color', risk_level: 'High', effect: 'สีผสมอาหารสังเคราะห์ อาจกระตุ้นอาการภูมิแพ้ ลมพิษ หรือหอบหืด', health_impact: 'Allergy Trigger', source: 'US FDA / EFSA' },
    'Aspartame': { category: 'Artificial Sweetener', risk_level: 'Medium', effect: 'สารให้ความหวานแทนน้ำตาล ผู้ป่วยโรคฟีนิลคีโตนูเรีย (PKU) ห้ามรับประทาน', health_impact: 'Metabolic Risk', source: 'WHO / JECFA' },
    'Vegetable Fat': { category: 'Fat / Oil', risk_level: 'Medium', effect: 'ไขมันพืช ให้พลังงานสูง ควรบริโภคในปริมาณที่เหมาะสม', health_impact: 'Cholesterol', source: 'AHA' },
    'Palm Oil': { category: 'Fat / Oil', risk_level: 'Medium', effect: 'น้ำมันปาล์ม มีกรดไขมันอิ่มตัวสูง การบริโภคมากเกินไปอาจเพิ่มคอเลสเตอรอล', health_impact: 'Heart Health', source: 'WHO' },
    'Lecithin': { category: 'Emulsifier', risk_level: 'Safe', effect: 'สารให้ความคงตัวและอิมัลซิไฟเออร์ ปลอดภัยสำหรับการบริโภค', health_impact: 'Safe', source: 'FDA (GRAS)' },
    'Whole Milk': { category: 'Dairy', risk_level: 'Safe', effect: 'นมผงเต็มมันเนย ให้โปรตีนและแคลเซียม ผู้ที่แพ้นมวัวควรหลีกเลี่ยง', health_impact: 'Nutrition / Allergy', source: 'General Nutrition' },
    'Soymilk': { category: 'Plant-based Milk', risk_level: 'Safe', effect: 'น้ำนมถั่วเหลือง อุดมด้วยโปรตีนพืชและไขมันดี', health_impact: 'Healthy', source: 'Nutrition Database' },
};

const PACK_ICON = {
    bottle: 'mdi:bottle-soda-classic-outline', can: 'mdi:bottle-wine-outline', wrapper: 'mdi:candycane',
    cup: 'mdi:cup', carton: 'mdi:cube-outline', jar: 'mdi:cup-outline', tube: 'mdi:bottle-tonic-outline',
    paperbox: 'mdi:package-variant-closed', foam: 'mdi:package-variant', box: 'mdi:package-variant-closed',
};

// ── WasteCard: top-level component (มี state ภายใน → ห้าม remount) ──
function WasteCard({ product, isExploded, setIsExploded, bonusPoints, setBonusPoints, saveBonusPoints, updateImpactStats, getBinData, getPackagingType, formatTag, t, currentLang }) {
    const displayTags = product.packaging_tags || [];
    const [isMissingPackage, setIsMissingPackage] = useState(displayTags.length === 0);
    const [missionCompleted, setMissionCompleted] = useState(false);
    const [identifiedMaterial, setIdentifiedMaterial] = useState(null);
    const [identifiedPackType, setIdentifiedPackType] = useState(null);
    const packType = identifiedPackType || getPackagingType();
    const partsToShow = displayTags.length > 0 ? displayTags : (identifiedMaterial ? [identifiedMaterial] : []);

    const MISSION_OPTIONS = [
        { labelTH: 'ขวดพลาสติก', material: 'Plastic Bottle', packType: 'bottle', icon: 'mdi:bottle-soda-classic-outline' },
        { labelTH: 'กระป๋อง', material: 'Aluminium Can', packType: 'can', icon: 'mdi:bottle-wine-outline' },
        { labelTH: 'ขวด/โหลแก้ว', material: 'Glass Jar', packType: 'jar', icon: 'mdi:cup-outline' },
        { labelTH: 'กล่องกระดาษ', material: 'Paper Box', packType: 'paperbox', icon: 'mdi:package-variant-closed' },
        { labelTH: 'กล่องนม UHT', material: 'UHT Carton', packType: 'carton', icon: 'mdi:cube-outline' },
        { labelTH: 'ซองขนม', material: 'Snack Wrapper', packType: 'wrapper', icon: 'mdi:candycane' },
        { labelTH: 'หลอด', material: 'Tube', packType: 'tube', icon: 'mdi:bottle-tonic-outline' },
        { labelTH: 'กล่องโฟม', material: 'Styrofoam', packType: 'foam', icon: 'mdi:package-variant' },
        { labelTH: 'กระป๋องสเปรย์', material: 'Aerosol Spray', packType: 'can', icon: 'mdi:spray' },
    ];

    const handleWasteMission = (opt) => {
        saveBonusPoints(10, `Mission: Identified Packaging (${opt.material})`);
        setIdentifiedMaterial(opt.material);
        setIdentifiedPackType(opt.packType);
        setIsMissingPackage(false);
        setMissionCompleted(true);
    };
    const reopenMission = () => {
        setIsMissingPackage(true); setMissionCompleted(false);
        setIdentifiedMaterial(null); setIdentifiedPackType(null); setIsExploded(false);
    };

    // ── โมเดลบรรจุภัณฑ์ 3D (เลียนแบบ CSS 3D เดิม: gradient ซ้อนชั้น + transform ระเบิด) ──
    const explode = useRef(new Animated.Value(isExploded ? 1 : 0)).current;
    useEffect(() => {
        Animated.timing(explode, { toValue: isExploded ? 1 : 0, duration: 550, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }).start();
    }, [isExploded]);
    const ip = (a, b) => explode.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
    const capColors = ['#607D8B', '#B0BEC5', '#607D8B'];
    const Cap = ({ w, h, left, top, radius = 4, pop = 22, rot = 16 }) => (
        <Animated.View style={{ position: 'absolute', left, top, width: w, height: h, borderRadius: radius, overflow: 'hidden', zIndex: 3, transform: [{ translateY: ip(0, -pop) }, { rotate: ip('0deg', `${rot}deg`) }] }}>
            <LinearGradient colors={capColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
    );
    const Body = ({ w, h, left, top, colors, vertical = false, bstyle }) => (
        <View style={[{ position: 'absolute', left, top, width: w, height: h, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', zIndex: 1 }, bstyle]}>
            <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={vertical ? { x: 0, y: 1 } : { x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </View>
    );
    const Label = ({ w, h, left, top }) => (
        <Animated.View style={{ position: 'absolute', left, top, width: w, height: h, backgroundColor: 'rgba(204,255,0,0.92)', borderWidth: 1.5, borderColor: '#1B5E37', borderStyle: 'dashed', borderRadius: 8, alignItems: 'center', justifyContent: 'center', zIndex: 4, opacity: explode, transform: [{ translateX: ip(0, 62) }, { rotate: ip('0deg', '14deg') }] }}>
            <Text style={{ fontSize: 10, color: '#1B5E37', fontWeight: '800' }}>{t.label || 'ฉลาก'}</Text>
        </Animated.View>
    );
    const renderModel = () => {
        switch (packType) {
            case 'bottle': return (<>
                <Cap w={20} h={15} left={50} top={15} />
                <Body w={50} h={100} left={35} top={35} colors={['rgba(207,232,245,0.55)', 'rgba(255,255,255,0.95)', 'rgba(207,232,245,0.55)']} bstyle={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} />
                <Label w={54} h={40} left={33} top={66} />
            </>);
            case 'can': return (<>
                <Cap w={22} h={6} left={49} top={30} />
                <Body w={60} h={100} left={30} top={35} colors={['#9FB1BA', '#ECEFF1', '#9FB1BA']} bstyle={{ borderRadius: 6 }} />
                <Label w={60} h={46} left={30} top={62} />
            </>);
            case 'wrapper': return (<>
                <Cap w={80} h={10} left={20} top={25} radius={5} />
                <Body w={80} h={100} left={20} top={35} colors={['#FAFAFA', '#E8EAED']} vertical bstyle={{ borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }} />
                <Label w={60} h={46} left={30} top={62} />
            </>);
            case 'cup': return (<>
                <Cap w={80} h={8} left={20} top={32} radius={6} />
                <Body w={70} h={80} left={25} top={40} colors={['#FFFFFF', '#E8EBED']} vertical bstyle={{ borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />
                <Label w={50} h={30} left={35} top={62} />
            </>);
            case 'carton': return (<>
                <Cap w={9} h={22} left={56} top={18} radius={3} />
                <Body w={56} h={110} left={32} top={35} colors={['#E4EAEC', '#FFFFFF', '#E4EAEC']} bstyle={{ borderRadius: 4 }} />
                <Label w={56} h={46} left={32} top={62} />
            </>);
            case 'jar': return (<>
                <Cap w={64} h={14} left={28} top={30} />
                <Body w={70} h={85} left={25} top={45} colors={['rgba(207,232,245,0.5)', 'rgba(255,255,255,0.92)', 'rgba(207,232,245,0.5)']} bstyle={{ borderRadius: 8 }} />
                <Label w={56} h={46} left={32} top={62} />
            </>);
            case 'tube': return (<>
                <Cap w={18} h={16} left={51} top={22} />
                <Body w={46} h={90} left={37} top={43} colors={['#B0BEC5', '#FFFFFF', '#B0BEC5']} bstyle={{ borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
                <View style={{ position: 'absolute', left: 37, top: 125, width: 46, height: 9, backgroundColor: '#90A4AE', borderBottomLeftRadius: 3, borderBottomRightRadius: 3, zIndex: 2 }} />
                <Label w={40} h={46} left={40} top={62} />
            </>);
            case 'paperbox': return (<>
                <Animated.View style={{ position: 'absolute', left: 28, top: 28, width: 64, height: 14, backgroundColor: '#B8915A', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', borderTopLeftRadius: 3, borderTopRightRadius: 3, zIndex: 3, transform: [{ perspective: 120 }, { translateY: ip(0, -14) }, { rotateX: ip('0deg', '55deg') }] }} />
                <Body w={64} h={100} left={28} top={42} colors={['#A9824C', '#D7B07A', '#C19A5B']} bstyle={{ borderRadius: 2 }} />
                <Label w={54} h={46} left={33} top={66} />
            </>);
            case 'foam': return (<>
                <Animated.View style={{ position: 'absolute', left: 17, top: 48, width: 86, height: 32, zIndex: 3, borderRadius: 8, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)', transform: [{ translateY: ip(0, -20) }, { rotate: ip('0deg', '-16deg') }] }}>
                    <LinearGradient colors={['#FFFFFF', '#E8EBED']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
                </Animated.View>
                <Body w={86} h={46} left={17} top={80} colors={['#F3F5F6', '#FFFFFF']} vertical bstyle={{ borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }} />
                <Label w={50} h={30} left={35} top={88} />
            </>);
            default: return (<>
                <Cap w={30} h={14} left={45} top={25} />
                <Body w={70} h={108} left={25} top={40} colors={['#FFFFFF', '#E6E9EB']} vertical bstyle={{ borderRadius: 12 }} />
                <Label w={60} h={54} left={30} top={66} />
            </>);
        }
    };

    if (isMissingPackage) {
        return (
            <View style={{ paddingHorizontal: 25, marginVertical: 20 }}>
                <View style={s.missionCard}>
                    <View style={s.missionIcon}><Icon icon="mdi:magnify-scan" width={35} color="#F57F17" /></View>
                    <Text style={s.missionTitle}>ภารกิจนักสืบขยะ!</Text>
                    <Text style={s.missionSub}>สินค้านี้ยังไม่มีข้อมูล เลือกประเภทบรรจุภัณฑ์เพื่อรับ +10 แต้มโบนัส</Text>
                    <View style={s.missionGrid}>
                        {MISSION_OPTIONS.map((opt) => (
                            <Pressable key={opt.material} onPress={() => handleWasteMission(opt)} style={s.missionOpt}>
                                <Icon icon={opt.icon} width={26} color="#F57F17" />
                                <Text style={s.missionOptText}>{opt.labelTH}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={{ paddingHorizontal: 25, marginVertical: 20 }}>
            <View style={s.wasteCard}>
                {missionCompleted && (
                    <View style={s.thankBox}><Text style={s.thankText}>🎉 ขอบคุณนักสืบ! คุณได้รับ 10 แต้มแล้ว</Text></View>
                )}
                <Text style={s.wasteTitle}>{t.disassemble || 'แยกชิ้นส่วนบรรจุภัณฑ์'}</Text>
                <Text style={s.wasteSub}>{t.tapEarn || 'แตะกล่องเพื่อแยกขยะ'}</Text>
                {identifiedMaterial && (
                    <Pressable onPress={reopenMission} style={s.reopenBtn}>
                        <Icon icon="mdi:refresh" width={14} color="#D5EE7A" />
                        <Text style={s.reopenText}>เลือกวัสดุใหม่</Text>
                    </Pressable>
                )}
                <Pressable
                    onPress={() => { setIsExploded(!isExploded); if (!bonusPoints) { setBonusPoints(true); saveBonusPoints(30, 'Waste Separation'); updateImpactStats('plastic'); } }}
                    style={s.packModel}
                >
                    <View style={{ width: 120, height: 160 }}>{renderModel()}</View>
                </Pressable>

                {isExploded && (
                    <View style={{ marginTop: 16, width: '100%' }}>
                        <View style={s.divider} />
                        {partsToShow.length > 0 ? partsToShow.map((tag, i) => {
                            const bin = getBinData(tag);
                            return (
                                <View key={i} style={s.binRow}>
                                    <View style={[s.binIcon, { backgroundColor: bin.bg }]}><Icon icon={bin.icon} width={24} color={bin.color} /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.binPart}>{formatTag(tag)}</Text>
                                        <Text style={[s.binName, { color: bin.color }]}>{currentLang === 'TH' ? `ทิ้งถังสี${bin.colorName} (${bin.name})` : `${bin.colorName} bin (${bin.name})`}</Text>
                                        {bin.tip ? <Text style={s.binTip}>{bin.tip}</Text> : null}
                                    </View>
                                </View>
                            );
                        }) : (
                            <Text style={s.noPackage}>{t.noPackageData}</Text>
                        )}
                        {bonusPoints && (
                            <View style={s.earnedPill}><Icon icon="mdi:star" width={14} color="#D5EE7A" /><Text style={s.earnedText}>{t.earnedPoints}</Text></View>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

export default function Result() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const username = storage.getItem('username');
    const currentLang = getCurrentLang() || 'TH';
    const t = translations[currentLang] || translations.TH;

    const savedProduct = (() => { try { const sp = storage.getItem('lastScannedProduct'); return sp ? JSON.parse(sp) : null; } catch { return null; } })();
    const product = state?.product || savedProduct || {
        name: 'Unknown Product', brand: 'Unknown Brand', earned: 0, is_green: false, barcode: '', image: null,
        sugar_g: 0, sodium_mg: 0, fat_g: 0, energy_kcal: 0, carbs_g: 0, protein_g: 0,
        ingredients_text: '', allergens: '', ingredients_parsed: [], ingredients: [],
        marketing_text: 'No description available.', additives: [], analysis_tags: [], packaging_tags: [], categories: '',
    };

    const [userHealth, setUserHealth] = useState(null);
    const [healthAlerts, setHealthAlerts] = useState([]);
    const [selectedIngredient, setSelectedIngredient] = useState(null);
    const [isExploded, setIsExploded] = useState(false);
    const [bonusPoints, setBonusPoints] = useState(false);
    const [selectedKeyword, setSelectedKeyword] = useState(null);
    const [collectedWords, setCollectedWords] = useState([]);
    const [displayPoints, setDisplayPoints] = useState(() => {
        const p = state?.product || savedProduct;
        if (!p) return 0;
        return p.actualEarned !== undefined ? p.actualEarned : (p.earned || 0);
    });
    const [isGreenPersona, setIsGreenPersona] = useState(false);
    const [keywordsDict, setKeywordsDict] = useState({});
    const [isVip, setIsVip] = useState(false);
    const [vipStatus, setVipStatus] = useState(null);
    const [todayIntake, setTodayIntake] = useState(null);
    const [whoLimits, setWhoLimits] = useState({ sugar_g: 50, starch_g: 300 });
    const [weekData, setWeekData] = useState([]);
    const [allergyAlert, setAllergyAlert] = useState(null);
    const [showAllergyModal, setShowAllergyModal] = useState(false);
    const [allergyAcknowledged, setAllergyAcknowledged] = useState(false);
    const [showUpgradeSheet, setShowUpgradeSheet] = useState(false);

    const H = { 'ngrok-skip-browser-warning': 'true' };

    const handleVipUpgrade = async () => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/vip/upgrade`, { username, amount: 69, method: 'in_app', reference: `DEMO-${Date.now()}` }, { headers: H });
            if (res.data?.success) {
                setIsVip(true);
                setVipStatus({ isVip: true, status: 'active', daysRemaining: res.data.daysRemaining || 30 });
                setShowUpgradeSheet(false);
            }
        } catch (err) { console.error('Upgrade error:', err); }
    };

    const updateImpactStats = async (type) => {
        if (!username) return;
        try { await axios.post(`${API_BASE_URL}/api/users/update-impact`, { username, type }, { headers: H }); }
        catch (err) { console.error('Failed to save impact stats', err); }
    };

    const getProductImage = () => {
        if (product.image) return product.image;
        if (product.image_url) return product.image_url;
        return 'https://placehold.co/400x400/E8F5E9/1F5E37?text=No+Image';
    };

    const analyzeIngredient = (rawInput) => {
        const rawName = typeof rawInput === 'string' ? rawInput : rawInput.name;
        const match = Object.keys(ingredientEncyclopedia).find((key) => rawName.toLowerCase().includes(key.toLowerCase()));
        let baseData = { name: rawName, category: currentLang === 'TH' ? 'ส่วนผสมทั่วไป' : 'General Ingredient', risk_level: 'Safe', effect: currentLang === 'TH' ? 'ส่วนผสมทั่วไป ปลอดภัยสำหรับการบริโภคในปริมาณที่เหมาะสม' : 'General ingredient safe for moderate consumption.', health_impact: 'Safe', source: 'OpenFoodFacts Database' };
        if (match) baseData = { ...baseData, ...ingredientEncyclopedia[match], name: rawName };
        if (typeof rawInput === 'object') { baseData.percent = rawInput.percent; baseData.sub = rawInput.sub; }
        return baseData;
    };

    const performPersonalizedCheck = (user, prod) => {
        let alerts = [];
        const hp = user.health_profile || {};
        if (hp.has_diabetes && prod.sugar_g > 10) alerts.push({ title: t.highSugar, desc: t.highSugarDesc, icon: 'mdi:diabetes' });
        if ((hp.has_high_pressure || hp.has_kidney_disease) && prod.sodium_mg > 400) alerts.push({ title: t.highSodium, desc: t.highSodiumDesc, icon: 'mdi:heart-pulse' });
        const allergies = hp.allergies || [];
        if (allergies.length > 0) {
            allergies.forEach((allergen) => {
                const inIng = (prod.ingredients || []).some((ing) => ing.toLowerCase().includes(allergen.toLowerCase()));
                const inTags = prod.allergens && prod.allergens.toLowerCase().includes(allergen.toLowerCase());
                if (inIng || inTags) alerts.push({ title: `${t.allergyAlert}: ${allergen}`, desc: t.allergyDesc, icon: 'mdi:skull-outline' });
            });
        }
        setHealthAlerts(alerts);
    };

    useEffect(() => {
        if (!username) return;
        const productSnapshot = product;
        (async () => {
            try {
                const [resUser, resKeywords] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/users/${username}`, { headers: H }),
                    axios.get(`${API_BASE_URL}/api/keywords`, { headers: H }),
                ]);
                setUserHealth(resUser.data);
                const persona = resUser.data.persona || '';
                setIsGreenPersona(persona.includes('Green') || persona.includes('Warrior'));
                performPersonalizedCheck(resUser.data, productSnapshot);
                setKeywordsDict(resKeywords.data);

                try {
                    const vipRes = await axios.get(`${API_BASE_URL}/api/vip/status/${username}`, { headers: H, timeout: 6000 });
                    const vipActive = vipRes.data?.isVip || false;
                    setIsVip(vipActive);
                    setVipStatus(vipRes.data || null);
                    if (vipActive) {
                        const [day, week] = await Promise.all([
                            axios.get(`${API_BASE_URL}/api/intake/summary/${username}?period=day`, { headers: H, timeout: 6000 }),
                            axios.get(`${API_BASE_URL}/api/intake/summary/${username}?period=week`, { headers: H, timeout: 6000 }),
                        ]);
                        if (day.data?.success && day.data.data?.length > 0) { setTodayIntake(day.data.data[0]); setWhoLimits(day.data.whoLimits || { sugar_g: 50, starch_g: 300 }); }
                        if (week.data?.success && week.data.data?.length > 0) setWeekData(week.data.data);
                    }
                } catch {}

                try {
                    const allergyRes = await axios.post(`${API_BASE_URL}/api/health-profile/check`, {
                        username,
                        product: { name: productSnapshot.name, brand: productSnapshot.brand, ingredients: productSnapshot.ingredients || [], ingredients_text: productSnapshot.ingredients_text || productSnapshot.marketing_text || '', allergens: productSnapshot.allergens || '', marketing_text: productSnapshot.marketing_text || '', categories: productSnapshot.categories || '' },
                    }, { headers: H, timeout: 7000 });
                    if (allergyRes.data?.hasMatch) { setAllergyAlert(allergyRes.data); setShowAllergyModal(true); }
                } catch {}
            } catch (err) { console.error('Error fetching data:', err); }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username]);

    const saveBonusPoints = async (points, activity) => {
        if (bonusPoints && activity === 'Waste Separation') return;
        try {
            await axios.post(`${API_BASE_URL}/api/users/add-points`, { username, points, activity, productName: product.name, barcode: product.barcode }, { headers: H });
            setDisplayPoints((p) => p + points);
        } catch (e) {}
    };

    const handleKeywordClick = (word, info) => {
        setSelectedKeyword({ word, ...info });
        if (!collectedWords.includes(word)) { setCollectedWords((prev) => [...prev, word]); saveBonusPoints(10, `Keyword: ${word}`); }
    };

    const renderHighlightedText = (textStr) => {
        if (!textStr || textStr === 'No description available.') return <Text style={s.keywordBody}>-</Text>;
        const keys = Object.keys(keywordsDict);
        if (keys.length === 0) return <Text style={s.keywordBody}>{textStr}</Text>;
        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const sortedKeys = keys.sort((a, b) => b.length - a.length).map(escapeRegExp);
        const regex = new RegExp(`(${sortedKeys.join('|')})`, 'gi');
        return (
            <Text style={s.keywordBody}>
                {textStr.split(regex).map((part, index) => {
                    if (!part) return null;
                    const matchedKey = keys.find((key) => key.toLowerCase() === part.toLowerCase());
                    if (matchedKey) {
                        const isCollected = collectedWords.includes(matchedKey);
                        return (
                            <Text key={index} onPress={() => handleKeywordClick(matchedKey, keywordsDict[matchedKey])}
                                style={[s.keywordHi, { backgroundColor: isCollected ? '#D5EE7A' : '#F4FDC6' }]}>
                                {' '}{part}{!isCollected ? <Text style={s.keywordDot}> ●</Text> : null}{' '}
                            </Text>
                        );
                    }
                    return <Text key={index}>{part}</Text>;
                })}
            </Text>
        );
    };

    const getPackagingType = () => {
        const combined = [...(product.packaging_tags || []), product.packaging || '', product.name || '', product.categories || ''].join(' ').toLowerCase();
        const has = (...kw) => kw.some((k) => combined.includes(k));
        if (has('carton', 'tetra', 'uht', 'gable', 'กล่องนม', 'กล่องยูเอชที')) return 'carton';
        if (has('foam', 'styrofoam', 'polystyrene', 'eps', 'โฟม')) return 'foam';
        if (has('tube', 'หลอด', 'toothpaste', 'ยาสีฟัน')) return 'tube';
        if (has('jar', 'โหล', 'ขวดแก้ว', 'glass jar')) return 'jar';
        if (has('bottle', 'ขวด', 'pet', 'water', 'น้ำดื่ม')) return 'bottle';
        if (has('can', 'กระป๋อง', 'tin', 'aluminium', 'aluminum')) return 'can';
        if (has('wrapper', 'ซอง', 'ถุง', 'bag', 'snack', 'chip', 'pouch', 'sachet', 'ขนม', 'film', 'ฟิล์ม')) return 'wrapper';
        if (has('cup', 'ถ้วย', 'yogurt', 'โยเกิร์ต', 'noodle', 'มาม่า', 'บะหมี่')) return 'cup';
        if (has('cardboard', 'paperboard', 'paper box', 'กล่องกระดาษ', 'box', 'กล่อง')) return 'paperbox';
        return 'box';
    };

    const getBinData = (tag) => {
        const v = (tag || '').toLowerCase();
        const isTH = currentLang === 'TH';
        if (/(battery|batteries|aerosol|spray|chemical|toxic|insecticide|pesticide|paint|solvent|electronic|e-waste|bulb|fluorescent|cartridge|pharmaceutical|ถ่าน|แบตเตอรี่|สเปรย์|สารเคมี|เคมี|ยาฆ่าแมลง|หลอดไฟ|อิเล็กทรอนิกส์)/.test(v))
            return { color: '#D32F2F', bg: '#FFEBEE', name: t.hazardBin, colorName: t.colorRed, icon: 'mdi:biohazard', tip: isTH ? 'ห้ามทิ้งรวมขยะทั่วไป นำไปจุดรับขยะอันตราย' : 'Use a hazardous drop-off' };
        if (/(biodegradable|compostable|organic|food waste|bagasse|ชานอ้อย|ย่อยสลาย|ขยะเปียก|เศษอาหาร|อินทรีย์)/.test(v))
            return { color: '#2D8048', bg: '#E8F5E9', name: t.organicBin, colorName: t.colorGreen, icon: 'mdi:leaf', tip: isTH ? 'ทิ้งรวมเศษอาหารและวัสดุย่อยสลายได้' : 'For food scraps & compostables' };
        if (/(bottle|pet|hdpe|glass|jar|can|tin|aluminium|aluminum|metal|steel|paper|cardboard|carton|box|recycl|ขวด|แก้ว|โหล|กระป๋อง|อะลูมิเนียม|โลหะ|กระดาษ|ลัง|รีไซเคิล)/.test(v))
            return { color: '#F57F17', bg: '#FFF9C4', name: t.recycleBin, colorName: t.colorYellow, icon: 'mdi:recycle', tip: isTH ? 'ล้างให้สะอาดและทำให้แห้งก่อนทิ้ง' : 'Rinse & dry before disposal' };
        return { color: '#1565C0', bg: '#E3F2FD', name: t.generalBin, colorName: t.colorBlue, icon: 'mdi:trash-can-outline', tip: isTH ? 'รีไซเคิลไม่ได้หรือปนเปื้อน ทิ้งถังขยะทั่วไป' : 'Non-recyclable — general waste' };
    };

    const formatTag = (tag) => tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    const MacroRing = ({ title, color, value, total }) => {
        const val = value ? Math.round(value * 100) / 100 : 0;
        const dash = Math.min((val / total) * 100, 100);
        const d = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';
        return (
            <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color, marginBottom: 10 }}>{title}</Text>
                <View style={{ width: 75, height: 75 }}>
                    <Svg viewBox="0 0 36 36" width={75} height={75}>
                        <G rotation={-90} origin="18, 18">
                            <Path d={d} fill="none" stroke="#F5F5F5" strokeWidth={3} />
                            <Path d={d} fill="none" stroke={color} strokeWidth={3} strokeDasharray={`${dash}, 100`} strokeLinecap="round" />
                        </G>
                    </Svg>
                    <View style={s.ringCenter}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#333' }}>{val}</Text>
                        <Text style={{ fontSize: 10, color: '#999', fontWeight: '600' }}>/{total}g</Text>
                    </View>
                </View>
            </View>
        );
    };

    const ProductSummaryBanner = () => {
        if (!userHealth) return null;
        const healthInsights = [];
        const ecoInsights = [];
        if (product.limitReached) healthInsights.push({ type: 'neutral', title: 'คุณรับแต้มสูงสุดของวันนี้แล้ว!', desc: 'สแกนครบ 5 ชิ้นต่อวันแล้ว ข้อมูลนี้ถูกบันทึก แต่จะไม่ได้รับแต้มเพิ่ม' });
        if (healthAlerts.length > 0) healthInsights.push({ type: 'danger', title: t.healthConflict, desc: healthAlerts.map((a) => a.title).join(', ') });
        if (product.sugar_g > 40) healthInsights.push({ type: 'warning', title: t.highSugarDeduct, desc: currentLang === 'TH' ? 'สูงกว่าเกณฑ์ที่แนะนำต่อ 1 หน่วยบริโภค' : 'Above recommended intake' });
        if (product.sodium_mg > 400) healthInsights.push({ type: 'warning', title: currentLang === 'TH' ? 'โซเดียมค่อนข้างสูง' : 'High Sodium', desc: currentLang === 'TH' ? 'ควรระวังหากควบคุมความดัน' : 'Caution if monitoring BP' });
        if (!product.is_green) ecoInsights.push({ type: 'neutral', title: t.notEcoDeduct, desc: currentLang === 'TH' ? 'บรรจุภัณฑ์ย่อยสลายยาก' : 'Single-use plastic' });
        else ecoInsights.push({ type: 'good', title: t.ecoBadge, desc: t.ecoReason });

        let statusLevel = 'green', verdictText = currentLang === 'TH' ? 'แนะนำสำหรับคุณ' : 'Excellent Match', themeColor = '#4CAF50';
        if (healthAlerts.length > 0) { statusLevel = 'red'; verdictText = currentLang === 'TH' ? 'ไม่แนะนำสำหรับคุณ' : 'Strictly Avoid'; themeColor = '#F44336'; }
        else if (product.sugar_g > 40 || product.sodium_mg > 400) { statusLevel = 'orange'; verdictText = currentLang === 'TH' ? 'บริโภคพอเหมาะ' : 'Moderate'; themeColor = '#FF9800'; }

        let summaryText = statusLevel === 'green'
            ? (currentLang === 'TH' ? (product.is_green ? 'สินค้านี้ตอบโจทย์คุณอย่างสมบูรณ์แบบ ทั้งปลอดภัยต่อสุขภาพและเป็นมิตรต่อสิ่งแวดล้อม' : 'ปลอดภัยต่อสุขภาพและตรงตามเงื่อนไขของคุณ 100% แต่บรรจุภัณฑ์อาจย่อยสลายยาก') : 'Excellent match for your profile.')
            : statusLevel === 'orange'
                ? (currentLang === 'TH' ? 'ควรระวัง! มีสารอาหารบางชนิดค่อนข้างสูง แนะนำให้จำกัดปริมาณ' : 'Portion control recommended.')
                : (currentLang === 'TH' ? 'อันตราย! สินค้านี้ขัดแย้งกับข้อจำกัดสุขภาพของคุณ แนะนำให้หลีกเลี่ยง' : 'Avoid due to health conflict.');

        const allInsights = [...healthInsights, ...ecoInsights];
        const dotColor = (type) => type === 'good' ? '#4CAF50' : type === 'warning' ? '#FF9800' : type === 'danger' ? '#F44336' : '#CCC';
        // ถ้ามีการ์ดด้านบน (แจ้งเตือนภูมิแพ้/รอตรวจสอบ) อย่าเลื่อนขึ้นไปทับ
        const hasCardAbove = isDangerous || product.verification_status === 'pending' || product.verification_status === 'community_approved';

        return (
            <View style={{ paddingHorizontal: 20, marginTop: hasCardAbove ? 6 : -30, zIndex: 10 }}>
                <View style={s.summaryCard}>
                    <View style={s.summaryHeader}>
                        <Text style={{ fontSize: 14, color: '#666', fontWeight: '800' }}>{t.prefMatchTitle}</Text>
                        <View style={s.personaPill}>
                            <Icon icon="mdi:account-star" color={themeColor} width={18} />
                            <Text style={{ fontSize: 14, fontWeight: '900', color: themeColor }}>{userHealth.persona || 'General'}</Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ fontSize: 20, fontWeight: '900', color: themeColor }}>{verdictText}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, height: 12 }}>
                        <View style={{ flex: 1, backgroundColor: statusLevel === 'red' ? '#F44336' : '#F5F5F5', borderRadius: 10 }} />
                        <View style={{ flex: 1, backgroundColor: statusLevel === 'orange' ? '#FF9800' : '#F5F5F5', borderRadius: 10 }} />
                        <View style={{ flex: 1, backgroundColor: statusLevel === 'green' ? '#4CAF50' : '#F5F5F5', borderRadius: 10 }} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text style={{ fontSize: 10, color: statusLevel === 'red' ? '#F44336' : '#AAA', fontWeight: '700' }}>ควรเลี่ยง</Text>
                        <Text style={{ fontSize: 10, color: statusLevel === 'orange' ? '#FF9800' : '#AAA', fontWeight: '700' }}>ปานกลาง</Text>
                        <Text style={{ fontSize: 10, color: statusLevel === 'green' ? '#4CAF50' : '#AAA', fontWeight: '700' }}>ดีเยี่ยม</Text>
                    </View>
                    <View style={{ marginTop: 16 }}>
                        {allInsights.map((insight, idx) => (
                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 10 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dotColor(insight.type), marginTop: 4 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#333' }}>{insight.title}</Text>
                                    <Text style={{ fontSize: 12, color: '#777', lineHeight: 17, fontWeight: '500' }}>{insight.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                    <View style={[s.aiBox, { borderLeftColor: themeColor }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <Icon icon="mdi:lightbulb-on" color={themeColor} width={20} />
                            <Text style={{ fontSize: 14, color: themeColor, fontWeight: '900' }}>{t.aiInsightTitle}</Text>
                            {isVip && <View style={s.vipInsight}><Icon icon="mdi:crown" width={10} color="#D5EE7A" /><Text style={{ fontSize: 10, color: '#D5EE7A', fontWeight: '800' }}>VIP</Text></View>}
                        </View>
                        <Text style={{ fontSize: 14, color: '#444', lineHeight: 22, fontWeight: '600' }}>{summaryText}</Text>
                    </View>
                </View>

                <View style={s.macroCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 }}>
                        <MacroRing title={t.carbs} color="#26A69A" value={product.carbs_g} total={275} />
                        <MacroRing title={t.fat} color="#AB47BC" value={product.fat_g} total={78} />
                        <MacroRing title={t.protein} color="#FFA726" value={product.protein_g} total={50} />
                    </View>
                    <View style={{ height: 1, backgroundColor: '#F0F0F0', marginBottom: 20 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={s.nutLabel}>{t.energy}</Text>
                            <Text style={s.nutVal}>{product.energy_kcal ? Math.round(product.energy_kcal * 100) / 100 : 0}</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={[s.nutLabel, { color: product.sugar_g > 15 ? '#D32F2F' : '#888' }]}>{t.sugarLabel}</Text>
                            <Text style={[s.nutVal, { color: product.sugar_g > 15 ? '#D32F2F' : '#333' }]}>{product.sugar_g ? Math.round(product.sugar_g * 100) / 100 : 0}g</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={[s.nutLabel, { color: product.sodium_mg > 400 ? '#D32F2F' : '#888' }]}>{t.sodiumLabel}</Text>
                            <Text style={[s.nutVal, { color: product.sodium_mg > 400 ? '#D32F2F' : '#333' }]}>{product.sodium_mg ? Math.round(product.sodium_mg * 100) / 100 : 0}mg</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const IngredientsList = () => {
        let arr = product.ingredients_parsed?.length > 0 ? product.ingredients_parsed : (product.ingredients || []);
        arr = arr.filter((ing) => ing !== 'No Data' && String(ing).trim() !== '');
        return (
            <View style={{ paddingHorizontal: 25, marginTop: 25, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={{ color: '#1B5E37', fontSize: 18, fontWeight: '900' }}>{t.mainIngredients}</Text>
                    <Text style={{ fontSize: 11, color: '#888', fontWeight: '600' }}>{t.tapDetails}</Text>
                </View>
                {arr.length > 0 ? arr.map((ing, i) => {
                    const info = analyzeIngredient(ing);
                    const isRisk = info.risk_level !== 'Safe';
                    const riskColor = info.risk_level === 'High' ? '#D32F2F' : info.risk_level === 'Medium' ? '#EF6C00' : '#2D8048';
                    const bgIcon = info.risk_level === 'High' ? '#FFEBEE' : info.risk_level === 'Medium' ? '#FFF3E0' : '#E8F5E9';
                    return (
                        <Pressable key={i} onPress={() => { setSelectedIngredient(info); updateImpactStats('chemical'); }} style={s.ingRow}>
                            <View style={[s.ingIcon, { backgroundColor: bgIcon }]}><Icon icon={isRisk ? 'mdi:alert-circle' : 'mdi:leaf'} color={riskColor} width={24} /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: '800', color: '#1B5E37', fontSize: 15 }}>{info.name}{info.percent ? `  ${info.percent}` : ''}</Text>
                                <Text style={{ fontSize: 12, color: '#888', fontWeight: '600', marginTop: 2 }}>{info.risk_level} • {info.category}</Text>
                            </View>
                            <Icon icon="lucide:chevron-right" width={20} color="#E0E0E0" />
                        </Pressable>
                    );
                }) : (
                    <View style={s.noIng}><Text style={{ color: '#888', fontSize: 14, fontWeight: '700' }}>{t.noIng}</Text></View>
                )}
            </View>
        );
    };

    const IngredientsAnalysis = () => {
        const tags = product.analysis_tags || [];
        if (tags.length === 0) return null;
        const detail = (tag) => {
            if (tag.includes('vegan')) return { label: 'Vegan', icon: 'mdi:leaf', color: '#2D8048', bg: '#E8F5E9' };
            if (tag.includes('vegetarian')) return { label: 'Vegetarian', icon: 'mdi:leaf', color: '#43A047', bg: '#E8F5E9' };
            if (tag.includes('palm-oil-free')) return { label: 'No Palm Oil', icon: 'mdi:information-outline', color: '#1565C0', bg: '#E3F2FD' };
            return { label: tag.replace('en:', ''), icon: 'mdi:information-outline', color: '#555', bg: '#F5F5F5' };
        };
        return (
            <View style={{ paddingHorizontal: 25, marginTop: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#1B5E37', marginBottom: 10 }}>{t.analysisTitle}</Text>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                    {tags.map((tag, i) => {
                        const { label, icon, color, bg } = detail(tag);
                        return <View key={i} style={[s.tagChip, { backgroundColor: bg }]}><Icon icon={icon} width={14} color={color} /><Text style={{ color, fontSize: 12, fontWeight: '800' }}>{label}</Text></View>;
                    })}
                </View>
            </View>
        );
    };

    const AdditivesSection = () => {
        const additives = product.additives || [];
        if (additives.length === 0) return null;
        return (
            <View style={{ paddingHorizontal: 25, marginTop: 25 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#1B5E37', marginBottom: 10 }}>{t.additivesTitle}</Text>
                <View style={s.additiveBox}>
                    {additives.map((add, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                            <Icon icon="mdi:flask" width={16} color="#E65100" /><Text style={{ fontSize: 13, color: '#E65100', fontWeight: '700' }}>{add}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const KeywordCard = () => (
        <View style={{ paddingHorizontal: 25, marginTop: 20, marginBottom: 20 }}>
            <View style={s.keywordCard}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#888', textAlign: 'center', marginBottom: 15 }}>{t.revealMeaning}</Text>
                <View style={s.keywordInner}>
                    <Text style={{ fontSize: 20, color: '#1B5E37', fontWeight: '800', textAlign: 'center' }}>"{product.name}"</Text>
                    <View style={{ height: 1, backgroundColor: '#E0E0E0', marginVertical: 15 }} />
                    {renderHighlightedText(product.marketing_text)}
                </View>
            </View>
        </View>
    );

    const allergyBaseSev = allergyAlert?.highestBaseSeverity || allergyAlert?.highestSeverity;
    const allergyUserSev = allergyAlert?.highestUserSeverity || null;
    const isDangerous = allergyAlert?.hasMatch && (allergyBaseSev === 'critical' || allergyBaseSev === 'high');
    const userSevLabelTH = { severe: 'รุนแรง', medium: 'ปานกลาง', mild: 'เล็กน้อย' };

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <LinearGradient
                    colors={isDangerous ? (allergyBaseSev === 'critical' ? ['#FFEBEE', '#FAFAFA'] : ['#FFCDD2', '#FAFAFA']) : ['#D5EE7A', '#FAFAFA']}
                    locations={[0, 0.3]} style={s.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Pressable onPress={() => navigate('/scan')} style={s.headerBtn}><Icon icon="lucide:arrow-left" color="#1B5E37" width={24} /></Pressable>
                        <Text style={{ fontWeight: '800', fontSize: 16, color: '#1B5E37' }}>{t.resTitle}</Text>
                        <View style={s.pointPill}><Icon icon="mdi:star-four-points" width={16} color="#F9A825" /><Text style={{ fontSize: 14, fontWeight: '800', color: '#1B5E37' }}>+{displayPoints}</Text></View>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <Image source={{ uri: getProductImage() }} style={{ width: 200, height: 200, resizeMode: 'contain' }} />
                        <Text style={{ fontSize: 26, fontWeight: '900', color: '#1B5E37', textAlign: 'center', marginTop: 10 }}>{product.name}</Text>
                        <Text style={{ fontSize: 15, color: '#888', fontWeight: '700', marginTop: 5 }}>{product.brand}</Text>
                    </View>
                </LinearGradient>

                {/* Verification badges */}
                {product.verification_status === 'pending' && (
                    <View style={{ paddingHorizontal: 25, paddingBottom: 14 }}>
                        <Pressable onPress={() => navigate('/community')} style={s.pendingBadge}>
                            <Icon icon="solar:shield-warning-bold" width={22} color="#E65100" />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '900', color: '#E65100' }}>{currentLang === 'TH' ? 'ข้อมูลนี้รอชุมชนตรวจสอบ' : 'Awaiting community review'}</Text>
                                <Text style={{ fontSize: 11, color: '#5D4037', fontWeight: '600', marginTop: 2 }}>{currentLang === 'TH' ? 'เพิ่มโดย user — แตะเพื่อช่วยตรวจสอบ' : 'User-submitted — tap to help verify'}</Text>
                            </View>
                            <Icon icon="lucide:chevron-right" width={18} color="#E65100" />
                        </Pressable>
                    </View>
                )}

                {/* Allergen warning card */}
                {isDangerous && allergyAlert && (
                    <View style={{ paddingHorizontal: 25, paddingBottom: 16 }}>
                        <View style={[s.allergenCard, { borderColor: allergyBaseSev === 'critical' ? '#D32F2F' : '#E53935' }]}>
                            <View style={[s.allergenBar, { backgroundColor: allergyBaseSev === 'critical' ? '#D32F2F' : '#E53935' }]}>
                                <View style={s.allergenBarIcon}><Icon icon="mdi:exclamation" width={20} color="white" /></View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Icon icon="mdi:shield-half-full" width={12} color="white" /><Text style={{ fontSize: 10, fontWeight: '700', color: 'white', opacity: 0.9 }}>{currentLang === 'TH' ? 'ประเมินโดยระบบ' : 'System assessment'}</Text></View>
                                    <Text style={{ fontSize: 15, fontWeight: '900', color: 'white' }}>{allergyBaseSev === 'critical' ? (currentLang === 'TH' ? 'สารนี้จัดอยู่ในกลุ่มอันตรายร้ายแรง' : 'Critical-risk allergen') : (currentLang === 'TH' ? 'สารนี้จัดอยู่ในกลุ่มอันตรายสูง' : 'High-risk allergen')}</Text>
                                </View>
                            </View>
                            <View style={{ padding: 14, backgroundColor: '#FFF5F4' }}>
                                <Text style={{ fontSize: 14, fontWeight: '900', color: '#1B1B1B' }}>
                                    {currentLang === 'TH' ? `พบ ${allergyAlert.matches.map((m) => m.labelTH).join(', ')}` : `Contains ${allergyAlert.matches.map((m) => m.labelEN).join(', ')}`}
                                </Text>
                                {allergyUserSev && (
                                    <View style={s.userSevChip}><Icon icon="mdi:account" width={12} color="#777" /><Text style={{ fontSize: 11, fontWeight: '800', color: '#555' }}>{currentLang === 'TH' ? `คุณตั้งไว้: ${userSevLabelTH[allergyUserSev]}` : `You set: ${allergyUserSev}`}</Text></View>
                                )}
                                <Pressable onPress={() => setShowAllergyModal(true)} style={[s.allergenBtn, { backgroundColor: allergyBaseSev === 'critical' ? '#D32F2F' : '#E53935' }]}>
                                    <Icon icon="mdi:information-outline" width={16} color="white" /><Text style={{ color: 'white', fontWeight: '900', fontSize: 13 }}>{currentLang === 'TH' ? 'ดูรายละเอียดและคำเตือน' : 'View details & warning'}</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                )}

                {ProductSummaryBanner()}

                <SugarTrackerCard isVip={isVip} todayIntake={todayIntake} weekData={weekData} whoLimits={whoLimits} product={product}
                    onUnlockClick={() => setShowUpgradeSheet(true)} onOpenFullTracker={() => navigate('/sugar-tracker')}
                    trialDaysLeft={vipStatus?.status === 'trial' ? vipStatus?.daysRemaining : null} />

                {IngredientsAnalysis()}
                {AdditivesSection()}

                {isGreenPersona ? (
                    <>
                        <WasteCard {...{ product, isExploded, setIsExploded, bonusPoints, setBonusPoints, saveBonusPoints, updateImpactStats, getBinData, getPackagingType, formatTag, t, currentLang }} />
                        {IngredientsList()}
                    </>
                ) : (
                    <>
                        {IngredientsList()}
                        <WasteCard {...{ product, isExploded, setIsExploded, bonusPoints, setBonusPoints, saveBonusPoints, updateImpactStats, getBinData, getPackagingType, formatTag, t, currentLang }} />
                    </>
                )}

                {KeywordCard()}
            </ScrollView>

            <BottomNav active="" />

            {/* Ingredient detail modal */}
            <Modal visible={!!selectedIngredient} transparent animationType="fade" onRequestClose={() => setSelectedIngredient(null)}>
                <Pressable style={s.modalOverlay} onPress={() => setSelectedIngredient(null)}>
                    {selectedIngredient && (() => {
                        const lvl = selectedIngredient.risk_level;
                        const st = lvl === 'High' ? { bg: '#FFF1F0', text: '#D32F2F', icon: 'mdi:alert-decagram' } : lvl === 'Medium' ? { bg: '#FFF7E6', text: '#E65100', icon: 'mdi:alert' } : { bg: '#F6FFED', text: '#2D8048', icon: 'mdi:shield-check-outline' };
                        return (
                            <Pressable style={s.detailCard} onPress={() => {}}>
                                <View style={[s.detailHeader, { backgroundColor: st.bg }]}>
                                    <View style={s.detailIcon}><Icon icon={st.icon} width={36} color={st.text} /></View>
                                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#1B5E37', textAlign: 'center' }}>{selectedIngredient.name}</Text>
                                    <Text style={{ fontSize: 12, color: st.text, fontWeight: '700', marginTop: 4 }}>{selectedIngredient.category}</Text>
                                </View>
                                <View style={{ padding: 25 }}>
                                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                                        <View style={[s.detailStat, { backgroundColor: '#FAFAFA', borderColor: '#F0F0F0' }]}>
                                            <Text style={s.detailStatLabel}>{t.risk}</Text>
                                            <Text style={{ fontSize: 15, fontWeight: '900', color: st.text }}>{selectedIngredient.risk_level}</Text>
                                        </View>
                                        <View style={[s.detailStat, { backgroundColor: '#F1F8E9', borderColor: '#C8E6C9' }]}>
                                            <Text style={[s.detailStatLabel, { color: '#7CB342' }]}>{t.impact}</Text>
                                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#2D8048' }}>{selectedIngredient.health_impact}</Text>
                                        </View>
                                    </View>
                                    <View style={{ marginBottom: 25, paddingLeft: 15, borderLeftWidth: 4, borderLeftColor: st.text }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}><Icon icon="mdi:brain" color={st.text} width={18} /><Text style={{ color: st.text, fontSize: 14, fontWeight: '900' }}>{(t.analysis || 'วิเคราะห์สุขภาพ').replace(/[⚠️:]/g, '').trim()}</Text></View>
                                        <Text style={{ fontSize: 13, color: '#555', lineHeight: 21, fontWeight: '500' }}>{selectedIngredient.effect}</Text>
                                    </View>
                                    <Pressable onPress={() => setSelectedIngredient(null)} style={s.gotItBtn}><Text style={s.gotItText}>{t.gotIt}</Text></Pressable>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 15 }}>
                                        <Icon icon="mdi:database-check" width={12} color="#AAA" /><Text style={{ fontSize: 10, color: '#AAA', fontWeight: '600' }}>{t.dataSource}: {selectedIngredient.source}</Text>
                                    </View>
                                </View>
                            </Pressable>
                        );
                    })()}
                </Pressable>
            </Modal>

            {/* Keyword modal */}
            <Modal visible={!!selectedKeyword} transparent animationType="fade" onRequestClose={() => setSelectedKeyword(null)}>
                <Pressable style={s.modalOverlay} onPress={() => setSelectedKeyword(null)}>
                    {selectedKeyword && (
                        <Pressable style={s.detailCard} onPress={() => {}}>
                            <View style={[s.detailHeader, { backgroundColor: '#FFF8E1' }]}>
                                <View style={s.detailIcon}><Icon icon="mdi:bullhorn-outline" width={36} color="#F57C00" /></View>
                                <Text style={{ fontSize: 22, fontWeight: '900', color: '#1B5E37' }}>"{selectedKeyword.word}"</Text>
                                <View style={s.bonusChip}><Icon icon="mdi:star" width={12} color="#F57C00" /><Text style={{ fontSize: 12, color: '#F57C00', fontWeight: '800' }}>{t.bonusEarned}</Text></View>
                            </View>
                            <View style={{ padding: 25 }}>
                                <View style={s.meaningBox}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}><Icon icon="mdi:translate" width={14} color="#888" /><Text style={{ fontSize: 11, color: '#888', fontWeight: '800' }}>ความหมายทางโฆษณา</Text></View>
                                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#E65100', lineHeight: 21 }}>{selectedKeyword.meaning}</Text>
                                </View>
                                <View style={{ marginBottom: 25, paddingLeft: 15, borderLeftWidth: 4, borderLeftColor: '#2D8048' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}><Icon icon="mdi:shield-check" color="#2D8048" width={18} /><Text style={{ color: '#2D8048', fontSize: 14, fontWeight: '900' }}>{t.factCheck}</Text></View>
                                    <Text style={{ fontSize: 13, color: '#555', lineHeight: 21, fontWeight: '500' }}>{selectedKeyword.fact}</Text>
                                </View>
                                <Pressable onPress={() => setSelectedKeyword(null)} style={s.gotItBtn}><Text style={s.gotItText}>{t.gotIt}</Text></Pressable>
                            </View>
                        </Pressable>
                    )}
                </Pressable>
            </Modal>

            {showAllergyModal && allergyAlert && (
                <AllergyAlertModal alert={allergyAlert} productName={product.name} onClose={() => { setShowAllergyModal(false); setAllergyAcknowledged(true); }} />
            )}

            <VIPUpgradeSheet open={showUpgradeSheet} onClose={() => setShowUpgradeSheet(false)} onUpgrade={handleVipUpgrade}
                trialDaysLeft={vipStatus?.status === 'trial' ? vipStatus?.daysRemaining : null} price={69} />
        </View>
    );
}

const s = StyleSheet.create({
    header: { paddingTop: 40, paddingHorizontal: 25, paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    headerBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
    pointPill: { backgroundColor: 'white', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 6 },
    pendingBadge: { backgroundColor: '#FFF8E1', borderWidth: 1.5, borderColor: '#FFE082', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
    allergenCard: { backgroundColor: 'white', borderRadius: 22, borderWidth: 2, overflow: 'hidden' },
    allergenBar: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
    allergenBarIcon: { width: 34, height: 34, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
    userSevChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
    allergenBtn: { width: '100%', marginTop: 12, paddingVertical: 11, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    summaryCard: { backgroundColor: 'white', borderRadius: 32, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 40, shadowOffset: { width: 0, height: 12 }, elevation: 3 },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    personaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'white', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#F5F5F5', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 15, elevation: 1 },
    aiBox: { backgroundColor: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0', borderLeftWidth: 4, marginTop: 16 },
    vipInsight: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#1B5E37', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
    macroCard: { backgroundColor: 'white', borderRadius: 32, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 40, shadowOffset: { width: 0, height: 12 }, elevation: 2 },
    ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    nutLabel: { fontSize: 12, color: '#888', fontWeight: '700', marginBottom: 4 },
    nutVal: { fontSize: 20, fontWeight: '900', color: '#333' },
    ingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: '#F5F5F5', gap: 15, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 20, elevation: 1 },
    ingIcon: { width: 45, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    noIng: { alignItems: 'center', padding: 20, backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#DDD', borderStyle: 'dashed' },
    tagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20 },
    additiveBox: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#FFB74D', borderStyle: 'dashed' },
    keywordCard: { backgroundColor: 'white', padding: 25, borderRadius: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 40, shadowOffset: { width: 0, height: 10 }, elevation: 2 },
    keywordInner: { borderWidth: 2, borderColor: '#C8E6C9', borderStyle: 'dashed', borderRadius: 20, padding: 25, backgroundColor: '#FAFAFA' },
    keywordBody: { fontSize: 16, lineHeight: 28, color: '#333', fontWeight: '500', textAlign: 'center' },
    keywordHi: { color: '#1B5E37', fontWeight: '800', textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: '#1B5E37' },
    keywordDot: { color: '#FF5252', fontSize: 9, fontWeight: '900' },
    missionCard: { backgroundColor: '#FFF8E1', borderRadius: 30, padding: 25, alignItems: 'center', borderWidth: 3, borderColor: '#FBC02D', borderStyle: 'dashed' },
    missionIcon: { width: 60, height: 60, backgroundColor: '#FFF', borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    missionTitle: { fontWeight: '900', fontSize: 18, color: '#F57F17', marginBottom: 5 },
    missionSub: { fontSize: 13, color: '#795548', marginBottom: 16, fontWeight: '600', textAlign: 'center' },
    missionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
    missionOpt: { width: '31%', paddingVertical: 12, backgroundColor: 'white', borderWidth: 2, borderColor: '#FFE082', borderRadius: 15, alignItems: 'center', gap: 6 },
    missionOptText: { fontSize: 11, color: '#F57F17', fontWeight: '800', textAlign: 'center' },
    wasteCard: { backgroundColor: '#1B5E37', borderRadius: 30, padding: 25, alignItems: 'center' },
    thankBox: { backgroundColor: 'rgba(204,255,0,0.2)', padding: 10, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#D5EE7A' },
    thankText: { color: '#D5EE7A', fontWeight: '800', fontSize: 14, textAlign: 'center' },
    wasteTitle: { fontWeight: '800', fontSize: 18, color: '#D5EE7A', textAlign: 'center' },
    wasteSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12, textAlign: 'center' },
    reopenBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(213,238,122,0.5)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, marginBottom: 18 },
    reopenText: { color: '#D5EE7A', fontSize: 12, fontWeight: '800' },
    packModel: { height: 170, width: 120, alignSelf: 'center', marginTop: 4 },
    tapHint: { color: '#D5EE7A', fontSize: 16, fontWeight: '900' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 15 },
    binRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 15, marginBottom: 10, gap: 12 },
    binIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    binPart: { color: '#333', fontWeight: '800', fontSize: 14 },
    binName: { fontSize: 11, fontWeight: '700', marginTop: 1 },
    binTip: { color: '#888', fontSize: 10, fontWeight: '600', marginTop: 3, lineHeight: 14 },
    noPackage: { color: '#D5EE7A', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 10 },
    earnedPill: { alignSelf: 'center', marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(204,255,0,0.2)', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#D5EE7A' },
    earnedText: { color: '#D5EE7A', fontWeight: '800', fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    detailCard: { width: '95%', maxWidth: 600, backgroundColor: 'white', borderRadius: 32, overflow: 'hidden' },
    detailHeader: { paddingTop: 30, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
    detailIcon: { width: 64, height: 64, backgroundColor: 'white', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 3 },
    detailStat: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1 },
    detailStatLabel: { fontSize: 10, color: '#AAA', fontWeight: '800', marginBottom: 4 },
    gotItBtn: { width: '100%', paddingVertical: 16, backgroundColor: '#1B5E37', borderRadius: 50, alignItems: 'center' },
    gotItText: { color: '#D5EE7A', fontWeight: '900', fontSize: 15 },
    bonusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'white', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12, marginTop: 8 },
    meaningBox: { backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 15 },
});
