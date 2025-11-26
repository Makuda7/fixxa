import React, { useState } from 'react';
import './QuoteForm.css';

const QuoteForm = ({ onSubmit, onCancel, bookingId, clientName }) => {
  const [formData, setFormData] = useState({
    clientName: clientName || '',
    description: '',
    validUntil: '',
    notes: '',
  });

  const [items, setItems] = useState([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Calculate totals
  const calculateItemTotal = (item) => {
    return (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateVAT = () => {
    return calculateSubtotal() * 0.15; // 15% VAT
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVAT();
  };

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.clientName.trim()) {
      setError('Client name is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Quote description is required');
      return;
    }

    if (!formData.validUntil) {
      setError('Valid until date is required');
      return;
    }

    // Check if at least one item has description and price
    const validItems = items.filter(
      (item) => item.description.trim() && parseFloat(item.unitPrice) > 0
    );

    if (validItems.length === 0) {
      setError('At least one quote item is required');
      return;
    }

    setSubmitting(true);

    try {
      const quoteData = {
        ...formData,
        bookingId,
        items: validItems,
        subtotal: calculateSubtotal(),
        vat: calculateVAT(),
        total: calculateTotal(),
      };

      await onSubmit(quoteData);
    } catch (err) {
      setError(err.message || 'Failed to create quote');
      setSubmitting(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="quote-form-container">
      <div className="quote-form-header">
        <h2>Create Quote</h2>
        <p className="form-subtitle">Provide a detailed quote for your service</p>
      </div>

      {error && (
        <div className="form-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="quote-form">
        {/* Client Information */}
        <section className="form-section">
          <h3 className="section-title">Client Information</h3>

          <div className="form-group">
            <label htmlFor="clientName">
              Client Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="clientName"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              placeholder="Enter client name"
              required
              disabled={!!clientName}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">
              Quote Description <span className="required">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Brief description of the work to be performed"
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="validUntil">
              Valid Until <span className="required">*</span>
            </label>
            <input
              type="date"
              id="validUntil"
              name="validUntil"
              value={formData.validUntil}
              onChange={handleInputChange}
              min={today}
              required
            />
            <p className="field-hint">Quote expiration date</p>
          </div>
        </section>

        {/* Line Items */}
        <section className="form-section">
          <div className="section-header">
            <h3 className="section-title">Items & Services</h3>
            <button
              type="button"
              onClick={addItem}
              className="btn-add-item"
              disabled={submitting}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Item
            </button>
          </div>

          <div className="items-list">
            {items.map((item, index) => (
              <div key={index} className="item-row">
                <div className="item-number">{index + 1}</div>

                <div className="item-fields">
                  <div className="form-group item-description">
                    <label htmlFor={`item-desc-${index}`}>
                      Description <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id={`item-desc-${index}`}
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Item or service description"
                      required
                    />
                  </div>

                  <div className="form-group item-quantity">
                    <label htmlFor={`item-qty-${index}`}>Quantity</label>
                    <input
                      type="number"
                      id={`item-qty-${index}`}
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      min="1"
                      step="1"
                      required
                    />
                  </div>

                  <div className="form-group item-price">
                    <label htmlFor={`item-price-${index}`}>
                      Unit Price (R) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      id={`item-price-${index}`}
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="item-total">
                    <label>Total</label>
                    <div className="total-amount">
                      R {calculateItemTotal(item).toFixed(2)}
                    </div>
                  </div>
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="btn-remove-item"
                    title="Remove item"
                    disabled={submitting}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Quote Summary */}
        <section className="form-section quote-summary">
          <h3 className="section-title">Quote Summary</h3>

          <div className="summary-rows">
            <div className="summary-row">
              <span className="summary-label">Subtotal:</span>
              <span className="summary-value">R {calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">VAT (15%):</span>
              <span className="summary-value">R {calculateVAT().toFixed(2)}</span>
            </div>
            <div className="summary-row summary-total">
              <span className="summary-label">Total:</span>
              <span className="summary-value">R {calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Additional Notes (Optional)</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Terms, conditions, or any additional information"
              rows="3"
            />
          </div>
        </section>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn-cancel"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={submitting}
          >
            {submitting ? 'Creating Quote...' : 'Create Quote'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuoteForm;
