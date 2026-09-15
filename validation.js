/* ==========================================================================
   WE ARE. — validation.js
   Reusable, pure validation functions. No DOM access here — each
   function takes plain values and returns { valid, message }, so it can
   be reused by signup, login, profile editing, or a future settings
   page without dragging DOM code along with it.

   auth.js wires these results to the on-screen fields via ui.js.

   IMPORTANT: this is UX validation only. It makes mistakes easy to
   catch early, but it is never the source of truth — Supabase Auth and
   the database's Row Level Security policies must enforce the same
   rules (and more) on the server side.
   ========================================================================== */

(function () {
  const MIN_SIGNUP_AGE = 18;
  const MIN_PASSWORD_LENGTH = 8;

  function calculateAge(dobString) {
    const dob = new Date(dobString + 'T00:00:00');
    if (Number.isNaN(dob.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const hasHadBirthdayThisYear =
      today.getMonth() > dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
    if (!hasHadBirthdayThisYear) age -= 1;
    return age;
  }

  function isValidEmail(value) {
    // Deliberately simple — real validation happens server-side / at Supabase.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isValidUsername(value) {
    return /^[a-zA-Z0-9_.]{3,20}$/.test(value);
  }

  function evaluatePasswordStrength(password) {
    let score = 0;
    if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    const levels = [
      { label: 'Very weak', color: '#B3261E' },
      { label: 'Weak', color: '#B3261E' },
      { label: 'Fair', color: '#E15C31' },
      { label: 'Good', color: '#C24A24' },
      { label: 'Strong', color: '#2F6B4F' },
      { label: 'Very strong', color: '#2F6B4F' },
    ];

    return { score, max: 5, ...levels[score] };
  }

  function ok() {
    return { valid: true, message: '' };
  }
  function fail(message) {
    return { valid: false, message };
  }

  function validateFullName(value) {
    if (!value || !value.trim()) return fail('Enter your full name.');
    return ok();
  }

  function validateUsername(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return fail('Choose a username.');
    if (!isValidUsername(trimmed)) {
      return fail('3–20 characters: letters, numbers, underscores or periods only.');
    }
    return ok();
  }

  function validateEmail(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return fail('Enter your email address.');
    if (!isValidEmail(trimmed)) return fail('Enter a valid email address.');
    return ok();
  }

  function validatePassword(value) {
    if (!value) return fail('Create a password.');
    if (value.length < MIN_PASSWORD_LENGTH) {
      return fail(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    return ok();
  }

  function validateConfirmPassword(password, confirmValue) {
    if (!confirmValue) return fail('Confirm your password.');
    if (confirmValue !== password) return fail('Passwords do not match.');
    return ok();
  }

  function validateDateOfBirth(value) {
    if (!value) return fail('Enter your date of birth.');
    const age = calculateAge(value);
    if (age === null) return fail('Enter a valid date.');
    if (age < 0 || age > 130) return fail('Enter a valid date of birth.');
    if (age < MIN_SIGNUP_AGE) {
      return fail(
        `You need to be at least ${MIN_SIGNUP_AGE} to create a WE ARE. account. ` +
        `We're sorry we can't sign you up right now.`
      );
    }
    return ok();
  }

  function validateCountry(value) {
    if (!value) return fail('Select your country.');
    return ok();
  }

  function validateTerms(checked) {
    if (!checked) return fail('You need to agree before creating an account.');
    return ok();
  }

  window.WeAreValidation = {
    MIN_SIGNUP_AGE,
    MIN_PASSWORD_LENGTH,
    calculateAge,
    isValidEmail,
    isValidUsername,
    evaluatePasswordStrength,
    validateFullName,
    validateUsername,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    validateDateOfBirth,
    validateCountry,
    validateTerms,
  };
})();
