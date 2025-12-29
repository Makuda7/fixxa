import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';

const CreateReviewScreen = ({ route, navigation }) => {
  const { booking, isCompletionApproval } = route.params || {};

  const [ratings, setRatings] = useState({
    quality: 0,
    punctuality: 0,
    communication: 0,
    value: 0,
  });
  const [reviewText, setReviewText] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Calculate overall rating from detailed ratings
  const overallRating = Math.round(
    (ratings.quality + ratings.punctuality + ratings.communication + ratings.value) / 4
  ) || 0;

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need camera roll permissions to upload photos.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setImages([...images, result.assets[0]]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need camera permissions to take photos.'
      );
      return;
    }

    if (images.length >= 5) {
      Alert.alert('Limit Reached', 'You can upload up to 5 photos.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setImages([...images, result.assets[0]]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      Alert.alert('Rating Required', 'Please rate at least one category.');
      return;
    }

    if (!reviewText.trim()) {
      Alert.alert('Review Required', 'Please write a review.');
      return;
    }

    setUploading(true);

    try {
      // Step 1: Upload photos first if any
      const photoUrls = [];
      if (images.length > 0) {
        for (const image of images) {
          try {
            const photoFormData = new FormData();
            photoFormData.append('photo', {
              uri: image.uri,
              type: 'image/jpeg',
              name: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`,
            });

            const uploadResponse = await api.post('/reviews/upload-photo', photoFormData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });

            if (uploadResponse.data.success && uploadResponse.data.url) {
              photoUrls.push(uploadResponse.data.url);
            }
          } catch (photoError) {
            console.error('Error uploading photo:', photoError);
            // Continue with other photos even if one fails
          }
        }
      }

      // Step 2: If this is a completion approval, approve it first
      // (Review endpoint requires status to be 'Completed')
      if (isCompletionApproval && booking?.id) {
        try {
          await api.post(`/bookings/${booking.id}/approve-completion`);
        } catch (approvalError) {
          console.error('Error approving completion:', approvalError);
          throw new Error('Failed to approve job completion. Please try again.');
        }
      }

      // Step 3: Submit review with photo URLs
      const reviewData = {
        booking_id: booking?.id,
        overall_rating: overallRating,
        quality_rating: ratings.quality || 0,
        punctuality_rating: ratings.punctuality || 0,
        communication_rating: ratings.communication || 0,
        value_rating: ratings.value || 0,
        review_text: reviewText,
        photos: photoUrls,
      };

      console.log('Submitting review with data:', {
        ...reviewData,
        photos: `${photoUrls.length} photos`
      });

      const response = await api.post('/reviews/client', reviewData);

      if (response.data.success) {

        Alert.alert(
          'Success',
          isCompletionApproval
            ? 'Thank you! The job has been marked as completed.'
            : 'Review submitted successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.data.error || 'Failed to submit review.');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to submit review. Please try again.';
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      Alert.alert('Error', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const updateRating = (category, value) => {
    setRatings({ ...ratings, [category]: value });
  };

  const renderCategoryRating = (category, label) => {
    return (
      <View style={styles.categoryContainer}>
        <Text style={styles.categoryLabel}>{label}</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => updateRating(category, star)}
              style={styles.starButton}
            >
              <Text style={styles.categoryStar}>
                {star <= ratings[category] ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingText}>
          {ratings[category] === 0 ? 'Tap to rate' :
           ratings[category] === 1 ? 'Poor' :
           ratings[category] === 2 ? 'Fair' :
           ratings[category] === 3 ? 'Good' :
           ratings[category] === 4 ? 'Very Good' :
           'Excellent'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isCompletionApproval ? 'Confirm Completion' : 'Write a Review'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Booking Info */}
        {booking && (
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingTitle}>
              {booking.service_type || booking.professional_service || 'Service'}
            </Text>
            <Text style={styles.bookingWorker}>
              Professional: {booking.worker_name || booking.professional_name}
            </Text>
          </View>
        )}

        {/* Overall Rating Display */}
        {overallRating > 0 && (
          <View style={styles.overallRatingContainer}>
            <Text style={styles.overallLabel}>Overall Rating</Text>
            <View style={styles.overallStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Text key={star} style={styles.overallStar}>
                  {star <= overallRating ? '★' : '☆'}
                </Text>
              ))}
            </View>
            <Text style={styles.overallScore}>{overallRating}/5</Text>
          </View>
        )}

        {/* Detailed Ratings */}
        <View style={styles.ratingsSection}>
          <Text style={styles.sectionLabel}>Rate Your Experience:</Text>
          {renderCategoryRating('quality', 'Quality of Work')}
          {renderCategoryRating('punctuality', 'Punctuality')}
          {renderCategoryRating('communication', 'Communication')}
          {renderCategoryRating('value', 'Value for Money')}
        </View>

        {/* Review Text */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your Review:</Text>
          <TextInput
            style={styles.textInput}
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="Share your experience..."
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Add Photos (Optional - up to 5):
          </Text>

          {/* Image Preview */}
          {images.length > 0 && (
            <View style={styles.imageGrid}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri: image.uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Upload Buttons */}
          {images.length < 5 && (
            <View style={styles.uploadButtons}>
              <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Text style={styles.uploadIcon}>🖼️</Text>
                <Text style={styles.uploadText}>Choose Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding,
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
  content: {
    flex: 1,
    padding: SIZES.padding,
  },
  bookingInfo: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    borderRadius: 12,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  bookingTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  bookingWorker: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  overallRatingContainer: {
    backgroundColor: '#e8f5e8',
    padding: SIZES.padding * 1.5,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  overallLabel: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.primary,
    marginBottom: 12,
  },
  overallStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  overallStar: {
    fontSize: 36,
    color: '#ffc107',
  },
  overallScore: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.primary,
  },
  ratingsSection: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    borderRadius: 12,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  categoryContainer: {
    backgroundColor: '#f8f9fa',
    padding: SIZES.padding,
    borderRadius: 8,
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  starButton: {
    padding: 4,
  },
  categoryStar: {
    fontSize: 30,
    color: '#ffc107',
  },
  ratingText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding,
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    minHeight: 150,
    ...SHADOWS.small,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.bold,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    ...SHADOWS.small,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
});

export default CreateReviewScreen;
