# Cash/EFT Payment System Guide

## Overview

Fixxa now supports Cash and EFT (Electronic Funds Transfer) payments for completed jobs. This guide explains how the payment system works, how to use it, and how to track payments.

## How It Works

### Payment Flow

1. **Booking Creation**: Client creates a booking and optionally specifies:
   - Payment method (cash, eft, or online)
   - Booking amount (agreed-upon price)

2. **Job Completion**: Worker marks the job as completed

3. **Payment Processing**:
   - **Cash**: Client pays worker directly in cash
   - **EFT**: Client transfers money to worker's bank account

4. **Payment Confirmation**: Worker marks payment as received in the system

5. **Client Notification**: Client receives email confirmation of payment

### Payment Status

- **pending**: Payment has not been received yet (default)
- **paid**: Worker has confirmed receiving payment
- **disputed**: Either party has raised a payment dispute
- **refunded**: Payment was refunded (handled manually)

## API Endpoints

### 1. Create Booking with Payment Info

```http
POST /bookings
```

**Request Body:**
```json
{
  "workerId": 123,
  "booking_date": "2025-01-15",
  "booking_time": "10:00",
  "note": "Please fix the leaking tap",
  "payment_method": "cash",
  "booking_amount": 350.00
}
```

**Payment Fields (Optional):**
- `payment_method`: "cash", "eft", or "online"
- `booking_amount`: Decimal amount (e.g., 350.00)

### 2. Mark Payment as Received (Worker Only)

```http
POST /bookings/:id/mark-paid
```

**Request Body:**
```json
{
  "payment_method": "cash",
  "payment_notes": "Received R350 in cash after job completion"
}
```

**Requirements:**
- Worker must be authenticated
- Booking must be marked as "Completed"
- Payment method must be "cash" or "eft"

**Response:**
```json
{
  "success": true,
  "message": "Payment marked as received",
  "payment_status": "paid"
}
```

### 3. Update Payment Details

```http
POST /bookings/:id/update-payment
```

**Request Body:**
```json
{
  "payment_method": "eft",
  "booking_amount": 450.00
}
```

**Authorization:** Client or Worker (must be involved in the booking)

### 4. Raise Payment Dispute

```http
POST /bookings/:id/dispute-payment
```

**Request Body:**
```json
{
  "reason": "Client claims they paid but I did not receive the money"
}
```

**What Happens:**
- Creates a dispute record in `payment_disputes` table
- Updates booking `payment_status` to "disputed"
- Sends email notifications to both client and worker
- Support team is notified to investigate

## Database Schema

### Bookings Table (New Fields)

```sql
ALTER TABLE bookings ADD COLUMN
  payment_method VARCHAR(20),           -- 'cash', 'eft', 'online'
  payment_status VARCHAR(20),           -- 'pending', 'paid', 'disputed', 'refunded'
  payment_proof_url TEXT,               -- (Reserved for future: EFT proof upload)
  payment_proof_id VARCHAR(255),        -- (Reserved for future: Cloudinary ID)
  paid_at TIMESTAMP,                    -- When payment was marked as received
  payment_notes TEXT;                   -- Notes from worker when marking as paid
```

### Payment Disputes Table

```sql
CREATE TABLE payment_disputes (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  raised_by VARCHAR(20),                -- 'client', 'worker', 'admin'
  reason TEXT,
  status VARCHAR(20),                   -- 'open', 'investigating', 'resolved', 'closed'
  resolution TEXT,
  resolved_by INTEGER REFERENCES workers(id),
  created_at TIMESTAMP,
  resolved_at TIMESTAMP
);
```

## Frontend Integration

### For Clients

#### When Creating a Booking

```javascript
const bookingData = {
  workerId: selectedWorker.id,
  booking_date: '2025-01-15',
  booking_time: '10:00',
  note: 'Fix the leaking tap',
  payment_method: 'cash',  // Let client select
  booking_amount: agreedPrice
};

const response = await fetch('/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify(bookingData)
});
```

#### Viewing Booking Details

Display payment information:
```javascript
{booking.payment_method && (
  <div>
    <strong>Payment Method:</strong> {booking.payment_method.toUpperCase()}
  </div>
)}
{booking.booking_amount && (
  <div>
    <strong>Amount:</strong> R{booking.booking_amount}
  </div>
)}
{booking.payment_status && (
  <div>
    <strong>Payment Status:</strong>
    <span className={booking.payment_status === 'paid' ? 'text-success' : 'text-warning'}>
      {booking.payment_status}
    </span>
  </div>
)}
```

### For Workers

#### Marking Payment as Received

```javascript
async function markAsPaid(bookingId, paymentMethod, notes) {
  const response = await fetch(`/bookings/${bookingId}/mark-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      payment_method: paymentMethod,
      payment_notes: notes
    })
  });

  const data = await response.json();
  if (data.success) {
    alert('Payment marked as received!');
    // Update UI to show payment status as "paid"
  }
}
```

#### UI Example

```html
<!-- Show "Mark as Paid" button for completed bookings with pending payment -->
<div v-if="booking.status === 'Completed' && booking.payment_status === 'pending'">
  <h4>Mark Payment as Received</h4>
  <select v-model="paymentMethod">
    <option value="cash">Cash</option>
    <option value="eft">EFT/Bank Transfer</option>
  </select>
  <textarea v-model="paymentNotes" placeholder="Optional notes..."></textarea>
  <button @click="markAsPaid(booking.id, paymentMethod, paymentNotes)">
    Confirm Payment Received
  </button>
</div>
```

## Real-Time Updates (Socket.io)

### Payment Updated Event

```javascript
io.on('payment-updated', (data) => {
  // data = { bookingId, payment_status, user_id, worker_id, payment_method, booking_amount }
  console.log('Payment updated:', data);
  // Update UI to reflect new payment status
});
```

### Payment Dispute Event

```javascript
io.on('payment-dispute', (data) => {
  // data = { bookingId, raised_by, user_id, worker_id }
  console.log('Payment dispute raised:', data);
  // Show notification to relevant parties
});
```

## Email Notifications

### Payment Confirmation Email

**Sent to:** Client
**Triggered by:** Worker marking payment as received

**Template:**
```
Subject: Payment Confirmed - Fixxa

Hi [Client Name],

[Worker Name] has confirmed receipt of your payment for the booking on [Date] at [Time].

Payment Method: CASH/EFT
Amount: R[Amount]
Notes: [Payment Notes]

Thank you for using Fixxa!
```

### Payment Dispute Email

**Sent to:** Both Client and Worker
**Triggered by:** Either party raising a dispute

**Template:**
```
Subject: Payment Dispute Raised - Fixxa

A payment dispute has been raised for booking #[ID]

Raised by: [Client/Worker Name]
Reason: [Dispute Reason]

Our support team will review this dispute and contact both parties soon.
```

## Best Practices

### For Workers

1. **Always mark payment as received** immediately after receiving it
2. **Add notes** when marking as paid (e.g., "Received R350 in cash on 15 Jan 2025")
3. **If payment method changes**, update it before marking as paid
4. **Keep records** of cash payments for your own accounting
5. **For EFT payments**, verify the money is in your account before marking as paid

### For Clients

1. **Agree on price** before the job starts
2. **Add payment method** when creating the booking so the worker knows what to expect
3. **Pay promptly** after job completion
4. **Keep receipts** for EFT transactions
5. **If dispute arises**, use the dispute system instead of external channels

### For Platform Admins

1. **Monitor payment disputes** regularly at `/admin/payment-disputes` (to be implemented)
2. **Investigate disputes** within 48 hours
3. **Keep audit trail** of all payment-related communications
4. **Update payment status** to "refunded" if money was returned

## Testing the System

### Test Scenario 1: Cash Payment

1. Client creates booking with `payment_method: "cash"` and `booking_amount: 350`
2. Worker completes job and marks booking as "Completed"
3. Worker receives R350 cash from client
4. Worker calls `POST /bookings/:id/mark-paid` with `payment_method: "cash"`
5. Client receives email confirmation
6. Booking shows `payment_status: "paid"` in database

### Test Scenario 2: EFT Payment

1. Client creates booking with `payment_method: "eft"` and `booking_amount: 500`
2. Worker completes job
3. Client transfers R500 to worker's bank account
4. Worker verifies money received in bank account
5. Worker marks payment as received: `POST /bookings/:id/mark-paid`
6. Client receives email confirmation

### Test Scenario 3: Payment Dispute

1. Client claims they paid, but worker says they didn't receive payment
2. Worker raises dispute: `POST /bookings/:id/dispute-payment`
3. Both parties receive email notification
4. Payment status changes to "disputed"
5. Admin investigates and resolves

## Future Enhancements (Not Yet Implemented)

1. **EFT Proof Upload**: Allow clients to upload bank transfer screenshots
2. **Admin Dispute Dashboard**: View and manage all payment disputes
3. **Payment Reminders**: Auto-remind clients about pending payments
4. **Payment Analytics**: Track payment method preferences and dispute rates
5. **Refund Processing**: Automated refund workflow
6. **Invoice Generation**: Auto-generate payment receipts

## Troubleshooting

### Worker cannot mark payment as received

**Error:** "Can only mark completed bookings as paid"

**Solution:** Ensure booking status is "Completed" first. Worker must complete the job before marking payment.

### Payment status not updating

**Check:**
1. Worker is authenticated as the correct user
2. Booking ID is correct
3. Payment method is either "cash" or "eft" (not "online")
4. Database migration has run successfully

### Dispute not creating

**Check:**
1. User is involved in the booking (either client or worker)
2. Reason field is not empty
3. Database tables `payment_disputes` exists

## Support

For payment-related issues, contact:
- Email: fixxaapp@gmail.com
- Include booking ID and description of issue
