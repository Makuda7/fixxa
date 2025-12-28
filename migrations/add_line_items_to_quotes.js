async function addLineItemsToQuotes(pool, logger) {
  console.log('🔄 Adding line items columns to quotes table...');

  try {
    // Add line_items column (JSONB)
    await pool.query(`
      ALTER TABLE quotes
      ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb
    `);
    console.log('  ✓ Added line_items column');

    // Add subtotal column
    await pool.query(`
      ALTER TABLE quotes
      ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2)
    `);
    console.log('  ✓ Added subtotal column');

    // Add tax_amount column
    await pool.query(`
      ALTER TABLE quotes
      ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0
    `);
    console.log('  ✓ Added tax_amount column');

    // Add total_amount column
    await pool.query(`
      ALTER TABLE quotes
      ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2)
    `);
    console.log('  ✓ Added total_amount column');

    // Add payment_methods column (array of strings)
    await pool.query(`
      ALTER TABLE quotes
      ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT '{cash}'
    `);
    console.log('  ✓ Added payment_methods column');

    // Add banking_details column (JSONB)
    await pool.query(`
      ALTER TABLE quotes
      ADD COLUMN IF NOT EXISTS banking_details JSONB
    `);
    console.log('  ✓ Added banking_details column');

    // Add valid_until column
    await pool.query(`
      ALTER TABLE quotes
      ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP
    `);
    console.log('  ✓ Added valid_until column');

    // Migrate existing quotes that have amount to line_items format
    const migrateResult = await pool.query(`
      UPDATE quotes
      SET
        line_items = jsonb_build_array(
          jsonb_build_object('description', 'Service', 'amount', amount)
        ),
        subtotal = amount,
        total_amount = amount
      WHERE amount IS NOT NULL
        AND (line_items IS NULL OR line_items = '[]'::jsonb)
    `);
    console.log(`  ✓ Migrated ${migrateResult.rowCount} existing quotes to line items format`);

    console.log('✅ Line items columns added to quotes table');
  } catch (err) {
    console.error('⚠️  Migration error:', err.message);
    throw err;
  }
}

module.exports = { addLineItemsToQuotes };
