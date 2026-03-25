-- ==============================================================================
-- PRINTPORTAL SERVICE - MASTER SETUP SCRIPT
-- ==============================================================================
-- WARNING: Running this will ERASE all data, users, and settings!
-- ==============================================================================

-- 0. RESET & FRESH START
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
ALTER SCHEMA public OWNER TO postgres;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Clear Auth Users (DANGER:destructive)
DELETE FROM auth.users;

-- 1. INITIAL SETUP & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES
--------------------------------------------------------------------------------
-- Profiles: Core user data
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone_number TEXT,
    role TEXT DEFAULT 'user',
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (wallet_balance >= 0),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Kiosks: Physical printing hardware
CREATE TABLE IF NOT EXISTS public.kiosks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'error')),
    last_ping TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Print Jobs: Active and historical print requests
CREATE TABLE IF NOT EXISTS public.print_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    page_count INTEGER DEFAULT 1 CHECK (page_count > 0),
    copies INTEGER DEFAULT 1 CHECK (copies > 0),
    is_color BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('awaiting_verification', 'pending', 'processing', 'completed', 'canceled')),
    release_code TEXT UNIQUE,
    kiosk_id UUID REFERENCES public.kiosks(id),
    cost DECIMAL(10, 2) DEFAULT 0.00 CHECK (cost >= 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Economy Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Transactions: Financial ledger
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount != 0),
    type TEXT CHECK (type IN ('recharge', 'payment')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Recharge Tokens: Physical voucher management
CREATE TABLE IF NOT EXISTS public.recharge_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    value DECIMAL(10, 2) NOT NULL CHECK (value > 0),
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

--------------------------------------------------------------------------------
-- 3. PERFORMANCE INDEXES
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_print_jobs_user_status_created ON public.print_jobs(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON public.transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recharge_tokens_code ON public.recharge_tokens(code);
CREATE INDEX IF NOT EXISTS idx_recharge_tokens_is_used ON public.recharge_tokens(is_used) WHERE is_used = FALSE;

--------------------------------------------------------------------------------
-- 4. SECURITY FUNCTIONS (SECURITY DEFINER)
--------------------------------------------------------------------------------

-- Admin validation helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Automatic profile creation upon auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Student User'), 
    COALESCE(new.raw_user_meta_data->>'phone_number', ''), 
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Thread-safe balance updates
CREATE OR REPLACE FUNCTION public.increment_balance(user_id UUID, amount DECIMAL)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atomic Print Job Release
CREATE OR REPLACE FUNCTION public.release_print_job(job_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_file_name TEXT;
    v_cost DECIMAL(10, 2);
    v_balance DECIMAL(10, 2);
    v_status TEXT;
BEGIN
    -- 1. Get job info
    SELECT user_id, file_name, cost, status INTO v_user_id, v_file_name, v_cost, v_status
    FROM public.print_jobs
    WHERE id = job_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Job not found');
    END IF;

    IF v_status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Job already released or canceled');
    END IF;

    -- 2. Check balance (WITH ROW LOCKING)
    SELECT wallet_balance INTO v_balance
    FROM public.profiles
    WHERE id = v_user_id
    FOR UPDATE;

    IF v_balance < v_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- 3. Atomic Update
    -- Deduct balance
    UPDATE public.profiles
    SET wallet_balance = wallet_balance - v_cost
    WHERE id = v_user_id;

    -- Log transaction
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (v_user_id, -v_cost, 'payment', 'Print Job: ' || v_file_name);

    -- Update job status
    UPDATE public.print_jobs
    SET status = 'processing',
        updated_at = now()
    WHERE id = job_id;

    RETURN jsonb_build_object('success', true, 'new_balance', v_balance - v_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atomic Token Redemption
CREATE OR REPLACE FUNCTION public.redeem_token_atomic(p_token_code TEXT, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_token_id UUID;
    v_value DECIMAL(10, 2);
    v_is_used BOOLEAN;
    v_balance DECIMAL(10, 2);
BEGIN
    -- 1. Lock the token row to prevent race conditions
    SELECT id, value, is_used INTO v_token_id, v_value, v_is_used
    FROM public.recharge_tokens
    WHERE code = p_token_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid token code');
    END IF;

    IF v_is_used THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token has already been used');
    END IF;

    -- 2. Update the token
    UPDATE public.recharge_tokens
    SET is_used = TRUE,
        used_by = p_user_id,
        updated_at = now()
    WHERE id = v_token_id;

    -- 3. Lock and update the user's wallet
    SELECT wallet_balance INTO v_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    UPDATE public.profiles
    SET wallet_balance = wallet_balance + v_value,
        updated_at = now()
    WHERE id = p_user_id;

    -- 4. Record the transaction
    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (p_user_id, v_value, 'recharge', 'Voucher Recharge: ' || p_token_code);

    RETURN jsonb_build_object('success', true, 'new_balance', v_balance + v_value, 'amount_added', v_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

--------------------------------------------------------------------------------
-- 5. TRIGGER DEFINITIONS
--------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

--------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiosks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recharge_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id AND status = 'active');
CREATE POLICY "Admins have full profile access" ON public.profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Kiosk Policies
CREATE POLICY "Everyone can view kiosks" ON public.kiosks FOR SELECT USING (true);
CREATE POLICY "Admins can manage kiosks" ON public.kiosks FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Print Jobs Policies
CREATE POLICY "Users can view own jobs" ON public.print_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own jobs" ON public.print_jobs FOR INSERT WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active')
);
CREATE POLICY "Users can delete/cancel own pending jobs" ON public.print_jobs FOR DELETE USING (
  auth.uid() = user_id AND status = 'pending' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active')
);
CREATE POLICY "Admins can view all jobs" ON public.print_jobs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins can update all jobs" ON public.print_jobs FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Transaction Policies
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT TO authenticated USING (public.is_admin());

-- Token Policies (Admin Only)
CREATE POLICY "Admins can manage tokens" ON public.recharge_tokens FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Settings Policies
CREATE POLICY "Everyone can view settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

--------------------------------------------------------------------------------
-- 7. SCHEMA PERMISSIONS & GRANTS
--------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
-- We rely on RLS rather than broad GRANT ALL
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

--------------------------------------------------------------------------------
-- 8. STORAGE BUCKET PERMISSIONS
--------------------------------------------------------------------------------
-- 1. Public Read Access
DROP POLICY IF EXISTS "Public Access Profile Photos" ON storage.objects;
CREATE POLICY "Public Access Profile Photos" ON storage.objects FOR SELECT USING (bucket_id = 'profile_photos');
-- 2. Authenticated Upload
DROP POLICY IF EXISTS "Auth Upload Profile Photos" ON storage.objects;
CREATE POLICY "Auth Upload Profile Photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile_photos');
-- 3. Owner Update/Delete
DROP POLICY IF EXISTS "Owner Update Profile Photos" ON storage.objects;
CREATE POLICY "Owner Update Profile Photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'profile_photos' AND auth.uid() = owner);
DROP POLICY IF EXISTS "Owner Delete Profile Photos" ON storage.objects;
CREATE POLICY "Owner Delete Profile Photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'profile_photos' AND auth.uid() = owner);
--------------------------------------------------------------------------------
-- 9. MANUAL DATA SYNC (For Existing Users)
--------------------------------------------------------------------------------
-- Run this ONCE if you have users created before the trigger fix.
-- This copies hidden metadata (name/phone) from auth to public profiles.

-- Seed Economy Settings
INSERT INTO public.settings (key, value) VALUES 
('print_pricing', '{"mono_price_per_page": 2.00, "color_price_per_page": 10.00, "mono_cost_per_page": 0.50, "color_cost_per_page": 5.00}')
ON CONFLICT (key) DO NOTHING;

--------------------------------------------------------------------------------
-- 6. STORAGE POLICIES
--------------------------------------------------------------------------------

-- Storage Buckets Initialization
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('profile_photos', 'profile_photos', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    ((storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);

DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    ((storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);

DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND public.is_admin());

-- Triggers for updated_at
CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER tr_kiosks_updated BEFORE UPDATE ON public.kiosks FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER tr_print_jobs_updated BEFORE UPDATE ON public.print_jobs FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER tr_settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER tr_recharge_tokens_updated BEFORE UPDATE ON public.recharge_tokens FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
