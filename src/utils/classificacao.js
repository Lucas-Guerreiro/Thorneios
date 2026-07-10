import { cryptoShuffle } from './helpers';

export function initStandings(teams) {
  return teams.map(n => ({ name: n, pts: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0 }));
}

export function recalcStandings(teams, rounds) {
  const st = initStandings(teams);
  rounds.forEach(rd => rd.matches.forEach(m => {
    if (!m.played) return;
    const h = st.find(x => x.name === m.home);
    const a = st.find(x => x.name === m.away);
    if (!h || !a) return;
    const hs = parseInt(m.homeScore);
    const as2 = parseInt(m.awayScore);
    h.j++; a.j++; h.gp += hs; h.gc += as2; a.gp += as2; a.gc += hs; h.sg = h.gp - h.gc; a.sg = a.gp - a.gc;
    if (hs > as2) { 
      h.v++; h.pts += 3; a.d++; 
    } else if (hs === as2) { 
      h.e++; h.pts++; a.e++; a.pts++; 
    } else { 
      a.v++; a.pts += 3; h.d++; 
    }
  }));
  return st.sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp);
}

export function generateRR(teams, turno) {
  const list = [...teams]; 
  if (list.length % 2 !== 0) list.push("_bye_");
  const rounds = list.length - 1;
  const half = list.length / 2;
  const result = []; 
  let r = [...list];
  for (let i = 0; i < rounds; i++) {
    const rm = [];
    for (let j = 0; j < half; j++) {
      const h = r[j];
      const av = r[r.length - 1 - j];
      if (h !== "_bye_" && av !== "_bye_") {
        rm.push({ home: h, away: av, homeScore: "", awayScore: "", played: false, date: "" });
      }
    }
    result.push({ round: i + 1, matches: rm });
    r = [r[0], ...r.slice(r.length - 1), ...r.slice(1, r.length - 1)];
  }
  if (turno) {
    const ret = result.map((rd, i) => ({
      round: rounds + i + 1,
      matches: rd.matches.map(m => ({ home: m.away, away: m.home, homeScore: "", awayScore: "", played: false, date: "" }))
    }));
    return [...result, ...ret];
  }
  return result;
}

export function phaseName(n) {
  if (n === 2) return "Final";
  if (n === 4) return "Semifinal";
  if (n === 8) return "Quartas";
  if (n === 16) return "Oitavas";
  return `Fase de ${n}`;
}

export function generateKO(teams, noShuffle = false) {
  const s = noShuffle ? [...teams] : cryptoShuffle([...teams]);
  const phases = []; 
  let cur = s;
  let ph = 1;
  while (cur.length > 1) {
    const pairs = [];
    for (let i = 0; i < cur.length; i += 2) {
      if (cur[i + 1]) {
        pairs.push({ home: cur[i], away: cur[i + 1], homeScore: "", awayScore: "", played: false, winner: null, date: "" });
      }
    }
    phases.push({ phase: ph, name: phaseName(cur.length), matches: pairs, advancers: [] });
    cur = new Array(Math.ceil(cur.length / 2)).fill(null); 
    ph++;
  }
  return phases;
}
