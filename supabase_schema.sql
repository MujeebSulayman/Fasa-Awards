-- SUPABASE SQL DATABASE SCHEMA
-- Copy and paste this script into the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- ==========================================
-- 1. Create Tables
-- ==========================================

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Contestants Table
CREATE TABLE IF NOT EXISTS public.contestants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    bio TEXT,
    image_url TEXT,
    votes_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Votes Table (Transaction Logs)
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contestant_id UUID REFERENCES public.contestants(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL, -- Total amount paid in Naira (e.g. 500 for 5 votes)
    votes_count INTEGER NOT NULL, -- Number of votes cast (e.g. 5)
    email TEXT NOT NULL, -- Voter's email address
    reference TEXT NOT NULL UNIQUE, -- Paystack unique transaction reference
    status TEXT DEFAULT 'success' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. Configure Row Level Security (RLS)
-- ==========================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contestants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Categories RLS Policies
CREATE POLICY "Allow public read access to categories"
    ON public.categories FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated admins full access to categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Contestants RLS Policies
CREATE POLICY "Allow public read access to contestants"
    ON public.contestants FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated admins full access to contestants"
    ON public.contestants FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Votes RLS Policies
CREATE POLICY "Allow authenticated admins to read votes logs"
    ON public.votes FOR SELECT
    TO authenticated
    USING (true);

-- direct inserts are disabled; votes can only be recorded via the secure record_vote RPC function below

-- ==========================================
-- 3. Atomic Voting & Transaction Verification Function
-- ==========================================

CREATE OR REPLACE FUNCTION public.record_vote(
    p_contestant_id UUID,
    p_email TEXT,
    p_reference TEXT,
    p_votes_count INTEGER,
    p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with high privileges to bypass RLS for insertion
SET search_path = public
AS $$
DECLARE
    v_existing_id UUID;
    v_contestant_exists BOOLEAN;
    v_result JSONB;
BEGIN
    -- 1. Check if the transaction reference already exists to prevent replay attacks / double voting
    SELECT id INTO v_existing_id FROM public.votes WHERE reference = p_reference;
    
    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'This payment reference has already been used to cast votes.'
        );
    END IF;

    -- 2. Verify the contestant exists
    SELECT EXISTS(SELECT 1 FROM public.contestants WHERE id = p_contestant_id) INTO v_contestant_exists;
    
    IF NOT v_contestant_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Contestant not found.'
        );
    END IF;

    -- 3. Insert transaction log into the votes table
    INSERT INTO public.votes (
        contestant_id,
        amount,
        votes_count,
        email,
        reference,
        status
    ) VALUES (
        p_contestant_id,
        p_amount,
        p_votes_count,
        p_email,
        p_reference,
        'success'
    );

    -- 4. Increment the contestant's vote count
    UPDATE public.contestants
    SET votes_count = votes_count + p_votes_count
    WHERE id = p_contestant_id;

    -- 5. Return success result
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Vote successfully recorded!'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;

-- ==========================================
-- 4. Helper storage setups (Run manually in Supabase Storage dashboard)
-- ==========================================
-- Create a public storage bucket named "contestant-images"
-- Set RLS Policies on public.objects:
--  - SELECT: public (anyone) can read
--  - INSERT, UPDATE, DELETE: authenticated (admins) can upload/modify files
