-- =========================================================
-- 🚀 RIDE ANDHRA – MIGRATION: Rider PIN System (V3)
-- =========================================================

-- 1️⃣ REMOVE OLD PIN HASH SYSTEM
------------------------------------------------------------
ALTER TABLE users
    DROP COLUMN IF EXISTS rider_pin_hash;

DROP FUNCTION IF EXISTS set_rider_pin(UUID, TEXT);
DROP FUNCTION IF EXISTS verify_rider_pin(UUID, TEXT);


-- 2️⃣ ADD NEW PLAIN 4-DIGIT PIN SYSTEM
------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN rider_pin VARCHAR(4) UNIQUE;


-- 3️⃣ FUNCTION → GENERATE UNIQUE 4-DIGIT PIN
------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_unique_pin()
RETURNS VARCHAR(4) AS $$
DECLARE
    v_pin VARCHAR(4);
BEGIN
    LOOP
        v_pin := LPAD((FLOOR(RANDOM() * 10000))::TEXT, 4, '0'); -- Generates 0000–9999
        EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE rider_pin = v_pin);
    END LOOP;
    RETURN v_pin;
END;
$$ LANGUAGE plpgsql;


-- 4️⃣ TRIGGER FUNCTION → SET PIN WHEN USER IS CREATED
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_create_user_dependents()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-generate unique 4 digit PIN
    NEW.rider_pin := generate_unique_pin();

    -- Wallet
    INSERT INTO wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;

    -- Rider profiles
    IF NEW.role = 'rider' THEN
        INSERT INTO rider_profiles (user_id)
        VALUES (NEW.id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Driver profiles
    IF NEW.role = 'driver' THEN
        INSERT INTO driver_profiles (user_id, first_name, last_name)
        VALUES (
            NEW.id,
            SPLIT_PART(COALESCE(NEW.name,''), ' ', 1),
            COALESCE(SPLIT_PART(NEW.name,' ',2), '')
        )
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 5️⃣ REPLACE OLD TRIGGER
------------------------------------------------------------
DROP TRIGGER IF EXISTS create_user_dependents ON users;

CREATE TRIGGER create_user_dependents
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_create_user_dependents();


-- 6️⃣ TABLE TO LOG PIN ATTEMPTS (optional but recommended)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rider_pin_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES users(id),
    ride_id UUID REFERENCES rides(id),
    success BOOLEAN DEFAULT FALSE,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);


-- 7️⃣ PIN VERIFICATION FUNCTION (SIMPLE VERSION)
------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_rider_pin(
    p_rider_id UUID,
    p_pin TEXT,
    p_driver_id UUID DEFAULT NULL,
    p_ride_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_ok BOOLEAN;
BEGIN
    SELECT (rider_pin = p_pin)
    INTO v_ok
    FROM users
    WHERE id = p_rider_id;

    -- Log attempt
    INSERT INTO rider_pin_attempts (rider_id, driver_id, ride_id, success)
    VALUES (p_rider_id, p_driver_id, p_ride_id, v_ok);

    IF v_ok THEN
        UPDATE rides
        SET rider_pin_entered_by_driver = TRUE,
            rider_pin_verified_at = NOW(),
            updated_at = NOW()
        WHERE id = p_ride_id;

        RETURN jsonb_build_object('success', true, 'message', 'PIN verified');
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Invalid PIN');
    END IF;
END;
$$ LANGUAGE plpgsql;


-- 8️⃣ ENSURE INDEXES FOR PERFORMANCE
------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(rider_pin);
CREATE INDEX IF NOT EXISTS idx_rider_pin_attempts ON rider_pin_attempts(rider_id);


-- =========================================================
-- 🎉 MIGRATION COMPLETE — NEW PIN SYSTEM READY!
-- =========================================================
