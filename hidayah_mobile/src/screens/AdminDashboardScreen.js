import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

// Hidayah Design System
import HidayahButton from '../components/common/HidayahButton';
import HidayahCard from '../components/common/HidayahCard';

export default function AdminDashboardScreen() {
    const { user, logout } = useAuth();

    return (
        <LinearGradient
            colors={['#0a0c10', '#1E293B']}
            style={styles.container}
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Command Center,</Text>
                    <Text style={styles.userName}>{user?.first_name || user?.username || 'Admin'}</Text>
                </View>
                <HidayahButton
                    variant="danger"
                    title="Logout"
                    onPress={logout}
                    style={styles.logoutBtn}
                    textStyle={{ fontSize: 10 }}
                />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.statsRow}>
                    <AdminStat label="Total Students" value="128" icon="👨‍🎓" />
                    <AdminStat label="Active Tutors" value="45" icon="👨‍🏫" />
                </View>
                
                <View style={[styles.statsRow, { marginTop: 12 }]}>
                    <AdminStat label="Pending Apps" value="12" icon="📝" color="#F59E0B" />
                    <AdminStat label="Today's Classes" value="34" icon="📚" color="#10B981" />
                </View>

                <Text style={styles.sectionTitle}>Administrative tools</Text>
                
                <HidayahCard style={styles.toolCard}>
                    <View style={styles.toolInfo}>
                        <Text style={styles.toolIcon}>👥</Text>
                        <View>
                            <Text style={styles.toolTitle}>User Management</Text>
                            <Text style={styles.toolSubtitle}>Manage students, tutors and parents</Text>
                        </View>
                    </View>
                </HidayahCard>

                <HidayahCard style={styles.toolCard}>
                    <View style={styles.toolInfo}>
                        <Text style={styles.toolIcon}>💳</Text>
                        <View>
                            <Text style={styles.toolTitle}>Payments & Wallets</Text>
                            <Text style={styles.toolSubtitle}>Verify transactions and fund wallets</Text>
                        </View>
                    </View>
                </HidayahCard>

                <HidayahCard style={styles.toolCard}>
                    <View style={styles.toolInfo}>
                        <Text style={styles.toolIcon}>📅</Text>
                        <View>
                            <Text style={styles.toolTitle}>Class Scheduling</Text>
                            <Text style={styles.toolSubtitle}>Audit and manage session timings</Text>
                        </View>
                    </View>
                </HidayahCard>
            </ScrollView>
        </LinearGradient>
    );
}

const AdminStat = ({ label, value, icon, color = '#3B82F6' }) => (
    <HidayahCard style={styles.statCard}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </HidayahCard>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    greeting: {
        color: '#94a3b8',
        fontSize: 14,
    },
    userName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    logoutBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    scrollContent: {
        padding: 24,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
    },
    statIcon: {
        fontSize: 20,
        marginBottom: 8,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statLabel: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 32,
        marginBottom: 20,
        textTransform: 'capitalize',
    },
    toolCard: {
        marginBottom: 12,
        padding: 16,
        backgroundColor: 'rgba(15, 23, 42, 0.3)',
    },
    toolInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toolIcon: {
        fontSize: 24,
        marginRight: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 10,
        borderRadius: 12,
    },
    toolTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    toolSubtitle: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 2,
    },
});
