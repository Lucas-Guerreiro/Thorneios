import { useState, useEffect, useRef } from 'react';
import { playWhistleSound } from '../utils/helpers';

export function useMatchTimer(defaultMinutes = 10, timerKey, onTimerUpdate) {
  const [minutesInput, setMinutesInput] = useState(defaultMinutes);
  const [seconds, setSeconds] = useState(defaultMinutes * 60);
  const [initialSeconds, setInitialSeconds] = useState(defaultMinutes * 60);
  const [running, setRunning] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef(null);

  // Carrega o estado persistido na montagem ou quando a chave de temporização mudar
  useEffect(() => {
    if (!timerKey) return;
    
    const savedRunning = localStorage.getItem(`${timerKey}_running`) === "true";
    const savedInitial = localStorage.getItem(`${timerKey}_initial`);
    const savedSeconds = localStorage.getItem(`${timerKey}_seconds`);
    const savedStart = localStorage.getItem(`${timerKey}_startTimestamp`);
    const savedConfig = localStorage.getItem(`${timerKey}_isConfiguring`);

    const initialSecs = savedInitial ? parseInt(savedInitial) : defaultMinutes * 60;
    setInitialSeconds(initialSecs);
    setMinutesInput(Math.floor(initialSecs / 60));

    if (savedConfig !== null) {
      setIsConfiguring(savedConfig === "true");
    } else {
      setIsConfiguring(true);
    }

    if (savedRunning && savedStart && savedSeconds) {
      const startMs = parseInt(savedStart);
      const secsAtStart = parseInt(savedSeconds);
      const elapsedSecs = Math.floor((Date.now() - startMs) / 1000);
      const remainingSecs = secsAtStart - elapsedSecs;

      if (remainingSecs <= 0) {
        setSeconds(0);
        setRunning(false);
        setIsFinished(true);
        localStorage.setItem(`${timerKey}_running`, "false");
        localStorage.setItem(`${timerKey}_seconds`, "0");
        if (onTimerUpdate) {
          onTimerUpdate({
            timerRunning: false,
            timerSecondsAtStart: 0,
            timerStartTimestamp: null
          });
        }
      } else {
        setSeconds(remainingSecs);
        setRunning(true);
        setIsFinished(false);
        if (onTimerUpdate) {
          onTimerUpdate({
            timerRunning: true,
            timerSecondsAtStart: secsAtStart,
            timerStartTimestamp: startMs
          });
        }
      }
    } else {
      const secs = savedSeconds ? parseInt(savedSeconds) : initialSecs;
      setSeconds(secs);
      setRunning(false);
      setIsFinished(secs === 0 && savedSeconds !== null);
      if (onTimerUpdate) {
        onTimerUpdate({
          timerRunning: false,
          timerSecondsAtStart: secs,
          timerStartTimestamp: null
        });
      }
    }
  }, [timerKey]);

  // Salva reativamente no localStorage
  const saveStateToLocalStorage = (newRunning, newSeconds, newInitial, newConfig) => {
    if (!timerKey) return;
    
    localStorage.setItem(`${timerKey}_running`, String(newRunning));
    localStorage.setItem(`${timerKey}_seconds`, String(newSeconds));
    localStorage.setItem(`${timerKey}_initial`, String(newInitial));
    localStorage.setItem(`${timerKey}_isConfiguring`, String(newConfig));
    
    const timestamp = Date.now();
    if (newRunning) {
      localStorage.setItem(`${timerKey}_startTimestamp`, String(timestamp));
    } else {
      localStorage.removeItem(`${timerKey}_startTimestamp`);
    }

    if (onTimerUpdate) {
      onTimerUpdate({
        timerRunning: newRunning,
        timerSecondsAtStart: newSeconds,
        timerStartTimestamp: newRunning ? timestamp : null
      });
    }
  };

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setRunning(false);
            setIsFinished(true);
            playWhistleSound();
            saveStateToLocalStorage(false, 0, initialSeconds, isConfiguring);
            return 0;
          }
          const nextSecs = prev - 1;
          if (timerKey) {
            localStorage.setItem(`${timerKey}_seconds`, String(nextSecs));
          }
          return nextSecs;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, initialSeconds, isConfiguring, timerKey]);

  const handleStart = () => {
    let secs = seconds;
    if (isFinished) {
      secs = initialSeconds;
      setSeconds(initialSeconds);
      setIsFinished(false);
    }
    setRunning(true);
    saveStateToLocalStorage(true, secs, initialSeconds, isConfiguring);
  };

  const handlePause = () => {
    setRunning(false);
    saveStateToLocalStorage(false, seconds, initialSeconds, isConfiguring);
  };

  const handleReset = () => {
    setRunning(false);
    setSeconds(initialSeconds);
    setIsFinished(false);
    saveStateToLocalStorage(false, initialSeconds, initialSeconds, isConfiguring);
  };

  const handleConfigSave = () => {
    if (minutesInput === "" || Number(minutesInput) < 1) {
      alert("Você precisa digitar um valor acima de 1.");
      return;
    }
    const totalSecs = Math.max(1, Number(minutesInput)) * 60;
    setSeconds(totalSecs);
    setInitialSeconds(totalSecs);
    setIsConfiguring(false);
    setIsFinished(false);
    saveStateToLocalStorage(false, totalSecs, totalSecs, false);
  };

  const handleAddMinute = () => {
    const nextSecs = seconds + 60;
    const nextInit = initialSeconds + 60;
    setSeconds(nextSecs);
    setInitialSeconds(nextInit);
    saveStateToLocalStorage(running, nextSecs, nextInit, isConfiguring);
  };

  const handleSubMinute = () => {
    const nextSecs = Math.max(0, seconds - 60);
    const nextInit = Math.max(60, initialSeconds - 60);
    setSeconds(nextSecs);
    setInitialSeconds(nextInit);
    saveStateToLocalStorage(running, nextSecs, nextInit, isConfiguring);
  };

  return {
    minutesInput,
    setMinutesInput,
    seconds,
    initialSeconds,
    running,
    isConfiguring,
    setIsConfiguring,
    isFinished,
    handleStart,
    handlePause,
    handleReset,
    handleConfigSave,
    handleAddMinute,
    handleSubMinute,
  };
}
