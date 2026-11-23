// The running heat on the Live tab, drawn as one track with every lane, which the visitor moves like a map. live.js loads
// this only once a heat is running in the «Visual» view, and calls CatchUpAvatars.sync after every redraw. The scene is
// decoration (aria-hidden): the rows' text, bar and times stay the source of truth, so anything that goes wrong here only
// leaves the rows alone. Decisions: agents/docs/DECISIONS.md, 2026-11-21 «voxel athletes» and 2026-11-22 «one track».
(function () {
  "use strict";

  // ---- Movements: what a phase's text names, and which animation draws it

  // Every name of CatchUp Live's movement catalogue, with the animation that stands in for it. `approx` marks a stand-in
  // that is not the movement itself: a later batch of animations replaces those rows, and only those.
  var MOVES = [
    ["Back Squats", "squat", 1], ["Front Squats", "squat", 1], ["Overhead Squats", "squat", 1],
    ["Deadlifts", "generic", 1], ["Sumo Deadlifts", "generic", 1], ["Romanian Deadlifts", "generic", 1],
    ["Cleans", "snatch", 1], ["Power Cleans", "snatch", 1], ["Squat Cleans", "snatch", 1],
    ["Hang Power Cleans", "snatch", 1], ["Clean and Jerks", "snatch", 1], ["Snatches", "snatch", 0],
    ["Power Snatches", "snatch", 1], ["Squat Snatches", "snatch", 0], ["Hang Power Snatches", "snatch", 1],
    ["Push Presses", "generic", 1], ["Push Jerks", "generic", 1], ["Split Jerks", "generic", 1],
    ["Strict Presses", "generic", 1], ["Bench Presses", "generic", 1], ["Thrusters", "squat", 1],
    ["Front Rack Lunges", "generic", 1], ["Overhead Lunges", "generic", 1], ["Good Mornings", "generic", 1],
    ["Bent Over Rows", "generic", 1],
    ["DB Snatches", "snatch", 1], ["DB Cleans", "snatch", 1], ["DB Clean and Jerks", "snatch", 1],
    ["DB Thrusters", "squat", 1], ["DB Push Presses", "generic", 1], ["DB Box Step-Overs", "generic", 1],
    ["DB Rows", "generic", 1], ["Devil Presses", "burpee", 1], ["Renegade Rows", "generic", 1],
    ["Goblet Squats", "squat", 1], ["Kettlebell Swings", "generic", 1], ["KB Snatches", "snatch", 1],
    ["KB Cleans", "snatch", 1], ["Turkish Get-Ups", "generic", 1], ["Farmers Carry", "run", 1],
    ["Sandbag Cleans", "generic", 1],
    ["Pull-Ups", "pullup", 0], ["Chest-to-Bar Pull-Ups", "pullup", 1], ["Strict Pull-Ups", "pullup", 1],
    ["Muscle-Ups", "pullup", 1], ["Bar Muscle-Ups", "pullup", 1], ["Ring Muscle-Ups", "pullup", 1],
    ["Toes-to-Bar", "pullup", 1], ["Knees-to-Elbows", "pullup", 1], ["Handstand Push-Ups", "generic", 1],
    ["Handstand Walk", "generic", 1], ["Wall Walks", "generic", 1], ["Push-Ups", "burpee", 1],
    ["Dips", "generic", 1], ["Ring Dips", "generic", 1], ["Burpees", "burpee", 0],
    ["Bar-Facing Burpees", "burpee", 1], ["Burpees Over the Bar", "burpee", 1],
    ["Lateral Burpees Over the DB", "burpee", 1], ["Burpee Box Jump Overs", "burpee", 1], ["Box Jumps", "squat", 1],
    ["Box Jump Overs", "squat", 1], ["Box Step-Ups", "generic", 1], ["Pistols", "squat", 1],
    ["Air Squats", "squat", 0], ["Wall Balls", "squat", 1], ["Sit-Ups", "generic", 1], ["GHD Sit-Ups", "generic", 1],
    ["Rope Climbs", "pullup", 1], ["Legless Rope Climbs", "pullup", 1], ["Pegboard Ascents", "pullup", 1],
    ["Double Unders", "generic", 1], ["Single Unders", "generic", 1], ["Walking Lunges", "generic", 1],
    ["Lunges", "generic", 1],
    ["Row", "generic", 1], ["BikeErg", "generic", 1], ["Bike", "generic", 1], ["Air Bike", "generic", 1],
    ["Assault Bike", "generic", 1], ["Echo Bike", "generic", 1], ["Ski", "generic", 1], ["SkiErg", "generic", 1],
    ["Run", "run", 0], ["Swim", "generic", 1], ["Shuttle Runs", "run", 1], ["Sled Push", "run", 1],
    ["Sled Pull", "generic", 1],
    ["Plank", "generic", 1], ["Hollow Hold", "generic", 1], ["Hip Thrusts", "generic", 1],
    ["Back Extensions", "generic", 1], ["V-Ups", "generic", 1],
  ];

  // How Spanish boxes and judges also write them, and the usual short forms: each points at a catalogue name.
  var SAYINGS = [
    ["carrera", "Run"], ["correr", "Run"], ["running", "Run"], ["metros", "Run"], ["remo", "Row"], ["rower", "Row"],
    ["dominadas", "Pull-Ups"], ["dominadas estrictas", "Strict Pull-Ups"], ["c2b", "Chest-to-Bar Pull-Ups"],
    ["pecho a barra", "Chest-to-Bar Pull-Ups"], ["t2b", "Toes-to-Bar"], ["pies a barra", "Toes-to-Bar"],
    ["sentadillas", "Air Squats"], ["air squat", "Air Squats"], ["sentadilla frontal", "Front Squats"],
    ["sentadilla trasera", "Back Squats"], ["arrancadas", "Snatches"], ["arrancada", "Snatches"],
    ["cargadas", "Cleans"], ["cargada", "Cleans"], ["dos tiempos", "Clean and Jerks"], ["peso muerto", "Deadlifts"],
    ["flexiones", "Push-Ups"], ["fondos", "Dips"], ["zancadas", "Lunges"], ["saltos al cajon", "Box Jumps"],
    ["salto al cajon", "Box Jumps"], ["box jump", "Box Jumps"], ["dobles", "Double Unders"], ["comba", "Single Unders"],
    ["du", "Double Unders"], ["trepa", "Rope Climbs"], ["cuerda", "Rope Climbs"], ["abdominales", "Sit-Ups"],
    ["bici", "Bike"], ["nado", "Swim"], ["nadar", "Swim"], ["natacion", "Swim"], ["hspu", "Handstand Push-Ups"],
    ["mu", "Muscle-Ups"], ["kbs", "Kettlebell Swings"], ["swings", "Kettlebell Swings"], ["empuje", "Push Presses"],
    ["press estricto", "Strict Presses"], ["devil press", "Devil Presses"], ["thruster", "Thrusters"],
    ["wallball", "Wall Balls"], ["wall ball", "Wall Balls"], ["burpee", "Burpees"], ["pistol", "Pistols"],
  ];

  var UNITS = { m: 1, km: 1, kg: 1, lb: 1, lbs: 1, cal: 1, cals: 1, rep: 1, reps: 1, x: 1, r: 1, de: 1, y: 1, en: 1 };

  // One spelling for plural and singular, applied to both sides: «Presses» and «Press» meet at «press».
  function stem(word) {
    if (/(ss|ch|sh|x)es$/.test(word)) return word.slice(0, -2);
    if (/ies$/.test(word)) return word.slice(0, -3) + "y";
    if (/s$/.test(word) && !/ss$/.test(word) && word.length > 3) return word.slice(0, -1);
    return word;
  }

  function words(text) {
    var plain = String(text || "").toLowerCase();
    if (plain.normalize) plain = plain.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return plain.split(/[^a-z0-9]+/).filter(function (w) { return w && !/^\d/.test(w) && !UNITS[w]; }).map(stem);
  }

  var BY_NAME = {};
  MOVES.forEach(function (row) { BY_NAME[row[0]] = row; });
  var INDEX = MOVES.map(function (row) { return { name: row[0], words: words(row[0]) }; })
    .concat(SAYINGS.map(function (pair) { return { name: pair[1], words: words(pair[0]) }; }));

  function holds(seq, part) {
    outer: for (var i = 0; i + part.length <= seq.length; i++) {
      for (var j = 0; j < part.length; j++) if (seq[i + j] !== part[j]) continue outer;
      return true;
    }
    return false;
  }

  // The longest name the phase holds wins, so «15 Power Cleans 60 kg» is Power Cleans and not Cleans.
  function movementOf(text) {
    var seen = words(text);
    var best = null;
    INDEX.forEach(function (entry) {
      if (!entry.words.length || !holds(seen, entry.words)) return;
      var size = entry.words.join(" ").length;
      if (!best || entry.words.length > best.words.length || (entry.words.length === best.words.length && size > best.size)) {
        best = { name: entry.name, words: entry.words, size: size };
      }
    });
    if (!best) return { movement: null, anim: "generic", approx: true };
    var row = BY_NAME[best.name];
    return { movement: row[0], anim: row[1], approx: !!row[2] };
  }

  // ---- Teams: who stands in a lane, from the heat's category

  var MOST_ATHLETES = 6;

  function mix(a, b) {
    var h = (a * 374761393 + b * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // Deterministic by lane id and place in the team, so the 5 s refreshes never reshuffle anyone.
  function teamOf(heat, laneId) {
    var size = Math.max(1, Math.min(MOST_ATHLETES, Math.floor(+(heat && heat.teamSize) || 1)));
    var kind = heat && heat.composition;
    var women = Math.max(0, Math.min(size, Math.floor(+(heat && heat.womenCount) || 0)));
    var id = Math.abs(Math.floor(+laneId || 0));
    var team = [];
    for (var i = 0; i < size; i++) {
      var woman;
      if (kind === "MALE") woman = false;
      else if (kind === "FEMALE") woman = true;
      // Spread evenly, men first: 2 of 4 reads man, woman, man, woman.
      else if (kind === "MIXED") woman = Math.floor((i + 1) * women / size) > Math.floor(i * women / size);
      else woman = (id + i) % 2 === 1;
      team.push({ woman: woman, skin: mix(id, i * 3 + 1) % 4, hair: mix(id, i * 3 + 2) % 4, cut: mix(id, i * 3 + 3) % 4 });
    }
    return team;
  }

  // ---- Lane colours: at least 8 told apart on the dark card; the lane's number text stays beside them

  var LANE_COLOURS = ["#FF4A1C", "#1FB5A8", "#8A5CF5", "#F2EFE6", "#F2C230", "#3D8BFD", "#F05A9A", "#9BD13B"];

  function colourOf(lane) {
    var n = Math.max(1, Math.floor(+lane || 1));
    return LANE_COLOURS[(n - 1) % LANE_COLOURS.length];
  }

  // ---- The track: stations in phase order, in voxels. Teams walk along +z, lanes lie side by side along x

  var START = 34, GAP = 6, LEN = 84;

  // A lone athlete needs less floor than a team of six, and past four lanes a phone needs narrower ones.
  function layout(heat, lanes) {
    var phases = (heat && heat.phases) || [], of = Math.floor(+(heat && heat.intervals) || 0);
    // An interval WOD lists its movements once per interval: one interval's are the stations, and nobody laps.
    var intervals = of > 1 && +(heat && heat.intervalSeconds) > 0;
    if (intervals && phases.length % of === 0) phases = phases.slice(0, phases.length / of);
    var size = teamOf(heat, 0).length, n = Math.max(1, phases.length), tight = lanes > 4;
    var lane = size === 1 ? (tight ? 40 : 46) : size === 2 && !tight ? 66 : tight ? 60 : 80;
    var len = n <= 5 ? LEN : Math.max(size > 4 ? LEN : size > 2 ? 64 : 52, Math.round(LEN * 5 / n));
    var texts = phases.length ? phases : [heat && heat.wodName];
    var moves = texts.map(movementOf), format = (heat && heat.format) || "FOR_TIME";
    return {
      n: n, size: size, lanes: lanes, tight: tight, lane: lane, len: len, start: START, arch: START + n * len, wait: START - 30,
      done: START + n * len + 30, end: START + n * len + 62,
      // The live server counts an AMRAP's phases on and on, round after round, and any other WOD's that has no finish line.
      laps: format !== "FOR_TIME" && !intervals,
      names: moves.map(function (m, i) { return String(m.movement || texts[i] || "").toUpperCase(); }),
      anims: moves.map(function (m) { return m.anim; }),
      props: moves.map(function (m) { return ANIMS[m.anim].prop || ""; }),
    };
  }

  function laneX(L, i) { return (i - (L.lanes - 1) / 2) * (L.lane + GAP); }

  // Where a lane is: a station, or L.n past the arch; `lap` the round of it under way. Only a running heat has a track and the
  // server marks a phase when it ends, so no marks means the first is under way.
  // An interval lane says it itself, from the heat clock: the interval under way and its station in it.
  function place(lane, L, now) {
    if (lane.at) {
      var at = lane.at(now === undefined ? Date.now() : now), waits = at.idle || lane.closed || lane.voided;
      return {
        slot: at.slot, lap: 0, round: at.round, anim: waits ? "idle" : L.anims[at.slot], since: at.since, key: at.round * (L.n + 1) + at.slot,
      };
    }
    var marks = Math.max(0, Math.floor(+lane.done || 0)), lap = L.laps ? Math.floor(marks / L.n) : 0;
    var slot = L.laps ? marks % L.n : Math.min(marks, lane.closed ? L.n : L.n - 1);
    if (lane.closed && lane.finished && !lane.voided) slot = L.n;
    var working = slot < L.n && !lane.closed && !lane.voided;
    return { slot: slot, lap: lap, round: 0, anim: working ? L.anims[slot] : "idle", since: lane.since, key: lap * (L.n + 1) + slot };
  }

  // An estimate: the live server sends nothing inside a phase. Half the stretch in 25 s, ever slower, and never the end.
  var RUN_HALF_MS = 25000;
  function runShare(ms) { return ms > 0 ? ms / (ms + RUN_HALF_MS) : 0; }

  function rest(p, L, now, since) {
    if (p.slot >= L.n) return L.done;
    var middle = L.start + (p.slot + 0.5) * L.len;
    if (p.anim !== "run") return middle;
    return middle + L.len * (0.62 * (still ? 0.5 : runShare(now - (p.since === null || p.since === undefined ? since : p.since))) - 0.36);
  }

  // A closed phase sends the team running on; an undone mark is no run, and a lane seen for the first time is already there.
  function advance(prev, next, now, L) {
    if (prev && next.round > prev.p.round) {
      // A new interval: back to its first station, facing it.
      var from = spot(prev, L, now).z, to = rest(next, L, now, now);
      if (Math.abs(to - from) < 1) return { p: next, from: to, t0: now, t1: now, lap: false };
      return { p: next, from: from, t0: now, t1: now + clamp(Math.abs(to - from) * 17, 900, 2600), lap: false, back: true };
    }
    if (!prev || next.key < prev.p.key) return { p: next, from: 0, t0: now, t1: now, lap: false };
    if (next.key === prev.p.key) return { p: next, from: prev.from, t0: prev.t0, t1: prev.t1, lap: prev.lap, back: prev.back };
    var z = spot(prev, L, now).z, lap = next.lap > prev.p.lap && next.slot < L.n;
    var to = rest(next, L, now, now), way = lap ? L.done - z + to - L.wait : to - z;
    return { p: next, from: z, t0: now, t1: now + clamp(Math.abs(way) * 17, 900, 2600), lap: lap };
  }

  function spot(state, L, now) {
    var to = rest(state.p, L, now, state.t1);
    if (still || now >= state.t1) return { z: to, anim: state.p.anim, moving: false };
    var t = (now - state.t0) / (state.t1 - state.t0), eased = t * t * (3 - 2 * t), z = state.from + (to - state.from) * eased;
    if (state.lap) {
      // A new round: on through the arch, and in again from the start.
      var out = L.done - state.from, gone = eased * (out + to - L.wait);
      z = gone < out ? state.from + gone : L.wait + gone - out;
    }
    return { z: z, anim: "run", moving: true, back: !!state.back };
  }

  // Who stands where around the station's middle, [across, along]: the animation's rows, two abreast where lanes are narrow.
  function formation(anim, L) {
    var f = ANIMS[anim].form, abreast = L.tight ? Math.min(2, f[0]) : f[0], spots = [];
    var pitch = L.tight ? Math.min(26, f[1]) : f[1], shift = L.size > 1 && !L.tight ? f[3] : 0;
    var rows = Math.ceil(L.size / abreast);
    for (var i = 0; i < L.size; i++) {
      var row = Math.floor(i / abreast), here = Math.min(abreast, L.size - row * abreast);
      spots.push([((i % abreast) - (here - 1) / 2) * pitch + shift, ((rows - 1) / 2 - row) * f[2]]);
    }
    return spots;
  }

  // ---- The camera: the athletes' own, mirrored as they are, so +z runs right and down

  function flat(x, y, z) { return [2 * (z - x), x + z - 2 * y]; }
  function project(v, x, y, z) {
    var p = flat(x, y, z);
    return [v.x + v.s * p[0], v.y + v.s * p[1]];
  }

  // Head height in voxels, and the closest the camera comes.
  var HEAD = 50, CLOSEST = 1.5;
  // Below NEAR a lane's checks and painted names are noise; below PIN a team is its number; a followed one is seen at UP_CLOSE.
  var NEAR = 0.34, PIN = 0.3, UP_CLOSE = 0.75;

  // A camera is a scale and the flat point in the middle of the frame, so a frame that changes size keeps what it shows.
  function sight(cam, w, h) { return { s: cam.s, x: w / 2 - cam.s * cam.x, y: h / 2 - cam.s * cam.y }; }

  // The whole track: from behind the team that waits to the places past the end of every lane.
  function whole(L, w, h) {
    var x0 = laneX(L, 0) - L.lane / 2, x1 = -x0, z0 = L.wait - (L.size > 4 ? 36 : 26), z1 = L.end + 34;
    var b = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 };
    [[x0, 0, z0], [x1, 0, z0], [x0, 0, z1], [x1, 0, z1], [x0, HEAD, z0], [x1, HEAD, L.end]].forEach(function (c) {
      var p = flat(c[0], c[1], c[2]);
      b.l = Math.min(b.l, p[0]); b.r = Math.max(b.r, p[0]); b.t = Math.min(b.t, p[1]); b.b = Math.max(b.b, p[1]);
    });
    var s = Math.min(CLOSEST, (w - 12) / (b.r - b.l), (h - 30) / (b.b - b.t));
    return { s: s, x: (b.l + b.r) / 2, y: (b.t + b.b) / 2 - 4 / s };
  }

  // The middle of the frame stays on the floor: on all of it up close, on ever less of it the farther, until the whole track
  // has only its own middle.
  function fence(cam, L, w, h) {
    var all = whole(L, w, h), s = clamp(cam.s, all.s, CLOSEST);
    if (s <= all.s) return all;
    var free = Math.min(1, s / all.s - 1), x0 = laneX(L, 0) - L.lane / 2;
    function floor(p) { return [(p.y - p.x / 2) / 2, (p.y + p.x / 2) / 2]; }
    var middle = floor(all), at = floor(cam), lo = [x0, -12], hi = [-x0, L.end + 34];
    at = at.map(function (v, i) { return clamp(v, middle[i] + (lo[i] - middle[i]) * free, middle[i] + (hi[i] - middle[i]) * free); });
    return { s: s, x: 2 * (at[1] - at[0]), y: at[0] + at[1] };
  }

  // Closer or farther, with the spot under the finger left under it.
  function zoomAt(cam, factor, px, py, L, w, h) {
    var s = clamp(cam.s * factor, whole(L, w, h).s, CLOSEST), dx = px - w / 2, dy = py - h / 2;
    return fence({ s: s, x: cam.x + dx / cam.s - dx / s, y: cam.y + dy / cam.s - dy / s }, L, w, h);
  }

  // A followed team that comes round to the start is a cut, never a swing across the whole track.
  function cuts(L, from, to) { return Math.abs(to - from) > L.len * 1.8; }

  // With few lanes the names fit at any scale.
  function pinned(L, s) { return L.lanes > 4 && s < PIN; }

  // Number and name over each team, the name cut to the room there is; past eight lanes on a phone, the number alone. The
  // place, where there is one, goes before it. `blocked` are the controls' boxes.
  function tags(list, w, h, measure, blocked) {
    var roomy = w >= 640, most = list.length <= 4 ? 112 : list.length <= 6 ? 92 : list.length <= 8 ? 80 : roomy ? 60 : 0;
    if (roomy) most *= 1.6;
    var tall = 16, set = [];
    list.forEach(function (one) {
      var number = String(one.lane), name = String(one.name || "").toUpperCase(), text = number;
      if (most) {
        text = number + " " + name;
        while (name.length > 1 && measure(text) + 10 > most) {
          name = name.slice(0, -1);
          text = number + " " + name.replace(/\s+$/, "") + "…";
        }
      }
      var beside = one.place ? Math.ceil(measure(one.place)) + 10 : 0;
      var wide = Math.ceil(measure(text)) + 10 + beside, taken = function (o) {
        return x < o.x + o.w && o.x < x + wide && y < o.y + o.h && o.y < y + tall;
      };
      var x = clamp(one.px - wide / 2, 0, w - wide), y0 = one.py - tall, y = clamp(y0, 0, h - tall);
      for (var k = 1; k < 2 * h / tall && (set.some(taken) || blocked.some(taken)); k++) {
        y = clamp(y0 + (k & 1 ? -1 : 1) * Math.ceil(k / 2) * (tall + 1), 0, h - tall);
      }
      set.push({ lane: one.lane, text: text, x: x, y: y, w: wide, h: tall, placeWide: beside });
    });
    return set;
  }

  // Where the teams out of the frame stand on its edge: each as near as it can to where it is, walking along the edge past
  // whatever is already there.
  function edges(list, w, h, blocked) {
    var M = 16, W = w - 2 * M, H = h - 2 * M, round = 2 * (W + H), set = [];
    function at(t) {
      t = ((t % round) + round) % round;
      if (t < W) return { x: M + t, y: M };
      if (t < W + H) return { x: w - M, y: M + t - W };
      if (t < 2 * W + H) return { x: w - M - (t - W - H), y: h - M };
      return { x: M, y: h - M - (t - 2 * W - H) };
    }
    function taken(p) {
      return set.some(function (o) { return Math.hypot(o.x - p.x, o.y - p.y) < 24; }) || blocked.some(function (b) {
        return p.x + 12 > b.x && p.x - 12 < b.x + b.w && p.y + 12 > b.y && p.y - 12 < b.y + b.h;
      });
    }
    list.forEach(function (one) {
      var x = clamp(one.px, M, w - M), y = clamp(one.py, M, h - M);
      var t = y === M ? x - M : x === w - M ? W + y - M : y === h - M ? W + H + w - M - x : 2 * W + H + h - M - y, p = at(t);
      for (var k = 1; k < round / 2 && taken(p); k++) p = at(t + (k & 1 ? -2 : 2) * Math.ceil(k / 2));
      set.push({ x: p.x, y: p.y, angle: Math.atan2(one.py - p.y, one.px - p.x) });
    });
    return set;
  }

  // ---- Phone safety

  // Above this average time per drawn frame the scene steps down: fewer frames, then nothing.
  var BUDGET_MS = 20;
  var LEVELS = 3;

  function keeps(level) { return { stride: [1, 2, 4, 4][level], scene: level < LEVELS }; }

  function degrade(level, averageMs) {
    return averageMs > BUDGET_MS ? Math.min(LEVELS, level + 1) : level;
  }

  function Lru(cap) {
    this.cap = cap;
    this.bytes = 0;
    this.map = new Map();
  }
  Lru.prototype.get = function (key) {
    var hit = this.map.get(key);
    if (hit) {
      this.map.delete(key);
      this.map.set(key, hit);
    }
    return hit;
  };
  Lru.prototype.put = function (key, value, bytes) {
    if (this.map.has(key)) this.bytes -= this.map.get(key).bytes;
    this.map.delete(key);
    this.map.set(key, { value: value, bytes: bytes });
    this.bytes += bytes;
    while (this.bytes > this.cap && this.map.size > 1) {
      var oldest = this.map.keys().next().value;
      this.bytes -= this.map.get(oldest).bytes;
      this.map.delete(oldest);
    }
  };
  Lru.prototype.clear = function () {
    this.map.clear();
    this.bytes = 0;
  };

  // ---- The skeleton: two-bone IK on fixed bone lengths

  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function len(a) { return Math.hypot(a[0], a[1], a[2]); }
  function nrm(a) { return mul(a, 1 / (len(a) || 1)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // A target out of reach leaves the limb straight towards it, never stretched: `miss` says by how much.
  function ik(A, T, l1, l2, pole) {
    var d = sub(T, A), D = len(d), c = Math.min(l1 + l2 - 0.05, Math.max(Math.abs(l1 - l2) + 0.3, D));
    var u = D > 1e-6 ? mul(d, 1 / D) : [0, -1, 0];
    var a = (l1 * l1 - l2 * l2 + c * c) / (2 * c), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    var pp = sub(pole, mul(u, dot(pole, u))), pl = len(pp);
    pp = pl < 1e-6 ? [0, 0, 1] : mul(pp, 1 / pl);
    return [add(A, add(mul(u, a), mul(pp, h))), add(A, mul(u, c)), D - c];
  }

  function skel(P, B) {
    var cl = Math.cos(P.l), sl = Math.sin(P.l), sd = [0, cl, sl], pel = [0, P.py, P.pz], neck = add(pel, mul(sd, B.tor));
    var ap = P.ap || [0.5, -0.8, -0.55];
    var S = { pel: pel, neck: neck, sd: sd, nd: [0, -sl, cl], hip: [], sh: [], kn: [], an: [], el: [], wr: [], fd: [], H: [], T: [], miss: 0 };
    [1, -1].forEach(function (s, i) {
      var hip = [s * B.hw, P.py, P.pz], sh = [s * B.sw, neck[1] - B.sd * cl, neck[2] - B.sd * sl], f = P.f[i], h = P.h[i];
      var lg = ik(hip, [s * f[0], f[1], f[2]], B.th, B.sh, [s * 0.3, 0.5 * sl, 0.5 * cl + 0.5]);
      var ar = ik(sh, [s * h[0], h[1], h[2]], B.ua, B.fa, [s * ap[0], ap[1], ap[2]]);
      var cp = Math.cos(f[3]), sp = Math.sin(f[3]), q = B.fs;
      var rot = function (a, b) { return [0, a * cp - b * sp, a * sp + b * cp]; };
      S.hip[i] = hip; S.sh[i] = sh; S.kn[i] = lg[0]; S.an[i] = lg[1]; S.el[i] = ar[0]; S.wr[i] = ar[1];
      S.fd[i] = nrm(sub(ar[1], ar[0]));
      S.H[i] = add(lg[1], rot(-1.2 * q, -1.4 * q));
      S.T[i] = add(lg[1], rot(-1.2 * q, 3.2 * q));
      S.miss = Math.max(S.miss, lg[2], ar[2]);
    });
    var ha = P.l * 0.55 + P.hp;
    S.hd = [0, Math.cos(ha), Math.sin(ha)];
    S.hc = add(neck, mul(S.hd, B.nk + B.hh + 0.5));
    return S;
  }

  // Keys: [frame, pelvis y, pelvis z, lean, head pitch, foot x, y, z, pitch, hand x, y, z], on the base skeleton at scale 1.
  function spline(K, N) {
    var n = K.length;
    var R = [[K[n - 1][0] - N].concat(K[n - 1].slice(1))].concat(K, [[K[0][0] + N].concat(K[0].slice(1))], [[K[1][0] + N].concat(K[1].slice(1))]);
    var T = [];
    for (var i = 1; i < R.length - 1; i++) {
      T[i] = R[i].slice(1).map(function (v, j) {
        var a = v - R[i - 1][j + 1], b = R[i + 1][j + 1] - v;
        // Flat at a turning point, so a held pose does not overshoot.
        return a * b <= 0 ? 0 : (R[i + 1][j + 1] - R[i - 1][j + 1]) / (R[i + 1][0] - R[i - 1][0]);
      });
    }
    return function (t) {
      t = ((t % N) + N) % N;
      var k = 1;
      while (k < n && R[k + 1][0] <= t) k++;
      var t0 = R[k][0], h = R[k + 1][0] - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
      var v = R[k].slice(1).map(function (_, j) {
        return (2 * s3 - 3 * s2 + 1) * R[k][j + 1] + (s3 - 2 * s2 + s) * h * T[k][j] + (-2 * s3 + 3 * s2) * R[k + 1][j + 1] + (s3 - s2) * h * T[k + 1][j];
      });
      var f = [v[4], v[5], v[6], v[7]], hh = [v[8], v[9], v[10]];
      return { py: v[0], pz: v[1], l: v[2], hp: v[3], f: [f, f], h: [hh, hh] };
    };
  }

  var SNATCH = [[0, 9, -5, 1, 0, 2.8, 2, 0, 0, 6.2, 5, 3.5], [3, 9, -5, 1, 0, 2.8, 2, 0, 0, 6.2, 5, 3.5], [8, 10.5, -4, 0.8, 0, 2.8, 2, 0, 0, 6.2, 8.5, 4.8], [11, 14.6, -0.5, 0.08, 0, 3, 3.2, 0, 0.5, 6, 19, 3.8], [14, 5.8, -4, 0.35, -0.15, 5, 2, 0.5, 0, 6.2, 22.9, -1], [18, 5.8, -4, 0.35, -0.15, 5, 2, 0.5, 0, 6.2, 22.9, -1], [23, 14.6, -0.8, 0.03, 0, 3.6, 2, 0, 0, 6.2, 31.8, -0.6], [26, 14.6, -0.8, 0.03, 0, 3.6, 2, 0, 0, 6.2, 31.8, -0.6], [30, 14.4, -0.3, 0.05, 0, 3.2, 2, 0, 0, 6.2, 13.4, 3.4], [34, 10.5, -4, 0.8, 0, 2.8, 2, 0, 0, 6.2, 8.5, 4.8], [37, 9, -5, 1, 0, 2.8, 2, 0, 0, 6.2, 5, 3.5]];
  // The plank: hands at hy .75 rest flat on the floor at y = 0.
  var BURPEE = [[0, 14.6, 0, 0.05, 0, 2.6, 2, 0, 0, 4.2, 12.5, 0.8], [2, 14.6, 0, 0.05, 0, 2.6, 2, 0, 0, 4.2, 12.5, 0.8], [6, 5.4, -3.4, 0.88, 0, 3, 2, 0, 0, 5.8, 0.75, 6.8], [7, 5.4, -3.4, 0.88, 0, 3, 2, 0, 0, 5.8, 0.75, 6.8], [9, 7.4, -1.4, 1.02, 0.12, 2.8, 4.6, -7, 0.6, 5.8, 0.75, 6.5], [11, 8.1, -0.6, 1.13, 0.15, 2.6, 2.6, -12.4, 1, 5.8, 0.75, 6.5], [15, 4.6, -1.2, 1.43, 0.25, 2.6, 2.6, -14.1, 1, 6.4, 0.75, 6.5], [19, 8.1, -0.6, 1.13, 0.15, 2.6, 2.6, -12.4, 1, 5.8, 0.75, 6.5], [21, 7.4, -1.4, 1.02, 0.12, 2.8, 4.6, -7, 0.6, 5.8, 0.75, 6.5], [23, 5.4, -3.4, 0.88, 0, 3, 2, 0, 0, 5.8, 0.75, 6.8], [25, 5.4, -3.4, 0.88, 0, 3, 2, 0, 0, 5.8, 0.75, 6.8], [27, 14.6, 0, 0.05, -0.1, 2.6, 2, 0, 0.3, 4.2, 32.6, 0.5], [29, 19.5, 0.5, 0, -0.2, 2.6, 7, -1.5, 0.5, 4.2, 37.6, 0.5], [32, 12.5, -0.5, 0.2, 0, 2.8, 2, 0, 0, 5, 16, 1.5], [35, 14.6, 0, 0.05, 0, 2.6, 2, 0, 0, 4.2, 12.5, 0.8]];
  var PULL = [[0, 15.8, -0.4, 0.04, 0, 2, 3.4, -1.8, 0.7, 5.6, 34, 0], [4, 15.8, -0.4, 0.04, 0, 2, 3.4, -1.8, 0.7, 5.6, 34, 0], [12, 26, 0.2, -0.1, 0.45, 2, 14.5, -3, 0.8, 5.6, 34, 0], [16, 26, 0.2, -0.1, 0.45, 2, 14.5, -3, 0.8, 5.6, 34, 0], [25, 15.8, -0.4, 0.04, 0, 2, 3.4, -1.8, 0.7, 5.6, 34, 0]];
  var SQUAT = [[0, 14.6, 0, 0.05, 0, 2.8, 2, 0, 0, 3.4, 19, 5.5], [3, 14.6, 0, 0.05, 0, 2.8, 2, 0, 0, 3.4, 19, 5.5], [11, 7.8, -4.2, 0.75, 0.05, 2.8, 2, 0, 0, 3.4, 14.5, 10.3], [14, 7.8, -4.2, 0.75, 0.05, 2.8, 2, 0, 0, 3.4, 14.5, 10.3], [21, 14.6, 0, 0.05, 0, 2.8, 2, 0, 0, 3.4, 19, 5.5]];
  // A neutral lifter for what has no animation of its own yet: a hip hinge to the knees and back up, hands low.
  var GENERIC = [[0, 14.6, 0, 0.05, 0, 2.8, 2, 0, 0, 4.4, 12.6, 1.6], [4, 14.6, 0, 0.05, 0, 2.8, 2, 0, 0, 4.4, 12.6, 1.6], [11, 12.4, -3.2, 0.72, 0.1, 2.8, 2, 0, 0, 4.6, 8.6, 6], [14, 12.4, -3.2, 0.72, 0.1, 2.8, 2, 0, 0, 4.6, 8.6, 6], [21, 14.6, 0, 0.05, 0, 2.8, 2, 0, 0, 4.4, 12.6, 1.6]];
  // Waiting: standing, a slow breath.
  var IDLE = [[0, 14.6, 0, 0.04, 0, 2.8, 2, 0, 0, 4.2, 12.7, 1.2], [8, 14.35, -0.1, 0.07, 0.04, 2.8, 2, 0, 0, 4.3, 12.4, 1.4], [16, 14.6, 0, 0.04, 0, 2.8, 2, 0, 0, 4.2, 12.7, 1.2]];

  // Two strides in 16 frames: heel to glute, high knee, arms at ninety degrees.
  function run(t) {
    var ph = ((t / 16) % 1 + 1) % 1, bob = 0.5 - 0.5 * Math.cos(4 * Math.PI * (ph - 0.12)), py = 12.8 + 2.2 * bob, l = 0.2;
    var shY = py + 7.8 * Math.cos(l), shZ = 7.8 * Math.sin(l);
    var f = [0, 1].map(function (i) {
      var u = (ph + i * 0.5) % 1, z, y, p;
      if (u < 0.42) {
        var s = u / 0.42, q = Math.max(0, (s - 0.72) / 0.28);
        z = 4.5 - 11 * s; y = 2.2 + 2.8 * q * q; p = 0.05 + 0.95 * q;
      } else {
        var w = (u - 0.42) / 0.58, e = w * w * (3 - 2 * w);
        z = -6.5 + 11 * e; y = 2.2 + 7.5 * Math.pow(Math.sin(Math.PI * w), 0.9) * (1.1 - 0.4 * w); p = 0.95 - 1.35 * w;
      }
      return [2.6, y, z, p];
    });
    var h = [0, 1].map(function (i) {
      var a = (i ? 1 : -1) * Math.cos(2 * Math.PI * ph);
      return [3.8, shY - 7.2 + 3.8 * Math.max(0, a), shZ + 1 + 5.5 * a];
    });
    return { py: py, pz: 0, l: l, hp: -0.12, f: f, h: h };
  }

  function withArms(fn, ap) {
    return function (t) {
      var p = fn(t);
      p.ap = ap;
      return p;
    };
  }

  // The animation registry. Adding one is a pose function, its frame count and its team spacing; the bone test covers
  // every entry on its own. `still` is the frame shown to visitors who ask for less motion; `form` the team's place on a
  // station (abreast, spacing across, spacing along, shift that leaves room for the painted name); `bar` draws a loaded
  // barbell in the hands, `rig` a pull-up station; `prop` is the equipment left there when nobody is using it.
  var ANIMS = {};
  function register(id, def) { ANIMS[id] = def; }
  register("run", { N: 16, pose: run, form: [2, 18, 18, 0], prop: "cones", still: 4 });
  register("snatch", { N: 40, pose: spline(SNATCH, 40), form: [2, 30, 26, -4], bar: 1, prop: "bar", still: 24 });
  register("burpee", { N: 36, pose: withArms(spline(BURPEE, 36), [0.9, -0.25, -0.6]), form: [4, 15, 34, 0], still: 29 });
  register("pullup", { N: 28, pose: spline(PULL, 28), form: [4, 17, 30, 0], rig: 1, prop: "rig", still: 14 });
  register("squat", { N: 24, pose: spline(SQUAT, 24), form: [2, 28, 18, -4], still: 12 });
  register("generic", { N: 24, pose: spline(GENERIC, 24), form: [2, 28, 18, -4], still: 12 });
  register("idle", { N: 16, pose: spline(IDLE, 16), form: [2, 24, 16, 0], still: 0 });

  // ---- Bodies and the three styles

  var BASE = { th: 6.5, sh: 6.5, ua: 5.5, fa: 5, tor: 9, hw: 2.2, sw: 4.4, sd: 1.2, nk: 1.1, hh: 2, fs: 1 };
  function scaled(o, k) {
    var r = {}, q;
    for (q in o) r[q] = o[q];
    ["th", "sh", "ua", "fa", "tor", "hw", "sw", "sd", "fs"].forEach(function (name) { r[name] = o[name] * k; });
    return r;
  }
  function lin(a, b) { return [a, a + (b - a) * 0.35, b]; }
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) for (var k in arguments[i]) target[k] = arguments[i][k];
    return target;
  }
  var FX = [0, 0, 0.45, 0, 0.62, 0.5, 0.8, 0, 1, 0], BX = [0, 0.55, 0.2, 0.45, 0.4, 0, 1, 0];
  function body(k, o) {
    return assign({ k: k, shoe: [9, 1.3, 1.05], pl: 4.3, nr: 1.3, hr: 1.05, sl: 0.5 }, o, { B: assign(scaled(BASE, k), o.B) });
  }
  var MAN = { B: { hw: 2.5, sw: 5.1, nk: 1.8 }, R: { th: lin(2.3, 1.55), sh: lin(1.7, 1), ua: lin(1.5, 1.25), fa: lin(1.25, 0.95) }, T: { w: [0, 2.8, 0.25, 2.4, 0.6, 3.8, 0.85, 4.6, 0.93, 4.5, 1, 3], d: [0, 2.1, 0.5, 2, 0.9, 2.5, 1, 2.2], sv: 2.7, vb: 1.8 } };
  // About 6% shorter, narrower shoulders, wider hips, a marked waist, a shorter torso, a slimmer neck.
  var WOMAN = { B: { hw: 2.7, sw: 4.25, nk: 1.7, tor: 10.2 }, R: { th: lin(2.45, 1.5), sh: lin(1.55, 0.95), ua: lin(1.3, 1.1), fa: lin(1.1, 0.85) }, T: { w: [0, 3.4, 0.14, 3.5, 0.3, 2.4, 0.6, 3.15, 0.85, 3.9, 0.93, 3.8, 1, 2.6], d: [0, 2.2, 0.5, 1.9, 0.9, 2.3, 1, 2], fx: FX, bx: BX, sv: 2.6, vb: 1.8 }, nr: 1.1, hr: 0.95, sl: 0.42, shoe: [9, 1.2, 1], pl: 4.1 };
  function thicker(o, d) {
    var R = {};
    for (var k in o.R) R[k] = o.R[k].map(function (x) { return x + d; });
    return assign({}, o, { R: R });
  }
  var RETRO_MAN = assign(thicker(MAN, 0.12), { hr: 1.5, shoe: [9, 1.75, 1.5] });
  var RETRO_WOMAN = assign(thicker(WOMAN, 0.12), { hr: 1.4, shoe: [9, 1.65, 1.4] });

  // A man stands about 70 px tall at scale 1, a woman about 6% less.
  var K_MAN = 1.2, K_WOMAN = 1.128;

  // Colour ids: 1 orange, 2 shorts, 3 cream, 4 steel, 5 ink, 6 dark steel, 7 sole, 8 knee sleeve, 9 shoe, 10-13 skin,
  // 14-17 hair, 18 lips, 19 leather, 24 bib, 25 outline, 26-33 the lane colours.
  var PAL = { 1: "#FF4A1C", 2: "#2b2f3b", 3: "#f2efe6", 4: "#b5b1a5", 5: "#14110f", 6: "#8d8a82", 7: "#1b1917", 8: "#454d63", 9: "#e6e1d3", 10: "#e9b48c", 11: "#f8d2b2", 12: "#b87a58", 13: "#8d5a3f", 14: "#4a2f22", 15: "#14110f", 16: "#c9a05a", 17: "#7a5038", 18: "#f08a8a", 19: "#6a4328", 24: "#f6f4ee", 25: "#0b0a09" };
  // The arcade palette: 13 warm base colours, plus the lane's.
  var RET = { 1: "#ff5a1f", 2: "#34345a", 3: "#f6ecd2", 4: "#b9a98c", 5: "#1c1118", 6: "#b9a98c", 7: "#1c1118", 8: "#34345a", 9: "#f6ecd2", 10: "#f2b58a", 11: "#fbd7b4", 12: "#c27d54", 13: "#8d5a3f", 14: "#6b3f2a", 15: "#1c1118", 16: "#e0b050", 17: "#6b3f2a", 18: "#ff5a1f", 19: "#6b3f2a", 24: "#f6ecd2", 25: "#1c1118" };
  LANE_COLOURS.forEach(function (hex, i) { PAL[26 + i] = hex; RET[26 + i] = hex; });
  // The kit's shorts and chest stripe for each lane colour, so both always contrast with the shirt.
  var KIT_SHORTS = [2, 2, 3, 2, 2, 3, 2, 2];
  var KIT_STRIPE = [3, 3, 3, 1, 2, 3, 3, 2];
  function rgbOf(o) {
    var r = {};
    for (var k in o) r[k] = [parseInt(o[k].slice(1, 3), 16), parseInt(o[k].slice(3, 5), 16), parseInt(o[k].slice(5, 7), 16)];
    return r;
  }

  var LIGHT = { m: [1.12, 0.6, 0.88], ed: 0.84 };
  function style(id, man, woman, extra) {
    var s = assign({ id: id, G: [body(K_MAN, man), body(K_WOMAN, woman)], L: LIGHT, sh2: [0.2, 0.42], lt: [0.55, -0.2], ao: 1, rgb: rgbOf(PAL) }, extra);
    s.G[0].r = 1;
    s.G[1].r = s.G[1].k / s.G[0].k;
    return s;
  }
  var STYLES = {
    det: style("det", MAN, WOMAN, {}),
    com: style("com", MAN, WOMAN, { kit: 1 }),
    ret: style("ret", RETRO_MAN, RETRO_WOMAN, { ol: 1, rgb: rgbOf(RET), L: { m: [1.12, 0.62, 0.86], ed: 0.8 }, ao: 0 }),
  };
  var STYLE_IDS = ["det", "com", "ret"];

  var SKIN = [0, 2, 1, 3];
  function pr(A, f) {
    if (f <= A[0]) return A[1];
    for (var i = 2; i < A.length; i += 2) {
      if (f <= A[i]) {
        var t = (f - A[i - 2]) / (A[i] - A[i - 2]);
        return A[i - 1] + (A[i + 1] - A[i - 1]) * t;
      }
    }
    return A[A.length - 1];
  }

  // A man's pose drawn at scale k; a woman's is the same motion at her ratio r, scaled about the bar on a pull-up so her
  // hands stay on it.
  function barY(sty) { return 34 * sty.G[0].k; }
  function poseOf(sty, g, mv, t) {
    var P = mv.pose(t), k = sty.G[0].k, r = sty.G[g].r, Y0 = mv.rig ? barY(sty) : 0, q = k * r;
    var out = {
      py: Y0 + (P.py * k - Y0) * r, pz: P.pz * q, l: P.l, hp: P.hp, ap: P.ap,
      f: P.f.map(function (f) { return [f[0] * q, Y0 + (f[1] * k - Y0) * r, f[2] * q, f[3]]; }),
      h: P.h.map(function (h) { return [h[0] * q, Y0 + (h[1] * k - Y0) * r, h[2] * q]; }),
    };
    if (mv.rig && g) {
      var d = sty.G[0].B.tor * sty.G[1].r - sty.G[1].B.tor;
      out.py += d;
      out.f.forEach(function (f) { f[1] += d; });
    }
    return out;
  }

  // Every bone's length through every registered animation, for both bodies of every style: they must never change.
  function verify() {
    var bones = [["hip", "kn", "th"], ["kn", "an", "sh"], ["sh", "el", "ua"], ["el", "wr", "fa"]];
    var out = [];
    STYLE_IDS.forEach(function (id) {
      var sty = STYLES[id];
      [0, 1].forEach(function (g) {
        var B = sty.G[g].B, r = { style: id, woman: !!g, poses: 0, bone: 0, miss: 0 };
        Object.keys(ANIMS).forEach(function (name) {
          var mv = ANIMS[name];
          for (var t = 0; t < mv.N; t += 0.25) {
            var S = skel(poseOf(sty, g, mv, t), B);
            r.poses++;
            [0, 1].forEach(function (i) {
              bones.forEach(function (b) { r.bone = Math.max(r.bone, Math.abs(len(sub(S[b[0]][i], S[b[1]][i])) - B[b[2]])); });
            });
            r.bone = Math.max(r.bone, Math.abs(len(sub(S.neck, S.pel)) - B.tor), Math.abs(len(sub(S.hip[0], S.hip[1])) - 2 * B.hw),
              Math.abs(len(sub(S.sh[0], S.sh[1])) - 2 * B.sw), Math.abs(len(sub(S.hc, S.neck)) - (B.nk + B.hh + 0.5)));
            r.miss = Math.max(r.miss, S.miss);
          }
        });
        out.push(r);
      });
    });
    return out;
  }

  // ---- The voxel rasteriser and the bake into cube sprites

  var NX = 80, NY = 64, NZ = 80, C = 40, SX = NY * NZ, SY = NZ;
  var V = new Uint8Array(NX * NY * NZ), list = new Int32Array(1 << 16), ln = 0;
  // Turned half round about the athlete's own vertical axis, for a bake that faces back down the lane.
  var turned = false;
  function put(x, y, z, c) {
    if (turned) {
      x = 2 * C - 1 - x;
      z = 2 * C - 1 - z;
    }
    if (x < 0 || y < 0 || z < 0 || x >= NX || y >= NY || z >= NZ || ln >= list.length) return;
    var i = x * SX + y * SY + z;
    if (!V[i]) list[ln++] = i;
    V[i] = c;
  }
  function W3(p) { return [C + p[0], p[1], C + p[2]]; }

  function capsule(A, B, r1, r2, c) {
    var ab = sub(B, A), L2 = dot(ab, ab) || 1e-6, R = Math.max(r1, r2) + 0.5;
    var lo = [0, 1, 2].map(function (i) { return Math.max(0, Math.floor(Math.min(A[i], B[i]) - R)); });
    var hi = [NX - 1, NY - 1, NZ - 1].map(function (m, i) { return Math.min(m, Math.ceil(Math.max(A[i], B[i]) + R)); });
    var fn = typeof c === "function";
    for (var x = lo[0]; x <= hi[0]; x++) for (var y = lo[1]; y <= hi[1]; y++) for (var z = lo[2]; z <= hi[2]; z++) {
      var qx = x + 0.5 - A[0], qy = y + 0.5 - A[1], qz = z + 0.5 - A[2];
      var t = Math.min(1, Math.max(0, (qx * ab[0] + qy * ab[1] + qz * ab[2]) / L2));
      var dx = qx - ab[0] * t, dy = qy - ab[1] * t, dz = qz - ab[2] * t, r = r1 + (r2 - r1) * t;
      if (dx * dx + dy * dy + dz * dz <= r * r) put(x, y, z, fn ? c(t, y) : c);
    }
  }
  // Three radii (start, 35%, end), so a thigh or a calf has its volume.
  function limb(A, B, r, c) {
    var m = add(A, mul(sub(B, A), 0.35)), fn = typeof c === "function";
    capsule(A, m, r[0], r[1], fn ? function (t, y) { return c(t * 0.35, y); } : c);
    capsule(m, B, r[1], r[2], fn ? function (t, y) { return c(0.35 + t * 0.65, y); } : c);
  }
  function cylinder(c, half, r, col) {
    for (var a = Math.floor(c[0] - half); a < Math.ceil(c[0] + half); a++) {
      if (Math.abs(a + 0.5 - c[0]) > half) continue;
      for (var y = Math.floor(c[1] - r); y <= Math.ceil(c[1] + r); y++) for (var b = Math.floor(c[2] - r); b <= Math.ceil(c[2] + r); b++) {
        var dy = y + 0.5 - c[1], db = b + 0.5 - c[2];
        if (dy * dy + db * db <= r * r) put(a, y, b, col);
      }
    }
  }

  // v: { woman, skin, hair, cut, n (number on the bib) }; tc: the lane colour's index.
  function raster(sty, v, mv, P, tc, vy) {
    var g = v.woman ? 1 : 0, gd = sty.G[g], B = gd.B, S = skel(P, B), R = gd.R, T = gd.T, hh = B.hh, kit = sty.kit, cut = v.cut;
    var sk = 10 + SKIN[v.skin], hr = 14 + v.hair, team = 26 + tc;
    var shirt = team, acc = team, shs = kit ? KIT_SHORTS[tc] : 2, stp = KIT_STRIPE[tc];
    var crop = g && !kit && [1, 0, 1, 0][cut], leg = g && !kit && [0, 1, 1, 0][cut], top0 = T.sv + (crop ? 2.3 : 0);
    var vb0 = T.sv + 0.9, vb1 = vb0 + (g ? 4 : 5);
    // The torso: an oriented box with a width and depth profile (chest and glutes asymmetric on a woman).
    var pa = W3(S.pel), pb = W3(S.neck);
    var lo = [0, 1, 2].map(function (i) { return Math.max(0, Math.floor(Math.min(pa[i], pb[i]) - 8)); });
    var hi = [NX - 1, NY - 1, NZ - 1].map(function (m, i) { return Math.min(m, Math.ceil(Math.max(pa[i], pb[i]) + 8)); });
    for (var x = lo[0]; x <= hi[0]; x++) for (var y = lo[1]; y <= hi[1]; y++) for (var z = lo[2]; z <= hi[2]; z++) {
      var d0 = x + 0.5 - C, d1 = y + 0.5 - P.py, d2 = z + 0.5 - C - P.pz;
      var w = d1 * S.nd[1] + d2 * S.nd[2], s = d1 * S.sd[1] + d2 * S.sd[2];
      if (s < -T.vb || s > B.tor + 0.3) continue;
      var f = s / B.tor, dp = pr(T.d, f), fx = T.fx ? pr(T.fx, f) : 0, bx = T.bx ? pr(T.bx, f) : 0;
      if (Math.abs(d0) > pr(T.w, f) || w > dp + fx || w < -(dp + bx)) continue;
      var fr = w > dp + fx - 1.1, bk = w < -(dp + bx) + 1.1, c = s < T.sv ? shs : s < top0 ? sk : shirt;
      if (s >= top0) {
        if (kit) {
          if (s >= B.tor * 0.8 && s < B.tor * 0.8 + 1.3) c = stp;
          else if ((fr || bk) && s >= vb0 && s < vb1 && Math.abs(d0) < (g ? 2 : 3)) {
            c = 24;
            if (Math.abs(s - (vb0 + vb1) / 2) < 1 && Math.abs(d0) < 2 && Math.floor(d0) + 2 <= v.n) c = 5;
          }
        } else if (s < top0 + 1.2) c = 3;
        else if (fr && s > B.tor * 0.42 && s < B.tor * 0.7 && Math.abs(d0) <= 1.8) {
          c = Math.abs(d0) < 0.7 || (s > B.tor * 0.6 && Math.abs(d0) < 1.6 && s < B.tor * 0.62) ? 5 : 3;
        }
      }
      put(x, y, z, c);
    }
    // The head: a rounded cube with eyes, lips, hair and headband; +z is forward.
    var h0 = W3(S.hc).map(function (q) { return Math.floor(q) + 0.5; });
    function hv(f, l, u, col) { put(Math.floor(h0[0] + l), Math.floor(h0[1] + u), Math.floor(h0[2] + f), col); }
    capsule(W3(add(S.neck, mul(S.hd, 0.2))), W3(add(S.neck, mul(S.hd, B.nk + 0.8))), gd.nr, gd.nr, sk);
    var band = !g || cut === 3 || kit, bob = g && cut === 3;
    for (var dx = -hh; dx <= hh; dx++) for (var dy = -hh; dy <= hh; dy++) for (var dz = -hh; dz <= hh; dz++) {
      if (Math.abs(dx) === hh && Math.abs(dy) === hh && Math.abs(dz) === hh) continue;
      var fw = dz, lw = Math.abs(dx), col = sk;
      if (dy === hh || (dy === hh - 1 && fw <= hh - 1) || (fw === -hh && dy >= -hh + 1) || (fw === -hh + 1 && dy >= 0 && lw === hh) || (bob && lw === hh && fw <= 0 && dy >= -1)) col = hr;
      else if (fw === hh) {
        if (dy === 0 && lw === 1) col = 5;
        else if (g && dy === -1 && lw === 0) col = 18;
      }
      if (band && dy === hh - 1) col = acc;
      put(h0[0] + dx - 0.5, h0[1] + dy - 0.5, h0[2] + dz - 0.5, col);
    }
    var ty = clamp(vy, -1.5, 1.5), i, k;
    if (!g) {
      if (cut === 1) for (k = hh + 1; k <= hh + 3; k++) hv(-k, 0, Math.floor(hh / 2) - (k - hh - 1), hr);
      if (cut === 2) for (var a = -1; a <= 0; a++) for (var b = -1; b <= 0; b++) {
        put(h0[0] - 0.5 + a, h0[1] - 0.5 + hh + 1, h0[2] - 0.5 + b, hr);
        put(h0[0] - 0.5 + a, h0[1] - 0.5 + hh + 2, h0[2] - 0.5 + b, hr);
      }
      if (cut === 3) for (k = -hh + 1; k <= hh - 1; k++) hv(k, 0, hh + 1, hr);
    } else if (cut === 0) {
      // A ponytail that lags the head's vertical speed.
      for (i = 0; i <= 5; i++) {
        var u0 = hh - 1 + 1.3 * i - 0.38 * i * i - ty * 0.3 * i, f0 = -(hh + 1) - 0.7 * i;
        hv(f0, 0, u0, i === 1 ? acc : hr);
        if (i < 2) { hv(f0, 1, u0, hr); hv(f0, -1, u0, hr); }
      }
    } else if (cut === 1) {
      for (i = 0; i <= 6; i++) hv(-(hh + 1) - 0.18 * i - ty * 0.2 * i, 0, hh - 2 - 0.95 * i, i === 6 ? acc : i & 1 ? (hr === 14 ? 17 : 14) : hr);
    } else if (cut === 2) {
      for (var p = 0; p < 2; p++) for (var q = 0; q < 2; q++) for (var l = -1; l <= 0; l++) hv(-(hh + 1) - p, l, q - 1, hr);
      hv(-(hh + 1), 0, 1, acc);
    } else {
      for (var ff = -hh; ff <= 0; ff++) for (var uu = -2; uu <= 0; uu++) { hv(ff, hh + 1, uu, hr); hv(ff, -hh - 1, uu, hr); }
      for (var ll = -hh - 1; ll <= hh + 1; ll++) for (var u2 = -2; u2 <= 0; u2++) hv(-hh - 1, ll, u2, hr);
    }
    [0, 1].forEach(function (j) {
      var side = j ? -1 : 1;
      limb(W3(S.hip[j]), W3(S.kn[j]), R.th, leg ? shs : function (t) { return t < gd.sl ? shs : sk; });
      limb(W3(S.kn[j]), W3(S.an[j]), R.sh, function (t) { return t > 0.75 ? 3 : leg ? shs : !g && t < 0.38 ? 8 : sk; });
      capsule(W3(S.H[j]), W3(S.T[j]), gd.shoe[1], gd.shoe[2], gd.shoe[0]);
      limb(W3(S.sh[j]), W3(S.el[j]), R.ua, sk);
      limb(W3(S.el[j]), W3(S.wr[j]), R.fa, function (t) { return t > 0.8 ? acc : sk; });
      var wr = S.wr[j], flat = wr[1] < 3.2 * gd.k, d = flat ? nrm([0, -0.15, 1]) : S.fd[j], hs = gd.hr / 1.05;
      var c0 = add(wr, mul(d, 0.5 * hs)), c1 = add(wr, mul(d, 1.7 * hs));
      capsule(W3(c0), W3(c1), gd.hr, gd.hr, sk);
      var th = W3(add(mul(add(c0, c1), 0.5), [-side * 1.5 * hs, 0.3, 0.5]));
      put(Math.floor(th[0]), Math.floor(th[1]), Math.floor(th[2]), sk);
    });
    if (mv.bar) {
      var cc = W3([0, P.h[0][1], P.h[0][2]]).map(Math.round), hl = 6.2 * gd.k + 3.4;
      cylinder(cc, hl, 1, 4);
      [-1, 1].forEach(function (s2) {
        var plate = cc.slice(), collar = cc.slice();
        plate[0] += s2 * (hl - 1.5);
        cylinder(plate, 1, gd.pl, 1);
        collar[0] += s2 * (hl - 3.5);
        cylinder(collar, 1, gd.pl * 0.37, 3);
      });
    }
    // Each athlete hangs from a station of their own: a bar between two posts. One bar across the team would run
    // diagonally up the stage in this camera and take the height of two athletes.
    if (mv.rig) {
      var by = barY(sty), half = RIG_HALF;
      cylinder(W3([0, by, 0]).map(Math.round), half + 1, 1, 4);
      [-half, half].forEach(function (px) {
        var at = W3([px, 0, 0]).map(Math.round), a2, b2, y2;
        for (a2 = -2; a2 < 2; a2++) for (b2 = -2; b2 < 2; b2++) put(at[0] + a2, 0, at[2] + b2, 6);
        for (y2 = 1; y2 <= by + 1; y2++) for (a2 = -1; a2 < 1; a2++) for (b2 = -1; b2 < 1; b2++) put(at[0] + a2, y2, at[2] + b2, 1);
      });
    }
  }
  var RIG_HALF = 8;

  // The isometric camera, exact so cubes are never sheared. U is the size of a voxel in backing pixels.
  var CAMS = {};
  function camera(U) {
    if (CAMS[U]) return CAMS[U];
    var h = U / 2, e = [[U, h], [0, -U], [-U, h]];
    function pr3(x, y, z) { return [e[0][0] * x + e[1][0] * y + e[2][0] * z, e[0][1] * x + e[1][1] * y + e[2][1] * z]; }
    var cs = [];
    for (var i = 0; i < 8; i++) cs.push(pr3(i & 1, (i >> 1) & 1, (i >> 2) & 1));
    var xs = cs.map(function (p) { return p[0]; }), ys = cs.map(function (p) { return p[1]; });
    var mnx = Math.min.apply(null, xs), mny = Math.min.apply(null, ys), w = Math.max.apply(null, xs) - mnx, hgt = Math.max.apply(null, ys) - mny;
    var faces = [[pr3(0, 1, 0), e[0], e[2], 0], [pr3(1, 0, 0), e[2], e[1], 1], [pr3(0, 0, 1), e[0], e[1], 2]];
    function inFace(px, py, o, u, v) {
      var dx = px - o[0], dy = py - o[1], d = u[0] * v[1] - u[1] * v[0];
      return [(dx * v[1] - dy * v[0]) / d, (u[0] * dy - u[1] * dx) / d];
    }
    var pix = [];
    for (var py = 0; py < hgt; py++) for (var px = 0; px < w; px++) {
      for (var f = 0; f < 3; f++) {
        var ab = inFace(px + 0.5 + mnx, py + 0.5 + mny, faces[f][0], faces[f][1], faces[f][2]);
        if (ab[0] >= 0 && ab[0] < 1 && ab[1] >= 0 && ab[1] < 1) {
          pix.push([px, py, faces[f][3], ab[0] < 0.2 || ab[1] < 0.2 ? 1 : 0]);
          break;
        }
      }
    }
    // A floor tile: the pixels of one voxel's footprint, for the shadow.
    var pts = [[0, 0], e[0], e[2], [e[0][0] + e[2][0], e[0][1] + e[2][1]]];
    var tx = Math.min.apply(null, pts.map(function (p) { return p[0]; })), tyy = Math.min.apply(null, pts.map(function (p) { return p[1]; }));
    var tw = Math.max.apply(null, pts.map(function (p) { return p[0]; })) - tx, th = Math.max.apply(null, pts.map(function (p) { return p[1]; })) - tyy;
    var tile = [];
    for (var yy = 0; yy < th; yy++) for (var xx = 0; xx < tw; xx++) {
      var q = inFace(xx + 0.5 + tx, yy + 0.5 + tyy, [0, 0], e[0], e[2]);
      if (q[0] >= 0 && q[0] < 1 && q[1] >= 0 && q[1] < 1) tile.push([xx, yy]);
    }
    // The point (C, 0, C), where an athlete stands, is the origin every bake is placed from.
    return (CAMS[U] = { U: U, e: e, mnx: mnx, mny: mny, w: w, h: hgt, pix: pix, tile: tile, tx: tx, ty: tyy, tw: tw, th: th, ox: -(e[0][0] + e[2][0]) * C, oy: -(e[0][1] + e[2][1]) * C });
  }

  var AO = [1, 0.9, 0.78, 0.62];
  // A cube's six shades (three faces, each plain or at its edge) for a colour and AO level, as RGB triplets.
  var shades = {};
  function shade(sty, key) {
    var set = shades[sty.id] || (shades[sty.id] = {});
    if (set[key]) return set[key];
    var c = key & 63, a = key >> 6, L = sty.L, rgb = sty.rgb[c], out = new Uint8ClampedArray(18);
    for (var f = 0; f < 3; f++) for (var edge = 0; edge < 2; edge++) {
      var m = L.m[f] * (edge ? L.ed : 1) * (sty.ao ? AO[a & 3] : 1), o = (f * 2 + edge) * 3;
      out[o] = rgb[0] * m;
      out[o + 1] = rgb[1] * m;
      out[o + 2] = rgb[2] * m;
    }
    return (set[key] = out);
  }

  // Cubes are written straight into the pixels, back to front: thousands of drawImage calls per bake were its cost.
  function paintCube(d, W, x, y, cam, rgb) {
    var pix = cam.pix;
    for (var k = 0; k < pix.length; k++) {
      var p = pix[k], i = ((y + p[1]) * W + x + p[0]) * 4, o = (p[2] * 2 + p[3]) * 3;
      d[i] = rgb[o];
      d[i + 1] = rgb[o + 1];
      d[i + 2] = rgb[o + 2];
      d[i + 3] = 255;
    }
  }

  var shadowGrid = new Uint8Array(NX * NZ), shadowList = new Int32Array(NX * NZ), AON = [SX, SY, 1, SX + SY, SX + 1, SY + 1, SX + SY + 1], PAD = 4;
  function solid(j) { return V[j] && V[j] !== 25; }

  // The voxels on the list become one canvas of visible cubes and one of the shadow they cast; the grid is left empty.
  function bake(sty, cam) {
    var E = cam.e, k, i, j;
    if (sty.ol) {
      var n0 = ln, around = [SX, -SX, SY, -SY, 1, -1], rim = [];
      for (k = 0; k < n0; k++) {
        i = list[k];
        var y0 = ((i / SY) | 0) % NY;
        for (var o = 0; o < 6; o++) {
          j = i + around[o];
          if (j >= 0 && j < V.length && !V[j] && !(around[o] === -SY && y0 === 0)) rim.push(j);
        }
      }
      rim.forEach(function (q) { if (!V[q] && ln < list.length) { V[q] = 25; list[ln++] = q; } });
    }
    var arr = list.subarray(0, ln);
    arr.sort();
    var vx = [], vy = [], vk = [], x0 = 1e9, y0b = 1e9, x1 = -1e9, y1 = -1e9;
    for (k = 0; k < ln; k++) {
      i = arr[k];
      var c = V[i], z = i % NZ, y = ((i / SY) | 0) % NY, x = (i / SX) | 0;
      if (solid(i + SX) && solid(i + SY) && solid(i + 1)) continue;
      var a = 0;
      if (sty.ao && c !== 25) {
        var n = 0;
        for (var q = 0; q < AON.length; q++) if (solid(i + AON[q])) n++;
        a = Math.min(3, n >> 1);
      }
      if (c === 9 && (y === 0 || !solid(i - SY))) c = 7;
      var px = cam.ox + E[0][0] * x + E[1][0] * y + E[2][0] * z + cam.mnx, py = cam.oy + E[0][1] * x + E[1][1] * y + E[2][1] * z + cam.mny;
      vx.push(px); vy.push(py); vk.push(c | (a << 6));
      x0 = Math.min(x0, px); y0b = Math.min(y0b, py); x1 = Math.max(x1, px + cam.w); y1 = Math.max(y1, py + cam.h);
    }
    var ns = 0, lx = sty.lt[0], lz = sty.lt[1];
    for (k = 0; k < ln; k++) {
      i = arr[k];
      if (V[i] === 25) continue;
      var zz = i % NZ, yy = ((i / SY) | 0) % NY, xx = (i / SX) | 0, sx = Math.round(xx + lx * yy), sz = Math.round(zz + lz * yy);
      if (sx < 0 || sz < 0 || sx >= NX || sz >= NZ) continue;
      var level = yy < 10 ? 2 : 1, cell = sx * NZ + sz;
      if (!shadowGrid[cell]) shadowList[ns++] = cell;
      if (shadowGrid[cell] < level) shadowGrid[cell] = level;
    }
    var core = ns;
    for (k = 0; k < core; k++) {
      j = shadowList[k];
      if (shadowGrid[j] !== 2) continue;
      [NZ, -NZ, 1, -1].forEach(function (dj) {
        var t = j + dj;
        if (t >= 0 && t < shadowGrid.length && !shadowGrid[t]) { shadowGrid[t] = 1; shadowList[ns++] = t; }
      });
    }
    var a0 = 1e9, b0 = 1e9, a1 = -1e9, b1 = -1e9, spots = [];
    for (k = 0; k < ns; k++) {
      j = shadowList[k];
      var gx = (j / NZ) | 0, gz = j % NZ;
      var sxp = cam.ox + E[0][0] * gx + E[2][0] * gz + cam.tx, syp = cam.oy + E[0][1] * gx + E[2][1] * gz + cam.ty;
      spots.push(sxp, syp, shadowGrid[j]);
      shadowGrid[j] = 0;
      a0 = Math.min(a0, sxp); b0 = Math.min(b0, syp); a1 = Math.max(a1, sxp + cam.tw); b1 = Math.max(b1, syp + cam.th);
    }
    var cv = document.createElement("canvas");
    cv.width = Math.max(1, x1 - x0 + 2 * PAD);
    cv.height = Math.max(1, y1 - y0b + 2 * PAD);
    var cx = cv.getContext("2d"), body = cx.createImageData(cv.width, cv.height);
    // The outline goes first, so every body cube covers it.
    if (sty.ol) for (k = 0; k < vx.length; k++) if ((vk[k] & 63) === 25) paintCube(body.data, cv.width, vx[k] - x0 + PAD, vy[k] - y0b + PAD, cam, shade(sty, vk[k]));
    for (k = 0; k < vx.length; k++) if (!sty.ol || (vk[k] & 63) !== 25) paintCube(body.data, cv.width, vx[k] - x0 + PAD, vy[k] - y0b + PAD, cam, shade(sty, vk[k]));
    cx.putImageData(body, 0, 0);
    var sc = document.createElement("canvas");
    sc.width = Math.max(1, a1 - a0);
    sc.height = Math.max(1, b1 - b0);
    var sx2 = sc.getContext("2d"), shadow = sx2.createImageData(sc.width, sc.height), alpha = [0, sty.sh2[0] * 255, sty.sh2[1] * 255];
    for (k = 0; k < spots.length; k += 3) {
      for (var t = 0; t < cam.tile.length; t++) {
        var at = ((spots[k + 1] - b0 + cam.tile[t][1]) * sc.width + spots[k] - a0 + cam.tile[t][0]) * 4 + 3;
        shadow.data[at] = Math.max(shadow.data[at], alpha[spots[k + 2]]);
      }
    }
    sx2.putImageData(shadow, 0, 0);
    for (k = 0; k < ln; k++) V[arr[k]] = 0;
    ln = 0;
    return { cv: cv, x: x0 - PAD, y: y0b - PAD, sh: sc, sx: a0, sy: b0, bytes: (cv.width * cv.height + sc.width * sc.height) * 4 };
  }

  // A voxel is 2 px of its sprite; the track draws the same sprites at every scale.
  var VOXEL = 2;

  // ---- Equipment, baked by the same engine around the middle of its station

  function barbell(x, z, sty) {
    var gd = sty.G[0], half = 6.2 * gd.k + 3.4, at = [C + Math.round(x), 4, C + Math.round(z)];
    cylinder(at, half, 1, 4);
    [-1, 1].forEach(function (side) {
      cylinder([at[0] + side * (half - 1.5), at[1], at[2]], 1, gd.pl, 1);
      cylinder([at[0] + side * (half - 3.5), at[1], at[2]], 1, gd.pl * 0.37, 3);
    });
  }
  function box(x0, y0, z0, w, h, d, c) {
    for (var x = 0; x < w; x++) for (var y = 0; y < h; y++) for (var z = 0; z < d; z++) put(C + x0 + x, y0 + y, C + z0 + z, c);
  }
  var PROPS = {
    bar: function (L, sty) { formation("snatch", L).forEach(function (f) { barbell(f[0], f[1], sty); }); },
    rig: function (L, sty) {
      var by = Math.round(barY(sty));
      formation("pullup", L).forEach(function (f) {
        var x = Math.round(f[0]), z = Math.round(f[1]);
        cylinder([C + x, by, C + z], RIG_HALF + 1, 1, 4);
        [-RIG_HALF, RIG_HALF].forEach(function (px) { box(x + px - 2, 0, z - 2, 4, 1, 4, 6); box(x + px - 1, 1, z - 1, 2, by + 1, 2, 1); });
      });
    },
    cones: function (L) {
      [-1, 0, 1].forEach(function (k) {
        var x = 6 - Math.round(L.lane / 2), z = Math.round(k * Math.min(30, L.len * 0.32));
        for (var y = 0; y < 9; y++) {
          var r = Math.max(0, Math.round(3 - y * 0.36));
          box(x - r, y, z - r, 2 * r + 1, 1, 2 * r + 1, y > 3 && y < 6 ? 3 : 1);
        }
      });
    },
    arch: function (L, sty, tc) {
      var half = L.lane / 2 - 3, x;
      [-half, half - 3].forEach(function (px) { for (var y = 0; y < 48; y += 4) box(px, y, 0, 3, 4, 3, y & 4 ? 5 : 3); });
      for (x = -half; x < half; x += 4) for (var row = 0; row < 2; row++) {
        box(x, 44 + row * 4, 0, Math.min(4, half - x), 4, 3, ((x + half) / 4 + row) & 1 ? 5 : 3);
      }
      box(-half, 52, 0, 2 * half, 2, 3, 26 + tc);
    },
  };

  // ---- The scenes

  var FPS = 12;
  var BAKE_MS = 8;
  var MEMORY = 24 << 20;
  var WINDOW = 24;
  // One baked frame of one athlete, and the frames of a mean movement.
  var SPRITE = 29000, CYCLE = 26;
  // Past two backing pixels per CSS pixel nobody tells the difference and a phone pays for it in fill.
  var SHARPEST = 2;

  // What a loop of that many athletes holds in the cache.
  function need(athletes) { return athletes * Math.ceil(CYCLE / trackStride(athletes)) * SPRITE; }

  // Every frame of a team or two, and fewer distinct frames the more athletes in view: a cache smaller than one loop would
  // bake for ever. The margin is the sprites of the teams just gone out of view, and the equipment.
  function trackStride(athletes) {
    var stride = athletes <= 8 ? 1 : 2;
    while (stride < 16 && athletes * Math.ceil(CYCLE / stride) * SPRITE > MEMORY * 0.8) stride *= 2;
    return stride;
  }

  var cache = new Lru(MEMORY);
  var scenes = new Map();
  var styleId = "det";
  var level = 0;
  var onLevel = null;
  var timer = null;
  var onView = null;
  var frames = 0;
  var gestures = 0;
  var spent = [];
  var samples = [];
  var still = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  // What the observer has said about each canvas: in sight or not. One it has not reported on yet is drawn.
  var inSight = new Map();
  var watcher = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { inSight.set(entry.target, entry.isIntersecting); });
    start();
  }) : null;

  function baked(key, budget, fill) {
    var hit = cache.get(key);
    if (hit) return hit.value;
    if (budget.left() <= 0) return null;
    ln = 0;
    fill();
    var made = bake(STYLES[styleId], camera(VOXEL));
    cache.put(key, made, made.bytes);
    return made;
  }

  function athlete(mvId, at, v, tc, budget, back) {
    return baked([styleId, mvId, at, v.woman ? 1 : 0, v.skin, v.hair, v.cut, v.n, tc, back ? "b" : ""].join(":"), budget, function () {
      var sty = STYLES[styleId], mv = ANIMS[mvId], g = v.woman ? 1 : 0, P = poseOf(sty, g, mv, at);
      turned = !!back;
      try {
        raster(sty, v, mv, P, tc, P.py - poseOf(sty, g, mv, at - 1).py);
      } finally {
        turned = false;
      }
    });
  }

  function equipment(id, L, tc, budget) {
    return baked([styleId, id, L.size, L.lane, L.len, tc].join(":"), budget, function () { PROPS[id](L, STYLES[styleId], tc); });
  }

  function rgba(hex, a) {
    return "rgba(" + [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16); }).join() + "," + a + ")";
  }

  var DISPLAY = "'HelveticaNeue-CondensedBlack','Helvetica Neue',Roboto,'Arial Narrow',sans-serif";
  var GROUND = "#0b0a0a", MAT = "rgba(242,238,230,.05)", INK = "#14110f", PAPER = "#f2eee6", HEAT = "#ff4a1c";

  // The canvas at its own size, cleared, for a view in CSS pixels. MOST_PIXELS is for a full screen on a desktop.
  var MOST_PIXELS = 4e6;
  function open(cv, opaque) {
    var w = cv.clientWidth, h = cv.clientHeight;
    if (!cv.isConnected || !w || !h) return null;
    var d = Math.min(SHARPEST, window.devicePixelRatio || 1, Math.sqrt(MOST_PIXELS / (w * h))), W = Math.round(w * d), H = Math.round(h * d);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var c = cv.getContext("2d", { alpha: !opaque });
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = GROUND;
    c.fillRect(0, 0, W, H);
    return { c: c, w: w, h: h, d: d };
  }

  // One lane's floor. With the floor's own transform every mark on it is an upright rectangle: [along, across].
  function lie(o, v, x) {
    var s = v.s * o.d;
    o.c.setTransform(2 * s, s, -2 * s, s, (v.x - 2 * v.s * x) * o.d, (v.y + v.s * x) * o.d);
  }

  // The stretch of a lane, along z, that the frame shows.
  function shownOf(o, v, L, x) {
    var half = L.lane / 2;
    return [
      Math.max(-v.x / (2 * v.s) + x, -v.y / v.s - x) - half,
      Math.min((o.w - v.x) / (2 * v.s) + x, (o.h - v.y) / v.s - x) + half,
    ];
  }

  function floor(o, v, L, one, x, near) {
    var c = o.c, half = L.lane / 2, colour = LANE_COLOURS[one.tc], at = one.at, p = one.state.p, i, k, a, seen = shownOf(o, v, L, x);
    if (seen[0] > L.end || seen[1] < -12 || seen[0] > seen[1]) return;
    lie(o, v, x);
    function tile(z, y, len, wide, fill) { c.fillStyle = fill; c.fillRect(z, y, len, wide); }
    tile(-12, -half, L.end + 12, L.lane, "#1c1a19");
    for (i = Math.max(0, Math.floor((seen[0] + 12) / 16)); near && -12 + i * 16 < Math.min(L.end, seen[1]); i++) {
      for (k = i & 1; k * 16 < L.lane; k += 2) {
        tile(-12 + i * 16, -half + k * 16, Math.min(16, L.end + 12 - i * 16), Math.min(16, L.lane - k * 16), "#211f1d");
      }
    }
    for (i = 0; i < L.n; i++) {
      a = L.start + i * L.len;
      if (a > seen[1] || a + L.len < seen[0]) continue;
      var lit = p.slot === i && !at.moving;
      tile(a + 3, -half + 5, L.len - 6, L.lane - 10, lit ? rgba(colour, 0.24) : p.slot > i ? rgba(colour, 0.11) : MAT);
      if (i) tile(a - 1, -half, 2, L.lane, "rgba(242,238,230,.28)");
      if (near) paint(c, L.names[i], a + L.len / 2, half - 10, L.len - 8, 12, lit ? colour : "rgba(242,238,230,.4)");
    }
    for (i = 0; i * 8 < L.lane; i++) for (k = 0; k < 2; k++) {
      tile(L.arch + k * 5, -half + i * 8, 5, Math.min(8, L.lane - i * 8), (i + k) & 1 ? PAPER : INK);
    }
    tile(L.start - 3, -half, 4, L.lane, PAPER);
    tile(-12, -half, L.end + 12, 3, colour);
    tile(-12, half - 3, L.end + 12, 3, colour);
  }

  // A station's name on its floor, shrunk to its station and then cut.
  function paint(c, text, z, x, room, most, fill) {
    c.font = "900 " + most + "px " + DISPLAY;
    c.textAlign = "center";
    c.textBaseline = "middle";
    var size = clamp(most * room / (c.measureText(text).width || 1), 7, most);
    c.font = "900 " + size + "px " + DISPLAY;
    while (text.length > 2 && c.measureText(text).width > room) text = text.slice(0, -2).replace(/\s+$/, "") + "…";
    c.fillStyle = fill;
    c.fillText(text, z, x);
  }

  // The equipment nobody is using, and the arch: none that stands out of the frame, however tall.
  function stand(list, o, v, L, one, x, budget) {
    var seen = shownOf(o, v, L, x), from = seen[0] - 60, to = seen[1] + 130;
    for (var i = 0; i < L.n; i++) {
      var id = L.props[i], z = L.start + (i + 0.5) * L.len, busy = one.state.p.slot === i && !one.at.moving && one.at.anim !== "idle";
      if (!id || (busy && id !== "cones") || z < from || z > to) continue;
      add3(list, equipment(id, L, 0, budget), x, z, id === "bar" ? 0 : -24);
    }
    if (L.arch >= from && L.arch <= to) add3(list, equipment("arch", L, one.tc, budget), x, L.arch + 3, -10);
  }
  function add3(list, e, x, z, bias) { if (e) list.push({ e: e, x: x, z: z, depth: x + z + (bias || 0) }); }

  function team(list, L, one, x, budget, stride, tick) {
    var mv = ANIMS[one.at.anim], spots = formation(one.at.anim, L), whole = true;
    one.team.forEach(function (who, i) {
      var f = still ? mv.still : (tick + i * (mv.N >> 2)) % mv.N;
      if (!still) f -= f % stride;
      var e = athlete(one.at.anim, f, who, one.tc, budget, one.at.back);
      if (e) one.last[i] = e;
      else whole = false;
      add3(list, one.last[i], x + spots[i][0], one.at.z + spots[i][1], 0);
    });
    return whole;
  }

  // Shadows first, then everything from the back to the front.
  function flush(o, v, list) {
    var c = o.c, s = v.s * o.d;
    c.imageSmoothingEnabled = s < 1.99;
    list.sort(function (a, b) { return a.depth - b.depth; });
    ["sh", "cv"].forEach(function (layer) {
      list.forEach(function (t) {
        var p = project(v, t.x, 0, t.z), e = t.e, x = p[0] * o.d, y = p[1] * o.d;
        if (x < -90 * s || x > o.w * o.d + 90 * s || y < -60 * s || y > o.h * o.d + 130 * s) return;
        // Drawn as they are they would face left: mirrored, they face the way they run.
        c.setTransform(-s, 0, 0, s, Math.round(x), Math.round(y));
        if (layer === "sh") c.drawImage(e.sh, e.sx, e.sy);
        else c.drawImage(e.cv, e.x, e.y);
      });
    });
  }

  function ease(from, to, ms, pace) { return to + (from - to) * Math.exp(-ms / pace); }

  // Where a followed team puts the camera: the team a little under the middle, which leaves its tag room.
  function following(sc, m, w, h) {
    var i = sc.lanes.findIndex(function (one) { return one.id === m.id; }), L = sc.L, z = sc.lanes[i].at.z;
    var p = flat(laneX(L, i), 20, z), cut = m.z !== null && cuts(L, m.z, z), s = clamp(m.want, whole(L, w, h).s, CLOSEST);
    m.z = z;
    return { cam: fence({ s: s, x: p[0], y: p[1] - 0.05 * h / s }, L, w, h), cut: cut };
  }

  // Moves the camera on towards what its mode asks for, and says whether it is still on its way.
  function steer(sc, w, h, now) {
    var m = sc.map, ms = Math.min(200, now - sc.seen), want = null, cut = false;
    if (m.mode === "whole") want = whole(sc.L, w, h);
    else if (m.mode === "follow") {
      var to = following(sc, m, w, h);
      want = to.cam;
      cut = to.cut;
    } else {
      want = fence(m.to || m.cam, sc.L, w, h);
    }
    var resized = m.w !== w || m.h !== h;
    m.w = w;
    m.h = h;
    if (!m.cam || still || cut || (resized && m.mode !== "follow") || (m.mode === "free" && !m.to)) {
      m.cam = want;
      m.to = null;
      return false;
    }
    var pace = m.mode === "whole" ? 260 : 170, cam = {};
    ["s", "x", "y"].forEach(function (k) { cam[k] = ease(m.cam[k], want[k], ms, pace); });
    if (Math.abs(cam.s - want.s) < 0.002 && (Math.abs(cam.x - want.x) + Math.abs(cam.y - want.y)) * want.s < 0.5) {
      m.cam = want;
      m.to = null;
      return false;
    }
    m.cam = cam;
    return true;
  }

  // The controls over the drawing, in its own pixels: nothing that has to be read goes under them.
  function controls(sc, cv) {
    var box = cv.parentNode && cv.parentNode.parentNode, at = cv.getBoundingClientRect(), set = [];
    [].forEach.call((box && box.querySelectorAll("button, .track-hint")) || [], function (one) {
      var r = one.getBoundingClientRect();
      if (r.width) set.push({ x: r.left - at.left, y: r.top - at.top, w: r.width, h: r.height });
    });
    return set;
  }

  // `quick` is a gesture's own frame, sixty a second: it keeps every second sprite, so none is baked to be seen for 16 ms.
  function drawTrack(sc, now, budget, stride, tick, quick) {
    var o = open(sc.canvas, true);
    if (!o) return false;
    var L = sc.L, busy = steer(sc, o.w, o.h, now), v = sight(sc.map.cam, o.w, o.h), near = v.s >= NEAR;
    var list = [], full = true, reach = 70 * v.s, count = sc.lanes.length;
    sc.seen = now;
    sc.tick = tick;
    sc.shown = 0;
    sc.lanes.forEach(function (one, i) {
      var p = project(v, laneX(L, i), 24, one.at.z);
      one.on = p[0] > -reach && p[0] < o.w + reach && p[1] > -reach && p[1] < o.h + reach;
      if (one.on) sc.shown++;
    });
    stride = Math.max(quick ? 2 : 1, stride, trackStride(athletesShown()));
    sc.lanes.forEach(function (one, i) { floor(o, v, L, one, laneX(L, i), near); });
    if (!near) {
      // Too small to read on every lane: once, larger, on the floor in front of the nearest one.
      lie(o, v, laneX(L, count - 1) + L.lane / 2);
      for (var n = 0; n < L.n; n++) paint(o.c, L.names[n], L.start + (n + 0.5) * L.len, 16, L.len - 8, 24, "rgba(242,238,230,.72)");
    }
    sc.lanes.forEach(function (one, i) { stand(list, o, v, L, one, laneX(L, i), budget); });
    // A different lane first each time, so on a slow phone every team gets its turn to be baked.
    for (var k = 0; k < count; k++) {
      var i = (k + tick) % count;
      if (sc.lanes[i].on && !team(list, L, sc.lanes[i], laneX(L, i), budget, stride, tick)) full = false;
    }
    flush(o, v, list);
    var blocked = controls(sc, sc.canvas), popping = ends(o, sc, v, now);
    label(o, sc, v, blocked);
    sc.whole = full;
    sc.frames++;
    // With less motion nothing else will draw what a small budget left out.
    sc.busy = busy || popping || (still && !full);
    return true;
  }

  function athletesShown() {
    var all = 0;
    scenes.forEach(function (sc) { if (visible(sc.canvas)) all += sc.shown * sc.L.size; });
    return all;
  }

  // Each lane's place past its end. A new one is drawn bigger and settles; says whether one is still settling.
  var POP_MS = 260, SETTLED_MS = 1100;
  function ends(o, sc, v, now) {
    var c = o.c, L = sc.L, popping = false, pitch = (L.lane + GAP) * v.s, plain = clamp(58 * v.s, L.lanes > 8 ? 11 : 14, 40);
    c.setTransform(o.d, 0, 0, o.d, 0, 0);
    c.font = "900 " + plain + "px " + DISPLAY;
    // The lanes' ends are 2 across for 1 down: where one would be written over the next, the numbers alone.
    var short = pitch < plain * 0.85 && sc.lanes.some(function (one) {
      return one.place && 2 * pitch < c.measureText(one.place.text).width * 0.9;
    });
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.lineJoin = "round";
    sc.lanes.forEach(function (one, i) {
      one.ended = false;
      if (!one.place) return;
      var p = project(v, laneX(L, i), 0, L.end + 17), size = plain, text = short ? String(one.place.n) : one.place.text;
      one.ended = p[0] > 0 && p[0] < o.w && p[1] > 0 && p[1] < o.h;
      if (!one.ended) return;
      var since = now - one.popped, pop = still || since > SETTLED_MS ? 0 : 0.6 * Math.exp(-since / POP_MS);
      if (pop) popping = true;
      size *= 1 + pop;
      c.font = "900 " + size + "px " + DISPLAY;
      c.lineWidth = Math.max(3, size / 5);
      c.strokeStyle = GROUND;
      c.strokeText(text, p[0], p[1]);
      c.fillStyle = one.place.n === 1 ? HEAT : one.place.n <= 3 ? PAPER : "rgba(242,238,230,.62)";
      c.fillText(text, p[0], p[1]);
    });
    return popping;
  }

  // Who is who: a number or a tag over each team in the frame, and a number on its edge for the rest. `sc.pins` is what a
  // finger can touch.
  function label(o, sc, v, blocked) {
    var c = o.c, L = sc.L, inside = [], outside = [], pins = [], followed = sc.map.mode === "follow" ? sc.map.id : null;
    sc.lanes.forEach(function (one, i) {
      var head = project(v, laneX(L, i), HEAD - 4, one.at.z), feet = project(v, laneX(L, i), 20, one.at.z);
      var seen = feet[0] > 4 && feet[0] < o.w - 4 && feet[1] > 4 && feet[1] < o.h - 4, at = seen ? head : feet;
      (seen ? inside : outside).push({
        one: one, lane: one.lane, name: one.name, px: at[0], py: at[1], place: one.place && !one.ended ? one.place.text : "",
      });
    });
    c.textBaseline = "middle";
    if (pinned(L, v.s)) {
      c.font = "900 13px " + DISPLAY;
      c.textAlign = "center";
      inside.forEach(function (t) {
        var x = clamp(t.px, 12, o.w - 12), y = clamp(t.py - 9, 12, o.h - 12);
        pin(c, t.one, x, y, 10.5, t.one.id === followed);
        pins.push({ id: t.one.id, x: x, y: y, w: 24, h: 24, edge: false });
      });
    } else {
      c.font = "900 12px " + DISPLAY;
      c.textAlign = "left";
      tags(inside, o.w, o.h, function (t) { return c.measureText(t).width; }, blocked).forEach(function (tag, i) {
        var one = inside[i].one, x = tag.x + tag.placeWide, middle = tag.y + tag.h / 2 + 0.5;
        c.fillStyle = LANE_COLOURS[one.tc];
        c.fillRect(x, tag.y, tag.w - tag.placeWide, tag.h);
        c.fillStyle = INK;
        c.fillText(tag.text, x + 5, middle);
        if (tag.placeWide) {
          c.fillStyle = one.place.n === 1 ? HEAT : PAPER;
          c.fillRect(tag.x, tag.y, tag.placeWide, tag.h);
          c.fillStyle = INK;
          c.fillText(inside[i].place, tag.x + 5, middle);
        }
        pins.push({ id: one.id, x: tag.x + tag.w / 2, y: tag.y + tag.h / 2, w: tag.w, h: tag.h, edge: false });
      });
    }
    c.font = "900 12px " + DISPLAY;
    c.textAlign = "center";
    var taken = pins.map(function (p) { return { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h }; });
    edges(outside, o.w, o.h, blocked.concat(taken)).forEach(function (p, i) {
      var one = outside[i].one;
      function tip(angle, far) { return [p.x + Math.cos(angle) * far, p.y + Math.sin(angle) * far]; }
      c.fillStyle = LANE_COLOURS[one.tc];
      c.beginPath();
      [tip(p.angle, 15), tip(p.angle + 0.6, 9), tip(p.angle - 0.6, 9)].forEach(function (q) { c.lineTo(q[0], q[1]); });
      c.fill();
      pin(c, one, p.x, p.y, 10, one.id === followed);
      pins.push({ id: one.id, x: p.x, y: p.y, w: 24, h: 24, edge: true });
    });
    sc.pins = pins;
  }

  function pin(c, one, x, y, radius, ring) {
    [[ring ? PAPER : INK, radius + 1.5], [LANE_COLOURS[one.tc], radius]].forEach(function (disc) {
      c.fillStyle = disc[0];
      c.beginPath();
      c.arc(x, y, disc[1], 0, 2 * Math.PI);
      c.fill();
    });
    c.fillStyle = INK;
    c.fillText(String(one.lane), x, y + 0.5);
  }

  // ---- The visitor's view of each heat: whole, free or following a lane

  // Kept by heat for as long as it is on the floor, whatever the card does: redrawn, in «Tiempos», on full screen.
  function tell(sc) {
    var said = sc.map.mode + sc.map.id;
    if (said === sc.told) return;
    sc.told = said;
    if (onView) onView(sc.key);
  }

  function letGo(sc) {
    var m = sc.map;
    m.mode = "free";
    m.id = m.to = m.z = null;
    m.vx = m.vy = 0;
  }

  // Back at the whole track one finger scrolls the page again.
  function settle(sc) {
    if (sc.map.mode !== "free") return;
    var to = sc.map.to || sc.map.cam;
    if (to.s <= whole(sc.L, sc.map.w, sc.map.h).s * 1.02) home(sc.key);
  }

  function pan(sc, dx, dy) {
    var m = sc.map;
    m.cam = fence({ s: m.cam.s, x: m.cam.x - dx / m.cam.s, y: m.cam.y - dy / m.cam.s }, sc.L, m.w, m.h);
  }

  function zoomTo(sc, factor, px, py, glide) {
    var m = sc.map, from = (glide && m.mode === "free" && m.to) || m.cam, to;
    to = zoomAt(from, factor, px, py, sc.L, m.w, m.h);
    letGo(sc);
    if (glide && !still) m.to = to;
    else m.cam = to;
  }

  function ready(key) {
    var sc = scenes.get(key);
    return sc && sc.map.cam ? sc : null;
  }

  function zoomBy(key, factor) {
    var sc = ready(key);
    if (!sc) return;
    zoomTo(sc, factor, sc.map.w / 2, sc.map.h / 2, true);
    settle(sc);
    tell(sc);
    repaint(sc);
  }

  function home(key) {
    var sc = scenes.get(key);
    if (!sc) return;
    letGo(sc);
    sc.map.mode = "whole";
    tell(sc);
    repaint(sc);
  }

  function follow(key, id) {
    var sc = scenes.get(key), m = sc && sc.map;
    if (!sc || !sc.lanes.some(function (one) { return one.id === id; })) return;
    letGo(sc);
    m.mode = "follow";
    m.id = id;
    m.want = Math.max(UP_CLOSE, m.cam ? m.cam.s : 0, m.w ? 1.6 * whole(sc.L, m.w, m.h).s : 0);
    tell(sc);
    repaint(sc);
  }

  function view(key) {
    var sc = scenes.get(key), m = sc && sc.map;
    if (!sc) return null;
    var cam = m.to || m.cam, seen = m.cam || {};
    return {
      mode: m.mode, id: m.id, s: seen.s, x: seen.x, y: seen.y, w: m.w, h: m.h, least: cam ? whole(sc.L, m.w, m.h).s : null,
      want: m.want, shown: sc.shown, frames: sc.frames, pins: sc.pins.slice(),
    };
  }

  // What a page left behind, as `view` gave it: anything else starts whole.
  function restored(kept, lanes) {
    var m = { mode: "whole", id: null, cam: null, to: null, want: UP_CLOSE, z: null, w: 0, h: 0, vx: 0, vy: 0 };
    if (!kept || ![kept.s, kept.x, kept.y].every(Number.isFinite)) return m;
    if (kept.mode === "follow" && lanes.some(function (one) { return one.id === kept.id; })) {
      return assign(m, { mode: "follow", id: kept.id, want: Number.isFinite(kept.want) ? kept.want : UP_CLOSE });
    }
    return kept.mode === "free" ? assign(m, { mode: "free", cam: { s: kept.s, x: kept.x, y: kept.y } }) : m;
  }

  // ---- The fingers

  // How far a finger strays and is still a tap, how near a number it has to land, and how soon a second tap is a double one.
  var STRAY = 8, REACH = 14, DOUBLE_MS = 320;

  function listen(sc) {
    var cv = sc.canvas, fingers = new Map(), pair = null, moved = 0, trail = null, tap = null;
    function zoomed() { return sc.map.mode !== "whole"; }
    function fullScreen() { return !!cv.closest("dialog"); }
    function spotOf(event) {
      var r = cv.getBoundingClientRect();
      // The finger's own time: how late a busy page hears of it says nothing about how fast it went.
      return { x: event.clientX - r.left, y: event.clientY - r.top, t: event.timeStamp };
    }
    function two() {
      if (fingers.size !== 2) return null;
      var p = Array.from(fingers.values());
      return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, apart: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1 };
    }
    function drop(event) {
      if (!fingers.delete(event.pointerId)) return false;
      pair = two();
      trail = null;
      cv.classList.toggle("held", fingers.size > 0);
      return true;
    }
    cv.addEventListener("pointerdown", function (event) {
      if (event.button || !sc.map.cam) return;
      // The first of a new touch: whatever the browser never said had left is gone.
      if (event.isPrimary) fingers.clear();
      sc.map.vx = sc.map.vy = 0;
      fingers.set(event.pointerId, spotOf(event));
      moved = fingers.size > 1 ? Infinity : 0;
      pair = two();
      trail = null;
      cv.classList.add("held");
      try { cv.setPointerCapture(event.pointerId); } catch (e) { /* A finger already gone: its moves end at the canvas's edge. */ }
    });
    cv.addEventListener("pointermove", function (event) {
      var was = fingers.get(event.pointerId);
      if (!was) return;
      var at = spotOf(event);
      fingers.set(event.pointerId, at);
      if (fingers.size === 2) {
        var now = two();
        pan(sc, now.x - pair.x, now.y - pair.y);
        zoomTo(sc, now.apart / pair.apart, now.x, now.y, false);
        pair = now;
      } else if (fingers.size === 1) {
        moved += Math.hypot(at.x - was.x, at.y - was.y);
        if (moved <= STRAY || !zoomed()) return;
        var dx = at.x - was.x, dy = at.y - was.y, dt = Math.max(1, at.t - was.t);
        trail = { x: 0.7 * dx / dt + 0.3 * (trail ? trail.x : 0), y: 0.7 * dy / dt + 0.3 * (trail ? trail.y : 0), t: at.t };
        letGo(sc);
        pan(sc, dx, dy);
      } else return;
      tell(sc);
      repaint(sc);
    });
    cv.addEventListener("pointerup", function (event) {
      var last = trail;
      if (!drop(event) || fingers.size) return;
      if (moved <= STRAY) return touch(spotOf(event));
      if (last && !still && event.timeStamp - last.t < 60 && Math.hypot(last.x, last.y) > 0.15) {
        sc.map.vx = last.x;
        sc.map.vy = last.y;
        sc.map.glided = 0;
        repaint(sc);
      }
      settle(sc);
    });
    ["pointercancel", "lostpointercapture"].forEach(function (name) {
      cv.addEventListener(name, function (event) {
        if (drop(event) && !fingers.size) settle(sc);
      });
    });
    function touch(at) {
      var best = null, near = REACH;
      sc.pins.forEach(function (p) {
        var far = Math.hypot(Math.max(0, Math.abs(p.x - at.x) - p.w / 2), Math.max(0, Math.abs(p.y - at.y) - p.h / 2));
        if (far < near) { near = far; best = p; }
      });
      if (best) {
        tap = null;
        follow(sc.key, best.id);
      } else if (tap && at.t - tap.t < DOUBLE_MS && Math.hypot(at.x - tap.x, at.y - tap.y) < 40) {
        tap = null;
        zoomTo(sc, 2, at.x, at.y, true);
        tell(sc);
        repaint(sc);
      } else tap = at;
    }
    // A page behind a full screen has nothing to scroll; on the card only a pinch, which a trackpad says with ctrl, is ours.
    cv.addEventListener("wheel", function (event) {
      if (!sc.map.cam || !(event.ctrlKey || event.metaKey || fullScreen())) return;
      event.preventDefault();
      var at = spotOf(event), lines = event.deltaMode === 1 ? 16 : 1;
      zoomTo(sc, Math.exp(-clamp(event.deltaY * lines, -200, 200) * (event.ctrlKey ? 0.006 : 0.002)), at.x, at.y, false);
      settle(sc);
      tell(sc);
      repaint(sc);
    }, { passive: false });
    // Safari's own: on an iPhone it zooms the page from these, whatever touch-action says, and on a Mac they are all a
    // trackpad's pinch is.
    var grown = 1;
    ["gesturestart", "gesturechange"].forEach(function (name) {
      cv.addEventListener(name, function (event) {
        event.preventDefault();
        if (name === "gesturechange" && !fingers.size && sc.map.cam) {
          var at = spotOf(event);
          zoomTo(sc, event.scale / grown, at.x, at.y, false);
          settle(sc);
          tell(sc);
          repaint(sc);
        }
        grown = event.scale || 1;
      });
    });
    cv.addEventListener("touchmove", function (event) {
      if (event.cancelable && (event.touches.length > 1 || zoomed() || fullScreen())) event.preventDefault();
    }, { passive: false });
  }

  // The observer's last word can be stale where the browser renders no frames (a headless one, a page coming back from
  // the background): a canvas it calls out of sight is measured once more before being skipped.
  function visible(cv) {
    if (!cv.isConnected) return false;
    if (inSight.get(cv) !== false) return true;
    var r = cv.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < (window.innerHeight || 0) && r.right > 0 && r.left < (window.innerWidth || 0);
  }

  // With less motion a scene is drawn once per answer, size and style; the loop then only looks, twice a second.
  function stillKey(sc) {
    return [styleId, sc.canvas.clientWidth, sc.canvas.clientHeight].concat(sc.lanes.map(function (one) {
      return one.state.p.key + one.state.p.anim + (one.place ? one.place.text : "");
    })).join();
  }

  // A frame that fails leaves the one before on the canvas: it never stops the next.
  function loop() {
    timer = null;
    if (document.hidden || level >= LEVELS) return;
    try {
      step();
    } finally {
      start();
    }
  }

  // A browser that renders no frames would leave a scene waiting for its own for ever.
  var LATE_MS = 250;

  function step() {
    var began = performance.now(), deadline = began + BAKE_MS, now = Date.now(), stride = keeps(level).stride, drew = 0;
    var budget = { left: function () { return deadline - performance.now(); } };
    var tick = Math.floor(now * FPS / 1000), seen = [];
    scenes.forEach(function (sc) {
      // A gesture has drawn this very tick, or is about to.
      if (!visible(sc.canvas) || (sc.due && now - sc.asked < LATE_MS) || (!still && sc.tick === tick)) return;
      if (still) {
        retime(sc, now);
        var key = stillKey(sc);
        if (sc.still === key && sc.whole) return;
        sc.still = key;
      }
      seen.push(sc);
      standAll(sc, now);
    });
    // Whoever has never been drawn comes before anybody's next frame.
    seen.forEach(function (sc) { introduce(sc, budget); });
    seen.forEach(function (sc) {
      if (!drawTrack(sc, now, budget, stride, tick, false)) return;
      drew++;
      if (sc.busy) repaint(sc);
    });
    if (drew && !still) account(performance.now() - began);
  }

  function introduce(sc, budget) {
    sc.lanes.forEach(function (one) {
      if (one.on === false) return;
      one.team.forEach(function (who, i) {
        if (!one.last[i]) one.last[i] = athlete(one.at.anim, ANIMS[one.at.anim].still, who, one.tc, budget);
      });
    });
  }

  function standAll(sc, now) {
    retime(sc, now);
    sc.lanes.forEach(function (one) { one.at = spot(one.state, sc.L, now); });
  }

  // An interval ends on the clock, not on an answer: each frame asks the lanes that know where they are.
  function retime(sc, now) {
    sc.lanes.forEach(function (one) {
      if (!one.src.at) return;
      var next = place(one.src, sc.L, now);
      if (next.key !== one.state.p.key || next.anim !== one.state.p.anim) one.state = advance(one.state, next, now, sc.L);
    });
  }

  // A gesture's own frame, at the browser's next one instead of the twelve a second. It neither counts as slow nor bakes for
  // long, and the loop leaves the scene to it. It asks for another only while something moves.
  var QUICK_BAKE_MS = 3;

  function repaint(sc) {
    if (sc.due || document.hidden || level >= LEVELS || !visible(sc.canvas)) return;
    sc.asked = Date.now();
    sc.due = requestAnimationFrame(function () {
      sc.due = 0;
      if (document.hidden || level >= LEVELS || !visible(sc.canvas) || !scenes.has(sc.key)) return;
      var began = performance.now(), now = Date.now(), gliding = glide(sc, now);
      standAll(sc, now);
      var budget = { left: function () { return QUICK_BAKE_MS - (performance.now() - began); } };
      introduce(sc, budget);
      if (!drawTrack(sc, now, budget, keeps(level).stride, Math.floor(now * FPS / 1000), true)) return;
      gestures++;
      costs.push(performance.now() - began);
      if (costs.length > 600) costs.shift();
      if (sc.busy || gliding) repaint(sc);
    });
  }

  // The track going on after the finger left it, ever slower.
  var GLIDE_MS = 220;
  var costs = [];

  function glide(sc, now) {
    var m = sc.map, speed = Math.hypot(m.vx, m.vy);
    if (!speed || m.mode !== "free" || !m.cam) return false;
    var ms = m.glided ? Math.min(40, now - m.glided) : 16, was = m.cam;
    m.glided = now;
    m.vx *= Math.exp(-ms / GLIDE_MS);
    m.vy *= Math.exp(-ms / GLIDE_MS);
    pan(sc, m.vx * ms, m.vy * ms);
    if (speed < 0.02 || (ms && Math.abs(was.x - m.cam.x) + Math.abs(was.y - m.cam.y) < 1e-6)) m.vx = m.vy = 0;
    return !!(m.vx || m.vy);
  }

  function account(took) {
    frames++;
    spent.push(took);
    samples.push(took);
    if (samples.length > 240) samples.shift();
    if (spent.length < WINDOW) return;
    var next = degrade(level, mean(spent));
    spent = [];
    if (next === level) return;
    level = next;
    // live.js redraws the card without what no longer fits, and syncs again.
    if (onLevel) onLevel(keeps(level));
  }
  function mean(list) { return list.length ? list.reduce(function (a, b) { return a + b; }, 0) / list.length : 0; }

  function start() {
    if (timer !== null || document.hidden || level >= LEVELS || !scenes.size) return;
    var whole = true;
    scenes.forEach(function (sc) { if (!sc.whole) whole = false; });
    timer = setTimeout(loop, still ? (whole ? 500 : 60) : (1000 / FPS) * keeps(level).stride);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      clearTimeout(timer);
      timer = null;
    } else start();
  });

  function canvas(sc) {
    var cv = document.createElement("canvas");
    cv.className = "scene";
    if (watcher) watcher.observe(cv);
    sc.canvas = cv;
    if (window.ResizeObserver) {
      sc.sizes = new ResizeObserver(function () { repaint(sc); });
      sc.sizes.observe(cv);
    }
    listen(sc);
  }
  function drop(sc) {
    if (watcher) watcher.unobserve(sc.canvas);
    if (sc.sizes) sc.sizes.disconnect();
    if (sc.due) cancelAnimationFrame(sc.due);
    inSight.delete(sc.canvas);
    if (sc.canvas.parentNode) sc.canvas.parentNode.removeChild(sc.canvas);
  }

  // Called by live.js after every redraw with the heats now running. Each scene keeps its canvas, its state and the visitor's
  // view of it; a lane whose phase changed runs to its new station. A heat with no `track` to be in, as in «Tiempos», is kept
  // and not drawn; one that is no longer on the list is forgotten.
  function sync(heats, options) {
    var chosen = options && STYLES[options.style] ? options.style : "det", now = Date.now(), keep = new Set();
    if (options && options.onLevel) onLevel = options.onLevel;
    if (options && options.onView) onView = options.onView;
    if (chosen !== styleId) {
      styleId = chosen;
      scenes.forEach(function (sc) { sc.lanes.forEach(function (one) { one.last = []; }); });
    }
    (level < LEVELS ? heats || [] : []).forEach(function (h) {
      keep.add(h.key);
      var sc = scenes.get(h.key), known = new Map();
      if (!sc) {
        sc = { key: h.key, lanes: [], pins: [], whole: true, shown: 0, frames: 0, seen: now, due: 0, told: "wholenull" };
        sc.map = restored(h.view, h.lanes);
        canvas(sc);
        scenes.set(h.key, sc);
      }
      sc.lanes.forEach(function (one) { known.set(one.id, one); });
      sc.L = layout(h.heat, h.lanes.length);
      sc.still = null;
      sc.lanes = h.lanes.map(function (lane) {
        var old = known.get(lane.id), state = advance(old ? old.state : null, place(lane, sc.L, now), now, sc.L);
        var held = lane.place || null, before = old && old.place;
        return {
          id: lane.id, lane: lane.lane, name: lane.name, src: lane, state: state, at: spot(state, sc.L, now), last: old ? old.last : [],
          place: held, popped: !before || !held ? 0 : before.n === held.n ? old.popped : now,
          team: teamOf(h.heat, lane.id).map(function (who, i) { return assign({ n: i % 4 }, who); }),
          tc: LANE_COLOURS.indexOf(colourOf(lane.lane)), on: old ? old.on : undefined,
        };
      });
      if (sc.map.mode === "follow" && !sc.lanes.some(function (one) { return one.id === sc.map.id; })) home(h.key);
      if (!h.track) {
        if (sc.canvas.parentNode) sc.canvas.parentNode.removeChild(sc.canvas);
      } else if (sc.canvas.parentNode !== h.track) h.track.appendChild(sc.canvas);
      tell(sc);
    });
    scenes.forEach(function (sc, key) {
      if (keep.has(key)) return;
      drop(sc);
      scenes.delete(key);
    });
    start();
  }

  function stats() {
    return {
      frames: frames, gestures: gestures, costs: costs.slice(), averageMs: mean(samples), samples: samples.slice(), level: level,
      bytes: cache.bytes, cached: cache.map.size, still: still,
    };
  }

  // Where each team of a heat stands now, as the track draws it.
  function standing(key) {
    var sc = scenes.get(key);
    if (!sc) return [];
    var now = Date.now();
    standAll(sc, now);
    return sc.lanes.map(function (one) {
      return { lane: one.lane, slot: one.state.p.slot, round: one.state.p.round, anim: one.at.anim, moving: one.at.moving, back: !!one.at.back };
    });
  }

  window.CatchUpAvatars = {
    sync: sync,
    view: view,
    standing: standing,
    zoom: zoomBy,
    home: home,
    follow: follow,
    stats: stats,
    STYLES: STYLE_IDS.slice(),
    MOVES: MOVES.map(function (row) { return { name: row[0], anim: row[1], approx: !!row[2] }; }),
    ANIMS: Object.keys(ANIMS),
    register: register,
    movementOf: movementOf,
    teamOf: teamOf,
    colourOf: colourOf,
    layout: layout,
    laneX: laneX,
    place: place,
    runShare: runShare,
    advance: advance,
    spot: spot,
    formation: formation,
    sight: sight,
    whole: whole,
    fence: fence,
    zoomAt: zoomAt,
    cuts: cuts,
    pinned: pinned,
    project: project,
    tags: tags,
    edges: edges,
    keeps: keeps,
    trackStride: trackStride,
    need: need,
    degrade: degrade,
    Lru: Lru,
    verify: verify,
    CLOSEST: CLOSEST,
    BUDGET_MS: BUDGET_MS,
    MEMORY: MEMORY,
  };
})();
