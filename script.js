/* ==========================================================================
   WE ARE. — Global site script
   Shared behaviour that every page can rely on (currently: the mobile
   navigation toggle). Page-specific logic — like authentication — lives
   in its own file (see js/auth.js) so this file stays small and generic.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-navigation');

  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close the mobile menu after a nav link is chosen.
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
});
