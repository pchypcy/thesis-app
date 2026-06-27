// navigation/navRef.js — global navigation ref
// ใช้สำหรับ navigate จากนอก component (เช่น axios 401 interceptor)
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
    if (navigationRef.isReady()) navigationRef.navigate(name, params);
}

export function getCurrentRouteName() {
    return navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null;
}
