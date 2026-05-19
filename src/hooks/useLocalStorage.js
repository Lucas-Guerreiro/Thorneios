import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'futebol_manager_data';

export function useLocalStorage(initialState) {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);

  // Carregar dados na inicialização
  useEffect(() => {
    const loadData = async () => {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (value) {
          const parsed = JSON.parse(value);
          const sanitized = {
            ...parsed,
            campeonatos: Array.isArray(parsed.campeonatos) ? parsed.campeonatos : [],
            peladas: Array.isArray(parsed.peladas) ? parsed.peladas : [],
            datasRealizacao: Array.isArray(parsed.datasRealizacao) ? parsed.datasRealizacao : [],
            atletas: Array.isArray(parsed.atletas) ? parsed.atletas : [],
            participacoes: Array.isArray(parsed.participacoes) ? parsed.participacoes : [],
            managers: Array.isArray(parsed.managers) ? parsed.managers : [],
            financeiro: parsed.financeiro && typeof parsed.financeiro === 'object' ? parsed.financeiro : { entries: [] },
          };
          // Fazemos um merge com o estado inicial para garantir que chaves novas existam
          setState(prev => ({
            ...initialState,
            ...sanitized,
            financeiro: { ...initialState.financeiro, ...(sanitized.financeiro || {}) }
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar dados nativos:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Salvar dados sempre que o estado mudar (após o carregamento inicial)
  useEffect(() => {
    if (!loading) {
      const saveData = async () => {
        try {
          await Preferences.set({
            key: STORAGE_KEY,
            value: JSON.stringify(state),
          });
        } catch (error) {
          console.error('Erro ao salvar dados nativos:', error);
        }
      };
      saveData();
    }
  }, [state, loading]);

  return [state, setState, loading];
}

export async function clearLocalStorage() {
  try {
    await Preferences.remove({ key: STORAGE_KEY });
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
  }
}

export async function getLocalStorageSize() {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) return 0;
    return new Blob([value]).size;
  } catch (error) {
    console.error('Erro ao calcular tamanho:', error);
    return 0;
  }
}
