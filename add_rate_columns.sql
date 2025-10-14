-- Add rate columns to workers table
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS rate_type VARCHAR(10),
ADD COLUMN IF NOT EXISTS rate_amount DECIMAL(10,2);

-- Add comment for documentation
COMMENT ON COLUMN workers.rate_type IS 'Type of rate: hourly or fixed';
COMMENT ON COLUMN workers.rate_amount IS 'Amount in South African Rands (ZAR)';
