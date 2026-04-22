import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EarningsCard({ financials }) {
    return (
        <View style={styles.container}>
            <View style={styles.mainCard}>
                <Text style={styles.title}>Your Net Earnings</Text>
                <Text style={styles.amount}>₦{parseFloat(financials?.net_earnings || 0).toLocaleString()}</Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>Verified Share</Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Gross</Text>
                    <Text style={styles.statValue}>₦{parseFloat(financials?.gross_earnings || 0).toLocaleString()}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Commission</Text>
                    <Text style={[styles.statValue, { color: '#ef4444' }]}>
                        -₦{parseFloat(financials?.total_commission || 0).toLocaleString()}
                    </Text>
                </View>
                <View style={[styles.statBox, { borderRightWidth: 0 }]}>
                    <Text style={styles.statLabel}>Classes</Text>
                    <Text style={styles.statValue}>{financials?.completed_classes || 0}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    mainCard: {
        backgroundColor: '#1E293B',
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        color: '#94a3b8',
        fontSize: 10,
        fontWeight: 'black',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    amount: {
        color: '#10B981',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    badge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    badgeText: {
        color: '#10B981',
        fontSize: 9,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: '#0f172a',
        marginTop: -16,
        marginHorizontal: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#1E293B',
        justifyContent: 'space-between',
        zIndex: -1,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#1E293B',
    },
    statLabel: {
        color: '#64748b',
        fontSize: 8,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValue: {
        color: '#f1f5f9',
        fontSize: 12,
        fontWeight: 'bold',
    },
});
