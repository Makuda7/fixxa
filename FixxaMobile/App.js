import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import ClientDashboard from './src/screens/client/ClientDashboard';
import FindProfessionalScreen from './src/screens/client/FindProfessionalScreen';
import BookingsScreen from './src/screens/client/BookingsScreen';
import BookingDetailScreen from './src/screens/client/BookingDetailScreen';
import ReviewsScreen from './src/screens/shared/ReviewsScreen';
import CreateReviewScreen from './src/screens/shared/CreateReviewScreen';
import ProfileScreen from './src/screens/shared/ProfileScreen';
import MessagesScreen from './src/screens/shared/MessagesScreen';
import SettingsScreen from './src/screens/shared/SettingsScreen';
import AboutScreen from './src/screens/info/AboutScreen';
import ContactScreen from './src/screens/info/ContactScreen';
import FAQScreen from './src/screens/info/FAQScreen';
import TermsScreen from './src/screens/info/TermsScreen';
import PrivacyScreen from './src/screens/info/PrivacyScreen';
import SafetyScreen from './src/screens/info/SafetyScreen';
import JoinProScreen from './src/screens/info/JoinProScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for authenticated users
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: 'forestgreen',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          backgroundColor: '#ffffff',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={ClientDashboard}
        options={{
          tabBarIcon: ({ color, size }) => <View style={{ fontSize: size }}>🏠</View>,
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <View style={{ fontSize: size }}>📋</View>,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <View style={{ fontSize: size }}>💬</View>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <View style={{ fontSize: size }}>⚙️</View>,
        }}
      />
    </Tab.Navigator>
  );
}

// Navigation component (needs to be inside AuthProvider)
function AppNavigator() {
  const { user, loading } = useAuth();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load any resources or data here if needed
        await new Promise(resolve => setTimeout(resolve, 1000)); // Minimum splash duration
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && !loading) {
      // Hide the splash screen once the app is ready
      await SplashScreen.hideAsync();
    }
  }, [appIsReady, loading]);

  if (!appIsReady || loading) {
    return null; // Splash screen still visible
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          {user ? (
            // Authenticated screens - now with bottom tabs
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="Find" component={FindProfessionalScreen} />
              <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
              <Stack.Screen name="CreateReview" component={CreateReviewScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Reviews" component={ReviewsScreen} />
              <Stack.Screen name="About" component={AboutScreen} />
              <Stack.Screen name="Contact" component={ContactScreen} />
              <Stack.Screen name="FAQ" component={FAQScreen} />
              <Stack.Screen name="Terms" component={TermsScreen} />
              <Stack.Screen name="Privacy" component={PrivacyScreen} />
              <Stack.Screen name="Safety" component={SafetyScreen} />
              <Stack.Screen name="JoinPro" component={JoinProScreen} />
            </>
          ) : (
            // Auth screens
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
            </>
          )}
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </View>
  );
}

// Main App component
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
});
