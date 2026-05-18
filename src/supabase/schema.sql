-- Habilitar extensiones
create extension if not exists vector;
create extension if not exists pg_net;

-- Usuarios con perfil vectorial
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone_number text unique not null,
  full_name text,
  email text,
  timezone text default 'America/Mexico_City',
  preferred_time_range text check (preferred_time_range in ('morning','afternoon','evening')),
  trust_score float default 1.0,
  embedding vector(1536),
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Citas médicas
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  owner_id uuid not null,
  service_id text not null,
  service_name text not null,
  duration_minutes int not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text check (status in ('confirmed','rescheduled','cancelled','no_show','pending_sync')),
  calendar_event_id text,
  calendar_provider text check (calendar_provider in ('google','calcom','caldav')),
  notes text,
  cancellation_reason text,
  changed_by text check (changed_by in ('bot','dashboard','api')),
  reminder_24h_sent boolean default false,
  reminder_3h_sent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Historial de interacciones
create table if not exists interaction_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  appointment_id uuid references appointments(id),
  role text check (role in ('user','assistant')),
  content text not null,
  intent_detected text,
  state_before text,
  state_after text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- Alertas para el dueño
create table if not exists owner_alerts (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id),
  alert_type text check (alert_type in ('new_booking','reschedule','cancellation','risk_flag','no_show')),
  payload jsonb,
  notified boolean default false,
  notified_at timestamptz,
  created_at timestamptz default now()
);

-- Servicios
create table if not exists services (
  id text primary key,
  owner_id uuid not null,
  name text not null,
  duration_minutes int not null,
  price text,
  description text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Índices
create index if not exists idx_appointments_user on appointments(user_id);
create index if not exists idx_appointments_owner_time on appointments(owner_id, start_time) where status = 'confirmed';
create index if not exists idx_appointments_calendar on appointments(calendar_event_id) where calendar_event_id is not null;
create index if not exists idx_users_embedding on users using hnsw (embedding vector_cosine_ops);
create index if not exists idx_interactions_user on interaction_logs(user_id, created_at desc);

-- Habilitar realtime
alter publication supabase_realtime add table appointments, owner_alerts, users;

-- RLS
alter table users enable row level security;
alter table appointments enable row level security;
alter table interaction_logs enable row level security;
alter table owner_alerts enable row level security;

-- Policies simples (después las ajustamos)
create policy "Public read users" on users for select using (true);
create policy "Public read appointments" on appointments for select using (true);
create policy "Public read alerts" on owner_alerts for select using (true);
create policy "Service role full access" on all tables for all using (true) with check (true);