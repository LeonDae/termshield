create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
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
