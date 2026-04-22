import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HidayahInput from '../common/HidayahInput';

export default function ProfileStep({ formData, setFormData }) {
    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Student profile</Text>
            
            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 12 }}>
                    <HidayahInput
                        label="First Name"
                        placeholder="John"
                        value={formData.firstName}
                        onChangeText={(val) => handleChange('firstName', val)}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <HidayahInput
                        label="Last Name"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChangeText={(val) => handleChange('lastName', val)}
                    />
                </View>
            </View>

            <HidayahInput
                label="Birth Date (YYYY-MM-DD)"
                placeholder="2000-01-01"
                value={formData.dob}
                onChangeText={(val) => handleChange('dob', val)}
            />

            <HidayahInput
                label="Phone Number"
                placeholder="+234..."
                value={formData.phone}
                onChangeText={(val) => handleChange('phone', val)}
                keyboardType="phone-pad"
            />

            <HidayahInput
                label="Full Address"
                placeholder="Street, City, State"
                value={formData.address}
                onChangeText={(val) => handleChange('address', val)}
                multiline
                style={{ height: 100, textAlignVertical: 'top' }}
            />
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
    row: {
        flexDirection: 'row',
    },
});
