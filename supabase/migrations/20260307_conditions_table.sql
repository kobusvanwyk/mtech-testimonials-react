-- Conditions table for admin-managed health conditions list
create table if not exists conditions (
    id          serial primary key,
    name        text not null unique,
    active      boolean default true,
    sort_order  integer default 0,
    created_at  timestamptz default now()
);

-- Seed from existing conditions already used in testimonials
insert into conditions (name)
select distinct unnest(conditions)
from testimonials
where conditions is not null
on conflict (name) do nothing;

-- RLS
alter table conditions enable row level security;
create policy "Public can read conditions"          on conditions for select using (true);
create policy "Authenticated can manage conditions" on conditions for all using (auth.role() = 'authenticated');

-- Also ensure products table has the same structure if not already set up
create table if not exists products (
    id          serial primary key,
    name        text not null unique,
    active      boolean default true,
    sort_order  integer default 0,
    created_at  timestamptz default now()
);

-- Seed products from constants if table is empty
insert into products (name) values
    ('Ambrotose Complex'),
    ('Advanced Ambrotose'),
    ('Ambrotose AO'),
    ('BounceBack'),
    ('Cardio Balance'),
    ('Catalyst'),
    ('GI-ProBalance'),
    ('ImmunoSTART'),
    ('Manapol'),
    ('NutriVerus'),
    ('Omega 3'),
    ('OsoLean'),
    ('PLUS'),
    ('Superfood Greens and Reds'),
    ('TruPLENISH')
on conflict (name) do nothing;

-- RLS
alter table products enable row level security;
create policy "Public can read products"          on products for select using (true);
create policy "Authenticated can manage products" on products for all using (auth.role() = 'authenticated');
