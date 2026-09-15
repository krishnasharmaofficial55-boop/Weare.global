(function () {
  "use strict";

  function on(selector, event, handler) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener(event, handler);
    });
  }

  function wireTabs(tabSelector, tabAttr, paneSelector, paneAttr) {
    var tabs = document.querySelectorAll(tabSelector);
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("on"); });
        tab.classList.add("on");
        var key = tab.getAttribute(tabAttr);
        document.querySelectorAll(paneSelector).forEach(function (pane) {
          pane.style.display = pane.getAttribute(paneAttr) === key ? "" : "none";
        });
      });
    });
  }

  /* ---------------- generic: like buttons ---------------- */
  on(".like-btn", "click", function () {
    var liked = this.classList.toggle("liked");
    var match = this.textContent.trim().match(/\d+/);
    if (!match) return;
    var n = parseInt(match[0], 10) + (liked ? 1 : -1);
    this.innerHTML = this.innerHTML.replace(/\d+/, n);
  });

  /* ---------------- generic: post "more" menu ---------------- */
  on(".wa-more-btn", "click", function (e) {
    e.stopPropagation();
    var menu = this.nextElementSibling;
    document.querySelectorAll(".wa-more-menu").forEach(function (m) {
      if (m !== menu) m.classList.remove("show");
    });
    if (menu) menu.classList.toggle("show");
  });
  document.addEventListener("click", function () {
    document.querySelectorAll(".wa-more-menu").forEach(function (m) { m.classList.remove("show"); });
  });

  /* ---------------- generic: toggles (notification / privacy switches) ---------------- */
  on(".wa-toggle", "click", function () { this.classList.toggle("on"); });

  /* ---------------- generic: topic chip single-select ---------------- */
  document.querySelectorAll(".wa-chiprow").forEach(function (row) {
    row.querySelectorAll(".wa-topic-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        row.querySelectorAll(".wa-topic-chip").forEach(function (c) { c.classList.remove("on"); });
        chip.classList.add("on");
      });
    });
  });

  /* ---------------- generic: header search dropdown ---------------- */
  document.querySelectorAll(".wa-searchbar-wrap").forEach(function (wrap) {
    var input = wrap.querySelector("input");
    var results = wrap.querySelector(".wa-search-results");
    if (!input || !results) return;
    input.addEventListener("focus", function () { results.classList.add("show"); });
    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) results.classList.remove("show");
    });
  });

  /* ---------------- generic: composer post-type switcher ---------------- */
  var COMPOSER_EXTRAS = {
    text: "",
    image: '<div class="wa-post-img" style="height:90px;"></div>',
    video: '<div class="wa-post-img" style="height:90px;display:flex;align-items:center;justify-content:center;">▶ Video preview</div>',
    poll: '<div class="wa-poll-opt">Option 1</div><div class="wa-poll-opt">Option 2</div>',
    link: '<div class="wa-poll-opt">🔗 Paste a link to preview it here</div>',
    question: '<div class="wa-poll-opt">Ask something the community can actually answer</div>'
  };
  document.querySelectorAll(".wa-composer-block").forEach(function (block) {
    var types = block.querySelectorAll(".wa-type");
    var extra = block.querySelector(".wa-composer-extra");
    if (!types.length || !extra) return;
    types.forEach(function (btn) {
      btn.addEventListener("click", function () {
        types.forEach(function (b) { b.classList.remove("on"); });
        btn.classList.add("on");
        extra.innerHTML = COMPOSER_EXTRAS[btn.dataset.type] || "";
      });
    });
  });

  /* ---------------- generic: conversation row selection ---------------- */
  on(".wa-msg-row", "click", function () {
    document.querySelectorAll(".wa-msg-row").forEach(function (r) { r.classList.remove("active"); });
    this.classList.add("active");
  });

  /* ---------------- landing-page preview frame: sidebar pane switch ---------------- */
  var previewNav = document.querySelectorAll(".wa-nav-item[data-pane]");
  if (previewNav.length) {
    previewNav.forEach(function (btn) {
      btn.addEventListener("click", function () {
        previewNav.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        document.querySelectorAll(".wa-pane").forEach(function (p) { p.classList.remove("active"); });
        var pane = document.getElementById("pane-" + btn.dataset.pane);
        if (pane) pane.classList.add("active");
      });
    });
  }

  /* ---------------- landing-page preview frame: community modal ---------------- */
  var commData = {
    hardware: { name: "Indie Hardware", members: "18.2k members · Public", cover: "#1B3FCC", desc: "For people prototyping physical products on a budget — sensors, enclosures, firmware, and the occasional soldering disaster." },
    type: { name: "Type & Letterforms", members: "9.4k members · Public", cover: "#2F5DFF", desc: "Type nerds trading opinions on kerning, grotesques, and the fonts everyone secretly overuses." },
    owls: { name: "Night Owls Reading Club", members: "31.7k members · Public", cover: "#10192E", desc: "For people who read best after midnight. One book a month, no pressure to finish it." },
    founders: { name: "First-Time Founders", members: "44.9k members · Private", cover: "#6FA0FF", desc: "Building something for the first time and figuring it out as you go? So is everyone here." }
  };
  var modal = document.getElementById("wa-comm-modal");
  if (modal) {
    document.querySelectorAll(".wa-comm-card[data-comm]").forEach(function (card) {
      card.addEventListener("click", function () {
        var d = commData[card.dataset.comm];
        if (!d) return;
        document.getElementById("wa-modal-name").textContent = d.name;
        document.getElementById("wa-modal-members").textContent = d.members;
        document.getElementById("wa-modal-desc").textContent = d.desc;
        document.getElementById("wa-modal-cover").style.background = d.cover;
        modal.classList.add("show");
      });
    });
    var closeBtn = document.getElementById("wa-modal-close");
    if (closeBtn) closeBtn.addEventListener("click", function () { modal.classList.remove("show"); });
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.classList.remove("show"); });
  }

  /* ---------------- home.html: feed skeleton -> content ---------------- */
  var skel = document.getElementById("wa-feed-skeleton");
  var feed = document.getElementById("wa-feed-content");
  if (skel && feed) {
    window.setTimeout(function () {
      skel.style.display = "none";
      feed.classList.add("show");
    }, 450);
  }

  /* ---------------- community.html: on-page tabs ---------------- */
  wireTabs("[data-ctab]", "data-ctab", "[data-cpane]", "data-cpane");

  /* ---------------- profile.html: on-page tabs ---------------- */
  wireTabs("[data-ptab]", "data-ptab", "[data-ppane]", "data-ppane");

  /* ---------------- messages.html: chats / requests tabs ---------------- */
  wireTabs("[data-mtab]", "data-mtab", "[data-mpane]", "data-mpane");

  /* ---------------- profile.html: inline edit panel ---------------- */
  var editToggle = document.getElementById("wa-edit-toggle");
  var editPanel = document.getElementById("wa-edit-panel");
  if (editToggle && editPanel) {
    editToggle.addEventListener("click", function () {
      var open = editPanel.style.display !== "none";
      editPanel.style.display = open ? "none" : "block";
      editToggle.textContent = open ? "Edit profile" : "Editing…";
    });
    var saveBtn = document.getElementById("wa-edit-save");
    var cancelBtn = document.getElementById("wa-edit-cancel");
    if (saveBtn) saveBtn.addEventListener("click", function () {
      var name = document.getElementById("ef-name").value.trim();
      var bio = document.getElementById("ef-bio").value.trim();
      var loc = document.getElementById("ef-loc").value.trim();
      var nameEl = document.querySelector(".wa-profile-name");
      var bioEl = document.querySelector(".wa-profile-bio");
      var locEl = document.querySelector(".wa-profile-meta span");
      if (nameEl && name) nameEl.textContent = name;
      if (bioEl && bio) bioEl.textContent = bio;
      if (locEl && loc) locEl.textContent = "📍 " + loc;
      editPanel.style.display = "none";
      editToggle.textContent = "Edit profile";
    });
    if (cancelBtn) cancelBtn.addEventListener("click", function () {
      editPanel.style.display = "none";
      editToggle.textContent = "Edit profile";
    });
  }

  /* ---------------- search.html: live filter ---------------- */
  var pageSearch = document.getElementById("wa-page-search");
  if (pageSearch) {
    var stabs = document.querySelectorAll("[data-stab]");
    var activeCat = "all";
    stabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        stabs.forEach(function (t) { t.classList.remove("on"); });
        tab.classList.add("on");
        activeCat = tab.getAttribute("data-stab");
        runFilter();
      });
    });
    function runFilter() {
      var q = pageSearch.value.trim().toLowerCase();
      var anyVisible = false;
      document.querySelectorAll(".search-section[data-scat]").forEach(function (section) {
        var cat = section.getAttribute("data-scat");
        var catMatches = activeCat === "all" || activeCat === cat;
        var sectionHasVisibleRow = false;
        section.querySelectorAll(".result-row").forEach(function (row) {
          var hay = (row.getAttribute("data-name") || "").toLowerCase();
          var rowMatches = catMatches && (q === "" || hay.indexOf(q) !== -1);
          row.style.display = rowMatches ? "" : "none";
          if (rowMatches) sectionHasVisibleRow = true;
        });
        section.style.display = sectionHasVisibleRow ? "" : "none";
        if (sectionHasVisibleRow) anyVisible = true;
      });
      var empty = document.getElementById("wa-search-empty");
      if (empty) empty.style.display = anyVisible ? "none" : "block";
    }
    pageSearch.addEventListener("input", runFilter);
    runFilter();
  }

  /* ---------------- community.html: populate from ?c= query param ---------------- */
  var commDetail = document.getElementById("wa-comm-detail");
  if (commDetail && window.location.search) {
    var params = new URLSearchParams(window.location.search);
    var slug = params.get("c");
    var detailData = {
      hardware: { name: "Indie Hardware", members: "18.2k members · Public", cover: "#1B3FCC", desc: "For people prototyping physical products on a budget — sensors, enclosures, firmware, and the occasional soldering disaster." },
      type: { name: "Type & Letterforms", members: "9.4k members · Public", cover: "#2F5DFF", desc: "Type nerds trading opinions on kerning, grotesques, and the fonts everyone secretly overuses." },
      owls: { name: "Night Owls Reading Club", members: "31.7k members · Public", cover: "#10192E", desc: "For people who read best after midnight. One book a month, no pressure to finish it." },
      founders: { name: "First-Time Founders", members: "44.9k members · Private", cover: "#6FA0FF", desc: "Building something for the first time and figuring it out as you go? So is everyone here." },
      bees: { name: "Urban Beekeepers", members: "6.1k members · Public", cover: "#2F5DFF", desc: "Rooftop and backyard hives, swarm season panic, and where to find a mentor near you." },
      synth: { name: "Synth Repair & Modding", members: "11.8k members · Public", cover: "#1B3FCC", desc: "Vintage synth repair, schematics, and mods — from sticky keys to full voice-board rebuilds." }
    };
    if (slug && detailData[slug]) {
      var d = detailData[slug];
      var nameEl = document.getElementById("c-name");
      var membersEl = document.getElementById("c-members");
      var descEl = document.getElementById("c-desc");
      var coverEl = document.getElementById("c-cover");
      if (nameEl) nameEl.textContent = d.name;
      if (membersEl) membersEl.textContent = d.members;
      if (descEl) descEl.textContent = d.desc;
      if (coverEl) coverEl.style.background = d.cover;
      document.title = d.name + " · WE ARE.";
    }
  }
  /* ---------------- auth forms: lightweight client-side validation + demo redirect ---------------- */
  function wireAuthForm(formId, redirectTo) {
    var form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      form.querySelectorAll(".field").forEach(function (field) {
        var input = field.querySelector("input");
        if (!input) return;
        field.classList.remove("error");
        var existingHint = field.querySelector(".hint");
        if (existingHint && existingHint.dataset.errorHint === "1") existingHint.remove();
        var value = input.value.trim();
        var problem = "";
        if (!value) {
          problem = "This field is required.";
        } else if (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          problem = "Enter a valid email address.";
        } else if (input.type === "password" && value.length < 8) {
          problem = "Use at least 8 characters.";
        }
        if (problem) {
          valid = false;
          field.classList.add("error");
          var hint = document.createElement("div");
          hint.className = "hint";
          hint.dataset.errorHint = "1";
          hint.textContent = problem;
          field.appendChild(hint);
        }
      });
      if (valid) window.location.href = redirectTo;
    });
  }
  // Note: signup.html no longer loads this shared script — it has its own
  // real Supabase-backed handler in js/signup.js. login.html is still a
  // front-end-only demo, so it keeps the fake redirect below.
  wireAuthForm("login-form", "app/home.html");
})();
