import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import api from '../../services/api';

const CreateQuoteScreen = ({ route, navigation }) => {
  const { requestId, clientName } = route.params;

  const [lineItems, setLineItems] = useState([
    { description: '', amount: '' }
  ]);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState('7');
  const [loading, setLoading] = useState(false);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', amount: '' }]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      const newItems = lineItems.filter((_, i) => i !== index);
      setLineItems(newItems);
    }
  };

  const updateLineItem = (index, field, value) => {
    const newItems = [...lineItems];
    newItems[index][field] = value;
    setLineItems(newItems);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const validateForm = () => {
    // Check if all line items have description and amount
    const hasEmptyFields = lineItems.some(
      item => !item.description.trim() || !item.amount.trim()
    );

    if (hasEmptyFields) {
      Alert.alert('Validation Error', 'Please fill in all line items');
      return false;
    }

    // Check if amounts are valid numbers
    const hasInvalidAmount = lineItems.some(
      item => isNaN(parseFloat(item.amount)) || parseFloat(item.amount) <= 0
    );

    if (hasInvalidAmount) {
      Alert.alert('Validation Error', 'Please enter valid amounts');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Format line items for API
      const formattedLineItems = lineItems.map(item => ({
        description: item.description.trim(),
        amount: parseFloat(item.amount)
      }));

      const response = await api.post(`/quotes/requests/${requestId}/respond`, {
        line_items: formattedLineItems,
        payment_methods: ['cash', 'eft'], // Default payment methods
        notes: notes.trim() || undefined,
        valid_days: parseInt(validDays) || 7
      });

      if (response.data.success) {
        Alert.alert(
          'Quote Sent!',
          `Your quote for R${calculateTotal().toFixed(2)} has been sent to ${clientName}.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Failed to create quote:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to send quote. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Quote</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.clientInfo}>
          <Text style={styles.label}>Quote for:</Text>
          <Text style={styles.clientName}>{clientName}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>

          {lineItems.map((item, index) => (
            <View key={index} style={styles.lineItemCard}>
              <View style={styles.lineItemHeader}>
                <Text style={styles.lineItemNumber}>Item {index + 1}</Text>
                {lineItems.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeLineItem(index)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Description (e.g., Labor, Materials)"
                value={item.description}
                onChangeText={(text) => updateLineItem(index, 'description', text)}
                multiline
              />

              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>R</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  value={item.amount}
                  onChangeText={(text) => updateLineItem(index, 'amount', text)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addItemButton} onPress={addLineItem}>
            <Text style={styles.addItemButtonText}>+ Add Another Item</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Any additional information for the client..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quote Validity</Text>
          <View style={styles.validityContainer}>
            <Text style={styles.validityLabel}>Valid for:</Text>
            <TextInput
              style={styles.validityInput}
              value={validDays}
              onChangeText={setValidDays}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.validityLabel}>days</Text>
          </View>
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalAmount}>R{calculateTotal().toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Send Quote</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray,
  },
  cancelButton: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    ...FONTS.medium,
  },
  headerTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.dark,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  clientInfo: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  label: {
    fontSize: SIZES.sm,
    color: COLORS.gray,
    ...FONTS.medium,
    marginBottom: 4,
  },
  clientName: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.dark,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.dark,
    marginBottom: 12,
  },
  lineItemCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lineItemNumber: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.primary,
  },
  removeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeButtonText: {
    fontSize: SIZES.sm,
    color: COLORS.error,
    ...FONTS.medium,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.md,
    color: COLORS.dark,
    marginBottom: 12,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
    color: COLORS.dark,
  },
  addItemButton: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addItemButtonText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.primary,
  },
  validityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
  },
  validityLabel: {
    fontSize: SIZES.md,
    color: COLORS.dark,
    ...FONTS.medium,
  },
  validityInput: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.primary,
    marginHorizontal: 12,
    minWidth: 50,
    textAlign: 'center',
  },
  totalContainer: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.white,
  },
  totalAmount: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.white,
  },
});

export default CreateQuoteScreen;
