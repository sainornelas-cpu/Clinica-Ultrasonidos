-- ============================================
-- ESQUEMA DE BASE DE DATOS PARA AGENTE DE CITAS
-- Versión CORREGIDA (con políticas individuales)
-- ============================================

-- Habilitar extensiones
create extension if not exists vector;
create extension if not exists pg_net;

-- ============================================
-- TABLA: users (Usuarios con perfil vectorial)
-- ============================================
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

-- ============================================
-- TABLA: appointments (Citas médicas)
-- ============================================
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  owner_id uuid,
  service_id text not null,
  service_name text not null,
  duration_minutes int not null,
  start_time timestamptz not null,
  end_time timestamptz,
  status text default 'scheduled' check (status in ('confirmed','rescheduled','cancelled','no_show','pending_sync','scheduled')),
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

-- ============================================
-- TABLA: interaction_logs (Historial de interacciones)
-- ============================================
create table if not exists interaction_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  role text check (role in ('user','assistant','system')),
  content text not null,
  intent_detected text,
  state_before text,
  state_after text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: owner_alerts (Alertas para el dueño)
-- ============================================
create table if not exists owner_alerts (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade,
  alert_type text check (alert_type in ('new_booking','reschedule','cancellation','risk_flag','no_show')),
  payload jsonb,
  notified boolean default false,
  notified_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: services (Servicios disponibles)
-- ============================================
create table if not exists services (
  id text primary key,
  owner_id uuid,
  name text not null,
  duration_minutes int not null,
  price text,
  description text,
  active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- ÍNDICES
-- ============================================
create index if not exists idx_users_phone on users(phone_number);
create index if not exists idx_appointments_user on appointments(user_id);
create index if not exists idx_appointments_start_time on appointments(start_time);
create index if not exists idx_appointments_status on appointments(status);
create index if not exists idx_appointments_calendar on appointments(calendar_event_id) where calendar_event_id is not null;
create index if not exists idx_interactions_user on interaction_logs(user_id, created_at desc);
create index if not exists idx_interactions_appointment on interaction_logs(appointment_id);
create index if not exists idx_alerts_appointment on owner_alerts(appointment_id);

-- ============================================
-- HABILITAR REALTIME
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments, owner_alerts, users;
  END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
alter table users enable row level security;
alter table appointments enable row level security;
alter table interaction_logs enable row level security;
alter table owner_alerts enable row level security;
alter table services enable row level security;

-- Policies para users
create policy if not exists "Users: Public read access" on users for select using (true);
create policy if not exists "Users: Service role insert access" on users for insert with check (true);
create policy if not exists "Users: Service role update access" on users for update using (true);

-- Policies para appointments
create policy if not exists "Appointments: Public read access" on appointments for select using (true);
create policy if not exists "Appointments: Service role insert access" on appointments for insert with check (true);
create policy if not exists "Appointments: Service role update access" on appointments for update using (true);
create policy if not exists "Appointments: Service role delete access" on appointments for delete using (true);

-- Policies para interaction_logs
create policy if not exists "Interaction logs: Public read access" on interaction_logs for select using (true);
create policy if not exists "Interaction logs: Service role insert access" on interaction_logs for insert with check (true);

-- Policies para owner_alerts
create policy if not exists "Owner alerts: Public read access" on owner_alerts for select using (true);
create policy if not exists "Owner alerts: Service role insert access" on owner_alerts for insert with check (true);
create policy if not exists "Owner alerts: Service role update access" on owner_alerts for update using (true);

-- Policies para services
create policy if not exists "Services: Public read access" on services for select using (true);
create policy if not exists "Services: Service role insert access" on services for insert with check (true);
create policy if not exists "Services: Service role update access" on services for update using (true);

-- ============================================
-- FUNCIONES DE TRIGGER (Opcional)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at_users ON public.users;
CREATE TRIGGER handle_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_appointments ON public.appointments;
CREATE TRIGGER handle_updated_at_appointments
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT
  'Tablas creadas correctamente' AS status,
  (SELECT COUNT(*) FROM users) AS users_count,
  (SELECT COUNT(*) FROM appointments) AS appointments_count,
  (SELECT COUNT(*) FROM interaction_logs) AS logs_count;
