import { todayStr, calcularEstatisticasData, calcularClassificacaoData } from '../utils/helpers';

export function usePelada(appState, setAppState, auth, current, dashboardSelectedId, sincronizarPeladaImediatamente) {
  // Setters locais utilitários
  const setPeladas = d => setAppState(s => ({ ...s, peladas: typeof d === 'function' ? d(Array.isArray(s.peladas) ? s.peladas : []) : d }));
  
  const setDatasRealizacao = d => setAppState(s => {
    const nextDatas = typeof d === 'function' ? d(Array.isArray(s.datasRealizacao) ? s.datasRealizacao : []) : d;
    const newState = { ...s, datasRealizacao: nextDatas };
    const activePeladaId = current?.id || dashboardSelectedId || null;
    if (activePeladaId && sincronizarPeladaImediatamente) {
      sincronizarPeladaImediatamente(activePeladaId, newState);
    }
    return newState;
  });
  
  const setParticipacoes = d => setAppState(s => ({ ...s, participacoes: typeof d === 'function' ? d(Array.isArray(s.participacoes) ? s.participacoes : []) : d }));
  
  const setAtletas = d => setAppState(s => ({ ...s, atletas: typeof d === 'function' ? d(Array.isArray(s.atletas) ? s.atletas : []) : d }));
  
  const setFinanceiro = d => setAppState(s => ({ ...s, financeiro: typeof d === 'function' ? d(s.financeiro && typeof s.financeiro === 'object' ? s.financeiro : { entries: [] }) : d }));

  // ── CRUD Peladas ──
  const adicionarPelada = d => setPeladas(p => [...p, { id: Date.now(), nome: d.nome, data_criacao: d.data_criacao || todayStr(), ativo: d.ativo !== false, manager_id: auth.role === "manager" ? auth.manager_id : null }]);
  
  const atualizarPelada = (id, d) => setPeladas(p => p.map(x => x.id === id ? { ...x, ...d } : x));
  
  const removerPelada = id => {
    setPeladas(p => p.filter(x => x.id !== id));
    setDatasRealizacao(p => p.filter(x => x.pelada_id !== id));
    setParticipacoes(p => p.filter(x => x.pelada_id !== id));
  };

  // ── CRUD Datas Realização ──
  const adicionarData = (d) => setDatasRealizacao(p => [...p, { ...d, id: Date.now() }]);
  
  const atualizarData = (id, d) => {
    setDatasRealizacao(prev => prev.map(x => {
      if (String(x.id) === String(id)) {
        const dataAtualizada = { ...x, ...d };
        const presenca = dataAtualizada.presenca || x.presenca || [];
        const formacoes = dataAtualizada.drawnTeams || dataAtualizada.formacoes || x.formacoes || x.drawnTeams || null;
        const matchLog = dataAtualizada.peladaState?.matchLog || dataAtualizada.confrontos || x.confrontos || (x.peladaState?.matchLog) || [];
        const confrontos = matchLog;
        const estatisticas = calcularEstatisticasData(matchLog);
        const classificacao = calcularClassificacaoData(dataAtualizada.drawnTeams || x.drawnTeams || formacoes, matchLog);
        
        return {
          ...dataAtualizada,
          presenca,
          formacoes,
          confrontos,
          estatisticas,
          classificacao,
          drawnTeams: formacoes
        };
      }
      return x;
    }));
  };
  
  const removerData = id => {
    setDatasRealizacao(p => p.filter(x => String(x.id) !== String(id)));
    setParticipacoes(p => p.filter(x => String(x.data_realizacao_id) !== String(id)));
    setFinanceiro(f => ({
      ...f,
      entries: (f.entries || []).filter(e => String(e.data_id) !== String(id))
    }));
  };

  // ── CRUD Participações ──
  const adicionarPart = (d) => {
    setParticipacoes(p => {
      const next = [...p, { ...d, id: Date.now() }];
      if (d.data_realizacao_id) {
        const presentesIds = next.filter(x => String(x.data_realizacao_id) === String(d.data_realizacao_id) && x.compareceu).map(x => x.atleta_id);
        setTimeout(() => atualizarData(d.data_realizacao_id, { presenca: presentesIds }), 0);
      }
      return next;
    });
  };
  
  const atualizarPart = (id, d) => {
    setParticipacoes(p => {
      const next = p.map(x => x.id === id ? { ...x, ...d } : x);
      const part = p.find(x => x.id === id);
      if (part && part.data_realizacao_id) {
        const presentesIds = next.filter(x => String(x.data_realizacao_id) === String(part.data_realizacao_id) && x.compareceu).map(x => x.atleta_id);
        setTimeout(() => atualizarData(part.data_realizacao_id, { presenca: presentesIds }), 0);
      }
      return next;
    });
  };
  
  const removerPart = id => {
    setParticipacoes(p => {
      const part = p.find(x => x.id === id);
      const next = p.filter(x => x.id !== id);
      if (part && part.data_realizacao_id) {
        const presentesIds = next.filter(x => String(x.data_realizacao_id) === String(part.data_realizacao_id) && x.compareceu).map(x => x.atleta_id);
        setTimeout(() => atualizarData(part.data_realizacao_id, { presentesIdea: presentesIds }), 0); // Correção de digitação do original: presentesIds
      }
      return next;
    });
  };

  const salvarParticipacoesLote = (peladaId, dataRealizacaoId, novasParts) => {
    setParticipacoes(prev => {
      const filtered = prev.filter(p => !(p.pelada_id === peladaId && String(p.data_realizacao_id) === String(dataRealizacaoId)));
      const cleanNew = novasParts.map(p => {
        const cleaned = { ...p };
        if (String(cleaned.id).startsWith("temp_")) {
          cleaned.id = Date.now() + Math.floor(Math.random() * 10000);
        }
        return cleaned;
      });
      const next = [...filtered, ...cleanNew];
      if (dataRealizacaoId !== null) {
        const presentesIds = next.filter(x => String(x.data_realizacao_id) === String(dataRealizacaoId) && x.compareceu).map(x => x.atleta_id);
        setTimeout(() => atualizarData(dataRealizacaoId, { presenca: presentesIds }), 0);
      }
      return next;
    });

    if (dataRealizacaoId === null) {
      const atletasIdsNovos = novasParts.map(p => p.atleta_id);
      setAtletas(prev => prev.map(a => {
        const vinculos = Array.isArray(a.vinculos) ? [...a.vinculos] : [];
        const vinculoId = "pelada_" + peladaId;
        const temVinculo = vinculos.includes(vinculoId);
        const deveTerVinculo = atletasIdsNovos.includes(a.id);
        
        if (deveTerVinculo && !temVinculo) {
          return { ...a, vinculos: [...vinculos, vinculoId] };
        } else if (!deveTerVinculo && temVinculo) {
          return { ...a, vinculos: vinculos.filter(v => v !== vinculoId) };
        }
        return a;
      }));
    }
  };

  return {
    adicionarPelada,
    atualizarPelada,
    removerPelada,
    adicionarData,
    atualizarData,
    removerData,
    adicionarPart,
    atualizarPart,
    removerPart,
    salvarParticipacoesLote,
  };
}
