// The voxel athletes drawn in each lane's stage on the Live heat card. live.js loads this only once a heat is running in
// the «Visual» view, and calls CatchUpAvatars.sync after every redraw. The stage is decoration (aria-hidden): the lane's
// text, bar and times stay the source of truth, so anything that goes wrong here only leaves the stage empty.
// Decisions: agents/docs/DECISIONS.md, 2026-11-21 «voxel athletes».
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

  // ---- Where the team stands, and the run between pieces of the bar

  // x is a fraction of the bar's width: the centre of a piece, 0 for the start line.
  function plan(lane) {
    var total = lane.total || 0;
    if (!total) return { x: 0.5, anim: "idle" };
    if (lane.blank) return { x: 0, anim: "idle" };
    if (lane.closed || lane.current < 0) {
      var at = Math.max(1, Math.min(lane.done || 0, total));
      return { x: (at - 0.5) / total, anim: "idle" };
    }
    return { x: (lane.current + 0.5) / total, anim: movementOf(lane.phase).anim };
  }

  var RUN_MS = 2400;
  var RUN_MIN = 600;
  var RUN_MOST = 2000;

  function advance(prev, next, now) {
    if (!prev) return { from: next.x, to: next.x, t0: now, t1: now, anim: next.anim };
    if (Math.abs(next.x - prev.to) < 1e-6) return { from: prev.from, to: prev.to, t0: prev.t0, t1: prev.t1, anim: next.anim };
    var x = at(prev, now).x;
    var ms = Math.max(RUN_MIN, Math.min(RUN_MOST, Math.abs(next.x - x) * RUN_MS));
    return { from: x, to: next.x, t0: now, t1: now + ms, anim: next.anim };
  }

  function at(state, now) {
    if (now < state.t1) {
      var s = (now - state.t0) / (state.t1 - state.t0);
      var eased = s * s * (3 - 2 * s);
      return { x: state.from + (state.to - state.from) * eased, anim: "run", running: true, right: state.to >= state.from };
    }
    return { x: state.to, anim: state.anim, running: false, right: true };
  }

  // ---- Phone safety

  // Above this average time per drawn frame the stage steps down: every other frame, then every fourth, then nothing.
  var BUDGET_MS = 20;
  var LEVELS = 3;

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
  // every entry on its own. `still` is the frame shown to visitors who ask for less motion; `step` the team's spacing in
  // voxels; `bar` draws a loaded barbell in the hands, `rig` a pull-up station; `rise` lifts the team's floor, in
  // pixels, for a movement that lies down towards the viewer.
  var ANIMS = {};
  function register(id, def) { ANIMS[id] = def; }
  register("run", { N: 16, pose: run, step: [12, -6], still: 4 });
  register("snatch", { N: 40, pose: spline(SNATCH, 40), step: [10, -12], bar: 1, still: 24 });
  register("burpee", { N: 36, pose: withArms(spline(BURPEE, 36), [0.9, -0.25, -0.6]), step: [11, -11], rise: 10, still: 29 });
  register("pullup", { N: 28, pose: spline(PULL, 28), step: [10, -10], rig: 1, still: 14 });
  register("squat", { N: 24, pose: spline(SQUAT, 24), step: [11, -7], still: 12 });
  register("generic", { N: 24, pose: spline(GENERIC, 24), step: [11, -7], still: 12 });
  register("idle", { N: 16, pose: spline(IDLE, 16), step: [11, -7], still: 0 });

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

  // A man stands about 70 px tall on the stage, a woman about 6% less; a team on pull-up stations fits its 120 px.
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
  function put(x, y, z, c) {
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

  // ---- The stages

  var STAGE_HEIGHT = 120;
  // A voxel is 2 px, one backing pixel per CSS pixel, scaled up crisp by the stylesheet: a frame costs a quarter of a
  // sharper canvas, so the cache holds a whole screen of lanes on a phone.
  var VOXEL = 2;
  // From the stage's bottom to the floor the athletes stand on: room for the front athlete's feet and shadow.
  var FLOOR = 14;
  // Half an athlete's width on the stage, arms out, to keep the team inside it.
  var ATHLETE_HALF = 26;
  var FPS = 12;
  var BAKE_MS = 8;
  var MEMORY = 24 << 20;
  var WINDOW = 24;

  var cache = new Lru(MEMORY);
  var lanes = new Map();
  var styleId = "det";
  var level = 0;
  var timer = null;
  var tick = 0;
  var spent = [];
  var frames = 0;
  var still = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  // What the observer has said about each canvas: in sight or not. One it has not reported on yet is drawn.
  var inSight = new Map();
  var watcher = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { inSight.set(entry.target, entry.isIntersecting); });
    start();
  }) : null;

  // Stepping down: every other frame, then every fourth, then no stage at all.
  function stride() { return [1, 2, 4][Math.min(level, 2)]; }

  function entry(mvId, frame, v, tc, budget) {
    var key = [styleId, mvId, frame, v.woman ? 1 : 0, v.skin, v.hair, v.cut, v.n, tc].join(":");
    var hit = cache.get(key);
    if (hit) return hit.value;
    if (budget && budget.left() <= 0) return null;
    var sty = STYLES[styleId], mv = ANIMS[mvId], g = v.woman ? 1 : 0, P = poseOf(sty, g, mv, frame);
    ln = 0;
    raster(sty, v, mv, P, tc, P.py - poseOf(sty, g, mv, frame - 1).py);
    var baked = bake(sty, camera(VOXEL));
    cache.put(key, baked, baked.bytes);
    return baked;
  }

  function draw(one, now, budget) {
    var cv = one.canvas;
    if (!cv.isConnected) return false;
    var width = cv.clientWidth || cv.parentNode.clientWidth;
    if (!width) return false;
    if (cv.width !== width || cv.height !== STAGE_HEIGHT) {
      cv.width = width;
      cv.height = STAGE_HEIGHT;
    }
    var ctx = cv.getContext("2d"), E = camera(VOXEL).e;
    var spot = still ? { x: one.state.to, anim: one.state.anim, running: false, right: true } : at(one.state, now);
    var mv = ANIMS[spot.anim] || ANIMS.generic, N = mv.N, size = one.team.length;
    var step = mv.step, spread = 1;
    // The team spans at most 60% of the stage; pull-up stations keep their spacing, or they would overlap.
    var span = Math.abs((size - 1) * (E[0][0] * step[0] + E[2][0] * step[1]));
    if (!mv.rig && span > 0) spread = Math.min(1, (0.6 * cv.width) / span);
    var placed = [], missing = false;
    for (var i = 0; i < size; i++) {
      var c = i - (size - 1) / 2, gx = Math.round(c * step[0] * spread), gz = Math.round(c * step[1] * spread);
      var frame = still ? mv.still : (((Math.floor(tick / stride()) * stride() + i * (N >> 2)) % N) + N) % N;
      frame -= frame % stride();
      var baked = entry(spot.anim, frame, assign({ n: i % 4 }, one.team[i]), one.tc, still ? null : budget);
      if (!baked) {
        baked = one.last[i];
        missing = true;
      } else if (one.last[i] !== baked) one.last[i] = baked;
      if (baked) placed.push({ gx: gx, gz: gz, dx: E[0][0] * gx + E[2][0] * gz, dy: E[0][1] * gx + E[2][1] * gz, e: baked });
    }
    placed.sort(function (a, b) { return a.gx + a.gz - (b.gx + b.gz); });
    // Placed by the formation, never by a frame's own size, so the team neither bobs nor slides as it moves. The floor
    // line stays put: a jump's raised hands may touch the top.
    var reach = Math.abs((size - 1) / 2 * (E[0][0] * step[0] + E[2][0] * step[1]) * spread);
    var half = reach + ATHLETE_HALF, mid = 0;
    var oy = cv.height - FLOOR - (mv.rise || 0);
    var cx = clamp(spot.x * cv.width, half + 2, Math.max(half + 2, cv.width - half - 2));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    // The camera looks at their left side, so drawn as they are they face left: mirrored, they face the way the bar fills.
    var face = spot.right ? -1 : 1;
    ctx.setTransform(face, 0, 0, 1, cx - face * mid, oy);
    placed.forEach(function (p) { ctx.drawImage(p.e.sh, p.e.sx + p.dx, p.e.sy + p.dy); });
    placed.forEach(function (p) { ctx.drawImage(p.e.cv, p.e.x + p.dx, p.e.y + p.dy); });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    one.complete = !missing;
    return placed.length > 0;
  }

  // The observer's last word can be stale where the browser renders no frames (a headless one, a page coming back from
  // the background): a lane it calls out of sight is measured once more before being skipped.
  function visible(one) {
    if (inSight.get(one.canvas) !== false) return true;
    var r = one.canvas.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < (window.innerHeight || 0) && r.right > 0 && r.left < (window.innerWidth || 0);
  }

  // With less motion each lane is drawn once per place, size and style; the loop then only looks, twice a second.
  function stillKey(one) { return [one.canvas.clientWidth, styleId, one.state.to, one.state.anim, one.team.length, one.tc].join(":"); }

  function loop() {
    timer = null;
    if (document.hidden || level >= LEVELS) return;
    var began = performance.now(), deadline = began + BAKE_MS;
    var budget = { left: function () { return deadline - performance.now(); } };
    var drew = 0;
    lanes.forEach(function (one) {
      if (!visible(one)) return;
      if (still) {
        var key = stillKey(one);
        if (one.still !== key && draw(one, Date.now(), null) && one.complete) one.still = key;
        return;
      }
      if (draw(one, Date.now(), budget)) drew++;
    });
    tick++;
    if (drew) {
      var took = performance.now() - began;
      frames++;
      spent.push(took);
      samples.push(took);
      if (samples.length > 120) samples.shift();
      if (spent.length >= WINDOW) {
        var next = degrade(level, mean(spent));
        spent = [];
        if (next !== level) {
          level = next;
          // Out of budget even so: the stages empty, and the stylesheet folds them away.
          if (level >= LEVELS) lanes.forEach(function (one) { if (one.canvas.parentNode) one.canvas.parentNode.removeChild(one.canvas); });
        }
      }
    }
    start();
  }
  var samples = [];
  function mean(list) { return list.length ? list.reduce(function (a, b) { return a + b; }, 0) / list.length : 0; }

  function start() {
    if (timer !== null || document.hidden || level >= LEVELS || !lanes.size) return;
    timer = setTimeout(loop, still ? 500 : (1000 / FPS) * stride());
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      clearTimeout(timer);
      timer = null;
    } else start();
  });

  // Called by live.js after every redraw with the lanes now on the card: their stages are new nodes, so each lane's
  // canvas moves into its new stage and keeps its state, and a lane whose phase changed runs to its new piece.
  function sync(stages, options) {
    var chosen = options && STYLES[options.style] ? options.style : "det";
    if (chosen !== styleId) {
      styleId = chosen;
      lanes.forEach(function (one) { one.last = []; });
    }
    var now = Date.now(), keep = new Set();
    (stages || []).forEach(function (s) {
      keep.add(s.key);
      var one = lanes.get(s.key);
      if (!one) {
        var cv = document.createElement("canvas");
        cv.className = "lane-avatars";
        cv.style.height = STAGE_HEIGHT + "px";
        one = { canvas: cv, state: null, last: [] };
        lanes.set(s.key, one);
        if (watcher) watcher.observe(cv);
      }
      one.team = teamOf(s.heat, s.laneId);
      one.tc = LANE_COLOURS.indexOf(colourOf(s.lane));
      one.state = advance(one.state, plan(s), now);
      if (level < LEVELS && one.canvas.parentNode !== s.stage) s.stage.appendChild(one.canvas);
    });
    lanes.forEach(function (one, key) {
      if (keep.has(key)) return;
      if (watcher) watcher.unobserve(one.canvas);
      inSight.delete(one.canvas);
      lanes.delete(key);
    });
    start();
  }

  function stats() {
    return { frames: frames, averageMs: mean(samples), samples: samples.slice(), level: level, bytes: cache.bytes, cached: cache.map.size, still: still };
  }

  window.CatchUpAvatars = {
    sync: sync,
    stats: stats,
    STYLES: STYLE_IDS.slice(),
    MOVES: MOVES.map(function (row) { return { name: row[0], anim: row[1], approx: !!row[2] }; }),
    ANIMS: Object.keys(ANIMS),
    register: register,
    movementOf: movementOf,
    teamOf: teamOf,
    colourOf: colourOf,
    plan: plan,
    advance: advance,
    at: at,
    degrade: degrade,
    Lru: Lru,
    verify: verify,
    BUDGET_MS: BUDGET_MS,
    MEMORY: MEMORY,
  };
})();
