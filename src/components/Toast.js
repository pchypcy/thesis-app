// components/Toast.js — แทน react-hot-toast (imperative API + host)
//   toast('ข้อความ') / toast.success / toast.error / toast.loading(id) / toast.dismiss(id)
//   วาง <ToastHost/> ไว้บนสุดของ App ครั้งเดียว

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';

let counter = 0;
const subs = new Set();
const emit = (action) => subs.forEach((fn) => fn(action));

export const toast = (message, opts = {}) => {
    const id = ++counter;
    emit({
        type: 'add',
        item: {
            id,
            message: message == null ? '' : String(message),
            kind: opts.kind || 'default',
            duration: opts.duration ?? 2500,
        },
    });
    return id;
};
toast.success = (m, o = {}) => toast(m, { ...o, kind: 'success' });
toast.error = (m, o = {}) => toast(m, { ...o, kind: 'error' });
toast.loading = (m, o = {}) => toast(m, { ...o, kind: 'loading', duration: o.duration ?? 60000 });
toast.dismiss = (id) => emit({ type: 'remove', id });

const KIND = {
    default: { bg: '#1B5E37', icon: 'information', color: '#fff' },
    success: { bg: '#2D8048', icon: 'check-circle', color: '#fff' },
    error: { bg: '#D14545', icon: 'alert-circle', color: '#fff' },
    loading: { bg: '#1B5E37', icon: 'loading', color: '#fff' },
};

export function ToastHost() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        const fn = (action) => {
            if (action.type === 'add') {
                setItems((prev) => [...prev, action.item]);
                if (action.item.duration < 60000) {
                    setTimeout(
                        () => setItems((prev) => prev.filter((t) => t.id !== action.item.id)),
                        action.item.duration
                    );
                }
            } else if (action.type === 'remove') {
                if (action.id == null) setItems([]);
                else setItems((prev) => prev.filter((t) => t.id !== action.id));
            }
        };
        subs.add(fn);
        return () => subs.delete(fn);
    }, []);

    if (items.length === 0) return null;

    return (
        <View pointerEvents="none" style={styles.host}>
            {items.map((it) => {
                const k = KIND[it.kind] || KIND.default;
                return (
                    <View key={it.id} style={[styles.pill, { backgroundColor: k.bg }]}>
                        <Icon icon={`mdi:${k.icon}`} width={18} color={k.color} />
                        <Text style={[styles.text, { color: k.color }]}>{it.message}</Text>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    host: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        gap: 8,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 24,
        maxWidth: '90%',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    text: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
});

export default toast;
