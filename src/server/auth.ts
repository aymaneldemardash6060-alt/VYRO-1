import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from 'express';

const supabaseUrl = (
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
)?.trim();
const supabasePublishableKey = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY
)?.trim();

const authClient = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      }
    })
  : null;

export const requireAdmin: RequestHandler = async (req, res, next) => {
  if (!authClient) {
    res.status(503).json({ success: false, error: 'Authentication is not configured on the server.' });
    return;
  }

  const authorization = req.header('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ success: false, error: 'Sign-in is required.' });
    return;
  }

  try {
    const { data, error } = await authClient.auth.getUser(match[1]);
    if (error || !data.user) {
      res.status(401).json({ success: false, error: 'Your session is invalid or expired.' });
      return;
    }

    if (data.user.app_metadata?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Administrator access is required.' });
      return;
    }

    next();
  } catch {
    res.status(401).json({ success: false, error: 'Could not verify the user session.' });
  }
};
