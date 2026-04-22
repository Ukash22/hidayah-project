import React from 'react';
import { 
    TouchableOpacity, 
    Text, 
    StyleSheet, 
    ActivityIndicator, 
    Animated, 
    View 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function HidayahButton({ 
    title, 
    onPress, 
    variant = 'primary', 
    loading = false, 
    disabled = false,
    style = {},
    textStyle = {},
    icon = null
}) {
    const isPrimary = variant === 'primary';
    const isSecondary = variant === 'secondary';
    const isDanger = variant === 'danger';
    const isWarning = variant === 'warning';

    const getColors = () => {
        if (isPrimary) return ['#10B981', '#059669'];
        if (isWarning) return ['#F59E0B', '#D97706'];
        return ['#1E293B', '#1E293B']; // Default or Secondary
    };

    const getContent = () => (
        <View style={styles.content}>
            {loading ? (
                <ActivityIndicator color="#fff" size="small" />
            ) : (
                <>
                    {icon && <View style={styles.iconContainer}>{icon}</View>}
                    <Text style={[
                        styles.text, 
                        isSecondary && styles.secondaryText,
                        isDanger && styles.dangerText,
                        textStyle
                    ]}>
                        {title}
                    </Text>
                </>
            )}
        </View>
    );

    const buttonBody = (
        <View style={[
            styles.button, 
            isSecondary && styles.secondaryButton,
            isDanger && styles.dangerButton,
            (disabled || loading) && styles.disabled,
            style
        ]}>
            {getContent()}
        </View>
    );

    return (
        <TouchableOpacity 
            onPress={onPress} 
            disabled={disabled || loading}
            activeOpacity={0.85}
        >
            {(isPrimary || isWarning) ? (
                <LinearGradient
                    colors={getColors()}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.gradient, (disabled || loading) && styles.disabled, style]}
                >
                    {getContent()}
                </LinearGradient>
            ) : buttonBody}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    gradient: {
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButton: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
    },
    dangerButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    secondaryText: {
        color: '#94a3b8',
    },
    dangerText: {
        color: '#ef4444',
    },
    iconContainer: {
        marginRight: 8,
    },
    disabled: {
        opacity: 0.5,
    },
});
