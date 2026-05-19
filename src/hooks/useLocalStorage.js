import { useState, useEffect } from 'react';

const STORAGE_KEY = 'futebol_manager_data';

export function useLocalStorage(initialState) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : initialState;
    } catch (error) {
      console.error('Erro ao carregar dados do localStorage:', error);
      return initialState;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Erro ao salvar dados no localStorage:', error);
    }
  }, [state]);

  return [state, setState];
}

export function clearLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Erro ao limpar localStorage:', error);
  }
}

export function getLocalStorageSize() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return 0;
    return new Blob([saved]).size;
  } catch (error) {
    console.error('Erro ao calcular tamanho:', error);
    return 0;
  }
}
