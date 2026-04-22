import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import HidayahCard from '../common/HidayahCard';

const levels = [
    { label: 'Primary School', value: 'PRIMARY' },
    { label: 'Secondary School', value: 'SECONDARY' },
    { label: 'Junior WAEC (BECE)', value: 'JUNIOR_WAEC' },
    { label: 'JAMB Prep', value: 'JAMB' },
    { label: 'WAEC Prep', value: 'WAEC' },
    { label: 'NECO Prep', value: 'NECO' },
];

const classTypes = [
    { label: 'One-on-One', value: 'ONE_ON_ONE' },
    { label: 'Group Batch', value: 'GROUP' },
];

export default function PreferencesStep({ formData, setFormData }) {
    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Educational roadmap</Text>
            
            <Text style={styles.label}>Learning Level</Text>
            <View style={styles.chipContainer}>
                {levels.map((lvl) => (
                    <TouchableOpacity
                        key={lvl.value}
                        style={[
                            styles.chip,
                            formData.level === lvl.value && styles.chipSelected
                        ]}
                        onPress={() => handleChange('level', lvl.value)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.chipText,
                            formData.level === lvl.value && styles.chipTextSelected
                        ]}>
                            {lvl.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Class Structure</Text>
            <View style={styles.chipContainer}>
                {classTypes.map((type) => (
                    <TouchableOpacity
                        key={type.value}
                        style={[
                            styles.chip,
                            formData.classType === type.value && styles.chipSelected
                        ]}
                        onPress={() => handleChange('classType', type.value)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.chipText,
                            formData.classType === type.value && styles.chipTextSelected
                        ]}>
                            {type.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <HidayahCard style={styles.infoBox}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>ℹ️</Text>
                    <Text style={styles.infoText}>
                        Note: Schedule and preferred start date can be managed later in your dashboard for more precision.
                    </Text>
                </View>
            </HidayahCard>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 24,
        textTransform: 'capitalize',
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginLeft: 4,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 32,
        gap: 10,
    },
    chip: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    chipSelected: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    chipText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
    },
    chipTextSelected: {
        color: '#0a0c10',
    },
    infoBox: {
        padding: 16,
        marginTop: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoIcon: {
        fontSize: 16,
        marginRight: 10,
    },
    infoText: {
        flex: 1,
        color: '#94a3b8',
        fontSize: 12,
        lineHeight: 18,
    },
});
