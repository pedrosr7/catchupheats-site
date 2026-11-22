// The Live tab of a competition page: the live server's public live view, asked every few seconds while the page is in sight. The
// build writes the tabs and the panel hidden; they show only once a live answers, so without this script, or with no
// live, the page is the Info it always was. Everything is drawn with textContent: nothing from the wire becomes markup.
(function () {
  "use strict";

  var panel = document.getElementById("live-panel");
  var bar = document.querySelector(".tabs[role=tablist]");
  var info = document.getElementById("info-panel");
  if (!panel || !bar || !info || !window.fetch) return;

  var EVERY = 5000;
  // A request a venue's wifi leaves hanging counts as a failure after this long, so the page asks again.
  var PATIENCE = 10000;
  var MOST = 60000;
  // Before anything was shown, a live that never answers is no live: the page stops asking after this many tries.
  var TRIES = 4;
  var DAY = 86400000;
  // the live server's cache plus a slow answer; a bigger jump is the device's clock being changed, which the heat clock follows.
  var SKEW = 3000;
  // After giving up, coming back to the page this much later tries again: venue wifi recovers.
  var AGAIN = 60000;
  // From the day before it starts to a week after it ends: the rest of the year nobody runs it live.
  var BEFORE_DAYS = 1;
  var AFTER_DAYS = 7;
  // The views and choices are kept in this browser only; a private window or blocked storage falls back to the default.
  var VIEW_KEY = "catchupheats.live.view";
  var HEAT_VIEW_KEY = "catchupheats.live.heatview";
  var AVATAR_KEY = "catchupheats.live.avatarstyle";
  var AVATAR_STYLES = ["det", "com", "ret"];
  // avatars.js's lane colours, by lane: the rows have their pins when that script never comes.
  var PINS = ["#ff4a1c", "#1fb5a8", "#8a5cf5", "#f2efe6", "#f2c230", "#3d8bfd", "#f05a9a", "#9bd13b"];
  var HINT_KEY = "catchupheats.live.trackhint";
  // Where the visitor was looking, for the next page of this tab: the other language's, or this one reloaded.
  var VIEWS_KEY = "catchupheats.live.trackviews";

  var data = panel.dataset;
  if (!within(data.start, data.end)) return;

  var status = panel.querySelector(".live-status");
  var body = panel.querySelector(".live-body");
  var updated = panel.querySelector(".live-updated");
  var tabs = [].slice.call(bar.querySelectorAll("[role=tab]"));
  var panels = [info, panel];
  var lang = document.documentElement.lang || "es";

  var shown = false;
  var stopped = false;
  var failures = 0;
  var timer = null;
  var asking = false;
  var ticking = null;
  var offset = 0;
  var anchored = false;
  var gaveUpAt = 0;
  var drawn = "";
  var latest = null;
  var view = remembered(VIEW_KEY, "table", "list");
  var heatView = remembered(HEAT_VIEW_KEY, "times", "visual");
  var avatarStyle = rememberedOf(AVATAR_KEY, AVATAR_STYLES);
  var hinting = remembered(HINT_KEY, "done", "") === "";
  var category = null;
  // The heats the last redraw put on the page, for their scenes; the script that draws them loads once one is running.
  var scenes = [];
  var avatarsAsked = false;
  // The scene goes, and its rows are plain text, without its script or on a phone that cannot keep up.
  var drawable = !!data.avatars;
  // By heat on the floor: its card and its track, which no redraw replaces, so a finger on it or a full screen outlives them.
  var tracks = {};
  var leftViews = viewsLeft();

  function rememberedOf(key, names) {
    try {
      var kept = window.localStorage.getItem(key);
      return names.indexOf(kept) >= 0 ? kept : names[0];
    } catch (e) {
      return names[0];
    }
  }

  function remembered(key, other, fallback) {
    try {
      return window.localStorage.getItem(key) === other ? other : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function remember(key, name) {
    try {
      window.localStorage.setItem(key, name);
    } catch (e) {
      // Nothing to keep it in: the choice lasts this visit.
    }
  }

  function t(key) { return panel.getAttribute("data-t-" + key) || ""; }

  function within(start, end) {
    if (!start || !end) return false;
    var now = new Date();
    var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return today >= utc(start) - BEFORE_DAYS * DAY && today <= utc(end) + AFTER_DAYS * DAY;
  }

  function utc(day) { return Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)); }

  function schedule(ms) {
    clearTimeout(timer);
    timer = null;
    if (stopped || document.hidden) return;
    timer = setTimeout(ask, ms);
  }

  function ask() {
    timer = null;
    if (stopped || asking || document.hidden) return;
    asking = true;
    var abort = window.AbortController ? new AbortController() : null;
    var patience = abort && setTimeout(function () { abort.abort(); }, PATIENCE);
    var options = { credentials: "omit", cache: "no-store" };
    if (abort) options.signal = abort.signal;
    fetch(data.api, options).then(function (response) {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json().then(function (envelope) {
        var live = envelope && envelope.data;
        if (!live || !Array.isArray(live.now) || !Array.isArray(live.next) || !Array.isArray(live.standings)) {
          throw new Error("not a live");
        }
        return live;
      });
    }).then(function (live) {
      clearTimeout(patience);
      asking = false;
      if (!live) return over();
      failures = 0;
      if (typeof live.serverNowMs === "number") anchor(live.serverNowMs - Date.now());
      draw(live);
      show();
      updated.textContent = t("updated").replace("{time}", clockTime(Date.now()));
      schedule(EVERY);
    }).catch(function () {
      clearTimeout(patience);
      asking = false;
      failures++;
      if (!shown && failures >= TRIES) {
        stopped = true;
        gaveUpAt = Date.now();
        return;
      }
      if (shown) updated.textContent = t("retrying");
      schedule(Math.min(EVERY * Math.pow(2, failures), MOST));
    });
  }

  // The live server answers from a cache up to 2 s old, so each answer's server time is late by a different amount: the clock
  // keeps the latest anchor it has seen and never steps back, unless the jump is too big to be the cache (the device's
  // clock was changed).
  function anchor(seen) {
    offset = anchored && Math.abs(seen - offset) < SKEW ? Math.max(offset, seen) : seen;
    anchored = true;
  }

  // A 404 once the live was shown means it was taken down: what was shown stays, said to be over.
  function over() {
    stopped = true;
    // Not live yet: a visitor who comes back later asks again, as after a give-up.
    if (!shown) gaveUpAt = Date.now();
    stopClocks();
    if (shown) updated.textContent = t("ended");
  }

  function show() {
    if (shown) return;
    shown = true;
    tabs.forEach(function (tab, i) {
      var target = panels[i];
      target.setAttribute("role", "tabpanel");
      target.setAttribute("aria-labelledby", tab.id);
      target.setAttribute("tabindex", "0");
      tab.addEventListener("click", function () { select(i, false); });
      tab.addEventListener("keydown", function (event) {
        var to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[event.key];
        if (to === undefined) return;
        event.preventDefault();
        select((to + tabs.length) % tabs.length, true);
      });
    });
    bar.hidden = false;
    startClocks();
  }

  function select(index, focus) {
    tabs.forEach(function (tab, i) {
      var on = i === index;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.setAttribute("tabindex", on ? "0" : "-1");
      panels[i].hidden = !on;
    });
    if (focus) tabs[index].focus();
  }

  window.addEventListener("pagehide", leaveViews);

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      leaveViews();
      clearTimeout(timer);
      timer = null;
      stopClocks();
    } else {
      if (stopped && !shown && gaveUpAt && Date.now() - gaveUpAt >= AGAIN) {
        stopped = false;
        failures = 0;
        gaveUpAt = 0;
      }
      if (stopped) return;
      if (shown) startClocks();
      if (!asking) ask();
    }
  });

  // Drawing

  function draw(live) {
    var said = live.now.map(function (heat) { return heat.wodName + " · " + heat.categoryName + " · " + heatState(heat.status); })
      .join(" / ") || t("nothing");
    // Only a change is announced: the region is polite, and the same words every 5 s would be noise. With no heat on
    // the floor this line is the only place that says so.
    if (status.textContent !== said) status.textContent = said;
    latest = live;
    if (shownKey() === drawn) return tickClocks();
    paint();
  }

  function shownKey() {
    return JSON.stringify([latest.now, latest.next, latest.standings, view, heatView, avatarStyle, category, drawable]);
  }

  // Draws the latest answer with the visitor's view and category: on a new answer, and at once on a press.
  function paint() {
    var live = latest;
    var kept = keep();
    scenes = [];
    var parts = [];
    if (live.now.length) {
      parts.push(el("h2", null, t("now")));
      live.now.forEach(function (heat) { parts.push(heatBlock(heat)); });
    }
    if (live.next.length) {
      parts.push(el("h2", null, t("next")));
      var list = el("ol", "next-heats");
      live.next.forEach(function (heat) { list.appendChild(nextItem(heat)); });
      parts.push(list);
    }
    // The live server lists every category: one with no published WOD or no one in it has nothing to rank yet.
    var ranked = live.standings.filter(function (one) {
      return (one.wodNames || []).length && (one.standings || []).length;
    });
    if (ranked.length) {
      var chosen = ranked.filter(function (one) { return one.categoryName === category; })[0] || ranked[0];
      category = chosen.categoryName;
      parts.push(el("h2", null, t("standings")));
      parts.push(standings(ranked, chosen));
    }
    arrange(body, parts);
    forgetTracks();
    restore(kept);
    drawn = shownKey();
    tickClocks();
    athletes();
  }

  // The nodes a redraw keeps are never taken out of the page, not even for a moment: that would end a gesture on them.
  function arrange(parent, nodes) {
    [].slice.call(parent.childNodes).forEach(function (node) {
      if (nodes.indexOf(node) < 0) parent.removeChild(node);
    });
    var at = parent.firstChild;
    nodes.forEach(function (node) {
      if (node === at) at = at.nextSibling;
      else parent.insertBefore(node, at);
    });
  }

  // The scene is decoration: its script is fetched only when a heat is running in «Visual», and a failure to load it
  // leaves the rows alone.
  function athletes() {
    if (window.CatchUpAvatars) {
      return window.CatchUpAvatars.sync(scenes, { style: avatarStyle, onLevel: allow, onView: showView });
    }
    if (avatarsAsked || !scenes.some(function (one) { return one.track; })) return;
    avatarsAsked = true;
    var script = document.createElement("script");
    script.src = panel.dataset.avatars;
    script.async = true;
    // The rows become buttons now that there is something to follow them on.
    script.onload = function () { if (window.CatchUpAvatars) paint(); };
    script.onerror = function () { allow({ scene: false }); };
    document.head.appendChild(script);
  }

  function allow(what) {
    drawable = what.scene;
    if (shown && latest) paint();
  }

  // A redraw replaces most of the panel's nodes: what the visitor scrolled sideways or has focus on is put back where it was.
  function keep() {
    var scrolled = {};
    [].forEach.call(body.querySelectorAll(".table-wrap"), function (wrap) {
      scrolled[wrap.getAttribute("data-key")] = wrap.scrollLeft;
    });
    var focused = document.activeElement;
    return { scrolled: scrolled, focused: focused && body.contains(focused) ? focused.getAttribute("data-key") : null };
  }

  function restore(kept) {
    [].forEach.call(body.querySelectorAll("[data-key]"), function (node) {
      var key = node.getAttribute("data-key");
      var left = kept.scrolled[key];
      if (left) node.scrollLeft = left;
      if (kept.focused !== null && key === kept.focused) node.focus({ preventScroll: true });
    });
  }

  function heatBlock(heat) {
    var phases = heat.phases || [];
    var lanes = (heat.lanes || []).map(function (lane) { return laneState(lane, phases); });
    var it = drawable && heat.status === "RUNNING" && lanes.length ? trackOf(heat) : null;
    var block = it ? it.card : el("article", "heat");
    var parts = [];
    var head = el("div", "heat-head");
    var main = el("div", "heat-head-main");
    var title = el("p", "heat-title");
    title.appendChild(el("span", "heat-name", heat.wodName + " · " + heat.categoryName));
    title.appendChild(el("span", "heat-state", heatState(heat.status)));
    main.appendChild(title);
    head.appendChild(main);
    var running = heat.status === "RUNNING" && typeof heat.startedAtMs === "number";
    var cap = typeof heat.capSeconds === "number" ? t("cap").replace("{time}", seconds(heat.capSeconds)) : null;
    if (cap) main.appendChild(el("p", "heat-cap", cap));
    var clock = heatClock(heat);
    if (clock) head.appendChild(clock);
    parts.push(head);
    if (running && cap) {
      var gone = el("progress", "heat-progress");
      gone.max = heat.capSeconds;
      gone.value = 0;
      gone.setAttribute("data-started", heat.startedAtMs);
      gone.setAttribute("aria-label", cap);
      parts.push(gone);
    }
    var views = el("div", "heat-view");
    views.setAttribute("role", "group");
    views.setAttribute("aria-label", t("heatview"));
    ["visual", "times"].forEach(function (name) {
      views.appendChild(toggle("heatview:" + heat.heatId + ":" + name, t(name), heatView === name, function () {
        heatView = name;
        remember(HEAT_VIEW_KEY, name);
      }));
    });
    parts.push(views);
    if (heatView === "visual") {
      var looks = el("div", "avatar-style");
      looks.setAttribute("role", "group");
      looks.setAttribute("aria-label", t("avatars"));
      looks.appendChild(el("span", "avatar-style-label", t("avatars")));
      AVATAR_STYLES.forEach(function (name) {
        looks.appendChild(toggle("avatars:" + heat.heatId + ":" + name, t("av-" + name), avatarStyle === name, function () {
          avatarStyle = name;
          remember(AVATAR_KEY, name);
        }));
      });
      parts.push(looks);
    }
    var ordered = byRank(lanes);
    givePlaces(ordered);
    if (it) sceneOf(it, heat, ordered);
    if (heatView === "times") {
      parts.push(times(heat, phases, lanes));
    } else {
      if (it) parts.push(it.slot);
      var list = el("ol", "lanes");
      // Two columns on a wide card, the first one filled first.
      list.style.setProperty("--half", Math.ceil(ordered.length / 2));
      ordered.forEach(function (one) { list.appendChild(laneItem(one, phases.length, heat, it)); });
      parts.push(list);
      var note = laneNote(ordered, heat);
      if (note) parts.push(note);
    }
    arrange(block, parts);
    return block;
  }

  function heatClock(heat) {
    if (heat.status !== "RUNNING" || typeof heat.startedAtMs !== "number") return null;
    var clock = el("span", "live-clock");
    clock.setAttribute("data-started", heat.startedAtMs);
    if (typeof heat.capSeconds === "number") clock.setAttribute("data-cap", heat.capSeconds);
    // A timer is read when the visitor reaches it, never announced on its own: it changes every second.
    clock.setAttribute("role", "timer");
    return clock;
  }

  // The place the rows' order gives each lane. The server ranks everyone 1 before the first mark: that is no place yet.
  function givePlaces(ordered) {
    var standing = ordered.filter(function (one) { return !one.voided && typeof one.rank === "number"; });
    var level = standing.every(function (one) { return one.rank === standing[0].rank && !one.marks && !one.result; });
    standing.forEach(function (one) {
      if (!level) one.place = { n: one.rank, text: ordinal(one.rank) };
    });
  }

  function ordinal(n) {
    var rule = window.Intl && Intl.PluralRules ? new Intl.PluralRules(lang, { type: "ordinal" }).select(n) : "other";
    return (t("ordinal-" + rule) || t("ordinal-other")).replace("{n}", n);
  }

  // What avatars.js draws of a heat: every lane in the order of the floor, and the visitor's view of it if this page was left
  // and opened again.
  function sceneOf(it, heat, ordered) {
    scenes.push({
      key: heat.heatId, heat: heat, track: heatView === "visual" ? it.scene : null, view: leftViews[heat.heatId] || null,
      lanes: ordered.slice().sort(function (a, b) { return a.number - b.number; }).map(function (one) {
        return {
          id: one.lane.laneId, lane: one.number, name: one.lane.entryName, done: one.marks, closed: one.closed,
          finished: !!(one.result && one.result.finished), voided: one.voided, since: began(one, heat), place: one.place,
        };
      }),
    });
  }

  // The track of a heat on the floor: the drawing, which readers skip, and the controls over it. It sits in the card's slot,
  // or over the whole page while the visitor has it on full screen.
  function trackOf(heat) {
    var it = tracks[heat.heatId], name = heat.wodName + " · " + heat.categoryName;
    if (it) {
      it.heat = heat;
      return it;
    }
    it = { heat: heat, name: name, card: el("article", "heat"), slot: el("div", "track"), box: el("div", "track-view"), screen: null };
    tracks[heat.heatId] = it;
    it.scene = el("div", "track-scene");
    it.scene.setAttribute("aria-hidden", "true");
    it.box.setAttribute("role", "group");
    it.box.setAttribute("aria-label", name);
    it.full = control("track-full", t("full"), FULL_ICON, function () { if (it.screen) it.screen.close(); else openTrack(it); });
    it.all = control("track-all", null, null, function (drawn) { drawn.home(heat.heatId); });
    it.all.textContent = t("showall");
    it.all.hidden = true;
    it.closer = control("track-in", t("zoomin"), "M12 5v14M5 12h14", function (drawn) { drawn.zoom(heat.heatId, 1.6); });
    it.farther = control("track-out", t("zoomout"), "M5 12h14", function (drawn) { drawn.zoom(heat.heatId, 1 / 1.6); });
    it.full.hidden = !window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal;
    var mouse = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    it.hint = el("p", "track-hint", t(mouse ? "hint-mouse" : "hint"));
    it.hint.setAttribute("aria-hidden", "true");
    it.hint.hidden = !hinting;
    [it.scene, it.full, it.closer, it.farther, it.all, it.hint].forEach(function (node) { it.box.appendChild(node); });
    it.slot.appendChild(it.box);
    return it;
  }

  var FULL_ICON = "M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7";
  var CLOSE_ICON = "M6 6l12 12M18 6L6 18";

  function control(className, label, path, act) {
    var button = el("button", "track-control " + className);
    button.type = "button";
    if (label) button.setAttribute("aria-label", label);
    if (path) button.appendChild(icon(path));
    button.addEventListener("click", function () { if (window.CatchUpAvatars) act(window.CatchUpAvatars); });
    return button;
  }

  function icon(path) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "path")).setAttribute("d", path);
    return svg;
  }

  // avatars.js says when a heat's view changes of kind: whole, free, or another lane followed.
  function showView(key) {
    var it = tracks[key];
    if (!it) return;
    var seen = window.CatchUpAvatars.view(key);
    it.box.classList.toggle("zoomed", seen.mode !== "whole");
    // A focused control that goes would leave the keyboard nowhere.
    if (seen.mode === "whole" && document.activeElement === it.all) it.closer.focus({ preventScroll: true });
    it.all.hidden = seen.mode === "whole";
    [].forEach.call(it.card.querySelectorAll("button.lane-row"), function (row) {
      row.setAttribute("aria-pressed", row.getAttribute("data-lane") === String(followed(key)) ? "true" : "false");
    });
    if (seen.mode === "whole" || !hinting) return;
    hinting = false;
    remember(HINT_KEY, "done");
    Object.keys(tracks).forEach(function (id) { tracks[id].hint.hidden = true; });
  }

  function followed(key) {
    var seen = window.CatchUpAvatars && window.CatchUpAvatars.view(key);
    return seen && seen.mode === "follow" ? seen.id : null;
  }

  // A modal dialog and not a fixed box: it is over the page whatever contains it, keeps what is behind out of reach, and
  // gives Escape and the way back for nothing. iPhone's Safari has no full screen for anything but a video.
  function openTrack(it) {
    var screen = el("dialog", "track-screen");
    screen.setAttribute("aria-label", it.name);
    var head = el("div", "track-screen-head");
    head.appendChild(el("span", "heat-name", it.name));
    var clock = heatClock(it.heat);
    if (clock) head.appendChild(clock);
    screen.appendChild(head);
    screen.appendChild(it.box);
    panel.appendChild(screen);
    screen.addEventListener("close", function () { closeTrack(it); });
    it.screen = screen;
    nameFull(it, t("fullexit"), CLOSE_ICON);
    document.documentElement.classList.add("track-open");
    screen.showModal();
    it.full.focus();
    tickClocks();
  }

  function closeTrack(it) {
    if (!it.screen) return;
    var screen = it.screen;
    it.screen = null;
    it.slot.appendChild(it.box);
    panel.removeChild(screen);
    document.documentElement.classList.remove("track-open");
    nameFull(it, t("full"), FULL_ICON);
    (it.slot.isConnected ? it.full : panel).focus({ preventScroll: true });
  }

  function nameFull(it, label, path) {
    it.full.setAttribute("aria-label", label);
    it.full.replaceChild(icon(path), it.full.firstChild);
  }

  // A heat that left the floor, or a scene that cannot be drawn any more, takes its full screen with it.
  function forgetTracks() {
    var here = scenes.map(function (one) { return String(one.key); });
    Object.keys(tracks).forEach(function (id) {
      if (here.indexOf(id) >= 0) return;
      var it = tracks[id];
      delete tracks[id];
      delete leftViews[id];
      closeTrack(it);
    });
  }

  function viewsLeft() {
    try {
      var left = JSON.parse(window.sessionStorage.getItem(VIEWS_KEY));
      return left && left.api === new URL(data.api, location.href).href ? left.views : {};
    } catch (e) {
      return {};
    }
  }

  function leaveViews() {
    if (!window.CatchUpAvatars) return;
    var views = {};
    scenes.forEach(function (one) {
      var seen = window.CatchUpAvatars.view(one.key);
      if (seen) views[one.key] = { mode: seen.mode, id: seen.id, s: seen.s, x: seen.x, y: seen.y, want: seen.want };
    });
    try {
      window.sessionStorage.setItem(VIEWS_KEY, JSON.stringify({ api: new URL(data.api, location.href).href, views: views }));
    } catch (e) {
      // Nothing to keep them in: the next page starts whole.
    }
  }

  // When the phase under way began, on this device's clock: the last mark the server has, or the start.
  function began(one, heat) {
    if (typeof heat.startedAtMs !== "number") return null;
    var splits = one.lane.splits || [];
    if (splits.length !== one.marks) return null;
    var last = splits.length ? splits[splits.length - 1].second : 0;
    return typeof last === "number" ? heat.startedAtMs + last * 1000 - offset : null;
  }

  // What both views read off a lane. The live server sends no progress inside a phase, so the current one is only named.
  function laneState(lane, phases) {
    var total = phases.length;
    var voided = lane.review === "VOID";
    var result = lane.result || null;
    var splits = lane.splits || [];
    var done = Math.min(lane.phasesDone || 0, total);
    if (result && result.finished) done = total;
    // The live server drops a voided lane's result, so VOID is read on its own.
    var closed = voided || !!result || !!lane.closed;
    var at = {};
    splits.forEach(function (split) { if (split && typeof split.second === "number") at[split.phase] = split.second; });
    var splitAt = phases.map(function (phase) { return typeof at[phase] === "number" ? at[phase] : null; });
    return {
      lane: lane,
      rank: lane.rank,
      number: lane.lane,
      marks: lane.phasesDone || 0,
      voided: voided,
      closed: closed,
      result: result,
      done: done,
      blank: !closed && done === 0 && !splits.length,
      current: !closed && done < total ? done : -1,
      times: splitAt,
      reached: done ? splitAt[done - 1] : null,
    };
  }

  // A row: the lane's place, its pin, its name and what it is doing. With a track to see it on, it is the button that
  // follows the lane.
  function laneItem(one, total, heat, it) {
    var lane = one.lane;
    var item = el("li", "lane");
    var row;
    if (it && window.CatchUpAvatars) {
      row = press("row:" + heat.heatId + ":" + lane.laneId, "lane-row", function () {
        if (followed(heat.heatId) === lane.laneId) return window.CatchUpAvatars.home(heat.heatId);
        window.CatchUpAvatars.follow(heat.heatId, lane.laneId);
        var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        it.slot.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
      });
      row.setAttribute("data-lane", lane.laneId);
      row.setAttribute("aria-pressed", followed(heat.heatId) === lane.laneId ? "true" : "false");
    } else {
      row = el("div", "lane-row");
    }
    item.appendChild(row);
    row.appendChild(el("span", "lane-place" + (one.place && one.place.n === 1 ? " first" : ""), one.place ? one.place.text : ""));
    var pin = el("span", "lane-pin", lane.lane);
    pin.setAttribute("aria-hidden", "true");
    pin.style.backgroundColor = PINS[(Math.max(1, Math.floor(+lane.lane || 1)) - 1) % PINS.length];
    // Layout drops the spaces; a reader of the row's name needs them between one part and the next.
    [pin, el("span", "said", t("lane").replace("{n}", lane.lane)), el("span", "lane-name", lane.entryName), laneSays(one, total, heat)]
      .forEach(function (part) {
        row.appendChild(document.createTextNode(" "));
        row.appendChild(part);
      });
    return item;
  }

  // The result once there is one; until then the phase under way and which of how many it is.
  function laneSays(one, total, heat) {
    var says = el("span", "lane-says");
    if (one.voided) {
      says.appendChild(el("span", "void", t("void")));
    } else if (one.result) {
      says.appendChild(el("span", "lane-result", one.result.display));
      if (provisional(one)) {
        var star = el("span", "lane-star", "*");
        star.setAttribute("aria-hidden", "true");
        says.appendChild(star);
        says.appendChild(el("span", "said", " " + t("provisional")));
      }
    } else if (one.blank && !opening(one, total, heat)) {
      says.appendChild(el("span", "lane-phase", t("nomarks")));
    } else {
      // The server counts an AMRAP's phases on and on: the row says the round under way.
      var laps = heat.format === "AMRAP" && total > 0 && !one.closed;
      var done = laps ? one.marks % total : one.done;
      var words = laps ? [t("round").replace("{n}", Math.floor(one.marks / total) + 1)] : [];
      if (one.lane.currentPhase) words.push(one.lane.currentPhase);
      else if (total && done >= total) words.push(t("finished"));
      if (words.length) says.appendChild(el("span", "lane-phase", words.join(" · ")));
      if (done < total) says.appendChild(el("span", "lane-count", (words.length ? " · " : "") + (done + 1) + "/" + total));
    }
    return says;
  }

  // With no marks, the first phase of a running heat is under way: the server marks a phase when it ends. Of a max-reps or
  // max-load WOD it sends none until the score, so there a phase and its count would tell nothing.
  function opening(one, total, heat) {
    return heat.status === "RUNNING" && total > 0 && !!one.lane.currentPhase && !/^MAX_/.test(heat.format);
  }

  // As the live server counts it: whatever is not validated, a review state this script does not know included.
  function provisional(one) { return !!one.result && !one.voided && one.lane.review !== "VALIDATED"; }

  // What the asterisk is, once for the whole list: every result with one is a time, or they are results.
  function laneNote(lanes, heat) {
    var starred = lanes.filter(provisional);
    if (!starred.length) return null;
    var timed = heat.format === "FOR_TIME" && starred.every(function (one) { return one.result.finished; });
    return el("p", "lane-note", t(timed ? "note-time" : "note-result"));
  }

  // Further on first; at the same phase, whoever got there first; a voided lane last.
  function byProgress(lanes) {
    return lanes.slice().sort(function (a, b) {
      if (a.voided !== b.voided) return a.voided ? 1 : -1;
      if (a.done !== b.done) return b.done - a.done;
      var ta = a.reached === null ? Infinity : a.reached;
      var tb = b.reached === null ? Infinity : b.reached;
      return ta === tb ? a.number - b.number : ta - tb;
    });
  }

  function times(heat, phases, lanes) {
    var box = el("div", "times");
    var wrap = el("div", "table-wrap");
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("data-key", "times:" + heat.heatId);
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", heat.wodName + " · " + heat.categoryName);
    var grid = el("table");
    var head = el("tr");
    [t("place"), t("athlete")].concat(phases, [t("gap")]).forEach(function (name, i, all) {
      var th = el("th", i === 0 ? "place-head" : i === 1 ? "who" : i === all.length - 1 ? "gap" : null, name);
      th.setAttribute("scope", "col");
      head.appendChild(th);
    });
    grid.appendChild(el("thead")).appendChild(head);
    var rows = el("tbody");
    var ordered = byProgress(lanes);
    var first = ordered[0] && !ordered[0].voided && ordered[0].reached !== null ? ordered[0] : null;
    ordered.forEach(function (one, n) {
      var tr = el("tr");
      var cell = el("td", "place-cell");
      cell.appendChild(el("span", "place" + (!one.voided && n === 0 && one.done ? " lead" : ""), one.voided ? "–" : String(n + 1)));
      tr.appendChild(cell);
      var name = el("th", "who");
      name.setAttribute("scope", "row");
      name.appendChild(el("span", "entry", one.lane.entryName));
      tr.appendChild(name);
      phases.forEach(function (phase, i) {
        if (i < one.done) tr.appendChild(el("td", "split", one.times[i] === null ? "–" : seconds(one.times[i])));
        else if (i === one.current) tr.appendChild(el("td", "split now", "…"));
        else tr.appendChild(el("td", "split pending", "·"));
      });
      tr.appendChild(el("td", "gap" + (one.voided ? " void-gap" : ""), one.voided ? t("void") : gap(one, first)));
      rows.appendChild(tr);
    });
    grid.appendChild(rows);
    wrap.appendChild(grid);
    box.appendChild(wrap);
    return box;
  }

  // Against the first lane's time at the same phase, which it reached no later.
  function gap(one, first) {
    if (!first || one === first || one.reached === null) return "–";
    var theirs = first.times[one.done - 1];
    return typeof theirs === "number" ? "+" + seconds(one.reached - theirs) : "–";
  }

  function nextItem(heat) {
    var item = el("li");
    var head = el("p", "next-title");
    if (typeof heat.scheduledAtMs === "number") head.appendChild(el("time", "next-time", clockTime(heat.scheduledAtMs, true)));
    head.appendChild(el("span", "next-heat-name", heat.wodName + " · " + heat.categoryName));
    item.appendChild(head);
    var names = byLane(heat.lanes || []).map(function (lane) { return lane.entryName; });
    if (names.length) item.appendChild(el("p", "next-lanes", who(names)));
    return item;
  }

  // Whole names only: «Ana, Bea y Carla», and past three «Ana, Bea y 4 más».
  function who(names) {
    var and = " " + t("and") + " ";
    if (names.length <= 3) return names.length === 1 ? names[0] : names.slice(0, -1).join(", ") + and + names[names.length - 1];
    return names.slice(0, 2).join(", ") + and + t("more").replace("{n}", names.length - 2);
  }

  function standings(ranked, chosen) {
    var box = el("section", "standings");
    var bar = el("div", "standings-bar");
    var chips = el("div", "category-chips");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", t("categories"));
    ranked.forEach(function (one) {
      chips.appendChild(toggle("category:" + one.categoryName, one.categoryName, one === chosen, function () {
        category = one.categoryName;
      }));
    });
    bar.appendChild(chips);
    var views = el("div", "view-switch");
    views.setAttribute("role", "group");
    views.setAttribute("aria-label", t("view"));
    ["list", "table"].forEach(function (name) {
      views.appendChild(toggle("view:" + name, t(name), view === name, function () {
        view = name;
        remember(VIEW_KEY, name);
      }));
    });
    bar.appendChild(views);
    box.appendChild(bar);
    // The server ranks everyone 1 before any result: that is no position yet.
    var blank = chosen.standings.every(function (row) {
      return !row.points && (row.wods || []).every(function (score) { return !score; });
    });
    box.appendChild(view === "table" ? table(chosen, blank) : list(chosen, blank));
    box.appendChild(el("p", "live-note", t("note")));
    return box;
  }

  function toggle(key, label, on, choose) {
    var button = press(key, "toggle", choose);
    button.textContent = label;
    button.setAttribute("aria-pressed", on ? "true" : "false");
    return button;
  }

  // A button that changes what is shown and redraws the panel, which keeps the focus on it by its key.
  function press(key, className, choose) {
    var button = el("button", className);
    button.type = "button";
    button.setAttribute("data-key", key);
    button.addEventListener("click", function () {
      choose();
      paint();
    });
    return button;
  }

  function place(row, blank) {
    return el("span", "place" + (!blank && row.rank === 1 ? " lead" : ""), blank ? "–" : String(row.rank));
  }

  function scoreText(score) {
    return score ? score.display + " (" + score.points + ")" + (score.provisional ? " *" : "") : "–";
  }

  function list(category, blank) {
    var rows = el("ol", "standings-list");
    category.standings.forEach(function (row) {
      var item = el("li", "standing");
      item.appendChild(place(row, blank));
      var main = el("div", "standing-main");
      main.appendChild(el("span", "entry", row.entryName));
      var wods = el("p", "standing-wods");
      (category.wodNames || []).forEach(function (name, i) {
        wods.appendChild(el("span", "wod", name + " · " + scoreText((row.wods || [])[i])));
      });
      main.appendChild(wods);
      item.appendChild(main);
      var total = el("div", "standing-total");
      total.appendChild(el("span", "points", String(row.points)));
      if (row.provisional) total.appendChild(el("span", "provisional", t("provisional")));
      item.appendChild(total);
      rows.appendChild(item);
    });
    return rows;
  }

  function table(category, blank) {
    // A wide table scrolls inside its own box on a phone; the box takes focus so a keyboard can scroll it too.
    var wrap = el("div", "table-wrap");
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("data-key", "table:" + category.categoryName);
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", category.categoryName);
    var grid = el("table");
    var head = el("tr");
    [t("place"), t("athlete")].concat(category.wodNames || [], [t("points")]).forEach(function (name, i, all) {
      var th = el("th", i === 0 ? "place-head" : i === 1 ? "who" : i === all.length - 1 ? "points-head" : null, name);
      th.setAttribute("scope", "col");
      head.appendChild(th);
    });
    grid.appendChild(el("thead")).appendChild(head);
    var rows = el("tbody");
    category.standings.forEach(function (row) {
      var tr = el("tr");
      var cell = el("td", "place-cell");
      cell.appendChild(place(row, blank));
      tr.appendChild(cell);
      var name = el("th", "who");
      name.setAttribute("scope", "row");
      name.appendChild(el("span", "entry", row.entryName));
      tr.appendChild(name);
      (row.wods || []).forEach(function (score) { tr.appendChild(el("td", "wod", scoreText(score))); });
      var points = el("td", "points", String(row.points));
      if (row.provisional) {
        points.appendChild(document.createTextNode(" "));
        points.appendChild(el("span", "provisional", t("provisional")));
      }
      tr.appendChild(points);
      rows.appendChild(tr);
    });
    grid.appendChild(rows);
    wrap.appendChild(grid);
    return wrap;
  }

  // Ranked lanes first, best first; the rest by lane.
  function byRank(lanes) {
    return lanes.slice().sort(function (a, b) {
      var ra = typeof a.rank === "number" ? a.rank : Infinity;
      var rb = typeof b.rank === "number" ? b.rank : Infinity;
      return ra === rb ? a.number - b.number : ra - rb;
    });
  }

  function byLane(lanes) { return lanes.slice().sort(function (a, b) { return a.lane - b.lane; }); }

  function heatState(state) {
    return { RUNNING: t("running"), DONE: t("finished"), PLANNED: t("planned") }[state] || "";
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  // Clocks

  function startClocks() {
    if (ticking === null && !document.hidden) ticking = setInterval(tickClocks, 1000);
  }

  function stopClocks() {
    clearInterval(ticking);
    ticking = null;
  }

  // The heat's time on the server's clock: this device's clock may be minutes off, the offset from the last answer is not.
  function tickClocks() {
    var now = Date.now() + offset;
    [].forEach.call(panel.querySelectorAll(".live-clock"), function (clock) {
      var elapsed = Math.max(0, Math.floor((now - +clock.getAttribute("data-started")) / 1000));
      var cap = clock.getAttribute("data-cap");
      if (cap !== null) elapsed = Math.min(elapsed, +cap);
      clock.textContent = seconds(elapsed);
    });
    [].forEach.call(body.querySelectorAll(".heat-progress"), function (bar) {
      bar.value = Math.min(bar.max, Math.max(0, (now - +bar.getAttribute("data-started")) / 1000));
    });
  }

  function seconds(total) {
    var s = Math.max(0, Math.floor(total));
    var m = Math.floor(s / 60);
    var rest = s % 60;
    return m + ":" + (rest < 10 ? "0" : "") + rest;
  }

  function clockTime(ms, short) {
    var options = short ? { hour: "2-digit", minute: "2-digit" } : { hour: "2-digit", minute: "2-digit", second: "2-digit" };
    return new Date(ms).toLocaleTimeString(lang, options);
  }

  ask();
})();
