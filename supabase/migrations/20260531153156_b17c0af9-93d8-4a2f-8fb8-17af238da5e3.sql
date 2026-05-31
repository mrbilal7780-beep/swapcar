
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_match_on_mutual_like() FROM PUBLIC, anon, authenticated;

DROP POLICY "Vehicle photos public read" ON storage.objects;
CREATE POLICY "Vehicle photos read by authenticated" ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-photos' AND auth.role() = 'authenticated');
