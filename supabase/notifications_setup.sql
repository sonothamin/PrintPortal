-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL for broadcast to all users
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Select Policies
CREATE POLICY "Users can view own or broadcast notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Admin Policies
CREATE POLICY "Admins have full notification access" 
ON public.notifications FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- Realtime Enablement
-- Note: You may need to run this if 'supabase_realtime' publication doesn't exist
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);
