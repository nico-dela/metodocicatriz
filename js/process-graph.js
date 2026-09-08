(function () {
  "use strict";

  var CATEGORIES = {
    cat1: {
      color: "#c45c26",
      labelEs: "Categoría 1",
      labelEn: "Category 1",
    },
    cat2: {
      color: "#2f6f6a",
      labelEs: "Categoría 2",
      labelEn: "Category 2",
    },
    cat3: {
      color: "#c4a035",
      labelEs: "Categoría 3",
      labelEn: "Category 3",
    },
  };

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
  };

  var els = {
    overlay: null,
    canvas: null,
    ctx: null,
    labels: null,
    legend: null,
    title: null,
    hint: null,
  };

  function getLanguage() {
    return localStorage.getItem("language") || "es";
  }

  function categoryColor(id) {
    return (CATEGORIES[id] || CATEGORIES.cat1).color;
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
    var lang = getLanguage();
    var full =
      lang === "en"
        ? entry.titleEn || entry.title || entry.file
        : entry.titleEs || entry.title || entry.file;
    return String(full)
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim();
  }

  /** Round-robin by category so colors interleave instead of clustering. */
  function interleaveByCategory(files) {
    var buckets = {};
    var order = [];
    files.forEach(function (entry) {
      var cat = entry.category || "cat1";
      if (!buckets[cat]) {
        buckets[cat] = [];
        order.push(cat);
      }
      buckets[cat].push(entry);
    });
    var result = [];
    var remaining = true;
    while (remaining) {
      remaining = false;
      order.forEach(function (cat) {
        if (buckets[cat].length) {
          result.push(buckets[cat].shift());
          remaining = true;
        }
      });
    }
    return result;
  }

  function orbitHubs(w, h) {
    return [
      { x: w * 0.5, y: h * 0.48 },
      { x: w * 0.32, y: h * 0.4 },
      { x: w * 0.68, y: h * 0.58 },
    ];
  }

  function buildGraph(files) {
    var mixed = interleaveByCategory(files);
    var hubs = orbitHubs(state.width, state.height);
    var n = mixed.length;

    var nodes = mixed.map(function (entry, i) {
      var cat = entry.category || "cat1";
      var hub = hubs[i % hubs.length];
      var ring = Math.floor(i / hubs.length) % 3;
      var phase = (i / Math.max(n, 1)) * Math.PI * 2 + (i % 3) * 0.7;
      var dir = i % 2 === 0 ? 1 : -1;
      var orbitR =
        Math.min(state.width, state.height) * (0.16 + ring * 0.09) +
        (i % 5) * 6;
      var omega = dir * (0.042 + (i % 4) * 0.01);
      // Almost on final orbit — entrance is a fade, not a scramble
      var birth = 0.9 + (i % 5) * 0.012;
      var startX = hub.x + Math.cos(phase) * orbitR * birth;
      var startY = hub.y + Math.sin(phase) * orbitR * birth * 0.78;

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
        orbitAspect: 0.72 + (i % 3) * 0.08,
        angle: phase,
        omega: omega,
        epicycleR: 6 + (i % 4) * 2.5,
        epicycleOmega: omega * (1.45 + (i % 3) * 0.22),
        epicyclePhase: phase * 1.7,
        r: Math.max(18, Math.min(28, 14 + shortTitle(entry).length * 0.35)),
        phase: phase,
        scale: 0,
        appearDelay: 0.15 + i * 0.11,
        visibility: 1,
        hubIndex: i % hubs.length,
      };
    });

    // Mixed constellation links: neighbors in interleaved order + cross-hub chords
    var links = [];
    for (var i = 0; i < n; i++) {
      links.push({ a: i, b: (i + 1) % n, strength: 0.004 });
      if (n > 3) {
        links.push({ a: i, b: (i + 2) % n, strength: 0.002 });
      }
    }
    for (i = 0; i < hubs.length; i++) {
      var group = [];
      nodes.forEach(function (node, idx) {
        if (node.hubIndex === i) group.push(idx);
      });
      for (var g = 0; g < group.length; g++) {
        var nextHub = (i + 1) % hubs.length;
        var other = nodes.findIndex(function (node, idx) {
          return node.hubIndex === nextHub && idx !== group[g];
        });
        if (other >= 0 && g < 2) {
          links.push({ a: group[g], b: other, strength: 0.0015 });
        }
      }
    }

    state.hubs = hubs;
    state.nodes = nodes;
    state.links = links;
  }

  function ensureDom() {
    if (els.overlay) return;

    var overlay = document.createElement("div");
    overlay.id = "process-graph-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "process-graph-title");
    overlay.innerHTML =
      '<header class="process-graph-toolbar">' +
      '  <h2 id="process-graph-title" class="process-graph-title" data-es="Mapa de procesos" data-en="Process map">Mapa de procesos</h2>' +
      '  <button type="button" class="process-graph-close" aria-label="Cerrar" data-es-aria="Cerrar" data-en-aria="Close">&times;</button>' +
      "</header>" +
      '<div class="process-graph-stage">' +
      '  <canvas id="process-graph-canvas"></canvas>' +
      '  <div class="process-graph-labels" id="process-graph-labels"></div>' +
      "</div>" +
      '<div class="process-graph-legend" id="process-graph-legend"></div>' +
      '<p class="process-graph-hint" data-es="Tocá categorías para filtrar · Arrastrá un nodo · Tocá para abrir" data-en="Tap categories to filter · Drag a node · Tap to open">Tocá categorías para filtrar · Arrastrá un nodo · Tocá para abrir</p>';

    document.body.appendChild(overlay);

    els.overlay = overlay;
    els.canvas = overlay.querySelector("#process-graph-canvas");
    els.ctx = els.canvas.getContext("2d");
    els.labels = overlay.querySelector("#process-graph-labels");
    els.legend = overlay.querySelector("#process-graph-legend");
    els.title = overlay.querySelector("#process-graph-title");
    els.hint = overlay.querySelector(".process-graph-hint");

    overlay
      .querySelector(".process-graph-close")
      .addEventListener("click", close);

    bindPointer();
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onKeydown);
  }

  function updateI18n() {
    var lang = getLanguage();
    if (els.title) {
      els.title.textContent =
        els.title.getAttribute("data-" + lang) || els.title.textContent;
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

  function onResize() {
    if (!state.open) return;
    var prevW = state.width;
    var prevH = state.height;
    resizeCanvas();
    if (prevW > 0 && prevH > 0) {
      var sx = state.width / prevW;
      var sy = state.height / prevH;
      state.hubs = orbitHubs(state.width, state.height);
      state.nodes.forEach(function (n) {
        n.x *= sx;
        n.y *= sy;
        n.orbitR *= Math.min(sx, sy);
        n.epicycleR *= Math.min(sx, sy);
        var hub = state.hubs[n.hubIndex] || state.hubs[0];
        n.orbitCx = hub.x;
        n.orbitCy = hub.y;
      });
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
        }
        if (e.cancelable) e.preventDefault();
        return;
      }

      if (!e.touches) {
        var hit = hitTest(pos.x, pos.y);
        state.hoverIndex = hit;
        canvas.classList.toggle("is-hover-node", hit >= 0);
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
        }
        node.pinned = false;
        reanchorOrbit(node, throwVx, throwVy);
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

  function openNode(node) {
    if (!node || !node.entry || !window.PdfModal || !window.PdfModal.open) {
      return;
    }
    window.PdfModal.open(node.entry.file);
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
    var damp = 0.96 - settleEase * 0.05;
    var pull = 0.004 + settleEase * 0.014;
    var repelScale = 0.08 + settleEase * 0.28;
    var i;
    var j;
    var dt = 1 / 60;

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

    // Soft repulsion — dragged node gently bumps others aside
    for (i = 0; i < n; i++) {
      for (j = i + 1; j < n; j++) {
        var a = nodes[i];
        var b = nodes[j];
        if (a.pinned && b.pinned) continue;
        if ((a.visibility || 1) < 0.2 || (b.visibility || 1) < 0.2) continue;

        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dist2 = dx * dx + dy * dy + 0.01;
        var dist = Math.sqrt(dist2);
        var ra = a.r * (a.scale || 1);
        var rb = b.r * (b.scale || 1);
        var minDist = ra + rb + (a.pinned || b.pinned ? 6 : 22);
        var reach = a.pinned || b.pinned ? minDist * 1.35 : minDist * 2.2;
        if (dist >= reach) continue;

        var overlap = minDist - dist;
        var force;
        if (a.pinned || b.pinned) {
          // Subtle collision while dragging: soft push on the free node only
          force = Math.max(0, overlap) * 0.55 + 80 / dist2;
        } else {
          force =
            (dist < minDist ? overlap * 0.14 : 220 / dist2) * repelScale;
        }

        var fx = (dx / dist) * force;
        var fy = (dy / dist) * force;

        if (a.pinned && !b.pinned) {
          b.fx -= fx;
          b.fy -= fy;
          // Carry orbit hub a little so the bump sticks
          b.orbitCx -= fx * 0.35;
          b.orbitCy -= fy * 0.35;
          b.bump = Math.min(1, (b.bump || 0) + 0.35);
          // Separate slightly so they don't stick overlapping
          if (overlap > 0) {
            var sep = overlap * 0.45;
            b.x -= (dx / dist) * sep;
            b.y -= (dy / dist) * sep;
            b.orbitCx -= (dx / dist) * sep;
            b.orbitCy -= (dy / dist) * sep;
          }
        } else if (b.pinned && !a.pinned) {
          a.fx += fx;
          a.fy += fy;
          a.orbitCx += fx * 0.35;
          a.orbitCy += fy * 0.35;
          a.bump = Math.min(1, (a.bump || 0) + 0.35);
          if (overlap > 0) {
            var sepA = overlap * 0.45;
            a.x += (dx / dist) * sepA;
            a.y += (dy / dist) * sepA;
            a.orbitCx += (dx / dist) * sepA;
            a.orbitCy += (dy / dist) * sepA;
          }
        } else {
          a.fx += fx;
          a.fy += fy;
          b.fx -= fx;
          b.fy -= fy;
        }
      }
    }

    // Very light springs — skip freshly released nodes
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
      var ideal = 150;
      var spring = (ld - ideal) * link.strength * 0.06 * settleEase;
      var sfx = (ldx / ld) * spring;
      var sfy = (ldy / ld) * spring;
      na.fx += sfx;
      na.fy += sfy;
      nb.fx -= sfx;
      nb.fy -= sfy;
    }

    for (i = 0; i < n; i++) {
      node = nodes[i];
      var nodeAppear = Math.max(
        0,
        Math.min(1, (settle - (node.appearDelay || 0) * 0.22) / 1.15),
      );
      var appearEase = 1 - Math.pow(1 - nodeAppear, 3.2);

      if (node.pinned) {
        var pinnedScale = appearEase * 1.08;
        node.scale += (pinnedScale - node.scale) * 0.05;
        continue;
      }

      var margin = 40;
      if (node.x < margin) node.fx += (margin - node.x) * 0.02;
      if (node.x > state.width - margin)
        node.fx -= (node.x - (state.width - margin)) * 0.02;
      if (node.y < margin) node.fy += (margin - node.y) * 0.02;
      if (node.y > state.height - margin)
        node.fy -= (node.y - (state.height - margin)) * 0.02;

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

      var targetScale = appearEase;
      if (state.hoverIndex === i) targetScale *= 1.08;
      node.scale += (targetScale - node.scale) * 0.035;

      var wantVisible = isNodeVisible(node) ? 1 : 0;
      var vis = node.visibility == null ? 1 : node.visibility;
      node.visibility = vis + (wantVisible - vis) * 0.14;
      if (node.visibility < 0.01) node.visibility = 0;
      if (node.visibility > 0.99) node.visibility = 1;
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
        0.08 *
        state.enterProgress;
      if (linkAlpha < 0.004) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      var mx = (a.x + b.x) / 2;
      var my =
        (a.y + b.y) / 2 + Math.sin(t * 0.2 + i + a.angle) * 3;
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.strokeStyle = "rgba(242,240,235," + linkAlpha + ")";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    // Nodes
    for (i = 0; i < state.nodes.length; i++) {
      var node = state.nodes[i];
      var vis = node.visibility == null ? 1 : node.visibility;
      if (vis < 0.02) continue;
      var r = node.r * node.scale;
      var color = categoryColor(node.category);
      var pulse = state.reducedMotion
        ? 0
        : Math.sin(t * 0.55 + node.phase) * 0.035 + 0.04;
      var bump = node.bump || 0;
      var drawR = r * (1 + bump * 0.08);

      ctx.globalAlpha = vis;

      ctx.beginPath();
      ctx.arc(
        node.x,
        node.y,
        drawR + 8 + pulse * 8 + bump * 6,
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
    for (var i = 0; i < children.length; i++) {
      var node = state.nodes[i];
      if (!node) continue;
      var el = children[i];
      var x = node.x;
      var y = node.y + node.r * node.scale;
      el.style.left = x + "px";
      el.style.top = y + "px";
      var vis = node.visibility == null ? 1 : node.visibility;
      el.style.opacity = String(
        vis * (state.enterProgress > 0.5 ? 1 : state.enterProgress / 0.5),
      );
      el.classList.toggle(
        "is-ready",
        state.enterProgress > 0.5 && vis > 0.2,
      );
      el.classList.toggle("is-active", state.hoverIndex === i && vis > 0.5);
      el.classList.toggle("is-filtered-out", vis < 0.15);
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
    if (window.PdfModal && window.PdfModal.isOpen && window.PdfModal.isOpen()) {
      return;
    }
    close();
  }

  function getFiles() {
    if (window.PdfModal && typeof window.PdfModal.getFiles === "function") {
      return window.PdfModal.getFiles();
    }
    return [];
  }

  function getPaths() {
    var isInSubdir = window.location.pathname.indexOf("/pages/") !== -1;
    return {
      manifest: isInSubdir
        ? "../assets/pdfs/manifest.json"
        : "./assets/pdfs/manifest.json",
    };
  }

  function normalizeEntry(entry) {
    if (!entry || typeof entry.file !== "string") return null;
    return {
      file: entry.file,
      title: entry.title || entry.file,
      titleEs: entry.title_es || entry.titleEs || entry.title || entry.file,
      titleEn: entry.title_en || entry.titleEn || entry.title || entry.file,
      category: entry.category || "cat1",
    };
  }

  async function resolveFiles(files) {
    if (files && files.length) return files;
    var fromModal = getFiles();
    if (fromModal.length) return fromModal;
    try {
      var response = await fetch(getPaths().manifest);
      if (!response.ok) return [];
      var data = await response.json();
      return (data.pdfs || []).map(normalizeEntry).filter(Boolean);
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

    var list = await resolveFiles(files);
    if (!list.length) {
      console.warn("ProcessGraph: no hay procesos para mostrar");
      return;
    }

    state.open = true;
    state.dragIndex = -1;
    state.dragging = false;
    state.hoverIndex = -1;
    state.selectedCategories = {};
    state.enterProgress = state.reducedMotion ? 1 : 0;
    state.motionSpeed = state.reducedMotion ? 1 : 0.03;
    state.motionClock = 0;
    state.startTime = performance.now();

    els.overlay.style.display = "flex";
    els.overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";

    resizeCanvas();
    buildGraph(list);
    buildLabels();
    updateI18n();

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

    // Only restore scroll if PDF modal is not open
    if (!(window.PdfModal && window.PdfModal.isOpen && window.PdfModal.isOpen())) {
      document.body.style.overflow = "";
    }
  }

  function bindEntry() {
    var btn = document.getElementById("process-map-btn");
    if (!btn) return;
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
