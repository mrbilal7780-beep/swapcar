
-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  city TEXT,
  avatar_url TEXT,
  trust_score INT NOT NULL DEFAULT 50,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- VEHICLES
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INT NOT NULL,
  mileage INT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  fuel TEXT NOT NULL,
  transmission TEXT NOT NULL,
  city TEXT,
  description TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  ai_estimate NUMERIC(10,2),
  ai_body_score INT,
  ai_interior_score INT,
  ai_mechanical_score INT,
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published vehicles viewable by everyone" ON public.vehicles FOR SELECT USING (status = 'published' OR auth.uid() = owner_id);
CREATE POLICY "Users insert own vehicles" ON public.vehicles FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users update own vehicles" ON public.vehicles FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users delete own vehicles" ON public.vehicles FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_vehicles_owner ON public.vehicles(owner_id);

-- LIKES (swipes)
CREATE TABLE public.vehicle_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  liked_vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  liker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(liker_vehicle_id, liked_vehicle_id)
);
GRANT SELECT, INSERT, DELETE ON public.vehicle_likes TO authenticated;
GRANT ALL ON public.vehicle_likes TO service_role;
ALTER TABLE public.vehicle_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own likes" ON public.vehicle_likes FOR SELECT USING (auth.uid() = liker_user_id);
CREATE POLICY "Users create own likes" ON public.vehicle_likes FOR INSERT WITH CHECK (auth.uid() = liker_user_id);
CREATE POLICY "Users delete own likes" ON public.vehicle_likes FOR DELETE USING (auth.uid() = liker_user_id);

-- MATCHES
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_a_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  vehicle_b_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_a_id, vehicle_b_id)
);
GRANT SELECT ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match participants can view" ON public.matches FOR SELECT
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Match participants read messages" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (auth.uid() = m.user_a_id OR auth.uid() = m.user_b_id)));
CREATE POLICY "Match participants send messages" ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND (auth.uid() = m.user_a_id OR auth.uid() = m.user_b_id)));
CREATE INDEX idx_messages_match ON public.messages(match_id, created_at);

-- auto-create match on mutual like
CREATE OR REPLACE FUNCTION public.create_match_on_mutual_like()
RETURNS TRIGGER AS $$
DECLARE
  reverse_like RECORD;
  owner_a UUID;
  owner_b UUID;
BEGIN
  SELECT * INTO reverse_like FROM public.vehicle_likes
    WHERE liker_vehicle_id = NEW.liked_vehicle_id AND liked_vehicle_id = NEW.liker_vehicle_id
    LIMIT 1;
  IF reverse_like IS NOT NULL THEN
    SELECT owner_id INTO owner_a FROM public.vehicles WHERE id = NEW.liker_vehicle_id;
    SELECT owner_id INTO owner_b FROM public.vehicles WHERE id = NEW.liked_vehicle_id;
    INSERT INTO public.matches (vehicle_a_id, vehicle_b_id, user_a_id, user_b_id)
    VALUES (LEAST(NEW.liker_vehicle_id, NEW.liked_vehicle_id), GREATEST(NEW.liker_vehicle_id, NEW.liked_vehicle_id), owner_a, owner_b)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER trg_mutual_like AFTER INSERT ON public.vehicle_likes
FOR EACH ROW EXECUTE FUNCTION public.create_match_on_mutual_like();

-- STORAGE bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-photos', 'vehicle-photos', true);
CREATE POLICY "Vehicle photos public read" ON storage.objects FOR SELECT USING (bucket_id = 'vehicle-photos');
CREATE POLICY "Users upload own vehicle photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own vehicle photos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own vehicle photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'vehicle-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
