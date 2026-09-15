/* ==========================================================================
   WE ARE. — ui.js
   Reusable UI helpers shared by any form/flow on the site: field errors,
   form-level status banners, button loading state, the password
   strength meter display, and toast messages. auth.js calls these
   rather than duplicating DOM-manipulation code.
   ========================================================================== */

(function () {
  function fieldWrapper(field) {
    return field.closest('.form-field') || field.closest('.form-field-checkbox');
  }

  function showFieldError(field, message) {
    const wrapper = fieldWrapper(field);
    const errorEl = wrapper ? wrapper.querySelector('.field-error') : null;
    if (wrapper) wrapper.classList.add('has-error');
    if (errorEl) errorEl.textContent = message;
    field.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(field) {
    const wrapper = fieldWrapper(field);
    const errorEl = wrapper ? wrapper.querySelector('.field-error') : null;
    if (wrapper) wrapper.classList.remove('has-error');
    if (errorEl) errorEl.textContent = '';
    field.removeAttribute('aria-invalid');
  }

  function showFormStatus(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.className = 'form-status is-visible status-' + type;
  }

  function clearFormStatus(el) {
    if (!el) return;
    el.textContent = '';
    el.className = 'form-status';
  }

  function setButtonLoading(button, isLoading) {
    if (!button) return;
    button.classList.toggle('is-loading', isLoading);
    button.disabled = isLoading;
    button.setAttribute('aria-disabled', isLoading ? 'true' : 'false');
  }

  function setButtonDisabled(button, isDisabled) {
    if (!button) return;
    button.disabled = isDisabled;
    button.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
  }

  function updatePasswordStrengthMeter(fillEl, labelEl, password) {
    if (!fillEl || !labelEl) return;
    if (!password) {
      fillEl.style.width = '0%';
      fillEl.style.backgroundColor = 'transparent';
      labelEl.textContent = 'Use at least 8 characters, mixing letters, numbers and symbols.';
      return;
    }
    const result = window.WeAreValidation.evaluatePasswordStrength(password);
    fillEl.style.width = (result.score / result.max) * 100 + '%';
    fillEl.style.backgroundColor = result.color;
    labelEl.textContent = 'Password strength: ' + result.label;
  }

  function initPasswordToggles(root) {
    const scope = root || document;
    scope.querySelectorAll('.password-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        button.textContent = isHidden ? 'Hide' : 'Show';
        button.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
        input.focus();
      });
    });
  }

  let toastContainer = null;
  function getToastContainer() {
    if (toastContainer) return toastContainer;
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  function showToast(message, type) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.textContent = message;
    container.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
    }, 4000);
  }

  window.WeAreUI = {
    showFieldError,
    clearFieldError,
    showFormStatus,
    clearFormStatus,
    setButtonLoading,
    setButtonDisabled,
    updatePasswordStrengthMeter,
    initPasswordToggles,
    showToast,
  };
})();
