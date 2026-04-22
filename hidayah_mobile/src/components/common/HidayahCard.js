import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function HidayahCard({ children, style = {}, elevated = false }) {
    return (
        <View style={[
            styles.card, 
            elevated && styles.elevated,
            style
        ]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#1E293B',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#334155',
    },
    elevated: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
});
