import React, { useState, useEffect } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SIZES, FONTS } from '../../styles/theme';
import api from '../../services/api';

const CreateQuoteScreen = ({ route, navigation }) => {
  const { requestId, clientName, isJobRequest } = route.params;

  const [lineItems, setLineItems] = useState([
    { description: '', amount: '' }
  ]);
  const [paymentMethods, setPaymentMethods] = useState({ cash: true, eft: false, card: false });
  const [bankingDetails, setBankingDetails] = useState({
    bank: '',
    accountNumber: '',
    accountType: '',
    branchCode: ''
  });
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState('7');
  const [availableDates, setAvailableDates] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', amount: '' }]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      const newItems = lineItems.filter((_, i) => i !== index);
      setLineItems(newItems);
    } else {
      Alert.alert('Minimum Items', 'You must have at least one line item');
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

  const togglePaymentMethod = (method) => {
    setPaymentMethods(prev => ({ ...prev, [method]: !prev[method] }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS !== 'ios') {
        addAvailableDate(selectedDate);
      }
    }
  };

  const addAvailableDate = (date = tempDate) => {
    const dateString = date.toISOString().split('T')[0];

    // Check if date already exists
    if (availableDates.includes(dateString)) {
      Alert.alert('Date Already Added', 'This date is already in your available dates list');
      return;
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);

    if (selected < today) {
      Alert.alert('Invalid Date', 'Please select a date that is today or in the future');
      return;
    }

    setAvailableDates([...availableDates, dateString].sort());
    setShowDatePicker(false);
  };

  const removeAvailableDate = (dateString) => {
    setAvailableDates(availableDates.filter(d => d !== dateString));
  };

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-ZA', options);
  };

  const validateForm = () => {
    // Check if all line items have description and amount
    const validItems = lineItems.filter(item => item.description.trim() && parseFloat(item.amount) > 0);

    if (validItems.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one line item with a description and amount');
      return false;
    }

    // Check if at least one payment method is selected
    if (!paymentMethods.cash && !paymentMethods.eft && !paymentMethods.card) {
      Alert.alert('Validation Error', 'Please select at least one payment method');
      return false;
    }

    // If EFT is selected, validate banking details
    if (paymentMethods.eft) {
      if (!bankingDetails.bank.trim() || !bankingDetails.accountNumber.trim() ||
          !bankingDetails.accountType || !bankingDetails.branchCode.trim()) {
        Alert.alert('Banking Details Required', 'Please fill in all banking details for EFT payments');
        return false;
      }
    }

    // Check if at least one available date is selected
    if (availableDates.length === 0) {
      Alert.alert('Available Dates Required', 'Please select at least one date when you are available to start the job');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Format line items for API (only valid ones)
      const validLineItems = lineItems.filter(item =>
        item.description.trim() && parseFloat(item.amount) > 0
      ).map(item => ({
        description: item.description.trim(),
        amount: parseFloat(item.amount)
      }));

      // Format payment methods
      const selectedPaymentMethods = Object.keys(paymentMethods).filter(method => paymentMethods[method]);

      // Prepare banking details if EFT is selected
      const bankingData = paymentMethods.eft ? {
        bank: bankingDetails.bank.trim(),
        account_number: bankingDetails.accountNumber.trim(),
        account_type: bankingDetails.accountType,
        branch_code: bankingDetails.branchCode.trim()
      } : null;

      // Use different endpoint for job requests vs quote requests
      const endpoint = isJobRequest
        ? `/workers/job-requests/${requestId}/quote`
        : `/quotes/requests/${requestId}/respond`;

      const response = await api.post(endpoint, {
        line_items: validLineItems,
        payment_methods: selectedPaymentMethods,
        banking_details: bankingData,
        notes: notes.trim() || undefined,
        valid_days: parseInt(validDays),
        available_dates: availableDates
      });

      if (response.data.success) {
        Alert.alert(
          'Quote Sent Successfully!',
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
        <Text style={styles.headerTitle}>Send Quote</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.clientInfo}>
          <Text style={styles.label}>Quote for:</Text>
          <Text style={styles.clientName}>{clientName}</Text>
        </View>

        {/* Professional Guidelines */}
        <View style={styles.guidelinesCard}>
          <Text style={styles.guidelinesTitle}>📋 Professional Guidelines for Quotes</Text>
          <Text style={styles.guidelinesText}>
            <Text style={{ fontWeight: '600' }}>Keep receipts for all materials purchased:</Text> Always save receipts for items bought for clients and include them as separate line items in your quotes. This builds trust, provides transparency, and protects you if there are any payment disputes. List materials separately from labor costs.
          </Text>
        </View>

        {/* Line Items */}
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
                    <Text style={styles.removeButtonText}>✕</Text>
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

        {/* Total */}
        <View style={styles.totalContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>R {calculateTotal().toFixed(2)}</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelBold}>Total:</Text>
            <Text style={styles.totalValueBold}>R {calculateTotal().toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods Accepted:</Text>
          <View style={styles.paymentMethodsContainer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => togglePaymentMethod('cash')}
            >
              <View style={[styles.checkbox, paymentMethods.cash && styles.checkboxChecked]}>
                {paymentMethods.cash && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => togglePaymentMethod('eft')}
            >
              <View style={[styles.checkbox, paymentMethods.eft && styles.checkboxChecked]}>
                {paymentMethods.eft && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>EFT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => togglePaymentMethod('card')}
            >
              <View style={[styles.checkbox, paymentMethods.card && styles.checkboxChecked]}>
                {paymentMethods.card && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Card</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Banking Details (conditional) */}
        {paymentMethods.eft && (
          <View style={styles.bankingSection}>
            <Text style={styles.bankingSectionTitle}>Banking Details for EFT</Text>
            <TextInput
              style={styles.input}
              placeholder="Bank Name"
              value={bankingDetails.bank}
              onChangeText={(text) => setBankingDetails(prev => ({ ...prev, bank: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Account Number"
              value={bankingDetails.accountNumber}
              onChangeText={(text) => setBankingDetails(prev => ({ ...prev, accountNumber: text }))}
              keyboardType="numeric"
            />
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => {
                  Alert.alert(
                    'Account Type',
                    'Select account type',
                    [
                      { text: 'Cheque', onPress: () => setBankingDetails(prev => ({ ...prev, accountType: 'Cheque' })) },
                      { text: 'Savings', onPress: () => setBankingDetails(prev => ({ ...prev, accountType: 'Savings' })) },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Text style={[styles.pickerButtonText, !bankingDetails.accountType && styles.placeholderText]}>
                  {bankingDetails.accountType || 'Select Account Type'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Branch Code"
              value={bankingDetails.branchCode}
              onChangeText={(text) => setBankingDetails(prev => ({ ...prev, branchCode: text }))}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Available Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Available Start Dates <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.helperText}>
            Select the dates when you're available to start this job
          </Text>

          <TouchableOpacity
            style={styles.addDateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.addDateButtonText}>+ Add Available Date</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.confirmDateButton}
                  onPress={() => addAvailableDate()}
                >
                  <Text style={styles.confirmDateButtonText}>Confirm Date</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {availableDates.length > 0 && (
            <View style={styles.selectedDatesContainer}>
              <Text style={styles.selectedDatesLabel}>
                Selected Dates ({availableDates.length}):
              </Text>
              {availableDates.map((dateString, index) => (
                <View key={index} style={styles.dateChip}>
                  <Text style={styles.dateChipText}>
                    {formatDateDisplay(dateString)}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeDateButton}
                    onPress={() => removeAvailableDate(dateString)}
                  >
                    <Text style={styles.removeDateButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Additional Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="e.g., Materials to be purchased by client, Payment due on completion"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Quote Validity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quote Valid For:</Text>
          <View style={styles.validityContainer}>
            {['7', '14', '30'].map((days) => (
              <TouchableOpacity
                key={days}
                style={[styles.validityOption, validDays === days && styles.validityOptionSelected]}
                onPress={() => setValidDays(days)}
              >
                <Text style={[styles.validityOptionText, validDays === days && styles.validityOptionTextSelected]}>
                  {days} Days
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
    padding: 16,
  },
  clientInfo: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
  guidelinesCard: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  guidelinesTitle: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: '#2e7d32',
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: SIZES.sm,
    color: '#1b5e20',
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
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
    borderWidth: 1,
    borderColor: COLORS.gray,
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
    backgroundColor: COLORS.error,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  removeButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.md,
    color: COLORS.dark,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray,
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
    borderWidth: 1,
    borderColor: COLORS.gray,
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
  totalContainer: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: SIZES.md,
    color: COLORS.dark,
    ...FONTS.medium,
  },
  totalValue: {
    fontSize: SIZES.md,
    color: COLORS.dark,
    ...FONTS.medium,
  },
  totalDivider: {
    height: 2,
    backgroundColor: COLORS.primary,
    marginVertical: 8,
  },
  totalLabelBold: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.dark,
  },
  totalValueBold: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.primary,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.gray,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.bold,
  },
  checkboxLabel: {
    fontSize: SIZES.md,
    color: COLORS.dark,
    ...FONTS.medium,
  },
  bankingSection: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  bankingSectionTitle: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.dark,
    marginBottom: 12,
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerButton: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  pickerButtonText: {
    fontSize: SIZES.md,
    color: COLORS.dark,
    ...FONTS.medium,
  },
  placeholderText: {
    color: COLORS.gray,
  },
  validityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  validityOption: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.gray,
    alignItems: 'center',
  },
  validityOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  validityOptionText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.dark,
  },
  validityOptionTextSelected: {
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
  required: {
    color: COLORS.error,
  },
  helperText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  addDateButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  addDateButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  confirmDateButton: {
    backgroundColor: COLORS.success,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmDateButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  selectedDatesContainer: {
    marginTop: 12,
  },
  selectedDatesLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  dateChipText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.medium,
    flex: 1,
  },
  removeDateButton: {
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeDateButtonText: {
    color: COLORS.white,
    fontSize: 14,
    ...FONTS.bold,
  },
});

export default CreateQuoteScreen;
