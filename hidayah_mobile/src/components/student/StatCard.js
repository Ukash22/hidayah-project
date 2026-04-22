import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HidayahCard from '../common/HidayahCard';

export default function StatCard({ label, value, icon, color = '#10B981' }) {
    return (
        <HidayahCard style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                <Text style={[styles.icon, { color }]}>{icon}</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
            </View>
        </HidayahCard>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
        padding: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    icon: {
        fontSize: 18,
    },
    content: {
        flex: 1,
    },
    label: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    value: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
});
