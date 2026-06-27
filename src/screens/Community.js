import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, StyleSheet, ActivityIndicator } from "react-native";
import { Pressable } from "../components/Touchable";
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextInput } from '../components/Text';
import { Icon } from '../components/Icon';
import { toast } from '../components/Toast';
import { useNavigate } from '../shims/router';
import { API_BASE_URL } from '../config';
import { storage } from '../utils/storage';
import { getCurrentLang } from '../utils/language';

export default function Community() {
    const navigate = useNavigate();
    const username = storage.getItem('username');
    const isTH = getCurrentLang() === 'TH';
    const H = { 'ngrok-skip-browser-warning': 'true' };

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState(3);
    const [voteCfg, setVoteCfg] = useState({ quorum: 3, approveWeight: 4 });
    const [votingId, setVotingId] = useState(null);
    const [nowTick, setNowTick] = useState(Date.now());
    const [search, setSearch] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/products/pending/list`, { headers: H });
            if (res.data?.success) {
                setItems(res.data.items || []);
                if (res.data.config) { setVoteCfg(res.data.config); setThreshold(res.data.config.quorum || 3); }
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => {
        if (!username) { navigate('/login'); return; }
        load();
        const tick = setInterval(() => setNowTick(Date.now()), 1000);
        return () => clearInterval(tick);
    }, []);

    const fmtWindow = (endsAt) => {
        if (!endsAt) return null;
        const diff = new Date(endsAt).getTime() - nowTick;
        if (diff <= 0) return isTH ? 'หมดเวลา' : 'ended';
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
        if (h >= 24) return `${Math.floor(h / 24)} ${isTH ? 'วัน' : 'd'}`;
        if (h >= 1) return `${h} ${isTH ? 'ชม.' : 'h'}`;
        return `${m} ${isTH ? 'นาที' : 'm'}`;
    };

    const handleVote = async (barcode, vote) => {
        if (votingId) return;
        setVotingId(barcode);
        try {
            const demoIp = storage.getItem('demoVoterIp');
            const voteHeaders = { ...H };
            if (demoIp) voteHeaders['X-Forwarded-For'] = demoIp;
            const res = await axios.post(`${API_BASE_URL}/api/products/vote`, { barcode, username, vote }, { headers: voteHeaders });
            if (res.data?.success) {
                if (res.data.promoted) toast.success(isTH ? `🌱 สินค้าได้รับการอนุมัติแล้ว! (${res.data.upvotes} โหวต)` : `Approved! (${res.data.upvotes} votes)`);
                else if (res.data.verification_status === 'rejected') toast(isTH ? 'สินค้าถูกปฏิเสธ' : 'Rejected', { kind: 'error' });
                else toast.success(isTH ? (vote === 'up' ? 'ขอบคุณที่ช่วยตรวจสอบ!' : 'รับทราบการรายงาน') : 'Thanks for voting');
                load();
            }
        } catch (e) {
            const code = e.response?.data?.errorCode;
            toast.error(code === 'OWN_SUBMISSION' ? (isTH ? 'โหวตสินค้าตัวเองไม่ได้' : 'Cannot vote your own') : code === 'ALREADY_VOTED' ? (isTH ? 'คุณโหวตไปแล้ว' : 'Already voted') : (e.response?.data?.message || 'Error'));
        } finally { setVotingId(null); }
    };

    const q = search.trim().toLowerCase();
    const filtered = q
        ? items.filter((it) => [it.name, it.brand, ...(it.ingredients || [])].join(' ').toLowerCase().includes(q))
        : items;

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#E3F2FD', '#FAFAFA']} locations={[0, 0.7]} style={s.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Pressable onPress={() => navigate('/home')} style={s.backBtn}><Icon icon="lucide:arrow-left" width={22} color="#1B5E37" /></Pressable>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'ชุมชนตรวจสอบ' : 'Community'}</Text>
                        <View style={{ width: 42 }} />
                    </View>
                    <View style={s.infoCard}>
                        <View style={s.infoIcon}><Icon icon="solar:users-group-rounded-bold" width={22} color="#1565C0" /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '900', color: '#1B5E37' }}>{isTH ? 'ช่วยตรวจสอบสินค้าใหม่' : 'Help verify products'}</Text>
                            <Text style={{ fontSize: 11, color: '#888', fontWeight: '600', marginTop: 2 }}>{isTH ? 'โหวตแบบถ่วงน้ำหนักจากชุมชน — สินค้าจะได้รับการรับรองเมื่อความน่าเชื่อถือถึงเกณฑ์' : 'Weighted community voting — products get verified once their trust score reaches the target'}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={{ padding: 22 }}>
                    {!loading && items.length > 0 && (
                        <View style={s.searchBar}>
                            <Icon icon="lucide:search" width={18} color="#9AA0A6" />
                            <TextInput style={s.searchInput} placeholder={isTH ? 'ค้นหาชื่อสินค้า / แบรนด์ / ส่วนผสม' : 'Search name / brand / ingredient'} placeholderTextColor="#9AA0A6" value={search} onChangeText={setSearch} autoCapitalize="none" />
                            {search ? <Pressable onPress={() => setSearch('')} hitSlop={8}><Icon icon="lucide:x" width={16} color="#9AA0A6" /></Pressable> : null}
                        </View>
                    )}
                    {loading ? (
                        <View style={{ paddingVertical: 50, alignItems: 'center' }}><ActivityIndicator size="large" color="#1B5E37" /></View>
                    ) : items.length === 0 ? (
                        <View style={s.empty}>
                            <Icon icon="solar:inbox-bold" width={56} color="#DDD" />
                            <Text style={{ fontSize: 15, fontWeight: '900', color: '#1B5E37', marginTop: 12 }}>{isTH ? 'ไม่มีสินค้ารอตรวจสอบ' : 'No pending products'}</Text>
                            <Text style={{ fontSize: 12, color: '#888', marginTop: 4, fontWeight: '600' }}>{isTH ? 'ทุกสินค้าได้รับการรับรองแล้ว' : 'All products verified'}</Text>
                        </View>
                    ) : filtered.length === 0 ? (
                        <View style={s.empty}>
                            <Icon icon="lucide:search-x" width={48} color="#DDD" />
                            <Text style={{ fontSize: 14, fontWeight: '900', color: '#1B5E37', marginTop: 12 }}>{isTH ? 'ไม่พบสินค้าที่ค้นหา' : 'No matches'}</Text>
                        </View>
                    ) : filtered.map((it) => {
                        const aw = it.approve_weight || voteCfg.approveWeight || 4;
                        const wUp = it.weighted_up ?? it.upvotes ?? 0;
                        const upPct = aw > 0 ? Math.min(100, Math.round((wUp / aw) * 100)) : 0;
                        const voters = it.unique_voters ?? 0;
                        const timeLeft = fmtWindow(it.vote_window_ends_at);
                        const isOwner = it.submitted_by === username;
                        const alreadyVoted = it.voters?.includes(username);
                        const img = it.image_url || it.label_photo;
                        const hasDesc = it.marketing_text && !String(it.marketing_text).includes('รอตรวจสอบ');
                        const tier = it.verification_tier || 1;
                        const tierMeta = tier >= 3 ? { label: isTH ? 'มี อย. + รูปฉลาก' : 'FDA + label photo', color: '#2D8048', bg: '#E8F5E9', icon: 'mdi:shield-check' }
                            : tier === 2 ? { label: isTH ? 'มีหลักฐานบางส่วน' : 'Partial evidence', color: '#E89938', bg: '#FFF8E1', icon: 'mdi:shield-half-full' }
                            : { label: isTH ? 'รอชุมชนตรวจสอบ' : 'Community review', color: '#1565C0', bg: '#E3F2FD', icon: 'mdi:account-group' };
                        return (
                            <View key={it.barcode} style={s.card}>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    {img ? <Image source={{ uri: img }} style={s.thumb} resizeMode="cover" /> : <View style={[s.thumb, s.thumbPh]}><Icon icon="solar:box-bold" width={36} color="#B7D9A6" /></View>}
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                                            <Text numberOfLines={2} style={{ flex: 1, fontSize: 15, fontWeight: '900', color: '#1B2B1E', lineHeight: 20 }}>{it.name}</Text>
                                            {isOwner && <View style={s.yoursTag}><Text style={{ color: '#2D8048', fontSize: 9, fontWeight: '900' }}>{isTH ? 'ของคุณ' : 'Yours'}</Text></View>}
                                        </View>
                                        <Text style={{ fontSize: 12, color: '#777', fontWeight: '700', marginTop: 2 }}>{it.brand || '—'}</Text>
                                        <Text style={{ fontSize: 10, color: '#B0B0B0', marginTop: 2 }}>{isTH ? 'บาร์โค้ด ' : 'Barcode '}{it.barcode}</Text>
                                        <View style={[s.tierBadge, { backgroundColor: tierMeta.bg }]}>
                                            <Icon icon={tierMeta.icon} width={12} color={tierMeta.color} />
                                            <Text style={{ fontSize: 10, fontWeight: '800', color: tierMeta.color }}>{tierMeta.label}</Text>
                                        </View>
                                    </View>
                                </View>

                                {hasDesc ? <Text style={s.desc}>{it.marketing_text}</Text> : null}

                                {it.ingredients?.length > 0 && (
                                    <View style={s.detailBox}>
                                        <Text style={s.detailKey}>{isTH ? 'ส่วนผสมที่ผู้ใช้ระบุ' : 'Ingredients listed'}</Text>
                                        <Text style={s.detailVal}>{it.ingredients.join(', ')}</Text>
                                    </View>
                                )}

                                {(it.sugar_g != null || it.sodium_mg != null || it.energy_kcal != null || it.fda_number) && (
                                    <View style={s.chipRow}>
                                        {it.energy_kcal != null && <View style={s.nutChip}><Text style={s.nutChipText}>{it.energy_kcal} kcal</Text></View>}
                                        {it.sugar_g != null && <View style={s.nutChip}><Text style={s.nutChipText}>{isTH ? 'น้ำตาล ' : 'Sugar '}{it.sugar_g}g</Text></View>}
                                        {it.sodium_mg != null && <View style={s.nutChip}><Text style={s.nutChipText}>{isTH ? 'โซเดียม ' : 'Sodium '}{it.sodium_mg}mg</Text></View>}
                                        {it.fda_number ? <View style={[s.nutChip, { backgroundColor: '#E8F5E9' }]}><Text style={[s.nutChipText, { color: '#2D8048' }]}>{isTH ? 'อย. ' : 'FDA '}{it.fda_number}</Text></View> : null}
                                    </View>
                                )}

                                <Text style={s.byline}>{isTH ? 'เพิ่มโดย ' : 'Added by '}<Text style={{ fontWeight: '800', color: '#555' }}>{it.submitted_by || '—'}</Text></Text>

                                <View style={{ marginTop: 10, marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 11, color: '#888', fontWeight: '700' }}>{isTH ? 'ความน่าเชื่อถือจากชุมชน' : 'Community trust'}</Text>
                                        <Text style={{ fontSize: 11, color: '#1B5E37', fontWeight: '900' }}>{Math.round(upPct)}%</Text>
                                    </View>
                                    <View style={s.progressTrack}><View style={{ width: `${upPct}%`, height: '100%', backgroundColor: upPct >= 100 ? '#2D8048' : '#7CB342', borderRadius: 4 }} /></View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                                        <View style={s.voterChip}>
                                            <Icon icon="mdi:account-group" width={12} color="#1565C0" />
                                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#1565C0' }}>{voters} {isTH ? 'คนร่วมตรวจสอบ' : 'reviewers'}</Text>
                                        </View>
                                        {timeLeft && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Icon icon="lucide:clock" width={12} color="#888" /><Text style={{ fontSize: 10, fontWeight: '800', color: '#888' }}>{isTH ? 'เหลือ ' : ''}{timeLeft}</Text></View>}
                                    </View>
                                </View>

                                {alreadyVoted ? (
                                    <View style={[s.statusBox, { backgroundColor: '#F1F8E9' }]}><Icon icon="lucide:check-circle" width={14} color="#2D8048" /><Text style={{ fontSize: 12, color: '#2D8048', fontWeight: '800' }}>{isTH ? 'คุณโหวตสินค้านี้แล้ว' : 'You voted'}</Text></View>
                                ) : isOwner ? (
                                    <View style={[s.statusBox, { backgroundColor: '#FFF8E1' }]}><Text style={{ fontSize: 12, color: '#E65100', fontWeight: '800' }}>{isTH ? 'ไม่สามารถโหวตสินค้าที่ตนเองเพิ่ม' : "Can't vote your own"}</Text></View>
                                ) : (
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <Pressable onPress={() => handleVote(it.barcode, 'down')} disabled={votingId === it.barcode} style={[s.voteBtn, { flex: 1, backgroundColor: 'white', borderWidth: 1.5, borderColor: '#FFCDD2' }]}>
                                            <Icon icon="lucide:thumbs-down" width={14} color="#D14545" /><Text style={{ color: '#D14545', fontWeight: '900', fontSize: 12 }}>{isTH ? 'ไม่ถูกต้อง' : 'Inaccurate'}</Text>
                                        </Pressable>
                                        <Pressable onPress={() => handleVote(it.barcode, 'up')} disabled={votingId === it.barcode} style={[s.voteBtn, { flex: 2, backgroundColor: '#1B5E37' }]}>
                                            <Icon icon="lucide:thumbs-up" width={14} color="#D5EE7A" /><Text style={{ color: '#D5EE7A', fontWeight: '900', fontSize: 12 }}>{isTH ? 'ยืนยันถูกต้อง' : 'Confirm'}</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    header: { paddingTop: 36, paddingHorizontal: 22, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
    infoCard: { backgroundColor: 'white', borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 25, elevation: 2 },
    infoIcon: { width: 44, height: 44, backgroundColor: '#E3F2FD', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    empty: { backgroundColor: 'white', borderRadius: 24, paddingVertical: 50, alignItems: 'center', borderWidth: 2, borderColor: '#E0E0E0', borderStyle: 'dashed' },
    card: { backgroundColor: 'white', borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 20, elevation: 2 },
    boxIcon: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F1F8E9', alignItems: 'center', justifyContent: 'center' },
    yoursTag: { backgroundColor: '#F4FDC6', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 8 },
    thumb: { width: 86, height: 86, borderRadius: 14, backgroundColor: '#F1F3F2' },
    thumbPh: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F8E9' },
    tierBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, marginTop: 7 },
    desc: { fontSize: 12, color: '#555', fontWeight: '600', lineHeight: 18, marginTop: 12 },
    detailBox: { backgroundColor: '#FAFCFF', borderWidth: 1, borderColor: '#E3F2FD', borderRadius: 10, padding: 10, marginTop: 12 },
    detailKey: { color: '#1565C0', fontWeight: '800', fontSize: 11 },
    detailVal: { fontSize: 11.5, color: '#555', fontWeight: '600', lineHeight: 17, marginTop: 3 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    nutChip: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 9 },
    nutChipText: { fontSize: 10.5, color: '#555', fontWeight: '800' },
    byline: { fontSize: 11, color: '#999', fontWeight: '600', marginTop: 10 },
    voterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16, borderWidth: 1, borderColor: '#ECECEC' },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 13, fontWeight: '600', color: '#333' },
    progressTrack: { height: 6, backgroundColor: '#F5F5F5', borderRadius: 4, overflow: 'hidden' },
    quorumChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
    statusBox: { borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    voteBtn: { paddingVertical: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
});
