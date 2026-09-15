// js/signup.js
//
// WE ARE. — Signup form controller
// ----------------------------------------------------------------
// Flow this file is responsible for:
//
//   signup.html (form)
//        ↓
//   this file: validate → supabase.auth.signUp()
//        ↓
//   Supabase Auth creates the row in auth.users
//        ↓
//   sql/signup_schema.sql trigger (public.handle_new_user)
//        ↓
//   a matching row appears in public.profiles
//
// This file never talks to public.profiles directly — profile
// creation is handled server-side by the database trigger, using
// the full_name/username passed through signUp()'s `options.data`.
// That keeps the frontend simple and means profile creation can't
// be skipped or tampered with by disabling JavaScript logic.
// ----------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const form = document.getElementById('signup-form');

// This module only does something on pages that actually have the
// signup form — safe to no-op elsewhere if it's ever reused.
if (form) {
  const messageBox = document.getElementById('signup-message');
  const submitBtn = document.getElementById('signup-submit');

  const fields = {
    full_name: document.getElementById('su-name'),
    username: document.getElementById('su-username'),
    email: document.getElementById('su-email'),
    password: document.getElementById('su-pass'),
    password_confirm: document.getElementById('su-pass-confirm'),
    terms: document.getElementById('su-terms'),
  };

  const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,30}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let submitting = false;

  form.addEventListener('submit', handleSubmit);

  async function handleSubmit(event) {
    event.preventDefault();

    // Guard against double submission (double click, slow network + Enter, etc).
    if (submitting) return;

    clearMessage();
    const errors = validate();

    if (Object.keys(errors).length > 0) {
      applyFieldErrors(errors);
      const firstInvalidField = Object.keys(errors)[0];
      fields[firstInvalidField]?.focus();
      showMessage('Please fix the highlighted fields and try again.', 'error');
      return;
    }

    const fullName = fields.full_name.value.trim();
    const username = fields.username.value.trim();
    const email = fields.email.value.trim();
    const password = fields.password.value;

    setLoading(true);

    let result;
    try {
      result = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Read by the public.handle_new_user() trigger via
          // raw_user_meta_data — this is how full_name/username reach
          // public.profiles without the frontend touching that table.
          data: {
            full_name: fullName,
            username: username,
          },
        },
      });
    } catch (networkError) {
      // Thrown for things like DNS/network failure, not a Supabase
      // "error" response — still needs a friendly, non-technical message.
      setLoading(false);
      showMessage(
        "We couldn't reach WE ARE. right now. Check your connection and try again.",
        'error'
      );
      return;
    }

    setLoading(false);

    const { data, error } = result;

    if (error) {
      showMessage(friendlyAuthError(error), 'error');
      return;
    }

    handleSignupSuccess(data);
  }

  function handleSignupSuccess(data) {
    // Supabase JS v2: if email confirmations are ON (the default),
    // data.user exists but data.session is null until the user clicks
    // the confirmation link. If confirmations are OFF, a session comes
    // back immediately and the user is already signed in.
    const needsEmailConfirmation = !!data?.user && !data?.session;

    form.reset();

    if (needsEmailConfirmation) {
      showMessage(
        "Account created! Check your email to confirm your address, then log in.",
        'success'
      );
      setTimeout(() => {
        window.location.href = 'login.html?confirmEmail=1';
      }, 2500);
    } else {
      showMessage('Account created! Taking you to log in…', 'success');
      setTimeout(() => {
        window.location.href = 'login.html?welcome=1';
      }, 1200);
    }
  }

  // ---------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------

  function validate() {
    const errors = {};

    const fullName = fields.full_name.value.trim();
    if (!fullName) {
      errors.full_name = 'Enter your full name.';
    }

    const username = fields.username.value.trim();
    if (!username) {
      errors.username = 'Choose a username.';
    } else if (!USERNAME_PATTERN.test(username)) {
      errors.username = '3–30 characters: letters, numbers and underscores only.';
    }

    const email = fields.email.value.trim();
    if (!email) {
      errors.email = 'Enter your email address.';
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.email = 'Enter a valid email address.';
    }

    const password = fields.password.value;
    if (!password) {
      errors.password = 'Choose a password.';
    } else if (password.length < 8) {
      errors.password = 'Use at least 8 characters.';
    }

    const confirm = fields.password_confirm.value;
    if (!confirm) {
      errors.password_confirm = 'Re-enter your password.';
    } else if (password && confirm !== password) {
      errors.password_confirm = 'Passwords don\u2019t match.';
    }

    if (!fields.terms.checked) {
      errors.terms = 'You need to accept the Terms and Community Guidelines.';
    }

    return errors;
  }

  function applyFieldErrors(errors) {
    // Clear old state first.
    Object.values(fields).forEach((input) => {
      const fieldWrap = input?.closest('.field');
      if (!fieldWrap) return;
      fieldWrap.classList.remove('error');
      const oldHint = fieldWrap.querySelector('.hint[data-error-hint="1"]');
      if (oldHint) oldHint.remove();
    });

    Object.entries(errors).forEach(([key, message]) => {
      const input = fields[key];
      const fieldWrap = input?.closest('.field');
      if (!fieldWrap) return;
      fieldWrap.classList.add('error');
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.dataset.errorHint = '1';
      hint.textContent = message;
      fieldWrap.appendChild(hint);
    });
  }

  // ---------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------

  function setLoading(isLoading) {
    submitting = isLoading;
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('is-loading', isLoading);
    submitBtn.querySelector('.btn-label').textContent = isLoading
      ? 'Creating account…'
      : 'Create account';
  }

  function showMessage(text, kind) {
    messageBox.textContent = text;
    messageBox.hidden = false;
    messageBox.classList.remove('is-error', 'is-success');
    messageBox.classList.add(kind === 'success' ? 'is-success' : 'is-error');
  }

  function clearMessage() {
    messageBox.hidden = true;
    messageBox.textContent = '';
    messageBox.classList.remove('is-error', 'is-success');
  }

  // Map Supabase Auth errors to friendly, non-technical copy. Falls back
  // to a generic message rather than surfacing raw error internals.
  function friendlyAuthError(error) {
    const msg = (error?.message || '').toLowerCase();

    if (msg.includes('already registered') || msg.includes('already exists')) {
      return 'An account with this email already exists. Try logging in instead.';
    }
    if (msg.includes('password')) {
      return 'That password doesn\u2019t meet the requirements — use at least 8 characters.';
    }
    if (msg.includes('email') && (msg.includes('invalid') || msg.includes('format'))) {
      return 'That email address doesn\u2019t look right — please double-check it.';
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return 'Too many attempts — please wait a moment and try again.';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return "We couldn't reach WE ARE. right now. Check your connection and try again.";
    }

    // Unknown/internal error shape: never echo it verbatim to the user.
    return 'Something went wrong creating your account. Please try again.';
  }
}
