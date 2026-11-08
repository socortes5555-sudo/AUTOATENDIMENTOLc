-- Esquema inicial independente para La Corte Barbearia.
-- Aplicar somente em um projeto Supabase novo, após revisão.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','barber')),
  barber_id uuid,
  created_at timestamptz not null default now()
);
create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id),
  display_name text not null,
  active boolean not null default true,
  commission_percent numeric(5,2) not null default 50 check (commission_percent between 0 and 100)
);
alter table public.profiles add constraint profiles_barber_fk foreign key (barber_id) references public.barbers(id);
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text not null unique,
  email text,
  created_at timestamptz not null default now()
);
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  active boolean not null default true
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  active boolean not null default true
);
create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  queue_date date not null default (now() at time zone 'America/Sao_Paulo')::date,
  ticket_number integer not null,
  customer_id uuid not null references public.customers(id),
  barber_id uuid references public.barbers(id),
  status text not null default 'waiting' check (status in ('waiting','in_progress','completed','cancelled')),
  payment_method text check (payment_method in ('pix','dinheiro','credito','debito')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique(queue_date,ticket_number)
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  queue_entry_id uuid not null references public.queue_entries(id) on delete cascade,
  item_type text not null check (item_type in ('service','product')),
  service_id uuid references public.services(id),
  product_id uuid references public.products(id),
  item_name_snapshot text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  check ((item_type='service' and service_id is not null and product_id is null) or
         (item_type='product' and product_id is not null and service_id is null))
);
alter table public.profiles enable row level security;
alter table public.barbers enable row level security;
alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.products enable row level security;
alter table public.queue_entries enable row level security;
alter table public.order_items enable row level security;
-- Políticas serão adicionadas após definir e testar o fluxo de identidade/OTP.
-- Por segurança, não liberar acesso público a dados pessoais nem confiar em user_metadata.