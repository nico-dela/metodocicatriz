(function () {
  "use strict";

  var CATEGORIES = {
    cuerpo: {
      color: "#c844bd",
      labelEs: "CUERPO",
      labelEn: "BODY",
    },
    objetos: {
      color: "#004a9e",
      labelEs: "OBJETOS",
      labelEn: "OBJECTS",
    },
    imagen: {
      color: "#0cc45b",
      labelEs: "IMAGEN",
      labelEn: "IMAGE",
    },
    escena: {
      color: "#ebb200",
      labelEs: "ESCENA",
      labelEn: "SCENE",
    },
    publicaciones: {
      color: "#e8550c",
      labelEs: "PUBLICACIONES",
      labelEn: "PUBLICATIONS",
    },
    digital: {
      color: "#e8550c",
      labelEs: "DIGITAL",
      labelEn: "DIGITAL",
    },
    escrituras: {
      color: "#eb1818",
      labelEs: "ESCRITURAS",
      labelEn: "WRITINGS",
    },
  };

  var MAP_DESC_ES =
    "Una cartografía de procesos de arte e investigación que transitan distintos territorios y se articulan a través de diversas prácticas, materiales, preguntas y formas de colaboración.";
  var MAP_DESC_EN =
    "A cartography of art and research processes that move across different territories and connect through diverse practices, materials, questions, and forms of collaboration.";

  var MAX_TAG_DEGREE = 4;

  var state = {
    open: false,
    nodes: [],
    links: [],
    hubs: [],
    raf: 0,
    startTime: 0,
    width: 0,
    height: 0,
    dpr: 1,
    hoverIndex: -1,
    dragIndex: -1,
    dragging: false,
    dragMoved: false,
    dragVelX: 0,
    dragVelY: 0,
    dragLastX: 0,
    dragLastY: 0,
    dragLastTime: 0,
    enterProgress: 0,
    motionSpeed: 0,
    motionClock: 0,
    selectedCategories: {},
    reducedMotion: false,
    userDriven: false,
    resizeAdapt: 0,
    layoutBase: null,
    layoutMode: null,
  };

  var els = {
    overlay: null,
    canvas: null,
    ctx: null,
    labels: null,
    legend: null,
    title: null,
    desc: null,
    heading: null,
    hint: null,
  };

  function getLanguage() {
    return localStorage.getItem("language") || "es";
  }

  /** Mobile / touch: nodes stay still unless the user drags them. */
  function isUserDrivenLayout() {
    try {
      if (window.matchMedia("(max-width: 768px)").matches) return true;
      if (
        window.matchMedia("(hover: none) and (pointer: coarse)").matches
      ) {
        return true;
      }
    } catch (err) {
      /* ignore */
    }
    return false;
  }

  function syncMotionMode() {
    state.userDriven = isUserDrivenLayout();
    if (!state.userDriven) return;
    state.nodes.forEach(function (node) {
      node.omega = 0;
      node.vx = 0;
      node.vy = 0;
      node.freeFlight = 0;
      node.releaseEase = 0;
      node.epicycleMute = 1;
      if (!node.pinned) {
        node.orbitCx = node.x;
        node.orbitCy = node.y;
      }
    });
  }

  function viewportPad(node) {
    var r = (node && node.r ? node.r : 22) * ((node && node.scale) || 1);
    var short = state.height < 560 && state.width > state.height;
    // Extra room for labels above/below the node
    return Math.max(short ? 26 : 40, r + (short ? 18 : 28));
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /** Top-left pocket reserved for title + map description in landscape. */
  function headingReserve() {
    if (!(state.width > state.height && state.height < 560)) {
      return null;
    }
    return {
      w: Math.min(state.width * 0.42, 340),
      h: Math.min(state.height * 0.38, 108),
    };
  }

  function pushOutOfHeading(node, hard) {
    var reserve = headingReserve();
    if (!reserve || !node) return;
    if (!(node.x < reserve.w && node.y < reserve.h)) return;
    var outX = reserve.w - node.x;
    var outY = reserve.h - node.y;
    // Prefer sliding down/right softly — hard snaps caused label flicker
    if (outX <= outY) {
      node.fx += outX * 0.28;
      node.orbitCx += outX * 0.06;
      if (hard) {
        node.x += Math.min(3.5, outX * 0.12);
        if (node.vx < 0) node.vx *= 0.4;
      }
    } else {
      node.fy += outY * 0.28;
      node.orbitCy += outY * 0.06;
      if (hard) {
        node.y += Math.min(3.5, outY * 0.12);
        if (node.vy < 0) node.vy *= 0.4;
      }
    }
  }

  /** Bottom-left pocket occupied by the category legend. */
  function legendReserve() {
    if (state.width < 8 || state.height < 8) return null;
    var compact =
      state.width < 700 || (state.width > state.height && state.height < 560);
    var w = compact ? Math.min(152, state.width * 0.4) : 168;
    var h = compact ? Math.min(220, state.height * 0.52) : 240;
    return {
      left: 0,
      top: state.height - h,
      w: w,
      h: h,
    };
  }

  function pushOutOfLegend(node, hard) {
    var reserve = legendReserve();
    if (!reserve || !node) return;
    if (
      !(
        node.x < reserve.left + reserve.w &&
        node.y > reserve.top
      )
    ) {
      return;
    }
    var outX = reserve.left + reserve.w - node.x;
    var outY = node.y - reserve.top;
    // Prefer sliding right (away from legend) over upward
    if (outX * 0.85 <= outY) {
      node.fx += outX * 0.32;
      node.orbitCx += outX * 0.08;
      if (hard) {
        node.x += Math.min(4, outX * 0.14);
        if (node.vx < 0) node.vx *= 0.35;
      }
    } else {
      node.fy -= outY * 0.32;
      node.orbitCy -= outY * 0.08;
      if (hard) {
        node.y -= Math.min(4, outY * 0.14);
        if (node.vy > 0) node.vy *= 0.35;
      }
    }
  }

  /** Keep node + its orbit fully inside the visible stage. */
  function containNodeInViewport(node, hard) {
    if (!node || state.width < 8 || state.height < 8) return;
    var pad = viewportPad(node);
    var minX = pad;
    var maxX = state.width - pad;
    var minY = pad;
    var maxY = state.height - pad;
    if (maxX <= minX || maxY <= minY) return;

    // Limit orbit radius so the ellipse can't leave the screen
    var maxR = Math.min(maxX - minX, maxY - minY) * 0.42;
    if (node.orbitR > maxR) node.orbitR = maxR;

    var aspect = node.orbitAspect || 0.85;
    var orbitPadX = node.orbitR + pad * 0.35;
    var orbitPadY = node.orbitR * aspect + pad * 0.35;
    node.orbitCx = clamp(
      node.orbitCx,
      orbitPadX,
      state.width - orbitPadX,
    );
    node.orbitCy = clamp(
      node.orbitCy,
      orbitPadY,
      state.height - orbitPadY,
    );

    pushOutOfHeading(node, hard);
    pushOutOfLegend(node, hard);

    if (hard) {
      if (node.x < minX) {
        node.x = minX;
        if (node.vx < 0) node.vx = 0;
      } else if (node.x > maxX) {
        node.x = maxX;
        if (node.vx > 0) node.vx = 0;
      }
      if (node.y < minY) {
        node.y = minY;
        if (node.vy < 0) node.vy = 0;
      } else if (node.y > maxY) {
        node.y = maxY;
        if (node.vy > 0) node.vy = 0;
      }
    } else {
      // Soft wall: strong pull back before hard edge
      var wall = 0.14;
      if (node.x < minX) node.fx += (minX - node.x) * wall;
      if (node.x > maxX) node.fx -= (node.x - maxX) * wall;
      if (node.y < minY) node.fy += (minY - node.y) * wall;
      if (node.y > maxY) node.fy -= (node.y - maxY) * wall;
    }
  }

  function categoryColor(id) {
    return (CATEGORIES[id] || CATEGORIES.cuerpo).color;
  }

  function entryLabel(entry) {
    if (!entry) return "";
    var lang = getLanguage();
    return lang === "en"
      ? entry.titleEn || entry.title || entry.id || entry.file || ""
      : entry.titleEs || entry.title || entry.id || entry.file || "";
  }

  function nodeIsOpenable(node) {
    return !!(node && node.entry && (node.entry.file || node.entry.url));
  }

  function hasCategoryFilter() {
    return Object.keys(state.selectedCategories).length > 0;
  }

  function isCategorySelected(id) {
    if (!hasCategoryFilter()) return true;
    return !!state.selectedCategories[id];
  }

  function isNodeVisible(node) {
    return !!(node && isCategorySelected(node.category));
  }

  function toggleCategoryFilter(id) {
    if (state.selectedCategories[id]) {
      delete state.selectedCategories[id];
    } else {
      state.selectedCategories[id] = true;
    }
    renderLegend();
  }

  function shortTitle(entry) {
    return String(entryLabel(entry))
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim();
  }

  function orbitHubs(w, h) {
    var narrow = w < 700;
    var short = h < 500;
    if (narrow && !short) {
      // Mobile portrait — keep bottom-left clear for category legend
      return [
        { x: w * 0.32, y: h * 0.24, category: "cuerpo" },
        { x: w * 0.68, y: h * 0.22, category: "objetos" },
        { x: w * 0.78, y: h * 0.4, category: "imagen" },
        { x: w * 0.38, y: h * 0.48, category: "escena" },
        { x: w * 0.7, y: h * 0.58, category: "publicaciones" },
        { x: w * 0.42, y: h * 0.72, category: "digital" },
        { x: w * 0.76, y: h * 0.78, category: "escrituras" },
      ];
    }
    if (short || (w > h && h < 560)) {
      // Mobile landscape — clear top-left heading + bottom-left legend
      return [
        { x: w * 0.3, y: h * 0.48, category: "cuerpo" },
        { x: w * 0.46, y: h * 0.28, category: "objetos" },
        { x: w * 0.64, y: h * 0.26, category: "imagen" },
        { x: w * 0.4, y: h * 0.72, category: "escena" },
        { x: w * 0.58, y: h * 0.78, category: "publicaciones" },
        { x: w * 0.74, y: h * 0.7, category: "digital" },
        { x: w * 0.86, y: h * 0.48, category: "escrituras" },
      ];
    }
    // Desktop — pull clusters toward corners/edges, clear legend
    return [
      { x: w * 0.2, y: h * 0.28, category: "cuerpo" },
      { x: w * 0.42, y: h * 0.22, category: "objetos" },
      { x: w * 0.68, y: h * 0.24, category: "imagen" },
      { x: w * 0.28, y: h * 0.62, category: "escena" },
      { x: w * 0.5, y: h * 0.72, category: "publicaciones" },
      { x: w * 0.7, y: h * 0.7, category: "digital" },
      { x: w * 0.86, y: h * 0.48, category: "escrituras" },
    ];
  }

  function layoutMode(w, h) {
    if ((w > h && h < 560) || h < 500) return "landscape";
    if (w < 700) return "portrait";
    return "desktop";
  }

  function buildTagLinks(nodes) {
    var n = nodes.length;
    var candidates = [];
    var i;
    var j;
    var k;

    for (i = 0; i < n; i++) {
      var tagsA = (nodes[i].entry && nodes[i].entry.tags) || [];
      if (!tagsA.length) continue;
      var setA = {};
      for (k = 0; k < tagsA.length; k++) setA[tagsA[k]] = true;
      for (j = i + 1; j < n; j++) {
        var tagsB = (nodes[j].entry && nodes[j].entry.tags) || [];
        var shared = 0;
        for (k = 0; k < tagsB.length; k++) {
          if (setA[tagsB[k]]) shared += 1;
        }
        if (shared > 0) {
          candidates.push({ a: i, b: j, shared: shared });
        }
      }
    }

    candidates.sort(function (x, y) {
      return y.shared - x.shared;
    });

    var degree = {};
    var links = [];
    for (i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      var da = degree[c.a] || 0;
      var db = degree[c.b] || 0;
      if (da >= MAX_TAG_DEGREE || db >= MAX_TAG_DEGREE) continue;
      degree[c.a] = da + 1;
      degree[c.b] = db + 1;
      links.push({
        a: c.a,
        b: c.b,
        strength: 0.0015 + Math.min(c.shared, 4) * 0.001,
      });
    }

    if (!links.length && n > 1) {
      for (i = 0; i < n; i++) {
        links.push({ a: i, b: (i + 1) % n, strength: 0.003 });
      }
    }

    return links;
  }

  function buildGraph(files) {
    var hubs = orbitHubs(state.width, state.height);
    var hubByCat = {};
    hubs.forEach(function (hub, idx) {
      hubByCat[hub.category] = idx;
    });

    var catCounts = {};
    files.forEach(function (entry) {
      var cat = entry.category || "cuerpo";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    var catIndex = {};
    var minSide = Math.min(state.width, state.height);
    var compact = state.width < 700 || state.height < 500;

    var nodes = files.map(function (entry, i) {
      var cat = entry.category || "cuerpo";
      var hubIndex =
        hubByCat[cat] != null ? hubByCat[cat] : i % hubs.length;
      var hub = hubs[hubIndex];
      var local = catIndex[cat] || 0;
      catIndex[cat] = local + 1;
      var groupSize = catCounts[cat] || 1;

      // Multiple rings when a category is dense — even angular spacing per ring
      var rings = Math.min(3, Math.max(1, Math.ceil(groupSize / 4)));
      var perRing = Math.ceil(groupSize / rings);
      var ring = Math.min(rings - 1, Math.floor(local / perRing));
      var idxInRing = local - ring * perRing;
      var countInRing = Math.min(perRing, groupSize - ring * perRing);
      var phase =
        (idxInRing / Math.max(countInRing, 1)) * Math.PI * 2 +
        ring * 0.45 +
        hubIndex * 0.18;
      var dir = local % 2 === 0 ? 1 : -1;
      var density = Math.min(1.55, 0.9 + groupSize * 0.06);
      var orbitR =
        minSide * (compact ? 0.12 : 0.1 + ring * 0.09) * density +
        ring * (compact ? minSide * 0.08 : minSide * 0.09) +
        (compact ? 6 : 10) +
        idxInRing * (compact ? 4 : 5);
      var omega = dir * (0.028 + (local % 4) * 0.007);
      var birth = 0.92 + (local % 5) * 0.01;
      var startX = hub.x + Math.cos(phase) * orbitR * birth;
      var startY = hub.y + Math.sin(phase) * orbitR * birth * 0.82;
      var titleLen = shortTitle(entry).length;

      return {
        entry: entry,
        category: cat,
        x: startX,
        y: startY,
        vx: 0,
        vy: 0,
        orbitCx: hub.x,
        orbitCy: hub.y,
        orbitR: orbitR,
        orbitAspect: 0.78 + (ring % 3) * 0.06,
        angle: phase,
        omega: omega,
        epicycleR: compact ? 2 + (local % 2) : 4 + (local % 4) * 1.5,
        epicycleOmega: omega * (1.2 + (local % 3) * 0.15),
        epicyclePhase: phase * 1.7,
        r: compact
          ? Math.max(8, Math.min(12, 7.5 + Math.min(titleLen, 20) * 0.12))
          : Math.max(13, Math.min(22, 11 + Math.min(titleLen, 28) * 0.22)),
        labelSide: local % 2 === 0 ? "below" : "above",
        phase: phase,
        scale: 0,
        appearDelay: 0.1 + i * 0.035,
        visibility: 1,
        hubIndex: hubIndex,
      };
    });

    state.hubs = hubs;
    state.nodes = nodes;
    state.links = buildTagLinks(nodes);
  }

  function ensureProcessGraphCss() {
    if (document.getElementById("process-graph-css")) return;
    var link = document.createElement("link");
    link.id = "process-graph-css";
    link.rel = "stylesheet";
    var isInSubdir = window.location.pathname.indexOf("/pages/") !== -1;
    link.href = isInSubdir
      ? "../css/process-graph.css"
      : "css/process-graph.css";
    document.head.appendChild(link);
  }

  function ensureDom() {
    ensureProcessGraphCss();
    if (els.overlay) return;

    var overlay = document.createElement("div");
    overlay.id = "process-graph-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "process-graph-title");
    overlay.innerHTML =
      '<header class="process-graph-toolbar">' +
      '  <div class="process-graph-heading">' +
      '    <h2 id="process-graph-title" class="process-graph-title" data-es="Mapa de procesos" data-en="Process map">Mapa de procesos</h2>' +
      '    <p class="process-graph-desc" data-es="' +
      MAP_DESC_ES.replace(/"/g, "&quot;") +
      '" data-en="' +
      MAP_DESC_EN.replace(/"/g, "&quot;") +
      '">' +
      MAP_DESC_ES +
      "</p>" +
      "  </div>" +
      '  <button type="button" class="process-graph-close" aria-label="Cerrar" data-es-aria="Cerrar" data-en-aria="Close">&times;</button>' +
      "</header>" +
      '<div class="process-graph-stage">' +
      '  <canvas id="process-graph-canvas"></canvas>' +
      '  <div class="process-graph-labels" id="process-graph-labels"></div>' +
      "</div>" +
      '<div class="process-graph-legend" id="process-graph-legend"></div>' +
      '<p class="process-graph-hint" data-es="Tocá categorías para filtrar · Arrastrá un nodo · Tocá para abrir PDF o enlace" data-en="Tap categories to filter · Drag a node · Tap to open PDF or link">Tocá categorías para filtrar · Arrastrá un nodo · Tocá para abrir PDF o enlace</p>';

    document.body.appendChild(overlay);

    els.overlay = overlay;
    els.canvas = overlay.querySelector("#process-graph-canvas");
    els.ctx = els.canvas.getContext("2d");
    els.labels = overlay.querySelector("#process-graph-labels");
    els.legend = overlay.querySelector("#process-graph-legend");
    els.title = overlay.querySelector("#process-graph-title");
    els.desc = overlay.querySelector(".process-graph-desc");
    els.hint = overlay.querySelector(".process-graph-hint");
    els.heading = overlay.querySelector(".process-graph-heading");

    overlay
      .querySelector(".process-graph-close")
      .addEventListener("click", close);

    bindPointer();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", function () {
      // Wait for the browser to settle the new viewport metrics
      setTimeout(onResize, 120);
      setTimeout(onResize, 320);
    });
    document.addEventListener("keydown", onKeydown);
  }

  function updateI18n() {
    var lang = getLanguage();
    if (els.title) {
      els.title.textContent =
        els.title.getAttribute("data-" + lang) || els.title.textContent;
    }
    if (els.desc) {
      els.desc.textContent =
        els.desc.getAttribute("data-" + lang) || els.desc.textContent;
    }
    if (els.hint) {
      els.hint.textContent =
        els.hint.getAttribute("data-" + lang) || els.hint.textContent;
    }
    var closeBtn = els.overlay && els.overlay.querySelector(".process-graph-close");
    if (closeBtn) {
      closeBtn.setAttribute(
        "aria-label",
        closeBtn.getAttribute("data-" + lang + "-aria") || "Close",
      );
    }
    renderLegend();
    syncLabelTexts();
  }

  function renderLegend() {
    if (!els.legend) return;
    var lang = getLanguage();
    var used = {};
    state.nodes.forEach(function (n) {
      used[n.category] = true;
    });
    var filtering = hasCategoryFilter();
    els.legend.innerHTML = "";

    Object.keys(CATEGORIES).forEach(function (id) {
      if (!used[id]) return;
      var cat = CATEGORIES[id];
      var label = lang === "en" ? cat.labelEn : cat.labelEs;
      var active = !filtering || !!state.selectedCategories[id];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "process-graph-legend-item" +
        (active ? " is-active" : " is-dimmed");
      btn.dataset.category = id;
      btn.setAttribute("aria-pressed", filtering ? String(!!state.selectedCategories[id]) : "false");
      btn.innerHTML =
        '<span class="process-graph-legend-swatch" style="background:' +
        cat.color +
        ";color:" +
        cat.color +
        '"></span><span class="process-graph-legend-label">' +
        label +
        "</span>";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleCategoryFilter(id);
      });
      els.legend.appendChild(btn);
    });
  }

  function syncLabelTexts() {
    if (!els.labels) return;
    var labelEls = els.labels.querySelectorAll(".process-graph-label");
    labelEls.forEach(function (el, i) {
      if (state.nodes[i]) {
        el.textContent = shortTitle(state.nodes[i].entry);
      }
    });
  }

  function buildLabels() {
    if (!els.labels) return;
    els.labels.innerHTML = "";
    state.nodes.forEach(function (node, i) {
      var el = document.createElement("div");
      el.className = "process-graph-label";
      el.textContent = shortTitle(node.entry);
      el.dataset.index = String(i);
      els.labels.appendChild(el);
    });
  }

  function resizeCanvas() {
    if (!els.canvas || !els.overlay) return;
    var stage = els.overlay.querySelector(".process-graph-stage");
    var rect = stage.getBoundingClientRect();
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    els.canvas.width = Math.floor(state.width * state.dpr);
    els.canvas.height = Math.floor(state.height * state.dpr);
    els.canvas.style.width = state.width + "px";
    els.canvas.style.height = state.height + "px";
    els.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function captureLayoutBase() {
    state.layoutBase = {
      w: state.width,
      h: state.height,
      hubs: (state.hubs || []).map(function (h) {
        return { x: h.x, y: h.y };
      }),
      nodes: state.nodes.map(function (n) {
        return {
          x: n.x,
          y: n.y,
          orbitCx: n.orbitCx,
          orbitCy: n.orbitCy,
          orbitR: n.orbitR,
          epicycleR: n.epicycleR,
        };
      }),
    };
  }

  function setOrganicResizeTargets() {
    var base = state.layoutBase;
    if (!base || !base.w || !base.h || !state.nodes.length) return;

    var sx = state.width / base.w;
    var sy = state.height / base.h;
    var sr = Math.sqrt(sx * sy);
    var uni = (sx + sy) * 0.5;
    sx = sx * 0.65 + uni * 0.35;
    sy = sy * 0.65 + uni * 0.35;
    sr = sr * 0.7 + uni * 0.3;

    var hubTargets = orbitHubs(state.width, state.height);
    state.hubResizeTargets = hubTargets;
    var hubByCat = {};
    hubTargets.forEach(function (hub) {
      hubByCat[hub.category] = hub;
    });

    state.nodes.forEach(function (n, i) {
      var snap = base.nodes[i];
      if (!snap) return;
      var hub = hubByCat[n.category];
      // Prefer category hub for orbit center so clusters stay grouped after resize
      n.resizeTargetCx = hub ? hub.x : snap.orbitCx * sx;
      n.resizeTargetCy = hub ? hub.y : snap.orbitCy * sy;
      var ang = n.angle || 0;
      var aspect = n.orbitAspect || 0.82;
      var nextR = Math.max(36, Math.min(snap.orbitR * sr, Math.min(state.width, state.height) * 0.34));
      n.resizeTargetR = nextR;
      n.resizeTargetEpi = Math.max(2, (snap.epicycleR || n.epicycleR) * sr);
      n.resizeTargetX = n.resizeTargetCx + Math.cos(ang) * nextR;
      n.resizeTargetY = n.resizeTargetCy + Math.sin(ang) * nextR * aspect;
      var pad = viewportPad(n);
      n.resizeTargetX = clamp(n.resizeTargetX, pad, state.width - pad);
      n.resizeTargetY = clamp(n.resizeTargetY, pad, state.height - pad);
    });

    state.resizeAdapt = 1;
  }

  function reflowGraphLayout() {
    var entries = state.nodes.map(function (n) {
      return n.entry;
    });
    if (!entries.length) return;

    var selected = state.selectedCategories;
    var enter = state.enterProgress;
    buildGraph(entries);
    state.selectedCategories = selected || {};
    state.nodes.forEach(function (n) {
      n.appearDelay = 0;
      n.scale = enter >= 1 ? 1 : Math.max(n.scale || 0, 0.85);
      n.visibility = isCategorySelected(n.category) ? 1 : 0.08;
      n.vx = 0;
      n.vy = 0;
      containNodeInViewport(n, true);
    });
    buildLabels();
    updateI18n();
    captureLayoutBase();
    state.resizeAdapt = 0;
    state.hubResizeTargets = null;
    state.layoutMode = layoutMode(state.width, state.height);
  }

  function onResize() {
    if (!state.open) return;
    var prevW = state.width;
    var prevH = state.height;
    var prevMode =
      state.layoutMode || layoutMode(prevW || state.width, prevH || state.height);
    resizeCanvas();
    var nextMode = layoutMode(state.width, state.height);
    var prevAspect = prevH > 0 ? prevW / prevH : 1;
    var nextAspect = state.height > 0 ? state.width / state.height : 1;
    var aspectJump = Math.abs(nextAspect - prevAspect) > 0.35;

    // Orientation / layout-mode changes need a full reflow — scaling portrait→landscape stacks nodes
    if (prevMode !== nextMode || aspectJump) {
      reflowGraphLayout();
      syncMotionMode();
      return;
    }

    if (!state.layoutBase) captureLayoutBase();
    setOrganicResizeTargets();
    state.layoutMode = nextMode;
    syncMotionMode();
  }

  function easeResizeLayout() {
    if (!state.resizeAdapt || state.resizeAdapt <= 0) return;

    var k = state.reducedMotion ? 0.35 : 0.055 + (1 - state.resizeAdapt) * 0.04;
    var maxErr = 0;

    if (state.hubResizeTargets && state.hubs) {
      state.hubs.forEach(function (hub, i) {
        var t = state.hubResizeTargets[i];
        if (!t) return;
        hub.x += (t.x - hub.x) * k;
        hub.y += (t.y - hub.y) * k;
      });
    }

    state.nodes.forEach(function (n) {
      if (n.pinned) return;
      if (n.resizeTargetX == null) return;

      n.orbitCx += (n.resizeTargetCx - n.orbitCx) * k;
      n.orbitCy += (n.resizeTargetCy - n.orbitCy) * k;
      n.orbitR += (n.resizeTargetR - n.orbitR) * k;
      if (n.resizeTargetEpi != null) {
        n.epicycleR += (n.resizeTargetEpi - n.epicycleR) * k;
      }
      n.x += (n.resizeTargetX - n.x) * k;
      n.y += (n.resizeTargetY - n.y) * k;
      n.vx *= 0.85;
      n.vy *= 0.85;
      containNodeInViewport(n, true);

      maxErr = Math.max(
        maxErr,
        Math.abs(n.resizeTargetX - n.x),
        Math.abs(n.resizeTargetY - n.y),
        Math.abs(n.resizeTargetCx - n.orbitCx),
        Math.abs(n.resizeTargetR - n.orbitR),
      );
    });

    state.resizeAdapt *= state.reducedMotion ? 0.7 : 0.965;
    if (maxErr < 1.2 || state.resizeAdapt < 0.04) {
      state.resizeAdapt = 0;
      captureLayoutBase();
    }
  }

  function pointerPos(e) {
    var rect = els.canvas.getBoundingClientRect();
    var src = e.touches && e.touches.length ? e.touches[0] : e;
    if (e.changedTouches && e.type === "touchend") {
      src = e.changedTouches[0];
    }
    return {
      x: src.clientX - rect.left,
      y: src.clientY - rect.top,
    };
  }

  function hitTest(x, y) {
    var best = -1;
    var bestDist = Infinity;
    for (var i = 0; i < state.nodes.length; i++) {
      var n = state.nodes[i];
      if (!isNodeVisible(n)) continue;
      var hitR = Math.max(n.r * (n.scale || 1) * (n.visibility || 1) + 8, 22);
      var dx = x - n.x;
      var dy = y - n.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d <= hitR && d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  /**
   * Rebuild orbit so the node continues from the release point in the
   * throw direction (tangent path) instead of snapping back to the old hub.
   */
  function reanchorOrbit(node, throwVx, throwVy) {
    var aspect = node.orbitAspect || 0.85;
    var vx = throwVx || 0;
    var vy = throwVy || 0;
    var throwSpeed = Math.sqrt(vx * vx + vy * vy);

    node.epicycleMute = 1;
    node.releaseEase = 1;
    node.springMute = 1;
    node.epicyclePhase = -state.motionClock * node.epicycleOmega;

    var minR = 55;
    var maxR = Math.min(state.width, state.height) * 0.38;

    if (throwSpeed < 60) {
      // Soft drop: park a new local orbit around the release point
      // so it does not spring back to the original hub.
      var keepSign = node.omega >= 0 ? 1 : -1;
      var parkR = Math.max(
        minR,
        Math.min(maxR, node.orbitR * 0.85 || 90),
      );
      var ang = node.angle || 0;
      node.orbitR = parkR;
      node.orbitCx = node.x - Math.cos(ang) * parkR;
      node.orbitCy = node.y - Math.sin(ang) * parkR * aspect;
      node.orbitCx = Math.max(50, Math.min(state.width - 50, node.orbitCx));
      node.orbitCy = Math.max(50, Math.min(state.height - 50, node.orbitCy));
      var dx0 = node.x - node.orbitCx;
      var dy0 = node.y - node.orbitCy;
      node.orbitR = Math.max(
        minR,
        Math.sqrt(dx0 * dx0 + (dy0 / aspect) * (dy0 / aspect)),
      );
      node.angle = Math.atan2(dy0 / aspect, dx0);
      node.omega = keepSign * Math.max(0.03, Math.min(0.12, Math.abs(node.omega) || 0.05));
      node.vx = 0;
      node.vy = 0;
      return;
    }

    // Tangent orbit: center sits on the normal to the throw so motion continues
    var tx = vx / throwSpeed;
    var ty = vy / throwSpeed;
    var crossGuess = node.omega >= 0 ? 1 : -1;
    // Prefer the rotation sense that matches the fling relative to old center
    var fromOldX = node.x - (node.orbitCx || node.x);
    var fromOldY = node.y - (node.orbitCy || node.y);
    var flingSense = fromOldX * vy - fromOldY * vx;
    if (Math.abs(flingSense) > 20) {
      crossGuess = flingSense >= 0 ? 1 : -1;
    }
    var nx = -ty * crossGuess;
    var ny = tx * crossGuess;

    var desiredOmega = Math.max(0.04, Math.min(0.16, throwSpeed * 0.00012));
    var parkR = Math.max(minR, Math.min(maxR, throwSpeed / (desiredOmega * 60)));
    parkR = Math.max(minR, Math.min(maxR, parkR));

    node.orbitCx = node.x - nx * parkR;
    node.orbitCy = node.y - ny * parkR;
    node.orbitCx = Math.max(50, Math.min(state.width - 50, node.orbitCx));
    node.orbitCy = Math.max(50, Math.min(state.height - 50, node.orbitCy));

    var dx = node.x - node.orbitCx;
    var dy = node.y - node.orbitCy;
    var r2 = dx * dx + dy * dy + 0.01;
    node.orbitR = Math.max(
      minR,
      Math.min(maxR, Math.sqrt(dx * dx + (dy / aspect) * (dy / aspect))),
    );
    node.angle = Math.atan2(dy / aspect, dx);

    var omegaThrow = (dx * vy - dy * vx) / r2;
    var sign = omegaThrow >= 0 ? 1 : -1;
    if (Math.abs(omegaThrow) < 0.002) sign = crossGuess;
    var mag = Math.abs(omegaThrow) * 0.2;
    if (mag < 0.04) mag = desiredOmega;
    node.omega = sign * Math.max(0.035, Math.min(0.18, mag));

    // Coast along the throw so it feels continuous, then orbit takes over
    node.vx = tx * Math.min(4.5, throwSpeed * 0.004);
    node.vy = ty * Math.min(4.5, throwSpeed * 0.004);
    node.freeFlight = 1;
  }

  function sampleDragVelocity(pos) {
    var now = performance.now();
    var dt = (now - state.dragLastTime) / 1000;
    if (dt > 0 && dt < 0.1) {
      var instVx = (pos.x - state.dragLastX) / dt;
      var instVy = (pos.y - state.dragLastY) / dt;
      var alpha = 0.45;
      state.dragVelX = state.dragVelX * (1 - alpha) + instVx * alpha;
      state.dragVelY = state.dragVelY * (1 - alpha) + instVy * alpha;
      var cap = 1400;
      var v = Math.sqrt(
        state.dragVelX * state.dragVelX + state.dragVelY * state.dragVelY,
      );
      if (v > cap) {
        state.dragVelX = (state.dragVelX / v) * cap;
        state.dragVelY = (state.dragVelY / v) * cap;
      }
    } else if (dt >= 0.1) {
      state.dragVelX *= 0.25;
      state.dragVelY *= 0.25;
    }
    state.dragLastX = pos.x;
    state.dragLastY = pos.y;
    state.dragLastTime = now;
  }

  function bindPointer() {
    var canvas = els.canvas;

    function onDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      var pos = pointerPos(e);
      var hit = hitTest(pos.x, pos.y);
      state.dragMoved = false;
      state.dragIndex = hit;
      state.dragging = hit >= 0;
      state.dragVelX = 0;
      state.dragVelY = 0;
      state.dragLastX = pos.x;
      state.dragLastY = pos.y;
      state.dragLastTime = performance.now();

      if (hit >= 0) {
        var node = state.nodes[hit];
        node.pinned = true;
        node.vx = 0;
        node.vy = 0;
        node.springMute = 1;
        node.freeFlight = 0;
        node.dragGrabX = pos.x - node.x;
        node.dragGrabY = pos.y - node.y;
        state.hoverIndex = hit;
        canvas.classList.add("is-dragging-node");
        if (e.cancelable) e.preventDefault();
      }
    }

    function onMove(e) {
      var pos = pointerPos(e);

      if (state.dragging && state.dragIndex >= 0) {
        var node = state.nodes[state.dragIndex];
        if (node) {
          var targetX = pos.x - (node.dragGrabX || 0);
          var targetY = pos.y - (node.dragGrabY || 0);
          var dx = targetX - node.x;
          var dy = targetY - node.y;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) state.dragMoved = true;
          sampleDragVelocity(pos);
          // Follow pointer closely so release position matches the gesture
          var follow = 0.62;
          node.x += dx * follow;
          node.y += dy * follow;
          // Carry the orbit hub with the drag — no rubber-band to old path
          node.orbitCx += dx * follow;
          node.orbitCy += dy * follow;
          node.vx = 0;
          node.vy = 0;
          containNodeInViewport(node, true);
        }
        if (e.cancelable) e.preventDefault();
        return;
      }

      if (!e.touches) {
        var hit = hitTest(pos.x, pos.y);
        state.hoverIndex = hit;
        canvas.classList.toggle(
          "is-hover-node",
          hit >= 0 && nodeIsOpenable(state.nodes[hit]),
        );
      }
    }

    function onUp(e) {
      if (!state.dragging && state.dragIndex < 0) return;

      var wasDrag = state.dragMoved;
      var hitIndex = state.dragIndex;
      var node = hitIndex >= 0 ? state.nodes[hitIndex] : null;

      var idle = (performance.now() - state.dragLastTime) / 1000;
      var throwVx = state.dragVelX;
      var throwVy = state.dragVelY;
      if (idle > 0.09) {
        throwVx *= 0.2;
        throwVy *= 0.2;
      }

      if (node) {
        // Finish at the pointer so there is no lag snap
        if (wasDrag) {
          var pos = pointerPos(e);
          node.x = pos.x - (node.dragGrabX || 0);
          node.y = pos.y - (node.dragGrabY || 0);
          containNodeInViewport(node, true);
        }
        node.pinned = false;
        if (state.userDriven) {
          // Park in place — no autonomous orbit after release
          node.vx = 0;
          node.vy = 0;
          node.omega = 0;
          node.freeFlight = 0;
          node.releaseEase = 0;
          node.springMute = 0;
          node.epicycleMute = 1;
          node.orbitCx = node.x;
          node.orbitCy = node.y;
        } else {
          reanchorOrbit(node, throwVx, throwVy);
        }
        containNodeInViewport(node, true);
        captureLayoutBase();
      }

      state.dragging = false;
      state.dragIndex = -1;
      state.dragVelX = 0;
      state.dragVelY = 0;
      canvas.classList.remove("is-dragging-node");

      if (!wasDrag && node) {
        openNode(node);
      }
    }

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", function () {
      if (state.dragging) return;
      state.hoverIndex = -1;
      canvas.classList.remove("is-hover-node");
    });

    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onUp);
  }

  /** Sites that break or block iframes — open in a new tab. */
  function shouldOpenExternally(rawUrl) {
    try {
      var host = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
      if (host === "flipsnack.com" || host.endsWith(".flipsnack.com")) {
        return true;
      }
      if (host === "maizena.ar" || host.endsWith(".maizena.ar")) {
        return true;
      }
      if (host === "cicatriz.ar" || host.endsWith(".cicatriz.ar")) {
        return true;
      }
    } catch (err) {
      /* ignore */
    }
    return false;
  }

  function openNode(node) {
    if (!node || !node.entry) return;
    var entry = node.entry;
    if (entry.file && window.PdfModal && typeof window.PdfModal.open === "function") {
      window.PdfModal.open(entry.file);
      return;
    }
    if (entry.url) {
      if (shouldOpenExternally(entry.url)) {
        window.open(entry.url, "_blank", "noopener,noreferrer");
        return;
      }
      var title =
        getLanguage() === "en"
          ? entry.titleEn || entry.title || entry.url
          : entry.titleEs || entry.title || entry.url;
      if (window.EmbedViewer && typeof window.EmbedViewer.open === "function") {
        window.EmbedViewer.open(entry.url, title);
      } else {
        window.open(entry.url, "_blank", "noopener,noreferrer");
      }
    }
  }

  function orbitalTarget(node, motionT, epicycleMuteOverride) {
    var angle = node.angle;
    var mute =
      epicycleMuteOverride != null
        ? epicycleMuteOverride
        : node.epicycleMute || 0;
    var epicycleScale = 1 - mute;
    var ex =
      Math.cos(motionT * node.epicycleOmega + node.epicyclePhase) *
      node.epicycleR *
      epicycleScale;
    var ey =
      Math.sin(motionT * node.epicycleOmega + node.epicyclePhase) *
      node.epicycleR *
      0.85 *
      epicycleScale;
    return {
      x: node.orbitCx + Math.cos(angle) * node.orbitR + ex,
      y:
        node.orbitCy +
        Math.sin(angle) * node.orbitR * node.orbitAspect +
        ey,
    };
  }

  /** Starts near still, eases up to a muted cruise speed. */
  function motionSpeedAt(elapsedSec) {
    if (state.userDriven) return 0;
    if (state.reducedMotion) return 0.65;
    // Brief soft hold, then ease into a livelier cruise
    var hold = 1.2;
    if (elapsedSec < hold) return 0.04;
    var rampSec = 12;
    var u = Math.min(1, Math.max(0, (elapsedSec - hold) / rampSec));
    var eased = u * u;
    return 0.04 + eased * 0.72;
  }

  function simulate(elapsedSec) {
    var nodes = state.nodes;
    var links = state.links;
    var n = nodes.length;
    var settle = state.enterProgress;
    var settleEase = settle * settle; // keep early forces very low
    var speed = state.motionSpeed;
    var damp = state.userDriven ? 0.72 : 0.96 - settleEase * 0.05;
    var pull = state.userDriven
      ? 0
      : 0.0035 + settleEase * 0.012;
    var compact = state.width < 700 || state.height < 500;
    var labelClear = compact ? 28 : 48;
    var repelScale =
      (compact ? 0.22 : 0.14) + settleEase * (compact ? 0.55 : 0.42);
    var i;
    var j;
    var dt = 1 / 60;

    easeResizeLayout();
    // While easing a resize, keep orbital pull soft so motion stays organic
    if (state.resizeAdapt > 0 && !state.userDriven) {
      pull *= 0.25 + (1 - state.resizeAdapt) * 0.75;
    }

    for (i = 0; i < n; i++) {
      nodes[i].fx = 0;
      nodes[i].fy = 0;
    }

    // Advance orbits; speed factor grows from near-zero to muted cruise
    for (i = 0; i < n; i++) {
      var node = nodes[i];
      if (node.pinned) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      if (state.userDriven) {
        node.omega = 0;
        node.freeFlight = 0;
        continue;
      }
      if (node.releaseEase) {
        node.releaseEase *= 0.985;
        if (node.releaseEase < 0.02) node.releaseEase = 0;
      }
      if (node.springMute) {
        node.springMute *= 0.988;
        if (node.springMute < 0.02) node.springMute = 0;
      }
      if (node.freeFlight) {
        node.freeFlight *= 0.96;
        if (node.freeFlight < 0.05) node.freeFlight = 0;
      }
      if (node.epicycleMute) {
        node.epicycleMute *= 0.982;
        if (node.epicycleMute < 0.02) node.epicycleMute = 0;
      }
      var enterMute = 1 - settleEase;
      var epicycleGate = Math.max(node.epicycleMute || 0, enterMute * 0.85);
      var flight = node.freeFlight || 0;
      if (!state.reducedMotion) {
        node.angle +=
          node.omega *
          dt *
          speed *
          (0.55 + 0.45 * settleEase) *
          (1 - flight * 0.7);
      }
      var target = orbitalTarget(node, state.motionClock, epicycleGate);
      var ease = node.releaseEase || 0;
      var nodePull =
        pull * (0.08 + 0.92 * (1 - ease)) * (1 - flight * 0.92);
      node.fx += (target.x - node.x) * nodePull;
      node.fy += (target.y - node.y) * nodePull;
    }

    // Soft + hard repulsion — keep nodes (and label room) from stacking
    for (i = 0; i < n; i++) {
      for (j = i + 1; j < n; j++) {
        var a = nodes[i];
        var b = nodes[j];
        if (a.pinned && b.pinned) continue;
        if ((a.visibility || 1) < 0.2 || (b.visibility || 1) < 0.2) continue;
        // On mobile, only separate when the user is dragging a node
        if (state.userDriven && !a.pinned && !b.pinned) continue;

        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dist2 = dx * dx + dy * dy + 0.01;
        var dist = Math.sqrt(dist2);
        var ra = a.r * (a.scale || 1);
        var rb = b.r * (b.scale || 1);
        var sameCat = a.category === b.category;
        var minDist =
          ra +
          rb +
          labelClear +
          (a.pinned || b.pinned ? 8 : sameCat ? (compact ? 22 : 18) : (compact ? 16 : 12));
        var reach = a.pinned || b.pinned ? minDist * 1.4 : minDist * (compact ? 3.1 : 2.6);
        if (dist >= reach) continue;

        var overlap = minDist - dist;
        var force;
        if (a.pinned || b.pinned) {
          force = Math.max(0, overlap) * 0.7 + 120 / dist2;
        } else {
          force =
            (dist < minDist
              ? overlap * 0.32 + 40 / dist2
              : 320 / dist2) * repelScale;
        }

        var fx = (dx / dist) * force;
        var fy = (dy / dist) * force;

        if (a.pinned && !b.pinned) {
          b.fx -= fx;
          b.fy -= fy;
          b.orbitCx -= fx * 0.4;
          b.orbitCy -= fy * 0.4;
          b.bump = Math.min(1, (b.bump || 0) + 0.35);
          if (overlap > 0) {
            var sep = overlap * 0.55;
            b.x -= (dx / dist) * sep;
            b.y -= (dy / dist) * sep;
            b.orbitCx -= (dx / dist) * sep;
            b.orbitCy -= (dy / dist) * sep;
            containNodeInViewport(b, true);
          }
        } else if (b.pinned && !a.pinned) {
          a.fx += fx;
          a.fy += fy;
          a.orbitCx += fx * 0.4;
          a.orbitCy += fy * 0.4;
          a.bump = Math.min(1, (a.bump || 0) + 0.35);
          if (overlap > 0) {
            var sepA = overlap * 0.55;
            a.x += (dx / dist) * sepA;
            a.y += (dy / dist) * sepA;
            a.orbitCx += (dx / dist) * sepA;
            a.orbitCy += (dy / dist) * sepA;
            containNodeInViewport(a, true);
          }
        } else {
          a.fx += fx;
          a.fy += fy;
          b.fx -= fx;
          b.fy -= fy;
          if (overlap > 0) {
            var sepBoth = overlap * 0.5;
            var sx = (dx / dist) * sepBoth;
            var sy = (dy / dist) * sepBoth;
            a.x += sx;
            a.y += sy;
            b.x -= sx;
            b.y -= sy;
            a.orbitCx += sx * 0.65;
            a.orbitCy += sy * 0.65;
            b.orbitCx -= sx * 0.65;
            b.orbitCy -= sy * 0.65;
            containNodeInViewport(a, true);
            containNodeInViewport(b, true);
          }
        }
      }
    }

    // Very light springs — skip freshly released nodes
    if (!state.userDriven) {
    for (i = 0; i < links.length; i++) {
      var link = links[i];
      var na = nodes[link.a];
      var nb = nodes[link.b];
      if (
        na.pinned ||
        nb.pinned ||
        (na.springMute || 0) > 0.05 ||
        (nb.springMute || 0) > 0.05 ||
        (na.freeFlight || 0) > 0.05 ||
        (nb.freeFlight || 0) > 0.05
      ) {
        continue;
      }
      var ldx = nb.x - na.x;
      var ldy = nb.y - na.y;
      var ld = Math.sqrt(ldx * ldx + ldy * ldy) + 0.01;
      var ideal = compact ? 145 : 210;
      var spring = (ld - ideal) * link.strength * 0.05 * settleEase;
      var sfx = (ldx / ld) * spring;
      var sfy = (ldy / ld) * spring;
      na.fx += sfx;
      na.fy += sfy;
      nb.fx -= sfx;
      nb.fy -= sfy;
    }
    }

    for (i = 0; i < n; i++) {
      node = nodes[i];
      var nodeAppear = Math.max(
        0,
        Math.min(1, (settle - (node.appearDelay || 0) * 0.22) / 1.15),
      );
      var appearEase = 1 - Math.pow(1 - nodeAppear, 3.2);

      // Category filter fades must run even when motion is frozen (mobile)
      var wantVisible = isNodeVisible(node) ? 1 : 0;
      var vis = node.visibility == null ? 1 : node.visibility;
      node.visibility = vis + (wantVisible - vis) * 0.14;
      if (node.visibility < 0.01) node.visibility = 0;
      if (node.visibility > 0.99) node.visibility = 1;

      if (node.pinned) {
        var pinnedScale = appearEase * 1.08;
        node.scale += (pinnedScale - node.scale) * 0.05;
        containNodeInViewport(node, true);
        continue;
      }

      if (state.userDriven) {
        node.vx = 0;
        node.vy = 0;
        node.fx = 0;
        node.fy = 0;
        node.scale += (appearEase - node.scale) * 0.08;
        containNodeInViewport(node, true);
        continue;
      }

      containNodeInViewport(node, false);

      var flightAmt = node.freeFlight || 0;
      if (node.bump) {
        node.bump *= 0.88;
        if (node.bump < 0.02) node.bump = 0;
      }
      var bumpAmt = node.bump || 0;
      var nodeDamp = damp + (node.releaseEase || 0) * 0.02 - flightAmt * 0.04;
      if (nodeDamp > 0.98) nodeDamp = 0.98;
      if (nodeDamp < 0.88) nodeDamp = 0.88;
      node.vx = (node.vx + node.fx) * nodeDamp;
      node.vy = (node.vy + node.fy) * nodeDamp;
      var maxV =
        0.45 + settleEase * 1.1 + flightAmt * 3.5 + bumpAmt * 2.2;
      if (node.releaseEase && !flightAmt) maxV = Math.min(maxV, 1.2);
      if (settle < 0.85 && !flightAmt && !bumpAmt) maxV = Math.min(maxV, 0.55);
      var spd = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (spd > maxV) {
        node.vx = (node.vx / spd) * maxV;
        node.vy = (node.vy / spd) * maxV;
      }
      node.x += node.vx;
      node.y += node.vy;
      containNodeInViewport(node, true);

      var targetScale = appearEase;
      if (state.hoverIndex === i) targetScale *= 1.08;
      node.scale += (targetScale - node.scale) * 0.035;
    }
  }

  function draw(t) {
    var ctx = els.ctx;
    if (!ctx) return;

    ctx.clearRect(0, 0, state.width, state.height);
    ctx.save();

    // Soft ambient glow at orbit hubs (not by category)
    (state.hubs || []).forEach(function (hub, hi) {
      var grad = ctx.createRadialGradient(hub.x, hub.y, 8, hub.x, hub.y, 140);
      grad.addColorStop(
        0,
        "rgba(242,240,235," + 0.035 * state.enterProgress + ")",
      );
      grad.addColorStop(1, "rgba(242,240,235,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, 140 + hi * 10, 0, Math.PI * 2);
      ctx.fill();
    });

    // Links — only between currently visible categories
    for (var i = 0; i < state.links.length; i++) {
      var link = state.links[i];
      var a = state.nodes[link.a];
      var b = state.nodes[link.b];
      var linkAlpha =
        Math.min(a.visibility || 0, b.visibility || 0) *
        0.12 *
        state.enterProgress;
      if (linkAlpha < 0.004) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      var mx = (a.x + b.x) / 2;
      var my =
        (a.y + b.y) / 2 + Math.sin(t * 0.2 + i + a.angle) * 3;
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.strokeStyle = "rgba(242,240,235," + linkAlpha + ")";
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // Nodes
    var compactDraw = state.width < 700 || state.height < 500;
    for (i = 0; i < state.nodes.length; i++) {
      var node = state.nodes[i];
      var vis = node.visibility == null ? 1 : node.visibility;
      if (vis < 0.02) continue;
      var r = node.r * node.scale;
      var color = categoryColor(node.category);
      var pulse =
        state.reducedMotion || state.userDriven
          ? 0
          : Math.sin(t * 0.55 + node.phase) * 0.035 + 0.04;
      var bump = node.bump || 0;
      var drawR = r * (1 + bump * 0.08);
      var glowPad = compactDraw ? 3 + pulse * 3 + bump * 2 : 8 + pulse * 8 + bump * 6;

      ctx.globalAlpha = vis;

      ctx.beginPath();
      ctx.arc(
        node.x,
        node.y,
        drawR + glowPad,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = hexToRgba(color, 0.08 + pulse * 0.08 + bump * 0.1);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, drawR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.88 * vis;
      ctx.fill();
      ctx.globalAlpha = vis;

      ctx.beginPath();
      ctx.arc(
        node.x - drawR * 0.28,
        node.y - drawR * 0.28,
        drawR * 0.28,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fill();

      if (state.hoverIndex === i || state.dragIndex === i || bump > 0.15) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, drawR + 3 + bump * 2, 0, Math.PI * 2);
        ctx.strokeStyle =
          "rgba(255,255,255," + (0.45 + bump * 0.25) + ")";
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    ctx.restore();
    updateLabelPositions();
  }

  function updateLabelPositions() {
    if (!els.labels) return;
    var children = els.labels.children;
    var boxes = [];
    var i;
    var labelAlpha = Math.min(1, Math.max(0, (state.enterProgress - 0.35) / 0.35));

    for (i = 0; i < children.length; i++) {
      var node = state.nodes[i];
      if (!node) continue;
      var el = children[i];
      var drawR = node.r * (node.scale || 1);
      var below = node.labelSide !== "above";
      var x = node.x;
      var baseY = below ? node.y + drawR + 6 : node.y - drawR - 6;
      if (node.labelNudge == null) node.labelNudge = 0;
      // Decay nudge toward rest so labels don't vibrate
      node.labelNudge *= 0.82;
      var y = baseY + node.labelNudge;
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.transform = below
        ? "translate(-50%, 0)"
        : "translate(-50%, -100%)";
      var vis = node.visibility == null ? 1 : node.visibility;
      var opacity = vis * labelAlpha;
      el.style.opacity = String(opacity);
      el.classList.toggle("is-ready", opacity > 0.15);
      el.classList.toggle("is-active", state.hoverIndex === i && vis > 0.5);
      el.classList.toggle("is-filtered-out", vis < 0.15);

      if (vis < 0.15 || labelAlpha < 0.2) continue;
      var w = el.offsetWidth || 120;
      var h = Math.min(el.offsetHeight || 28, 54);
      boxes.push({
        node: node,
        el: el,
        x: x,
        y: below ? y : y - h,
        w: w,
        h: h,
        below: below,
        baseY: baseY,
      });
    }

    // Soft anti-overlap: accumulate nudge on the node, apply next frame smoothed
    for (i = 0; i < boxes.length; i++) {
      for (var j = i + 1; j < boxes.length; j++) {
        var A = boxes[i];
        var B = boxes[j];
        var overlapX =
          Math.min(A.x + A.w * 0.5, B.x + B.w * 0.5) -
          Math.max(A.x - A.w * 0.5, B.x - B.w * 0.5);
        var overlapY = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
        if (overlapX <= 6 || overlapY <= 2) continue;
        var push = Math.min(10, overlapY * 0.35 + 1.5);
        if (A.y <= B.y) {
          A.node.labelNudge -= push * 0.5;
          B.node.labelNudge += push * 0.5;
        } else {
          A.node.labelNudge += push * 0.5;
          B.node.labelNudge -= push * 0.5;
        }
      }
    }

    for (i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      box.node.labelNudge = clamp(box.node.labelNudge, -36, 36);
      var settledY = box.baseY + box.node.labelNudge;
      box.el.style.top = settledY + "px";
    }
  }

  function hexToRgba(hex, alpha) {
    var h = hex.replace("#", "");
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function frame(now) {
    if (!state.open) return;
    var t = (now - state.startTime) / 1000;
    if (state.enterProgress < 1) {
      // ~5.5s soft ease-out bloom
      var enterT = Math.min(1, t / 5.5);
      state.enterProgress = 1 - Math.pow(1 - enterT, 3.4);
    }
    state.motionSpeed = motionSpeedAt(t);
    state.motionClock += (1 / 60) * state.motionSpeed;
    simulate(t);
    draw(t);
    state.raf = requestAnimationFrame(frame);
  }

  function onKeydown(e) {
    if (e.key !== "Escape" || !state.open) return;
    if (window.EmbedViewer && window.EmbedViewer.isOpen && window.EmbedViewer.isOpen()) {
      return;
    }
    if (window.PdfModal && window.PdfModal.isOpen && window.PdfModal.isOpen()) {
      return;
    }
    close();
  }

  function getPaths() {
    var isInSubdir = window.location.pathname.indexOf("/pages/") !== -1;
    return {
      manifest: isInSubdir
        ? "../assets/pdfs/manifest.json"
        : "./assets/pdfs/manifest.json",
    };
  }

  function normalizeTags(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map(function (tag) {
        return String(tag || "")
          .trim()
          .toLowerCase();
      })
      .filter(Boolean);
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    var file =
      typeof entry.file === "string" && entry.file.trim()
        ? entry.file.trim()
        : null;
    var url =
      typeof entry.url === "string" && entry.url.trim()
        ? entry.url.trim()
        : null;
    var title =
      entry.title ||
      entry.title_es ||
      entry.titleEs ||
      entry.id ||
      file ||
      url;
    if (!title) return null;
    return {
      id: entry.id || null,
      file: file,
      url: url,
      title: title,
      titleEs: entry.title_es || entry.titleEs || entry.title || title,
      titleEn: entry.title_en || entry.titleEn || entry.title || title,
      category: entry.category || "cuerpo",
      tags: normalizeTags(entry.tags),
    };
  }

  function rawProcessList(data) {
    if (!data || typeof data !== "object") return [];
    if (Array.isArray(data.processes)) return data.processes;
    if (Array.isArray(data.pdfs)) return data.pdfs;
    return [];
  }

  function hasLink(entry) {
    return !!(entry && (entry.file || entry.url));
  }

  async function resolveFiles(files) {
    if (files && files.length) {
      return files.map(normalizeEntry).filter(Boolean).filter(hasLink);
    }
    try {
      var response = await fetch(getPaths().manifest);
      if (!response.ok) return [];
      var data = await response.json();
      // Temporarily hide info-only nodes (no file/url) until content is ready.
      return rawProcessList(data).map(normalizeEntry).filter(Boolean).filter(hasLink);
    } catch (err) {
      console.warn("ProcessGraph: no se pudo cargar el manifest", err);
      return [];
    }
  }

  async function open(files) {
    ensureDom();
    state.reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    state.userDriven = isUserDrivenLayout();

    // Always load the full process catalog (ignore PDF-only lists).
    var list = await resolveFiles(null);
    if (!list.length && files && files.length) {
      list = files.map(normalizeEntry).filter(Boolean);
    }
    if (!list.length) {
      console.warn("ProcessGraph: no hay procesos para mostrar");
      return;
    }

    state.open = true;
    state.dragIndex = -1;
    state.dragging = false;
    state.hoverIndex = -1;
    state.selectedCategories = {};
    state.enterProgress = state.reducedMotion || state.userDriven ? 1 : 0;
    state.motionSpeed = state.userDriven ? 0 : state.reducedMotion ? 1 : 0.03;
    state.motionClock = 0;
    state.startTime = performance.now();

    els.overlay.style.display = "flex";
    els.overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";

    resizeCanvas();
    buildGraph(list);
    buildLabels();
    updateI18n();
    captureLayoutBase();
    state.layoutMode = layoutMode(state.width, state.height);
    state.resizeAdapt = 0;
    syncMotionMode();

    requestAnimationFrame(function () {
      els.overlay.classList.add("is-visible");
    });

    cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(frame);
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    cancelAnimationFrame(state.raf);
    state.raf = 0;

    if (els.overlay) {
      els.overlay.classList.remove("is-visible");
      setTimeout(function () {
        if (!state.open && els.overlay) {
          els.overlay.classList.remove("is-open");
          els.overlay.style.display = "none";
        }
      }, 1100);
    }

    // Only restore scroll if PDF / embed modal is not open
    var pdfOpen =
      window.PdfModal && window.PdfModal.isOpen && window.PdfModal.isOpen();
    var embedOpen =
      window.EmbedViewer &&
      window.EmbedViewer.isOpen &&
      window.EmbedViewer.isOpen();
    if (!pdfOpen && !embedOpen) {
      document.body.style.overflow = "";
    }
  }

  function bindEntry() {
    var btn = document.getElementById("process-map-btn");
    if (!btn) return;
    // Home page loads this script on demand and owns the click handler.
    if (btn.getAttribute("data-external-loader") === "true") return;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      open();
    });
  }

  function watchLanguage() {
    // main.js writes localStorage without a custom event; poll lightly when open
    var last = getLanguage();
    setInterval(function () {
      var lang = getLanguage();
      if (lang !== last) {
        last = lang;
        if (state.open) updateI18n();
      }
    }, 400);
  }

  function init() {
    bindEntry();
    watchLanguage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.ProcessGraph = {
    open: open,
    close: close,
    isOpen: function () {
      return state.open;
    },
  };
})();
