// js/supabase-config.js
//
// WE ARE. — Supabase client configuration
// ----------------------------------------------------------------
// Fill in the two values below from your own Supabase project:
//   Supabase Dashboard → Project Settings → API
//
//   SUPABASE_URL              → "Project URL"
//     e.g. "https://abcdefghijkl.supabase.co"
//
//   SUPABASE_PUBLISHABLE_KEY  → "anon" / "public" key
//     (Supabase's newer dashboards may label this "publishable key" —
//     it is the same browser-safe key, just a renamed field.)
//
// ----------------------------------------------------------------
// SECURITY — READ THIS BEFORE DEPLOYING
// ----------------------------------------------------------------
// Only ever put the "anon" / "publishable" key in this file.
//
// The "service_role" / secret key grants full, unrestricted database
// access and BYPASSES Row Level Security entirely. It must NEVER be
// placed in this file, in js/signup.js, in any other file served to
// the browser, or committed to a public repository. If that key is
// ever exposed, rotate it immediately from the Supabase dashboard.
//
// The anon key is safe to ship to the browser: every request made
// with it is still constrained by the Row Level Security policies
// defined in sql/signup_schema.sql. It is a public identifier for
// your project, not a secret.
// ----------------------------------------------------------------

export const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'YOUR-SUPABASE-ANON-PUBLIC-KEY';
