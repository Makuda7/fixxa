import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

const JobCompletionScreen = ({ navigation, route }) => {
  const { booking } = route.params || {};
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMarkComplete = async () => {
    if (!booking?.id) {
      Alert.alert('Error', 'Booking information not found');
      return;
    }

    Alert.alert(
      'Mark Job Complete',
      'Are you sure you want to mark this job as completed? This will notify the client.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);

            try {
              const response = await api.post(`/bookings/${booking.id}/complete`, {
                notes: notes.trim() || 'Job completed successfully'
              });

              if (response.data.success) {
                Alert.alert(
                  'Success!',
                  'Job marked as completed. The client has been notified.',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack(),
                    },
                  ]
                );
              } else {
                Alert.alert('Error', response.data.error || 'Failed to mark job complete');
              }
            } catch (err) {
              console.error('Complete job error:', err);
              Alert.alert('Error', err.response?.data?.error || 'Failed to mark job complete');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Booking information not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>✅</Text>
          <Text style={styles.title}>Complete Job</Text>
        </View>

        {/* Job Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Client:</Text>
            <Text style={styles.value}>{booking.user_name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Service:</Text>
            <Text style={styles.value}>{booking.service_type || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{booking.service_address || 'N/A'}</Text>
          </View>
          {booking.quoted_price && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Quoted Price:</Text>
              <Text style={styles.priceValue}>R{booking.quoted_price}</Text>
            </View>
          )}
        </View>

        {/* Completion Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.cardTitle}>Completion Notes (Optional)</Text>
          <Text style={styles.notesHint}>
            Add any final notes about the job completion, hours worked, materials used, etc.
          </Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Enter completion notes..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            The client will be notified and asked to confirm completion. Once confirmed, the job will be marked as completed.
          </Text>
        </View>

        {/* Complete Button */}
        <TouchableOpacity
          style={[styles.completeButton, loading && styles.buttonDisabled]}
          onPress={handleMarkComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.completeButtonText}>Mark Job Complete</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  icon: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'forestgreen',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  priceValue: {
    fontSize: 16,
    color: 'forestgreen',
    fontWeight: 'bold',
  },
  notesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notesHint: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
    lineHeight: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#dcdde1',
    borderRadius: 10,
    padding: 15,
    fontSize: 15,
    backgroundColor: '#f8f9fa',
    minHeight: 100,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#0d47a1',
    lineHeight: 20,
  },
  completeButton: {
    backgroundColor: 'forestgreen',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: 'forestgreen',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default JobCompletionScreen;
