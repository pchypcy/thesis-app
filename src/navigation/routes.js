// navigation/routes.js — แผนที่ path(web) ↔ screen name(RN)
// ใช้โดย shim useNavigate / useLocation เพื่อให้โค้ดเดิมที่เรียก navigate('/home')
// ทำงานต่อได้โดยไม่ต้องแก้ทุกบรรทัด

export const PATH_TO_SCREEN = {
    '/': 'Quiz',
    '/login': 'Login',
    '/home': 'Home',
    '/scan': 'Scan',
    '/history': 'History',
    '/result': 'Result',
    '/profile': 'Profile',
    '/rewards': 'Rewards',
    '/dashboard': 'Dashboard',
    '/add-product': 'AddProduct',
    '/shop-detail': 'ShopDetail',
    '/sugar-tracker': 'SugarTracker',
    '/allergy-profile': 'AllergyProfile',
    '/notifications': 'NotificationSettings',
    '/inbox': 'NotificationInbox',
    '/support': 'Support',
    '/confirm-orders': 'ConfirmOrders',
    '/settings': 'Settings',
    '/scan-receipt': 'ScanReceipt',
    '/community': 'Community',
    '/forgot-password': 'ForgotPassword',
    '/change-password': 'ChangePassword',
    '/connections': 'Connections',
};

export const SCREEN_TO_PATH = Object.fromEntries(
    Object.entries(PATH_TO_SCREEN).map(([p, s]) => [s, p])
);

// แปลง path (อาจมี dynamic segment เช่น /verify/:barcode) → { screen, params }
export function resolvePath(to) {
    if (typeof to !== 'string') return { screen: 'Home', params: undefined };
    if (to.startsWith('/verify/')) {
        return { screen: 'PublicAudit', params: { barcode: decodeURIComponent(to.slice('/verify/'.length)) } };
    }
    const clean = to.split('?')[0];
    return { screen: PATH_TO_SCREEN[clean] || 'Home', params: undefined };
}
