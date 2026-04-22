import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import HidayahInput from '../common/HidayahInput';

export default function AccountStep({ formData, setFormData }) {
    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Account access</Text>
            
            <HidayahInput
                label="Universal Username"
                placeholder="Student ID or Name"
                value={formData.username}
                onChangeText={(val) => handleChange('username', val)}
                autoCapitalize="none"
            />

            <HidayahInput
                label="Institutional Email"
                placeholder="you@email.com"
                value={formData.email}
                onChangeText={(val) => handleChange('email', val)}
                keyboardType="email-address"
                autoCapitalize="none"
            />

            <HidayahInput
                label="Password"
                placeholder="••••••••"
                value={formData.password}
                onChangeText={(val) => handleChange('password', val)}
                secureTextEntry
            />

            <HidayahInput
                label="Confirm Password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChangeText={(val) => handleChange('confirmPassword', val)}
                secureTextEntry
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
});
