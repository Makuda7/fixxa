import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SocketProvider } from './src/contexts/SocketContext';
import { ActivityIndicator, View, Text, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/auth/ResetPasswordScreen';
import VerificationPendingScreen from './src/screens/auth/VerificationPendingScreen';
import ResendVerificationScreen from './src/screens/auth/ResendVerificationScreen';
import ClientDashboard from './src/screens/client/ClientDashboard';
import FindProfessionalScreen from './src/screens/client/FindProfessionalScreen';
import WorkerDetailsScreen from './src/screens/client/WorkerDetailsScreen';
import BookingsScreen from './src/screens/client/BookingsScreen';
import BookingDetailScreen from './src/screens/client/BookingDetailScreen';
import CreateBookingScreen from './src/screens/client/CreateBookingScreen';
import CompletionApprovalsScreen from './src/screens/client/CompletionApprovalsScreen';
import EditReviewScreen from './src/screens/client/EditReviewScreen';
import QuotesScreen from './src/screens/client/QuotesScreen';
import AcceptQuoteScreen from './src/screens/client/AcceptQuoteScreen';
import WorkerDashboard from './src/screens/worker/WorkerDashboard';
import MyJobsScreen from './src/screens/worker/MyJobsScreen';
import JobRequestsScreen from './src/screens/worker/JobRequestsScreen';
import JobCompletionScreen from './src/screens/worker/JobCompletionScreen';
import WorkerProfileCompletionScreen from './src/screens/worker/WorkerProfileCompletionScreen';
import ScheduleScreen from './src/screens/worker/ScheduleScreen';
import PortfolioScreen from './src/screens/worker/PortfolioScreen';
import EarningsScreen from './src/screens/worker/EarningsScreen';
import CreateQuoteScreen from './src/screens/worker/CreateQuoteScreen';
import WorkerQuotesScreen from './src/screens/worker/WorkerQuotesScreen';
import ReviewsScreen from './src/screens/shared/ReviewsScreen';
import CreateReviewScreen from './src/screens/shared/CreateReviewScreen';
import ProfileScreen from './src/screens/shared/ProfileScreen';
import EditProfileScreen from './src/screens/shared/EditProfileScreen';
import MessagesScreen from './src/screens/shared/MessagesScreen';
import ChatScreen from './src/screens/shared/ChatScreen';
import NotificationsScreen from './src/screens/shared/NotificationsScreen';
import SettingsScreen from './src/screens/shared/SettingsScreen';
import SupportScreen from './src/screens/shared/SupportScreen';
import ServicesScreen from './src/screens/shared/ServicesScreen';
import AboutScreen from './src/screens/info/AboutScreen';
import ContactScreen from './src/screens/info/ContactScreen';
import FAQScreen from './src/screens/info/FAQScreen';
import TermsScreen from './src/screens/info/TermsScreen';
import PrivacyScreen from './src/screens/info/PrivacyScreen';
import SafetyScreen from './src/screens/info/SafetyScreen';
import JoinProScreen from './src/screens/info/JoinProScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for Client users
function ClientTabs() {
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
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>🏠</Text>,
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Find"
        component={FindProfessionalScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>🔍</Text>,
          tabBarLabel: 'Find',
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

// Bottom Tab Navigator for Worker users
function WorkerTabs() {
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
        component={WorkerDashboard}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>🏠</Text>,
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="JobRequests"
        component={JobRequestsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>📨</Text>,
          tabBarLabel: 'Requests',
        }}
      />
      <Tab.Screen
        name="MyJobs"
        component={MyJobsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>💼</Text>,
          tabBarLabel: 'My Jobs',
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Text style={{ fontSize: size }}>💬</Text>,
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

  // Debug logging - MUST be before early return to follow Rules of Hooks
  useEffect(() => {
    if (user) {
      console.log('=== USER DATA DEBUG ===');
      console.log('Full user object:', JSON.stringify(user, null, 2));
      console.log('User type:', user.type);
      console.log('User type check:', (user.type === 'worker' || user.type === 'professional') ? 'WORKER' : 'CLIENT');
      console.log('======================');
    }
  }, [user]);

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
            // Authenticated screens - route based on user type
            <>
              {/* Conditional tabs based on user type */}
              <Stack.Screen
                name="MainTabs"
                component={(user.type === 'worker' || user.type === 'professional') ? WorkerTabs : ClientTabs}
              />

              {/* Client-specific screens */}
              {(user.type !== 'worker' && user.type !== 'professional') && (
                <>
                  <Stack.Screen name="WorkerDetails" component={WorkerDetailsScreen} />
                  <Stack.Screen name="CreateBooking" component={CreateBookingScreen} />
                  <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
                  <Stack.Screen name="CompletionApprovals" component={CompletionApprovalsScreen} />
                  <Stack.Screen name="EditReview" component={EditReviewScreen} />
                  <Stack.Screen name="Quotes" component={QuotesScreen} />
                  <Stack.Screen name="AcceptQuote" component={AcceptQuoteScreen} />
                </>
              )}

              {/* Worker-specific screens */}
              {(user.type === 'worker' || user.type === 'professional') && (
                <>
                  <Stack.Screen name="Schedule" component={ScheduleScreen} />
                  <Stack.Screen name="Portfolio" component={PortfolioScreen} />
                  <Stack.Screen name="Earnings" component={EarningsScreen} />
                  <Stack.Screen name="JobCompletion" component={JobCompletionScreen} />
                  <Stack.Screen name="WorkerProfileCompletion" component={WorkerProfileCompletionScreen} />
                  <Stack.Screen name="CreateQuote" component={CreateQuoteScreen} />
                  <Stack.Screen name="WorkerQuotes" component={WorkerQuotesScreen} />
                </>
              )}

              {/* Shared screens */}
              <Stack.Screen
                name="ChatScreen"
                component={ChatScreen}
                options={{
                  headerShown: true,
                  headerBackTitle: 'Back',
                }}
              />
              <Stack.Screen name="CreateReview" component={CreateReviewScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="Reviews" component={ReviewsScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Support" component={SupportScreen} />
              <Stack.Screen name="Services" component={ServicesScreen} />
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
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
              <Stack.Screen name="VerificationPending" component={VerificationPendingScreen} />
              <Stack.Screen name="ResendVerification" component={ResendVerificationScreen} />
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
        <SocketProvider>
          <AppNavigator />
        </SocketProvider>
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
