-- Migration: Add missing columns to messages table

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='sender_type') THEN
        ALTER TABLE messages ADD COLUMN sender_type VARCHAR(20) DEFAULT 'client';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='receiver_type') THEN
        ALTER TABLE messages ADD COLUMN receiver_type VARCHAR(20) DEFAULT 'professional';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='is_read') THEN
        ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='updated_at') THEN
        ALTER TABLE messages ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_sender_type') THEN
        ALTER TABLE messages ADD CONSTRAINT valid_sender_type 
            CHECK (sender_type IN ('client', 'professional', 'admin'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_receiver_type') THEN
        ALTER TABLE messages ADD CONSTRAINT valid_receiver_type 
            CHECK (receiver_type IN ('client', 'professional', 'admin'));
    END IF;
END $$;

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_messages_client ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_professional ON messages(professional_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='status') THEN
        ALTER TABLE messages DROP COLUMN status;
    END IF;
END $$;
