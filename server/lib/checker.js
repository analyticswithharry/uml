"use strict";
/**
 * Marks a student's diagram against a puzzle solution.
 * Nodes are matched by name (case/space/plural-insensitive, aliases allowed),
 * so the same checker works for "connect the given boxes" and "draw it from scratch".
 */

const SYMMETRIC = new Set(["association", "er"]);
const REL_NAMES = {
  association: "association",
  aggregation: "aggregation",
  composition: "composition",
  generalization: "generalization (inheritance)",
  realization: "realization (implements)",
  dependency: "dependency",
  include: "«include»",
  extend: "«extend»",
  er: "relationship",
};
const CARD_NAMES = {
  one_only: "exactly one",
  zero_or_one: "zero or one",
  zero_or_many: "zero or many",
  one_or_many: "one or many",
  one: "exactly one",
  many: "zero or many",
};

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/s$/, "");
const keysOf = (n) =>
  [n.data && n.data.label, ...((n.data && n.data.aliases) || [])]
    .map(norm)
    .filter(Boolean);
const scorable = (n) => n.type !== "note" && n.type !== "boundary";
const labelOf = (n) => (n && n.data && n.data.label) || "?";

function memberNames(text) {
  return String(text || "")
    .split("\n")
    .map((l) => {
      const m = l.match(
        /^\s*(?:[+\-#~]\s*)?(?:(?:PK|FK|UK)\s+)?([A-Za-z_]\w*)/,
      );
      return m ? m[1] : null;
    })
    .filter(Boolean);
}

function evaluate(puzzle, solution, user) {
  const sol = solution.nodes.filter(scorable);
  const usr = (user.nodes || []).filter(scorable);
  const solToUser = new Map();
  const userToSol = new Map();
  const taken = new Set();

  for (const s of sol) {
    const keys = new Set(keysOf(s));
    const u = usr.find(
      (x) => !taken.has(x.id) && keysOf(x).some((k) => keys.has(k)),
    );
    if (u) {
      solToUser.set(s.id, u);
      userToSol.set(u.id, s);
      taken.add(u.id);
    }
  }

  const diagnostics = [];
  const tips = [];
  const nodeStatus = {};
  const edgeStatus = {};
  let earned = 0;
  let total = 0;
  let nodesFound = 0;
  let edgesOk = 0;
  let problems = 0;

  /* ---- nodes (given for free in "build" puzzles, so they carry no points there) ---- */
  const nodeWeight = puzzle.mode === "build" ? 0 : 1;
  for (const s of sol) {
    total += nodeWeight;
    const u = solToUser.get(s.id);
    if (!u) {
      problems++;
      diagnostics.push({ kind: "missing", message: `Missing: ${labelOf(s)}.` });
      continue;
    }
    nodesFound++;
    const wantKind = s.data.kind || "class";
    const haveKind = u.data.kind || "class";
    if (s.type === "umlClass" && wantKind !== haveKind) {
      earned += nodeWeight / 2;
      problems++;
      nodeStatus[u.id] = "wrong";
      diagnostics.push({
        kind: "wrong",
        message: `${labelOf(s)} should be ${article(wantKind)}, not ${article(haveKind)}.`,
      });
    } else {
      earned += nodeWeight;
      nodeStatus[u.id] = "ok";
    }
  }
  for (const u of usr) {
    if (!userToSol.has(u.id)) nodeStatus[u.id] = "unchecked";
  }

  /* ---- edges ---- */
  const claimed = new Set();
  const userEdges = (user.edges || []).filter((e) => e.source !== e.target);

  for (const se of solution.edges) {
    const type = se.data.relType;
    const hasCards =
      type === "er" && (se.data.sourceCard || se.data.targetCard);
    const weight = 2 + (hasCards ? 2 : 0);
    total += weight;
    const sn = solution.nodes.find((n) => n.id === se.source);
    const tn = solution.nodes.find((n) => n.id === se.target);
    const a = solToUser.get(se.source);
    const b = solToUser.get(se.target);
    const pair = `${labelOf(sn)} and ${labelOf(tn)}`;

    if (!a || !b) {
      problems++;
      diagnostics.push({
        kind: "missing",
        message: `Missing relationship between ${pair} (one of them is not drawn yet).`,
      });
      continue;
    }
    const cands = userEdges.filter(
      (e) =>
        !claimed.has(e.id) &&
        ((e.source === a.id && e.target === b.id) ||
          (e.source === b.id && e.target === a.id)),
    );
    if (!cands.length) {
      problems++;
      diagnostics.push({
        kind: "missing",
        message: `Missing: ${REL_NAMES[type] || type} between ${pair}.`,
      });
      continue;
    }
    const accepted = [type, ...(se.data.accept || [])];
    const dirOk = (e) =>
      SYMMETRIC.has(e.data && e.data.relType) || e.source === a.id;
    const typeOk = (e) => accepted.includes(e.data && e.data.relType);
    const pick =
      cands.find((e) => typeOk(e) && dirOk(e)) ||
      cands.find(typeOk) ||
      cands[0];
    claimed.add(pick.id);

    if (!typeOk(pick)) {
      earned += 1;
      problems++;
      edgeStatus[pick.id] = "wrong";
      diagnostics.push({
        kind: "wrong",
        message: `The line between ${pair} should be a ${REL_NAMES[type] || type}, not a ${REL_NAMES[pick.data.relType] || pick.data.relType}.`,
      });
      continue;
    }
    if (!dirOk(pick)) {
      earned += 1;
      problems++;
      edgeStatus[pick.id] = "wrong";
      diagnostics.push({
        kind: "wrong",
        message: `The ${REL_NAMES[type] || type} between ${pair} points the wrong way. It should run from ${labelOf(sn)} to ${labelOf(tn)}.`,
      });
      continue;
    }
    earned += 2;
    let ok = true;

    if (hasCards) {
      const forward = pick.source === a.id;
      const haveS = forward ? pick.data.sourceCard : pick.data.targetCard;
      const haveT = forward ? pick.data.targetCard : pick.data.sourceCard;
      const check = (want, have, entity) => {
        if (!want) return;
        if (cardKey(want) === cardKey(have)) {
          earned += 1;
        } else {
          ok = false;
          problems++;
          diagnostics.push({
            kind: "wrong",
            message: `At the ${entity} end of ${pair}: expected ${CARD_NAMES[want] || want}, you have ${have ? CARD_NAMES[have] || have : "nothing set"}.`,
          });
        }
      };
      check(se.data.sourceCard, haveS, labelOf(sn));
      check(se.data.targetCard, haveT, labelOf(tn));
    }
    edgeStatus[pick.id] = ok ? "ok" : "wrong";
    if (ok) edgesOk++;
  }

  let extras = 0;
  for (const e of userEdges) {
    if (claimed.has(e.id)) continue;
    const a = userToSol.get(e.source);
    const b = userToSol.get(e.target);
    if (a && b) {
      extras++;
      problems++;
      earned -= 1;
      edgeStatus[e.id] = "extra";
      diagnostics.push({
        kind: "extra",
        message: `Not in the scenario: ${REL_NAMES[e.data && e.data.relType] || "line"} between ${labelOf(a)} and ${labelOf(b)}.`,
      });
    } else {
      edgeStatus[e.id] = "unchecked";
    }
  }

  /* ---- advisory tips (do not affect the score) ---- */
  if (puzzle.checkMembers) {
    for (const s of sol) {
      const u = solToUser.get(s.id);
      if (!u) continue;
      if (s.type === "umlClass") {
        const have = new Set(
          [
            ...memberNames(u.data.attributes),
            ...memberNames(u.data.methods),
          ].map((x) => x.toLowerCase()),
        );
        const want = [
          ...memberNames(s.data.attributes),
          ...memberNames(s.data.methods),
        ];
        const missing = want.filter((w) => !have.has(w.toLowerCase()));
        if (missing.length)
          tips.push(
            `${labelOf(s)}: the text suggests ${missing.slice(0, 3).join(", ")}.`,
          );
      } else if (s.type === "erEntity") {
        if (!/^\s*PK\b/im.test(u.data.attributes || ""))
          tips.push(
            `${labelOf(s)} has no primary key. Add a line starting with "PK".`,
          );
      }
    }
  }

  const score = total ? Math.max(0, Math.min(1, earned / total)) : 0;
  const correct = problems === 0 && nodesFound === sol.length;
  return {
    correct,
    score: Math.round(score * 100),
    diagnostics,
    tips: tips.slice(0, 6),
    nodeStatus,
    edgeStatus,
    counts: {
      nodes: { found: nodesFound, total: sol.length },
      edges: { ok: edgesOk, total: solution.edges.length },
      extras,
    },
  };
}

function article(kind) {
  return (
    {
      class: "a class",
      abstract: "an abstract class",
      interface: "an interface",
      enum: "an enumeration",
    }[kind] || kind
  );
}
function cardKey(c) {
  return { one: "one_only", many: "zero_or_many" }[c] || c || "";
}

function check(puzzle, user) {
  const solutions = [puzzle.solution, ...(puzzle.alternatives || [])];
  let best = null;
  for (const s of solutions) {
    const r = evaluate(puzzle, s, user);
    if (
      !best ||
      (r.correct && !best.correct) ||
      (r.correct === best.correct && r.score > best.score)
    )
      best = r;
  }
  const empty = !(user.nodes && user.nodes.length);
  if (empty) {
    best.summary =
      "The canvas is empty. Add elements from the left panel first.";
  } else if (best.correct) {
    best.summary = "Fully correct. Every element and relationship matches.";
  } else if (best.score >= 70) {
    best.summary = "Close. A few details to fix.";
  } else if (best.score >= 35) {
    best.summary = "Getting there. Work through the notes below.";
  } else {
    best.summary =
      "Early stages. Read the scenario again and add the missing pieces.";
  }
  return best;
}

module.exports = { check };
