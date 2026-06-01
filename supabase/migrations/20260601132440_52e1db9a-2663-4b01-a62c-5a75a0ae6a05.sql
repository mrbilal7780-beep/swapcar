
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS generation text,
  ADD COLUMN IF NOT EXISTS body_type text,
  ADD COLUMN IF NOT EXISTS doors integer,
  ADD COLUMN IF NOT EXISTS seats integer,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS displacement_cc integer,
  ADD COLUMN IF NOT EXISTS cylinders integer,
  ADD COLUMN IF NOT EXISTS power_hp integer,
  ADD COLUMN IF NOT EXISTS drivetrain text,
  ADD COLUMN IF NOT EXISTS gears integer,
  ADD COLUMN IF NOT EXISTS owners_count integer,
  ADD COLUMN IF NOT EXISTS first_registration date,
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS ai_issues jsonb;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
