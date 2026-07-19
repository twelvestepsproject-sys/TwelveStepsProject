-- Phase 5 — captured data: leads, newsletter_subscribers, contact_messages.
-- No is_placeholder here — these are user-submitted, not content (matches
-- lib/schemas/leads.ts, which has no placeholderFields spread).

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email citext not null,
  phone text not null,
  source_page text,
  utm jsonb,
  consent_at timestamptz not null,
  status public.lead_status not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create index leads_email_idx on public.leads (email);
create index leads_status_idx on public.leads (status);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  consent_at timestamptz not null,
  source text,
  status public.subscriber_status not null default 'subscribed',
  unsubscribe_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.newsletter_subscribers
  for each row execute function public.set_updated_at();
create index newsletter_subscribers_email_idx on public.newsletter_subscribers (email);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email citext not null,
  phone text,
  message text not null,
  source_page text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.contact_messages
  for each row execute function public.set_updated_at();
create index contact_messages_email_idx on public.contact_messages (email);
