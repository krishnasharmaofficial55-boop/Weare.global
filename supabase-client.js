/* ==========================================================================
   WE ARE. — supabase-client.js
   Single, shared Supabase client for the whole site. Every other script
   (auth.js, and later login/reset-password/profile scripts) should read
   the client from window.WeAreSupabase rather than creating its own —
   that's how we avoid duplicate auth systems.

   INTEGRATION POINT
   -----------------
   Set window.SUPABASE_URL and window.SUPABASE_PUBLIC_KEY (the anon/public
   key) from a small inline <script> in each page's <head>, BEFORE this
   file and the Supabase SDK load. Example:

     <script>
       window.SUPABASE_URL = 'https://your-project.supabase.co';
       window.SUPABASE_PUBLIC_KEY = 'your-anon-public-key';
     </script>
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
     <script src="js/supabase-client.js" defer></script>

   The anon/public key is safe to ship to the browser — it is designed
   for client-side use and does nothing without your Row Level Security
   policies behind it.

   NEVER put here, and never anywhere in the frontend:
     - the service-role key
     - a database password
     - any private/admin API key
   Those belong only in trusted server-side environments, never in a
   file the browser can read.

   This file does not invent placeholder credentials. If the project is
   not configured yet, window.WeAreSupabase.isConfigured is false and
   auth.js shows an honest message instead of faking a successful signup.
   ========================================================================== */

(function () {
  const SUPABASE_URL = window.SUPABASE_URL || '';
  const SUPABASE_PUBLIC_KEY = window.SUPABASE_PUBLIC_KEY || '';

  // If a Supabase client already exists elsewhere in the project, reuse it
  // instead of creating a second one.
  if (window.WeAreSupabase && window.WeAreSupabase.client) {
    return;
  }

  const sdkIsLoaded = Boolean(window.supabase && typeof window.supabase.createClient === 'function');
  const isConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY && sdkIsLoaded);

  let client = null;

  if (isConfigured) {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
  } else {
    console.warn(
      '[WE ARE.] Supabase is not configured yet. Set window.SUPABASE_URL and ' +
      'window.SUPABASE_PUBLIC_KEY, and make sure the Supabase JS SDK is loaded, ' +
      'before js/supabase-client.js runs. See the comment block at the top of ' +
      'this file.'
    );
  }

  window.WeAreSupabase = {
    client,
    isConfigured,
  };
})();
