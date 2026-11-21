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
  // Both views are kept in this browser only; a private window or blocked storage falls back to the default.
  var VIEW_KEY = "catchupheats.live.view";
  var HEAT_VIEW_KEY = "catchupheats.live.heatview";
  var AVATAR_KEY = "catchupheats.live.avatarstyle";
  var AVATAR_STYLES = ["det", "com", "ret"];

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
  var category = null;
  // The lanes the last redraw put on the card, for the voxel athletes; their script loads once one is running.
  var stages = [];
  var avatarsAsked = false;

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

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
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
    var key = JSON.stringify([live.now, live.next, live.standings, view, heatView, avatarStyle, category]);
    if (key === drawn) return tickClocks();
    paint();
  }

  // Draws the latest answer with the visitor's view and category: on a new answer, and at once on a press.
  function paint() {
    var live = latest;
    stages = [];
    var parts = document.createDocumentFragment();
    if (live.now.length) {
      parts.appendChild(el("h2", null, t("now")));
      live.now.forEach(function (heat) { parts.appendChild(heatBlock(heat)); });
    }
    if (live.next.length) {
      parts.appendChild(el("h2", null, t("next")));
      var list = el("ol", "next-heats");
      live.next.forEach(function (heat) { list.appendChild(nextItem(heat)); });
      parts.appendChild(list);
    }
    // The live server lists every category: one with no published WOD or no one in it has nothing to rank yet.
    var ranked = live.standings.filter(function (one) {
      return (one.wodNames || []).length && (one.standings || []).length;
    });
    if (ranked.length) {
      var chosen = ranked.filter(function (one) { return one.categoryName === category; })[0] || ranked[0];
      category = chosen.categoryName;
      parts.appendChild(el("h2", null, t("standings")));
      parts.appendChild(standings(ranked, chosen));
    }
    var kept = keep();
    while (body.firstChild) body.removeChild(body.firstChild);
    body.appendChild(parts);
    restore(kept);
    drawn = JSON.stringify([live.now, live.next, live.standings, view, heatView, avatarStyle, category]);
    tickClocks();
    athletes();
  }

  // The athletes are decoration: their script is fetched only when a heat is running in «Visual», and a failure to load
  // it leaves the stages empty, which the stylesheet hides.
  function athletes() {
    if (window.CatchUpAvatars) return window.CatchUpAvatars.sync(stages, { style: avatarStyle });
    if (avatarsAsked || !panel.dataset.avatars || !stages.some(function (s) { return s.heat.status === "RUNNING"; })) return;
    avatarsAsked = true;
    var script = document.createElement("script");
    script.src = panel.dataset.avatars;
    script.async = true;
    script.onload = function () { if (window.CatchUpAvatars) window.CatchUpAvatars.sync(stages, { style: avatarStyle }); };
    document.head.appendChild(script);
  }

  // A redraw replaces the panel's nodes: what the visitor scrolled sideways or has focus on is put back where it was.
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
    var block = el("article", "heat");
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
    if (running) {
      var clock = el("span", "live-clock");
      clock.setAttribute("data-started", heat.startedAtMs);
      if (cap) clock.setAttribute("data-cap", heat.capSeconds);
      // A timer is read when the visitor reaches it, never announced on its own: it changes every second.
      clock.setAttribute("role", "timer");
      head.appendChild(clock);
    }
    block.appendChild(head);
    if (running && cap) {
      var gone = el("progress", "heat-progress");
      gone.max = heat.capSeconds;
      gone.value = 0;
      gone.setAttribute("data-started", heat.startedAtMs);
      gone.setAttribute("aria-label", cap);
      block.appendChild(gone);
    }
    var phases = heat.phases || [];
    var lanes = (heat.lanes || []).map(function (lane) { return laneState(lane, phases); });
    var views = el("div", "heat-view");
    views.setAttribute("role", "group");
    views.setAttribute("aria-label", t("heatview"));
    ["visual", "times"].forEach(function (name) {
      views.appendChild(toggle("heatview:" + heat.heatId + ":" + name, t(name), heatView === name, function () {
        heatView = name;
        remember(HEAT_VIEW_KEY, name);
      }));
    });
    block.appendChild(views);
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
      block.appendChild(looks);
    }
    if (heatView === "times") {
      block.appendChild(times(heat, phases, lanes));
    } else {
      var list = el("ol", "lanes");
      byRank(lanes).forEach(function (one) { list.appendChild(laneItem(one, phases.length, heat)); });
      block.appendChild(list);
    }
    return block;
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
      voided: voided,
      result: result,
      done: done,
      blank: !closed && done === 0 && !splits.length,
      current: !closed && done < total ? done : -1,
      times: splitAt,
      reached: done ? splitAt[done - 1] : null,
    };
  }

  function laneItem(one, total, heat) {
    var lane = one.lane;
    var item = el("li", "lane");
    var top = el("div", "lane-top");
    top.appendChild(el("span", "lane-no", t("lane").replace("{n}", lane.lane)));
    top.appendChild(el("span", "lane-name", lane.entryName));
    if (total) top.appendChild(el("span", "lane-count", (one.blank ? 0 : Math.min(one.done + 1, total)) + "/" + total));
    item.appendChild(top);
    // The lane's athletes, drawn by avatars.js; the stylesheet hides the stage while nothing is drawn in it.
    var stage = el("div", "lane-stage");
    stage.setAttribute("aria-hidden", "true");
    item.appendChild(stage);
    stages.push({
      stage: stage, key: heat.heatId + ":" + lane.laneId, laneId: lane.laneId, lane: lane.lane, heat: heat, total: total,
      done: one.done, current: one.current, blank: one.blank, closed: one.voided || !!one.result || !!lane.closed,
      phase: lane.currentPhase,
    });
    if (total) {
      var bar = el("div", "lane-bar");
      bar.setAttribute("role", "img");
      bar.setAttribute("aria-label", t("phases").replace("{done}", one.done).replace("{total}", total));
      for (var i = 0; i < total; i++) {
        var seg = el("span", "seg " + (i < one.done ? "done" : i === one.current && !one.blank ? "current" : "pending"));
        if (i === one.current && !one.blank) seg.appendChild(el("span", "fill"));
        bar.appendChild(seg);
      }
      item.appendChild(bar);
    }
    var foot = el("div", "lane-foot");
    if (one.result) foot.appendChild(el("span", "lane-result", one.result.display));
    else if (one.blank) foot.appendChild(el("span", "lane-phase blank", t("nomarks")));
    else if (!one.voided) foot.appendChild(el("span", "lane-phase", lane.currentPhase || (one.done >= total && total ? t("finished") : "")));
    if (one.voided) foot.appendChild(el("span", "void", t("void")));
    // As the live server counts it: whatever is not validated, a review state this script does not know included, is provisional.
    else if (one.result && lane.review !== "VALIDATED") foot.appendChild(el("span", "provisional", t("provisional")));
    item.appendChild(foot);
    return item;
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
    var button = el("button", "toggle", label);
    button.type = "button";
    button.setAttribute("aria-pressed", on ? "true" : "false");
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
    [].forEach.call(body.querySelectorAll(".live-clock"), function (clock) {
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
