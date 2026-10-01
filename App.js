import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, UIManager } from 'react-native';

// เปิด LayoutAnimation บน Android → กาง/ยุบ/เปลี่ยน layout ลื่นทั้งแอป
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
    useFonts,
    IBMPlexSansThai_400Regular,
    IBMPlexSansThai_500Medium,
    IBMPlexSansThai_600SemiBold,
    IBMPlexSansThai_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-thai';

import { navigationRef } from './src/navigation/navRef';
import { hydrateStorage } from './src/utils/storage';
import { getCurrentLang, onLangChange } from './src/utils/language';
import { ToastHost } from './src/components/Toast';

// ── ported screens (React Native native) ──
import Quiz from './src/screens/Quiz';
import Login from './src/screens/Login';
import Home from './src/screens/Home';
import Scan from './src/screens/Scan';
import Result from './src/screens/Result';
import Dashboard from './src/screens/Dashboard';
import History from './src/screens/History';
import Rewards from './src/screens/Rewards';
import Profile from './src/screens/Profile';
import Settings from './src/screens/Settings';
import Support from './src/screens/Support';
import NotificationInbox from './src/screens/NotificationInbox';
import ChangePassword from './src/screens/ChangePassword';
import ForgotPassword from './src/screens/ForgotPassword';
import ShopDetail from './src/screens/ShopDetail';
import NotificationSettings from './src/screens/NotificationSettings';
import AddProduct from './src/screens/AddProduct';
import Community from './src/screens/Community';
import ConfirmOrders from './src/screens/ConfirmOrders';
import PublicAudit from './src/screens/PublicAudit';
import SugarTracker from './src/screens/SugarTracker';
import AllergyProfile from './src/screens/AllergyProfile';
import ScanReceipt from './src/screens/ScanReceipt';
import Connections from './src/screens/Connections';

const Stack = createNativeStackNavigator();

export default function App() {
    const [fontsLoaded] = useFonts({
        IBMPlexSansThai_400Regular,
        IBMPlexSansThai_500Medium,
        IBMPlexSansThai_600SemiBold,
        IBMPlexSansThai_700Bold,
    });
    const [storageReady, setStorageReady] = useState(false);
    const [lang, setLang] = useState('TH');
    // เก็บ state การนำทางล่าสุด เพื่อ restore หลัง remount ตอนเปลี่ยนภาษา
    // (กันไม่ให้เด้งกลับหน้า Quiz — อยู่หน้าเดิม แค่เปลี่ยนภาษา)
    const navStateRef = useRef(undefined);

    useEffect(() => {
        (async () => {
            await hydrateStorage();
            setLang(getCurrentLang());
            setStorageReady(true);
        })();
        const off = onLangChange(setLang);
        return off;
    }, []);

    if (!fontsLoaded || !storageReady) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#2D8048" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            {/* key={lang} → remount เมื่อเปลี่ยนภาษา (ให้ทุกจอ re-render คำใหม่)
                initialState → restore หน้าเดิม จึงไม่เด้งกลับ Quiz */}
            <NavigationContainer
                ref={navigationRef}
                key={lang}
                initialState={navStateRef.current}
                onStateChange={(state) => { navStateRef.current = state; }}
                documentTitle={{ formatter: () => 'InGreen' }}  // ชื่อแท็บเบราว์เซอร์เป็น InGreen ทุกหน้า (เว็บ)
            >
                <Stack.Navigator
                    initialRouteName="Quiz"
                    screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
                >
                    <Stack.Screen name="Quiz" component={Quiz} />
                    <Stack.Screen name="Login" component={Login} />
                    <Stack.Screen name="Home" component={Home} />
                    <Stack.Screen name="Scan" component={Scan} />
                    <Stack.Screen name="Result" component={Result} />
                    <Stack.Screen name="Dashboard" component={Dashboard} />
                    <Stack.Screen name="History" component={History} />
                    <Stack.Screen name="Rewards" component={Rewards} />
                    <Stack.Screen name="Profile" component={Profile} />
                    <Stack.Screen name="Settings" component={Settings} />
                    <Stack.Screen name="Support" component={Support} />
                    <Stack.Screen name="NotificationInbox" component={NotificationInbox} />
                    <Stack.Screen name="ChangePassword" component={ChangePassword} />
                    <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
                    <Stack.Screen name="ShopDetail" component={ShopDetail} />
                    <Stack.Screen name="NotificationSettings" component={NotificationSettings} />
                    <Stack.Screen name="AddProduct" component={AddProduct} />
                    <Stack.Screen name="Community" component={Community} />
                    <Stack.Screen name="ConfirmOrders" component={ConfirmOrders} />
                    <Stack.Screen name="PublicAudit" component={PublicAudit} />
                    <Stack.Screen name="SugarTracker" component={SugarTracker} />
                    <Stack.Screen name="AllergyProfile" component={AllergyProfile} />
                    <Stack.Screen name="ScanReceipt" component={ScanReceipt} />
                    <Stack.Screen name="Connections" component={Connections} />
                </Stack.Navigator>
            </NavigationContainer>
            <StatusBar style="dark" />
            <ToastHost />
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4FDC6' },
});
