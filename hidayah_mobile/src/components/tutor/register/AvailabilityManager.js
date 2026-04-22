import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import HidayahCard from '../../common/HidayahCard';
import HidayahButton from '../../common/HidayahButton';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AvailabilityManager({ formData, setFormData }) {
    const addSlot = () => {
        setFormData(prev => ({
            ...prev,
            availabilitySlots: [...prev.availabilitySlots, { day: 'Monday', startTime: '08:00', endTime: '12:00' }]
        }));
    };

    const removeSlot = (index) => {
        setFormData(prev => ({
            ...prev,
            availabilitySlots: prev.availabilitySlots.filter((_, i) => i !== index)
        }));
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.sectionTitle}>Teaching availability</Text>
                <HidayahButton 
                    title="+ Add Slot" 
                    onPress={addSlot} 
                    variant="primary" 
                    style={styles.addBtn}
                    textStyle={{ fontSize: 10 }}
                />
            </View>

            {formData.availabilitySlots.map((slot, index) => (
                <HidayahCard key={index} style={styles.slotCard}>
                    <View style={styles.slotHeader}>
                        <View style={styles.slotBadge}>
                            <Text style={styles.slotBadgeText}>SLOT {index + 1}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeSlot(index)}>
                            <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.field}>
                            <Text style={styles.miniLabel}>Assigned Day</Text>
                            <View style={styles.selector}>
                                <Text style={styles.selectorText}>{slot.day}</Text>
                                <Text style={styles.chevron}>▾</Text>
                            </View>
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.miniLabel}>Time Range</Text>
                            <View style={styles.selector}>
                                <Text style={styles.selectorText}>{slot.startTime} - {slot.endTime}</Text>
                                <Text style={styles.chevron}>▾</Text>
                            </View>
                        </View>
                    </View>
                </HidayahCard>
            ))}

            <HidayahCard style={styles.earningsInfo}>
                <Text style={styles.earningsTitle}>Estimated monthly earnings</Text>
                <Text style={styles.earningsValue}>₦ --,---</Text>
                <View style={styles.rateRow}>
                    <Text style={styles.rateDot}>•</Text>
                    <Text style={styles.earningsDetail}>
                        Calculated at ₦{formData.hourlyRate}/hour
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textTransform: 'capitalize',
    },
    addBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    slotCard: {
        padding: 16,
        marginBottom: 16,
        backgroundColor: 'rgba(15, 23, 42, 0.3)',
    },
    slotHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    slotBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    slotBadgeText: {
        color: '#94a3b8',
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    removeText: {
        color: '#ef4444',
        fontSize: 11,
        fontWeight: 'bold',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    field: {
        flex: 1,
    },
    miniLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 4,
    },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    selectorText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    chevron: {
        color: '#64748b',
        fontSize: 12,
    },
    earningsInfo: {
        marginTop: 16,
        padding: 24,
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.03)',
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    earningsTitle: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    earningsValue: {
        color: '#10B981',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    rateRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rateDot: {
        color: '#10B981',
        marginRight: 6,
        fontSize: 18,
    },
    earningsDetail: {
        color: '#94a3b8',
        fontSize: 11,
    },
});
