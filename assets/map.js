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
    map.on("moveend", gather);
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

  // Pins closer on screen than a finger's width gather in a circle that counts them, at the middle of their places; a
  // pin on its own always stands on its place. Tapping a circle zooms in until they part. Run again whenever the view
  // moves or the dates change.
  var NEAR = 32;
  // A pin stands above its point: groups are measured from the middle of its body, where a circle would sit.
  var BODY = 15;
  var circles = [];
  // Competitions placed at their city share one point and never part by zooming: a tap on their circle lists them in
  // the card instead, and no pin ever leaves its place.
  var SAME_PLACE = 0.002;
  function gather() {
    circles.forEach(function (c) { c.marker.remove(); });
    circles = [];
    var groups = [];
    Object.keys(markers).forEach(function (id) {
      var m = markers[id];
      m.el.classList.remove("gathered");
      if (m.el.hidden) return;
      var at = map.project(m.marker.getLngLat()), p = { x: at.x, y: at.y - BODY };
      var near = groups.filter(function (g) { return Math.abs(g.x - p.x) < NEAR && Math.abs(g.y - p.y) < NEAR; })[0];
      if (near) {
        near.members.push(m);
        near.x = (near.x * (near.members.length - 1) + p.x) / near.members.length;
        near.y = (near.y * (near.members.length - 1) + p.y) / near.members.length;
      } else {
        groups.push({ x: p.x, y: p.y, members: [m] });
      }
    });
    // Two groups whose middles drifted close are one: repeat until none are.
    for (var merged = true; merged;) {
      merged = false;
      for (var i = 0; i < groups.length && !merged; i++) {
        for (var j = i + 1; j < groups.length && !merged; j++) {
          var a = groups[i], b = groups[j];
          if (Math.abs(a.x - b.x) >= NEAR || Math.abs(a.y - b.y) >= NEAR) continue;
          var n = a.members.length + b.members.length;
          a.x = (a.x * a.members.length + b.x * b.members.length) / n;
          a.y = (a.y * a.members.length + b.y * b.members.length) / n;
          a.members = a.members.concat(b.members);
          groups.splice(j, 1);
          merged = true;
        }
      }
    }
    groups.forEach(function (g) {
      g.members.forEach(function (m) { m.marker.setOffset([0, 0]); });
      if (g.members.length === 1) return;
      g.members.forEach(function (m) { m.el.classList.add("gathered"); });
      var el = document.createElement("button");
      el.type = "button";
      el.className = "map-cluster";
      el.dataset.count = String(g.members.length);
      el.textContent = String(g.members.length);
      var bounds = new maplibregl.LngLatBounds();
      g.members.forEach(function (m) { bounds.extend(m.marker.getLngLat()); });
      el.addEventListener("click", function (event) {
        event.stopPropagation();
        var ne = bounds.getNorthEast(), sw = bounds.getSouthWest();
        if (ne.lng - sw.lng < SAME_PLACE && ne.lat - sw.lat < SAME_PLACE) {
          list(g.members);
          return;
        }
        var camera = map.cameraForBounds(bounds, { padding: 80, maxZoom: 14 });
        var zoom = Math.max(camera ? camera.zoom : 0, map.getZoom() + 2);
        map.jumpTo({ center: bounds.getCenter(), zoom: Math.min(zoom, map.getMaxZoom()) });
        // The tapped circle is gone with the jump: the keyboard stays on the map, not on the page's top.
        map.getCanvas().focus();
      });
      var marker = new maplibregl.Marker({ element: el }).setLngLat(map.unproject([g.x, g.y])).addTo(map);
      // Set after addTo, which names every marker with the library's generic title.
      el.setAttribute("aria-label", words.cluster.replace("{n}", g.members.length));
      circles.push({ marker: marker, members: g.members });
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
    var registration = row.querySelector(".card-registration");
    add("span", "map-card-meta", row.querySelector(".map-when").textContent + " · " + row.querySelector(".map-city").textContent +
      " · " + row.querySelector(".map-price").textContent + (registration ? " · " + registration.textContent : ""));
    var link = add("a", "map-card-link", card.dataset.see + " →");
    link.href = row.querySelector(".map-name a").getAttribute("href");
    card.className = "d-" + row.dataset.discipline;
    card.hidden = false;
  }

  // The card as a list: the competitions that share one place, each opening its own card.
  function list(members) {
    select(null);
    card.textContent = "";
    card.className = "map-card-list";
    var close = document.createElement("button");
    close.type = "button";
    close.className = "map-card-close";
    close.textContent = "×";
    close.setAttribute("aria-label", words.close);
    close.addEventListener("click", function () { card.hidden = true; });
    card.appendChild(close);
    var heading = document.createElement("strong");
    heading.className = "map-card-name";
    heading.textContent = words.place.replace("{n}", members.length).replace("{city}", members[0].row.querySelector(".map-city").textContent);
    card.appendChild(heading);
    var items = document.createElement("ul");
    items.className = "map-card-items";
    members.slice().sort(function (a, b) { return a.row.dataset.start < b.row.dataset.start ? -1 : 1; }).forEach(function (m) {
      var item = document.createElement("li");
      var pick = document.createElement("button");
      pick.type = "button";
      pick.className = "map-card-pick d-" + m.row.dataset.discipline;
      pick.dataset.id = m.row.dataset.id;
      // Like the map's own rows: the dated stamp in the discipline's colour, the name, then discipline and dates.
      pick.appendChild(m.row.querySelector(".card-stamp").cloneNode(true));
      var name = document.createElement("span");
      name.className = "map-card-pick-name";
      name.textContent = m.row.querySelector(".map-name").textContent;
      var meta = document.createElement("span");
      meta.className = "map-card-pick-meta";
      meta.textContent = m.row.querySelector(".card-discipline").textContent + " · " + m.row.querySelector(".map-when").textContent;
      pick.appendChild(name);
      pick.appendChild(meta);
      pick.addEventListener("click", function () { select(m.row.dataset.id, false); });
      item.appendChild(pick);
      items.appendChild(item);
    });
    card.appendChild(items);
    card.hidden = false;
    if (map) reveal();
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

  // The discipline chosen, empty for all: it adds to the dates and is kept in the address, like the front page's filters.
  var chips = document.getElementById("map-disciplines");
  var chipButtons = chips ? [].slice.call(chips.querySelectorAll("[data-discipline-filter]")) : [];
  var discipline = new URLSearchParams(location.search).get("discipline") || "";
  if (!chipButtons.some(function (b) { return b.dataset.disciplineFilter === discipline; })) discipline = "";
  var dates = [today, null];
  var emptyDates = null;
  function pressDiscipline() {
    chipButtons.forEach(function (b) {
      var on = b.dataset.disciplineFilter === discipline;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }
  chipButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      discipline = button.dataset.disciplineFilter;
      pressDiscipline();
      // The rest of the address stays: a visit's source, a hash.
      var params = new URLSearchParams(location.search);
      if (discipline) params.set("discipline", discipline); else params.delete("discipline");
      var query = params.toString();
      try {
        history.replaceState(null, "", (query ? "?" + query : location.pathname) + location.hash);
      } catch (e) { /* a page opened from disk */ }
      apply(dates[0], dates[1]);
    });
  });
  if (chips) chips.hidden = false;
  pressDiscipline();

  function apply(from, to) {
    dates = [from, to];
    var shown = [];
    rows.forEach(function (row) {
      var fits = row.dataset.end >= from && (to === null || row.dataset.start <= to) &&
        (!discipline || row.dataset.discipline === discipline);
      row.hidden = !fits;
      if (markers[row.dataset.id]) markers[row.dataset.id].el.hidden = !fits;
      if (fits) shown.push(row);
    });
    empty.hidden = shown.length > 0;
    // Nothing for this discipline is not nothing on these dates.
    if (!emptyDates) emptyDates = empty.textContent;
    empty.textContent = discipline ? empty.dataset.filters : emptyDates;
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
    if (map) gather();
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
