-- ── Step 1: Deduplicate existing conditions rows ────────────────────────────
-- For each group sharing the same lower(name), keep the row with the lowest id
-- (first inserted). Update testimonials to use the surviving name, then delete dupes.

do $$
declare
  r record;
  winner text;
begin
  for r in
    select lower(name) as lower_name, array_agg(name order by id) as variants
    from conditions
    group by lower(name)
    having count(*) > 1
  loop
    winner := r.variants[1];  -- first inserted wins

    -- Update testimonials: replace all variant names with the winner
    update testimonials
    set conditions = array(
      select case when lower(x) = r.lower_name then winner else x end
      from unnest(conditions) x
    )
    where conditions && r.variants;

    -- Delete all but the winner from conditions table
    delete from conditions
    where lower(name) = r.lower_name and name <> winner;

  end loop;
end $$;

-- ── Step 2: Drop the old case-sensitive unique constraint ───────────────────
alter table conditions drop constraint if exists conditions_name_key;

-- ── Step 3: Add case-insensitive unique index ───────────────────────────────
create unique index if not exists conditions_name_lower_idx on conditions (lower(name));
