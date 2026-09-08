-- LC App block relationship cleanup.
--
-- A block must sever existing follows in both directions, not merely prevent
-- future follows. The blocker owns the block row; the database performs the
-- bilateral cleanup so browser clients never receive permission to delete
-- another user's unrelated social data.

begin;

create or replace function public.remove_follows_on_user_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.follows
   where (follower_id = new.blocker_id and following_id = new.blocked_id)
      or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;

revoke all on function public.remove_follows_on_user_block() from public, anon, authenticated;

drop trigger if exists user_blocks_remove_follows on public.user_blocks;
create trigger user_blocks_remove_follows
  after insert on public.user_blocks
  for each row execute function public.remove_follows_on_user_block();

-- Repair any relationships that predate the trigger.
delete from public.follows f
using public.user_blocks b
where (f.follower_id = b.blocker_id and f.following_id = b.blocked_id)
   or (f.follower_id = b.blocked_id and f.following_id = b.blocker_id);

comment on function public.remove_follows_on_user_block() is
  'Severs follows in both directions after a user-owned block is created.';

commit;
