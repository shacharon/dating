/**
 * Minimal matches API smoke (HTTP). Usage:
 *   MATCHES_SMOKE_BASE_URL=http://127.0.0.1:3001 node scripts/matches-api-smoke.mjs
 */
const BASE = (process.env.MATCHES_SMOKE_BASE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');

/** @type {{ name: string; pass: boolean; detail?: string }[]} */
const rows = [];

function row(name, pass, detail) {
  rows.push({ name, pass, detail: detail && !pass ? detail : undefined });
}

function hasOwn(o, k) {
  return o != null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
}

const TIMEOUT_MS = Number(process.env.MATCHES_SMOKE_TIMEOUT_MS || 10000);

async function req(method, path, body) {
  const url = `${BASE}${path}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  const init = {
    method,
    headers: body != null ? { 'Content-Type': 'application/json' } : {},
    body: body != null ? JSON.stringify(body) : undefined,
    signal: ac.signal,
  };
  let res;
  try {
    res = await fetch(url, init);
  } finally {
    clearTimeout(t);
  }
  let json;
  const raw = await res.text();
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = { _nonJson: raw.slice(0, 200) };
  }
  return { url, status: res.status, json };
}

async function main() {
  // --- List JSON shape ---
  const list = await req('GET', '/api/v1/matches');
  let listOk =
    list.status === 200 &&
    list.json &&
    list.json.ok === true &&
    Array.isArray(list.json.items);
  if (listOk && list.json.items.length > 0) {
    const it = list.json.items[0];
    const baseKeys = ['matchId', 'a', 'b', 'overall', 'updatedAt', 'dealbreakers', 'shortReason'];
    for (const k of baseKeys) {
      if (!hasOwn(it, k)) {
        listOk = false;
        row('List JSON shape', false, `missing item.${k}`);
        break;
      }
    }
    if (listOk) row('List JSON shape', true);
  } else if (listOk) {
    row('List JSON shape', true, '(empty items[])');
  } else {
    row('List JSON shape', false, `${list.status} ${list.url}`);
  }

  // --- Top previews ---
  const top = await req('GET', '/api/v1/matches/top');
  const topOk =
    top.status === 200 &&
    top.json &&
    top.json.ok === true &&
    Array.isArray(top.json.matches) &&
    (top.json.matches.length === 0 ||
      (hasOwn(top.json.matches[0], 'id') &&
        hasOwn(top.json.matches[0], 'compatibilityScore') &&
        hasOwn(top.json.matches[0], 'name')));
  row('Top previews', topOk, topOk ? undefined : `${top.status} ${top.url}`);

  // --- HG optional: all three or none on list items (sample) ---
  let hgOk = list.status === 200 && Array.isArray(list.json?.items);
  if (hgOk) {
    for (const it of list.json.items.slice(0, 20)) {
      const hasM = hasOwn(it, 'hgMutualPass');
      const hasO = hasOwn(it, 'hgOverallStatus');
      const hasR = hasOwn(it, 'hgRankScore');
      if (hasM !== hasO || hasM !== hasR) {
        hgOk = false;
        row('HG optional fields (list)', false, 'partial HG keys on item');
        break;
      }
    }
  }
  if (hgOk) row('HG optional fields (list)', true);

  // --- Gate-off default: list 200 (no env flip in this script; assumes gate not forced on server) ---
  row('Gate-off default (list 200)', list.status === 200, list.status !== 200 ? `${list.status}` : undefined);

  // --- Detail 404 ---
  const d404 = await req('GET', '/api/v1/matches/__not_a_real_match_id__');
  row('Detail 404', d404.status === 404, `${d404.status} ${d404.url}`);

  // --- Detail 200 + compare (need pair from list) ---
  let matchId = null;
  let aId = null;
  let bId = null;
  if (list.json?.items?.length) {
    const it = list.json.items[0];
    matchId = it.matchId;
    aId = it.a?.id;
    bId = it.b?.id;
  }

  if (matchId) {
    const d200 = await req('GET', `/api/v1/matches/${encodeURIComponent(matchId)}`);
    const bodyOk =
      d200.status === 200 &&
      d200.json &&
      d200.json.ok === true &&
      d200.json.id === matchId &&
      typeof d200.json.score === 'number' &&
      hasOwn(d200.json, 'children_unsure');
    let hgDetailOk = true;
    if (bodyOk) {
      const hasM = hasOwn(d200.json, 'hgMutualPass');
      const hasO = hasOwn(d200.json, 'hgOverallStatus');
      const hasR = hasOwn(d200.json, 'hgRankScore');
      if (hasM !== hasO || hasM !== hasR) {
        hgDetailOk = false;
      }
    }
    row('Detail 200', bodyOk, bodyOk ? undefined : `${d200.status}`);
    row('HG optional fields (detail)', hgDetailOk && bodyOk, !hgDetailOk ? 'partial HG keys' : !bodyOk ? 'skip' : undefined);
  } else {
    row('Detail 200', false, 'no matchId from list');
    row('HG optional fields (detail)', false, 'skipped');
  }

  if (aId && bId) {
    const cmp = await req('POST', '/api/v1/matches/compare', { aId, bId });
    const j = cmp.json;
    const okPost = cmp.status === 200 || cmp.status === 201;
    const guard =
      okPost &&
      j &&
      j.ok === true &&
      (j.status === 'NOT_ANALYZED' || j.status === 'INSUFFICIENT_DATA') &&
      j.matchId &&
      j.message;
    const ready =
      okPost && j && j.ok === true && j.status === 'READY' && j.match && j.match.matchId;
    row('Compare READY or guard', ready || guard, `${cmp.status} body.ok=${j?.ok} status=${j?.status}`);
  } else {
    row('Compare READY or guard', false, 'no aId/bId from list');
  }

  for (const r of rows) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}\t${r.name}${r.detail ? `\t${r.detail}` : ''}`);
  }
  if (rows.some((r) => !r.pass)) {
    const bad = rows.filter((r) => !r.pass).map((r) => r.detail || r.name);
    console.log(`FAILING:\t${bad.join(' | ')}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.log(`FAIL\tHTTP bootstrap\t${e?.message || e}`);
  process.exit(1);
});
