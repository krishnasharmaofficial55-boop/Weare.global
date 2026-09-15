/* ==========================================================================
   WE ARE. — auth.js
   Owns the signup flow only. Field-level rules live in validation.js,
   DOM helpers live in ui.js, and the Supabase client lives in
   supabase-client.js — this file wires the three together so there is
   one signup flow and no duplicated auth logic.

   Load order (see signup.html):
     validation.js → ui.js → supabase-client.js → auth.js

   Flow:
     signup.html → validation.js → auth.js → Supabase Auth →
     authenticated user → profile row → onboarding.html
   ========================================================================== */

(function () {
  const V = window.WeAreValidation;
  const UI = window.WeAreUI;

  /* Where people land after a signup that doesn't require email verification. */
  const POST_SIGNUP_REDIRECT = 'onboarding.html';
  /* Used as the emailRedirectTo target for the verification email. */
  const EMAIL_VERIFY_REDIRECT = 'login.html';

  const FRIENDLY_SUPABASE_ERRORS = {
    'User already registered': 'An account with this email already exists. Try logging in instead.',
  };

  function friendlyErrorMessage(rawMessage) {
    if (!rawMessage) return 'Something specific went wrong, but no details were returned. Please try again.';
    const match = Object.keys(FRIENDLY_SUPABASE_ERRORS).find((key) => rawMessage.includes(key));
    return match ? FRIENDLY_SUPABASE_ERRORS[match] : rawMessage;
  }

  function initSignupForm() {
    const form = document.getElementById('signup-form');
    if (!form) return;

    const fields = {
      fullName: document.getElementById('signup-fullname'),
      username: document.getElementById('signup-username'),
      email: document.getElementById('signup-email'),
      password: document.getElementById('signup-password'),
      confirmPassword: document.getElementById('signup-confirm-password'),
      dob: document.getElementById('signup-dob'),
      country: document.getElementById('signup-country'),
      terms: document.getElementById('signup-terms'),
    };
    // Optional field — intentionally excluded from `fields` above so it's
    // never treated as required by validateAll()/live validation.
    const marketingOptIn = document.getElementById('signup-marketing');

    const statusBanner = document.getElementById('signup-status');
    const successState = document.getElementById('signup-success');
    const submitButton = document.getElementById('signup-submit');
    const strengthFill = document.getElementById('password-strength-fill');
    const strengthLabel = document.getElementById('password-strength-label');

    let isSubmitting = false;

    const validators = {
      fullName: () => V.validateFullName(fields.fullName.value),
      username: () => V.validateUsername(fields.username.value),
      email: () => V.validateEmail(fields.email.value),
      password: () => V.validatePassword(fields.password.value),
      confirmPassword: () => V.validateConfirmPassword(fields.password.value, fields.confirmPassword.value),
      dob: () => V.validateDateOfBirth(fields.dob.value),
      country: () => V.validateCountry(fields.country.value),
      terms: () => V.validateTerms(fields.terms.checked),
    };

    function validateField(name) {
      const field = fields[name];
      const result = validators[name]();
      if (result.valid) {
        UI.clearFieldError(field);
      } else {
        UI.showFieldError(field, result.message);
      }
      return result.valid;
    }

    function validateAll() {
      let firstInvalid = null;
      let allValid = true;
      Object.keys(fields).forEach((name) => {
        const ok = validateField(name);
        if (!ok) {
          allValid = false;
          if (!firstInvalid) firstInvalid = fields[name];
        }
      });
      if (firstInvalid) firstInvalid.focus();
      return allValid;
    }

    // Live validation as people move through the form.
    Object.keys(fields).forEach((name) => {
      const field = fields[name];
      if (!field) return;
      const eventName = field.type === 'checkbox' ? 'change' : 'blur';
      field.addEventListener(eventName, () => validateField(name));
    });

    // Re-check "confirm password" and update the strength meter live.
    if (fields.password) {
      fields.password.addEventListener('input', () => {
        UI.updatePasswordStrengthMeter(strengthFill, strengthLabel, fields.password.value);
        if (fields.confirmPassword.value) validateField('confirmPassword');
      });
    }

    // Show/hide password toggles (shared helper — also used by login.html).
    UI.initPasswordToggles(form);

    async function createProfileRecord(supabaseClient, userId) {
      // Best practice: create the profile row with a Postgres trigger on
      // auth.users (server-side, always consistent, no RLS gymnastics
      // needed from the client). This client-side attempt is a fallback
      // for setups that don't have that trigger yet — it relies on an
      // RLS policy that lets a newly authenticated user insert their own
      // profile row only (e.g. `auth.uid() = id`).
      try {
        await supabaseClient.from('profiles').insert({
          id: userId,
          full_name: fields.fullName.value.trim(),
          username: fields.username.value.trim(),
          country: fields.country.value,
          date_of_birth: fields.dob.value,
        });
      } catch (err) {
        console.error('[WE ARE.] Profile row could not be created from the client:', err);
        // Non-fatal: the auth account still exists. Surface this to your
        // logging/monitoring rather than blocking the signup success state.
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (isSubmitting) return;

      UI.clearFormStatus(statusBanner);

      if (!validateAll()) {
        UI.showFormStatus(statusBanner, 'Please fix the highlighted fields before continuing.', 'error');
        return;
      }

      const SB = window.WeAreSupabase;
      if (!SB || !SB.isConfigured) {
        UI.showFormStatus(
          statusBanner,
          'Signup isn\u2019t connected to an account system yet. Configure Supabase ' +
          '(see js/supabase-client.js) to enable real account creation.',
          'error'
        );
        return;
      }

      isSubmitting = true;
      UI.setButtonLoading(submitButton, true);

      try {
        const { data, error } = await SB.client.auth.signUp({
          email: fields.email.value.trim(),
          password: fields.password.value,
          options: {
            // Frontend-supplied metadata only — never a role or admin flag.
            data: {
              full_name: fields.fullName.value.trim(),
              username: fields.username.value.trim(),
              date_of_birth: fields.dob.value,
              country: fields.country.value,
              marketing_opt_in: Boolean(marketingOptIn && marketingOptIn.checked),
            },
            emailRedirectTo: new URL(EMAIL_VERIFY_REDIRECT, window.location.href).toString(),
          },
        });

        if (error) {
          UI.showFormStatus(statusBanner, friendlyErrorMessage(error.message), 'error');
          return;
        }

        if (data && data.user) {
          await createProfileRecord(SB.client, data.user.id);
        }

        const needsEmailVerification = !(data && data.session);

        form.classList.add('is-hidden');
        if (successState) {
          successState.classList.add('is-visible');
          const successText = successState.querySelector('.auth-success-text');
          if (successText) {
            successText.textContent = needsEmailVerification
              ? 'Check your inbox to confirm your email, then log in to finish setting up your account.'
              : 'Taking you to WE ARE. now.';
          }
        }

        if (!needsEmailVerification) {
          window.setTimeout(() => {
            window.location.href = POST_SIGNUP_REDIRECT;
          }, 1200);
        }
      } catch (err) {
        console.error('[WE ARE.] Unexpected signup error:', err);
        UI.showFormStatus(
          statusBanner,
          'Something went wrong on our end while creating your account. Please try again in a moment.',
          'error'
        );
      } finally {
        isSubmitting = false;
        UI.setButtonLoading(submitButton, false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initSignupForm();
  });
})();
