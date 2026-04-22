import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function HidayahInput({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    secureTextEntry, 
    keyboardType = 'default',
    error = null,
    style = {},
    ...props
}) {
    return (
        <View style={[styles.container, style]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[
                    styles.input, 
                    error && styles.inputError,
                    props.multiline && styles.multiline
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#64748b"
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize="none"
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        width: '100%',
    },
    label: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#1E293B',
        color: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
        fontSize: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    inputError: {
        borderColor: '#ef4444',
    },
    multiline: {
        height: 120,
        textAlignVertical: 'top',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 11,
        marginTop: 6,
        marginLeft: 4,
        fontWeight: 'bold',
    },
});
