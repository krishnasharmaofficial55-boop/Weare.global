/* =========================================================================
   WE ARE.  —  script.js
   "You were never the only one."

   Frontend interaction layer only. This file does not implement real
   authentication, storage, or messaging — every place that would need a
   backend is marked with an "Integration point" comment. Safe to include,
   unchanged, on every page: every module checks that its markup exists
   before doing anything, so pages without a given feature are unaffected.
   ========================================================================= */

(function () {
  "use strict";

  /* =======================================================================
     0. CONFIG
     ======================================================================= */

  var MIN_SIGNUP_AGE = 16; // Keep in sync with any age copy in the markup.
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var MOBILE_NAV_BREAKPOINT = 840; // Must match the header nav breakpoint in style.css.

  var prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =======================================================================
     1. SMALL UTILITIES
     ======================================================================= */

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function debounce(fn, delay) {
    var timer = null;
    return function debounced() {
      var args = arguments;
      var context = this;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  }

  /**
   * Runs an init function in isolation so one broken module never takes
   * the rest of the page down with it. Logs a single, quiet warning —
   * never throws, never floods the console.
   */
  function safeInit(name, fn) {
    try {
      fn();
    } catch (error) {
      if (window.console && typeof console.warn === "function") {
        console.warn("[WE ARE.] " + name + " did not initialize.", error);
      }
    }
  }

  /* =======================================================================
     2. MOBILE NAVIGATION
     ======================================================================= */

  function initMobileNav() {
    var toggle = document.getElementById("nav-toggle");
    var nav = document.getElementById("primary-navigation");
    if (!toggle || !nav) return;

    var toggleLabel = toggle.querySelector(".visually-hidden");
    var isOpen = false;

    function setOpen(open) {
      isOpen = open;
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      nav.dataset.open = String(open);
      if (toggleLabel) {
        toggleLabel.textContent = open ? "Close menu" : "Open menu";
      }
      // Prevent the page behind the menu from scrolling while it's open.
      document.body.style.overflow = open ? "hidden" : "";
    }

    function closeNav(returnFocus) {
      if (!isOpen) return;
      setOpen(false);
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", function () {
      setOpen(!isOpen);
      if (isOpen) {
        var firstLink = nav.querySelector(".nav-link");
        if (firstLink) firstLink.focus();
      }
    });

    // Selecting any nav link closes the menu.
    nav.addEventListener("click", function (event) {
      var link = event.target.closest ? event.target.closest(".nav-link") : null;
      if (link) closeNav(false);
    });

    // Escape closes the menu and returns focus to the toggle button.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen) closeNav(true);
    });

    // If the viewport grows back to desktop width, drop the open state.
    window.addEventListener(
      "resize",
      debounce(function () {
        if (isOpen && window.innerWidth > MOBILE_NAV_BREAKPOINT) closeNav(false);
      }, 150)
    );
  }

  /* =======================================================================
     3. HEADER SCROLL STATE
     ======================================================================= */

  function initHeaderScroll() {
    var header = document.getElementById("site-header");
    if (!header) return;

    var ticking = false;

    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    }

    update();

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* =======================================================================
     4. PASSWORD VISIBILITY
     ======================================================================= */

  function initPasswordToggles() {
    qsa(".password-toggle").forEach(function (button) {
      var targetId = button.getAttribute("aria-controls");
      var input = targetId ? document.getElementById(targetId) : null;
      if (!input) return;

      button.addEventListener("click", function () {
        var willShow = input.type === "password";
        input.type = willShow ? "text" : "password";
        button.setAttribute("aria-pressed", String(willShow));
        button.setAttribute("aria-label", willShow ? "Hide password" : "Show password");
      });
    });
  }

  /* =======================================================================
     5. FORM VALIDATION HELPERS
     (shared by login, signup and contact — nothing here talks to a server)
     ======================================================================= */

  function getFieldWrapper(input) {
    return (input.closest && input.closest(".field")) || input.parentElement;
  }

  function setFieldError(input, message) {
    if (!input) return;
    var wrapper = getFieldWrapper(input);
    if (!wrapper) return;

    var errorEl = wrapper.querySelector(".field-error");
    if (!errorEl) {
      errorEl = document.createElement("span");
      errorEl.className = "field-error";
      errorEl.setAttribute("role", "alert");
      wrapper.appendChild(errorEl);
    }

    errorEl.textContent = message; // never innerHTML — this can include user-influenced text
    if (!errorEl.id) {
      errorEl.id = (input.id || input.name || "field") + "-error";
    }

    input.setAttribute("aria-invalid", "true");
    wrapper.classList.add("has-error");

    var describedBy = (input.getAttribute("aria-describedby") || "")
      .split(" ")
      .filter(Boolean);
    if (describedBy.indexOf(errorEl.id) === -1) describedBy.push(errorEl.id);
    input.setAttribute("aria-describedby", describedBy.join(" "));
  }

  function clearFieldError(input) {
    if (!input) return;
    input.removeAttribute("aria-invalid");
    var wrapper = getFieldWrapper(input);
    if (!wrapper) return;
    var errorEl = wrapper.querySelector(".field-error");
    if (errorEl) errorEl.textContent = "";
    wrapper.classList.remove("has-error");
  }

  function validateRequired(input, label) {
    if (!input) return true; // a field that doesn't exist on this page can't block it
    var isChecked = input.type === "checkbox" ? input.checked : Boolean(input.value.trim());
    if (!isChecked) {
      setFieldError(input, (label || "This field") + " is required.");
      return false;
    }
    clearFieldError(input);
    return true;
  }

  function validateEmailField(input) {
    if (!input) return true;
    var value = input.value.trim();
    if (!value) return true; // validateRequired already reports empty fields
    if (!EMAIL_PATTERN.test(value)) {
      setFieldError(input, "Enter a valid email address.");
      return false;
    }
    clearFieldError(input);
    return true;
  }

  function validatePasswordMatch(passwordInput, confirmInput) {
    if (!passwordInput || !confirmInput) return true;
    if (!confirmInput.value) return true;
    if (passwordInput.value !== confirmInput.value) {
      setFieldError(confirmInput, "Passwords don't match.");
      return false;
    }
    clearFieldError(confirmInput);
    return true;
  }

  function calculateAge(dobValue) {
    var dob = new Date(dobValue + "T00:00:00");
    var now = new Date();
    var age = now.getFullYear() - dob.getFullYear();
    var monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age -= 1;
    }
    return age;
  }

  function validateDateOfBirthField(input, minAge) {
    if (!input) return true;
    var value = input.value;
    if (!value) return true;

    var selected = new Date(value + "T00:00:00");
    var today = new Date();

    if (isNaN(selected.getTime()) || selected > today) {
      setFieldError(input, "Enter a valid date of birth.");
      return false;
    }

    if (calculateAge(value) < minAge) {
      setFieldError(input, "You must be at least " + minAge + " to create an account.");
      return false;
    }

    clearFieldError(input);
    return true;
  }

  function showFormMessage(box, message, tone) {
    if (!box) return;
    box.textContent = message;
    box.classList.add("is-visible");
    box.dataset.tone = tone || "error";
  }

  function clearFormMessage(box) {
    if (!box) return;
    box.textContent = "";
    box.classList.remove("is-visible");
    delete box.dataset.tone;
  }

  /**
   * Toggles a button's loading/disabled state and mirrors it onto the
   * enclosing form so CSS (.is-loading .spinner) can react to it.
   */
  function setButtonLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.setAttribute("aria-busy", String(isLoading));
    var form = button.closest ? button.closest("form") : null;
    if (form) form.classList.toggle("is-loading", isLoading);
  }

  /* =======================================================================
     6. LOGIN FORM
     ======================================================================= */

  function initLoginForm() {
    var form = document.getElementById("login-form");
    if (!form) return;

    var submitButton = form.querySelector('button[type="submit"]');
    var errorBox = form.querySelector(".form-error") || document.getElementById("form-error");
    var email = form.querySelector("#email, [name='email']");
    var password = form.querySelector("#password, [name='password']");

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      // Prevent accidental double submission from a fast double-click.
      if (form.dataset.submitting === "true") return;

      clearFormMessage(errorBox);

      var isValid = true;
      isValid = validateRequired(email, "Email") && isValid;
      isValid = validateEmailField(email) && isValid;
      isValid = validateRequired(password, "Password") && isValid;

      if (!isValid) {
        showFormMessage(errorBox, "Please fix the highlighted fields before continuing.", "error");
        return; // button state was never changed, so nothing needs restoring
      }

      form.dataset.submitting = "true";
      setButtonLoading(submitButton, true);

      /*
       * Integration point: send { email, password } to your
       * authentication endpoint over HTTPS here, e.g.
       *   fetch("/api/login", { method: "POST", body: ... })
       * This script never checks, stores, or transmits credentials
       * itself — it only validates their shape client-side.
       */
      window.setTimeout(function () {
        form.dataset.submitting = "false";
        setButtonLoading(submitButton, false);
        showFormMessage(errorBox, "Sign-in isn't connected to a backend yet.", "info");
      }, 900);
    });
  }

  /* =======================================================================
     7. SIGNUP FORM
     ======================================================================= */

  function initSignupForm() {
    var form = document.getElementById("signup-form");
    if (!form) return;

    var submitButton = document.getElementById("submit-button") || form.querySelector('button[type="submit"]');
    var errorBox = document.getElementById("form-error") || form.querySelector(".form-error");

    var fullName = document.getElementById("full-name");
    var username = document.getElementById("username");
    var email = document.getElementById("email");
    var password = document.getElementById("password");
    var confirmPassword = document.getElementById("confirm-password");
    var dob = document.getElementById("dob");
    var country = document.getElementById("country");
    var terms = document.getElementById("terms");

    // Keep the date picker from offering future dates at all.
    if (dob) {
      dob.setAttribute("max", new Date().toISOString().slice(0, 10));
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (form.dataset.submitting === "true") return;

      clearFormMessage(errorBox);

      var isValid = true;
      isValid = validateRequired(fullName, "Full name") && isValid;
      isValid = validateRequired(username, "Username") && isValid;
      isValid = validateRequired(email, "Email") && isValid;
      isValid = validateEmailField(email) && isValid;
      isValid = validateRequired(password, "Password") && isValid;
      isValid = validateRequired(confirmPassword, "Password confirmation") && isValid;
      isValid = validatePasswordMatch(password, confirmPassword) && isValid;
      isValid = validateRequired(dob, "Date of birth") && isValid;
      isValid = validateDateOfBirthField(dob, MIN_SIGNUP_AGE) && isValid;
      isValid = validateRequired(country, "Country") && isValid;
      isValid = validateRequired(terms, "Agreement to the Terms and Privacy Policy") && isValid;

      if (!isValid) {
        showFormMessage(errorBox, "Please fix the highlighted fields before continuing.", "error");
        return;
      }

      form.dataset.submitting = "true";
      setButtonLoading(submitButton, true);

      /*
       * Integration point: replace this block with a real request to
       * your account-creation endpoint, e.g.
       *   fetch("/api/signup", { method: "POST", body: ... })
       * Hash passwords server-side. No account is created or stored
       * locally by this script — this is validation only.
       */
      window.setTimeout(function () {
        form.dataset.submitting = "false";
        setButtonLoading(submitButton, false);
        showFormMessage(errorBox, "Account creation isn't connected to a backend yet.", "info");
      }, 900);
    });
  }

  /* =======================================================================
     8. CONTACT FORM
     ======================================================================= */

  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var submitButton = form.querySelector('button[type="submit"]');
    var errorBox = form.querySelector(".form-error") || document.getElementById("form-error");
    var name = form.querySelector("#name, [name='name']");
    var email = form.querySelector("#email, [name='email']");
    var message = form.querySelector("#message, [name='message']");

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (form.dataset.submitting === "true") return;

      clearFormMessage(errorBox);

      var isValid = true;
      isValid = validateRequired(name, "Name") && isValid;
      isValid = validateRequired(email, "Email") && isValid;
      isValid = validateEmailField(email) && isValid;
      isValid = validateRequired(message, "Message") && isValid;

      if (!isValid) {
        showFormMessage(errorBox, "Please fix the highlighted fields before sending.", "error");
        return;
      }

      form.dataset.submitting = "true";
      setButtonLoading(submitButton, true);

      /*
       * Integration point: send the form data to your mail/contact
       * endpoint here. Nothing is transmitted anywhere by this script,
       * so the message below must stay honest about that.
       */
      window.setTimeout(function () {
        form.dataset.submitting = "false";
        setButtonLoading(submitButton, false);
        showFormMessage(
          errorBox,
          "This form is ready for backend integration — your message hasn't actually been sent yet.",
          "info"
        );
      }, 900);
    });
  }

  /* =======================================================================
     9. PROFILE PAGE
     ======================================================================= */

  function initProfileTabs() {
    var tabs = qsa(".profile-tab");
    if (!tabs.length) return;

    function activate(tab) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.classList.toggle("is-active", selected);
        t.setAttribute("aria-selected", String(selected));
        t.setAttribute("tabindex", selected ? "0" : "-1");

        var panelId = t.getAttribute("aria-controls");
        var panel = panelId ? document.getElementById(panelId) : null;
        if (panel) panel.hidden = !selected;
      });
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function (event) {
        event.preventDefault();
        activate(tab);
      });

      tab.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        var nextIndex = event.key === "ArrowRight" ? index + 1 : index - 1;
        if (nextIndex < 0) nextIndex = tabs.length - 1;
        if (nextIndex >= tabs.length) nextIndex = 0;
        var nextTab = tabs[nextIndex];
        activate(nextTab);
        nextTab.focus();
      });
    });
  }

  function initConnectButtons() {
    qsa("[data-connect-toggle]").forEach(function (button) {
      var defaultLabel = button.dataset.labelDefault || button.textContent.trim() || "Connect";
      var activeLabel = button.dataset.labelActive || "Requested";

      button.addEventListener("click", function () {
        var isActive = button.getAttribute("aria-pressed") === "true";
        var next = !isActive;

        // Visual state only. No connection is created, sent, or stored —
        // this is a placeholder until a real backend is wired up.
        button.setAttribute("aria-pressed", String(next));
        button.classList.toggle("is-active", next);
        button.textContent = next ? activeLabel : defaultLabel;
      });
    });
  }

  /* =======================================================================
     10. COMMUNITY PAGE — filtering and search
     ======================================================================= */

  function initCommunityPage() {
    var grid = qs(".community-grid");
    if (!grid) return;

    var cards = qsa(".community-card", grid);
    var filterButtons = qsa("[data-filter]");
    var searchInput = document.getElementById("community-search") || qs("[data-community-search]");
    var emptyState = qs("[data-empty-state]");

    var activeCategory = "all";
    var searchTerm = "";

    function applyFilters() {
      var visibleCount = 0;

      cards.forEach(function (card) {
        var category = card.dataset.category || "all";
        var text = card.textContent.toLowerCase();
        var matchesCategory = activeCategory === "all" || category === activeCategory;
        var matchesSearch = !searchTerm || text.indexOf(searchTerm) !== -1;
        var visible = matchesCategory && matchesSearch;

        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      if (emptyState) emptyState.hidden = visibleCount !== 0;
    }

    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        activeCategory = button.dataset.filter || "all";
        filterButtons.forEach(function (b) {
          var selected = b === button;
          b.classList.toggle("is-active", selected);
          b.setAttribute("aria-pressed", String(selected));
        });
        applyFilters();
      });
    });

    if (searchInput) {
      searchInput.addEventListener(
        "input",
        debounce(function () {
          searchTerm = searchInput.value.trim().toLowerCase();
          applyFilters();
        }, 150)
      );
    }

    applyFilters();
  }

  /* =======================================================================
     11. MESSAGES PAGE
     ======================================================================= */

  /**
   * Integration point for a real-time backend (e.g. Supabase Realtime).
   * Currently a no-op — it does not deliver, sync, or persist anything.
   * Wire this up when a backend exists; until then, messages only ever
   * exist in this browser tab's DOM.
   */
  function sendMessageToBackend(conversationId, messageText) {
    return Promise.resolve({ delivered: false, conversationId: conversationId, text: messageText });
  }

  function appendMessageBubble(list, text, variant) {
    var bubble = document.createElement("p");
    bubble.className = "message-bubble message-bubble--" + variant;
    bubble.textContent = text; // textContent only — never innerHTML with user input
    list.appendChild(bubble);
    list.scrollTop = list.scrollHeight;
  }

  function autoResizeTextarea(field) {
    if (field.tagName !== "TEXTAREA") return;
    field.style.height = "auto";
    field.style.height = field.scrollHeight + "px";
  }

  function initMessagesPage() {
    var layout = qs(".messages-layout");
    if (!layout) return;

    var conversationItems = qsa(".conversation-item", layout);

    function selectConversation(item) {
      conversationItems.forEach(function (el) {
        el.classList.remove("is-active");
        el.removeAttribute("aria-current");
      });
      item.classList.add("is-active");
      item.setAttribute("aria-current", "true");
    }

    conversationItems.forEach(function (item) {
      if (!item.hasAttribute("tabindex")) item.setAttribute("tabindex", "0");

      item.addEventListener("click", function () {
        selectConversation(item);
      });

      item.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectConversation(item);
        }
      });
    });

    var composer = qs(".message-composer", layout);
    var list = qs(".message-list", layout);
    if (!composer || !list) return;

    var field = qs("input, textarea", composer);
    var sendButton = qs(".message-send", composer);
    if (!field) return;

    function handleSend() {
      var text = field.value.trim();
      if (!text) return;

      // This only renders the message in the current tab. It is not
      // delivered, synced, or stored anywhere.
      appendMessageBubble(list, text, "sent");
      field.value = "";
      autoResizeTextarea(field);

      var activeConversation = qs(".conversation-item.is-active", layout);
      var conversationId = activeConversation ? activeConversation.dataset.conversationId || null : null;
      sendMessageToBackend(conversationId, text);
    }

    field.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;

      if (field.tagName === "TEXTAREA") {
        if (event.shiftKey) return; // Shift+Enter inserts a newline as normal
        event.preventDefault();
        handleSend();
      } else {
        event.preventDefault();
        handleSend();
      }
    });

    if (field.tagName === "TEXTAREA") {
      field.addEventListener("input", function () {
        autoResizeTextarea(field);
      });
    }

    if (sendButton) {
      sendButton.addEventListener("click", handleSend);
    }
  }

  /* =======================================================================
     12. INITIALIZATION
     Every module is optional and self-checks for its markup, so this same
     file loads safely on every page in the site.
     ======================================================================= */

  function initAll() {
    safeInit("mobile navigation", initMobileNav);
    safeInit("header scroll state", initHeaderScroll);
    safeInit("password visibility", initPasswordToggles);
    safeInit("login form", initLoginForm);
    safeInit("signup form", initSignupForm);
    safeInit("contact form", initContactForm);
    safeInit("profile tabs", initProfileTabs);
    safeInit("profile connect buttons", initConnectButtons);
    safeInit("community filtering", initCommunityPage);
    safeInit("messages page", initMessagesPage);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
