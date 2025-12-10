-- =========================================================
-- ðŸš€ RIDE ANDHRA â€“ MIGRATION: Fix Foreign Key Constraint (V4)
-- =========================================================

-- 1ï¸âƒ£ DROP EXISTING TRIGGER AND FUNCTION
------------------------------------------------------------
DROP TRIGGER IF EXISTS create_user_dependents ON users;
-- The function will be modified, so we just need to recreate it with OR REPLACE

-- 2ï¸âƒ£ CREATE BEFORE INSERT TRIGGER FOR PIN GENERATION
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_user_pin()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-generate unique 4 digit PIN
    NEW.rider_pin := generate_unique_pin();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_pin
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_user_pin();

-- 3ï¸âƒ£ CREATE AFTER INSERT TRIGGER FOR DEPENDENT RECORDS
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_create_user_dependents_after_insert()
RETURNS TRIGGER AS $$
BEGIN
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

CREATE TRIGGER create_user_dependents
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_create_user_dependents_after_insert();

-- 4ï¸âƒ£ CLEANUP OLD FUNCTION
------------------------------------------------------------
DROP FUNCTION IF EXISTS trigger_create_user_dependents();


-- =========================================================
-- ðŸŽ‰ MIGRATION COMPLETE â€” TRIGGER FIXED!
-- =========================================================
