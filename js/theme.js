/**
 * Theme: light / dark toggle (icons).
 * Default without preference: by local hour (07–19 light, else dark).
 * Preference key: metodocicatriz-theme
 */
(function () {
  var STORAGE_KEY = "metodocicatriz-theme";
  var ICON_SUN =
    '<svg class="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.05 5.05l1.56 1.56M17.39 17.39l1.56 1.56M5.05 18.95l1.56-1.56M17.39 6.61l1.56-1.56"/></svg>';
  var ICON_MOON =
    '<svg class="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M20.2 14.1A7.8 7.8 0 0 1 9.9 3.8 8.2 8.2 0 1 0 20.2 14.1z"/></svg>';

  function hourTheme() {
    var h = new Date().getHours();
    return h >= 7 && h < 19 ? "light" : "dark";
  }

  function readPreference() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (v === "light" || v === "dark") return v;
      if (v === "auto") {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}
    return null;
  }

  function writePreference(mode) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {}
  }

  function resolveTheme(pref) {
    return pref === "light" || pref === "dark" ? pref : hourTheme();
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    return theme;
  }

  function currentLang() {
    try {
      return localStorage.getItem("language") || "es";
    } catch (e) {
      return "es";
    }
  }

  function updateButton(btn, theme) {
    if (!btn) return;
    var lang = currentLang();
    var next = theme === "light" ? "dark" : "light";
    btn.innerHTML = theme === "light" ? ICON_MOON : ICON_SUN;
    btn.setAttribute("data-theme-current", theme);
    btn.setAttribute(
      "aria-label",
      lang === "en"
        ? next === "dark"
          ? "Switch to dark theme"
          : "Switch to light theme"
        : next === "dark"
          ? "Cambiar a tema oscuro"
          : "Cambiar a tema claro"
    );
  }

  var preference = readPreference();
  var current = applyTheme(resolveTheme(preference));

  function bindToggle() {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;

    updateButton(btn, current);

    btn.addEventListener("click", function () {
      current = current === "light" ? "dark" : "light";
      writePreference(current);
      applyTheme(current);
      updateButton(btn, current);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindToggle);
  } else {
    bindToggle();
  }

  window.MetodoTheme = {
    getPreference: function () {
      return preference || current;
    },
    apply: function (mode) {
      if (mode !== "light" && mode !== "dark") return;
      preference = mode;
      current = mode;
      writePreference(mode);
      applyTheme(mode);
      updateButton(document.getElementById("theme-toggle"), mode);
    },
  };
})();
