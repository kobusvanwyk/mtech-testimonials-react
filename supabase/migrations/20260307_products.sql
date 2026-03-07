-- Products table for admin-managed product list
create table if not exists products (
    id         serial primary key,
    name       text not null unique,
    active     boolean default true,
    sort_order integer default 0,
    created_at timestamptz default now()
);

-- Seed with current product list
insert into products (name, sort_order) values
    ('Ambrotose Complex',        1),
    ('Advanced Ambrotose',       2),
    ('Ambrotose AO',             3),
    ('BounceBack',               4),
    ('Cardio Balance',           5),
    ('Catalyst',                 6),
    ('GI-ProBalance',            7),
    ('ImmunoSTART',              8),
    ('Manapol',                  9),
    ('NutriVerus',              10),
    ('Omega 3',                 11),
    ('OsoLean',                 12),
    ('PLUS',                    13),
    ('Superfood Greens and Reds',14),
    ('TruPLENISH',              15)
on conflict (name) do nothing;

-- RLS
alter table products enable row level security;
create policy "Public can read products"          on products for select using (true);
create policy "Authenticated can manage products" on products for all using (auth.role() = 'authenticated');
