
REVOKE EXECUTE ON FUNCTION public.posts_count_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.post_likes_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.post_comments_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.follows_trg() FROM PUBLIC, anon, authenticated;
