import { SupabaseDatabase } from './supabase-database.ts';

// All production reads and writes are persisted through Supabase.
export { SupabaseDatabase };
export const db = new SupabaseDatabase();
