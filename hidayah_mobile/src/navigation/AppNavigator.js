import React from 'react';
import { ActivityIndicator, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TutorRegisterScreen from '../screens/TutorRegisterScreen';
import StudentDashboardScreen from '../screens/StudentDashboardScreen';
import TutorDashboardScreen from '../screens/TutorDashboardScreen';
import ParentDashboardScreen from '../screens/ParentDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
    const { user, token, loading, isImpersonating, exitImpersonation } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0a0c10', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    const getDashboardComponent = () => {
        if (!user) return null;
        switch (user.role) {
            case 'STUDENT': return StudentDashboardScreen;
            case 'TUTOR': return TutorDashboardScreen;
            case 'PARENT': return ParentDashboardScreen;
            case 'ADMIN': return AdminDashboardScreen;
            default: return StudentDashboardScreen;
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {token ? (
                        <Stack.Screen 
                            name="Dashboard" 
                            component={getDashboardComponent()} 
                        />
                    ) : (
                        <>
                            <Stack.Screen name="Login" component={LoginScreen} />
                            <Stack.Screen name="Register" component={RegisterScreen} />
                            <Stack.Screen name="TutorRegister" component={TutorRegisterScreen} />
                        </>
                    )}
                </Stack.Navigator>
            </NavigationContainer>

            {/* Impersonation Return Overlay */}
            {isImpersonating && (
                <TouchableOpacity 
                    style={styles.floatingReturnBtn} 
                    onPress={exitImpersonation}
                    activeOpacity={0.8}
                >
                    <Text style={styles.returnText}>🏠 Return to Parent Portal</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    floatingReturnBtn: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: '#F59E0B',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 2,
        borderColor: '#fff',
    },
    returnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
