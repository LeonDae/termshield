create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  plan text default 'free' check (plan in ('free', 'basic', 'premium')),
  scan_credits int default 0,
  created_at timestamptz default now()
);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  filename text,
  status text default 'pending'
    check (status in ('pending', 'processing', 'complete', 'failed', 'retrying')),
  confidence_score float,
  plan_type text check (plan_type in ('basic', 'premium')),
  retry_count int default 0,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table public.risks (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references public.scans(id) on delete cascade,
  category text check (category in ('ip', 'payment', 'non-compete', 'termination')),
  severity text check (severity in ('critical', 'important', 'safe')),
  clause_text text,
  explanation text,
  fix_message text,
  confidence float,
  created_at timestamptz default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id),
  scan_id uuid references public.scans(id),
  amount_paise int not null,
  currency text default 'INR',
  provider text check (provider in ('razorpay', 'stripe')),
  provider_id text unique not null,
  status text default 'pending' check (status in ('pending', 'captured', 'failed', 'refunded')),
  created_at timestamptz default now()
);

create table public.errors (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references public.scans(id),
  error_message text,
  error_stage text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;
alter table public.scans enable row level security;
alter table public.risks enable row level security;
alter table public.payments enable row level security;

create index idx_scans_status on public.scans(status);
create index idx_risks_scan_id on public.risks(scan_id);
create index idx_payments_provider_id on public.payments(provider_id);

-- Create scan_history table
create table public.scan_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  scan_id uuid references public.scans(id) on delete cascade not null,
  filename text,
  confidence_score float,
  risk_summary jsonb, -- [{category, severity, fixMessage}]
  was_exported boolean default false,
  created_at timestamptz default now()
);

alter table public.scan_history enable row level security;

create index idx_scan_history_user_id on public.scan_history(user_id);
create index idx_scan_history_scan_id on public.scan_history(scan_id);

-- Row Level Security policies
create policy "Users can view their own scans" on public.scans
  for select using (auth.uid() = user_id);

create policy "Users can view risks for their own scans" on public.risks
  for select using (
    exists (
      select 1 from public.scans
      where scans.id = risks.scan_id and scans.user_id = auth.uid()
    )
  );

create policy "Users can view their own scan history" on public.scan_history
  for select using (auth.uid() = user_id);

-- Trigger functions to sync auth.users to public.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.handle_update_user()
returns trigger as $$
begin
  update public.users
  set full_name = new.raw_user_meta_data->>'full_name'
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_update_user();
