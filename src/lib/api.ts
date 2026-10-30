import { supabase } from './supabase.ts';

export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };

  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }

  return fetch(input, { ...init, headers });
}
