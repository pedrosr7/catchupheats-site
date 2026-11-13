// Filters, the calendar view and the countdown, and on every page that lists competitions the day is the visitor's: what
// ended since the build is hidden. Without this script every card shows as a list and the countdown is the one written at
// build.
(function () {
  "use strict";

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  var now = new Date();
  var today = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());

  function daysBetween(from, to) {
    var a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
    var b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
    return Math.round((b - a) / 86400000);
  }

  var form = document.getElementById("filters");
  if (form) listing(form);
  else leftovers();
  var countdown = document.querySelector(".countdown");
  if (countdown) refresh(countdown);
  var clock = document.querySelector(".next-clock");
  if (clock) run(clock);
  [].forEach.call(document.querySelectorAll("a.instagram"), share);

  // On a phone that can share files, the card goes straight to the share sheet, Instagram included; elsewhere the link
  // downloads it. The file is fetched once the button comes into view, because iOS only shares from inside the tap itself,
  // never after a wait; a visitor who never scrolls to it downloads nothing.
  function share(link) {
    if (!navigator.canShare || !window.fetch || !window.IntersectionObserver) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    var file = null;
    var watch = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      watch.disconnect();
      fetch(link.href).then(function (response) { return response.blob(); }).then(function (blob) {
        var ready = new File([blob], link.getAttribute("download"), { type: "image/png" });
        if (navigator.canShare({ files: [ready] })) file = ready;
      }).catch(function () {});
    });
    watch.observe(link);
    link.addEventListener("click", function (event) {
      if (!file) return;
      event.preventDefault();
      navigator.share({ files: [file] }).catch(function (error) {
        if (error && error.name !== "AbortError") window.location.href = link.href;
      });
    });
  }

  // Days, hours, minutes and seconds to the start, at midnight on its day where the visitor is.
  function run(clock) {
    var d = clock.dataset;
    var start = new Date(+d.start.slice(0, 4), +d.start.slice(5, 7) - 1, +d.start.slice(8, 10));
    var units = clock.querySelectorAll(".unit b");
    var stat = document.querySelector(".next-static");
    var next = clock.closest(".next");
    function tick() {
      var left = Math.floor((start - new Date()) / 1000);
      // Once it starts it is no longer the next start; the list below still shows it while it runs.
      if (left <= 0) {
        next.hidden = true;
        return;
      }
      [Math.floor(left / 86400), Math.floor(left % 86400 / 3600), Math.floor(left % 3600 / 60), left % 60].forEach(function (n, i) {
        units[i].textContent = pad(n);
        // A count of 100 days or more takes three digits: a smaller size keeps them inside the box.
        units[i].parentNode.classList.toggle("wide", n > 99);
      });
      stat.hidden = true;
      clock.hidden = false;
      setTimeout(tick, 1000 - Date.now() % 1000);
    }
    tick();
  }

  function listing(form) {
    var cards = [].slice.call(document.querySelectorAll("article.card"));
    var months = [].slice.call(document.querySelectorAll("section.month"));
    var empty = document.getElementById("empty");
    var none = document.querySelector(".none");
    var languageSwitch = document.querySelector(".lang-switch");
    var otherLanguage = languageSwitch && languageSwitch.getAttribute("href");
    var selects = [].slice.call(form.querySelectorAll("select"));
    var search = form.querySelector("input[name=q]");
    var params = new URLSearchParams(location.search);
    var cal = calendarView(params);
    // Folded as the build folds each card's text: lower case, no accents.
    function fold(text) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
    if (search) {
      search.value = params.get("q") || "";
      search.addEventListener("input", function () { apply(true); });
      // Enter would submit the form and reload the page.
      form.addEventListener("submit", function (event) { event.preventDefault(); });
    }

    selects.forEach(function (select) {
      var wanted = params.get(select.name);
      // A shared filter this page has no option for still filters, so the visitor sees nothing fits rather than everything.
      if (wanted && ![].some.call(select.options, function (o) { return o.value === wanted; })) {
        var unknown = new Option(wanted, wanted);
        unknown.dataset.unknown = "";
        select.add(unknown);
      }
      if (wanted) select.value = wanted;
      mark(select);
      select.addEventListener("change", function () {
        mark(select);
        if (select.name === "month") cal.goTo(select.value);
        apply(true);
      });
    });
    document.getElementById("reset").addEventListener("click", function () {
      selects.forEach(function (select) {
        [].forEach.call(select.querySelectorAll("option[data-unknown]"), function (o) { o.remove(); });
        select.value = "";
        mark(select);
      });
      if (search) search.value = "";
      apply(true);
    });
    // What ended after the build leaves the page for good, before any filter is read.
    [].forEach.call(document.querySelectorAll(".ticker-item"), function (item) {
      if (item.dataset.end < today) item.remove();
    });
    var ticker = document.querySelector(".ticker");
    if (ticker && !ticker.querySelector(".ticker-item")) ticker.hidden = true;
    cards = cards.filter(function (card) {
      card.hidden = card.dataset.end < today;
      return !card.hidden;
    });
    // A month whose every card ended is no longer a choice, unless a shared address asks for it.
    [].forEach.call(form.querySelectorAll("select[name=month] option"), function (o) {
      if (o.value && !o.selected && !cards.some(function (card) { return card.dataset.month === o.value; })) o.remove();
    });
    nextStart(cards);
    form.hidden = cards.length === 0;
    // With nothing to come the filters, the switch included, are hidden: a shared calendar address must not strand anyone.
    if (cards.length === 0) cal.on = false;
    cal.start(selects, mark, apply);
    apply(false);

    // The chosen option carries `selected` too, so the filters read the same in a saved or dumped page.
    function mark(select) {
      [].forEach.call(select.options, function (o) { o.defaultSelected = o.value === select.value; });
    }

    function once(list) {
      var seen = {};
      return list.filter(function (card) {
        if (seen[card.dataset.id]) return false;
        seen[card.dataset.id] = true;
        return true;
      });
    }

    function apply(remember) {
      var wanted = {};
      selects.forEach(function (select) { if (select.value) wanted[select.name] = select.value; });
      var words = search ? fold(search.value).split(/\s+/).filter(Boolean) : [];
      var filtered = Object.keys(wanted).length > 0 || words.length > 0;
      var shown = 0;
      function fits(card, keys) {
        var text = card.dataset.search || "";
        return keys.every(function (k) { return card.dataset[k] === wanted[k]; }) &&
          words.every(function (w) { return text.indexOf(w) >= 0; });
      }
      cards.forEach(function (card) {
        card.hidden = !fits(card, Object.keys(wanted));
        if (!card.hidden) shown++;
      });
      // The calendar shows its own month, so the month filter only says which one to open.
      var inCalendar = cards.filter(function (card) {
        return fits(card, Object.keys(wanted).filter(function (k) { return k !== "month"; }));
      });
      if (cal.on) shown = inCalendar.length;
      months.forEach(function (month) { month.hidden = cal.on || !month.querySelector("article.card:not([hidden])"); });
      empty.hidden = shown > 0 || !filtered;
      none.hidden = cards.length > 0;
      // A competition across the turn of a month has a card under each month: the calendar draws it once.
      cal.draw(once(inCalendar), once(cards));
      if (cal.on) {
        wanted.view = "calendar";
        if (cal.day) wanted.day = cal.day;
      }
      if (search && search.value.trim()) wanted.q = search.value.trim();
      var query = new URLSearchParams(wanted).toString();
      if (languageSwitch) languageSwitch.setAttribute("href", otherLanguage + (query ? "?" + query : ""));
      if (remember) {
        try { history.replaceState(null, "", query ? "?" + query : location.pathname); } catch (e) { /* a page opened from disk */ }
      }
    }
  }

  // The hero names the build's next start; once that one has started, the first card still to start takes its place.
  function nextStart(cards) {
    var hero = document.querySelector("a.next");
    if (!hero || hero.querySelector(".next-clock").dataset.start > today) return;
    var card = cards.filter(function (c) { return c.dataset.start > today; })[0];
    if (!card) {
      hero.hidden = true;
      return;
    }
    hero.className = hero.className.replace(/\bd-[\w-]+/, "d-" + card.dataset.discipline);
    hero.href = card.querySelector("a.card-link").getAttribute("href");
    hero.querySelector(".next-label").textContent = hero.dataset.tLabel + " · " + card.querySelector(".card-discipline").textContent;
    hero.querySelector(".next-name").textContent = card.querySelector(".card-name").textContent;
    hero.querySelector(".next-meta").textContent =
      card.querySelector(".card-dates").textContent + " · " + card.querySelector(".card-city").textContent;
    hero.querySelector(".next-clock").dataset.start = card.dataset.start;
  }

  // Every other page that lists cards (a region's, a discipline's, a month's): what ended since the build goes, and the
  // questions name the next one from the visitor's day.
  function leftovers() {
    var cards = [].slice.call(document.querySelectorAll("article.card"));
    if (!cards.length) return;
    var left = cards.filter(function (card) {
      card.hidden = card.dataset.end < today;
      return !card.hidden;
    });
    [].forEach.call(document.querySelectorAll("section.month"), function (month) {
      month.hidden = !month.querySelector("article.card:not([hidden])");
    });
    var none = document.querySelector(".none");
    if (none) none.hidden = left.length > 0;
    // The words written for the day the visitor is on: counts and years follow what is left.
    [].forEach.call(document.querySelectorAll("[data-variants]"), function (el) {
      var text = later(el, "data-variants");
      if (text !== null) el.textContent = text;
      el.hidden = text === null;
      if (el.tagName === "DD") el.previousElementSibling.hidden = el.hidden;
    });
    var heading = document.querySelector("h1[data-titles]");
    if (heading && later(heading, "data-titles") !== null) document.title = later(heading, "data-titles");
    [].forEach.call(document.querySelectorAll("dd[data-nexts]"), function (dd) {
      var next = JSON.parse(dd.dataset.nexts).filter(function (pair) { return pair[0] > today; })[0];
      if (next) dd.textContent = next[1];
      dd.hidden = !next;
      dd.previousElementSibling.hidden = !next;
    });
    faqMarkup();
  }

  // An element's text for the visitor's day: the first version whose end is not past, or its words for nothing left.
  function later(el, attribute) {
    var hit = JSON.parse(el.getAttribute(attribute)).filter(function (pair) { return pair[0] >= today; })[0];
    return hit ? hit[1] : el.getAttribute(attribute + "-none");
  }

  // The FAQ markup says what the questions on the page now say, and goes when none is left.
  function faqMarkup() {
    var questions = [].filter.call(document.querySelectorAll(".faq dt"), function (dt) { return !dt.hidden; });
    var faq = document.querySelector(".faq");
    if (faq) faq.hidden = questions.length === 0;
    [].forEach.call(document.querySelectorAll('script[type="application/ld+json"]'), function (script) {
      var data;
      try { data = JSON.parse(script.textContent); } catch (e) { return; }
      if (data["@type"] !== "FAQPage") return;
      if (!questions.length) return script.remove();
      data.mainEntity = questions.map(function (dt) {
        return { "@type": "Question", name: dt.textContent, acceptedAnswer: { "@type": "Answer", text: dt.nextElementSibling.textContent } };
      });
      script.textContent = JSON.stringify(data);
    });
  }

  // The month grid, drawn from the cards the list already holds: a dot per competition on each of its days on a phone,
  // their names on a wider screen, and the chosen day's cards copied beneath.
  function calendarView(params) {
    var section = document.getElementById("calendar");
    var buttons = [].slice.call(document.querySelectorAll("#filters [data-view]"));
    var self = { on: false, day: "", goTo: function () {}, draw: function () {}, start: function () {} };
    if (!section) return self;
    var d = section.dataset;
    var names = d.months.split("|"), shorts = d.shortMonths.split("|"), weekdays = d.weekdays.split("|");
    var grid = section.querySelector(".cal-grid"), title = section.querySelector(".cal-title");
    var prev = section.querySelector(".cal-prev"), next = section.querySelector(".cal-next");
    var dayTitle = section.querySelector(".cal-day-title"), nothing = section.querySelector(".cal-nothing");
    var dayCards = section.querySelector(".cal-day-cards");
    var thisMonth = today.slice(0, 7);
    var wantedDay = realDay(params.get("day") || "") ? params.get("day") : "";
    var month = wantedDay ? wantedDay.slice(0, 7) : realMonth(params.get("month") || "") ? params.get("month") : thisMonth;
    var monthSelect = null, markSelect = null, redraw = null;
    self.on = params.get("view") === "calendar";
    self.day = wantedDay;
    // A day the visitor picked stays even when a filter empties it; one picked for them is picked again.
    var chosen = !!wantedDay;

    function count(n) { return n === 1 ? d.one : d.many.replace("{n}", n); }
    function realMonth(key) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(key); }
    // A shared address may carry any text: a day counts only if it exists, so 31 November is turned away.
    function realDay(key) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
      var t = new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)));
      return t.getUTCFullYear() + "-" + pad(t.getUTCMonth() + 1) + "-" + pad(t.getUTCDate()) === key;
    }
    function shift(key, by) {
      var t = new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1 + by, 1));
      return t.getUTCFullYear() + "-" + pad(t.getUTCMonth() + 1);
    }
    function el(tag, cls, text) {
      var node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text !== undefined) node.textContent = text;
      return node;
    }
    // Only one of these shows, by the width the stylesheet sees.
    function marks(cls, list, more) {
      var box = el("span", cls);
      list.slice(0, 3).forEach(function (card) {
        var item = el("span", "d-" + card.dataset.discipline);
        item.appendChild(el("i"));
        if (cls === "cal-names") item.appendChild(el("b", "", card.querySelector(".card-name").textContent));
        box.appendChild(item);
      });
      if (list.length > 3) box.appendChild(el("em", "", more.replace("{n}", list.length - 3)));
      return box;
    }
    // Paging must not turn into a month filter that the list would keep; a chosen month that no longer shows is let go.
    function release() {
      if (!monthSelect || !monthSelect.value || monthSelect.value === month) return;
      monthSelect.value = "";
      markSelect(monthSelect);
    }

    self.start = function (selects, mark, apply) {
      monthSelect = selects.filter(function (s) { return s.name === "month"; })[0] || null;
      markSelect = mark;
      redraw = apply;
      buttons.forEach(function (button) {
        button.addEventListener("click", function () {
          self.on = button.dataset.view === "calendar";
          apply(true);
        });
      });
      [[prev, -1], [next, 1]].forEach(function (pair) {
        pair[0].addEventListener("click", function () {
          month = shift(month, pair[1]);
          self.day = "";
          chosen = false;
          release();
          apply(true);
          // At the first or last month the arrow just pressed is disabled, and focus would fall back to the page.
          if (pair[0].disabled) (pair[0] === prev ? next : prev).focus();
        });
      });
    };
    self.goTo = function (key) {
      month = realMonth(key) ? key : thisMonth;
      self.day = "";
      chosen = false;
    };
    self.draw = function (matches, all) {
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String((b.dataset.view === "calendar") === self.on)); });
      section.hidden = !self.on;
      if (!self.on) return;
      var last = all.reduce(function (max, card) { return card.dataset.end.slice(0, 7) > max ? card.dataset.end.slice(0, 7) : max; }, thisMonth);
      if (month < thisMonth) month = thisMonth;
      if (month > last) month = last;
      var y = +month.slice(0, 4), m = +month.slice(5, 7);
      title.textContent = names[m - 1] + " " + y;
      prev.disabled = month <= thisMonth;
      next.disabled = month >= last;
      function on(date) { return matches.filter(function (c) { return c.dataset.start <= date && date <= c.dataset.end; }); }
      var days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      if (!chosen && self.day && !on(self.day).length) self.day = "";
      if (!self.day || self.day.slice(0, 7) !== month) {
        self.day = "";
        for (var k = 1; k <= days && !self.day; k++) {
          var date = month + "-" + pad(k);
          if (date >= today && on(date).length) self.day = date;
        }
      }
      grid.textContent = "";
      var lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
      for (var i = 0; i < lead; i++) grid.appendChild(el("span", "cal-cell empty"));
      for (var n = 1; n <= days; n++) (function (n) {
        var date = month + "-" + pad(n), list = on(date);
        var cell = el("button", "cal-cell" + (date < today ? " past" : "") + (date === today ? " today" : ""));
        cell.type = "button";
        cell.dataset.day = date;
        cell.setAttribute("aria-pressed", String(date === self.day));
        var weekday = weekdays[(new Date(Date.UTC(y, m - 1, n)).getUTCDay() + 6) % 7];
        cell.setAttribute("aria-label", weekday + " " + n + " " + names[m - 1] + " " + y + ": " + count(list.length));
        cell.appendChild(el("span", "cal-num", String(n)));
        cell.appendChild(marks("cal-dots", list, "+{n}"));
        cell.appendChild(marks("cal-names", list, d.more));
        cell.addEventListener("click", function () {
          self.day = date;
          chosen = true;
          redraw(true);
          // The grid was drawn anew, so the button that had focus is gone: give it to its replacement.
          grid.querySelector("[data-day='" + date + "']").focus();
        });
        grid.appendChild(cell);
      })(n);
      var picked = self.day ? on(self.day) : [];
      dayTitle.hidden = !self.day;
      if (self.day) {
        var t = new Date(Date.UTC(y, m - 1, +self.day.slice(8, 10)));
        dayTitle.textContent = weekdays[(t.getUTCDay() + 6) % 7] + " " + t.getUTCDate() + " " + shorts[m - 1] + " · " + count(picked.length);
      }
      nothing.hidden = !self.day || picked.length > 0;
      dayCards.textContent = "";
      picked.forEach(function (card) {
        var copy = card.cloneNode(true);
        copy.hidden = false;
        copy.style.animation = "none";
        dayCards.appendChild(copy);
      });
    };
    return self;
  }

  function refresh(el) {
    var d = el.dataset;
    var left = daysBetween(today, d.start);
    var text = left > 1 ? d.tDays.replace("{n}", left)
      : left === 1 ? d.tDay
      : left === 0 ? d.tToday
      : today <= d.end ? d.tUnderway
      : d.tOver;
    el.textContent = text;
  }
})();
