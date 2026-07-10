import { todayStr, deepClone } from './helpers';
import { agruparUnidades } from './sorteador';

export function buildInitialPeladaState(drawnTeams, bench, existingMatchLog = [], oldState = null) {
  const teams = drawnTeams.map(t => ({
    name: t.name,
    players: t.players ? t.players.map(p => ({ ...p })) : [],
    ponteiroRodizio: t.ponteiroRodizio || 0
  }));

  const queue = teams.map(t => t.name);
  const activeBench = bench ? bench.map(p => ({ ...p })) : [];
  
  const state = {
    teams,
    queue,
    bench: activeBench,
    currentMatch: null,
    matchLog: existingMatchLog || [],
    regraEmpate: oldState?.regraEmpate || null,
    empateAmbosSaem: oldState?.empateAmbosSaem || false,
    modoRodizio: oldState?.modoRodizio || "misto",
    teamBases: oldState?.teamBases || null,
    loanLocks: oldState?.loanLocks || {},
    historicoEmprestimos: oldState?.historicoEmprestimos || {},
    limiteVitorias: oldState?.limiteVitorias || 0,
    minAtletasNovoTime: oldState?.minAtletasNovoTime || null,
    destinoVencedorLimite: oldState?.destinoVencedorLimite || "finalFila"
  };

  // Preenche a base de jogadores original de cada time
  if (!state.teamBases) {
    state.teamBases = {};
    teams.forEach(t => {
      state.teamBases[t.name] = t.players
        .filter(p => !p.isTemporary && !p.isEmprestado)
        .map(p => p.id || p.atleta_id || p.idAtleta)
        .filter(Boolean)
        .map(id => String(id));
    });
  }

  return state;
}

export function obterCandidatosEmprestimoProximaPartida(ps, pptParam = null) {
  if (!ps || !ps.queue || ps.queue.length < 2) return { paraA: [], paraB: [], destaques: [] };
  const modoRodizio = ps.modoRodizio || "misto";
  if (modoRodizio !== "misto") return { paraA: [], paraB: [], destaques: [] };
  if (!ps.teamBases) return { paraA: [], paraB: [], destaques: [] };

  const jogadoresPorTime = pptParam || ps?.playersPerTeam || 4;
  const emAndamento = ps.currentMatch && !ps.currentMatch.played;

  let newTeams = ps.teams ? ps.teams.map(t => ({ ...t, players: [...t.players] })) : [];

  newTeams = newTeams.map(t => {
    const baseIds = ps.teamBases[t.name] || [];
    const todosJogadores = [];
    if (ps.teams) ps.teams.forEach(tm => todosJogadores.push(...tm.players));
    if (ps.bench) todosJogadores.push(...ps.bench);
    
    const uniquePlayers = [];
    const seenIds = new Set();
    todosJogadores.forEach(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      if (!seenIds.has(idStr)) {
        seenIds.add(idStr);
        uniquePlayers.push(p);
      }
    });
    
    const originalPlayers = baseIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
    return { ...t, players: originalPlayers };
  });

  const [a, b] = [ps.queue[0], ps.queue[1]];
  const paraA = [];
  const paraB = [];
  const destaques = [];

  if (emAndamento) {
    if (ps.queue.length < 3) return { paraA: [], paraB: [], destaques: [] };
    const proxEntrando = ps.queue[2];
    const teamEntrandoObj = newTeams.find(t => t.name === proxEntrando);
    const countEntrando = teamEntrandoObj ? teamEntrandoObj.players.length : 0;
    const isLockedEntrando = ps.loanLocks && ps.loanLocks[proxEntrando] === true;
    const precisaEntrando = isLockedEntrando ? 0 : Math.max(0, jogadoresPorTime - countEntrando);

    const teamAObj = newTeams.find(t => t.name === a);
    const teamBObj = newTeams.find(t => t.name === b);
    const countA = teamAObj ? teamAObj.players.length : 0;
    const countB = teamBObj ? teamBObj.players.length : 0;
    const isLockedA = ps.loanLocks && ps.loanLocks[a] === true;
    const isLockedB = ps.loanLocks && ps.loanLocks[b] === true;
    const precisaA = isLockedA ? 0 : Math.max(0, jogadoresPorTime - countA);
    const precisaB = isLockedB ? 0 : Math.max(0, jogadoresPorTime - countB);

    if (precisaEntrando > 0 || precisaA > 0 || precisaB > 0) {
      const totalTimes = ps.teams.length;
      
      let doadorNomeA = "";
      if (totalTimes === 3) {
        doadorNomeA = b;
      } else if (totalTimes === 4) {
        doadorNomeA = ps.queue[3];
      } else if (totalTimes === 5) {
        doadorNomeA = ps.queue[4];
      } else {
        doadorNomeA = b;
      }

      let doadorNomeB = "";
      if (totalTimes === 3) {
        doadorNomeB = a;
      } else if (totalTimes === 4) {
        doadorNomeB = ps.queue[3];
      } else if (totalTimes === 5) {
        doadorNomeB = ps.queue[4];
      } else {
        doadorNomeB = a;
      }

      const todosJogadores = [];
      if (ps.teams) ps.teams.forEach(tm => todosJogadores.push(...tm.players));
      if (ps.bench) todosJogadores.push(...ps.bench);
      const uniquePlayers = [];
      const seenIds = new Set();
      todosJogadores.forEach(p => {
        const idStr = String(p.id || p.atleta_id || p.idAtleta);
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          uniquePlayers.push(p);
        }
      });

      const obterCandidatosParaDoador = (doadorNome) => {
        const isDoadorEligible = doadorNome && doadorNome !== a && doadorNome !== b;
        if (!isDoadorEligible) {
          const deForaName = ps.queue.slice(3).find(n => n !== a && n !== b);
          if (deForaName) {
            const baseIds = ps.teamBases[deForaName] || [];
            return baseIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
          }
          return [];
        }
        const baseIds = ps.teamBases[doadorNome] || [];
        return baseIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
      };

      const candidatosA = obterCandidatosParaDoador(doadorNomeA);
      const candidatosB = obterCandidatosParaDoador(doadorNomeB);

      const ultimaPartida = ps.matchLog && ps.matchLog.length > 0 ? ps.matchLog[ps.matchLog.length - 1] : null;
      const idJogadoresUltimaPartida = [];
      if (ultimaPartida) {
        const tA = newTeams.find(t => t.name === ultimaPartida.teamA);
        const tB = newTeams.find(t => t.name === ultimaPartida.teamB);
        if (tA) idJogadoresUltimaPartida.push(...tA.players.map(p => String(p.id || p.atleta_id || p.idAtleta)));
        if (tB) idJogadoresUltimaPartida.push(...tB.players.map(p => String(p.id || p.atleta_id || p.idAtleta)));
        if (ultimaPartida.teamAEmprestados) idJogadoresUltimaPartida.push(...ultimaPartida.teamAEmprestados.map(id => String(id)));
        if (ultimaPartida.teamBEmprestados) idJogadoresUltimaPartida.push(...ultimaPartida.teamBEmprestados.map(id => String(id)));
      }

      const historicoEmprestimos = ps.historicoEmprestimos || {};
      const sortCandidatos = (list) => {
        list.sort((p1, p2) => {
          const id1 = String(p1.id || p1.atleta_id || p1.idAtleta);
          const id2 = String(p2.id || p2.atleta_id || p2.idAtleta);
          const jogouUltima1 = idJogadoresUltimaPartida.includes(id1) ? 1 : 0;
          const jogouUltima2 = idJogadoresUltimaPartida.includes(id2) ? 1 : 0;
          if (jogouUltima1 !== jogouUltima2) {
            return jogouUltima1 - jogouUltima2;
          }
          const count1 = historicoEmprestimos[id1] || 0;
          const count2 = historicoEmprestimos[id2] || 0;
          return count1 - count2;
        });
      };

      sortCandidatos(candidatosA);
      sortCandidatos(candidatosB);

      let offsetA = 0;
      const empA = [];
      for (let i = 0; i < precisaA && offsetA < candidatosA.length; i++) {
        empA.push(candidatosA[offsetA++]);
      }
      for (let i = 0; i < precisaEntrando && offsetA < candidatosA.length; i++) {
        paraA.push(candidatosA[offsetA++]);
      }

      let offsetB = 0;
      const empB = [];
      for (let i = 0; i < precisaB && offsetB < candidatosB.length; i++) {
        empB.push(candidatosB[offsetB++]);
      }
      for (let i = 0; i < precisaEntrando && offsetB < candidatosB.length; i++) {
        paraB.push(candidatosB[offsetB++]);
      }

      const todosDestaques = [...empA, ...paraA, ...empB, ...paraB];
      const seen = new Set();
      todosDestaques.forEach(p => {
        const idStr = String(p.id || p.atleta_id || p.idAtleta);
        if (!seen.has(idStr)) {
          seen.add(idStr);
          destaques.push(p);
        }
      });
    }
  } else {
    const teamAObj = newTeams.find(t => t.name === a);
    const teamBObj = newTeams.find(t => t.name === b);
    const countA = teamAObj ? teamAObj.players.length : 0;
    const countB = teamBObj ? teamBObj.players.length : 0;
    const precisaA = Math.max(0, jogadoresPorTime - countA);
    const precisaB = Math.max(0, jogadoresPorTime - countB);

    if (precisaA > 0 || precisaB > 0) {
      let doadorNome = "";
      const totalTimes = ps.teams.length;
      if (totalTimes === 3) {
        doadorNome = ps.queue[ps.queue.length - 1];
      } else if (totalTimes === 4) {
        doadorNome = ps.queue[3];
      } else if (totalTimes === 5) {
        doadorNome = ps.queue[4];
      } else {
        doadorNome = ps.queue[ps.queue.length - 1];
      }

      const isDoadorEligible = doadorNome && doadorNome !== a && doadorNome !== b;

      let candidatos = [];
      if (isDoadorEligible) {
        const baseIds = ps.teamBases[doadorNome] || [];
        const todosJogadores = [];
        if (ps.teams) ps.teams.forEach(tm => todosJogadores.push(...tm.players));
        if (ps.bench) todosJogadores.push(...ps.bench);
        
        const uniquePlayers = [];
        const seenIds = new Set();
        todosJogadores.forEach(p => {
          const idStr = String(p.id || p.atleta_id || p.idAtleta);
          if (!seenIds.has(idStr)) {
            seenIds.add(idStr);
            uniquePlayers.push(p);
          }
        });
        
        candidatos = baseIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
      }

      const ultimaPartida = ps.matchLog && ps.matchLog.length > 0 ? ps.matchLog[ps.matchLog.length - 1] : null;
      const idJogadoresUltimaPartida = [];
      if (ultimaPartida) {
        const tA = newTeams.find(t => t.name === ultimaPartida.teamA);
        const tB = newTeams.find(t => t.name === ultimaPartida.teamB);
        if (tA) idJogadoresUltimaPartida.push(...tA.players.map(p => String(p.id || p.atleta_id || p.idAtleta)));
        if (tB) idJogadoresUltimaPartida.push(...tB.players.map(p => String(p.id || p.atleta_id || p.idAtleta)));
        if (ultimaPartida.teamAEmprestados) idJogadoresUltimaPartida.push(...ultimaPartida.teamAEmprestados.map(id => String(id)));
        if (ultimaPartida.teamBEmprestados) idJogadoresUltimaPartida.push(...ultimaPartida.teamBEmprestados.map(id => String(id)));
      }

      const historicoEmprestimos = ps.historicoEmprestimos || {};

      candidatos.sort((p1, p2) => {
        const id1 = String(p1.id || p1.atleta_id || p1.idAtleta);
        const id2 = String(p2.id || p2.atleta_id || p2.idAtleta);
        const jogouUltima1 = idJogadoresUltimaPartida.includes(id1) ? 1 : 0;
        const jogouUltima2 = idJogadoresUltimaPartida.includes(id2) ? 1 : 0;
        if (jogouUltima1 !== jogouUltima2) {
          return jogouUltima1 - jogouUltima2;
        }
        const count1 = historicoEmprestimos[id1] || 0;
        const count2 = historicoEmprestimos[id2] || 0;
        return count1 - count2;
      });

      let offset = 0;
      for (let i = 0; i < precisaA && offset < candidatos.length; i++) {
        paraA.push(candidatos[offset++]);
      }
      for (let i = 0; i < precisaB && offset < candidatos.length; i++) {
        paraB.push(candidatos[offset++]);
      }
      destaques.push(...paraA, ...paraB);
    }
  }

  return { paraA, paraB, destaques };
}

export function obterTimeDoador(ps) {
  if (!ps || !ps.queue || ps.queue.length < 3) return null;
  const numTimesAtivos = ps.queue.length;
  const fila = ps.queue.slice(2);
  let idxFila = -1;
  if (numTimesAtivos === 3) {
    idxFila = 0;
  } else if (numTimesAtivos === 4) {
    idxFila = 1;
  } else if (numTimesAtivos >= 5) {
    idxFila = 2;
  }
  
  if (idxFila >= 0 && idxFila < fila.length) {
    return fila[idxFila];
  }
  return null;
}

export function startNextMatch(ps, dataRealizacaoId = "", pptParam = null) {
  if (!ps || ps.queue.length < 2) return ps;
  const [a, b] = [ps.queue[0], ps.queue[1]];
  const modoRodizio = ps.modoRodizio || "misto";
  const jogadoresPorTime = pptParam || ps?.playersPerTeam || 4;

  let newTeams = ps.teams ? ps.teams.map(t => ({ ...t, players: [...t.players] })) : [];
  let teamAEmprestados = [];
  let teamBEmprestados = [];

  if (modoRodizio === "misto" && ps.teamBases) {
    newTeams = newTeams.map(t => {
      const baseIds = ps.teamBases[t.name] || [];
      const todosJogadores = [];
      if (ps.teams) ps.teams.forEach(tm => todosJogadores.push(...tm.players));
      if (ps.bench) todosJogadores.push(...ps.bench);
      
      const uniquePlayers = [];
      const seenIds = new Set();
      todosJogadores.forEach(p => {
        const idStr = String(p.id || p.atleta_id || p.idAtleta);
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          uniquePlayers.push(p);
        }
      });
      
      const originalPlayers = baseIds.map(id => {
        const found = uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id));
        if (found) {
          const clean = { ...found };
          delete clean.isEmprestado;
          delete clean.isTemporary;
          delete clean.originalTeamId;
          delete clean.originalTeamName;
          return clean;
        }
        return null;
      }).filter(Boolean);
      return { ...t, players: originalPlayers };
    });
  }

  const teamAObj = newTeams.find(t => t.name === a);
  const teamBObj = newTeams.find(t => t.name === b);

  const donorTeamName = obterTimeDoador(ps);
  if (donorTeamName) {
    const donorTeam = newTeams.find(t => t.name === donorTeamName);
    if (donorTeam && donorTeam.players && donorTeam.players.length > 0) {
      const M = donorTeam.players.length;
      let pointer = donorTeam.ponteiroRodizio || 0;
      pointer = pointer % M;

      const neededA = Math.max(0, jogadoresPorTime - (teamAObj?.players?.length || 0));
      const neededB = Math.max(0, jogadoresPorTime - (teamBObj?.players?.length || 0));

      if (neededA > 0 && teamAObj) {
        const selectedA = [];
        for (let i = 0; i < neededA; i++) {
          const idx = (pointer + i) % M;
          selectedA.push(donorTeam.players[idx]);
        }
        pointer = (pointer + neededA) % M;
        const clonedA = selectedA.map(p => ({
          ...p,
          isEmprestado: true,
          isTemporary: true,
          originalTeamId: donorTeamName,
          originalTeamName: donorTeamName,
          origTeam: donorTeamName
        }));
        newTeams = newTeams.map(t => t.name === a ? { ...t, players: [...t.players, ...clonedA] } : t);
        teamAEmprestados = clonedA.map(p => p.id || p.atleta_id || p.idAtleta);
      }

      if (neededB > 0 && teamBObj) {
        const selectedB = [];
        for (let i = 0; i < neededB; i++) {
          const idx = (pointer + i) % M;
          selectedB.push(donorTeam.players[idx]);
        }
        pointer = (pointer + neededB) % M;
        const clonedB = selectedB.map(p => ({
          ...p,
          isEmprestado: true,
          isTemporary: true,
          originalTeamId: donorTeamName,
          originalTeamName: donorTeamName,
          origTeam: donorTeamName
        }));
        newTeams = newTeams.map(t => t.name === b ? { ...t, players: [...t.players, ...clonedB] } : t);
        teamBEmprestados = clonedB.map(p => p.id || p.atleta_id || p.idAtleta);
      }

      newTeams = newTeams.map(t => t.name === donorTeamName ? { ...t, ponteiroRodizio: pointer } : t);
    }
  }

  const updatedTeamAObj = newTeams.find(t => t.name === a);
  const updatedTeamBObj = newTeams.find(t => t.name === b);
  const defaultGoleiroA = updatedTeamAObj?.players?.find(p => p.goleiro || p.isGoalkeeper)?.id || "";
  const defaultGoleiroB = updatedTeamBObj?.players?.find(p => p.goleiro || p.isGoalkeeper)?.id || "";

  let defaultSecs = 600;
  if (typeof window !== "undefined") {
    const timerKey = `pelada_${dataRealizacaoId || ps.currentMatch?.dataRealizacaoId || ""}`;
    try {
      localStorage.setItem(`${timerKey}_running`, "false");
      localStorage.setItem(`${timerKey}_startTimestamp`, "");
      const savedInitial = localStorage.getItem(`${timerKey}_initial`);
      defaultSecs = savedInitial ? parseInt(savedInitial) : 600;
      localStorage.setItem(`${timerKey}_seconds`, String(defaultSecs));
    } catch (e) {
      console.warn("Erro ao manipular localStorage no timer:", e);
    }
  }

  return {
    ...ps,
    teams: newTeams,
    currentMatch: {
      id: Date.now() + "_" + Math.floor(Math.random() * 1000),
      teamA: a,
      teamB: b,
      scoreA: "",
      scoreB: "",
      date: todayStr(),
      dataRealizacaoId,
      played: false,
      goleiroA: defaultGoleiroA,
      goleiroB: defaultGoleiroB,
      goleiroAInteiro: true,
      goleiroBInteiro: true,
      teamAEmprestados,
      teamBEmprestados,
      timerRunning: false,
      timerSecondsAtStart: defaultSecs,
      timerStartTimestamp: null,
      jogadoresAtrasados: []
    }
  };
}

export function deduplicarEstadoPelada(ps) {
  if (!ps || !ps.teams) return ps;
  
  const seenIds = new Set();
  
  ps.teams.forEach(t => {
    const baseIds = (ps.teamBases && ps.teamBases[t.name]) ? ps.teamBases[t.name].map(id => String(id)) : [];
    
    t.players = t.players.filter(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      
      const isEmprestadoAtivo = ps.currentMatch && (
        (ps.currentMatch.teamA === t.name && ps.currentMatch.teamAEmprestados?.map(id => String(id)).includes(idStr)) ||
        (ps.currentMatch.teamB === t.name && ps.currentMatch.teamBEmprestados?.map(id => String(id)).includes(idStr))
      );

      if (isEmprestadoAtivo) {
        return true;
      }
      
      if (baseIds.includes(idStr)) {
        seenIds.add(idStr);
        return true;
      }
      
      if (seenIds.has(idStr)) {
        return false;
      }
      
      let pertenceAOutroTime = false;
      if (ps.teamBases) {
        Object.keys(ps.teamBases).forEach(tName => {
          if (tName !== t.name) {
            const outroBaseIds = ps.teamBases[tName].map(id => String(id));
            if (outroBaseIds.includes(idStr)) {
              pertenceAOutroTime = true;
            }
          }
        });
      }
      
      if (pertenceAOutroTime) {
        return false;
      }
      
      seenIds.add(idStr);
      return true;
    });
  });
  
  if (ps.bench) {
    ps.bench = ps.bench.filter(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      if (seenIds.has(idStr)) {
        return false;
      }
      seenIds.add(idStr);
      return true;
    });
  }
  
  return ps;
}

export function getVitoriasSeguidas(matchLog, teamName, dataRealizacaoId) {
  let vitorias = 0;
  const partidasDoDia = (matchLog || []).filter(m => m.played && String(m.dataRealizacaoId) === String(dataRealizacaoId));
  for (let i = partidasDoDia.length - 1; i >= 0; i--) {
    const m = partidasDoDia[i];
    if (m.winner === teamName) {
      vitorias++;
    } else {
      break;
    }
  }
  return vitorias;
}

export function resolveMatch(ps, scoreA, scoreB, dataRealizacaoId = "") {
  const sA = parseInt(scoreA);
  const sB = parseInt(scoreB);
  
  const regraEmpate = ps.regraEmpate || (ps.empateAmbosSaem === true ? "ambosSaem" : "campeaoFica");
  const limiteVitorias = parseInt(ps.limiteVitorias) || 0;
  
  let winner = "";
  let loser = "";
  let ambosSairamEmpate = false;
  let vencedorAtingiuLimite = false;
  
  if (sA === sB) {
    if (regraEmpate === "ambosSaem") {
      ambosSairamEmpate = true;
      winner = "Empate (Ambos Saíram)";
      loser = "Ambos";
    } else if (regraEmpate === "desafianteFica") {
      winner = ps.currentMatch.teamB;
      loser = ps.currentMatch.teamA;
    } else if (regraEmpate === "manual") {
      const vencedorEscolhido = ps.currentMatch?.empateVencedorManual;
      if (vencedorEscolhido === "teamB") {
        winner = ps.currentMatch.teamB;
        loser = ps.currentMatch.teamA;
      } else {
        winner = ps.currentMatch.teamA;
        loser = ps.currentMatch.teamB;
      }
    } else {
      winner = ps.currentMatch.teamA;
      loser = ps.currentMatch.teamB;
    }
  } else {
    winner = sA > sB ? ps.currentMatch.teamA : ps.currentMatch.teamB;
    loser = winner === ps.currentMatch.teamA ? ps.currentMatch.teamB : ps.currentMatch.teamA;
  }
  
  const teamAObjOriginal = ps.teams.find(t => t.name === ps.currentMatch.teamA);
  const teamBObjOriginal = ps.teams.find(t => t.name === ps.currentMatch.teamB);
  
  const jogadoresAtrasadosIds = (ps.currentMatch?.jogadoresAtrasados || []).map(String);
  const playersA = teamAObjOriginal ? deepClone(teamAObjOriginal.players).filter(p => !jogadoresAtrasadosIds.includes(String(p.id || p.atleta_id || p.idAtleta))) : [];
  const playersB = teamBObjOriginal ? deepClone(teamBObjOriginal.players).filter(p => !jogadoresAtrasadosIds.includes(String(p.id || p.atleta_id || p.idAtleta))) : [];

  let newTeams = ps.teams ? ps.teams.map(t => ({ ...t, players: t.players ? [...t.players] : [] })) : [];
  let newBench = ps.bench ? [...ps.bench] : [];

  newTeams = newTeams.map(t => ({
    ...t,
    players: t.players ? t.players.filter(p => !p.isTemporary && !p.isEmprestado) : []
  }));
  newBench = newBench.filter(p => !p.isTemporary && !p.isEmprestado);
  const modoRodizio = ps.modoRodizio || "misto";

  const emprestadosAtivosIds = new Set([
    ...(ps.currentMatch?.teamAEmprestados || []),
    ...(ps.currentMatch?.teamBEmprestados || [])
  ].map(String));

  const todosJogadoresPartida = [];
  if (teamAObjOriginal) todosJogadoresPartida.push(...teamAObjOriginal.players);
  if (teamBObjOriginal) todosJogadoresPartida.push(...teamBObjOriginal.players);

  todosJogadoresPartida.forEach(p => {
    const idStr = String(p.id || p.atleta_id || p.idAtleta);
    if (emprestadosAtivosIds.has(idStr)) {
      if (p.originalTeamId === "bench" || !p.originalTeamId) {
        if (!newBench.some(b => String(b.id) === idStr)) {
          const clean = { ...p };
          delete clean.isEmprestado;
          delete clean.isTemporary;
          delete clean.originalTeamId;
          delete clean.originalTeamName;
          newBench.push(clean);
        }
      }
    }
  });

  if (ps.teamBases && modoRodizio !== "manual") {
    newTeams = newTeams.map(t => {
      const baseIds = ps.teamBases[t.name] || [];
      const todosJogadores = [];
      if (ps.teams) ps.teams.forEach(tm => todosJogadores.push(...tm.players));
      if (ps.bench) todosJogadores.push(...ps.bench);
      const uniquePlayers = [];
      const seenIds = new Set();
      todosJogadores.forEach(p => {
        const idStr = String(p.id || p.atleta_id || p.idAtleta);
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          uniquePlayers.push(p);
        }
      });
      const originalPlayers = baseIds.map(id => {
        const found = uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id));
        if (found) {
          const clean = { ...found };
          delete clean.isEmprestado;
          delete clean.isTemporary;
          delete clean.originalTeamId;
          delete clean.originalTeamName;
          return clean;
        }
        return null;
      }).filter(Boolean);
      return { ...t, players: originalPlayers };
    });
  }
  
  const currentMatchLogEntry = {
    ...ps.currentMatch,
    scoreA,
    scoreB,
    winner,
    loser,
    played: true,
    playersA,
    playersB,
    ambosSairam: ambosSairamEmpate
  };
  
  const tempLog = [...(ps.matchLog || []), currentMatchLogEntry];
  
  if (!ambosSairamEmpate && limiteVitorias > 0) {
    const permSeguidas = getVitoriasSeguidas(tempLog, winner, dataRealizacaoId || ps.currentMatch.dataRealizacaoId);
    if (permSeguidas >= limiteVitorias) {
      vencedorAtingiuLimite = true;
      currentMatchLogEntry.limiteAtingido = true;
    }
  }
  
  if ((modoRodizio === "auto" || modoRodizio === "misto") && newBench.length > 0) {
    if (ambosSairamEmpate) {
      const tA = newTeams.find(t => t.name === ps.currentMatch.teamA);
      if (tA) {
        const timeUnidades = agruparUnidades(tA.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t => t.name === ps.currentMatch.teamA ? { ...t, players: newPlayers } : t);
      }
      
      const tB = newTeams.find(t => t.name === ps.currentMatch.teamB);
      if (tB && newBench.length > 0) {
        const timeUnidades = agruparUnidades(tB.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t => t.name === ps.currentMatch.teamB ? { ...t, players: newPlayers } : t);
      }
    } else if (vencedorAtingiuLimite) {
      const tLoser = newTeams.find(t => t.name === loser);
      if (tLoser) {
        const timeUnidades = agruparUnidades(tLoser.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t => t.name === loser ? { ...t, players: newPlayers } : t);
      }
      
      const tWinner = newTeams.find(t => t.name === winner);
      if (tWinner && newBench.length > 0) {
        const timeUnidades = agruparUnidades(tWinner.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t => t.name === winner ? { ...t, players: newPlayers } : t);
      }
    } else {
      const tLoser = newTeams.find(t => t.name === loser);
      if (tLoser) {
        const timeUnidades = agruparUnidades(tLoser.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t => t.name === loser ? { ...t, players: newPlayers } : t);
      }
    }
  }

  let historicoEmprestimos = { ...(ps.historicoEmprestimos || {}) };
  if (modoRodizio === "misto") {
    const emprestados = [
      ...(ps.currentMatch?.teamAEmprestados || []),
      ...(ps.currentMatch?.teamBEmprestados || [])
    ];
    emprestados.forEach(id => {
      const idStr = String(id);
      historicoEmprestimos[idStr] = (historicoEmprestimos[idStr] || 0) + 1;
    });
  }

  const rest = ps.queue.slice(2);
  let newQueue = [];
  if (modoRodizio === "manual") {
    newQueue = [...ps.queue];
  } else if (ambosSairamEmpate) {
    newQueue = [...rest, ps.currentMatch.teamA, ps.currentMatch.teamB];
  } else if (vencedorAtingiuLimite) {
    const destinoVencedorLimite = ps.destinoVencedorLimite || "finalFila";
    if (destinoVencedorLimite === "esperarUmJogo") {
      const nextA = rest[0];
      const nextB = rest[1];
      const remaining = rest.slice(2);
      if (nextA && nextB) {
        newQueue = [nextA, nextB, winner, ...remaining, loser];
      } else if (nextA) {
        newQueue = [nextA, winner, loser];
      } else {
        newQueue = [winner, loser];
      }
    } else {
      newQueue = [...rest, loser, winner];
    }
  } else {
    newQueue = [winner, ...rest, loser];
  }

  let finalState = { ...ps, teams: newTeams, queue: newQueue, bench: newBench, matchLog: tempLog, currentMatch: null, historicoEmprestimos };
  finalState = sincronizarBasesDosTimes(finalState);
  return finalState;
}

export function higienizarJogadoresDuplicados(ps) {
  if (!ps || !ps.teams) return ps;
  const idsVistos = new Set();
  
  ps.teams.forEach(t => {
    t.players = t.players.filter(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      
      const isEmprestadoAtivo = ps.currentMatch && (
        (ps.currentMatch.teamA === t.name && ps.currentMatch.teamAEmprestados?.map(id => String(id)).includes(idStr)) ||
        (ps.currentMatch.teamB === t.name && ps.currentMatch.teamBEmprestados?.map(id => String(id)).includes(idStr))
      );

      if (isEmprestadoAtivo) {
        return true;
      }

      if (idsVistos.has(idStr)) return false;
      idsVistos.add(idStr);
      return true;
    });
  });
  
  if (ps.bench) {
    ps.bench = ps.bench.filter(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      if (idsVistos.has(idStr)) return false;
      idsVistos.add(idStr);
      return true;
    });
  }
  
  if (ps.teamBases) {
    const basesVistas = new Set();
    Object.keys(ps.teamBases).forEach(teamName => {
      if (Array.isArray(ps.teamBases[teamName])) {
        ps.teamBases[teamName] = ps.teamBases[teamName].filter(id => {
          const idStr = String(id);
          if (basesVistas.has(idStr)) return false;
          basesVistas.add(idStr);
          return true;
        });
      }
    });
  }
  return ps;
}

export function higienizarFilaTimes(ps) {
  if (!ps) return ps;
  if (!ps.teams) ps.teams = [];
  if (!ps.queue) ps.queue = [];
  
  const existingTeamNames = new Set(ps.teams.map(t => t.name));
  let cleanQueue = ps.queue.filter(name => existingTeamNames.has(name));
  
  const seenInQueue = new Set();
  cleanQueue = cleanQueue.filter(name => {
    if (seenInQueue.has(name)) return false;
    seenInQueue.add(name);
    return true;
  });
  
  ps.teams.forEach(t => {
    if (!seenInQueue.has(t.name)) {
      cleanQueue.push(t.name);
      seenInQueue.add(t.name);
    }
  });
  
  ps.queue = cleanQueue;
  return ps;
}

export function sincronizarBasesDosTimes(ps) {
  if (!ps || !ps.teams) return ps;
  ps = higienizarJogadoresDuplicados(ps);
  ps = higienizarFilaTimes(ps);
  if (!ps.teamBases) ps.teamBases = {};
  
  const jogadoresAtrasadosIds = (ps.currentMatch?.jogadoresAtrasados || []).map(id => String(id));
  
  ps.teams.forEach(t => {
    const atrasadosDesteTime = (ps.teamBases[t.name] || [])
      .map(id => String(id))
      .filter(id => jogadoresAtrasadosIds.includes(id));

    const novosIds = t.players
      .filter(p => !p.isTemporary && !p.isEmprestado)
      .map(p => p.id || p.atleta_id || p.idAtleta)
      .filter(Boolean)
      .map(id => String(id));

    const uniqueIds = Array.from(new Set([...novosIds, ...atrasadosDesteTime]));
    ps.teamBases[t.name] = uniqueIds;
  });
  return ps;
}
