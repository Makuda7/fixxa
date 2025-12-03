import React, { useState, useEffect } from 'react';
import { workerAPI } from '../services/api';
import './QuoteModal.css';

const QuoteModal = ({ booking, onClose, onSuccess }) => {
  const [lineItems, setLineItems] = useState([
    { description: '', amount: '' }
  ]);
  const [paymentMethods, setPaymentMethods] = useState(['cash']);
  const [bankingDetails, setBankingDetails] = useState({
    bank: '',
    account_number: '',
    account_type: '',
    branch_code: ''
  });
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState('7');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Show banking details section if EFT is selected
  const showBankingDetails = paymentMethods.includes('eft');

  // Calculate total
  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', amount: '' }]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index, field, value) => {
    const newLineItems = [...lineItems];
    newLineItems[index][field] = value;
    setLineItems(newLineItems);
  };

  const togglePaymentMethod = (method) => {
    if (paymentMethods.includes(method)) {
      // Don't allow removing all payment methods
      if (paymentMethods.length > 1) {
        setPaymentMethods(paymentMethods.filter(m => m !== method));
      }
    } else {
      setPaymentMethods([...paymentMethods, method]);
    }
  };

  const handleSubmit = async () => {
    setError('');

    // Validate line items
    const validItems = lineItems.filter(item =>
      item.description.trim() && parseFloat(item.amount) > 0
    );

    if (validItems.length === 0) {
      setError('Please add at least one line item with a description and amount');
      return;
    }

    // Validate payment methods
    if (paymentMethods.length === 0) {
      setError('Please select at least one payment method');
      return;
    }

    // Validate banking details if EFT selected
    if (paymentMethods.includes('eft')) {
      if (!bankingDetails.bank || !bankingDetails.account_number ||
          !bankingDetails.account_type || !bankingDetails.branch_code) {
        setError('Please fill in all banking details for EFT payments');
        return;
      }
    }

    const quoteData = {
      booking_id: booking.id || booking.booking_id,
      line_items: validItems.map(item => ({
        description: item.description,
        amount: parseFloat(item.amount)
      })),
      payment_methods: paymentMethods,
      banking_details: paymentMethods.includes('eft') ? bankingDetails : null,
      notes: notes.trim() || null,
      valid_days: parseInt(validDays)
    };

    try {
      setSubmitting(true);
      const response = await workerAPI.sendQuote(quoteData);

      if (response.data.success) {
        alert('✅ Quote sent successfully!');
        onSuccess();
        onClose();
      } else {
        setError(response.data.error || 'Failed to send quote');
      }
    } catch (err) {
      console.error('Error sending quote:', err);
      setError(err.response?.data?.error || 'Failed to send quote');
    } finally {
      setSubmitting(false);
    }
  };

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="quote-modal-overlay" onClick={onClose}>
      <div className="quote-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="quote-modal-header">
          <h3>💰 Send Quote</h3>
          <button className="quote-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="quote-modal-body">
          <p className="quote-client-name">
            Create a detailed quote for <strong>{booking.client_name}</strong>
          </p>

          {/* Professional Guidelines */}
          <div className="quote-guidelines">
            <p className="guidelines-title">📋 Professional Guidelines for Quotes</p>
            <p className="guidelines-text">
              <strong>Keep receipts for all materials purchased:</strong> Always save receipts
              for items bought for clients and include them as separate line items in your quotes.
              This builds trust, provides transparency, and protects you if there are any payment
              disputes. List materials separately from labor costs.
            </p>
          </div>

          {/* Line Items */}
          <div className="quote-section">
            <h4>Line Items</h4>
            {lineItems.map((item, index) => (
              <div key={index} className="line-item">
                <input
                  type="text"
                  placeholder="Description (e.g., Labor, Materials)"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  className="line-item-description"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={item.amount}
                  onChange={(e) => updateLineItem(index, 'amount', e.target.value)}
                  className="line-item-amount"
                  min="0"
                  step="0.01"
                />
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="remove-line-item"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addLineItem} className="add-line-item-btn">
              + Add Item
            </button>
          </div>

          {/* Totals */}
          <div className="quote-totals">
            <div className="total-row">
              <span><strong>Subtotal:</strong></span>
              <span>R {calculateTotal().toFixed(2)}</span>
            </div>
            <div className="total-row grand-total">
              <span>Total:</span>
              <span>R {calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="quote-section">
            <label className="section-label">Payment Methods Accepted:</label>
            <div className="payment-methods">
              <label className="payment-method-option">
                <input
                  type="checkbox"
                  checked={paymentMethods.includes('cash')}
                  onChange={() => togglePaymentMethod('cash')}
                />
                <span>Cash</span>
              </label>
              <label className="payment-method-option">
                <input
                  type="checkbox"
                  checked={paymentMethods.includes('eft')}
                  onChange={() => togglePaymentMethod('eft')}
                />
                <span>EFT</span>
              </label>
              <label className="payment-method-option">
                <input
                  type="checkbox"
                  checked={paymentMethods.includes('card')}
                  onChange={() => togglePaymentMethod('card')}
                />
                <span>Card</span>
              </label>
            </div>
          </div>

          {/* Banking Details (shown if EFT selected) */}
          {showBankingDetails && (
            <div className="quote-section banking-details-section">
              <h4>Banking Details for EFT</h4>
              <input
                type="text"
                placeholder="Bank Name"
                value={bankingDetails.bank}
                onChange={(e) => setBankingDetails({...bankingDetails, bank: e.target.value})}
                className="banking-input"
              />
              <input
                type="text"
                placeholder="Account Number"
                value={bankingDetails.account_number}
                onChange={(e) => setBankingDetails({...bankingDetails, account_number: e.target.value})}
                className="banking-input"
              />
              <select
                value={bankingDetails.account_type}
                onChange={(e) => setBankingDetails({...bankingDetails, account_type: e.target.value})}
                className="banking-input"
              >
                <option value="">Select Account Type</option>
                <option value="Cheque">Cheque</option>
                <option value="Savings">Savings</option>
              </select>
              <input
                type="text"
                placeholder="Branch Code"
                value={bankingDetails.branch_code}
                onChange={(e) => setBankingDetails({...bankingDetails, branch_code: e.target.value})}
                className="banking-input"
              />
            </div>
          )}

          {/* Notes */}
          <div className="quote-section">
            <label className="section-label">Additional Notes (Optional):</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Materials to be purchased by client, Payment due on completion"
              rows="3"
              className="quote-notes"
            />
          </div>

          {/* Valid Days */}
          <div className="quote-section">
            <label className="section-label">Quote Valid For:</label>
            <select
              value={validDays}
              onChange={(e) => setValidDays(e.target.value)}
              className="quote-valid-days"
            >
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="quote-error">
              ❌ {error}
            </div>
          )}
        </div>

        <div className="quote-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn-cancel"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn-submit"
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Send Quote'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteModal;
