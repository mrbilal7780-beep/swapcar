
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  category TEXT NOT NULL DEFAULT 'meetup',
  city TEXT,
  place_name TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  max_attendees INTEGER,
  attendees_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events viewable by everyone"
  ON public.events FOR SELECT
  USING (status = 'published' OR auth.uid() = organizer_id);

CREATE POLICY "Users create own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Organizer updates own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = organizer_id);

CREATE POLICY "Organizer deletes own events"
  ON public.events FOR DELETE
  USING (auth.uid() = organizer_id);

CREATE INDEX idx_events_geo ON public.events (latitude, longitude);
CREATE INDEX idx_events_starts_at ON public.events (starts_at);
CREATE INDEX idx_events_organizer ON public.events (organizer_id);

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.event_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'going',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

GRANT SELECT ON public.event_attendees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendees TO authenticated;
GRANT ALL ON public.event_attendees TO service_role;

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attendees viewable by everyone"
  ON public.event_attendees FOR SELECT USING (true);

CREATE POLICY "Users manage own attendance insert"
  ON public.event_attendees FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own attendance update"
  ON public.event_attendees FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own attendance delete"
  ON public.event_attendees FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_event_attendees_event ON public.event_attendees (event_id);
CREATE INDEX idx_event_attendees_user ON public.event_attendees (user_id);

CREATE OR REPLACE FUNCTION public.event_attendees_trg()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE org UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.events SET attendees_count = attendees_count + 1
      WHERE id = NEW.event_id RETURNING organizer_id INTO org;
    IF org IS NOT NULL AND org <> NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, entity_type, entity_id)
      VALUES (org, NEW.user_id, 'event_attend', 'event', NEW.event_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events SET attendees_count = GREATEST(attendees_count - 1, 0)
      WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER event_attendees_count_trg
  AFTER INSERT OR DELETE ON public.event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.event_attendees_trg();
