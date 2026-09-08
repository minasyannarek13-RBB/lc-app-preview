-- LC App product/social hardening: deny user mutations after account suspension.
-- Additive RLS replacement only. Does not change roles, status values, demo mode,
-- service-role access, or migration 009 creator-session eligibility.

begin;

-- Social graph
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
  on public.follows for insert
  to authenticated
  with check (
    auth.uid() = follower_id
    and public.is_active_profile(follower_id)
    and not public.is_blocked_pair(follower_id, following_id)
  );

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
  on public.follows for delete
  to authenticated
  using (
    auth.uid() = follower_id
    and public.is_active_profile(follower_id)
  );

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
  on public.user_blocks for insert
  to authenticated
  with check (
    auth.uid() = blocker_id
    and public.is_active_profile(blocker_id)
  );

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own"
  on public.user_blocks for delete
  to authenticated
  using (
    auth.uid() = blocker_id
    and public.is_active_profile(blocker_id)
  );

-- Posts, comments and reactions
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and public.is_active_profile(author_id)
    and status = 'active'
    and deleted_at is null
  );

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
  on public.posts for update
  to authenticated
  using (
    auth.uid() = author_id
    and public.is_active_profile(author_id)
  )
  with check (
    auth.uid() = author_id
    and public.is_active_profile(author_id)
  );

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and public.is_active_profile(author_id)
    and status = 'active'
    and deleted_at is null
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.status = 'active'
        and p.deleted_at is null
        and not public.is_blocked_pair(auth.uid(), p.author_id)
    )
  );

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own"
  on public.comments for update
  to authenticated
  using (
    auth.uid() = author_id
    and public.is_active_profile(author_id)
  )
  with check (
    auth.uid() = author_id
    and public.is_active_profile(author_id)
  );

drop policy if exists "post_likes_insert_own" on public.post_likes;
create policy "post_likes_insert_own"
  on public.post_likes for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.status = 'active'
        and p.deleted_at is null
        and not public.is_blocked_pair(auth.uid(), p.author_id)
    )
  );

drop policy if exists "post_likes_delete_own" on public.post_likes;
create policy "post_likes_delete_own"
  on public.post_likes for delete
  to authenticated
  using (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  );

-- Product personas and preferences
drop policy if exists "account_personas_insert_own" on public.account_personas;
create policy "account_personas_insert_own"
  on public.account_personas for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  );

drop policy if exists "account_personas_update_own" on public.account_personas;
create policy "account_personas_update_own"
  on public.account_personas for update
  to authenticated
  using (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  )
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  );

drop policy if exists "player_preferences_insert_own" on public.player_preferences;
create policy "player_preferences_insert_own"
  on public.player_preferences for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  );

drop policy if exists "player_preferences_update_own" on public.player_preferences;
create policy "player_preferences_update_own"
  on public.player_preferences for update
  to authenticated
  using (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  )
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  );

-- Creator profile/session state
drop policy if exists "creator_profiles_insert_own" on public.creator_profiles;
create policy "creator_profiles_insert_own"
  on public.creator_profiles for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
    and verification_status in ('not_requested', 'submitted')
    and affiliation_verification_status in ('unverified', 'submitted')
  );

drop policy if exists "creator_profiles_update_own" on public.creator_profiles;
create policy "creator_profiles_update_own"
  on public.creator_profiles for update
  to authenticated
  using (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  )
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  );

drop policy if exists "creator_sessions_delete_own" on public.creator_sessions;
create policy "creator_sessions_delete_own"
  on public.creator_sessions for delete
  to authenticated
  using (
    auth.uid() = creator_id
    and public.is_active_profile(creator_id)
    and provenance = 'user_generated'
  );

-- Reminders and industry access requests
drop policy if exists "player_session_reminders_insert_own" on public.player_session_reminders;
create policy "player_session_reminders_insert_own"
  on public.player_session_reminders for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  );

drop policy if exists "player_session_reminders_update_own" on public.player_session_reminders;
create policy "player_session_reminders_update_own"
  on public.player_session_reminders for update
  to authenticated
  using (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  )
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  );

drop policy if exists "player_session_reminders_delete_own" on public.player_session_reminders;
create policy "player_session_reminders_delete_own"
  on public.player_session_reminders for delete
  to authenticated
  using (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  );

drop policy if exists "industry_profiles_insert_own" on public.industry_profiles;
create policy "industry_profiles_insert_own"
  on public.industry_profiles for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
    and access_status = 'not_requested'
  );

drop policy if exists "industry_profiles_update_own" on public.industry_profiles;
create policy "industry_profiles_update_own"
  on public.industry_profiles for update
  to authenticated
  using (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  )
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  );

drop policy if exists "partnership_access_requests_insert_own" on public.partnership_access_requests;
create policy "partnership_access_requests_insert_own"
  on public.partnership_access_requests for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
    and status = 'submitted'
  );

drop policy if exists "partnership_access_requests_update_own_note" on public.partnership_access_requests;
create policy "partnership_access_requests_update_own_note"
  on public.partnership_access_requests for update
  to authenticated
  using (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  )
  with check (
    auth.uid() = user_id
    and public.is_active_profile(user_id)
  );

commit;
