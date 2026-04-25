alter table if exists public.messages
add column if not exists reply_to_id uuid references public.messages(id) on delete set null;

create index if not exists idx_messages_reply_to_id on public.messages(reply_to_id);
