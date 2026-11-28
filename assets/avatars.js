// The running heat on the Live tab, drawn as one track with every lane, which the visitor moves like a map. live.js loads
// this only once a heat is running in the «Visual» view, and calls CatchUpAvatars.sync after every redraw. The scene is
// decoration (aria-hidden): the rows' text, bar and times stay the source of truth, so anything that goes wrong here only
// leaves the rows alone. Decisions: agents/docs/DECISIONS.md, 2026-11-21 «voxel athletes» and 2026-11-22 «one track».
(function () {
  "use strict";

  // ---- Movements: what a phase's text names, and which animation draws it

  // Every name of CatchUp Live's movement catalogue, with the animation that draws it. `approx` marks a stand-in that is
  // not the movement itself: none today, as every movement has its own; a phase nobody knows gets the neutral lifter.
  var MOVES = [
    ["Back Squats", "backsquat", 0], ["Front Squats", "frontsquat", 0], ["Overhead Squats", "ohs", 0],
    ["Deadlifts", "deadlift", 0], ["Sumo Deadlifts", "sumo", 0], ["Romanian Deadlifts", "rdl", 0],
    ["Cleans", "clean", 0], ["Power Cleans", "powerclean", 0], ["Squat Cleans", "clean", 0],
    ["Hang Power Cleans", "hangclean", 0], ["Clean and Jerks", "cleanjerk", 0], ["Snatches", "snatch", 0],
    ["Power Snatches", "powersnatch", 0], ["Squat Snatches", "snatch", 0], ["Hang Power Snatches", "hangsnatch", 0],
    ["Push Presses", "pushpress", 0], ["Push Jerks", "pushjerk", 0], ["Split Jerks", "splitjerk", 0],
    ["Strict Presses", "press", 0], ["Bench Presses", "bench", 0], ["Thrusters", "thruster", 0],
    ["Front Rack Lunges", "racklunge", 0], ["Overhead Lunges", "ohlunge", 0], ["Good Mornings", "goodmorning", 0],
    ["Bent Over Rows", "bbrow", 0],
    ["DB Snatches", "dbsnatch", 0], ["DB Cleans", "dbclean", 0], ["DB Clean and Jerks", "dbcleanjerk", 0],
    ["DB Thrusters", "dbthruster", 0], ["DB Push Presses", "dbpushpress", 0], ["DB Box Step-Overs", "dbstepover", 0],
    ["DB Rows", "dbrow", 0], ["Devil Presses", "devilpress", 0], ["Renegade Rows", "renegade", 0],
    ["Goblet Squats", "goblet", 0], ["Kettlebell Swings", "kbswing", 0], ["KB Snatches", "kbsnatch", 0],
    ["KB Cleans", "kbclean", 0], ["Turkish Get-Ups", "tgu", 0], ["Farmers Carry", "farmers", 0],
    ["Sandbag Cleans", "sandbag", 0],
    ["Pull-Ups", "pullup", 0], ["Chest-to-Bar Pull-Ups", "c2b", 0], ["Strict Pull-Ups", "strictpull", 0],
    ["Muscle-Ups", "ringmu", 0], ["Bar Muscle-Ups", "barmu", 0], ["Ring Muscle-Ups", "ringmu", 0],
    ["Toes-to-Bar", "t2b", 0], ["Knees-to-Elbows", "k2e", 0], ["Handstand Push-Ups", "hspu", 0],
    ["Handstand Walk", "hswalk", 0], ["Wall Walks", "wallwalk", 0], ["Push-Ups", "pushup", 0],
    ["Dips", "dip", 0], ["Ring Dips", "ringdip", 0], ["Burpees", "burpee", 0],
    ["Bar-Facing Burpees", "barfacing", 0], ["Burpees Over the Bar", "burpeebar", 0],
    ["Lateral Burpees Over the DB", "burpeedb", 0], ["Burpee Box Jump Overs", "bbjo", 0], ["Box Jumps", "boxjump", 0],
    ["Box Jump Overs", "bjo", 0], ["Box Step-Ups", "stepup", 0], ["Pistols", "pistol", 0],
    ["Air Squats", "squat", 0], ["Wall Balls", "wallball", 0], ["Sit-Ups", "situp", 0], ["GHD Sit-Ups", "ghd", 0],
    ["Rope Climbs", "rope", 0], ["Legless Rope Climbs", "legless", 0], ["Pegboard Ascents", "pegboard", 0],
    ["Double Unders", "du", 0], ["Single Unders", "su", 0], ["Walking Lunges", "walklunge", 0],
    ["Lunges", "lunge", 0],
    ["Row", "row", 0], ["BikeErg", "bike", 0], ["Bike", "bike", 0], ["Air Bike", "airbike", 0],
    ["Assault Bike", "airbike", 0], ["Echo Bike", "airbike", 0], ["Ski", "ski", 0], ["SkiErg", "ski", 0],
    ["Run", "run", 0], ["Swim", "swim", 0], ["Shuttle Runs", "shuttle", 0], ["Sled Push", "sledpush", 0],
    ["Sled Pull", "sledpull", 0],
    ["Plank", "plank", 0], ["Hollow Hold", "hollow", 0], ["Hip Thrusts", "hipthrust", 0],
    ["Back Extensions", "backext", 0], ["V-Ups", "vup", 0],
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

  // ---- How a team works a phase: CatchUp Live's phaseTeams, a list beside `phases`. Anything else, or nothing, is FREE

  var WORKS = { FREE: 1, ALL: 1, SYNCHRO: 1, TURNS: 1, SPLIT: 1 }, FREE_WORK = { work: "FREE", parts: [] };

  // SPLIT hands the parts out in order, `athletes` each; a part that holds draws the hold of its movement.
  function workOf(t) {
    var work = t && typeof t.work === "string" && Object.prototype.hasOwnProperty.call(WORKS, t.work) ? t.work : "FREE", parts = [];
    if (work !== "SPLIT") return work === "FREE" ? FREE_WORK : { work: work, parts: parts };
    (Array.isArray(t.parts) ? t.parts : []).forEach(function (part) {
      if (!part || typeof part !== "object") return;
      var anim = movementOf(String(part.name || "")).anim, n = Math.max(1, Math.min(MOST_ATHLETES, Math.floor(+part.athletes || 1)));
      for (var i = 0; i < n; i++) parts.push(part.holds === true ? holdOf(anim) : anim);
    });
    return parts.length ? { work: work, parts: parts } : FREE_WORK;
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
  // One athlete's lane is a little wider than a 2.2 m bar, so two lanes' bars never meet.
  function layout(heat, lanes) {
    var phases = (heat && heat.phases) || [], of = Math.floor(+(heat && heat.intervals) || 0);
    // An interval WOD lists its movements once per interval: one interval's are the stations, and nobody laps.
    var intervals = of > 1 && +(heat && heat.intervalSeconds) > 0;
    if (intervals && phases.length % of === 0) phases = phases.slice(0, phases.length / of);
    var size = teamOf(heat, 0).length, n = Math.max(1, phases.length), tight = lanes > 4;
    var lane = size === 1 ? 54 : size === 2 && !tight ? 66 : tight ? 60 : 80;
    var len = n <= 5 ? LEN : Math.max(size > 4 ? LEN : size > 2 ? 64 : 52, Math.round(LEN * 5 / n));
    var texts = phases.length ? phases : [heat && heat.wodName];
    var moves = texts.map(movementOf), format = (heat && heat.format) || "FOR_TIME";
    var teams = phases.length && Array.isArray(heat.phaseTeams) ? heat.phaseTeams : [];
    return {
      n: n, size: size, lanes: lanes, tight: tight, lane: lane, len: len, start: START, arch: START + n * len, wait: START - 30,
      done: START + n * len + 30, end: START + n * len + 62,
      // The live server counts an AMRAP's phases on and on, round after round, and any other WOD's that has no finish line.
      laps: format !== "FOR_TIME" && !intervals,
      names: moves.map(function (m, i) { return String(m.movement || texts[i] || "").toUpperCase(); }),
      anims: moves.map(function (m) { return m.anim; }),
      props: moves.map(function (m) { return ANIMS[m.anim].prop || ""; }),
      works: texts.map(function (_, i) { return workOf(teams[i]); }),
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
    if (hangs(anim)) return rigGrid(L, L.size);
    var f = ANIMS[anim].form, abreast = L.tight ? Math.min(2, f[0]) : f[0], spots = [];
    var pitch = L.tight ? Math.min(26, f[1]) : f[1], shift = L.size > 1 && !L.tight ? f[3] : 0;
    var rows = Math.ceil(L.size / abreast);
    for (var i = 0; i < L.size; i++) {
      var row = Math.floor(i / abreast), here = Math.min(abreast, L.size - row * abreast);
      spots.push([((i % abreast) - (here - 1) / 2) * pitch + shift, ((rows - 1) / 2 - row) * f[2]]);
    }
    return spots;
  }

  // Who does what at a station, in which frame and where: [across, along] around its middle as in formation(). Only a team at
  // work on its station works the way its phase says; running between stations or done, it is a team on its own.
  function crew(L, slot, at, tick, still) {
    var w = slot < L.n && !at.moving && at.anim === L.anims[slot] && L.size > 1 ? L.works[slot] : FREE_WORK;
    var mv = ANIMS[at.anim], people = [], i;
    function frame(m, k) { return still ? m.still : (tick + k * (m.N >> 2)) % m.N; }
    if (w.work === "TURNS") {
      // The one whose turn it is works in the middle; the rest wait at the side, each in a place of their own.
      var turn = still ? 0 : Math.floor(tick / mv.N) % L.size, aside = beside(L, L.size, L.tight ? 20 : 26, 16);
      for (i = 0; i < L.size; i++) {
        people.push(i === turn ? { anim: at.anim, f: frame(mv, 0), x: 0, z: 0 } : { anim: "rest", f: frame(ANIMS.rest, i), x: aside[i][0], z: aside[i][1] });
      }
      return { sync: false, ring: null, people: people };
    }
    if (w.work === "SPLIT") {
      // A bar or a bench is wider than a teammate's spacing: those stand in a file in the middle, the rest beside it. Whoever
      // hangs does it from the rig at the back of the station, where every lane's rig stands in the same line.
      var mine = [], hanging = [], file = [], side = [], deep = 16;
      for (i = 0; i < L.size; i++) {
        mine.push(w.parts[i] || "rest");
        (hangs(mine[i]) ? hanging : ANIMS[mine[i]].form[0] === 1 ? file : side).push(i);
      }
      side.forEach(function (k) { deep = Math.max(deep, Math.min(34, ANIMS[mine[k]].form[2])); });
      var places = [];
      file.forEach(function (k, n) { places[k] = [0, ((file.length - 1) / 2 - n) * COLUMN[2]]; });
      var by = file.length ? beside(L, side.length, L.tight ? 20 : 24, deep) : grid(side.length, 2, 28, deep);
      side.forEach(function (k, n) { places[k] = by[n]; });
      if (hanging.length) {
        var bars = rigGrid(L, hanging.length), rows = bars[0][1] - bars[bars.length - 1][1], others = file.concat(side);
        var back = others.length ? L.len / 2 - 8 - rows / 2 : 0, top = -Infinity;
        others.forEach(function (k) { top = Math.max(top, places[k][1]); });
        var down = Math.min(0, back - rows / 2 - 12 - top);
        others.forEach(function (k) { places[k] = [places[k][0], places[k][1] + down]; });
        hanging.forEach(function (k, n) { places[k] = [bars[n][0], bars[n][1] + back]; });
      }
      for (i = 0; i < L.size; i++) people.push({ anim: mine[i], f: frame(ANIMS[mine[i]], i), x: places[i][0], z: places[i][1] });
      return { sync: false, ring: null, people: people };
    }
    var spots = formation(at.anim, L), sync = w.work === "SYNCHRO";
    for (i = 0; i < L.size; i++) people.push({ anim: at.anim, f: frame(mv, sync ? 0 : i), x: spots[i][0], z: spots[i][1] });
    return { sync: sync, ring: sync ? ringOf(people, L) : null, people: people };
  }

  // `count` places in two files, one each side of the middle, `x` out.
  function beside(L, count, x, deep) {
    var rows = Math.ceil(count / 2), spots = [];
    for (var i = 0; i < count; i++) spots.push([(i % 2 ? 1 : -1) * x, ((rows - 1) / 2 - Math.floor(i / 2)) * deep]);
    return spots;
  }
  function grid(count, abreast, pitch, deep) {
    var rows = Math.ceil(count / abreast), spots = [];
    for (var i = 0; i < count; i++) {
      var row = Math.floor(i / abreast), here = Math.min(abreast, count - row * abreast);
      spots.push([((i % abreast) - (here - 1) / 2) * pitch, ((rows - 1) / 2 - row) * deep]);
    }
    return spots;
  }

  // The ring a synchronised team stands on, in floor voxels around its middle; never over the lane's lines.
  function ringOf(people, L) {
    var across = 0, along = 0;
    people.forEach(function (p) { across = Math.max(across, Math.abs(p.x) + 9); along = Math.max(along, Math.abs(p.z) + 12); });
    return { across: Math.min(across, L.lane / 2 - 4), along: Math.min(along, L.len / 2 - 3) };
  }

  // ---- The rig: one long bar across two neighbouring lanes with a post at each end, as competitions build it, about a
  // metre of bar per athlete. A team that does not fit abreast hangs from a second bar behind, like a double-sided rig.

  var RIG_PITCH = 22, RIG_GRIP = 11, RIG_ROW = 20;

  function hangs(anim) { return !!(ANIMS[anim] && ANIMS[anim].rig); }

  // `count` places [across, along] on the rig, as many abreast as keep the posts' feet inside the lane's lines.
  function rigGrid(L, count) {
    var most = Math.max(1, Math.floor((L.lane / 2 - RIG_HALF - 5) * 2 / RIG_PITCH) + 1);
    var rows = Math.ceil(count / most), abreast = Math.ceil(count / rows), spots = [];
    for (var i = 0; i < count; i++) {
      var row = Math.floor(i / abreast), here = Math.min(abreast, count - row * abreast);
      spots.push([((i % abreast) - (here - 1) / 2) * RIG_PITCH, ((rows - 1) / 2 - row) * RIG_ROW]);
    }
    return spots;
  }

  // A station's bars, one per pair of lanes (an odd last lane on its own) and row, wherever its lanes are: the floor's
  // equipment. `z` is along the station from its middle; `posts` and `cells` are across the whole track.
  function rigs(L, slot) {
    var memo = L.rigMemo || (L.rigMemo = {});
    if (memo[slot]) return memo[slot];
    var rows = {}, out = [];
    if (slot < L.n) {
      crew(L, slot, { anim: L.anims[slot], moving: false }, 0, true).people.forEach(function (p) {
        if (!hangs(p.anim)) return;
        var r = rows[p.z] || (rows[p.z] = [Infinity, -Infinity]);
        r[0] = Math.min(r[0], p.x);
        r[1] = Math.max(r[1], p.x);
      });
    }
    for (var a = 0; a < L.lanes; a += 2) {
      var b = Math.min(a + 1, L.lanes - 1);
      Object.keys(rows).forEach(function (z) {
        var posts = [laneX(L, a) + rows[z][0] - RIG_HALF, laneX(L, b) + rows[z][1] + RIG_HALF];
        out.push({ lanes: a === b ? [a] : [a, b], z: +z, posts: posts, cells: [posts[0] - 1, posts[1]] });
      });
    }
    return (memo[slot] = out);
  }

  // What of a bar nobody's hands cover, in pieces of 8 cells at most: a hanging athlete's sprite brings their own metre.
  function rigGaps(bar, hands) {
    var taken = {}, out = [], from = null;
    hands.forEach(function (x) { for (var c = x - RIG_GRIP; c < x + RIG_GRIP; c++) taken[c] = 1; });
    for (var c = bar.cells[0]; c <= bar.cells[1] + 1; c++) {
      var free = c <= bar.cells[1] && !taken[c];
      if (free && from === null) from = c;
      else if (from !== null && (!free || c - from === 8)) {
        out.push([from, c - 1]);
        from = free ? c : null;
      }
    }
    return out;
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
      var number = String(one.lane), name = String(one.name || "").toUpperCase(), mode = one.mode ? " · " + one.mode : "";
      var text = number + mode;
      if (most) {
        text = number + " " + name + mode;
        while (name.length > 1 && measure(text) + 10 > most) {
          name = name.slice(0, -1);
          text = number + " " + name.replace(/\s+$/, "") + "…" + mode;
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

  // `px` moves the whole body sideways (a lateral jump); `lp` and `ap` turn the knees and elbows where the default would
  // bend them the wrong way (lying on the back, a front rack).
  function skel(P, B) {
    var px = P.px || 0, cl = Math.cos(P.l), sl = Math.sin(P.l), sd = [0, cl, sl], pel = [px, P.py, P.pz], neck = add(pel, mul(sd, B.tor));
    var ap = P.ap || [0.5, -0.8, -0.55], lp = P.lp;
    var S = { pel: pel, neck: neck, sd: sd, nd: [0, -sl, cl], hip: [], sh: [], kn: [], an: [], el: [], wr: [], fd: [], H: [], T: [], miss: 0 };
    [1, -1].forEach(function (s, i) {
      var hip = [px + s * B.hw, P.py, P.pz], sh = [px + s * B.sw, neck[1] - B.sd * cl, neck[2] - B.sd * sl], f = P.f[i], h = P.h[i];
      // The knee goes to the front of the line from hip to foot, so it bends the right way lying, upside down or standing.
      var ft = [px + s * f[0], f[1], f[2]], dl = nrm(sub(ft, hip));
      var lg = ik(hip, ft, B.th, B.sh, lp ? [s * lp[0], lp[1], lp[2]] : [s * 0.3 * (1 - Math.abs(dl[0])), dl[2], -dl[1]]);
      var ar = ik(sh, [px + s * h[0], h[1], h[2]], B.ua, B.fa, [s * ap[0], ap[1], ap[2]]);
      var cp = Math.cos(f[3]), sp = Math.sin(f[3]), q = B.fs;
      var rot = function (a, b) { return [0, a * cp - b * sp, a * sp + b * cp]; };
      S.hip[i] = hip; S.sh[i] = sh; S.kn[i] = lg[0]; S.an[i] = lg[1]; S.el[i] = ar[0]; S.wr[i] = ar[1];
      S.fd[i] = nrm(sub(ar[1], ar[0]));
      S.H[i] = add(lg[1], rot(-1.2 * q, -1.4 * q));
      S.T[i] = add(lg[1], rot(-1.2 * q, 3.2 * q));
      S.miss = Math.max(S.miss, lg[2], ar[2]);
    });
    var ha = P.l * 0.55 + P.hp;
    S.ha = ha;
    S.hd = [0, Math.cos(ha), Math.sin(ha)];
    S.hc = add(neck, mul(S.hd, B.nk + B.hh + 0.5));
    return S;
  }

  // Keys: [frame, pelvis y, pelvis z, lean, head pitch, foot x, y, z, pitch, hand x, y, z], on the base skeleton at scale 1.
  function spline(K, N) {
    var at = curve(K, N);
    return function (t) {
      var v = at(t), f = [v[4], v[5], v[6], v[7]], hh = [v[8], v[9], v[10]];
      return { py: v[0], pz: v[1], l: v[2], hp: v[3], f: [f, f], h: [hh, hh] };
    };
  }

  // Any rows [frame, values...] through a loop of N frames: a cubic through every key.
  function curve(K, N) {
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
      return v;
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

  // ---- The movement library: poses written by their parts, and the equipment each movement draws

  // A pose: pelvis { py, pz, px }, lean l, head pitch hp, feet fa fb [x, y, z, pitch] (f for both), hands ha hb [x, y, z]
  // (h for both), elbow and knee poles ap lp, and the equipment's own values g. A key leaves out what stays as it was.
  var STAND = { py: 14.6, pz: 0, px: 0, l: 0.05, hp: 0, fa: [2.8, 2, 0, 0], fb: [2.8, 2, 0, 0], ha: [4.2, 12.5, 0.8], hb: [4.2, 12.5, 0.8], ap: [0.5, -0.8, -0.55], lp: [0, 0, 0], g: [] };
  function poseFrom(prev, o) {
    var p = assign({}, prev, o);
    if (o.f) { p.fa = o.f; p.fb = o.f; }
    if (o.h) { p.ha = o.h; p.hb = o.h; }
    ["fa", "fb", "ha", "hb"].forEach(function (k) { if (o[k]) p[k] = o[k]; });
    delete p.f;
    delete p.h;
    return p;
  }
  function moves(keys, N, start) {
    var prev = start || STAND, rows = keys.map(function (k) {
      prev = poseFrom(prev, typeof k[1] === "function" ? k[1](prev) : k[1]);
      return [k[0], prev.py, prev.pz, prev.l, prev.hp, prev.px].concat(prev.fa, prev.fb, prev.ha, prev.hb, prev.ap, prev.lp, prev.g);
    });
    var at = curve(rows, N);
    return function (t) {
      var v = at(t), lp = v.slice(22, 25);
      return {
        py: v[0], pz: v[1], l: v[2], hp: v[3], px: v[4], f: [v.slice(5, 9), v.slice(9, 13)], h: [v.slice(13, 16), v.slice(16, 19)],
        ap: v.slice(19, 22), lp: lp[0] || lp[1] || lp[2] ? lp : null, g: v.slice(25),
      };
    };
  }
  // The same keys with the two sides swapped, for the other arm's rep or the other leg's step.
  function swapped(p) { return assign({}, p, { fa: p.fb, fb: p.fa, ha: p.hb, hb: p.ha, px: -p.px, g: p.g.length ? [1 - p.g[0]].concat(p.g.slice(1)) : p.g }); }
  function pose(base, o) { return poseFrom(base, o || {}); }
  // Two reps, one per side: the keys of the first, then the same keys with the sides swapped, half a loop later.
  function bothSides(keys, half) {
    var prev = STAND, full = keys.map(function (k) { prev = poseFrom(prev, typeof k[1] === "function" ? k[1](prev) : k[1]); return [k[0], prev]; });
    return full.concat(full.map(function (k) { return [k[0] + half, swapped(k[1])]; }));
  }
  // A whole frame turned half round, for the rep done facing back the other way (over the box, over the bar). After
  // frame [turnAt] of each half the body turns on its own axis, eased, so the next half starts where the turn ends.
  function turnedAfter(fn, from, turnAt) {
    return function (t) {
      var p = fn(t), local = ((t % (2 * from)) + 2 * from) % (2 * from), u = local % from;
      p.flip = local >= from;
      if (turnAt !== undefined && u > turnAt) {
        var s = (u - turnAt) / (from - turnAt);
        p.yaw = Math.PI * s * s * (3 - 2 * s);
      }
      return p;
    };
  }

  // Equipment in the pose's own space (scaled with the body), drawn into the same voxels.
  function sphere(c, r, col) {
    var w = W3(c);
    for (var x = Math.floor(w[0] - r); x <= Math.ceil(w[0] + r); x++) for (var y = Math.floor(w[1] - r); y <= Math.ceil(w[1] + r); y++)
      for (var z = Math.floor(w[2] - r); z <= Math.ceil(w[2] + r); z++) {
        var dx = x + 0.5 - w[0], dy = y + 0.5 - w[1], dz = z + 0.5 - w[2];
        if (dx * dx + dy * dy + dz * dz <= r * r) put(x, y, z, col);
      }
  }
  function rod(A, B, r, col) { capsule(W3(A), W3(B), r, r, col); }
  // A box from one corner to the other, in base units scaled by k.
  function slab(k, x0, y0, z0, x1, y1, z1, col) {
    for (var x = Math.round(C + x0 * k); x < Math.round(C + x1 * k); x++) for (var y = Math.max(0, Math.round(y0 * k)); y < Math.round(y1 * k); y++)
      for (var z = Math.round(C + z0 * k); z < Math.round(C + z1 * k); z++) put(x, y, z, col);
  }
  function grip(S, j, gd) { return add(S.wr[j], mul(S.fd[j], 1.1 * gd.hr / 1.05)); }
  function dumbbell(c, k) {
    var w = W3(c).map(Math.round);
    cylinder(w, 1.6 * k, 0.8, 4);
    [-1, 1].forEach(function (s) { cylinder([w[0] + s * 2.4 * k, w[1], w[2]], 0.8 * k, 1.7 * k, 34); });
  }
  function kettlebell(S, j, gd) {
    // Hanging from the hand, or resting on the back of the forearm when the forearm points up (a rack, a lockout).
    var c = grip(S, j, gd), k = gd.k, up = S.fd[j][1] > 0.6, bell = add(c, up ? mul(nrm([0, 0.3, -1]), 2.4 * k) : mul(S.fd[j], 2.4 * k));
    sphere(bell, 2.1 * k, 34);
    rod(add(c, [-1.1 * k, 0, 0]), add(bell, [-1.1 * k, 0, 0]), 0.6, 34);
    rod(add(c, [1.1 * k, 0, 0]), add(bell, [1.1 * k, 0, 0]), 0.6, 34);
    rod(add(c, [-1.1 * k, 0, 0]), add(c, [1.1 * k, 0, 0]), 0.6, 34);
  }
  // A loaded bar in the pose's own space, for a bar held where the hands do not say (on the floor, on the hips).
  function plates(c, gd) {
    barAt(W3(c).map(Math.round), gd, 0);
  }
  // Which hand holds a one-arm load: the first value of g, 0 or 1, swapped with the sides.
  function side(P) { return P.g && P.g[0] > 0.5 ? 1 : 0; }
  // Which equipment a movement draws: each name is the hands' load or the station around the athlete.
  var GEAR = {
    db1: function (S, P, gd) { dumbbell(grip(S, side(P), gd), gd.k); },
    db2: function (S, P, gd) { dumbbell(grip(S, 0, gd), gd.k); dumbbell(grip(S, 1, gd), gd.k); },
    kb1: function (S, P, gd) { kettlebell(S, side(P), gd); },
    kb2h: function (S, P, gd) {
      var c = add(mul(add(grip(S, 0, gd), grip(S, 1, gd)), 0.5), [0, 0, 0]), d = nrm(add(S.fd[0], S.fd[1])), k = gd.k, bell = add(c, mul(d, 2.6 * k));
      sphere(bell, 2.2 * k, 34);
      rod(add(c, [-1.4 * k, 0, 0]), add(c, [1.4 * k, 0, 0]), 0.6, 34);
      [-1, 1].forEach(function (s) { rod(add(c, [s * 1.4 * k, 0, 0]), add(bell, [s * 0.9 * k, 0, 0]), 0.6, 34); });
    },
    goblet: function (S, P, gd) {
      var c = mul(add(grip(S, 0, gd), grip(S, 1, gd)), 0.5), k = gd.k;
      sphere(add(c, [0, -2.2 * k, 0.6 * k]), 2.1 * k, 34);
      rod(add(c, [-1.3 * k, 0, 0]), add(c, [1.3 * k, 0, 0]), 0.6, 34);
    },
    sandbag: function (S, P, gd) {
      var c = mul(add(grip(S, 0, gd), grip(S, 1, gd)), 0.5), k = gd.k;
      rod(add(c, [-3.2 * k, 0, 1 * k]), add(c, [3.2 * k, 0, 1 * k]), 2.4 * k, 19);
    },
    // A 14-inch medicine ball, light with a dark band round its middle so it reads on the dark floor.
    ball: function (S, P, gd) {
      var c = mul(P.g.slice(0, 3), gd.k), r = 3.4 * gd.k;
      sphere(c, r, 22);
      var w = W3(c);
      for (var x = Math.floor(w[0] - r); x <= Math.ceil(w[0] + r); x++) for (var z = Math.floor(w[2] - r); z <= Math.ceil(w[2] + r); z++) {
        var dx = x + 0.5 - w[0], dz = z + 0.5 - w[2], d = dx * dx + dz * dz;
        if (d <= r * r && d > (r - 1.2) * (r - 1.2)) put(x, Math.floor(w[1]), z, 5);
      }
    },
  };
  // Gear that names several pieces: a list of GEAR names and station drawings, each called in turn.
  function gearOf() {
    var parts = Array.prototype.slice.call(arguments);
    return function (S, P, gd) { parts.forEach(function (p) { (typeof p === "function" ? p : GEAR[p])(S, P, gd); }); };
  }

  // The animation registry. Adding one is a pose function, its frame count and its team spacing; the bone test covers
  // every entry on its own. `still` is the frame shown to visitors who ask for less motion; `form` the team's place on a
  // station (abreast, spacing across, spacing along, shift that leaves room for the painted name); `bar` draws a loaded
  // barbell in the hands, `rig` a pull-up station; `prop` is the equipment left there when nobody is using it.
  // A 2.2 m bar or a 1.1 m rig is wider than a teammate's spacing: a team on one stands in a file, one behind the other.
  var COLUMN = [1, 0, 13, 0];
  var ANIMS = {};
  function register(id, def) { ANIMS[id] = def; }
  register("run", { N: 16, pose: run, form: [2, 18, 18, 0], prop: "cones", still: 4 });
  register("snatch", { N: 40, pose: spline(SNATCH, 40), form: COLUMN, bar: 1, prop: "bar", still: 24 });
  register("burpee", { N: 36, pose: withArms(spline(BURPEE, 36), [0.9, -0.25, -0.6]), form: [4, 15, 34, 0], still: 29 });
  register("pullup", { N: 28, pose: spline(PULL, 28), form: COLUMN, rig: 1, prop: "rig", still: 14 });
  register("squat", { N: 24, pose: spline(SQUAT, 24), form: [2, 28, 18, -4], still: 12 });
  register("generic", { N: 24, pose: spline(GENERIC, 24), form: [2, 28, 18, -4], still: 12 });
  register("idle", { N: 16, pose: spline(IDLE, 16), form: [2, 24, 16, 0], still: 0 });

  // ---- The movement catalogue's own animations, one per movement, on the library above

  // Where a pose puts the shoulders, and a point fixed to the torso from there: up the spine and out of the chest.
  function shoulderOf(p) { return [p.py + 7.8 * Math.cos(p.l), p.pz + 7.8 * Math.sin(p.l)]; }
  function onBody(p, up, fwd, x) {
    var s = shoulderOf(p), c = Math.cos(p.l), n = Math.sin(p.l);
    return [x, s[0] + up * c - fwd * n, s[1] + up * n + fwd * c];
  }
  // A key whose hands ride on the torso (a front rack, a back rack): they follow wherever the key puts the body.
  function held(o, up, fwd, x, x2) {
    return function (prev) {
      var p = poseFrom(prev, o), out = assign({}, o);
      if (x2 === undefined) out.h = onBody(p, up, fwd, x);
      else { out.ha = onBody(p, up, fwd, x); out.hb = onBody(p, up, fwd, x2); }
      return out;
    };
  }
  // Hands straight above the shoulders at full reach, wherever the hips are.
  function overhead(o, x, reach, back) {
    return function (prev) {
      var p = poseFrom(prev, o), s = shoulderOf(p);
      return assign({}, o, { h: [x, s[0] + (reach || 9.8), s[1] - (back || 0.6)] });
    };
  }
  // Every key moved along the floor or up: a burpee done behind a bar, a landing on a box.
  function shifted(o, dz, dy) {
    return function (prev) {
      var p = typeof o === "function" ? poseFrom(prev, o(prev)) : poseFrom(STAND, o), m = function (v, n) { var r = v.slice(); r[2] += dz; if (n === 3) r[1] += dy || 0; return r; };
      return { py: p.py + (dy || 0), pz: p.pz + dz, px: p.px, l: p.l, hp: p.hp, fa: m(p.fa, 3), fb: m(p.fb, 3), ha: m(p.ha, 3), hb: m(p.hb, 3), ap: p.ap, lp: p.lp, g: p.g };
    };
  }
  var RACK_AP = [0.3, -0.3, 1], OUT_AP = [1, 0, -0.1], BACK_AP = [0.6, -1, -0.4], ROW_AP = [0.4, 0.5, -1];

  // Barbell. The bar is drawn in the hands, so every key says where the hands are.
  var FLOOR = { py: 9.5, pz: -4.5, l: 0.95, hp: 0, f: [2.7, 2, 0, 0], h: [5, 4.6, 2.6], ap: [0.5, -0.8, -0.55] };
  var LOCKOUT = { py: 14.6, pz: 0.2, l: -0.02, hp: 0, f: [2.7, 2, 0, 0], h: [5, 12.8, 1.6] };
  var KNEE = { py: 11, pz: -3.6, l: 0.75, h: [5, 8.6, 3.4] };
  var EXTEND = { py: 15.2, pz: -0.3, l: -0.12, f: [3, 3.2, 0, 0.5], h: [5, 13.6, 1.8] };
  var HANG = { py: 14.6, pz: 0, l: 0.05, f: [2.7, 2, 0, 0], h: [5, 12.6, 1.5], ap: [0.5, -0.8, -0.55] };
  var STAND_RACK = held({ py: 14.6, pz: 0, l: 0.05, f: [2.8, 2, 0, 0], ap: RACK_AP }, -0.3, 3.8, 5);
  function rackAt(o) { return held(assign({ ap: RACK_AP }, o), -0.3, 3.8, 5); }
  function backAt(o) { return held(assign({ ap: BACK_AP }, o), -0.2, -2.6, 6.5); }

  var DEADLIFT = moves([[0, FLOOR], [4, {}], [11, LOCKOUT], [15, {}], [23, FLOOR]], 28);
  var SUMO_FLOOR = { py: 8.5, pz: -2.5, l: 0.75, f: [5.6, 2, 0, 0], h: [3.2, 4.6, 2.6], lp: [1, 0.2, 0.5] };
  var SUMO = moves([[0, SUMO_FLOOR], [4, {}], [11, { py: 13.9, pz: 0.1, l: -0.02, h: [3.2, 12.6, 1.4] }], [15, {}], [23, SUMO_FLOOR]], 28);
  var RDL_TOP = assign({}, LOCKOUT, { py: 14.4 });
  var RDL = moves([[0, RDL_TOP], [3, {}], [11, { py: 13.6, pz: -4.8, l: 1.15, h: [5, 7.0, 2.6] }], [13, {}], [21, RDL_TOP]], 24);
  var GOOD_MORNING = moves([[0, backAt({ py: 14.6, pz: 0, l: 0.05, f: [3, 2, 0, 0] })], [3, backAt({})], [11, backAt({ py: 14, pz: -5, l: 1.3, hp: -0.3 })], [13, backAt({})], [21, backAt({ py: 14.6, pz: 0, l: 0.05, hp: 0 })]], 24);
  var ROW_HINGE = { py: 13, pz: -4, l: 1.15, hp: -0.25, f: [2.9, 2, 0, 0], h: [5, 6.6, 3.2], ap: [0.5, -0.8, -0.55] };
  var BENT_ROW = moves([[0, ROW_HINGE], [3, {}], [8, held({ ap: ROW_AP }, -4.6, 3.4, 5)], [10, {}], [16, { h: [5, 6.6, 3.2], ap: [0.5, -0.8, -0.55] }]], 20);

  var FRONT_SQUAT = moves([[0, STAND_RACK], [3, rackAt({})], [11, rackAt({ py: 6.8, pz: -2.8, l: 0.42, f: [3.4, 2, 0, 0] })], [13, rackAt({})], [21, rackAt({ py: 14.6, pz: 0, l: 0.05, f: [2.8, 2, 0, 0] })]], 24);
  var BACK_SQUAT = moves([[0, backAt({ py: 14.6, pz: 0, l: 0.05, f: [3.2, 2, 0, 0] })], [3, backAt({})], [11, backAt({ py: 7.6, pz: -3.6, l: 0.68, f: [3.4, 2, 0, 0] })], [13, backAt({})], [21, backAt({ py: 14.6, pz: 0, l: 0.05, f: [3.2, 2, 0, 0] })]], 24);
  var OHS_TOP = overhead({ py: 14.6, pz: 0, l: 0.03, f: [3.6, 2, 0, 0], ap: OUT_AP }, 6.6, 9.8, 0.6);
  var OHS = moves([[0, OHS_TOP], [3, overhead({}, 6.6, 9.8, 0.6)], [11, overhead({ py: 6.4, pz: -2.6, l: 0.34 }, 6.6, 9.7, 0.4)], [13, overhead({}, 6.6, 9.7, 0.4)], [21, OHS_TOP]], 24);

  var PRESS = moves([[0, STAND_RACK], [3, rackAt({})], [7, { h: [5, 27, 3.3], ap: [0.8, -0.3, 0.6] }], [10, { h: [5, 32.3, -0.3], ap: OUT_AP }], [13, {}], [17, { h: [5, 27, 3.3], ap: [0.8, -0.3, 0.6] }], [21, rackAt({})]], 24);
  var PUSH_PRESS = moves([[0, STAND_RACK], [3, rackAt({})], [7, rackAt({ py: 13.2, pz: -0.8, l: 0.08 })], [10, { py: 15.2, pz: 0, l: 0.02, f: [2.8, 2.8, 0, 0.5], h: [5, 27.5, 3.3], ap: [0.8, -0.3, 0.6] }], [13, { py: 14.6, f: [2.8, 2, 0, 0], h: [5, 32.3, -0.3], ap: OUT_AP }], [17, {}], [21, rackAt({ py: 14, pz: -0.3, l: 0.06 })], [24, rackAt({ py: 14.6, pz: 0, l: 0.05 })]], 28);
  var PUSH_JERK = moves([[0, STAND_RACK], [3, rackAt({})], [7, rackAt({ py: 13.2, pz: -0.8, l: 0.08 })], [10, { py: 15.2, pz: 0, l: 0.02, f: [2.8, 2.8, 0, 0.5], h: [5, 26, 3.3], ap: [0.8, -0.3, 0.6] }], [12, overhead({ py: 12.6, pz: -1.2, l: 0.1, f: [3.4, 2, 0, 0], ap: OUT_AP }, 5, 9.9, 0.4)], [15, {}], [19, overhead({ py: 14.6, pz: 0, l: 0.03, f: [2.8, 2, 0, 0] }, 5, 9.9, 0.4)], [22, {}], [27, rackAt({ py: 14, pz: -0.3, l: 0.06 })], [30, rackAt({ py: 14.6, pz: 0, l: 0.05 })]], 32);
  var SPLIT_CATCH = { py: 11.4, pz: -0.4, l: 0.04, fa: [2.6, 2, 6.4, 0], fb: [2.6, 3.1, -7.6, 1], h: [5, 29.2, -0.7], ap: OUT_AP };
  var SPLIT_JERK = moves([[0, STAND_RACK], [3, rackAt({})], [7, rackAt({ py: 13.2, pz: -0.8, l: 0.08 })], [10, { py: 15.2, pz: 0, l: 0.02, f: [2.8, 2.8, 0, 0.5], h: [5, 26, 3.3], ap: [0.8, -0.3, 0.6] }], [12, SPLIT_CATCH], [15, {}], [18, { py: 13.4, pz: 0, fa: [2.7, 2, 3.2, 0], h: [5, 31.2, -0.5] }], [21, { py: 14.6, fb: [2.7, 2, 0, 0], fa: [2.7, 2, 0, 0], h: [5, 32.3, -0.4] }], [23, {}], [28, rackAt({ py: 14, pz: -0.3, l: 0.06, f: [2.8, 2, 0, 0] })], [30, rackAt({ py: 14.6, pz: 0, l: 0.05 })]], 32);
  var THRUSTER = moves([[0, overhead({ py: 14.6, pz: 0, l: 0.03, f: [3.2, 2, 0, 0], ap: OUT_AP }, 5, 9.9, 0.4)], [3, {}], [7, rackAt({ py: 12.8, pz: -1.2, l: 0.16 })], [11, rackAt({ py: 6.9, pz: -2.8, l: 0.42, f: [3.4, 2, 0, 0] })], [13, rackAt({})], [17, { py: 14.6, pz: 0, l: 0.04, f: [3.2, 2.4, 0, 0.3], h: [5, 26.5, 3.3], ap: [0.8, -0.3, 0.6] }], [20, overhead({ f: [3.2, 2, 0, 0], ap: OUT_AP }, 5, 9.9, 0.4)], [24, {}]], 28);

  // The cleans: off the floor (or the hang), a jump, the elbows round, a catch low or high.
  function cleanKeys(catchPy, from, n) {
    var low = catchPy < 10, c = low ? { py: catchPy, pz: -2.8, l: 0.42, f: [3.4, 2, 0, 0] } : { py: catchPy, pz: -1.4, l: 0.18, f: [3.3, 2, 0, 0] };
    var start = from === "hang" ? [[0, HANG], [3, {}], [7, { py: 12.8, pz: -2.4, l: 0.5, h: [5, 10.2, 3] }], [9, EXTEND]] : [[0, FLOOR], [4, {}], [9, KNEE], [12, EXTEND]];
    var t = start[start.length - 1][0];
    return start.concat([
      [t + 2, { py: c.py + 3.5, pz: -1, l: 0.12, f: [3.3, 2.2, 0, 0], h: [5, 18.5, 4.2], ap: [0.6, 0.2, -0.2] }],
      [t + 4, rackAt(c)], [t + 8, rackAt({})], [t + (low ? 14 : 11), rackAt({ py: 14.6, pz: 0, l: 0.05, f: [2.8, 2, 0, 0] })], [t + (low ? 17 : 14), rackAt({})],
    ]).concat(n ? [] : [[t + (low ? 21 : 18), { h: [5, 12.6, 1.5], ap: [0.5, -0.8, -0.55] }]]);
  }
  function loopTo(keys, start, n) { return keys.concat([[n - 4, start]]); }
  var CLEAN = moves(loopTo(cleanKeys(6.8), FLOOR, 40), 40);
  var POWER_CLEAN = moves(loopTo(cleanKeys(12.2), FLOOR, 36), 36);
  var HANG_CLEAN = moves(loopTo(cleanKeys(12.4, "hang"), HANG, 30), 30);
  // Clean, stand, split jerk, recover, down: the whole lift in one loop.
  var CLEAN_JERK = moves(cleanKeys(6.8, null, true).concat([
    [37, rackAt({ py: 13.2, pz: -0.8, l: 0.08 })], [40, { py: 15.2, pz: 0, l: 0.02, f: [2.8, 2.8, 0, 0.5], h: [5, 26, 3.3], ap: [0.8, -0.3, 0.6] }],
    [42, SPLIT_CATCH], [45, {}], [48, { py: 13.4, pz: 0, fa: [2.7, 2, 3.2, 0], h: [5, 31.2, -0.5] }],
    [51, { py: 14.6, fb: [2.7, 2, 0, 0], fa: [2.7, 2, 0, 0], h: [5, 32.3, -0.4] }], [54, {}], [58, rackAt({ py: 14.2, pz: -0.2, l: 0.06 })],
    [61, { h: [5, 12.6, 1.5], ap: [0.5, -0.8, -0.55] }], [66, FLOOR],
  ]), 70);
  // The snatches, from the floor or the hang, caught high: the squat snatch is the original SNATCH above.
  var SNATCH_FLOOR = { py: 9, pz: -5, l: 1, f: [2.8, 2, 0, 0], h: [6.2, 5, 3.5], ap: [0.5, -0.8, -0.55] };
  var SNATCH_HANG = { py: 14.6, pz: 0, l: 0.05, f: [2.8, 2, 0, 0], h: [6.2, 13.4, 3.2], ap: [0.5, -0.8, -0.55] };
  function snatchHigh(from) {
    var start = from === "hang" ? [[0, SNATCH_HANG], [3, {}], [7, { py: 12.8, pz: -2.4, l: 0.5, h: [6.2, 10.6, 3.4] }], [9, { py: 15.2, pz: -0.5, l: -0.1, f: [3, 3.2, 0, 0.5], h: [6, 16, 3.6] }]]
      : [[0, SNATCH_FLOOR], [3, {}], [8, { py: 10.5, pz: -4, l: 0.8, h: [6.2, 8.5, 4.8] }], [11, { py: 15.2, pz: -0.5, l: -0.1, f: [3, 3.2, 0, 0.5], h: [6, 18, 3.8] }]];
    var t = start[start.length - 1][0];
    return start.concat([
      [t + 3, overhead({ py: 11.6, pz: -1.6, l: 0.16, f: [3.6, 2, 0, 0], ap: OUT_AP }, 6.2, 9.9, 0.5)], [t + 7, overhead({}, 6.2, 9.9, 0.5)],
      [t + 11, overhead({ py: 14.6, pz: -0.2, l: 0.03, f: [3.2, 2, 0, 0] }, 6.2, 9.9, 0.5)], [t + 14, overhead({}, 6.2, 9.9, 0.5)],
      [t + 18, from === "hang" ? SNATCH_HANG : { py: 14.4, pz: -0.3, l: 0.05, f: [2.8, 2, 0, 0], h: [6.2, 13.4, 3.4], ap: [0.5, -0.8, -0.55] }],
    ]).concat(from === "hang" ? [] : [[t + 22, { py: 10.5, pz: -4, l: 0.8, h: [6.2, 8.5, 4.8] }]]);
  }
  var POWER_SNATCH = moves(snatchHigh(), 37);
  var HANG_SNATCH = moves(snatchHigh("hang"), 31);

  // Lying on a bench: the torso flat, head back along -z, knees up and feet on the floor.
  var BENCH_TOP = { py: 10.4, pz: 2.4, l: -1.5708, hp: -0.71, f: [3.6, 2, 8, 0], lp: [0.3, 1, 0.3], h: [5.6, 20.6, -5.6], ap: [1, -0.4, 0] };
  var BENCH = moves([[0, BENCH_TOP], [3, {}], [10, { h: [5.6, 13.6, -4.4], ap: [1, -0.7, 0.2] }], [12, {}], [18, { h: [5.6, 20.6, -5.6], ap: [1, -0.4, 0] }]], 22);
  function bench(S, P, gd) {
    var k = gd.k;
    slab(k, -2.6, 6.2, -13, 2.6, 8.2, 4, 23);
    slab(k, -0.8, 0, -10, 0.8, 6.2, -8.4, 6);
    slab(k, -0.8, 0, 1, 0.8, 6.2, 2.6, 6);
    slab(k, -2.6, 0, -11, 2.6, 0.8, -7.4, 6);
    slab(k, -2.6, 0, 0, 2.6, 0.8, 3.6, 6);
  }
  // Shoulders on a bench behind, the bar on the hips going up and down.
  var THRUST_DOWN = { py: 5.2, pz: -0.6, l: -0.9, hp: -0.2, f: [3.2, 2, 7, 0], lp: [0.3, 1, 0.3], h: [6.2, 7.6, 0.4], ap: [0.6, -0.4, -0.6] };
  var HIP_THRUST = moves([[0, THRUST_DOWN], [3, {}], [9, { py: 10.6, pz: 1.4, l: -1.5, hp: -0.4, h: [6.2, 13.2, 2.2] }], [12, {}], [18, THRUST_DOWN]], 22);
  function thrustBench(S, P, gd) {
    var k = gd.k;
    slab(k, -6, 6, -10, 6, 8, -5.4, 23);
    slab(k, -5, 0, -9.6, -3.6, 6, -8, 6);
    slab(k, 3.6, 0, -9.6, 5, 6, -8, 6);
  }

  // Lunges on the spot: one foot forward, the back knee to the floor, back up; then the other leg.
  function lungeKeys(hands) {
    var down = { py: 8.6, pz: 3.2, l: 0.03, fa: [2.6, 2, 10.2, 0], fb: [2.6, 2.8, -1.8, 1.05] };
    var up = { py: 14.6, pz: 0, l: 0.04, fa: [2.7, 2, 0, 0], fb: [2.7, 2, 0, 0] };
    var wrap = hands || function (o) { return o; };
    return bothSides([[0, wrap(up)], [3, wrap({})], [7, wrap({ py: 13, pz: 2, fa: [2.6, 4.4, 7, 0.1] })], [10, wrap(down)], [12, wrap({})], [17, wrap(up)]], 20);
  }
  var RACK_LUNGE = moves(lungeKeys(function (o) { return rackAt(o); }), 40);
  var OH_LUNGE = moves(lungeKeys(function (o) { return overhead(assign({ ap: OUT_AP }, o), 5.8, 9.9, 0.4); }), 40);

  // Dumbbells and kettlebells. A one-arm lift is two reps, one per hand: g[0] says which hand holds the load.
  function oneOverhead(o, x, back) {
    return function (prev) {
      var p = poseFrom(prev, o), s = shoulderOf(p);
      return assign({}, o, { ha: [x, s[0] + 9.9, s[1] - (back || 0.4)] });
    };
  }
  function oneAt(o, up, fwd, x) {
    return function (prev) { return assign({}, o, { ha: onBody(poseFrom(prev, o), up, fwd, x) }); };
  }
  var DB_FLOOR = { py: 9.4, pz: -4, l: 0.9, hp: 0, f: [3.2, 2, 0, 0], ha: [1.4, 4.6, 3.2], hb: [4.6, 10.4, 3], ap: [0.5, -0.8, -0.55], g: [0] };
  var DB_SNATCH = moves(bothSides([
    [0, DB_FLOOR], [3, {}], [7, { py: 15.2, pz: -0.4, l: -0.1, f: [3.2, 3.2, 0, 0.5], ha: [2.2, 15.5, 3.6], hb: [5, 13, -1] }],
    [10, oneOverhead({ py: 13.4, pz: -0.8, l: 0.08, f: [3.2, 2, 0, 0], hb: [5, 11.5, 1], ap: OUT_AP }, 3.6)], [14, oneOverhead({ py: 14.6, pz: 0, l: 0.04 }, 3.6)],
    [17, oneOverhead({}, 3.6)], [21, oneAt({ ap: RACK_AP }, -0.8, 3, 4)], [25, assign({}, DB_FLOOR)], [27, {}],
  ], 28), 56);
  var DB_CLEAN = moves(bothSides([
    [0, DB_FLOOR], [3, {}], [7, { py: 15.2, pz: -0.4, l: -0.1, f: [3.2, 3.2, 0, 0.5], ha: [2.4, 14.5, 3.4], hb: [5, 13, -1] }],
    [10, oneAt({ py: 12.6, pz: -1, l: 0.12, f: [3.2, 2, 0, 0], hb: [5, 11.5, 1], ap: RACK_AP }, -0.8, 3, 4)], [14, oneAt({ py: 14.6, pz: 0, l: 0.04 }, -0.8, 3, 4)],
    [17, oneAt({}, -0.8, 3, 4)], [21, { ha: [4.4, 12.4, 1.4], ap: [0.5, -0.8, -0.55] }], [25, assign({}, DB_FLOOR)], [27, {}],
  ], 28), 56);
  var DB_CLEAN_JERK = moves(bothSides([
    [0, DB_FLOOR], [3, {}], [7, { py: 15.2, pz: -0.4, l: -0.1, f: [3.2, 3.2, 0, 0.5], ha: [2.4, 14.5, 3.4], hb: [5, 13, -1] }],
    [10, oneAt({ py: 12.6, pz: -1, l: 0.12, f: [3.2, 2, 0, 0], hb: [5, 11.5, 1], ap: RACK_AP }, -0.8, 3, 4)], [14, oneAt({ py: 14.6, pz: 0, l: 0.04 }, -0.8, 3, 4)],
    [17, oneAt({ py: 13.2, pz: -0.7, l: 0.08 }, -0.8, 3, 4)], [19, oneAt({ py: 15.2, pz: 0, f: [3.2, 2.8, 0, 0.5] }, 1.8, 3.6, 4)],
    [21, oneOverhead({ py: 12.8, pz: -1, l: 0.1, f: [3.4, 2, 0, 0], ap: OUT_AP }, 3.6)], [24, oneOverhead({ py: 14.6, pz: 0, l: 0.04 }, 3.6)], [27, oneOverhead({}, 3.6)],
    [31, oneAt({ ap: RACK_AP }, -0.8, 3, 4)], [35, assign({}, DB_FLOOR)], [37, {}],
  ], 38), 76);
  function dbRack(o) { return held(assign({ ap: RACK_AP }, o), -0.9, 2.6, 5.4); }
  var DB_THRUSTER = moves([[0, overhead({ py: 14.6, pz: 0, l: 0.03, f: [3.2, 2, 0, 0], ap: OUT_AP }, 5.6, 9.9, 0.3)], [3, {}], [7, dbRack({ py: 12.8, pz: -1.2, l: 0.16 })], [11, dbRack({ py: 6.9, pz: -2.8, l: 0.42, f: [3.4, 2, 0, 0] })], [13, dbRack({})], [17, { py: 14.6, pz: 0, l: 0.04, f: [3.2, 2.4, 0, 0.3], h: [5.6, 26.5, 2.6], ap: [0.8, -0.3, 0.6] }], [20, overhead({ f: [3.2, 2, 0, 0], ap: OUT_AP }, 5.6, 9.9, 0.3)], [24, {}]], 28);
  var DB_PUSH_PRESS = moves([[0, dbRack({ py: 14.6, pz: 0, l: 0.05, f: [2.8, 2, 0, 0] })], [3, dbRack({})], [7, dbRack({ py: 13.2, pz: -0.8, l: 0.08 })], [10, { py: 15.2, pz: 0, l: 0.02, f: [2.8, 2.8, 0, 0.5], h: [5.6, 27, 2.6], ap: [0.8, -0.3, 0.6] }], [13, overhead({ py: 14.6, f: [2.8, 2, 0, 0], ap: OUT_AP }, 5.6, 9.9, 0.3)], [17, {}], [21, dbRack({ py: 14, pz: -0.3, l: 0.06 })], [24, dbRack({ py: 14.6, pz: 0, l: 0.05 })]], 28);
  var DB_ROW_HINGE = { py: 12.8, pz: -3.8, l: 1.1, hp: -0.25, f: [3.2, 2, 0, 0], ha: [3.8, 5.4, 3], hb: [3.4, 10, 2.2], ap: [0.5, -0.8, -0.55], g: [0] };
  var DB_ROW = moves(bothSides([[0, DB_ROW_HINGE], [3, {}], [7, { ha: [4, 11.6, -1.6], ap: ROW_AP }], [9, {}], [13, { ha: [3.8, 5.4, 3], ap: [0.5, -0.8, -0.55] }], [15, {}]], 16), 32);
  var RENEGADE_PLANK = { py: 11, pz: -6, l: 1.33, hp: 0.3, f: [3.2, 2.6, -16, 1.3], h: [4.6, 3.4, 1.8], ap: [0.6, -0.5, -0.6] };
  var RENEGADE = moves(bothSides([[0, RENEGADE_PLANK], [2, {}], [6, { ha: [4.8, 9.2, -2], ap: ROW_AP }], [8, {}], [12, { ha: [4.6, 3.4, 1.8], ap: [0.6, -0.5, -0.6] }], [13, {}]], 14), 28);
  var DEVIL_PRESS = moves([
    [0, { py: 14.6, pz: 0, l: 0.05, hp: 0, f: [3.2, 2, 0, 0], h: [5.2, 12.2, 0.8], ap: [0.5, -0.8, -0.55] }], [3, {}],
    [6, { py: 10, pz: -4.2, l: 0.95, h: [4.6, 3.6, 2.5] }],
    [9, { py: 11, pz: -5.3, l: 1.33, hp: 0.3, f: [3.4, 2.6, -15.3, 1.3] }], [12, { py: 5.2, pz: -5.8, l: 1.47, ap: [0.6, 0.2, -1] }],
    [15, { py: 11, pz: -5.3, l: 1.33, ap: [0.5, -0.8, -0.55] }], [18, { py: 9.6, pz: -4.2, l: 0.95, hp: 0, f: [3.4, 2, 0, 0] }], [20, {}],
    [23, { py: 11, pz: -4.6, l: 1.1, h: [4, 7.5, -1.2] }], [26, { py: 15.2, pz: -0.4, l: -0.1, f: [3.2, 3, 0, 0.5], h: [4.8, 17, 5] }],
    [29, overhead({ py: 13.6, pz: -0.6, l: 0.06, f: [3.4, 2, 0, 0], ap: OUT_AP }, 5.4, 9.9, 0.3)], [32, overhead({ py: 14.6, pz: 0, l: 0.04 }, 5.4, 9.9, 0.3)], [35, overhead({}, 5.4, 9.9, 0.3)],
    [39, dbRack({ ap: RACK_AP })], [43, { h: [5.2, 12.2, 0.8], ap: [0.5, -0.8, -0.55] }],
  ], 48);
  function gobletAt(o) { return held(assign({ ap: [0.3, -1, 0.3] }, o), -3.4, 3.6, 1.6); }
  var GOBLET = moves([[0, gobletAt({ py: 14.6, pz: 0, l: 0.05, f: [3.6, 2, 0, 0] })], [3, gobletAt({})], [11, gobletAt({ py: 7, pz: -2.8, l: 0.42 })], [13, gobletAt({})], [21, gobletAt({ py: 14.6, pz: 0, l: 0.05 })]], 24);
  var SWING_BACK = { py: 12.6, pz: -4.6, l: 1.15, hp: -0.2, f: [3.6, 2, 0, 0], h: [1.1, 6.8, -3], ap: [0.5, -0.8, -0.55] };
  var KB_SWING = moves([[0, SWING_BACK], [4, { py: 14.6, pz: 0.3, l: -0.05, hp: 0, h: [1.1, 19, 9.8] }], [7, { h: [1.1, 32.4, 0.8], hp: 0.15 }], [8, {}], [11, { h: [1.1, 19, 9.8], hp: 0 }], [13, SWING_BACK]], 16);
  var KB_BACK = { py: 12.6, pz: -4.6, l: 1.15, hp: -0.2, f: [3.6, 2, 0, 0], ha: [1.6, 6.8, -3], hb: [5.6, 11, 0.5], ap: [0.5, -0.8, -0.55], g: [0] };
  var KB_SNATCH = moves(bothSides([[0, KB_BACK], [4, { py: 14.6, pz: 0.3, l: -0.05, hp: 0, ha: [2.6, 18, 7.5] }], [7, oneOverhead({ py: 14.4, pz: 0, l: 0.03, ap: OUT_AP }, 3.4)], [10, oneOverhead({}, 3.4)], [13, { ha: [2.6, 18, 7.5], ap: [0.5, -0.8, -0.55] }], [16, KB_BACK], [17, {}]], 18), 36);
  var KB_CLEAN = moves(bothSides([[0, KB_BACK], [4, { py: 14.6, pz: 0.3, l: -0.05, hp: 0, ha: [2.4, 14, 5] }], [7, oneAt({ py: 14.4, pz: 0, l: 0.03, ap: RACK_AP }, -1.4, 2.6, 2.6)], [10, oneAt({}, -1.4, 2.6, 2.6)], [13, { ha: [2.4, 14, 5], ap: [0.5, -0.8, -0.55] }], [16, KB_BACK], [17, {}]], 18), 36);
  // Lying with the bell straight up, then to the elbow, the hand, a bridge, a kneel and standing; and the same way back.
  var TGU_KEYS = [
    [0, oneOverhead({ py: 3.8, pz: 0, l: -1.5708, hp: -0.71, fa: [3, 2, 6, 0], fb: [3.4, 2, 12.2, -1.2], hb: [6.6, 1, -2.4], ap: [0.6, -0.6, 0.2], g: [0] }, 4.4, 0)],
    [6, oneOverhead({ py: 3.6, l: -0.95, hp: -0.4, hb: [6.4, 1, -4.6] }, 4.4, 0)],
    [11, oneOverhead({ py: 3.6, pz: 0.4, l: -0.35, hp: -0.1, hb: [6.4, 1, -6] }, 4.4, 0)],
    [16, oneOverhead({ py: 7.4, pz: 2, l: -1, hb: [6.4, 1, -5.6] }, 4.4, 0)],
    [22, oneOverhead({ py: 9.6, pz: -0.4, l: -0.15, hp: 0, fb: [2.6, 2.6, -7.2, 1.1], hb: [5.8, 8, -2.6] }, 4.4, 0.2)],
    [26, oneOverhead({ py: 9.8, pz: 0, l: 0.02, hb: [5.4, 11, 0.6] }, 4.4, 0.2)],
    [31, oneOverhead({ py: 14.6, pz: 0, fa: [2.8, 2, 0, 0], fb: [2.8, 2, 0, 0], hb: [5.2, 12.4, 0.6] }, 4.4, 0.2)],
  ];
  var TGU = moves(TGU_KEYS.concat(TGU_KEYS.slice(1, -1).reverse().map(function (k) { return [70 - k[0] - 4, k[1]]; })), 70);
  // Walking on the spot: a heel strike, the other foot through, a little bob; the hands say what is carried.
  function walk(hands) {
    return function (t) {
      var ph = ((t / 16) % 1 + 1) % 1, py = 14.3 + 0.3 * Math.cos(4 * Math.PI * ph);
      var f = [0, 1].map(function (i) {
        var u = (ph + i * 0.5) % 1;
        if (u < 0.55) { var s = u / 0.55; return [2.7, 2, 3.4 - 6.8 * s, s > 0.8 ? (s - 0.8) * 2 : 0]; }
        var w = (u - 0.55) / 0.45, e = w * w * (3 - 2 * w);
        return [2.7, 2 + 2.2 * Math.sin(Math.PI * w), -3.4 + 6.8 * e, 0.4 - 0.6 * w];
      });
      return { py: py, pz: 0, l: 0.06, hp: 0, f: f, h: hands(ph), ap: [0.6, -0.8, -0.3] };
    };
  }
  var FARMERS = walk(function (ph) { var s = 0.25 * Math.sin(2 * Math.PI * ph); return [[5.2, 12.4, 0.6 + s], [5.2, 12.4, 0.6 - s]]; });
  function bagAt(o) { return held(assign({ ap: [0.6, -1, 0.2] }, o), -3.8, 4.4, 2.6); }
  var SANDBAG = moves([
    [0, { py: 8, pz: -3.4, l: 0.75, hp: 0, f: [3.6, 2, 0, 0], h: [2.6, 2.6, 4.2], ap: [0.6, -0.8, -0.2] }], [3, {}],
    [8, { py: 8.6, pz: -4, l: 0.25, h: [2.6, 9.8, 3.8] }], [10, {}], [13, { py: 15.2, pz: -0.4, l: -0.1, f: [3.4, 3, 0, 0.5], h: [2.6, 16.5, 4.4] }],
    [16, bagAt({ py: 14.6, pz: 0, l: 0.04, f: [3.4, 2, 0, 0] })], [20, bagAt({})], [24, { py: 12, pz: -2, l: 0.4, h: [2.6, 10, 4.6], ap: [0.6, -0.8, -0.2] }],
    [28, { py: 8, pz: -3.4, l: 0.75, h: [2.6, 2.6, 4.2] }],
  ], 32);

  // Gymnastics on the bar, the rings, the floor and the wall.
  var BAR_HANDS = [5.6, 34, 0];
  var ARCH = { py: 15.6, pz: 0.6, l: -0.12, hp: 0.1, f: [2, 4.6, -4.4, 1], h: BAR_HANDS, ap: [0.5, -0.8, -0.55] };
  var HOLLOW = { py: 16.2, pz: -0.6, l: 0.1, hp: 0, f: [2, 4.4, 3.2, 0.3] };
  var STRICT_HANG = { py: 15.8, pz: 0, l: 0, hp: 0, f: [1.8, 3.4, 0.6, 0.7], h: BAR_HANDS, ap: [0.5, -0.8, -0.55] };
  var STRICT_PULL = moves([[0, STRICT_HANG], [4, {}], [14, { py: 26.4, pz: 0.4, l: -0.05, hp: 0.3, f: [1.8, 14, 1, 0.7] }], [18, {}], [28, STRICT_HANG]], 32);
  var C2B = moves([[0, ARCH], [4, HOLLOW], [8, { py: 27.6, pz: 0.8, l: -0.28, hp: 0.2, f: [2, 16.4, 4, 0.5] }], [11, {}], [15, { py: 17, pz: -0.4, l: 0.05, hp: 0, f: [2, 4.8, 3, 0.3] }], [20, ARCH]], 24);
  var T2B = moves([[0, ARCH], [4, HOLLOW], [9, { py: 19.2, pz: 4.4, l: -0.6, hp: 0.3, f: [2, 33, 2.4, -0.8] }], [12, {}], [16, HOLLOW], [20, ARCH]], 24);
  var K2E = moves([[0, ARCH], [4, HOLLOW], [9, { py: 19.2, pz: 4.4, l: -0.6, hp: 0.3, f: [2, 20.5, 10.5, 0] }], [12, {}], [16, HOLLOW], [20, ARCH]], 24);
  var SUPPORT_AP = [0.4, 0.3, -1];
  var BAR_MU = moves([[0, ARCH], [4, HOLLOW], [9, { py: 28, pz: -1.6, l: -0.55, hp: 0.2, f: [2, 22, 8, 0.3] }], [12, { py: 33, pz: 1.2, l: 0.9, hp: 0.2, f: [2, 22, -4, 1], ap: SUPPORT_AP }],
    [15, { py: 36, pz: 0.8, l: 0.25, hp: 0, f: [2, 23.6, -1.5, 0.8] }], [19, {}], [23, { py: 30, pz: 0, l: 0.3, f: [2, 19, -2, 0.8] }], [27, { py: 16.2, pz: -0.6, l: 0.1, f: [2, 4.4, 3.2, 0.3], ap: [0.5, -0.8, -0.55] }]], 32);
  var RING_HANG = { py: 15.8, pz: 0, l: 0.02, hp: 0, f: [1.8, 3.4, 0.6, 0.7], h: [5.4, 34, 0], ap: [0.5, -0.8, -0.55] };
  var RING_SUPPORT = { py: 35.6, pz: -0.6, l: 0.15, hp: 0, f: [1.8, 23.4, -1.4, 0.8], h: [5.4, 33.4, 0.4], ap: SUPPORT_AP };
  var RING_MU = moves([[0, RING_HANG], [3, {}], [8, { py: 25.5, pz: 0.4, l: -0.1, hp: 0.2, f: [1.8, 13, 1.2, 0.7], h: [4.8, 33.6, 1.4], ap: [0.6, -0.5, -0.4] }],
    [12, { py: 28, pz: -1, l: 0.5, f: [1.8, 16, -3, 1], h: [4.8, 33.4, 2.6], ap: SUPPORT_AP }], [16, { py: 27.4, pz: -1.2, l: 0.42 }], [20, RING_SUPPORT], [24, {}],
    [28, { py: 27.4, pz: -1.2, l: 0.42, f: [1.8, 16, -3, 1] }], [32, assign({}, RING_HANG, { py: 17 })]], 36);
  var RING_DIP = moves([[0, RING_SUPPORT], [3, {}], [10, { py: 28, pz: -1.6, l: 0.45, f: [1.8, 17, -5, 1] }], [12, {}], [20, RING_SUPPORT]], 24);
  var DIP_TOP = { py: 29.2, pz: -0.6, l: 0.12, hp: 0, f: [1.8, 20, -5, 1.1], h: [5.6, 27, 0.6], ap: SUPPORT_AP };
  var DIP = moves([[0, DIP_TOP], [3, {}], [10, { py: 21.8, pz: -1.6, l: 0.45, f: [1.8, 13, -8, 1.1] }], [12, {}], [20, DIP_TOP]], 24);
  function rings(S, P, gd) {
    var k = gd.k;
    [0, 1].forEach(function (j) {
      var c = add(grip(S, j, gd), [0, 1.8 * k, 0]), x = (j ? -1 : 1) * 5.8 * k, prev = null;
      for (var i = 0; i <= 12; i++) {
        var a = (i / 12) * 2 * Math.PI, p = add(c, [0, 2.2 * k * Math.cos(a), 2.2 * k * Math.sin(a)]);
        if (prev) rod(prev, p, 0.7, 21);
        prev = p;
      }
      rod(add(c, [0, 2.2 * k, 0]), [x, 54 * k, 0], 0.6, 5);
    });
  }
  function parallelBars(S, P, gd) {
    var k = gd.k, y = 26.2 * k;
    [-1, 1].forEach(function (s) {
      rod([s * 5.8 * k, y, -9 * k], [s * 5.8 * k, y, 9 * k], 1, 4);
      [-8, 8].forEach(function (z) { rod([s * 5.8 * k, 0, z * k], [s * 5.8 * k, y, z * k], 0.8, 1); });
    });
  }

  // Upside down: the lean is half a turn, the head pitched with it, and the athlete faces -z; the wall is behind.
  var HS_TOP = { py: 19, pz: 0.6, l: Math.PI, hp: 1.41, f: [2, 31.6, 3, -1.57], h: [4.9, 0.75, 1], ap: OUT_AP };
  var HSPU = moves([[0, HS_TOP], [3, {}], [10, { py: 15.2, f: [2, 27.8, 3, -1.57] }], [12, {}], [19, HS_TOP]], 24);
  // Turned half round for good: an athlete upside down faces -z, and the camera sees the front this way.
  function facing(fn) { return function (t) { var p = fn(t); p.flip = !p.flip; return p; }; }
  function wall(z0, z1) { return function (S, P, gd) { slab(gd.k, -9, 0, z0, 9, 44, z1, 23); }; }
  function handWalk(t) {
    var ph = ((t / 16) % 1 + 1) % 1, sway = 0.5 * Math.sin(2 * Math.PI * ph);
    var h = [0, 1].map(function (i) {
      var u = (ph + i * 0.5) % 1;
      if (u < 0.55) return [4.6, 0.75, -2.6 + 5.2 * (u / 0.55)];
      var w = (u - 0.55) / 0.45;
      return [4.6, 0.75 + 3 * Math.sin(Math.PI * w), 2.6 - 5.2 * w];
    });
    return { py: 18.8, pz: 0, px: sway, l: Math.PI - 0.08, hp: 1.41, f: [[2.2, 30.6, -3.2, -1.3], [2.2, 30.2, -1.4, -1.5]], h: h, ap: OUT_AP };
  }
  var WW = [
    [0, { py: 2.4, pz: 0, l: 1.5708, hp: 0.71, f: [2.6, 2.6, -12.6, 1.3], h: [5, 0.75, 8], ap: [0.6, 0.2, -1] }],
    [7, { py: 9.6, pz: -2, l: 1.33, hp: 0.45, f: [2.6, 2.6, -12, 1.3], h: [5, 0.75, 5.6], ap: OUT_AP }],
    [14, { py: 13.6, pz: -5, l: 1.9, hp: 0.9, f: [2.6, 14, -11.4, 0] }],
    [21, { py: 16.8, pz: -6.5, l: 2.4, hp: 1.2, f: [2.6, 24, -11.2, -0.6], h: [5, 0.75, -1.2] }],
    [28, { py: 19, pz: -9.6, l: Math.PI - 0.08, hp: 1.41, f: [2.4, 31.4, -10.6, -1.57], h: [5, 0.75, -9.2] }],
  ];
  var WALL_WALK = moves(WW.concat([[32, WW[4][1]]], WW.slice(1, 4).reverse().map(function (k) { return [64 - k[0] + 4, k[1]]; }), [[64, WW[0][1]]]).filter(function (k) { return k[0] < 68; }), 68);
  var PUSH_TOP = { py: 9.7, pz: -4, l: 1.4, hp: 0.43, f: [2.6, 2.6, -14.9, 1.3], h: [5, 0.75, 3.9], ap: [0.6, -0.4, -0.6] };
  var PUSH_UP = moves([[0, PUSH_TOP], [3, {}], [9, { py: 4.6, pz: -2.4, l: 1.52, ap: [0.6, 0.3, -1] }], [11, {}], [17, PUSH_TOP]], 20);

  // Climbing: three strokes up the rope (or the pegboard), then down hand under hand.
  function climb(legless, peg) {
    var keys = [], t = 0, b = 15, hx = peg ? 3.6 : 0.8, hz = peg ? 2.8 : 3, d = 3.6;
    function legs(py, bent) { return legless ? [1.2, py - 12.4, 2.6, 0.7] : bent ? [0.9, bent, 3.6, 0.4] : [0.9, py - 12.2, 3, 0.6]; }
    for (var s = 0; s < 6; s++) {
      var lo = s % 2 ? "hb" : "ha", hi = s % 2 ? "ha" : "hb", k0 = { py: b, pz: 0, l: 0.04, hp: 0.25, f: legs(b) }, k1 = { py: b + 0.8, f: legs(b + 0.8, b - 8.6) }, k2 = { py: b + d, f: legs(b + d) };
      k0[lo] = [hx, b + 14.6, hz]; k0[hi] = [hx, b + 18.2, hz];
      k1[lo] = [hx, b + 20, hz + 0.6];
      k2[lo] = [hx, b + d + 18.2, hz];
      keys.push([t, k0], [t + 3, k1], [t + 6, k2]);
      t += 7;
      b += d;
    }
    keys[0][1].lp = legless ? [0, 0, 0] : [0.3, 0.4, 1];
    keys.push([t + 3, {}], [t + 20, { py: 15, f: legs(15), ha: [hx, 29.6, hz], hb: [hx, 33.2, hz] }]);
    return { keys: keys, N: t + 24 };
  }
  var ROPE_C = climb(), LEGLESS_C = climb(true), PEG_C = climb(true, true);
  var ROPE_CLIMB = moves(ROPE_C.keys, ROPE_C.N), LEGLESS = moves(LEGLESS_C.keys, LEGLESS_C.N), PEGBOARD = moves(PEG_C.keys, PEG_C.N);
  function rope(S, P, gd) { var k = gd.k; rod([0, 0, 3 * k], [0, 78 * k, 3 * k], 0.9, 21); }
  function pegboard(S, P, gd) {
    var k = gd.k;
    slab(k, -6, 20, 4.2, 6, 78, 5.4, 21);
    for (var y = 24; y < 76; y += 6) [-3.6, 3.6].forEach(function (x) { slab(k, x - 0.5, y, 4, x + 0.5, y + 1, 4.3, 5); });
    [0, 1].forEach(function (j) { var c = grip(S, j, gd); rod(c, [c[0], c[1], 4.2 * k], 0.6, 19); });
  }

  // The burpee's own keys, as poses, for the variants that add a jump over something.
  function fromRows(rows, ap) {
    return rows.map(function (r) { return [r[0], { py: r[1], pz: r[2], l: r[3], hp: r[4], f: [r[5], r[6], r[7], r[8]], h: [r[9], r[10], r[11]], ap: ap }]; });
  }
  var BURPEE_DOWN = fromRows(BURPEE, [0.9, -0.25, -0.6]).filter(function (k) { return k[0] <= 25; });
  function burpeeThen(dz, jump) {
    return BURPEE_DOWN.map(function (k) { return [k[0], shifted(k[1], dz)]; }).concat(jump);
  }
  var CROUCH = { py: 11.5, l: 0.4, hp: 0, f: [2.8, 2, 0, 0], h: [4.6, 10, -3], ap: [0.5, -0.8, -0.55] };
  function broadJump(from, to, n0, up) {
    var dy = up || 0;
    return [
      [n0, shifted(CROUCH, from)], [n0 + 3, shifted({ py: 19.4, pz: 0, l: 0.1, f: [2.6, 6.6, 0.8, 0.6], h: [4.4, 23, 5] }, (from + to) / 2, dy / 2 + 2)],
      [n0 + 6, shifted({ py: 11.5, pz: -0.8, l: 0.35, f: [2.8, 2, 0, 0], h: [4.6, 11, 5] }, to, dy)], [n0 + 10, shifted(STAND, to, dy)],
    ];
  }
  var BAR_FACING = turnedAfter(moves(burpeeThen(-11, broadJump(-11, 11, 28)).concat([[42, shifted(STAND, 11)], [49, shifted(STAND, 11)]]), 50), 50, 43);
  // Over the bar sideways: the burpee beside it, a jump across, and the next rep on the other side.
  function lateral(px) { return function (o) { return function (prev) { var p = typeof o === "function" ? o(prev) : o; return assign({}, p, { px: px }); }; }; }
  function sideJump(n0) {
    return [
      [n0, { py: 11.5, pz: 0, px: -7.5, l: 0.3, f: [2.8, 2, 0, 0], h: [4.6, 11, -1], ap: [0.5, -0.8, -0.55] }], [n0 + 3, { py: 20, px: 0, l: 0.05, f: [2.6, 7.4, 0, 0.6], h: [4.4, 24, 2] }],
      [n0 + 6, { py: 11.5, px: 7.5, l: 0.3, f: [2.8, 2, 0, 0], h: [4.6, 11, 2] }], [n0 + 10, assign({}, STAND, { px: 7.5 })],
    ];
  }
  var OVER_LATERAL = bothSides(BURPEE_DOWN.map(function (k) { return [k[0], lateral(-7.5)(k[1])]; }).concat(sideJump(28), [[43, assign({}, STAND, { px: 7.5 })]]), 44);
  var BURPEE_OVER = moves(OVER_LATERAL, 88);
  function floorBarAlong(S, P, gd) { barAt(W3([0, gd.pl, 0]).map(Math.round), gd, 2); }
  function disc(c, r, col) {
    var w = W3(c);
    for (var x = Math.floor(w[0] - r); x <= Math.ceil(w[0] + r); x++) for (var y = Math.floor(w[1] - r); y <= Math.ceil(w[1] + r); y++) {
      var dx = x + 0.5 - w[0], dy = y + 0.5 - w[1];
      if (dx * dx + dy * dy <= r * r) { put(x, y, Math.floor(w[2]), col); put(x, y, Math.floor(w[2]) + 1, col); }
    }
  }
  function floorBarAcross(S, P, gd) { plates([0, gd.pl, 0], gd); }
  function floorDb(S, P, gd) {
    var k = gd.k;
    rod([0, 1.7 * k, -1.6 * k], [0, 1.7 * k, 1.6 * k], 0.8, 4);
    [-1, 1].forEach(function (s) { rod([0, 1.7 * k, s * 2 * k], [0, 1.7 * k, s * 3 * k], 1.7 * k, 34); });
  }
  // Onto a box and off the other side; the next rep faces back the other way.
  function plyoBox(h) { return function (S, P, gd) { slab(gd.k, -7, 0, -5, 7, h, 5, 21); slab(gd.k, -7, h - 0.6, -5, 7, h, 5, 4); }; }
  function boxOver(n0, from) {
    return [
      [n0, shifted(CROUCH, from)], [n0 + 3, shifted({ py: 22, l: 0.1, f: [2.6, 13.8, -2, 0.5], h: [4.4, 24, 5] }, from / 2)],
      [n0 + 6, shifted({ py: 20.4, pz: -0.8, l: 0.4, f: [2.8, 14, 0, 0], h: [4.6, 22.5, 5] }, 0)], [n0 + 9, shifted(STAND, 0, 12)],
      [n0 + 12, shifted({ py: 27.6, l: 0.05, f: [2.6, 16, 2, 0.5], h: [4.4, 26, 3] }, 4)],
      [n0 + 16, shifted({ py: 11.5, pz: -0.8, l: 0.35, f: [2.8, 2, 0, 0], h: [4.6, 11, 5] }, -from)], [n0 + 20, shifted(STAND, -from)],
    ];
  }
  var BBJO = turnedAfter(moves(burpeeThen(-15, boxOver(28, -15)).concat([[50, shifted(STAND, 15)], [57, shifted(STAND, 15)]]), 58), 58, 51);
  var BJO = turnedAfter(moves([[0, shifted(STAND, -10)], [3, shifted(STAND, -10)]].concat(boxOver(5, -10), [[33, shifted(STAND, 10)]]), 34), 34, 27);
  var BOX_JUMP = moves([[0, shifted(STAND, -9)], [3, shifted(STAND, -9)], [6, shifted(CROUCH, -9)], [9, shifted({ py: 22, l: 0.1, f: [2.6, 13.8, -2, 0.5], h: [4.4, 24, 5] }, -4.5)],
    [12, shifted({ py: 20.4, pz: -0.8, l: 0.4, f: [2.8, 14, 0, 0], h: [4.6, 22.5, 5] }, 0)], [16, shifted(STAND, 0, 12)], [20, shifted(STAND, 0, 12)],
    [24, shifted({ py: 21, fa: [2.8, 14, 0, 0], fb: [2.7, 9, -5, 0.4], h: [4.2, 19, 0.8] }, 0)], [27, shifted({ py: 15, pz: -6.5, fb: [2.7, 2, -9, 0], fa: [2.7, 14, -1, 0], h: [4.2, 13, -5.8] }, 0)], [31, shifted(STAND, -9)]], 36);
  function armsDown(o) { return held(o, -9.6, 0.9, 4.4); }
  var STEP_KEYS = [[0, shifted(STAND, -8)], [3, {}], [7, armsDown({ fa: [2.6, 12, -1.4, 0], py: 15.2, pz: -6.6, l: 0.25 })], [11, armsDown({ py: 24.4, pz: -1.2, l: 0.06, fb: [2.6, 12, -1, 0] })],
    [14, armsDown({})], [18, armsDown({ py: 14.6, pz: -6.4, l: 0.12, fb: [2.6, 2, -8, 0] })], [22, shifted(STAND, -8)], [23, {}]];
  var STEP_UP = moves(bothSides(STEP_KEYS, 24), 48);
  function dbSides(o) { return function (prev) { var p = typeof o === "function" ? o(prev) : o; return assign({}, p, { h: [5.2, (p.py || prev.py) - 2.2, (p.pz !== undefined ? p.pz : prev.pz) + 0.6], ap: [0.6, -0.8, -0.3] }); }; }
  var STEP_OVER = turnedAfter(moves([[0, dbSides(shifted(STAND, -9))], [3, dbSides({})], [7, dbSides({ fa: [2.6, 12, -1.6, 0], py: 15.2, pz: -7.4, l: 0.25 })],
    [11, dbSides({ py: 24.4, pz: -1, l: 0.06, fb: [2.6, 12, -1, 0] })], [14, dbSides({ fa: [2.6, 13, 3, 0.2] })], [18, dbSides({ py: 15.5, pz: 4, l: 0.08, fa: [2.6, 2, 8.6, 0] })],
    [22, dbSides(shifted(STAND, 9))], [33, dbSides({})]], 34), 34, 27);

  // Bodyweight on the floor: wall balls, pistols, lunges, sit-ups, the core holds and the jump rope.
  function ballAt(o, up, fwd) {
    return function (prev) {
      var p = poseFrom(prev, o), c = onBody(p, up, fwd, 0);
      return assign({}, o, { h: [3.6, c[1] - 0.8, c[2] - 0.2], g: [0, c[1], c[2] + 1.4], ap: [0.6, -0.8, 0.2] });
    };
  }
  var WALL_BALL = moves([
    [0, ballAt({ py: 7.6, pz: -3.2, l: 0.5, hp: 0.15, f: [3.6, 2, 0, 0] }, -3.4, 5.2)], [2, ballAt({}, -3.4, 5.2)],
    [7, { py: 15.2, pz: 0, l: 0, hp: 0.3, f: [3.4, 3, 0, 0.5], h: [3.6, 28, 4.4], g: [0, 29.4, 6.4], ap: [0.6, -0.4, 0.6] }],
    [9, { py: 14.6, f: [3.4, 2, 0, 0], h: [3.6, 31.4, 5], g: [0, 37.4, 8] }], [14, { h: [3.6, 27, 5.2], g: [0, 57, 9.6] }],
    [18, { g: [0, 40, 7.6] }], [20, { h: [3.6, 27, 5], g: [0, 28.4, 6.8] }],
    [23, ballAt({ py: 12.4, pz: -1.2, l: 0.2 }, -2, 5)], [28, ballAt({ py: 7.6, pz: -3.2, l: 0.5 }, -3.4, 5.2)],
  ], 32);
  function wallTarget(S, P, gd) {
    // The target ring on both faces of the board: the athlete sees one, the camera the other.
    var k = gd.k;
    slab(k, -6.4, 47, 12.6, 6.4, 67, 13.4, 3);
    [12, 14].forEach(function (z) {
      var c = [0, 57 * k, z * k];
      for (var i = 0; i < 24; i++) {
        var a = (i / 24) * 2 * Math.PI;
        rod(add(c, [5 * k * Math.cos(a), 5 * k * Math.sin(a), 0]), add(c, [5 * k * Math.cos(a + 0.27), 5 * k * Math.sin(a + 0.27), 0]), 0.6, 1);
      }
    });
    slab(k, -0.6, 0, 13.4, 0.6, 48, 14.6, 6);
  }
  var PISTOL = moves(bothSides([
    [0, { py: 14.4, pz: 0, l: 0.06, hp: 0, fb: [1.2, 2, 0, 0], fa: [2.4, 6.4, 9.6, -0.4], h: [4, 18, 9], ap: [0.5, -0.8, -0.3] }], [3, {}],
    [11, { py: 6.4, pz: -3.2, l: 0.52, fa: [2.4, 6.4, 9.6, -0.4], h: [4, 14, 9.5] }], [13, {}], [21, { py: 14.4, pz: 0, l: 0.06, h: [4, 18, 9] }], [23, {}],
  ], 24), 48);
  function hipsAt(o) { return held(assign({ ap: [1, -0.2, -0.6] }, o), -7, 1.4, 4.2); }
  var LUNGE = moves(lungeKeys(hipsAt), 40);
  var WALK_LUNGE = moves(bothSides([
    [0, hipsAt({ py: 8.6, pz: 0, l: 0.04, hp: 0, fa: [2.6, 2, 6.8, 0], fb: [2.6, 2.8, -6.2, 1.05] })], [2, hipsAt({})],
    [6, hipsAt({ py: 14.2, fa: [2.6, 2, 0, 0], fb: [2.6, 5.5, 0.5, 0.3] })], [10, hipsAt({ py: 12, fa: [2.6, 2, -3.4, 0.4], fb: [2.6, 3.2, 6.6, -0.1] })],
  ], 16), 32);
  // On the back, the knees out and the soles together; sit up and touch the feet.
  var SIT_DOWN = { py: 3.8, pz: 0, l: -1.5708, hp: -0.71, f: [1.2, 2, 7.6, -0.2], lp: [1, 0.5, 0], h: [4.4, 1.5, -16.2], ap: [0.6, 0.4, -0.2] };
  var SIT_UP = moves([[0, SIT_DOWN], [2, {}], [9, { l: 0.25, hp: 0.25, h: [2, 3, 8.6], ap: [0.6, -0.4, 0.3] }], [11, {}], [18, SIT_DOWN]], 20);
  function abmat(S, P, gd) { slab(gd.k, -4, 0, -6, 4, 1.4, -1, 23); }
  var GHD_DOWN = { py: 17.8, pz: 0, l: -2, hp: -0.9, f: [2.4, 13, 11, -0.3], lp: [0.3, 1, 0.3], h: [4.4, 10.4, -16], ap: [0.6, 0.4, -0.2] };
  var GHD = moves([[0, GHD_DOWN], [2, {}], [5, { l: -0.9, hp: -0.4, h: [4.4, 29, -12] }], [9, { l: 0.4, hp: 0.3, h: [3, 14.5, 11], ap: [0.5, -0.6, 0.2] }], [11, {}], [15, { l: -0.8, hp: -0.4, h: [4.4, 30, -12.4] }], [19, GHD_DOWN]], 22);
  function ghdMachine(S, P, gd) {
    var k = gd.k;
    slab(k, -3.4, 13.6, -3.4, 3.4, 16, 3.4, 23);
    slab(k, -1, 0, -1, 1, 13.6, 1, 6);
    rod([0, 1 * k, -10 * k], [0, 1 * k, 15 * k], 1.2, 6);
    rod([0, 1 * k, 12 * k], [0, 11 * k, 12 * k], 1, 6);
    rod([-3 * k, 12 * k, 12.6 * k], [3 * k, 12 * k, 12.6 * k], 1.4, 23);
    rod([-3 * k, 14.6 * k, 11 * k], [3 * k, 14.6 * k, 11 * k], 1.4, 23);
  }
  var BACK_EXT_DOWN = { py: 17.6, pz: 0, l: 2.6, hp: 1.1, f: [2.4, 14, -12, 1.4], h: [1.6, 15, 3], ap: [0.6, -0.4, 0.8] };
  var BACK_EXT = moves([[0, BACK_EXT_DOWN], [2, {}], [9, held({ l: 1.45, hp: 0.6, ap: [0.8, -1, 0.3] }, -2.6, 2.4, 1.6)], [11, held({}, -2.6, 2.4, 1.6)], [18, BACK_EXT_DOWN]], 20);
  function backExtMachine(S, P, gd) {
    var k = gd.k;
    slab(k, -3.4, 14, -1, 3.4, 16.4, 4.6, 23);
    slab(k, -1, 0, 0, 1, 14, 2, 6);
    rod([0, 1 * k, -14 * k], [0, 1 * k, 6 * k], 1.2, 6);
    rod([0, 1 * k, -12 * k], [0, 12 * k, -12 * k], 1, 6);
    rod([-3 * k, 13.2 * k, -12.4 * k], [3 * k, 13.2 * k, -12.4 * k], 1.4, 23);
  }
  var PLANK_P = { py: 6, pz: 0, l: 1.45, hp: 0.4, f: [2.6, 2.6, -12.5, 1.3], h: [2, 1, 12.6], ap: [0.3, -1, 0] };
  var PLANK = moves([[0, PLANK_P], [8, { py: 6.4 }], [16, PLANK_P]], 16);
  var HOLLOW_P = { py: 3.8, pz: 0, l: -1.32, hp: -0.5, f: [1.6, 7, 12, -0.3], h: [4, 8, -16.4], ap: [0.6, 0.4, -0.2] };
  var HOLLOW_HOLD = moves([[0, HOLLOW_P], [8, { l: -1.4, f: [1.6, 6, 12.2, -0.3], h: [4, 7, -16.6] }], [16, HOLLOW_P]], 16);
  var VUP_FLAT = { py: 3.8, pz: 0, l: -1.5708, hp: -0.71, f: [1.6, 3, 12.4, -0.6], h: [4, 3, -17.6], ap: [0.6, 0.4, -0.2] };
  var V_UP = moves([[0, VUP_FLAT], [2, {}], [8, { py: 3.8, l: -0.35, hp: -0.1, f: [1.6, 15.5, 7.5, -0.4], h: [2, 15, 6.6] }], [10, {}], [17, VUP_FLAT]], 20);
  // The jump rope turns once a hop, or twice in a higher hop: g[0] is where it is on its circle.
  function skip(N, turns, high) {
    return function (t) {
      var u = ((t / N) % 1 + 1) % 1, air = high ? 0.6 : 0.5, y = u < air ? (high ? 2.6 : 1.2) * Math.sin(Math.PI * u / air) : 0;
      var s = high ? (u < air ? 0.9 * u / air : 0.9 + 0.1 * (u - air) / (1 - air)) : u, a = 2 * Math.PI * turns * s + (high ? 0.4 : Math.PI / 2 - Math.PI * 0.5);
      return { py: 14.4 + y - (u < air ? 0 : 0.4), pz: 0, l: 0.05, hp: 0, f: [[2, 2 + y, 0.4, y > 0.3 ? 0.6 : 0], [2, 2 + y, 0.4, y > 0.3 ? 0.6 : 0]], h: [[6.6, 13.6 + y, 3.2], [6.6, 13.6 + y, 3.2]], ap: [0.5, -0.8, -0.6], g: [a] };
    };
  }
  // The rope sweeps an oval round the body, well clear of it: over the head, under the feet, a hand's width in front
  // and behind. Cream with orange handles, so it reads on the dark floor.
  function jumpRope(S, P, gd) {
    var k = gd.k, a = P.g[0], A = grip(S, 0, gd), B = grip(S, 1, gd), prev = A;
    for (var i = 1; i <= 20; i++) {
      var u = i / 20, w = Math.pow(Math.sin(Math.PI * u), 0.5), base = add(mul(A, 1 - u), mul(B, u));
      var p = add(base, [0, (3.4 + 18 * Math.cos(a)) * k * w, 11 * k * Math.sin(a) * w]);
      rod(prev, p, 0.8, 3);
      prev = p;
    }
    [A, B].forEach(function (g) { rod(add(g, [0, -1.2 * k, 0]), add(g, [0, 1.2 * k, 0]), 0.9, 1); });
  }

  // The machines: rower, bikes, ski, the pool and the sled.
  var ROW_CATCH = { py: 6.2, pz: 1.5, l: 0.45, hp: -0.1, f: [2.6, 4.5, 7.5, -0.5], lp: [0.3, 1, 0.2], h: [3, 11, 13.2], ap: [0.6, -0.8, -0.2] };
  var ROW = moves([[0, ROW_CATCH], [5, { pz: -2, l: 0.3, h: [3, 11, 9] }], [8, held({ pz: -5, l: -0.4, hp: 0.1, ap: [0.6, 0, -1] }, -3.6, 2.8, 3)], [10, held({}, -3.6, 2.8, 3)],
    [14, { pz: -4.6, l: 0.3, hp: -0.1, h: [3, 10.6, 6], ap: [0.6, -0.8, -0.2] }], [18, { pz: -1, l: 0.42, h: [3, 11, 11] }], [22, ROW_CATCH]], 24);
  function rower(S, P, gd) {
    var k = gd.k, z = S.pel[2] / k, hz = (S.wr[0][2] + S.wr[1][2]) / 2 / k, hy = (S.wr[0][1] + S.wr[1][1]) / 2 / k;
    slab(k, -1.4, 1, -14, 1.4, 3, 9, 6);
    slab(k, -2.6, 3, z - 2.2, 2.6, 4.6, z + 2.2, 5);
    slab(k, -3.4, 0, 9, 3.4, 9, 15, 5);
    slab(k, -3.4, 2.4, 6.6, 3.4, 3.4, 9, 6);
    slab(k, -1, 0, -15, 1, 1, -12, 6);
    rod([0, hy * k, hz * k], [0, 8 * k, 9 * k], 0.4, 4);
    rod([-3.2 * k, hy * k, hz * k + 1], [3.2 * k, hy * k, hz * k + 1], 0.7, 5);
  }
  // Pedals turn on a crank under the seat; forward: over the top towards the front, down, back along the bottom; the air bike's arms push and pull against the legs.
  function pedal(arms) {
    return function (t) {
      var ph = 2 * Math.PI * (((t / 12) % 1 + 1) % 1);
      var f = [0, 1].map(function (i) { var a = ph + i * Math.PI; return [2.6, 6.5 - 3.2 * Math.sin(a), 2.8 + 3.2 * Math.cos(a), -0.1 * Math.sin(a)]; });
      var h = arms ? [0, 1].map(function (i) { var a = ph + i * Math.PI; return [4.4, 19.4, 9 + 2.4 * Math.cos(a)]; }) : [[3.8, 20.2, 8.4], [3.8, 20.2, 8.4]];
      return { py: 15.4 + 0.15 * Math.sin(2 * ph), pz: -2, l: arms ? 0.4 : 0.62, hp: 0.1, f: f, h: h, ap: [0.6, -0.7, -0.3], lp: [0.3, 0.6, 1], g: [ph] };
    };
  }
  function bike(fan) {
    return function (S, P, gd) {
      var k = gd.k;
      slab(k, -4, 0, -8, 4, 1, -6, 6);
      slab(k, -4, 0, 9, 4, 1, 11, 6);
      rod([0, 1 * k, -7 * k], [0, 13.6 * k, -2.4 * k], 0.9, 4);
      slab(k, -2.4, 13.6, -4.6, 2.4, 14.6, -0.4, 5);
      rod([0, 1 * k, 10 * k], [0, 18 * k, 7.6 * k], 0.9, 4);
      rod([0, 6.5 * k, 2.8 * k], [0, 8 * k, 9 * k], 0.7, 6);
      if (fan) {
        for (var i = 0; i < 2; i++) disc([(i ? -1.4 : 1.4) * k, 9 * k, 11.4 * k], 6 * k, i ? 6 : 5);
        [0, 1].forEach(function (j) { var c = grip(S, j, gd); rod(c, [c[0], 6 * k, 8 * k], 0.7, 4); });
      } else {
        rod([-3.8 * k, 18.4 * k, 7.4 * k], [3.8 * k, 18.4 * k, 7.4 * k], 0.7, 5);
        slab(k, -1.8, 3, 8, 1.8, 13, 14, 5);
      }
      [0, 1].forEach(function (j) { var a = P.g[0] + j * Math.PI; rod([(j ? -1.4 : 1.4) * k, 6.5 * k, 2.8 * k], [(j ? -2.6 : 2.6) * k, (6.5 - 3.2 * Math.sin(a)) * k, (2.8 + 3.2 * Math.cos(a)) * k], 0.6, 4); });
    };
  }
  var SKI_TOP = { py: 14.6, pz: -0.4, l: 0.04, hp: 0.15, f: [2.8, 2, 0, 0], h: [3.6, 31, 5], ap: [0.6, -0.6, -0.4] };
  var SKI = moves([[0, SKI_TOP], [3, { py: 15, f: [2.8, 2.6, 0, 0.4] }], [8, { py: 12, pz: -3.8, l: 0.9, hp: -0.2, f: [2.8, 2, 0, 0], h: [4.4, 10, 1.4] }], [10, {}], [16, SKI_TOP]], 20);
  function skiErg(S, P, gd) {
    var k = gd.k;
    slab(k, -2.6, 0, 7, 2.6, 40, 10, 5);
    slab(k, -6, 0, 4, 6, 1, 12, 6);
    [0, 1].forEach(function (j) { var c = grip(S, j, gd), x = (j ? -2.4 : 2.4) * k; rod([x, 38 * k, 6.6 * k], c, 0.4, 4); rod(add(c, [0, -1.4 * k, 0]), add(c, [0, 1.4 * k, 0]), 0.8, 5); });
  }
  // Front crawl, the body flat on the water; one arm reaches as the other pulls, the legs kick.
  function swim(t) {
    var ph = ((t / 16) % 1 + 1) % 1;
    var h = [0, 1].map(function (i) {
      var u = (ph + i * 0.5) % 1;
      if (u < 0.5) { var s = u / 0.5; return [3.4, 6.2 - 3 * Math.sin(Math.PI * s), 14.6 - 14 * s]; }
      var w = (u - 0.5) / 0.5;
      return [4.6, 6.2 + 5 * Math.sin(Math.PI * w), 0.6 + 14 * w];
    });
    var f = [0, 1].map(function (i) { return [1.8, 6 + 1.2 * Math.sin(2 * Math.PI * (ph * 3 + i * 0.5)), -12.4, 1.5]; });
    return { py: 6, pz: 0, l: 1.5, hp: 0.62, f: f, h: h, ap: [0.6, 1, 0] };
  }
  function pool(S, P, gd) { slab(gd.k, -10, 0, -22, 10, 4.4, 22, 20); }
  // The sled: two steel skids turned up at the front, an iron deck, a post with three bumpers; for the push, two
  // uprights at its near end joined by a grip bar. z0 is the end nearer the athlete, in base units.
  function sledModel(k, z0, uprights) {
    [-1, 1].forEach(function (s) {
      var x = s * 4.2 * k;
      rod([x, 0.8 * k, (z0 - 0.4) * k], [x, 0.8 * k, (z0 + 9) * k], 0.9, 4);
      rod([x, 0.8 * k, (z0 + 9) * k], [x, 3 * k, (z0 + 10.6) * k], 0.9, 4);
      rod([x, 0.8 * k, (z0 - 0.4) * k], [x, 2.4 * k, (z0 - 1.4) * k], 0.9, 4);
    });
    slab(k, -4.4, 1.4, z0 + 0.4, 4.4, 2.4, z0 + 8.6, 34);
    rod([0, 2.4 * k, (z0 + 4.4) * k], [0, 10.5 * k, (z0 + 4.4) * k], 1, 4);
    [[2.9, 1], [4.2, 34], [5.5, 1]].forEach(function (p) {
      var c = W3([0, p[0] * k, (z0 + 4.4) * k]), r = 4.6 * k;
      for (var x = Math.floor(c[0] - r); x <= Math.ceil(c[0] + r); x++) for (var z = Math.floor(c[2] - r); z <= Math.ceil(c[2] + r); z++) {
        var dx = x + 0.5 - c[0], dz = z + 0.5 - c[2], d = dx * dx + dz * dz;
        if (d <= r * r) put(x, Math.floor(c[1]), z, d < 1.5 ? 3 : p[1]);
      }
    });
    if (uprights) {
      [-1, 1].forEach(function (s) { rod([s * 3.8 * k, 2.4 * k, (z0 + 0.8) * k], [s * 3.8 * k, 16.4 * k, (z0 - 1.4) * k], 1, 4); });
      rod([-3.8 * k, 16.4 * k, (z0 - 1.4) * k], [3.8 * k, 16.4 * k, (z0 - 1.4) * k], 1, 4);
      rod([-3.8 * k, 7 * k, (z0 + 0.2) * k], [3.8 * k, 7 * k, (z0 + 0.2) * k], 0.8, 4);
    }
  }
  // Driving a sled: the legs of a run, the body leaning into the uprights.
  function sledPush(t) {
    var ph = ((t / 16) % 1 + 1) % 1, py = 11.6 + 0.4 * Math.cos(4 * Math.PI * ph);
    var f = [0, 1].map(function (i) {
      var u = (ph + i * 0.5) % 1;
      if (u < 0.5) { var s = u / 0.5; return [2.7, 2, 1.5 - 9 * s, 0.6 * s]; }
      var w = (u - 0.5) / 0.5, e = w * w * (3 - 2 * w);
      return [2.7, 2 + 4.5 * Math.sin(Math.PI * w), -7.5 + 9 * e, 0.6 - 0.6 * w];
    });
    return { py: py, pz: -2.6, l: 0.85, hp: -0.35, f: f, h: [[3.8, 15.4, 9.4], [3.8, 15.4, 9.4]], ap: [0.6, -0.8, -0.2] };
  }
  function sled(S, P, gd) { sledModel(gd.k, 11, true); }
  // Dragging a sled: walking backwards, the body leaning away, both hands on a taut rope to the sled's front.
  function sledPull(t) {
    var ph = ((t / 16) % 1 + 1) % 1, py = 12.4 + 0.35 * Math.cos(4 * Math.PI * ph), tug = 0.6 * Math.cos(4 * Math.PI * ph);
    var f = [0, 1].map(function (i) {
      var u = (ph + i * 0.5) % 1;
      if (u < 0.55) { var s = u / 0.55; return [2.8, 2, -3.6 + 7.2 * s, s < 0.2 ? 0.2 - s : 0]; }
      var w = (u - 0.55) / 0.45, e = w * w * (3 - 2 * w);
      return [2.8, 2 + 2.4 * Math.sin(Math.PI * w), 3.6 - 7.2 * e, 0.3 * Math.sin(Math.PI * w)];
    });
    return { py: py, pz: -1.2, l: -0.28, hp: 0.25, f: f, h: [[2.2, 13 + tug, 4.4 - tug], [2.2, 13 + tug, 4.4 - tug]], ap: [0.6, -0.8, -0.3] };
  }
  function sledRope(S, P, gd) {
    var k = gd.k, mid = mul(add(grip(S, 0, gd), grip(S, 1, gd)), 0.5);
    sledModel(k, 22, false);
    rod(mid, [0, 1.6 * k, 21.4 * k], 0.9, 21);
    rod(mid, [0, mid[1] - 1.5 * k, mid[2] - 4 * k], 0.9, 21);
  }

  function lift(id, pose, N, still, extra) { register(id, assign({ N: N, pose: pose, form: COLUMN, bar: 1, prop: "bar", still: still }, extra)); }
  lift("deadlift", DEADLIFT, 28, 12);
  lift("sumo", SUMO, 28, 12);
  lift("rdl", RDL, 24, 11);
  lift("goodmorning", GOOD_MORNING, 24, 11);
  lift("bbrow", BENT_ROW, 20, 9);
  lift("frontsquat", FRONT_SQUAT, 24, 12);
  lift("backsquat", BACK_SQUAT, 24, 12);
  lift("ohs", OHS, 24, 12);
  lift("press", PRESS, 24, 11);
  lift("pushpress", PUSH_PRESS, 28, 14);
  lift("pushjerk", PUSH_JERK, 32, 13);
  lift("splitjerk", SPLIT_JERK, 32, 13);
  lift("thruster", THRUSTER, 28, 11);
  lift("clean", CLEAN, 40, 20);
  lift("powerclean", POWER_CLEAN, 36, 19);
  lift("hangclean", HANG_CLEAN, 30, 16);
  lift("cleanjerk", CLEAN_JERK, 70, 43);
  lift("powersnatch", POWER_SNATCH, 37, 15);
  lift("hangsnatch", HANG_SNATCH, 31, 13);
  lift("bench", BENCH, 22, 11, { gear: bench, form: COLUMN });
  lift("hipthrust", HIP_THRUST, 22, 10, { gear: thrustBench, form: COLUMN });
  lift("racklunge", RACK_LUNGE, 40, 10);
  lift("ohlunge", OH_LUNGE, 40, 10);

  function load(id, pose, N, still, gear, extra) { register(id, assign({ N: N, pose: pose, form: [2, 28, 22, -4], gear: gearOf(gear), still: still }, extra)); }
  load("dbsnatch", DB_SNATCH, 56, 14, "db1");
  load("dbclean", DB_CLEAN, 56, 14, "db1");
  load("dbcleanjerk", DB_CLEAN_JERK, 76, 24, "db1");
  load("dbthruster", DB_THRUSTER, 28, 11, "db2");
  load("dbpushpress", DB_PUSH_PRESS, 28, 14, "db2");
  load("dbrow", DB_ROW, 32, 8, "db1");
  load("renegade", RENEGADE, 28, 6, "db2", { form: [2, 28, 34, -4] });
  load("devilpress", DEVIL_PRESS, 48, 30, "db2", { form: [2, 28, 34, -4] });
  load("goblet", GOBLET, 24, 12, "goblet");
  load("kbswing", KB_SWING, 16, 7, "kb2h");
  load("kbsnatch", KB_SNATCH, 36, 8, "kb1");
  load("kbclean", KB_CLEAN, 36, 8, "kb1");
  load("tgu", TGU, 70, 16, "kb1", { form: [2, 30, 34, -4] });
  load("farmers", FARMERS, 16, 4, "db2");
  load("sandbag", SANDBAG, 32, 17, "sandbag");

  function gym(id, pose, N, still, extra) { register(id, assign({ N: N, pose: pose, form: [4, 17, 30, 0], still: still }, extra)); }
  gym("strictpull", STRICT_PULL, 32, 15, { form: COLUMN, rig: 1, prop: "rig" });
  gym("c2b", C2B, 24, 9, { form: COLUMN, rig: 1, prop: "rig" });
  gym("t2b", T2B, 24, 10, { form: COLUMN, rig: 1, prop: "rig" });
  gym("k2e", K2E, 24, 10, { form: COLUMN, rig: 1, prop: "rig" });
  gym("barmu", BAR_MU, 32, 17, { form: COLUMN, rig: 1, prop: "rig" });
  gym("ringmu", RING_MU, 36, 21, { hang: 1, gear: rings });
  gym("ringdip", RING_DIP, 24, 1, { hang: 1, gear: rings });
  gym("dip", DIP, 24, 1, { gear: parallelBars, form: [4, 20, 30, 0] });
  gym("hspu", facing(HSPU), 24, 1, { gear: wall(4.6, 5.8) });
  gym("hswalk", facing(handWalk), 16, 2);
  gym("wallwalk", WALL_WALK, 68, 30, { gear: wall(-13.4, -12), form: [2, 24, 40, 0] });
  gym("pushup", PUSH_UP, 20, 1, { form: [4, 15, 34, 0] });
  gym("rope", ROPE_CLIMB, ROPE_C.N, 18, { gear: rope });
  gym("legless", LEGLESS, LEGLESS_C.N, 18, { gear: rope });
  gym("pegboard", PEGBOARD, PEG_C.N, 18, { gear: pegboard });
  gym("barfacing", BAR_FACING, 100, 15, { gear: floorBarAcross, form: COLUMN });
  gym("burpeebar", BURPEE_OVER, 88, 15, { gear: floorBarAlong, form: COLUMN });
  gym("burpeedb", BURPEE_OVER, 88, 15, { gear: floorDb, form: [2, 24, 34, 0] });
  gym("bbjo", BBJO, 116, 37, { gear: plyoBox(12), form: [2, 30, 50, 0] });
  gym("bjo", BJO, 68, 14, { gear: plyoBox(12), form: [2, 30, 34, 0] });
  gym("boxjump", BOX_JUMP, 36, 16, { gear: plyoBox(12), form: [2, 30, 34, 0] });
  gym("stepup", STEP_UP, 48, 11, { gear: plyoBox(10), form: [2, 30, 30, 0] });
  gym("dbstepover", STEP_OVER, 68, 11, { gear: plyoBox(10), held: GEAR.db2, form: [2, 30, 34, 0] });

  function floorMove(id, pose, N, still, extra) { register(id, assign({ N: N, pose: pose, form: [2, 28, 22, -4], still: still }, extra)); }
  floorMove("wallball", WALL_BALL, 32, 9, { gear: gearOf("ball", wallTarget) });
  floorMove("pistol", PISTOL, 48, 12);
  floorMove("lunge", LUNGE, 40, 10);
  floorMove("walklunge", WALK_LUNGE, 32, 0);
  floorMove("situp", SIT_UP, 20, 9, { gear: abmat, form: [2, 24, 30, 0] });
  floorMove("ghd", GHD, 22, 9, { gear: ghdMachine, form: [2, 24, 34, 0] });
  floorMove("backext", BACK_EXT, 20, 9, { gear: backExtMachine, form: [2, 24, 34, 0] });
  floorMove("plank", PLANK, 16, 0, { form: [2, 24, 30, 0] });
  floorMove("hollow", HOLLOW_HOLD, 16, 0, { form: [2, 24, 30, 0] });
  floorMove("vup", V_UP, 20, 9, { form: [2, 24, 30, 0] });
  floorMove("su", skip(8, 1), 8, 2, { gear: jumpRope });
  floorMove("du", skip(10, 2, true), 10, 2, { gear: jumpRope });
  floorMove("row", ROW, 24, 8, { gear: rower, form: [2, 26, 34, 0] });
  floorMove("bike", pedal(), 12, 0, { gear: bike(), form: [2, 26, 30, 0] });
  floorMove("airbike", pedal(true), 12, 0, { gear: bike(true), form: [2, 26, 30, 0] });
  floorMove("ski", SKI, 20, 8, { gear: skiErg, form: [2, 26, 30, 0] });
  floorMove("swim", swim, 16, 4, { gear: pool, form: [2, 26, 34, 0] });
  floorMove("sledpush", sledPush, 16, 4, { gear: sled, form: [2, 26, 34, 0] });
  floorMove("sledpull", sledPull, 16, 4, { gear: sledRope, form: [2, 26, 34, 0] });

  // A shuttle run: a stride, a lunge to touch the line, and the turn back for the next length.
  var RUN_KEY = (function () {
    var p = run(0);
    return { py: p.py, pz: 0, l: p.l, hp: p.hp, fa: p.f[0], fb: p.f[1], ha: p.h[0], hb: p.h[1], ap: [0.5, -0.8, -0.55] };
  })();
  var SHUTTLE_TOUCH = moves([
    [16, RUN_KEY], [20, { py: 8.2, pz: 0.6, l: 1, hp: -0.2, fa: [2.6, 2, 6, 0], fb: [2.6, 3, -5, 1], ha: [3.6, 2.4, 9.2], hb: [4.6, 9, -1] }],
    [23, {}], [27, { py: 13.8, pz: 0, l: 0.25, hp: 0, fa: [2.6, 2, 1, 0], fb: [2.6, 2, -1, 0], ha: [4.2, 12.5, 2], hb: [4.2, 12.5, -0.5] }],
    [31, RUN_KEY],
  ], 32);
  var SHUTTLE = turnedAfter(function (t) { var u = ((t % 32) + 32) % 32; return u < 16 ? run(u) : SHUTTLE_TOUCH(u); }, 32, 24);
  register("shuttle", { N: 64, pose: SHUTTLE, form: [2, 18, 18, 0], prop: "cones", still: 4 });

  // ---- Holding a part while teammates work, and waiting a turn: still poses with a slow breath, each with its equipment

  var SANDBAG_HOLD = moves([[0, bagAt({ py: 14.4, pz: 0, l: 0.08, hp: 0, f: [3.2, 2, 0, 0] })], [8, bagAt({ py: 14.1, l: 0.1 })], [16, bagAt({ py: 14.4, l: 0.08 })]], 16);
  load("sandbaghold", SANDBAG_HOLD, 16, 0, "sandbag");
  var BAR_HOLD = moves([[0, OHS_TOP], [8, overhead({ py: 14.3, l: 0.05 }, 6.6, 9.8, 0.6)], [16, overhead({ py: 14.6, l: 0.03 }, 6.6, 9.8, 0.6)]], 16);
  lift("barhold", BAR_HOLD, 16, 0);
  // A dead hang and a handstand are held still: the first frame of the pull-up and of the handstand push-up.
  var HANG_AT = spline(PULL, 28), HS_AT = facing(HSPU);
  gym("hang", function () { return HANG_AT(0); }, 16, 0, { form: COLUMN, rig: 1, prop: "rig" });
  gym("hshold", function () { return HS_AT(0); }, 16, 0, { gear: wall(4.6, 5.8) });
  var WALL_SIT_P = { py: 8.6, pz: -5, l: -0.04, hp: 0, f: [3.2, 2, 1.4, 0], h: [4.4, 9.8, -1.6], ap: [0.6, -0.6, -0.4] };
  floorMove("wallsit", moves([[0, WALL_SIT_P], [8, { py: 8.4, h: [4.4, 9.6, -1.6] }], [16, WALL_SIT_P]], 16), 16, 0, { gear: wall(-10, -8.6), form: [2, 24, 30, 0] });
  var REST_HIPS = moves([[0, hipsAt({ py: 14.6, pz: 0, l: 0.04, hp: 0.1, f: [3.2, 2, 0, 0] })], [8, hipsAt({ py: 14.3, l: 0.08, hp: 0 })], [16, hipsAt({ py: 14.6, l: 0.04, hp: 0.1 })]], 16);
  floorMove("rest", REST_HIPS, 16, 0, { form: [2, 24, 16, 0] });

  // What a part that holds draws: the hold that keeps its movement's equipment in the hands, on the rig or on the wall.
  var HOLD_OF = {
    sandbag: "sandbaghold", hspu: "hshold", hswalk: "hshold", wallwalk: "hshold", squat: "wallsit", wallball: "wallsit",
    pistol: "wallsit", lunge: "wallsit", walklunge: "wallsit", plank: "plank", hollow: "hollow", rope: "hang", legless: "hang",
    pegboard: "hang",
  };
  function holdOf(anim) {
    var mv = ANIMS[anim];
    if (HOLD_OF[anim]) return HOLD_OF[anim];
    if (mv && mv.bar) return "barhold";
    if (mv && (mv.rig || mv.hang)) return "hang";
    return "plank";
  }

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
    return assign({ k: k, shoe: [9, 1.3, 1.05], pl: 5.2, nr: 1.3, hr: 1.05, sl: 0.5 }, o, { B: assign(scaled(BASE, k), o.B) });
  }
  var MAN = { B: { hw: 2.5, sw: 5.1, nk: 1.8 }, R: { th: lin(2.3, 1.55), sh: lin(1.7, 1), ua: lin(1.5, 1.25), fa: lin(1.25, 0.95) }, T: { w: [0, 2.8, 0.25, 2.4, 0.6, 3.8, 0.85, 4.6, 0.93, 4.5, 1, 3], d: [0, 2.1, 0.5, 2, 0.9, 2.5, 1, 2.2], sv: 2.7, vb: 1.8 } };
  // About 6% shorter, narrower shoulders, wider hips, a marked waist, a shorter torso, a slimmer neck.
  var WOMAN = { B: { hw: 2.7, sw: 4.25, nk: 1.7, tor: 10.2 }, R: { th: lin(2.45, 1.5), sh: lin(1.55, 0.95), ua: lin(1.3, 1.1), fa: lin(1.1, 0.85) }, T: { w: [0, 3.4, 0.14, 3.5, 0.3, 2.4, 0.6, 3.15, 0.85, 3.9, 0.93, 3.8, 1, 2.6], d: [0, 2.2, 0.5, 1.9, 0.9, 2.3, 1, 2], fx: FX, bx: BX, sv: 2.6, vb: 1.8 }, nr: 1.1, hr: 0.95, sl: 0.42, shoe: [9, 1.2, 1], pl: 5.2 };
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
  // 14-17 hair, 18 lips, 19 leather, 20 water, 21 wood, 22 ball, 23 pad,
  // 24 bib, 25 outline, 26-33 the lane colours, 34 iron (dumbbells and kettlebells, light enough to read on the dark floor).
  var PAL = { 1: "#FF4A1C", 2: "#2b2f3b", 3: "#f2efe6", 4: "#b5b1a5", 5: "#14110f", 6: "#8d8a82", 7: "#1b1917", 8: "#454d63", 9: "#e6e1d3", 10: "#e9b48c", 11: "#f8d2b2", 12: "#b87a58", 13: "#8d5a3f", 14: "#4a2f22", 15: "#14110f", 16: "#c9a05a", 17: "#7a5038", 18: "#f08a8a", 19: "#6a4328", 24: "#f6f4ee", 25: "#0b0a09", 20: "#2f7fd0", 21: "#b8834f", 22: "#e2c86a", 23: "#5b6172", 34: "#7c8796" };
  // The arcade palette: 13 warm base colours, plus the lane's.
  var RET = { 1: "#ff5a1f", 2: "#34345a", 3: "#f6ecd2", 4: "#b9a98c", 5: "#1c1118", 6: "#b9a98c", 7: "#1c1118", 8: "#34345a", 9: "#f6ecd2", 10: "#f2b58a", 11: "#fbd7b4", 12: "#c27d54", 13: "#8d5a3f", 14: "#6b3f2a", 15: "#1c1118", 16: "#e0b050", 17: "#6b3f2a", 18: "#ff5a1f", 19: "#6b3f2a", 24: "#f6ecd2", 25: "#1c1118", 20: "#3c78c8", 21: "#c08a50", 22: "#f0c860", 23: "#5a4a6a", 34: "#8a8aa6" };
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
    var P = mv.pose(t), k = sty.G[0].k, r = sty.G[g].r, Y0 = mv.rig || mv.hang ? barY(sty) : 0, q = k * r;
    var out = {
      py: Y0 + (P.py * k - Y0) * r, pz: P.pz * q, px: (P.px || 0) * q, l: P.l, hp: P.hp, ap: P.ap, lp: P.lp, g: P.g, flip: P.flip, yaw: P.yaw,
      f: P.f.map(function (f) { return [f[0] * q, Y0 + (f[1] * k - Y0) * r, f[2] * q, f[3]]; }),
      h: P.h.map(function (h) { return [h[0] * q, Y0 + (h[1] * k - Y0) * r, h[2] * q]; }),
    };
    if ((mv.rig || mv.hang) && g) {
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
            if (S.miss > r.miss) r.worst = name;
            if (!(r.bone < 1)) r.broken = r.broken || name;
            r.miss = Math.max(r.miss, S.miss);
          }
        });
        out.push(r);
      });
    });
    return out;
  }

  // How much of a still frame is the athlete and how much its equipment, and how far a loop moves the body: for the tests.
  function census(id) {
    var mv = ANIMS[id], sty = STYLES.det, look = { woman: false, skin: 1, hair: 1, cut: 1, n: 0 };
    function count(m) {
      ln = 0;
      raster(sty, look, m, poseOf(sty, 0, m, m.still), 0, 0);
      var n = ln;
      for (var k = 0; k < ln; k++) V[list[k]] = 0;
      ln = 0;
      return n;
    }
    var all = count(mv), bare = count(assign({}, mv, { gear: null, bar: 0, rig: 0 }));
    return { voxels: bare, gear: all - bare };
  }
  function travel(id) {
    var mv = ANIMS[id], a = mv.pose(0), most = 0;
    function flat(p) { return [p.py, p.pz].concat(p.h[0], p.h[1], p.f[0].slice(0, 3), p.f[1].slice(0, 3)); }
    for (var t = 0; t < mv.N; t += 0.5) {
      var b = flat(mv.pose(t));
      flat(a).forEach(function (v, i) { most = Math.max(most, Math.abs(b[i] - v)); });
    }
    return most;
  }

  // ---- The voxel rasteriser and the bake into cube sprites

  var NX = 80, NY = 96, NZ = 80, C = 40, SX = NY * NZ, SY = NZ;
  var V = new Uint8Array(NX * NY * NZ), list = new Int32Array(1 << 16), ln = 0;
  // Turned half round about the athlete's own vertical axis, for a bake that faces back down the lane.
  var turned = false, alone = false;
  function put(x, y, z, c) {
    if (turned) {
      x = 2 * C - 1 - x;
      z = 2 * C - 1 - z;
    }
    putCell(x, y, z, c);
  }
  // Equipment drawn after a turned body goes only where the body is not, as if it had been drawn first: [bodyCells] marks
  // the turned body's cells while [under] is on.
  var under = false, bodyCells = new Uint8Array(NX * NY * NZ);
  function putCell(x, y, z, c) {
    if (x < 0 || y < 0 || z < 0 || x >= NX || y >= NY || z >= NZ || ln >= list.length) return;
    var i = x * SX + y * SY + z;
    if (under && bodyCells[i]) return;
    if (!V[i]) list[ln++] = i;
    V[i] = c;
  }

  // The voxels drawn since [from] turned by [yaw] about the vertical line through (cx, cz), in the grid's own space. Each
  // cell takes the colour of the cell it comes from, so a turn leaves no holes in the body.
  function turnVoxels(from, cx, cz, yaw) {
    var cells = new Map(), x0 = NX, x1 = 0, y0 = NY, y1 = 0, z0 = NZ, z1 = 0, k, i, x, y, z;
    for (k = from; k < ln; k++) {
      i = list[k];
      x = (i / SX) | 0;
      y = ((i / SY) | 0) % NY;
      z = i % NZ;
      cells.set(i, V[i]);
      V[i] = 0;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    }
    ln = from;
    var r = Math.ceil(Math.max(Math.hypot(x0 - cx, z0 - cz), Math.hypot(x1 + 1 - cx, z0 - cz), Math.hypot(x0 - cx, z1 + 1 - cz), Math.hypot(x1 + 1 - cx, z1 + 1 - cz)));
    var c = Math.cos(yaw), s = Math.sin(yaw);
    for (x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) for (z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++) {
      var dx = x + 0.5 - cx, dz = z + 0.5 - cz, sx = Math.floor(cx + dx * c + dz * s), sz = Math.floor(cz - dx * s + dz * c);
      if (sx < 0 || sz < 0 || sx >= NX || sz >= NZ) continue;
      for (y = y0; y <= y1; y++) {
        var col = cells.get(sx * SX + y * SY + sz);
        if (col) putCell(x, y, z, col);
      }
    }
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
  // A loaded Olympic bar to scale with the athlete: 2.2 m long (2.0 m for a woman's bar), collars 1.31 m apart, two
  // bumpers of 45 cm a side and the sleeve past them. The shaft is one voxel thick (a real one is 2.8 cm), the sleeve a cross. A man here is about 1.75 m, so one voxel is about 4.3 cm.
  function barHalf(k) { return 21 * k; }
  // w: the bar's middle on the grid; along: 0 for a bar across the athlete (x), 2 for one lying along the lane (z).
  function barAt(w, gd, along) {
    var half = Math.round(barHalf(gd.k)), inner = Math.round(13.2 * gd.k), r = gd.pl;
    for (var t = -half; t <= half; t++) {
      var a = Math.abs(t), o = a - inner, rad = 0.5, col = 4;
      if (o >= 0 && o < 1) { rad = r * 0.4; col = 3; }
      else if ((o >= 1 && o < 3) || (o >= 4 && o < 6)) { rad = r; col = 1; }
      else if (o >= 3 && o < 4) { rad = r * 0.82; col = 6; }
      else if (o >= 6) rad = 1;
      for (var y = Math.floor(w[1] - rad); y <= Math.ceil(w[1] + rad); y++) for (var b = Math.floor(-rad); b <= Math.ceil(rad); b++) {
        var dy = y + 0.5 - w[1] - 0.5, db = b;
        if (dy * dy + db * db > rad * rad) continue;
        if (along === 2) put(w[0] + b, y, w[2] + t, col);
        else put(w[0] + t, y, w[2] + b, col);
      }
    }
  }

  function raster(sty, v, mv, P, tc, vy) {
    var g = v.woman ? 1 : 0, gd = sty.G[g], B = gd.B, S = skel(P, B), R = gd.R, T = gd.T, hh = B.hh, kit = sty.kit, cut = v.cut;
    var sk = 10 + SKIN[v.skin], hr = 14 + v.hair, team = 26 + tc;
    var shirt = team, acc = team, shs = kit ? KIT_SHORTS[tc] : 2, stp = KIT_STRIPE[tc];
    var crop = g && !kit && [1, 0, 1, 0][cut], leg = g && !kit && [0, 1, 1, 0][cut], top0 = T.sv + (crop ? 2.3 : 0);
    var vb0 = T.sv + 0.9, vb1 = vb0 + (g ? 4 : 5);
    // Equipment first, so the body drawn over it holds the bar, the rope or the ball; during a turn the body and what it
    // holds are drawn first and turned, and the equipment around them after, only where they are not.
    var turning = P.yaw > 0 && P.yaw < Math.PI, turnFrom = ln;
    if (mv.gear && !turning) mv.gear(S, P, gd);
    if (mv.held) mv.held(S, P, gd);
    // The torso: an oriented box with a width and depth profile (chest and glutes asymmetric on a woman).
    var pa = W3(S.pel), pb = W3(S.neck);
    var lo = [0, 1, 2].map(function (i) { return Math.max(0, Math.floor(Math.min(pa[i], pb[i]) - 8)); });
    var hi = [NX - 1, NY - 1, NZ - 1].map(function (m, i) { return Math.min(m, Math.ceil(Math.max(pa[i], pb[i]) + 8)); });
    for (var x = lo[0]; x <= hi[0]; x++) for (var y = lo[1]; y <= hi[1]; y++) for (var z = lo[2]; z <= hi[2]; z++) {
      var d0 = x + 0.5 - C - (P.px || 0), d1 = y + 0.5 - P.py, d2 = z + 0.5 - C - P.pz;
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
    // Turned by the nearest quarter turn to where the head points, so a lying or upside-down athlete faces the right way.
    var hq = ((Math.round(S.ha / (Math.PI / 2)) % 4) + 4) % 4, qc = [1, 0, -1, 0][hq], qs = [0, 1, 0, -1][hq];
    function hp3(l, u, f) { return [h0[0] + l, h0[1] + u * qc - f * qs, h0[2] + f * qc + u * qs]; }
    function hv(f, l, u, col) { var p = hp3(l, u, f); put(Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]), col); }
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
      var hpos = hp3(dx - 0.5, dy - 0.5, dz - 0.5);
      put(Math.round(hpos[0]), Math.round(hpos[1]), Math.round(hpos[2]), col);
    }
    var ty = clamp(vy, -1.5, 1.5), i, k;
    if (!g) {
      if (cut === 1) for (k = hh + 1; k <= hh + 3; k++) hv(-k, 0, Math.floor(hh / 2) - (k - hh - 1), hr);
      if (cut === 2) for (var a = -1; a <= 0; a++) for (var b = -1; b <= 0; b++) {
        hv(b, a, hh + 1, hr);
        hv(b, a, hh + 2, hr);
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
      barAt(W3([P.px || 0, (P.h[0][1] + P.h[1][1]) / 2, (P.h[0][2] + P.h[1][2]) / 2]).map(Math.round), gd, 0);
    }
    // On the track an athlete brings only their metre of the rig's bar (rigGaps draws the rest); on their own, as in the
    // movement catalogue, a bar of their own between two posts.
    if (mv.rig && !alone) cylinder(W3([0, barY(sty), 0]).map(Math.round), RIG_GRIP, 1, 4);
    if (mv.rig && alone) {
      var by = barY(sty), half = RIG_HALF;
      cylinder(W3([0, by, 0]).map(Math.round), half + 1, 1, 4);
      [-half, half].forEach(function (px) {
        var at = W3([px, 0, 0]).map(Math.round), a2, b2, y2;
        for (a2 = -2; a2 < 2; a2++) for (b2 = -2; b2 < 2; b2++) put(at[0] + a2, 0, at[2] + b2, 6);
        for (y2 = 1; y2 <= by + 1; y2++) for (a2 = -1; a2 < 1; a2++) for (b2 = -1; b2 < 1; b2++) put(at[0] + a2, y2, at[2] + b2, 1);
      });
    }
    if (turning) {
      // About the athlete's own vertical line, wherever the frame put it (and mirrored with it, facing back).
      var cx = C + S.pel[0], cz = C + S.pel[2];
      if (turned) { cx = 2 * C - cx; cz = 2 * C - cz; }
      turnVoxels(turnFrom, cx, cz, P.yaw);
      var turnedEnd = ln, k;
      for (k = turnFrom; k < turnedEnd; k++) bodyCells[list[k]] = 1;
      under = true;
      try {
        if (mv.gear) mv.gear(S, P, gd);
      } finally {
        under = false;
        for (k = turnFrom; k < turnedEnd; k++) bodyCells[list[k]] = 0;
      }
    }
  }
  // Half the rig's width: posts a forearm clear of the hands on either side, about 1.1 m apart.
  var RIG_HALF = 13;

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
    var gd = sty.G[0];
    barAt([C + Math.round(x), Math.round(gd.pl), C + Math.round(z)], gd, 0);
  }
  function box(x0, y0, z0, w, h, d, c) {
    for (var x = 0; x < w; x++) for (var y = 0; y < h; y++) for (var z = 0; z < d; z++) put(C + x0 + x, y0 + y, C + z0 + z, c);
  }
  var PROPS = {
    bar: function (L, sty) { formation("snatch", L).forEach(function (f) { barbell(f[0], f[1], sty); }); },
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

  // A sprite says which animation it is a frame of, so a lane never shows a teammate's last pose of another one.
  function athlete(mvId, at, v, tc, budget, back) {
    var made = baked([styleId, mvId, at, v.woman ? 1 : 0, v.skin, v.hair, v.cut, v.n, tc, back ? "b" : ""].join(":"), budget, function () {
      var sty = STYLES[styleId], mv = ANIMS[mvId], g = v.woman ? 1 : 0, P = poseOf(sty, g, mv, at);
      turned = !!back !== !!P.flip;
      try {
        raster(sty, v, mv, P, tc, P.py - poseOf(sty, g, mv, at - 1).py);
      } finally {
        turned = false;
      }
    });
    if (made) made.anim = mvId;
    return made;
  }

  // One athlete's frame on its own, as the track bakes it but with a rig of their own when they hang: for the movement
  // catalogue page and its tests.
  // [unturned] draws the frame's pose without its turn, for a test to tell the turn apart from the pose.
  function sprite(mvId, at, v, tc, sid, back, unturned) {
    var keep = styleId;
    styleId = sid || styleId;
    try {
      var sty = STYLES[styleId], mv = ANIMS[mvId], g = v.woman ? 1 : 0, P = poseOf(sty, g, mv, at);
      if (unturned) P.yaw = 0;
      ln = 0;
      turned = !!back !== !!P.flip;
      alone = true;
      try {
        raster(sty, v, mv, P, tc, P.py - poseOf(sty, g, mv, at - 1).py);
      } finally {
        turned = false;
        alone = false;
      }
      return bake(sty, camera(VOXEL));
    } finally {
      styleId = keep;
    }
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
    if (one.crew && one.crew.ring) {
      c.strokeStyle = rgba(colour, 0.75);
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(one.at.z, 0, one.crew.ring.along, one.crew.ring.across, 0, 0, 2 * Math.PI);
      c.stroke();
      one.ring = { z: one.at.z, along: one.crew.ring.along, across: one.crew.ring.across };
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
      if (!id || id === "rig" || (busy && id !== "cones") || z < from || z > to) continue;
      add3(list, equipment(id, L, 0, budget), x, z, id === "bar" ? 0 : -24);
    }
    if (L.arch >= from && L.arch <= to) add3(list, equipment("arch", L, one.tc, budget), x, L.arch + 3, -10);
  }
  // Every station's rigs, whoever is at it: the pieces nobody hangs from and the posts. Says what it drew, for the tests,
  // and `whole` false when a piece waits for the bake budget, so the track draws again.
  function rigging(list, o, v, L, hung, budget) {
    var drawn = [], whole = true;
    function put(e, x, z, bias) {
      if (e) add3(list, e, x, z, bias);
      else whole = false;
      return !!e;
    }
    for (var i = 0; i < L.n; i++) {
      var middle = L.start + (i + 0.5) * L.len;
      rigs(L, i).forEach(function (bar) {
        var a = shownOf(o, v, L, laneX(L, bar.lanes[0])), b = shownOf(o, v, L, laneX(L, bar.lanes[bar.lanes.length - 1]));
        var z = middle + bar.z;
        if (z < Math.min(a[0], b[0]) - 60 || z > Math.max(a[1], b[1]) + 130) return;
        var hands = hung.filter(function (h) { return Math.abs(h.z - z) < 0.5 && h.x > bar.posts[0] && h.x < bar.posts[1]; })
          .map(function (h) { return h.x; });
        var pieces = rigGaps(bar, hands), all = true;
        pieces.forEach(function (g) { all = put(rigPiece(g[1] - g[0] + 1, budget), g[0], z, (g[1] - g[0]) / 2) && all; });
        bar.posts.forEach(function (x) { all = put(rigPiece(0, budget), x, z, 0) && all; });
        drawn.push({ station: i, lanes: bar.lanes, z: bar.z, cells: bar.cells, hands: hands, pieces: pieces, drawn: all });
      });
    }
    return { bars: drawn, whole: whole };
  }
  // A post (cells x-1 and x of its anchor) or `len` cells of bar from its anchor: the same cells an athlete's metre fills.
  function rigPiece(len, budget) {
    return baked([styleId, "rig", len].join(":"), budget, function () {
      var by = Math.round(barY(STYLES[styleId]));
      if (len) box(0, by - 1, -1, len, 2, 2, 4);
      else {
        box(-2, 0, -2, 4, 1, 4, 6);
        box(-1, 1, -1, 2, by + 1, 2, 1);
      }
    });
  }
  function add3(list, e, x, z, bias) { if (e) list.push({ e: e, x: x, z: z, depth: x + z + (bias || 0) }); }

  function team(list, L, one, x, budget, stride, tick, hung) {
    var people = (one.crew || crew(L, one.state.p.slot, one.at, tick, still)).people, whole = true;
    // A team doing one animation keeps a pose it has while the next bakes, as it always did; one doing several shows none.
    var mixed = people.some(function (p) { return p.anim !== one.at.anim; });
    one.team.forEach(function (who, i) {
      var p = people[i], f = p.f;
      if (!still) f -= f % stride;
      var e = athlete(p.anim, f, who, one.tc, budget, one.at.back);
      if (e) one.last[i] = e;
      else whole = false;
      // A hanging pose kept while a run bakes would carry its metre of bar away from the rig.
      var stale = one.last[i] && one.at.moving && hangs(one.last[i].anim);
      if (one.last[i] && !stale && (!mixed || one.last[i].anim === p.anim)) {
        add3(list, one.last[i], x + p.x, one.at.z + p.z, 0);
        if (hung && hangs(one.last[i].anim)) hung.push({ x: x + p.x, z: one.at.z + p.z });
      }
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
    sc.lanes.forEach(function (one) {
      one.crew = crew(L, one.state.p.slot, one.at, tick, still);
      one.ring = null;
    });
    sc.lanes.forEach(function (one, i) { floor(o, v, L, one, laneX(L, i), near); });
    if (!near) {
      // Too small to read on every lane: once, larger, on the floor in front of the nearest one.
      lie(o, v, laneX(L, count - 1) + L.lane / 2);
      for (var n = 0; n < L.n; n++) paint(o.c, L.names[n], L.start + (n + 0.5) * L.len, 16, L.len - 8, 24, "rgba(242,238,230,.72)");
    }
    sc.lanes.forEach(function (one, i) { stand(list, o, v, L, one, laneX(L, i), budget); });
    // A different lane first each time, so on a slow phone every team gets its turn to be baked.
    var hung = [];
    for (var k = 0; k < count; k++) {
      var i = (k + tick) % count;
      if (sc.lanes[i].on && !team(list, L, sc.lanes[i], laneX(L, i), budget, stride, tick, hung)) full = false;
    }
    var rig = rigging(list, o, v, L, hung, budget);
    sc.rig = rig.bars;
    if (!rig.whole) full = false;
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
      one.tag = String(one.lane);
      var head = project(v, laneX(L, i), HEAD - 4, one.at.z), feet = project(v, laneX(L, i), 20, one.at.z);
      var seen = feet[0] > 4 && feet[0] < o.w - 4 && feet[1] > 4 && feet[1] < o.h - 4, at = seen ? head : feet;
      (seen ? inside : outside).push({
        one: one, lane: one.lane, name: one.name, px: at[0], py: at[1], place: one.place && !one.ended ? one.place.text : "",
        mode: one.crew && one.crew.sync ? labels.sync : "",
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
        one.tag = tag.text;
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
      want: m.want, shown: sc.shown, frames: sc.frames, pins: sc.pins.slice(), rig: sc.rig || [],
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
    seen.forEach(function (sc) { introduce(sc, budget, tick); });
    seen.forEach(function (sc) {
      if (!drawTrack(sc, now, budget, stride, tick, false)) return;
      drew++;
      if (sc.busy) repaint(sc);
    });
    if (drew && !still) account(performance.now() - began);
  }

  // A lane never drawn gets a still frame; so does a mixed crew's athlete whose last pose is of another animation, which
  // team() would not show. A team doing one animation keeps its last pose, as it always did.
  function introduce(sc, budget, tick) {
    sc.lanes.forEach(function (one) {
      if (one.on === false) return;
      var people = crew(sc.L, one.state.p.slot, one.at, tick, still).people;
      var mixed = people.some(function (p) { return p.anim !== one.at.anim; });
      one.team.forEach(function (who, i) {
        var anim = people[i].anim;
        if (one.last[i] && (!mixed || one.last[i].anim === anim)) return;
        one.last[i] = athlete(anim, ANIMS[anim].still, who, one.tc, budget) || one.last[i];
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
      introduce(sc, budget, Math.floor(now * FPS / 1000));
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
  var labels = { sync: "SINCRO" };

  function sync(heats, options) {
    var chosen = options && STYLES[options.style] ? options.style : "det", now = Date.now(), keep = new Set();
    if (options && options.onLevel) onLevel = options.onLevel;
    if (options && options.onView) onView = options.onView;
    if (options && options.words && options.words.sync) labels = { sync: String(options.words.sync) };
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
      return {
        lane: one.lane, slot: one.state.p.slot, round: one.state.p.round, anim: one.at.anim, moving: one.at.moving, back: !!one.at.back,
        tag: one.tag || "", sync: !!(one.crew && one.crew.sync), z: one.at.z, ring: one.ring || null,
      };
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
    sprite: sprite,
    // Where an athlete faces in a frame, in radians: 0 down the lane, PI back; the tests read a turn from it.
    facing: function (id, t) { var p = ANIMS[id].pose(t); return (p.flip ? Math.PI : 0) + (p.yaw || 0); },
    anim: function (id) { var a = ANIMS[id]; return a && { N: a.N, still: a.still, rig: !!a.rig }; },
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
    crew: crew,
    rigs: rigs,
    rigGaps: rigGaps,
    holdOf: holdOf,
    census: census,
    travel: travel,
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
