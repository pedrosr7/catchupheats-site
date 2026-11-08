// The map page: date ranges over the list and a marker per competition. Without this script the list stands alone.
(function () {
  "use strict";

  var mapEl = document.getElementById("map");
  var ranges = document.getElementById("ranges");
  if (!mapEl || !ranges) return;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  var now = new Date();
  var today = iso(now);
  var phone = window.matchMedia("(max-width: 759px)");

  var rows = [].slice.call(document.querySelectorAll("li.map-row")).filter(function (row) {
    row.hidden = row.dataset.end < today;
    return !row.hidden;
  });
  var stage = document.querySelector(".map-stage");
  var card = document.getElementById("map-card");
  var empty = document.getElementById("map-empty");
  var notice = document.querySelector(".map-nojs");
  var words = JSON.parse(mapEl.dataset.locale);
  var markers = {};
  var map = null;

  ranges.hidden = false;
  stage.hidden = false;
  mapEl.hidden = false;
  try {
    map = new maplibregl.Map({
      container: mapEl,
      style: mapEl.dataset.style,
      bounds: [[-9.6, 35.8], [4.4, 43.9]],
      // Top left, where the card at the bottom never covers the map's credit.
      attributionControl: false,
      cooperativeGestures: true,
      locale: {
        "NavigationControl.ZoomIn": words.zoomIn,
        "NavigationControl.ZoomOut": words.zoomOut,
        "CooperativeGesturesHandler.WindowsHelpText": words.gesture,
        "CooperativeGesturesHandler.MacHelpText": words.gesture,
        "CooperativeGesturesHandler.MobileHelpText": words.gestureMobile
      }
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-left");
    map.on("moveend", spread);
    // Zoomed out past Spain the pins spread over the whole world: the map stops at Spain, the Canaries included, at
    // whatever size the window has.
    var spain = [[-18.4, 27.5], [4.6, 44.0]];
    var whole = null;
    function floor() {
      whole = map.cameraForBounds(spain, { padding: { top: 40, bottom: 12, left: 18, right: 18 } });
      if (whole) map.setMinZoom(whole.zoom);
      settle();
    }
    // The padding leaves room for a pin's head above its point. At the floor the whole of Spain is in view, not a corner
    // of it with the Canaries cut off.
    function settle() {
      if (!whole || map.getZoom() > whole.zoom + 0.01) return;
      var c = map.getCenter();
      if (Math.abs(c.lng - whole.center.lng) > 0.01 || Math.abs(c.lat - whole.center.lat) > 0.01) map.jumpTo({ center: whole.center });
    }
    floor();
    map.on("resize", floor);
    map.on("zoomend", settle);
    // Without tiles (offline, or the tile server down) the pins still stand; the line under the title says why.
    map.on("error", function () {
      notice.textContent = words.noTiles;
      notice.hidden = false;
    });
    map.on("click", function () { card.hidden = true; select(null); });
    // Exposed for the page's tests and for a curious visitor's console.
    window.catchupMap = map;
    notice.hidden = true;
  } catch (e) {
    map = null;
    stage.hidden = true;
    notice.textContent = notice.dataset.noWebgl;
  }

  rows.forEach(function (row) {
    row.tabIndex = 0;
    row.addEventListener("click", function (event) {
      if (event.target.closest("a")) return;
      select(row.dataset.id, true);
    });
    row.addEventListener("keydown", function (event) {
      if (event.target !== row || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      select(row.dataset.id, true);
    });
    if (!map || !row.dataset.lat) return;
    var el = document.createElement("button");
    el.type = "button";
    el.className = "map-marker d-" + row.dataset.discipline;
    el.dataset.id = row.dataset.id;
    // The library moves this element with its own transform: the pin's shape turns inside it, never the element.
    el.appendChild(document.createElement("span"));
    el.addEventListener("click", function (event) {
      event.stopPropagation();
      select(row.dataset.id, false);
    });
    var marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([+row.dataset.lng, +row.dataset.lat])
      .addTo(map);
    // Set after addTo, which names every marker with the library's generic title.
    el.setAttribute("aria-label", row.querySelector(".map-name").textContent);
    markers[row.dataset.id] = { el: el, row: row, marker: marker };
  });

  // Pins closer on screen than a finger's width step aside to the nearest free spot round their place: six spots on a
  // first ring, twelve on the next, and so on, so two towns side by side, or many competitions in one city, can all be
  // tapped. Run again whenever the view moves.
  var NEAR = 24;
  function free(x, y, taken) {
    return taken.every(function (q) { return Math.abs(q[0] - x) >= NEAR || Math.abs(q[1] - y) >= NEAR; });
  }
  function spread() {
    var taken = [];
    Object.keys(markers).forEach(function (id) {
      var m = markers[id];
      if (m.el.hidden) return;
      var p = map.project(m.marker.getLngLat());
      var offset = [0, 0];
      for (var ring = 1; !free(p.x + offset[0], p.y + offset[1], taken) && ring < 8; ring++) {
        var slots = 6 * ring;
        for (var i = 0; i < slots; i++) {
          var angle = 2 * Math.PI * i / slots;
          var spot = [Math.round(Math.cos(angle) * NEAR * ring), Math.round(Math.sin(angle) * NEAR * ring)];
          if (free(p.x + spot[0], p.y + spot[1], taken)) { offset = spot; break; }
        }
      }
      m.marker.setOffset(offset);
      taken.push([p.x + offset[0], p.y + offset[1]]);
    });
  }

  // The map's box, brought fully into the window, so a card opened at its foot is seen: on a phone the map sits above a
  // long list, and on a wide screen it starts below the title.
  function reveal() { stage.scrollIntoView({ block: "nearest" }); }

  // fromRow: the visitor chose in the list, so the map moves to the marker. From a marker on a wide screen the list
  // scrolls to the row; on a phone the list is below the map, and scrolling to it would take the card off screen.
  function select(id, fromRow) {
    rows.forEach(function (r) { r.classList.toggle("on", r.dataset.id === id); });
    Object.keys(markers).forEach(function (k) { markers[k].el.classList.toggle("on", k === id); });
    var row = rows.filter(function (r) { return r.dataset.id === id; })[0];
    if (!row) return;
    fill(row);
    if (fromRow && map && row.dataset.lat) {
      map.easeTo({ center: [+row.dataset.lng, +row.dataset.lat], zoom: Math.max(map.getZoom(), 8) });
    } else if (!phone.matches) {
      row.scrollIntoView({ block: "nearest" });
    }
    if (map) reveal();
  }

  function fill(row) {
    card.textContent = "";
    function add(tag, cls, text) {
      var el = document.createElement(tag);
      el.className = cls;
      el.textContent = text;
      card.appendChild(el);
      return el;
    }
    // Shown first, so the live region announces what is written into it.
    card.hidden = false;
    var close = add("button", "map-card-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", words.close);
    close.addEventListener("click", function () { card.hidden = true; select(null); });
    add("span", "card-discipline", row.querySelector(".card-discipline").textContent);
    add("strong", "map-card-name", row.querySelector(".map-name").textContent);
    add("span", "map-card-meta", row.querySelector(".map-when").textContent + " · " + row.querySelector(".map-city").textContent +
      " · " + row.querySelector(".map-price").textContent);
    var link = add("a", "map-card-link", card.dataset.see + " →");
    link.href = row.querySelector(".map-name a").getAttribute("href");
    card.className = "d-" + row.dataset.discipline;
    card.hidden = false;
  }

  function lastOfMonth(d, add) {
    var first = new Date(d.getFullYear(), d.getMonth() + add, 1);
    return new Date(first.getFullYear(), first.getMonth() + 1, 0);
  }

  function plusDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

  // The visitor's range, both ends included: [from, to], with to null for no end.
  function range(name) {
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var day = start.getDay();
    if (name === "weekend") {
      // The coming Saturday and Sunday; on a weekend day, what is left of this one.
      var saturday = day === 6 || day === 0 ? start : plusDays(start, 6 - day);
      return [iso(saturday), iso(plusDays(start, (7 - day) % 7))];
    }
    if (name === "month") return [today, iso(lastOfMonth(start, 0))];
    if (name === "3months") {
      // Like adding months to a date everywhere else: 30 November plus three is 28 February, not 2 March.
      var last = lastOfMonth(start, 3);
      return [today, iso(new Date(last.getFullYear(), last.getMonth(), Math.min(start.getDate(), last.getDate())))];
    }
    return [today, null];
  }

  // The Canaries are 1,700 km away: they widen the view only when they are all there is to show.
  function canary(r) { return +r.dataset.lat < 30; }

  function apply(from, to) {
    var shown = [];
    rows.forEach(function (row) {
      var fits = row.dataset.end >= from && (to === null || row.dataset.start <= to);
      row.hidden = !fits;
      if (markers[row.dataset.id]) markers[row.dataset.id].el.hidden = !fits;
      if (fits) shown.push(row);
    });
    empty.hidden = shown.length > 0;
    // A choice the range hides is dropped, so it does not come back highlighted without its card.
    if (!shown.some(function (r) { return r.classList.contains("on"); })) {
      card.hidden = true;
      select(null);
    }
    var placed = shown.filter(function (r) { return r.dataset.lat; });
    var mainland = placed.filter(function (r) { return !canary(r); });
    var framed = mainland.length ? mainland : placed;
    if (map && framed.length) {
      var bounds = new maplibregl.LngLatBounds();
      framed.forEach(function (r) { bounds.extend([+r.dataset.lng, +r.dataset.lat]); });
      map.fitBounds(bounds, { padding: 60, maxZoom: 9, duration: 0 });
    }
    if (map) spread();
  }

  var buttons = [].slice.call(ranges.querySelectorAll("[data-range]"));
  var fromInput = ranges.querySelector("input[name=from]");
  var toInput = ranges.querySelector("input[name=to]");
  function press(button) {
    buttons.forEach(function (b) {
      b.classList.toggle("on", b === button);
      b.setAttribute("aria-pressed", String(b === button));
    });
  }
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      press(button);
      fromInput.value = "";
      toInput.value = "";
      var r = range(button.dataset.range);
      apply(r[0], r[1]);
    });
  });
  [fromInput, toInput].forEach(function (input) {
    input.addEventListener("change", function () {
      press(null);
      var from = fromInput.value && fromInput.value > today ? fromInput.value : today;
      apply(from, toInput.value || null);
    });
  });
  press(ranges.querySelector("[data-range=all]"));
  apply(today, null);
})();
