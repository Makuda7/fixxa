import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatDate, formatCurrency } from '../../utils/formatting';

const JobDetailScreen = ({ route, navigation }) => {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await api.get(`/workers/jobs/${jobId}`);
      if (response.data.job) {
        setJob(response.data.job);
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      Alert.alert('Error', 'Failed to load job details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleStartJob = () => {
    Alert.alert(
      'Start Job',
      'Mark this job as currently in progress?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Job',
          onPress: async () => {
            setUpdating(true);
            try {
              const response = await api.post(`/workers/jobs/${jobId}/start`);
              if (response.data.success) {
                Alert.alert('Success', 'Job marked as in progress');
                fetchJobDetails();
              }
            } catch (error) {
              console.error('Error starting job:', error);
              Alert.alert('Error', 'Failed to start job');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleCompleteJob = () => {
    navigation.navigate('JobCompletion', { jobId });
  };

  const handleCancelJob = () => {
    Alert.alert(
      'Cancel Job',
      'Are you sure you want to cancel this job? The client will be notified.',
      [
        { text: 'No, Keep Job', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              const response = await api.post(`/workers/jobs/${jobId}/cancel`);
              if (response.data.success) {
                Alert.alert('Cancelled', 'Job has been cancelled', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              }
            } catch (error) {
              console.error('Error cancelling job:', error);
              Alert.alert('Error', 'Failed to cancel job');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleCallClient = () => {
    // TODO: Implement in-app calling for safety (like Uber)
    Alert.alert(
      'Call Feature',
      'In-app calling will be available soon for your safety and security.',
      [{ text: 'OK' }]
    );
  };

  const handleMessageClient = () => {
    // Navigate to Messages tab instead of direct chat
    navigation.navigate('MainTabs', { screen: 'Messages' });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return COLORS.info;
      case 'in progress':
      case 'in-progress':
        return COLORS.warning;
      case 'completed':
        return COLORS.success;
      case 'cancelled':
      case 'declined':
        return COLORS.error;
      default:
        return COLORS.gray;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Job not found</Text>
      </View>
    );
  }

  const isConfirmed = job.status === 'Confirmed';
  const isInProgress = job.status === 'In Progress';
  const isCompleted = job.status === 'Completed';
  const isCancelled = job.status === 'Cancelled' || job.status === 'Declined';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.statusBannerText}>{job.status}</Text>
        </View>

        {/* Service Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service</Text>
          <Text style={styles.serviceText}>{job.service || job.service_type}</Text>
          {job.booking_amount && (
            <Text style={styles.priceText}>{formatCurrency(job.booking_amount)}</Text>
          )}
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <Text style={styles.infoText}>👤 {job.client_name}</Text>
          {job.client_phone && (
            <Text style={styles.infoText}>📞 {job.client_phone}</Text>
          )}
          {job.client_email && (
            <Text style={styles.infoText}>✉️ {job.client_email}</Text>
          )}
        </View>

        {/* Contact Buttons */}
        {!isCancelled && !isCompleted && (
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleCallClient}>
              <Text style={styles.contactButtonIcon}>📞</Text>
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={handleMessageClient}>
              <Text style={styles.contactButtonIcon}>💬</Text>
              <Text style={styles.contactButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Schedule Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          {job.booking_date && (
            <Text style={styles.infoText}>📅 {formatDate(job.booking_date)}</Text>
          )}
          {job.booking_time && (
            <Text style={styles.infoText}>🕐 {job.booking_time}</Text>
          )}
        </View>

        {/* Location */}
        {(job.service_address || job.client_address || job.location) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.infoText}>
              📍 {job.service_address || job.client_address || job.location}
            </Text>
          </View>
        )}

        {/* Description/Notes */}
        {job.note && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <Text style={styles.descriptionText}>{job.note}</Text>
          </View>
        )}

        {/* Action Buttons */}
        {!isCancelled && !isCompleted && (
          <View style={styles.actionSection}>
            {isConfirmed && (
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={handleStartJob}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Text style={styles.actionButtonIcon}>🚀</Text>
                    <Text style={styles.actionButtonText}>Start Working</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isInProgress && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={handleCompleteJob}
                disabled={updating}
              >
                <Text style={styles.actionButtonIcon}>✓</Text>
                <Text style={styles.actionButtonText}>Mark as Complete</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelJob}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.actionButtonIcon}>✕</Text>
                  <Text style={styles.actionButtonText}>Cancel Job</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: SIZES.lg,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding * 1.5,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: COLORS.white,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    padding: 16,
    alignItems: 'center',
  },
  statusBannerText: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  section: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: SIZES.sm,
    ...FONTS.bold,
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceText: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  priceText: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.primary,
  },
  infoText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    marginBottom: 8,
    lineHeight: 24,
  },
  descriptionText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOWS.small,
  },
  contactButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  contactButtonText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.primary,
  },
  actionSection: {
    padding: SIZES.padding,
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.medium,
  },
  startButton: {
    backgroundColor: COLORS.primary,
  },
  completeButton: {
    backgroundColor: COLORS.success,
  },
  cancelButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 8,
    color: COLORS.white,
  },
  actionButtonText: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.white,
  },
});

export default JobDetailScreen;
