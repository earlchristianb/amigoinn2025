-- Remove all rules and triggers from payments table that might be blocking updates

-- Drop all rules on payments table (except _RETURN for views)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT rulename FROM pg_rules WHERE tablename = 'payments' AND rulename != '_RETURN') 
    LOOP
        EXECUTE 'DROP RULE IF EXISTS ' || r.rulename || ' ON payments CASCADE';
    END LOOP;
END $$;

-- Drop all triggers on payments table
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'payments') 
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON payments CASCADE';
    END LOOP;
END $$;

-- Show remaining dependencies
SELECT 
    'Rule' as type, 
    rulename as name 
FROM pg_rules 
WHERE tablename = 'payments'
UNION ALL
SELECT 
    'Trigger' as type, 
    trigger_name as name 
FROM information_schema.triggers 
WHERE event_object_table = 'payments';

