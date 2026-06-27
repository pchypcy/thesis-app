// shims/router.js — react-router-dom → react-navigation
// ทำให้โค้ดหน้าเดิมที่ใช้ useNavigate('/path') / useLocation().state / useParams()
// ทำงานต่อได้บน RN โดยแทบไม่ต้องแก้ logic
//
//   navigate('/home')                  → navigation.navigate('Home')
//   navigate('/result', { state })     → navigation.navigate('Result', state)
//   navigate(-1)                       → navigation.goBack()
//   useLocation().state                → route.params
//   useParams()                        → route.params

import { useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { resolvePath, SCREEN_TO_PATH } from '../navigation/routes';

export function useNavigate() {
    const navigation = useNavigation();
    // memoize ให้ identity คงที่ (navigation จาก react-navigation เป็น ref คงที่)
    // กัน useEffect ที่มี dep [navigate] ยิงซ้ำทุก render
    return useCallback((to, options) => {
        if (to === -1 || to === '-1') { navigation.goBack(); return; }
        const { screen, params } = resolvePath(to);
        navigation.navigate(screen, options?.state ?? params);
    }, [navigation]);
}

export function useLocation() {
    const route = useRoute();
    return {
        state: route.params ?? null,
        pathname: SCREEN_TO_PATH[route.name] ?? '/',
        key: route.key,
    };
}

export function useParams() {
    const route = useRoute();
    return route.params ?? {};
}
