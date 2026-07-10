import { cryptoShuffle } from './helpers';

export function separarAtletasSorteio(presentes, numTeams, ppt) {
  const normais = presentes.filter(a => !a.isConvidado);
  const convidados = presentes.filter(a => a.isConvidado);
  const vagasNecessarias = numTeams * ppt;
  
  if (normais.length >= vagasNecessarias) {
    return {
      sorteaveis: normais,
      revezadores: convidados
    };
  } else {
    const numAvulsos = vagasNecessarias - normais.length;
    const avulsos = convidados.slice(0, numAvulsos);
    const revezadores = convidados.slice(numAvulsos);
    return {
      sorteaveis: [...normais, ...avulsos],
      revezadores: revezadores
    };
  }
}

export function agruparUnidades(players) {
  const unidades = [];
  const visitados = new Set();
  
  const getAtletaId = (p) => {
    if (!p) return "";
    return String(p.id || p.atleta_id || p.idAtleta || "");
  };

  players.forEach(p => {
    const pId = getAtletaId(p);
    if (!pId || visitados.has(pId)) return;
    
    if (p.isConvidado && p.convidadoDe) {
      const host = players.find(x => getAtletaId(x) === String(p.convidadoDe));
      if (host) {
        const hostId = getAtletaId(host);
        if (hostId && !visitados.has(hostId)) {
          unidades.push([host, p]);
          visitados.add(hostId);
          visitados.add(pId);
          return;
        }
      }
    }
    
    const guest = players.find(x => x.isConvidado && String(x.convidadoDe) === pId);
    if (guest) {
      const guestId = getAtletaId(guest);
      if (guestId && !visitados.has(guestId)) {
        unidades.push([p, guest]);
        visitados.add(pId);
        visitados.add(guestId);
        return;
      }
    }
    
    unidades.push([p]);
    visitados.add(pId);
  });
  
  return unidades;
}

export function drawBalancedTeams(athletes, numTeams, ppt, metodoFormacao = "igual") {
  const shuffled = cryptoShuffle(athletes);

  const sortedAthletes = shuffled.sort((a, b) => {
    const s1 = a.habilidade || a.skill || 3;
    const s2 = b.habilidade || b.skill || 3;
    return s2 - s1;
  });

  let tamanhosDesejados = [];
  let numTeamsReal = numTeams;

  if (metodoFormacao === "completo") {
    numTeamsReal = Math.min(numTeams, Math.ceil(sortedAthletes.length / ppt));
    if (numTeamsReal < 2) numTeamsReal = Math.min(numTeams, 2);
    
    let restante = sortedAthletes.length;
    for (let i = 0; i < numTeamsReal; i++) {
      if (i === numTeamsReal - 1) {
        tamanhosDesejados.push(Math.min(ppt, restante));
      } else {
        tamanhosDesejados.push(ppt);
        restante -= ppt;
      }
    }
  } else {
    const totalDisponivel = Math.min(sortedAthletes.length, numTeams * ppt);
    const baseCount = Math.floor(totalDisponivel / numTeams);
    const resto = totalDisponivel % numTeams;
    tamanhosDesejados = Array.from({ length: numTeams }, (_, i) => 
      baseCount + (i < resto ? 1 : 0)
    );
  }

  const teams = Array.from({ length: numTeamsReal }, (_, i) => ({
    name: "Time " + (i + 1),
    players: [],
    skillSum: 0
  }));

  const atletasDisponiveis = [...sortedAthletes];
  let direction = 1;
  
  while (atletasDisponiveis.length > 0) {
    let colocouAlgum = false;
    const startIdx = direction === 1 ? 0 : numTeamsReal - 1;
    const endIdx = direction === 1 ? numTeamsReal : -1;
    const step = direction === 1 ? 1 : -1;

    for (let i = startIdx; i !== endIdx; i += step) {
      const targetSize = tamanhosDesejados[i] || 0;
      if (teams[i].players.length < targetSize && atletasDisponiveis.length > 0) {
        const a = atletasDisponiveis.shift();
        teams[i].players.push(a);
        teams[i].skillSum += a.habilidade || a.skill || 3;
        colocouAlgum = true;
      }
    }

    if (!colocouAlgum) break;
    direction *= -1;
  }

  return teams;
}
