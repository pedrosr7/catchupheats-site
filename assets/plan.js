// «Que Aura me prepare»: the questions one screen at a time, a summary worked out here from the date, the type and the
// answers, and the link Aura's app opens. Everything stays in this page: it asks nothing of the network and keeps nothing.
(function () {
  "use strict";

  var LINK = "https://aura.pampaiter.com/plan";
  var SOURCE = "catchupheats";
  var MIN_DAYS = 2;
  var MAX_DAYS = 6;
  var MAX_HARDEST = 2;
  // A QR code under about 3 px per module cannot be scanned from a screen: a longer link gets the button instead.
  var MAX_QR_MODULES = 85;
  var QUIET_ZONE = 4;

  // The focus each kind of competition leans on, in the order a week hands them out. What the athlete finds hardest comes first.
  var FOCUS_ORDER = {
    CROSSFIT_OPEN: ["strength", "gymnastics", "engine", "running"],
    HYROX: ["running", "strength", "engine", "gymnastics"],
    HYBRID: ["strength", "engine", "running", "gymnastics"],
    OCR: ["running", "strength", "gymnastics", "engine"]
  };

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function utc(iso) { return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)); }

  function byNumber(a, b) { return a - b; }

  function daysLeft(start, today) {
    return Math.max(Math.round((utc(start) - utc(today)) / 86400000), 0);
  }

  // Whole weeks to the start, counting a started one: the app's summary counts them the same way.
  function weeksLeft(start, today) {
    return Math.ceil(daysLeft(start, today) / 7);
  }

  // The cuts of Aura's server, which takes the whole weeks left (days / 7, rounded down) when each week is programmed: 0 or 1
  // is taper, 2 or 3 peaking, 4 to 8 specific to the competition and more is base work, in cycles whose length depends on the
  // level. The first week starts today and each next one seven days later.
  function phasesFor(days, level) {
    var count = { base: 0, specific: 0, peak: 0, taper: 0 };
    for (var left = days; left > 0; left -= 7) {
      var weeks = Math.floor(left / 7);
      count[weeks <= 1 ? "taper" : weeks <= 3 ? "peak" : weeks <= 8 ? "specific" : "base"] += 1;
    }
    var phases = ["base", "specific", "peak", "taper"].map(function (phase) { return [phase, count[phase]]; })
      .filter(function (phase) { return phase[1] > 0; });
    return { cycle: level === "ADVANCED" || level === "COMPETITOR" ? 5 : 4, phases: phases };
  }

  // One session per chosen day, each with a focus: the athlete's hardest parts first, then the competition's usual order.
  function weekFor(type, days, hardest) {
    var order = [];
    (hardest || []).concat(FOCUS_ORDER[type] || FOCUS_ORDER.HYBRID).forEach(function (focus) {
      if (order.indexOf(focus) < 0) order.push(focus);
    });
    return days.slice().sort(byNumber).map(function (day, i) { return [day, order[i % order.length]]; });
  }

  // The link of aura-web's README. The category is left out when it was not chosen; no hardest part is written empty.
  function linkFor(a) {
    var query = ["c=" + encodeURIComponent(a.id), "d=" + a.date, "t=" + a.type];
    if (a.cat) query.push("cat=" + encodeURIComponent(a.cat));
    query.push("lvl=" + a.lvl, "days=" + a.days.slice().sort(byNumber).join(","), "dur=" + a.dur, "eq=" + a.eq);
    query.push("hard=" + (a.hard || []).join(","), "src=" + SOURCE);
    return LINK + "?" + query.join("&");
  }

  // iPads ask for the computer's page and an Android tablet may too, so a touch screen on those systems is a phone's.
  function platformOf(agent, touchPoints) {
    if (/iPhone|iPad|iPod|Android/.test(agent)) return "mobile";
    if (/Macintosh/.test(agent) && touchPoints > 1) return "mobile";
    if (/Linux/.test(agent) && touchPoints > 1) return "mobile";
    return "desktop";
  }

  // Dark modules as true, or null when the text does not fit a code that can be scanned.
  function qrMatrix(text) {
    try {
      var code = window.qrcode(0, "M");
      code.addData(text);
      code.make();
      var size = code.getModuleCount();
      if (size > MAX_QR_MODULES) return null;
      var rows = [];
      for (var row = 0; row < size; row++) {
        var cells = [];
        for (var column = 0; column < size; column++) cells.push(code.isDark(row, column));
        rows.push(cells);
      }
      return rows;
    } catch (tooLong) {
      return null;
    }
  }

  // One path for all the dark modules, each a 1 by 1 square, inside a quiet zone.
  function pathOf(matrix) {
    var path = "";
    matrix.forEach(function (row, y) {
      row.forEach(function (dark, x) {
        if (dark) path += "M" + (x + QUIET_ZONE) + " " + (y + QUIET_ZONE) + "h1v1h-1z";
      });
    });
    return path;
  }

  function qrPath(text) {
    var matrix = qrMatrix(text);
    return matrix ? pathOf(matrix) : null;
  }

  function qrSvg(doc, matrix, label) {
    var size = matrix.length + QUIET_ZONE * 2;
    var ns = "http://www.w3.org/2000/svg";
    var svg = doc.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
    svg.setAttribute("shape-rendering", "crispEdges");
    var ground = doc.createElementNS(ns, "rect");
    ground.setAttribute("width", size);
    ground.setAttribute("height", size);
    ground.setAttribute("fill", "#fff");
    var modules = doc.createElementNS(ns, "path");
    modules.setAttribute("d", pathOf(matrix));
    modules.setAttribute("fill", "#000");
    svg.appendChild(ground);
    svg.appendChild(modules);
    return svg;
  }

  function element(doc, tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function init(doc, env) {
    var root = doc.querySelector(".plan");
    if (!root) return;
    var texts = JSON.parse(root.getAttribute("data-texts"));
    var date = root.getAttribute("data-date");
    var type = root.getAttribute("data-type");
    if (date <= env.today) {
      root.querySelector(".plan-started").hidden = false;
      return;
    }
    root.querySelector(".plan-steps").hidden = false;

    var steps = [].slice.call(root.querySelectorAll("section.plan-step"));
    var summary = root.querySelector("section.plan-summary");
    var back = root.querySelector(".plan-back");
    var next = root.querySelector(".plan-next");
    var hint = root.querySelector(".plan-days-hint");
    var maxHint = root.querySelector(".plan-hardest-hint");
    var bar = root.querySelector(".plan-progress span");
    var at = 0;
    var hardest = [];

    function chosen(name) { return [].slice.call(root.querySelectorAll("input[name=" + name + "]:checked")); }
    function one(name) { var input = chosen(name)[0]; return input ? input.value : ""; }
    function days() { return chosen("days").map(function (input) { return +input.value; }); }

    function ready() {
      var step = at < steps.length ? steps[at].getAttribute("data-step") : "";
      if (step === "level") return one("lvl") !== "";
      if (step === "availability") return days().length >= MIN_DAYS && days().length <= MAX_DAYS && one("dur") !== "";
      if (step === "equipment") return one("eq") !== "";
      return true;
    }

    function label(name, value) {
      return root.querySelector("input[name=" + name + "][value='" + value + "']").parentNode.querySelector(".plan-label").textContent;
    }

    function fill(template, values) {
      return template.replace(/\{(\w+)\}/g, function (all, key) { return values[key]; });
    }

    function renderPhases(plan) {
      var list = summary.querySelector(".plan-phases");
      list.textContent = "";
      plan.phases.forEach(function (phase) {
        var words = texts.phases[phase[0]];
        var item = element(doc, "li");
        item.setAttribute("data-phase", phase[0]);
        item.setAttribute("data-weeks", phase[1]);
        item.appendChild(element(doc, "b", "plan-phase-name", words.name));
        item.appendChild(element(doc, "span", "plan-phase-length", fill(phase[1] === 1 ? texts.lengthOne : texts.length, { n: phase[1] })));
        item.appendChild(element(doc, "span", "plan-phase-text", fill(words.text, { cycle: plan.cycle, load: plan.cycle - 1 })));
        list.appendChild(item);
      });
    }

    function renderWeek() {
      var list = summary.querySelector(".plan-week");
      list.textContent = "";
      var minutes = label("dur", one("dur"));
      weekFor(type, days(), hardest).forEach(function (session) {
        var item = element(doc, "li");
        item.setAttribute("data-day", session[0]);
        item.setAttribute("data-focus", session[1]);
        item.appendChild(element(doc, "b", "plan-day", label("days", session[0])));
        item.appendChild(element(doc, "span", "plan-focus", label("hard", session[1]) + " · " + minutes));
        list.appendChild(item);
      });
    }

    function renderAction() {
      var link = linkFor({
        id: root.getAttribute("data-competition"), date: date, type: type, cat: one("cat"), lvl: one("lvl"),
        days: days(), dur: one("dur"), eq: one("eq"), hard: hardest
      });
      var action = summary.querySelector(".plan-action");
      action.textContent = "";
      var matrix = platformOf(env.userAgent, env.maxTouchPoints) === "desktop" ? qrMatrix(link) : null;
      if (matrix) {
        var box = element(doc, "div", "plan-qr");
        box.appendChild(qrSvg(doc, matrix, texts.qrLabel));
        box.appendChild(element(doc, "p", "plan-qr-hint", texts.qrHint));
        action.appendChild(box);
        return;
      }
      var open = element(doc, "a", "official plan-open", texts.open);
      open.setAttribute("href", link);
      action.appendChild(open);
    }

    function renderSummary() {
      var weeks = weeksLeft(date, env.today);
      summary.querySelector(".plan-weeks").textContent = weeks === 1 ? texts.weeksOne : fill(texts.weeks, { n: weeks });
      renderPhases(phasesFor(daysLeft(date, env.today), one("lvl")));
      renderWeek();
      renderAction();
    }

    function show() {
      steps.forEach(function (step, i) { step.hidden = i !== at; });
      summary.hidden = at !== steps.length;
      if (at === steps.length) renderSummary();
      refresh();
    }

    // The button that was pressed is gone or shut on the new screen: the title takes the focus, so a keyboard keeps its place
    // and a screen reader reads where it is.
    function moveFocus() {
      var target = at < steps.length ? steps[at].querySelector("h2") : summary.querySelector(".plan-weeks");
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }

    // A browser may bring the answers back with the page, on Back or on a reload, without telling the script.
    function remember() {
      hardest = chosen("hard").map(function (input) { return input.value; });
      var category = chosen("cat")[0];
      [].forEach.call(root.querySelectorAll("input[name=cat]"), function (input) {
        if (input === category) input.setAttribute("data-chosen", "1");
        else input.removeAttribute("data-chosen");
      });
      refresh();
    }

    function refresh() {
      var count = days().length;
      hint.textContent = count >= MIN_DAYS && count <= MAX_DAYS ? fill(texts.count, { n: count }) : texts.range;
      next.disabled = !ready();
      next.hidden = at === steps.length;
      back.hidden = at === 0;
      bar.style.width = Math.round(((at + 1) / (steps.length + 1)) * 100) + "%";
      // The card shows its answer by a class: an older browser that does not know :has() still shows what is chosen.
      [].forEach.call(root.querySelectorAll(".plan-option"), function (option) {
        option.classList.toggle("on", option.querySelector("input").checked);
      });
    }

    // The category may be left empty, so choosing it again takes it back.
    function toggleCategory(input) {
      var wasChosen = input.getAttribute("data-chosen") === "1";
      [].forEach.call(root.querySelectorAll("input[name=cat]"), function (other) { other.removeAttribute("data-chosen"); });
      if (wasChosen) input.checked = false;
      else input.setAttribute("data-chosen", "1");
    }

    // Two at most: a third is refused, and the order of the others is the order they were picked in.
    function pickHardest(input) {
      maxHint.textContent = "";
      if (!input.checked) {
        hardest = hardest.filter(function (part) { return part !== input.value; });
      } else if (hardest.length >= MAX_HARDEST) {
        input.checked = false;
        maxHint.textContent = texts.maxHardest;
      } else {
        hardest.push(input.value);
      }
    }

    root.addEventListener("click", function (event) {
      if (event.target.name !== "cat") return;
      toggleCategory(event.target);
      refresh();
    });
    root.addEventListener("change", function (event) {
      if (event.target.name === "hard") pickHardest(event.target);
      refresh();
    });
    next.addEventListener("click", function () {
      if (next.disabled) return;
      at += 1;
      show();
      moveFocus();
    });
    back.addEventListener("click", function () {
      if (at === 0) return;
      at -= 1;
      show();
      moveFocus();
    });
    remember();
    show();
    doc.defaultView.addEventListener("pageshow", remember);
  }

  window.CatchUpPlan = { daysLeft: daysLeft, weeksLeft: weeksLeft, phasesFor: phasesFor, weekFor: weekFor, linkFor: linkFor, platformOf: platformOf, qrPath: qrPath, init: init };

  var now = new Date();
  init(document, {
    today: now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()),
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints || 0
  });
})();
