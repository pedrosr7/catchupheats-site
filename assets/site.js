// Filters and countdown. Without this script every upcoming card shows and the countdown is the one written at build.
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
  var countdown = document.querySelector(".countdown");
  if (countdown) refresh(countdown);
  var clock = document.querySelector(".next-clock");
  if (clock) run(clock);

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
    var params = new URLSearchParams(location.search);

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
      select.addEventListener("change", function () { mark(select); apply(true); });
    });
    document.getElementById("reset").addEventListener("click", function () {
      selects.forEach(function (select) {
        [].forEach.call(select.querySelectorAll("option[data-unknown]"), function (o) { o.remove(); });
        select.value = "";
        mark(select);
      });
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
    form.hidden = cards.length === 0;
    apply(false);

    // The chosen option carries `selected` too, so the filters read the same in a saved or dumped page.
    function mark(select) {
      [].forEach.call(select.options, function (o) { o.defaultSelected = o.value === select.value; });
    }

    function apply(remember) {
      var wanted = {};
      selects.forEach(function (select) { if (select.value) wanted[select.name] = select.value; });
      var filtered = Object.keys(wanted).length > 0;
      var shown = 0;
      cards.forEach(function (card) {
        var fits = Object.keys(wanted).every(function (k) { return card.dataset[k] === wanted[k]; });
        card.hidden = !fits;
        if (fits) shown++;
      });
      months.forEach(function (month) { month.hidden = !month.querySelector("article.card:not([hidden])"); });
      empty.hidden = shown > 0 || !filtered;
      none.hidden = cards.length > 0;
      var query = new URLSearchParams(wanted).toString();
      if (languageSwitch) languageSwitch.setAttribute("href", otherLanguage + (query ? "?" + query : ""));
      if (remember) {
        try { history.replaceState(null, "", query ? "?" + query : location.pathname); } catch (e) { /* a page opened from disk */ }
      }
    }
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
