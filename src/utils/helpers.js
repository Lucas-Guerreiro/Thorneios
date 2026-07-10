import { Browser } from '@capacitor/browser';

export function cryptoShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const b = new Uint32Array(1);
    crypto.getRandomValues(b);
    const j = b[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const deepClone = o => JSON.parse(JSON.stringify(o));

export const fmtDate = d => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—";

export const fmtCur = v => `R$ ${Number(v || 0).toFixed(2).replace(".", ",")}`;

export const todayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatarData = d => { 
  if (!d) return "—"; 
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); 
};

export const getAtletaById = (atletas, id) => atletas.find(a => a.id === id);

export const getParticipacoesByAtleta = (participacoes, aid) => participacoes.filter(p => p.atleta_id === aid);

export const getParticipacoesByData = (participacoes, did) => participacoes.filter(p => p.data_realizacao_id === did);

export const calcularEstatisticasData = (matchLog) => {
  const stats = {};
  const playedMatches = (matchLog || []).filter(m => m.played);
  
  playedMatches.forEach(m => {
    const scoreA = parseInt(m.scoreA) || 0;
    const scoreB = parseInt(m.scoreB) || 0;
    const sumula = m.sumula || {};

    (m.playersA || []).forEach(p => {
      const pId = p.id || p.atleta_id;
      if (!pId) return;
      if (!stats[pId]) {
        stats[pId] = { id: pId, nome: p.apelido || p.nome || `Atleta #${pId}`, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 };
      }
      const s = stats[pId];
      s.j++;
      s.gp += parseInt(sumula[pId]) || 0;
      s.gc += scoreB;
      if (scoreA > scoreB) {
        s.v++;
        s.pts += 3;
      } else if (scoreA === scoreB) {
        s.e++;
        s.pts += 1;
      } else {
        s.d++;
      }
    });

    (m.playersB || []).forEach(p => {
      const pId = p.id || p.atleta_id;
      if (!pId) return;
      if (!stats[pId]) {
        stats[pId] = { id: pId, nome: p.apelido || p.nome || `Atleta #${pId}`, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 };
      }
      const s = stats[pId];
      s.j++;
      s.gp += parseInt(sumula[pId]) || 0;
      s.gc += scoreA;
      if (scoreB > scoreA) {
        s.v++;
        s.pts += 3;
      } else if (scoreB === scoreA) {
        s.e++;
        s.pts += 1;
      } else {
        s.d++;
      }
    });
  });
  
  return Object.values(stats);
};

export const calcularClassificacaoData = (teams, matchLog) => {
  if (!teams) return [];
  const st = teams.filter(Boolean).map(t => ({ name: t.name || "", j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0 }));
  const playedMatches = (matchLog || []).filter(m => m.played);
  
  playedMatches.forEach(m => {
    const h = st.find(x => x.name === m.teamA);
    const a = st.find(x => x.name === m.teamB);
    if (!h || !a) return;
    const hs = parseInt(m.scoreA) || 0;
    const as2 = parseInt(m.scoreB) || 0;
    h.j++; a.j++;
    h.gp += hs; h.gc += as2;
    a.gp += as2; a.gc += hs;
    h.sg = h.gp - h.gc;
    a.sg = a.gp - a.gc;
    if (hs > as2) {
      h.v++; h.pts += 3; a.d++;
    } else if (hs === as2) {
      h.e++; h.pts++; a.e++; a.pts++;
    } else {
      a.v++; a.pts += 3; h.d++;
    }
  });
  return st.sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp);
};

export function resizeImage(file, maxSize, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      let width = img.width, height = img.height;
      if (width > height) { 
        if (width > maxSize) { 
          height *= maxSize / width; 
          width = maxSize; 
        } 
      } else { 
        if (height > maxSize) { 
          width *= maxSize / height; 
          height = maxSize; 
        } 
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export function compressBase64(base64Str, maxSize, quality = 0.6) {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }
    if (base64Str.length < 25000) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      let width = img.width, height = img.height;
      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = function() {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
}

export async function otimizarTodoEstado(state) {
  const newState = { ...state };
  if (Array.isArray(newState.atletas)) {
    newState.atletas = await Promise.all(newState.atletas.map(async (atleta) => {
      let foto = atleta.foto;
      let docFoto = atleta.docFoto;
      if (foto) foto = await compressBase64(foto, 120, 0.6);
      if (docFoto) docFoto = await compressBase64(docFoto, 400, 0.6);
      return { ...atleta, foto, docFoto };
    }));
  }
  return newState;
}

export const getPlayerName = a => {
  if (!a) return "";
  return a.apelido || a.nome || a.name || `Atleta #${a.id || 'Sem ID'}`;
};

export const getDirectImageUrl = (url) => {
  if (!url) return "";
  let cleanUrl = url.trim();
  
  if (cleanUrl.startsWith("<") && cleanUrl.includes("src=")) {
    const match = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanUrl = match[1].trim();
    }
  }
  
  if (cleanUrl.toLowerCase().includes("onedrive.live.com") && cleanUrl.toLowerCase().includes("embed")) {
    return cleanUrl.replace(/\/embed/i, "/download");
  }
  
  if (cleanUrl.toLowerCase().includes("1drv.ms")) {
    cleanUrl = cleanUrl.replace(/\/[vi]\/s!/i, "/download?s=");
    cleanUrl = cleanUrl.replace(/\/s!/i, "/download?s=");
    return cleanUrl;
  }
  
  return cleanUrl;
};

export const getOneDriveEmbedUrl = (url) => {
  if (!url) return "";
  let cleanUrl = url.trim();
  
  if (cleanUrl.startsWith("<") && cleanUrl.includes("src=")) {
    const match = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanUrl = match[1].trim();
    }
  }
  
  if (cleanUrl.toLowerCase().includes("onedrive.live.com") && cleanUrl.toLowerCase().includes("download")) {
    return cleanUrl.replace(/\/download/i, "/embed");
  }
  
  if (cleanUrl.toLowerCase().includes("onedrive.live.com") && cleanUrl.toLowerCase().includes("embed")) {
    return cleanUrl;
  }
  
  if (cleanUrl.toLowerCase().includes("1drv.ms")) {
    cleanUrl = cleanUrl.replace(/\/[vi]\/s!/i, "/embed?s=");
    cleanUrl = cleanUrl.replace(/\/s!/i, "/embed?s=");
    cleanUrl = cleanUrl.replace(/\/download\?s=/i, "/embed?s=");
    return cleanUrl;
  }
  
  return cleanUrl;
};

export const isImageUrl = url => {
  if (!url) return false;
  let cleanUrl = url.trim();
  
  if (cleanUrl.startsWith("<") && cleanUrl.includes("src=")) {
    const match = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanUrl = match[1].trim();
    }
  }
  
  const cleanUrlLower = cleanUrl.toLowerCase();
  
  if (
    cleanUrlLower.startsWith("data:image/") || 
    cleanUrlLower.includes("images.unsplash.com") || 
    cleanUrlLower.includes("firebasestorage.googleapis.com") || 
    cleanUrlLower.includes("imgbb.com") ||
    cleanUrlLower.includes("imgur.com") ||
    cleanUrlLower.includes("postimg.cc") ||
    cleanUrlLower.includes("cloudinary.com") ||
    cleanUrlLower.includes("media.discordapp.net") ||
    cleanUrlLower.includes("onedrive.live.com") ||
    cleanUrlLower.includes("1drv.ms") ||
    cleanUrlLower.includes("sharepoint.com")
  ) {
    return true;
  }
  
  const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff"];
  if (extensions.some(ext => cleanUrlLower.includes(ext))) {
    return true;
  }
  
  if (cleanUrlLower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)\b/)) {
    return true;
  }

  return false;
};

export const getEmbedUrl = (url) => {
  if (!url) return null;
  let cleanUrl = url.trim();
  
  if (cleanUrl.startsWith("<") && cleanUrl.includes("src=")) {
    const match = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanUrl = match[1].trim();
    }
  }
  
  let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  let match = cleanUrl.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
};

export const handleOpenExternalLink = async (url) => {
  if (!url) return;
  try {
    await Browser.open({ url, presentationStyle: 'popover' });
  } catch (e) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

export const escapeHtmlGlobal = (value) => {
  const str = String(value ?? "");
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
};

export const downloadCsv = (filename, headers, rows) => {
  const csvFilename = filename.replace(/\.xls$/, '.csv');
  const escCsv = (v) => {
    const s = String(v == null ? '' : v);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [
    headers.map(escCsv).join(','),
    ...rows.map(row => headers.map(h => escCsv(row[h])).join(','))
  ];
  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href; link.download = csvFilename;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(href);
};

export const downloadXls = downloadCsv;

export const playWhistleSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const whistle = (delay, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime + delay);
      
      const oscMod = ctx.createOscillator();
      const gainMod = ctx.createGain();
      oscMod.frequency.value = 60;
      gainMod.gain.value = 180;
      
      oscMod.connect(gainMod.gain);
      gainMod.connect(osc.frequency);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay + 0.05);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      oscMod.connect(gainMod);
      
      oscMod.start(ctx.currentTime + delay);
      osc.start(ctx.currentTime + delay);
      
      oscMod.stop(ctx.currentTime + delay + duration);
      osc.stop(ctx.currentTime + delay + duration);
    };
    
    whistle(0, 0.25);
    whistle(0.35, 0.25);
    whistle(0.7, 0.7);
  } catch (e) {
    console.error("Erro ao gerar áudio:", e);
  }
};
