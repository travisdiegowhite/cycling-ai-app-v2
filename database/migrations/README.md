# Database Migrations

## How to Apply Migrations

### Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of the migration file
5. Paste into the SQL editor
6. Click **Run** to execute

### Using Supabase CLI

```bash
supabase db push --file database/migrations/fix_target_duration_constraint.sql
```

---

## Migration: Fix Target Duration Constraint

**File**: `fix_target_duration_constraint.sql`
**Date**: 2025-10-06
**Issue**: The `target_duration` constraint didn't allow 0, which prevented rest days from being created

**What it does**:
- Drops the old constraint: `target_duration > 0`
- Adds new constraint: `target_duration >= 0`
- Allows rest days (0 duration) to be saved

**Required**: Yes - Training plans cannot be created without this fix

---

## Future Migrations

Add new migration files here with the naming convention:
- `YYYY-MM-DD_description.sql`
- Include a comment at the top explaining what the migration does
- Update this README with migration details
