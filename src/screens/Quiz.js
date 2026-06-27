import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, StyleSheet } from "react-native";
import { Pressable } from "../components/Touchable";
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../components/Text';
import { Icon } from '../components/Icon';
import { useNavigate } from '../shims/router';
import { storage } from '../utils/storage';
import { getCurrentLang, translations } from '../utils/language';
import { theme } from '../utils/theme';

const logo1 = require('../../assets/Logo-Pic.png');
const logo2 = require('../../assets/Logo-Text.png');

const ALLERGEN_QUICK_LIST = [
    { id: 'Peanuts',     iconName: 'fluent-emoji-high-contrast:peanuts', labelTH: 'ถั่วลิสง',         labelEN: 'Peanuts',   critical: true  },
    { id: 'TreeNuts',    iconName: 'tdesign:nut',                        labelTH: 'ถั่วเปลือกแข็ง',  labelEN: 'Tree Nuts', critical: true  },
    { id: 'Milk',        iconName: 'ph:cow',                             labelTH: 'นม',               labelEN: 'Milk',      critical: false },
    { id: 'Eggs',        iconName: 'ic:outline-egg',                     labelTH: 'ไข่',              labelEN: 'Eggs',      critical: false },
    { id: 'Gluten',      iconName: 'lucide:wheat',                       labelTH: 'กลูเตน/แป้งสาลี', labelEN: 'Gluten',    critical: false },
    { id: 'Crustaceans', iconName: 'streamline:shrimp',                  labelTH: 'กุ้ง/ปู',          labelEN: 'Shellfish', critical: false },
    { id: 'Fish',        iconName: 'tabler:fish',                        labelTH: 'ปลา',              labelEN: 'Fish',      critical: false },
    { id: 'Soybeans',    iconName: 'lucide:bean',                        labelTH: 'ถั่วเหลือง',      labelEN: 'Soy',       critical: false },
];

export default function Quiz() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [scores, setScores] = useState({ health: 0, planet: 0 });
    const [healthConditions, setHealthConditions] = useState([]);
    const [allergens, setAllergens] = useState([]);

    const currentLang = getCurrentLang();
    const t = translations[currentLang];

    useEffect(() => {
        if (!storage.getItem('lang')) storage.setItem('lang', 'TH');
    }, []);

    const handleAnswer = (type) => {
        setScores((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
        setStep((prev) => prev + 1);
    };

    const toggleHealthCondition = (condition) => {
        setHealthConditions((prev) =>
            prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition]
        );
    };

    const toggleAllergen = (id) => {
        setAllergens((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
    };

    const handleBack = () => { if (step > 0) setStep((prev) => prev - 1); };

    const finishQuiz = () => {
        let finalPersona = 'Balanced Eco-Lover';
        if (scores.planet > scores.health) finalPersona = 'Green Consumers';
        else if (scores.health > scores.planet) finalPersona = 'Naturalites';

        const healthProfile = {
            diabetes: healthConditions.includes('diabetes'),
            kidney_disease: healthConditions.includes('kidney'),
            high_pressure: healthConditions.includes('hypertension'),
            allergies: allergens,
        };
        storage.setItem('temp_persona', finalPersona);
        storage.setItem('temp_health_profile', JSON.stringify(healthProfile));
        storage.removeItem('username');
        navigate('/login');
    };

    const OptionButton = ({ icon, textStr, type }) => (
        <Pressable onPress={() => handleAnswer(type)} style={styles.optionBtn}>
            <View style={styles.optionIconBox}><Icon icon={icon} width={28} color="#1B5E37" /></View>
            <Text style={styles.optionText}>{textStr}</Text>
            <View style={{ marginLeft: 'auto', opacity: 0.3 }}>
                <Icon icon="lucide:chevron-right" width={24} color="#1B5E37" />
            </View>
        </Pressable>
    );

    const HealthOption = ({ id, icon, label }) => {
        const isActive = healthConditions.includes(id);
        return (
            <Pressable
                onPress={() => toggleHealthCondition(id)}
                style={[styles.healthOption, { backgroundColor: isActive ? '#F4FDC6' : 'white', borderColor: isActive ? '#D5EE7A' : 'transparent' }]}
            >
                <Icon icon={icon} width={28} color={isActive ? '#1B5E37' : '#9E9E9E'} />
                <Text style={[styles.healthLabel, { color: isActive ? '#1B5E37' : '#555', fontWeight: isActive ? '800' : '600' }]}>{label}</Text>
                {isActive && <Icon icon="lucide:check-circle" color="#1B5E37" width={26} />}
            </Pressable>
        );
    };

    const ProgressBar = ({ current }) => (
        <View style={styles.progressRow}>
            {[1, 2, 3, 4, 5].map((numv) => (
                <View key={numv} style={[styles.progressSeg, { backgroundColor: numv <= current ? '#D5EE7A' : '#E0E0E0' }]} />
            ))}
        </View>
    );

    const AllergenCard = ({ a }) => {
        const isActive = allergens.includes(a.id);
        const activeBg = isActive ? (a.critical ? '#FFEBEE' : '#F4FDC6') : 'white';
        const activeBorder = isActive ? (a.critical ? '#D32F2F' : '#D5EE7A') : 'transparent';
        const iconBg = isActive ? (a.critical ? '#FFE5E5' : '#EDF6E1') : '#FAFAFA';
        const iconColor = isActive ? (a.critical ? '#C62828' : '#2D8048') : '#BDBDBD';
        return (
            <Pressable onPress={() => toggleAllergen(a.id)} style={[styles.allergenCard, { backgroundColor: activeBg, borderColor: activeBorder }]}>
                <View style={[styles.allergenIconBox, { backgroundColor: iconBg, borderWidth: isActive ? 0 : 1 }]}>
                    <Icon icon={a.iconName} width={30} color={iconColor} />
                </View>
                <Text style={[styles.allergenLabel, { color: isActive ? (a.critical ? '#B71C1C' : '#1B5E37') : '#555', fontWeight: isActive ? '900' : '700' }]}>
                    {currentLang === 'TH' ? a.labelTH : a.labelEN}
                </Text>
                {a.critical && (
                    <View style={styles.criticalBadge}><Text style={styles.criticalBadgeText}>!</Text></View>
                )}
                {isActive && (
                    <View style={[styles.allergenCheck, { backgroundColor: a.critical ? '#D32F2F' : '#1B5E37' }]}>
                        <Icon icon="mdi:check-bold" width={12} color={a.critical ? 'white' : '#D5EE7A'} />
                    </View>
                )}
            </Pressable>
        );
    };

    const BackButton = () => (
        <View style={{ flexDirection: 'row', marginBottom: 22 }}>
            <Pressable onPress={handleBack} style={styles.backBtn}>
                <Icon icon="lucide:chevron-left" width={26} color="#1B5E37" />
            </Pressable>
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient colors={theme.gradients.limeWhite} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.inner}>
                    {step === 0 && (
                        <View style={styles.welcomeWrap}>
                            <View style={{ alignItems: 'center', marginBottom: 50 }}>
                                <Image source={logo1} style={{ width: 150, height: 150, resizeMode: 'contain' }} />
                                <Image source={logo2} style={{ width: 220, height: 70, resizeMode: 'contain', marginTop: 20 }} />
                            </View>
                            <Text style={styles.welcomeSub}>{t.qTitle1}{'\n'}{t.qTitle2}</Text>
                            <Pressable onPress={() => setStep(1)} style={styles.ctaPill}>
                                <Text style={styles.ctaPillText}>{t.qBtn}</Text>
                            </Pressable>
                        </View>
                    )}

                    {step >= 1 && step <= 3 && (
                        <View style={{ flex: 1 }}>
                            <BackButton />
                            <ProgressBar current={step} />
                            <Text style={styles.qTitle}>{step === 1 ? t.q1 : step === 2 ? t.q2 : t.q3}</Text>
                            <View>
                                {step === 1 && (<>
                                    <OptionButton icon="mdi:heart-pulse" textStr={t.q1a1} type="health" />
                                    <OptionButton icon="mdi:earth" textStr={t.q1a2} type="planet" />
                                    <OptionButton icon="mdi:trending-up" textStr={t.q1a3} type="neutral" />
                                </>)}
                                {step === 2 && (<>
                                    <OptionButton icon="mdi:recycle" textStr={t.q2a1} type="planet" />
                                    <OptionButton icon="mdi:fruit-cherries" textStr={t.q2a2} type="health" />
                                    <OptionButton icon="mdi:trash-can-outline" textStr={t.q2a3} type="neutral" />
                                </>)}
                                {step === 3 && (<>
                                    <OptionButton icon="mdi:shield-check" textStr={t.q3a1} type="health" />
                                    <OptionButton icon="mdi:hand-coin" textStr={t.q3a2} type="planet" />
                                    <OptionButton icon="mdi:tag-outline" textStr={t.q3a3} type="neutral" />
                                </>)}
                            </View>
                        </View>
                    )}

                    {step === 4 && (
                        <View style={{ flex: 1 }}>
                            <BackButton />
                            <ProgressBar current={step} />
                            <Text style={[styles.qTitle, { fontSize: 26 }]}>
                                {currentLang === 'TH' ? 'มีโรคประจำตัวที่ควรระวังไหม?' : 'Any chronic conditions to watch?'}
                            </Text>
                            <Text style={styles.qSub}>
                                {currentLang === 'TH'
                                    ? 'เลือกได้หลายอย่าง — ระบบจะใช้คำนวณคำแนะนำในการสแกนสินค้า (แพ้อาหารถามต่อในขั้นถัดไป)'
                                    : 'Select all that apply — we use this to personalize your scans (food allergies on next step)'}
                            </Text>
                            <View style={{ marginBottom: 24 }}>
                                <HealthOption id="diabetes" icon="healthicons:diabetes-24px" label={currentLang === 'TH' ? 'โรคเบาหวาน' : 'Diabetes'} />
                                <HealthOption id="kidney" icon="healthicons:kidneys-24px" label={currentLang === 'TH' ? 'โรคไต' : 'Kidney disease'} />
                                <HealthOption id="hypertension" icon="mage:heart-health" label={currentLang === 'TH' ? 'โรคความดันโลหิตสูง' : 'Hypertension'} />
                            </View>
                            <Pressable onPress={() => setStep(5)} style={styles.continueBtn}>
                                <Text style={styles.continueText}>
                                    {currentLang === 'TH'
                                        ? (healthConditions.length > 0 ? `ต่อไป — เลือก ${healthConditions.length} โรค` : 'ไม่มีโรค — ดำเนินการต่อ')
                                        : 'Continue'}
                                </Text>
                                <Icon icon="lucide:arrow-right" width={20} color="#1B5E37" />
                            </Pressable>
                        </View>
                    )}

                    {step === 5 && (
                        <View style={{ flex: 1 }}>
                            <BackButton />
                            <ProgressBar current={5} />
                            <Text style={[styles.qTitle, { fontSize: 26 }]}>
                                {currentLang === 'TH' ? '🚨 คุณแพ้อาหารอะไรบ้าง?' : '🚨 Any food allergies?'}
                            </Text>
                            <Text style={styles.qSub}>
                                {currentLang === 'TH'
                                    ? 'เลือกได้หลายอย่าง — ระบบจะเตือนทันทีเมื่อเจอในสินค้าที่คุณสแกน'
                                    : "Select multiple — we'll alert you when scanning products containing them"}
                            </Text>
                            <View style={styles.disclaimer}>
                                <Icon icon="mdi:alert-circle-outline" width={18} color="#E65100" />
                                <Text style={styles.disclaimerText}>
                                    {currentLang === 'TH'
                                        ? 'ระบบนี้ไม่ได้แม่นยำ 100% — อาจมีสารผสมแฝง กรุณาอ่านฉลากด้วยตนเองทุกครั้ง'
                                        : 'System is NOT 100% accurate — always read the label yourself'}
                                </Text>
                            </View>
                            <View style={styles.allergenGrid}>
                                {ALLERGEN_QUICK_LIST.map((a) => <AllergenCard key={a.id} a={a} />)}
                            </View>
                            <Text style={styles.hintCenter}>
                                {currentLang === 'TH' ? 'แก้ไขเพิ่มได้ที่ Profile → โปรไฟล์การแพ้อาหาร' : 'You can edit later in Profile → Allergy Profile'}
                            </Text>
                            <Pressable onPress={finishQuiz} style={styles.continueBtn}>
                                <Icon icon="mdi:shield-check" width={22} color="#1B5E37" />
                                <Text style={styles.continueText}>
                                    {currentLang === 'TH'
                                        ? (allergens.length > 0 ? `เปิดโล่ป้องกัน (${allergens.length})` : 'ไม่มีอาการแพ้ — ดำเนินการต่อ')
                                        : (allergens.length > 0 ? `Enable Shield (${allergens.length})` : 'No allergies — continue')}
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    scroll: { flexGrow: 1, justifyContent: 'center' },
    inner: { width: '100%', maxWidth: 500, alignSelf: 'center', paddingHorizontal: 30, paddingVertical: 60 },
    welcomeWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 560 },
    welcomeSub: { color: '#558B2F', textAlign: 'center', marginBottom: 60, fontSize: 18, lineHeight: 28, fontWeight: '600' },
    ctaPill: { paddingVertical: 22, paddingHorizontal: 70, backgroundColor: '#D5EE7A', borderRadius: 50, shadowColor: '#B4DC00', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 15 }, elevation: 6 },
    ctaPillText: { color: '#1B5E37', fontSize: 18, fontWeight: '800' },
    backBtn: { backgroundColor: 'white', borderRadius: 16, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
    progressRow: { width: '100%', flexDirection: 'row', gap: 8, marginBottom: 40, paddingHorizontal: 5 },
    progressSeg: { height: 8, flex: 1, borderRadius: 10 },
    qTitle: { fontSize: 30, fontWeight: '800', color: '#1B5E37', lineHeight: 38, marginBottom: 18 },
    qSub: { fontSize: 14, color: '#777', fontWeight: '500', lineHeight: 21, marginBottom: 22 },
    optionBtn: { width: '100%', padding: 20, marginBottom: 16, backgroundColor: 'white', borderWidth: 2, borderColor: 'transparent', borderRadius: 28, flexDirection: 'row', alignItems: 'center', gap: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 30, shadowOffset: { width: 0, height: 10 }, elevation: 2 },
    optionIconBox: { backgroundColor: '#F4FDC6', borderRadius: 20, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
    optionText: { fontSize: 16, fontWeight: '700', color: '#1B5E37', flexShrink: 1 },
    healthOption: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 20, borderRadius: 28, marginBottom: 14, borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
    healthLabel: { flex: 1, fontSize: 15 },
    continueBtn: { width: '100%', padding: 20, backgroundColor: '#D5EE7A', borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#B4DC00', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 5 },
    continueText: { color: '#1B5E37', fontSize: 16, fontWeight: '800' },
    disclaimer: { backgroundColor: '#FFF8E1', borderWidth: 1.5, borderColor: '#FFCC80', borderRadius: 12, padding: 11, marginBottom: 20, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    disclaimerText: { fontSize: 11, color: '#5D4037', fontWeight: '600', lineHeight: 17, flexShrink: 1 },
    allergenGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 20 },
    allergenCard: { width: '48%', borderWidth: 2, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', gap: 8, position: 'relative', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
    allergenIconBox: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderColor: '#F0F0F0' },
    allergenLabel: { fontSize: 12, textAlign: 'center', lineHeight: 15 },
    criticalBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#D32F2F', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
    criticalBadgeText: { fontSize: 8, color: 'white', fontWeight: '900' },
    allergenCheck: { position: 'absolute', bottom: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' },
    hintCenter: { fontSize: 11, color: '#888', textAlign: 'center', marginBottom: 14, fontWeight: '600' },
});
