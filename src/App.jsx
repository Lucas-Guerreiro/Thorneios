import React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useLocalStorage, clearLocalStorage, getLocalStorageSize } from "./hooks/useLocalStorage";
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Browser } from '@capacitor/browser';
import { db, auth as firebaseAuth, isFirebaseConfigured } from "./firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  setPersistence,
  browserSessionPersistence
} from "firebase/auth";


/* ─────────────────────────── CONSTANTES ─────────────────────────── */
const COLORS = ["#1D9E75","#378ADD","#D85A30","#7F77DD","#BA7517","#D4537E","#639922","#E24B4A","#5F5E5A","#0F6E56"];
const MODALIDADES_ESPORTIVAS = [
  { id: "Futsal",   label: "Futsal",   icon: "⚽", color: "#378ADD" },
  { id: "Vôlei",   label: "Vôlei",    icon: "🏐", color: "#D85A30" },
  { id: "Society",  label: "Society",  icon: "🥅", color: "#1D9E75" },
  { id: "Basquete", label: "Basquete", icon: "🏀", color: "#BA7517" },
  { id: "Handebol", label: "Handebol", icon: "🤾", color: "#7F77DD" },
];

const deepClone = o => JSON.parse(JSON.stringify(o));
const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString("pt-BR") : "—";
const fmtCur  = v => `R$ ${Number(v||0).toFixed(2).replace(".",",")}`;
const todayStr= () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const SKILL_COLORS = ["#888","#BA7517","#378ADD","#1D9E75","#D85A30"];
const SKILL_NAMES  = ["Iniciante","Básico","Intermediário","Avançado","Elite"];
const LIGHT = { bg: "#F3F4F6", card: "#ffffff", cardBorder: "#E5E7EB", inputBg: "#F9FAFB", inputBorder: "#D1D5DB", inputColor: "#1A1C23", text: "#1A1C23", textSec: "#6B7280", tabBorder: "#E5E7EB" };
const DARK  = { bg: "#0F1116", card: "#171A21", cardBorder: "#212631", inputBg: "#1B1E26", inputBorder: "#2D3342", inputColor: "#F5F6F8", text: "#F5F6F8", textSec: "#8E929E", tabBorder: "#212631" };

function useTheme(){ 
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme_dark");
    return saved !== null ? saved === "true" : true;
  });
  const toggleDark = (value) => {
    setDark(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem("theme_dark", next ? "true" : "false");
      return next;
    });
  };
  return { dark, setDark: toggleDark, t: dark ? DARK : LIGHT }; 
}
function makeStyles(t){
  const isDark = t.bg === "#0F1116";
  const scale = typeof window !== 'undefined' ? (parseFloat(localStorage.getItem("app_font_scale")) || 1.0) : 1.0;
  
  const fs = (base) => Math.round(base * scale);
  const pad = (str) => {
    if (scale === 1.0) return str;
    return str.replace(/(\d+)px/g, (match, p1) => {
      return Math.round(parseInt(p1) * scale) + "px";
    });
  };

  return{
    page:  {minHeight:"100vh",padding:pad("24px 0"),maxWidth:1200,margin:"0 auto",background:t.bg,color:t.text,fontFamily:"'Outfit', sans-serif"},
    card:  {background:t.card,borderRadius:16,padding:pad("16px"),border:"1px solid " + t.cardBorder,boxShadow:!isDark?"0 4px 20px rgba(0,0,0,0.04)":"none",transition:"all 0.25s"},
    input: {padding:pad("10px 14px"),borderRadius:12,border:"1px solid " + t.inputBorder,fontSize:fs(14),background:t.inputBg,color:t.inputColor,width:"100%",boxSizing:"border-box",outline:"none",transition:"all 0.2s ease",focus:{borderColor:t.accent}},
    select:{padding:pad("10px 14px"),borderRadius:12,border:"1px solid " + t.inputBorder,fontSize:fs(14),background:t.inputBg,color:t.inputColor,width:"100%",boxSizing:"border-box",outline:"none",transition:"all 0.2s ease"},
    btn:   (bg,c)=>{
      const backColor = bg || t.accent || "#20E278";
      const isNeonGreen = backColor.toLowerCase() === "#20e278" || backColor.toLowerCase() === "#00e676" || backColor.toLowerCase() === "#1d9e75" || backColor.toLowerCase() === "#06aa48";
      const textColor = c || (isNeonGreen ? "#0F1116" : "#fff");
      return {
        padding:pad("10px 18px"),
        borderRadius:12,
        border:"none",
        background:backColor,
        color:textColor,
        cursor:"pointer",
        fontWeight:700,
        fontSize:fs(14),
        display:"inline-flex",
        alignItems:"center",
        justifyContent:"center",
        gap:6,
        transition:"all 0.2s ease",
        boxShadow: isNeonGreen && !isDark ? "0 4px 12px rgba(6, 170, 72, 0.25)" : "none"
      };
    },
    btnSm: (bg,c)=>{
      const backColor = bg || t.inputBg;
      const isNeonGreen = backColor.toLowerCase() === "#20e278" || backColor.toLowerCase() === "#00e676" || backColor.toLowerCase() === "#06aa48";
      const textColor = c || (isNeonGreen ? "#0F1116" : t.text);
      return {
        padding:pad("6px 14px"),
        borderRadius:10,
        border:"1px solid " + t.cardBorder,
        background:backColor,
        color:textColor,
        cursor:"pointer",
        fontWeight:700,
        fontSize:fs(12),
        transition:"all 0.2s ease"
      };
    },
    label: {fontSize:fs(11),color:t.textSec,fontWeight:800,textTransform:"uppercase",letterSpacing:0.8,marginBottom:6,display:"block"},
    tab:   a=>({
      padding:pad("10px 16px"),
      border:"none",
      borderBottom:a?("3px solid " + (t.accent||"#20E278")):"3px solid transparent",
      background:"none",
      color:a?t.text:t.textSec,
      cursor:"pointer",
      fontSize:fs(13),
      fontWeight:a?800:600,
      letterSpacing:"0.6px",
      textTransform:"uppercase",
      whiteSpace:"nowrap",
      transition:"all 0.2s ease"
    }),
    layoutContainer: isMobile => ({
      display: "flex",
      gap: pad("20px"),
      flexDirection: isMobile ? "column" : "row",
      alignItems: "flex-start",
      width: "100%",
      marginTop: pad("8px")
    }),
    sidebarLeft: isMobile => ({
      width: isMobile ? "100%" : pad("280px"),
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      gap: pad("16px"),
      position: isMobile ? "static" : "sticky",
      top: pad("24px")
    }),
    sidebarRight: isMobile => ({
      width: isMobile ? "100%" : pad("300px"),
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      gap: pad("16px"),
      position: isMobile ? "static" : "sticky",
      top: pad("24px")
    }),
    mainContent: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: pad("20px"),
      width: "100%"
    },
    sidebarItem: (active, activeColor) => ({
      display: "flex",
      alignItems: "center",
      gap: pad("10px"),
      padding: pad("10px 12px"),
      borderRadius: "12px",
      border: "none",
      background: active ? activeColor + "15" : "transparent",
      color: active ? activeColor : t.text,
      cursor: "pointer",
      textAlign: "left",
      fontSize: fs(13) + "px",
      fontWeight: active ? 700 : 500,
      width: "100%",
      transition: "all 0.2s ease"
    })
  };
}

/* ─────────────────────────── UTILS ──────────────────────────────── */
function cryptoShuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const b=new Uint32Array(1);crypto.getRandomValues(b);const j=b[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
const formatarData = d => { if(!d) return "—"; return new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"}); };
const getAtletaById = (atletas,id) => atletas.find(a=>a.id===id);
const getParticipacoesByAtleta = (participacoes,aid) => participacoes.filter(p=>p.atleta_id===aid);
const getParticipacoesByData = (participacoes,did) => participacoes.filter(p=>p.data_realizacao_id===did);

const calcularEstatisticasData = (matchLog) => {
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

const calcularClassificacaoData = (teams, matchLog) => {
  if (!teams) return [];
  const st = teams.map(t => ({ name: t.name, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0 }));
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

function resizeImage(file, maxSize, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      let width = img.width, height = img.height;
      if(width > height) { if(width > maxSize) { height *= maxSize / width; width = maxSize; } }
      else { if(height > maxSize) { width *= maxSize / height; height = maxSize; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function compressBase64(base64Str, maxSize, quality = 0.6) {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }
    // Se a imagem já for leve (menor que 20KB de Base64), não precisa processar de novo
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

async function otimizarTodoEstado(state) {
  const newState = { ...state };

  // 1. Otimizar atletas gerais (pelada)
  if (Array.isArray(newState.atletas)) {
    newState.atletas = await Promise.all(newState.atletas.map(async (atleta) => {
      let foto = atleta.foto;
      let docFoto = atleta.docFoto;
      if (foto) foto = await compressBase64(foto, 120, 0.6);
      if (docFoto) docFoto = await compressBase64(docFoto, 400, 0.6);
      return { ...atleta, foto, docFoto };
    }));
  }

  // 2. Otimizar atletas do campeonato
  if (Array.isArray(newState.atletasCampeonato)) {
    newState.atletasCampeonato = await Promise.all(newState.atletasCampeonato.map(async (atleta) => {
      let foto = atleta.foto;
      let docFoto = atleta.docFoto;
      if (foto) foto = await compressBase64(foto, 120, 0.6);
      if (docFoto) docFoto = await compressBase64(docFoto, 400, 0.6);
      return { ...atleta, foto, docFoto };
    }));
  }

  // 3. Otimizar campeonatos (escudos e fotos de partidas)
  if (Array.isArray(newState.campeonatos)) {
    newState.campeonatos = await Promise.all(newState.campeonatos.map(async (camp) => {
      const newCamp = { ...camp };
      
      // Escudos dos times
      if (newCamp.emblems && typeof newCamp.emblems === "object") {
        const newEmblems = {};
        for (const [team, b64] of Object.entries(newCamp.emblems)) {
          newEmblems[team] = await compressBase64(b64, 200, 0.6);
        }
        newCamp.emblems = newEmblems;
      }

      // Fotos das partidas
      if (Array.isArray(newCamp.rounds)) {
        newCamp.rounds = await Promise.all(newCamp.rounds.map(async (round) => {
          if (!Array.isArray(round.matches)) return round;
          const newMatches = await Promise.all(round.matches.map(async (match) => {
            if (!Array.isArray(match.photos)) return match;
            const newPhotos = await Promise.all(match.photos.map(async (photo) => {
              const newData = await compressBase64(photo.data, 400, 0.6);
              return { ...photo, data: newData };
            }));
            return { ...match, photos: newPhotos };
          }));
          return { ...round, matches: newMatches };
        }));
      }

      return newCamp;
    }));
  }

  return newState;
}

const getPlayerName = a => {
  if (!a) return "";
  return a.apelido || a.nome || a.name || `Atleta #${a.id || 'Sem ID'}`;
};

const getDirectImageUrl = (url) => {
  if (!url) return "";
  let cleanUrl = url.trim();
  
  // Extrai o link src caso o usuário tenha colado o iframe HTML completo
  if (cleanUrl.startsWith("<") && cleanUrl.includes("src=")) {
    const match = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanUrl = match[1].trim();
    }
  }
  
  // Converte links do OneDrive Embed para Download direto para renderizar como imagem/vídeo
  if (cleanUrl.toLowerCase().includes("onedrive.live.com") && cleanUrl.toLowerCase().includes("embed")) {
    return cleanUrl.replace(/\/embed/i, "/download");
  }
  
  // Converte links curtos do OneDrive (1drv.ms) para Download direto
  // Substitui /v/s!, /i/s! ou /s! por /download?s=
  if (cleanUrl.toLowerCase().includes("1drv.ms")) {
    cleanUrl = cleanUrl.replace(/\/[vi]\/s!/i, "/download?s=");
    cleanUrl = cleanUrl.replace(/\/s!/i, "/download?s=");
    return cleanUrl;
  }
  
  return cleanUrl;
};

const getOneDriveEmbedUrl = (url) => {
  if (!url) return "";
  let cleanUrl = url.trim();
  
  // Extrai o link src caso o usuário tenha colado o iframe HTML completo
  if (cleanUrl.startsWith("<") && cleanUrl.includes("src=")) {
    const match = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanUrl = match[1].trim();
    }
  }
  
  // Converte links do OneDrive Download para Embed
  if (cleanUrl.toLowerCase().includes("onedrive.live.com") && cleanUrl.toLowerCase().includes("download")) {
    return cleanUrl.replace(/\/download/i, "/embed");
  }
  
  // Se for embed do OneDrive, retorna ele mesmo
  if (cleanUrl.toLowerCase().includes("onedrive.live.com") && cleanUrl.toLowerCase().includes("embed")) {
    return cleanUrl;
  }
  
  // Converte links curtos do OneDrive (1drv.ms) para Embed
  if (cleanUrl.toLowerCase().includes("1drv.ms")) {
    cleanUrl = cleanUrl.replace(/\/[vi]\/s!/i, "/embed?s=");
    cleanUrl = cleanUrl.replace(/\/s!/i, "/embed?s=");
    cleanUrl = cleanUrl.replace(/\/download\?s=/i, "/embed?s=");
    return cleanUrl;
  }
  
  return cleanUrl;
};

const isImageUrl = url => {
  if (!url) return false;
  let cleanUrl = url.trim();
  
  // Extrai o link src caso o usuário tenha colado o iframe HTML completo
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
  
  // Detecta URLs com parâmetros que contêm extensões de imagens
  if (cleanUrlLower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)\b/)) {
    return true;
  }

  return false;
};

const getEmbedUrl = (url) => {
  if (!url) return null;
  let cleanUrl = url.trim();
  
  // Extrai o link src caso o usuário tenha colado o iframe HTML completo
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

const handleOpenExternalLink = async (url) => {
  if (!url) return;
  try {
    await Browser.open({ url, presentationStyle: 'popover' });
  } catch (e) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

const escapeHtmlGlobal = (value) => {
  const str = String(value ?? "");
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
};

const downloadCsv = (filename, headers, rows) => {
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
  const csv = '\uFEFF' + lines.join('\r\n'); // BOM para o Excel reconhecer UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href; link.download = csvFilename;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(href);
};
// Alias para manter compatibilidade com todo o código existente
const downloadXls = downloadCsv;


function GaleriaThumbnail({ mediaUrl, title, t }) {
  const [imageError, setImageError] = useState(false);
  const embed = getEmbedUrl(mediaUrl);
  const isImg = mediaUrl && isImageUrl(mediaUrl);
  
  let thumbUrl = getDirectImageUrl(mediaUrl);
  if (embed) {
    let match = mediaUrl.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
    if (match && match[2].length === 11) {
      thumbUrl = `https://img.youtube.com/vi/${match[2]}/0.jpg`;
    }
  }

  useEffect(() => {
    setImageError(false);
  }, [mediaUrl]);

  if (embed) {
    return (
      <div style={{ width: "100%", height: "100%", position: "relative" }}>
        <img 
          src={thumbUrl} 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
          alt={title} 
        />
        <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", borderRadius: 6, width: 24, height: 24, display: "flex", justifyContent: "center", alignItems: "center", color: "#fff", fontSize: 11 }}>
          ▶️
        </div>
      </div>
    );
  }

  if (isImg && !imageError) {
    return (
      <img 
        src={thumbUrl} 
        style={{ width: "100%", height: "100%", objectFit: "cover" }} 
        alt={title} 
        onError={() => setImageError(true)}
      />
    );
  }

  // Se falhou como imagem ou é reconhecido como vídeo do OneDrive
  if (mediaUrl && (mediaUrl.toLowerCase().includes("onedrive.live.com") || mediaUrl.toLowerCase().includes("1drv.ms"))) {
    return (
      <div style={{ 
        width: "100%", 
        height: "100%", 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center", 
        alignItems: "center", 
        background: "linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)", 
        color: "#fff",
        padding: 12,
        boxSizing: "border-box",
        textAlign: "center",
        position: "relative"
      }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>🎬</div>
        <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: 0.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {title || "Vídeo OneDrive"}
        </div>
        <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(55,138,221,0.85)", borderRadius: 6, padding: "2px 6px", color: "#fff", fontSize: 9, fontWeight: 800 }}>
          ONEDRIVE
        </div>
      </div>
    );
  }

  if (mediaUrl) {
    const directUrl = getDirectImageUrl(mediaUrl);
    return (
      <div style={{ width: "100%", height: "100%", position: "relative", background: "#000" }}>
        <video 
          src={directUrl} 
          preload="metadata" 
          muted 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
        />
        <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", borderRadius: 6, width: 24, height: 24, display: "flex", justifyContent: "center", alignItems: "center", color: "#fff", fontSize: 11 }}>
          ▶️
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", fontSize: 24, background: "#00000010" }}>
      🎬
    </div>
  );
}

function MuralPostCard({ 
  item, 
  isAdmin, 
  onStartEdit, 
  onDelete, 
  t,
  editingPostId,
  setEditingPostId,
  editTitle,
  setEditTitle,
  editContent,
  setEditContent,
  editType,
  setEditType,
  editMediaUrl,
  setEditMediaUrl,
  onSaveEdit
}) {
  const S = makeStyles(t);
  const embed = getEmbedUrl(item.mediaUrl);
  const isImg = item.mediaUrl && isImageUrl(item.mediaUrl);
  const hasMedia = item.mediaUrl && (embed || isImg || item.mediaUrl.trim() !== "");

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [item.mediaUrl, item.id]);

  // Se este post específico estiver sendo editado e o usuário for administrador
  if (isAdmin && item.id === editingPostId) {
    return (
      <div className="mural-card" style={{ borderColor: "#378ADD", background: t.inputBg, borderStyle: "solid", borderWidth: "2px", borderRadius: 20, padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${t.cardBorder}`, paddingBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#378ADD", display: "flex", alignItems: "center", gap: 6 }}>✏️ Editar Publicação</span>
            <button 
              onClick={() => setEditingPostId(null)}
              style={{ background: "none", border: "none", color: t.textSec, cursor: "pointer", fontSize: 18, padding: 0 }}
              title="Cancelar edição"
            >×</button>
          </div>

          <div>
            <label style={S.label}>Tipo de Publicação</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={()=>setEditType("noticia")} style={{ ...S.btnSm(editType === "noticia" ? "#0095F6" : "transparent", editType === "noticia" ? "#fff" : t.textSec), border: `1px solid ${editType === "noticia" ? "#0095F6" : t.cardBorder}`, flex: 1, padding: "8px" }}>📢 Notícia</button>
              <button onClick={()=>setEditType("midia")} style={{ ...S.btnSm(editType === "midia" ? "#0095F6" : "transparent", editType === "midia" ? "#fff" : t.textSec), border: `1px solid ${editType === "midia" ? "#0095F6" : t.cardBorder}`, flex: 1, padding: "8px" }}>🎬 Foto / Vídeo</button>
            </div>
          </div>

          <div>
            <label style={S.label}>Título</label>
            <input style={S.input} value={editTitle} onChange={e=>setEditTitle(e.target.value)} placeholder="Título da publicação" />
          </div>

          <div>
            <label style={S.label}>Conteúdo</label>
            <textarea style={{ ...S.input, height: 90, resize: "vertical" }} value={editContent} onChange={e=>setEditContent(e.target.value)} placeholder="Conteúdo da matéria..." />
          </div>

          <div>
            <label style={S.label}>{editType === "noticia" ? "Link da Imagem de Capa (Opcional)" : "Link da Mídia (YouTube, imagem, etc.)"}</label>
            <input style={S.input} value={editMediaUrl} onChange={e=>setEditMediaUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={() => onSaveEdit(item.id)} style={{ ...S.btn("#0095F6"), padding: "10px 14px", fontSize: 13, flex: 1, justifyContent: "center" }}>💾 Salvar Alterações</button>
            <button onClick={() => setEditingPostId(null)} style={{ ...S.btn(t.card, t.textSec), border: `1.5px solid ${t.cardBorder}`, padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  if (item.type === "midia") {
    // 🎬 ESTILO INSTAGRAM (FOTO / MÍDIA)
    return (
      <div className="instagram-post" style={{ 
        background: t.card, 
        border: `1px solid ${t.cardBorder}`, 
        borderRadius: 20, 
        overflow: "hidden", 
        marginBottom: 24, 
        boxShadow: "0 6px 20px rgba(0,0,0,0.03)",
        transition: "transform 0.3s, box-shadow 0.3s",
        position: "relative"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${t.cardBorder}33` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Instagram Style Colorful Border Avatar */}
            <div style={{ 
              background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", 
              padding: "2.5px", 
              borderRadius: "50%", 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center" 
            }}>
              <div style={{ background: t.card, borderRadius: "50%", width: 36, height: 36, display: "flex", justifyContent: "center", alignItems: "center", fontSize: 18 }}>
                🎬
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: t.text, display: "flex", alignItems: "center", gap: 5 }}>
                Organização
                <span style={{ color: "#3897f0", fontSize: 12, fontWeight: "bold" }} title="Conta Oficial">Verified ✓</span>
              </div>
              <div style={{ fontSize: 11, color: t.textSec }}>{fmtDate(item.date)}</div>
            </div>
          </div>
          {isAdmin && (
            <div style={{ display: "flex", gap: 8 }}>
              <button 
                onClick={() => onStartEdit(item)} 
                style={{ 
                  background: "rgba(55, 138, 221, 0.1)", 
                  border: "none", 
                  color: "#378ADD", 
                  cursor: "pointer", 
                  fontSize: 11, 
                  fontWeight: 700, 
                  padding: "4px 10px", 
                  borderRadius: 8,
                  transition: "background 0.2s"
                }}
              >
                ✏️ Editar
              </button>
              <button 
                onClick={() => onDelete(item.id)} 
                style={{ 
                  background: "rgba(226, 75, 74, 0.1)", 
                  border: "none", 
                  color: "#E24B4A", 
                  cursor: "pointer", 
                  fontSize: 11, 
                  fontWeight: 700, 
                  padding: "4px 10px", 
                  borderRadius: 8,
                  transition: "background 0.2s"
                }}
              >
                🗑 Excluir
              </button>
            </div>
          )}
        </div>

        {/* Media Element (Image / Video) - 100% width style instagram */}
        {hasMedia && (
          <div style={{ 
            background: "#00000010", 
            borderTop: `1px solid ${t.cardBorder}33`, 
            borderBottom: `1px solid ${t.cardBorder}33`, 
            overflow: "hidden", 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center" 
          }}>
            {embed ? (
              <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
                <iframe 
                  src={embed} 
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }} 
                  allowFullScreen
                  title={item.title}
                />
              </div>
            ) : isImg && !imageError ? (
              <img 
                src={getDirectImageUrl(item.mediaUrl)} 
                style={{ width: "100%", maxHeight: 460, objectFit: "contain", display: "block", background: "#000" }} 
                alt={item.title} 
                onError={() => setImageError(true)}
              />
            ) : (isImg && imageError) || hasMedia ? (
              item.mediaUrl && (item.mediaUrl.toLowerCase().includes("onedrive.live.com") || item.mediaUrl.toLowerCase().includes("1drv.ms")) ? (
                <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
                  <iframe 
                    src={getOneDriveEmbedUrl(item.mediaUrl)} 
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }} 
                    allowFullScreen
                    title={item.title}
                  />
                </div>
              ) : (
                <div style={{ width: "100%", background: "#000", display: "flex", justifyContent: "center" }}>
                  <video 
                    src={getDirectImageUrl(item.mediaUrl)} 
                    controls 
                    preload="metadata"
                    style={{ width: "100%", maxHeight: 460, display: "block", objectFit: "contain" }}
                  />
                </div>
              )
            ) : null}
          </div>
        )}

        {/* Instagram Action Row */}
        <div style={{ padding: "14px 20px 8px", display: "flex", gap: 18, fontSize: 22, borderTop: hasMedia ? "none" : `1px solid ${t.cardBorder}33` }}>
          <span style={{ cursor: "pointer", display: "inline-block", transition: "transform 0.15s" }} title="Curtir">❤️</span>
          <span style={{ cursor: "pointer", display: "inline-block", transition: "transform 0.15s" }} title="Comentar">💬</span>
          <span style={{ cursor: "pointer", display: "inline-block", transition: "transform 0.15s" }} title="Compartilhar">✈️</span>
        </div>

        {/* Title & Caption */}
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: t.text, letterSpacing: "-0.2px" }}>{item.title}</div>
          <div style={{ fontSize: 14, color: t.text, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            <strong style={{ marginRight: 8, color: "#378ADD" }}>organizador_thorneios</strong>
            {item.content}
          </div>
        </div>
      </div>
    );
  } else {
    // 📢 ESTILO X / TWITTER (NOTÍCIA / COMUNICADO)
    return (
      <div className="x-tweet" style={{ 
        background: t.card, 
        border: `1px solid ${t.cardBorder}`, 
        borderRadius: 20, 
        padding: "20px", 
        marginBottom: 24, 
        display: "flex", 
        gap: 14, 
        boxShadow: "0 6px 20px rgba(0,0,0,0.03)",
        transition: "transform 0.3s"
      }}>
        {/* Left Column (Circular Twitter Avatar) */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ 
            background: "rgba(55, 138, 221, 0.12)", 
            color: "#378ADD", 
            borderRadius: "50%", 
            width: 44, 
            height: 44, 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            fontSize: 22, 
            fontWeight: 800 
          }}>
            📢
          </div>
        </div>

        {/* Right Column (Tweet Body) */}
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          {/* Top row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 14 }}>
              <span style={{ fontWeight: 900, color: t.text }}>Thorneios</span>
              <span style={{ color: t.textSec, fontSize: 13.5 }}>@thorneios_varzea</span>
              <span style={{ color: t.textSec }}>·</span>
              <span style={{ color: t.textSec }} title={item.date}>{fmtDate(item.date)}</span>
            </div>
            {isAdmin && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onStartEdit(item)} style={{ background: "none", border: "none", color: "#378ADD", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "2px 6px" }}>✏️ Editar</button>
                <button onClick={() => onDelete(item.id)} style={{ background: "none", border: "none", color: "#E24B4A", cursor: "pointer", fontSize: 11, fontWeight: 700, padding: "2px 6px" }}>🗑 Excluir</button>
              </div>
            )}
          </div>

          {/* Tweet content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: t.text, letterSpacing: "-0.3px", lineHeight: 1.3 }}>{item.title}</div>
            <p style={{ fontSize: 14.5, color: t.text, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>{item.content}</p>
          </div>

          {/* Attached Card (if mediaUrl exists) */}
          {hasMedia && (
            <div style={{ 
              border: `1px solid ${t.cardBorder}`, 
              borderRadius: 16, 
              overflow: "hidden", 
              marginTop: 6,
              background: t.inputBg,
              cursor: "pointer"
            }}>
              {embed ? (
                <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
                  <iframe 
                    src={embed} 
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }} 
                    allowFullScreen
                    title={item.title}
                  />
                </div>
              ) : isImg && !imageError ? (
                <div>
                  <img 
                    src={getDirectImageUrl(item.mediaUrl)} 
                    style={{ width: "100%", height: "auto", display: "block" }} 
                    alt={item.title} 
                    onClick={() => handleOpenExternalLink(item.mediaUrl)}
                    onError={() => setImageError(true)}
                  />
                  <div style={{ padding: "12px 14px", borderTop: `1px solid ${t.cardBorder}` }} onClick={() => handleOpenExternalLink(item.mediaUrl)}>
                    <div style={{ fontSize: 11, color: t.textSec, textTransform: "lowercase", letterSpacing: 0.5, fontWeight: 700 }}>thorneios.com.br</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: t.text, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                  </div>
                </div>
              ) : (isImg && imageError) || hasMedia ? (
                <div>
                  {item.mediaUrl && (item.mediaUrl.toLowerCase().includes("onedrive.live.com") || item.mediaUrl.toLowerCase().includes("1drv.ms")) ? (
                    <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
                      <iframe 
                        src={getOneDriveEmbedUrl(item.mediaUrl)} 
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }} 
                        allowFullScreen
                        title={item.title}
                      />
                    </div>
                  ) : (
                    <video 
                      src={getDirectImageUrl(item.mediaUrl)} 
                      controls 
                      preload="metadata"
                      style={{ width: "100%", height: "auto", display: "block", maxHeight: 400, background: "#000" }} 
                    />
                  )}
                  <div style={{ padding: "12px 14px", borderTop: `1px solid ${t.cardBorder}` }}>
                    <div style={{ fontSize: 11, color: t.textSec, textTransform: "lowercase", letterSpacing: 0.5, fontWeight: 700 }}>thorneios.com.br</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: t.text, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "12px 14px" }}>
                  <a 
                    href={item.mediaUrl} 
                    onClick={(e) => { e.preventDefault(); handleOpenExternalLink(item.mediaUrl); }} 
                    style={{ fontSize: 13.5, color: "#378ADD", textDecoration: "none", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    🔗 Abrir link oficial do comunicado →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Twitter Action bar */}
          <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 380, marginTop: 10, color: t.textSec, fontSize: 14 }}>
            <span style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }} title="Responder">💬 <span style={{ fontSize: 11.5 }}>15</span></span>
            <span style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }} title="Retweetar">🔁 <span style={{ fontSize: 11.5 }}>8</span></span>
            <span style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }} title="Curtir">❤️ <span style={{ fontSize: 11.5 }}>142</span></span>
            <span style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }} title="Visualizações">📊 <span style={{ fontSize: 11.5 }}>2.4K</span></span>
          </div>
        </div>
      </div>
    );
  }
}

function MuralLightboxModal({ post, onClose, t, isAdmin, onStartEdit, onDelete, editingPostId, setEditingPostId, editTitle, setEditTitle, editContent, setEditContent, editType, setEditType, editMediaUrl, setEditMediaUrl, onSaveEdit }) {
  if (!post) return null;
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(10px)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      padding: 16
    }} onClick={onClose}>
      <div 
        style={{ 
          maxWidth: 640, 
          width: "100%", 
          maxHeight: "90vh", 
          overflowY: "auto", 
          background: t.card, 
          borderRadius: 24, 
          border: `1px solid ${t.cardBorder}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
          position: "relative"
        }} 
        onClick={e => e.stopPropagation()} // Impede fechar ao clicar dentro do modal
      >
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 20px 0", position: "absolute", top: 0, right: 0, zIndex: 10 }}>
          <button 
            onClick={onClose} 
            style={{ 
              background: t.card, 
              border: `1px solid ${t.cardBorder}`, 
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: t.text, 
              fontSize: 18, 
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              padding: 0
            }}
          >×</button>
        </div>
        <div style={{ padding: "30px 20px 20px" }}>
          <MuralPostCard 
            item={post} 
            isAdmin={isAdmin} 
            onStartEdit={onStartEdit}
            onDelete={(id) => { onDelete(id); onClose(); }} // Fecha o lightbox ao excluir
            t={t}
            editingPostId={editingPostId}
            setEditingPostId={setEditingPostId}
            editTitle={editTitle}
            setEditTitle={setEditTitle}
            editContent={editContent}
            setEditContent={setEditContent}
            editType={editType}
            setEditType={setEditType}
            editMediaUrl={editMediaUrl}
            setEditMediaUrl={setEditMediaUrl}
            onSaveEdit={(id) => { onSaveEdit(id); onClose(); }} // Fecha o lightbox ao salvar
          />
        </div>
      </div>
    </div>
  );
}

function AbaGaleriaOrganizador({ c, onUpdate, t }) {
  const S = makeStyles(t);
  const mural = c.mural || [];
  const midias = mural.filter(item => item.type === "midia");
  
  const [lightboxPost, setLightboxPost] = useState(null);

  // Estados para Edição de Publicação
  const [editingPostId, setEditingPostId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState("midia");
  const [editMediaUrl, setEditMediaUrl] = useState("");

  const handleStartEdit = (post) => {
    setEditingPostId(post.id);
    setEditTitle(post.title || "");
    setEditContent(post.content || "");
    setEditType(post.type || "midia");
    setEditMediaUrl(post.mediaUrl || "");
  };

  const handleSaveEdit = (id) => {
    try {
      if (!editTitle.trim() || !editContent.trim()) {
        alert("Por favor, preencha o título e o conteúdo.");
        return;
      }
      const tc = deepClone(c);
      tc.mural = (tc.mural || []).map(post => {
        if (post.id === id) {
          return {
            ...post,
            title: editTitle.trim(),
            content: editContent.trim(),
            type: editType,
            mediaUrl: editMediaUrl.trim()
          };
        }
        return post;
      });
      onUpdate(tc);
      setEditingPostId(null);
      alert("Publicação atualizada com sucesso!");
    } catch (err) {
      console.error("Erro fatal ao editar post do mural:", err);
      alert("Ocorreu um erro ao salvar as alterações: " + err.message);
    }
  };

  const handleDeletePost = (id) => {
    try {
      if (!window.confirm("Deseja excluir esta publicação da galeria?")) return;
      const tc = deepClone(c);
      tc.mural = (tc.mural || []).filter(item => item.id !== id);
      onUpdate(tc);
      alert("Publicação excluída.");
    } catch (err) {
      console.error("Erro fatal ao excluir post do mural:", err);
      alert("Ocorreu um erro ao excluir o post: " + err.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: t.text, margin: "0 0 4px 0" }}>🎬 Galeria de Fotos & Vídeos (Estilo Instagram)</h3>
      
      {midias.length === 0 ? (
        <div style={{ ...S.card, textAlign: "center", padding: 24, color: t.textSec }}>
          Nenhuma foto ou vídeo na galeria. Para publicar uma nova mídia, use a aba "Mural" e marque o tipo como "Foto / Vídeo"!
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[...midias].reverse().map((item, idx) => (
            <div 
              key={item.id || idx}
              onClick={() => setLightboxPost(item)}
              style={{ 
                aspectRatio: "1/1", 
                borderRadius: 12, 
                overflow: "hidden", 
                cursor: "pointer", 
                background: "#00000010",
                position: "relative",
                border: `1px solid ${t.cardBorder}`,
                transition: "transform 0.2s, box-shadow 0.2s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <GaleriaThumbnail mediaUrl={item.mediaUrl} title={item.title} t={t} />
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal para o Organizador (com permissões de Admin) */}
      {lightboxPost && (
        <MuralLightboxModal 
          post={lightboxPost} 
          onClose={() => setLightboxPost(null)} 
          t={t} 
          isAdmin={true}
          onStartEdit={handleStartEdit}
          onDelete={handleDeletePost}
          editingPostId={editingPostId}
          setEditingPostId={setEditingPostId}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          editContent={editContent}
          setEditContent={setEditContent}
          editType={editType}
          setEditType={setEditType}
          editMediaUrl={editMediaUrl}
          setEditMediaUrl={setEditMediaUrl}
          onSaveEdit={handleSaveEdit}
        />
      )}
    </div>
  );
}



function PlayerAvatar({atleta, size=24}) {
  const display = getPlayerName(atleta) || "?";
  if (atleta?.foto) return <img src={atleta.foto} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}} alt={display} />;
  return <div style={{width:size,height:size,borderRadius:"50%",background:"#378ADD",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.5,fontWeight:700,flexShrink:0}}>{display.charAt(0).toUpperCase()}</div>;
}

function initStandings(teams){return teams.map(n=>({name:n,pts:0,j:0,v:0,e:0,d:0,gp:0,gc:0,sg:0}));}
function recalcStandings(teams,rounds){
  const st=initStandings(teams);
  rounds.forEach(rd=>rd.matches.forEach(m=>{
    if(!m.played)return;
    const h=st.find(x=>x.name===m.home),a=st.find(x=>x.name===m.away);if(!h||!a)return;
    const hs=parseInt(m.homeScore),as2=parseInt(m.awayScore);
    h.j++;a.j++;h.gp+=hs;h.gc+=as2;a.gp+=as2;a.gc+=hs;h.sg=h.gp-h.gc;a.sg=a.gp-a.gc;
    if(hs>as2){h.v++;h.pts+=3;a.d++;}else if(hs===as2){h.e++;h.pts++;a.e++;a.pts++;}else{a.v++;a.pts+=3;h.d++;}
  }));
  return st.sort((a,b)=>b.pts-a.pts||b.sg-a.sg||b.gp-a.gp);
}
function generateRR(teams,turno){
  const list=[...teams];if(list.length%2!==0)list.push("_bye_");
  const rounds=list.length-1,half=list.length/2,result=[];let r=[...list];
  for(let i=0;i<rounds;i++){
    const rm=[];
    for(let j=0;j<half;j++){const h=r[j],av=r[r.length-1-j];if(h!=="_bye_"&&av!=="_bye_")rm.push({home:h,away:av,homeScore:"",awayScore:"",played:false,date:""});}
    result.push({round:i+1,matches:rm});
    r=[r[0],...r.slice(r.length-1),...r.slice(1,r.length-1)];
  }
  if(turno){const ret=result.map((rd,i)=>({round:rounds+i+1,matches:rd.matches.map(m=>({home:m.away,away:m.home,homeScore:"",awayScore:"",played:false,date:""}))}));return[...result,...ret];}
  return result;
}
function phaseName(n){if(n===2)return"Final";if(n===4)return"Semifinal";if(n===8)return"Quartas";if(n===16)return"Oitavas";return`Fase de ${n}`;}
function generateKO(teams, noShuffle = false){
  const s=noShuffle ? [...teams] : cryptoShuffle([...teams]);const phases=[];let cur=s,ph=1;
  while(cur.length>1){
    const pairs=[];for(let i=0;i<cur.length;i+=2)if(cur[i+1])pairs.push({home:cur[i],away:cur[i+1],homeScore:"",awayScore:"",played:false,winner:null,date:""});
    phases.push({phase:ph,name:phaseName(cur.length),matches:pairs,advancers:[]});
    cur=new Array(Math.ceil(cur.length/2)).fill(null);ph++;
  }
  return phases;
}

function separarAtletasSorteio(presentes, numTeams, ppt) {
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

function agruparUnidades(players) {
  const unidades = [];
  const visitados = new Set();
  
  players.forEach(p => {
    if (visitados.has(p.id)) return;
    
    if (p.isConvidado && p.convidadoDe) {
      const host = players.find(x => x.id === p.convidadoDe);
      if (host && !visitados.has(host.id)) {
        unidades.push([host, p]);
        visitados.add(host.id);
        visitados.add(p.id);
        return;
      }
    }
    
    const guest = players.find(x => x.isConvidado && x.convidadoDe === p.id);
    if (guest && !visitados.has(guest.id)) {
      unidades.push([p, guest]);
      visitados.add(p.id);
      visitados.add(guest.id);
      return;
    }
    
    unidades.push([p]);
    visitados.add(p.id);
  });
  
  return unidades;
}

function drawBalancedTeams(athletes,numTeams,ppt){
  const shuffled=cryptoShuffle(athletes);
  const teams=Array.from({length:numTeams},(_,i)=>({name:"Time "+(i+1),players:[],skillSum:0}));
  shuffled.forEach((a,idx)=>{const ti=idx%numTeams;teams[ti].players.push(a);teams[ti].skillSum+=a.habilidade||a.skill||3;});
  const bench=cryptoShuffle(teams.reduce((acc,t)=>acc.concat(t.players.slice(ppt)),[]));
  return{fullTeams:teams.map(t=>({name:t.name,players:t.players.slice(0,ppt)})),bench};
}
function buildInitialPeladaState(drawnTeams,bench,existingMatchLog=[]){
  const queue=drawnTeams.map(t=>t.name);
  const teamBases = {};
  drawnTeams.forEach(t => {
    teamBases[t.name] = t.players.map(p => p.id || p.atleta_id || p.idAtleta);
  });
  return{teams:drawnTeams,queue,bench,matchLog:existingMatchLog,currentMatch:null,teamBases};
}
function startNextMatch(ps,dataRealizacaoId="",pptParam=null){
  if(!ps||ps.queue.length<2)return ps;
  const[a,b]=[ps.queue[0],ps.queue[1]];
  const modoRodizio = ps.modoRodizio || "auto";
  const jogadoresPorTime = pptParam || ps?.playersPerTeam || 6;

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
      
      const originalPlayers = baseIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
      return { ...t, players: originalPlayers };
    });

    const teamAObj = newTeams.find(t => t.name === a);
    const teamBObj = newTeams.find(t => t.name === b);
    const countA = teamAObj ? teamAObj.players.length : 0;
    const countB = teamBObj ? teamBObj.players.length : 0;
    const precisaA = Math.max(0, jogadoresPorTime - countA);
    const precisaB = Math.max(0, jogadoresPorTime - countB);

    if (precisaA > 0 || precisaB > 0) {
      const timesDeFora = newTeams.filter(t => t.name !== a && t.name !== b);
      let candidatos = [];
      timesDeFora.forEach(t => {
        candidatos.push(...t.players);
      });

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
      if (teamAObj) {
        for (let i = 0; i < precisaA && offset < candidatos.length; i++) {
          const emp = candidatos[offset++];
          teamAObj.players.push(emp);
          teamAEmprestados.push(emp.id || emp.atleta_id || emp.idAtleta);
        }
      }
      if (teamBObj) {
        for (let i = 0; i < precisaB && offset < candidatos.length; i++) {
          const emp = candidatos[offset++];
          teamBObj.players.push(emp);
          teamBEmprestados.push(emp.id || emp.atleta_id || emp.idAtleta);
        }
      }
    }
  }

  const teamAObj = newTeams.find(t=>t.name===a);
  const teamBObj = newTeams.find(t=>t.name===b);
  const defaultGoleiroA = teamAObj?.players?.find(p=>p.goleiro||p.isGoalkeeper)?.id || "";
  const defaultGoleiroB = teamBObj?.players?.find(p=>p.goleiro||p.isGoalkeeper)?.id || "";

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
      teamBEmprestados
    }
  };
}
function getVitoriasSeguidas(matchLog, teamName, dataRealizacaoId) {
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
function resolveMatch(ps,scoreA,scoreB,dataRealizacaoId=""){
  const sA=parseInt(scoreA),sB=parseInt(scoreB);
  
  const empateAmbosSaem = ps.empateAmbosSaem === true;
  const limiteVitorias = parseInt(ps.limiteVitorias) || 0;
  
  let winner = "";
  let loser = "";
  let ambosSairamEmpate = false;
  let vencedorAtingiuLimite = false;
  
  if (sA === sB) {
    if (empateAmbosSaem) {
      ambosSairamEmpate = true;
      winner = "Empate (Ambos Saíram)";
      loser = "Ambos";
    } else {
      winner = ps.currentMatch.teamA;
      loser = ps.currentMatch.teamB;
    }
  } else {
    winner = sA > sB ? ps.currentMatch.teamA : ps.currentMatch.teamB;
    loser = winner === ps.currentMatch.teamA ? ps.currentMatch.teamB : ps.currentMatch.teamA;
  }
  
  const teamAObj = ps.teams.find(t=>t.name===ps.currentMatch.teamA);
  const teamBObj = ps.teams.find(t=>t.name===ps.currentMatch.teamB);
  const playersA = teamAObj ? deepClone(teamAObj.players) : [];
  const playersB = teamBObj ? deepClone(teamBObj.players) : [];

  let newTeams = [...ps.teams];
  let newBench = [...ps.bench];
  const modoRodizio = ps.modoRodizio || "auto";
  
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
  
  const tempLog = [...ps.matchLog, currentMatchLogEntry];
  
  if (!ambosSairamEmpate && limiteVitorias > 0) {
    const vitoriasSeguidas = getVitoriasSeguidas(tempLog, winner, dataRealizacaoId || ps.currentMatch.dataRealizacaoId);
    if (vitoriasSeguidas >= limiteVitorias) {
      vencedorAtingiuLimite = true;
      currentMatchLogEntry.limiteAtingido = true;
    }
  }
  
  if (modoRodizio === "auto" && newBench.length > 0) {
    if (ambosSairamEmpate) {
      // Time A
      const tA = newTeams.find(t=>t.name===ps.currentMatch.teamA);
      if (tA) {
        const timeUnidades = agruparUnidades(tA.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t=>t.name===ps.currentMatch.teamA ? {...t, players: newPlayers} : t);
      }
      
      // Time B
      const tB = newTeams.find(t=>t.name===ps.currentMatch.teamB);
      if (tB && newBench.length > 0) {
        const timeUnidades = agruparUnidades(tB.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t=>t.name===ps.currentMatch.teamB ? {...t, players: newPlayers} : t);
      }
    } else if (vencedorAtingiuLimite) {
      // Primeiro o perdedor
      const tLoser = newTeams.find(t=>t.name===loser);
      if (tLoser) {
        const timeUnidades = agruparUnidades(tLoser.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t=>t.name===loser ? {...t, players: newPlayers} : t);
      }
      
      // Depois o vencedor
      const tWinner = newTeams.find(t=>t.name===winner);
      if (tWinner && newBench.length > 0) {
        const timeUnidades = agruparUnidades(tWinner.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t=>t.name===winner ? {...t, players: newPlayers} : t);
      }
    } else {
      // Caso padrão: apenas perdedor
      const tLoser = newTeams.find(t=>t.name===loser);
      if (tLoser) {
        const timeUnidades = agruparUnidades(tLoser.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t=>t.name===loser ? {...t, players: newPlayers} : t);
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
    if (ps.teamBases) {
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
    }
  }

  const rest = ps.queue.slice(2);
  let newQueue = [];
  if (ambosSairamEmpate) {
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

  return {...ps, teams: newTeams, queue: newQueue, bench: newBench, matchLog: tempLog, currentMatch: null, historicoEmprestimos};
}

/* ─────────────────────────── CRONÔMETRO E AUDIO ─────────────────── */
const playWhistleSound = () => {
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

function MatchTimer({ t, defaultMinutes = 10, timerKey }) {
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
      } else {
        setSeconds(remainingSecs);
        setRunning(true);
        setIsFinished(false);
      }
    } else {
      const secs = savedSeconds ? parseInt(savedSeconds) : initialSecs;
      setSeconds(secs);
      setRunning(false);
      setIsFinished(secs === 0 && savedSeconds !== null);
    }
  }, [timerKey]);

  // Salva reativamente no localStorage
  const saveStateToLocalStorage = (newRunning, newSeconds, newInitial, newConfig) => {
    if (!timerKey) return;
    
    localStorage.setItem(`${timerKey}_running`, String(newRunning));
    localStorage.setItem(`${timerKey}_seconds`, String(newSeconds));
    localStorage.setItem(`${timerKey}_initial`, String(newInitial));
    localStorage.setItem(`${timerKey}_isConfiguring`, String(newConfig));
    
    if (newRunning) {
      localStorage.setItem(`${timerKey}_startTimestamp`, String(Date.now()));
    } else {
      localStorage.removeItem(`${timerKey}_startTimestamp`);
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

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progressPercent = initialSeconds > 0 ? (seconds / initialSeconds) * 100 : 0;
  const isUrgent = seconds > 0 && seconds <= 30;
  const isDark = t.bg === "#0f1117" || t.bg === "#000000";

  return (
    <div style={{
      background: t.inputBg,
      border: `1.5px solid ${isFinished ? "#E24B4A" : isUrgent ? "#E24B4A" : t.cardBorder}`,
      borderRadius: 14,
      padding: 12,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      width: "100%",
      boxSizing: "border-box",
      marginBottom: 14,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      transition: "all 0.3s ease"
    }}>
      <style>{`
        @keyframes pulse-red-timer {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes blink-red-timer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      {isConfiguring ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.textSec, textTransform: "uppercase" }}>Tempo de Jogo:</span>
            <input 
              type="number" 
              value={minutesInput} 
              onChange={e => setMinutesInput(e.target.value)}
              style={{
                width: 60,
                padding: "6px 8px",
                borderRadius: 8,
                border: `1.5px solid ${t.inputBorder}`,
                background: t.inputBg,
                color: t.text,
                fontSize: 13,
                fontWeight: 700,
                textAlign: "center"
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: t.textSec }}>min</span>
          </div>
          <button 
            onClick={handleConfigSave}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              background: "#1D9E75",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12
            }}
          >
            ✓ Definir
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{
                fontSize: 32,
                fontWeight: 850,
                fontFamily: "monospace",
                color: isFinished ? "#E24B4A" : isUrgent ? "#E24B4A" : t.text,
                animation: isUrgent ? "pulse-red-timer 1s infinite" : isFinished ? "blink-red-timer 1.5s infinite" : "none",
                letterSpacing: 0.5
              }}>
                {formatTimer(seconds)}
              </span>
              {isFinished && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#E24B4A",
                  background: "#E24B4A22",
                  padding: "2px 6px",
                  borderRadius: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.5
                }}>
                  ⚽ Fim!
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {running ? (
                <button 
                  onClick={handlePause} 
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "#BA751722",
                    color: "#BA7517",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: "pointer"
                  }}
                >
                  ⏸ Pausar
                </button>
              ) : (
                <button 
                  onClick={handleStart} 
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "#1D9E7522",
                    color: "#1D9E75",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: "pointer"
                  }}
                >
                  ▶ Iniciar
                </button>
              )}
              
              <button 
                onClick={handleReset} 
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  background: isDark ? "#2d334a" : "#e2e8f0",
                  color: t.textSec,
                  border: "none",
                  fontWeight: 700,
                  fontSize: 11,
                  cursor: "pointer"
                }}
              >
                🔄 Reset
              </button>

              <button 
                onClick={() => setIsConfiguring(true)} 
                style={{
                  padding: "6px 8px",
                  borderRadius: 8,
                  background: "transparent",
                  color: t.textSec,
                  border: `1.5px solid ${t.cardBorder}`,
                  fontSize: 11,
                  cursor: "pointer"
                }}
                title="Configurar Tempo"
              >
                ⚙️
              </button>
            </div>
          </div>

          {!isFinished && (
            <div style={{
              width: "100%",
              height: 5,
              borderRadius: 3,
              background: isDark ? "#2a2d3e" : "#e2e8f0",
              overflow: "hidden"
            }}>
              <div style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: isUrgent ? "#E24B4A" : "#1D9E75",
                transition: "width 1s linear"
              }} />
            </div>
          )}

          <div style={{ display: "flex", gap: 6, justifyContent: "flex-start", marginTop: 2 }}>
            <button 
              onClick={handleSubMinute} 
              style={{
                padding: "3px 8px",
                borderRadius: 6,
                background: isDark ? "#25293d" : "#f8fafc",
                color: t.textSec,
                border: `1.5px solid ${t.cardBorder}`,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              - 1 min
            </button>
            <button 
              onClick={handleAddMinute} 
              style={{
                padding: "3px 8px",
                borderRadius: 6,
                background: isDark ? "#25293d" : "#f8fafc",
                color: t.textSec,
                border: `1.5px solid ${t.cardBorder}`,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              + 1 min
            </button>
            {isFinished && (
              <button 
                onClick={() => {
                  playWhistleSound();
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "#BA751722",
                  color: "#BA7517",
                  border: "none",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  marginLeft: "auto"
                }}
              >
                🔊 Apitar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── LOGIN SCREENS ───────────────────────── */
function LoginScreen({ onLogin, onRegister, onForgotPassword, onBack, t }) {
  const S = makeStyles(t);
  const [activeTab, setActiveTab] = useState("login"); // login | register | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (activeTab === "login") {
        if (!email.trim() || !password.trim()) {
          setError("Informe seu e-mail e sua senha.");
          setLoading(false);
          return;
        }
        const err = await onLogin({ email: email.trim(), password });
        if (err) setError(err);
      } else if (activeTab === "register") {
        if (!email.trim() || !password.trim() || !name.trim()) {
          setError("Preencha todos os campos.");
          setLoading(false);
          return;
        }
        const err = await onRegister({ email: email.trim(), password, name: name.trim() });
        if (err) {
          setError(err);
        } else {
          setSuccess("Conta criada com sucesso! Você já pode entrar.");
          setActiveTab("login");
          setPassword("");
        }
      } else if (activeTab === "forgot") {
        if (!email.trim()) {
          setError("Informe o seu e-mail cadastrado.");
          setLoading(false);
          return;
        }
        const err = await onForgotPassword(email.trim());
        if (err) {
          setError(err);
        } else {
          setSuccess("Link de redefinição de senha enviado para o seu e-mail!");
        }
      }
    } catch (err) {
      setError("Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const isDark = t.bg === "#0f1117";

  return (
    <div style={{
      ...S.page,
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      padding: "24px 16px"
    }}>
      {/* Esferas de background brilhantes para efeito de profundidade premium */}
      <div style={{
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(29, 158, 117, 0.4) 0%, rgba(29, 158, 117, 0) 70%)",
        top: "-50px",
        left: "-50px",
        filter: "blur(40px)",
        pointerEvents: "none",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        width: 350,
        height: 350,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(55, 138, 221, 0.35) 0%, rgba(55, 138, 221, 0) 70%)",
        bottom: "-100px",
        right: "-50px",
        filter: "blur(50px)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      <div style={{
        width: "100%",
        maxWidth: 480,
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 20
      }}>
        {/* Logotipo/Cabeçalho */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <div style={{
            fontSize: 48,
            fontWeight: 900,
            background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "inline-block",
            animation: "pulse-logo 3s infinite ease-in-out",
            letterSpacing: "-1.5px"
          }}>
            ⚽ Thorneios
          </div>
          <p style={{
            color: t.textSec,
            fontSize: 14,
            margin: "8px 0 0",
            fontWeight: 500
          }}>
            O gerenciador definitivo para seus campeonatos e peladas
          </p>
        </div>

        {/* Card de Autenticação Premium (Glassmorphism) */}
        <div style={{
          background: isDark ? "rgba(18, 18, 18, 0.75)" : "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderRadius: 24,
          padding: "32px 28px",
          border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
          boxShadow: isDark 
            ? "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 50px rgba(0, 149, 246, 0.05)" 
            : "0 20px 40px rgba(0, 0, 0, 0.05)",
          transition: "transform 0.3s ease, box-shadow 0.3s ease"
        }}>
          {/* Abas */}
          <div style={{
            display: "flex",
            borderBottom: `1.5px solid ${t.cardBorder}`,
            marginBottom: 26,
            gap: 12
          }}>
            <button 
              type="button"
              onClick={() => { setActiveTab("login"); setError(""); setSuccess(""); }}
              style={{
                flex: 1,
                padding: "12px 6px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "login" ? "2.5px solid #0095F6" : "2.5px solid transparent",
                color: activeTab === "login" ? t.text : t.textSec,
                fontSize: 14,
                fontWeight: activeTab === "login" ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              🔑 Entrar
            </button>
            <button 
              type="button"
              onClick={() => { setActiveTab("register"); setError(""); setSuccess(""); }}
              style={{
                flex: 1,
                padding: "12px 6px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "register" ? "2.5px solid #0095F6" : "2.5px solid transparent",
                color: activeTab === "register" ? t.text : t.textSec,
                fontSize: 14,
                fontWeight: activeTab === "register" ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              📝 Criar Conta
            </button>
            <button 
              type="button"
              onClick={() => { setActiveTab("forgot"); setError(""); setSuccess(""); }}
              style={{
                flex: 1,
                padding: "12px 6px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "forgot" ? "2.5px solid #0095F6" : "2.5px solid transparent",
                color: activeTab === "forgot" ? t.text : t.textSec,
                fontSize: 14,
                fontWeight: activeTab === "forgot" ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              ❓ Recuperar
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Campo Nome (Apenas Registro) */}
            {activeTab === "register" && (
              <div>
                <label style={S.label}>Nome Completo</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>👤</span>
                  <input 
                    style={{ ...S.input, paddingLeft: 38 }}
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Seu nome" 
                    required 
                  />
                </div>
              </div>
            )}

            {/* Campo E-mail (Todos os modos) */}
            <div>
              <label style={S.label}>E-mail</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>✉️</span>
                <input 
                  type="email"
                  style={{ ...S.input, paddingLeft: 38 }}
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="seu@email.com" 
                  required 
                />
              </div>
            </div>

            {/* Campo Senha (Login e Registro) */}
            {activeTab !== "forgot" && (
              <div>
                <label style={S.label}>Senha</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔒</span>
                  <input 
                    style={{ ...S.input, paddingLeft: 38, paddingRight: 42 }} 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="Sua senha" 
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: t.textSec,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0
                    }}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Mensagem de Erro */}
            {error && (
              <div style={{
                background: "rgba(226, 75, 74, 0.12)",
                border: "1px solid rgba(226, 75, 74, 0.2)",
                color: "#E24B4A",
                padding: "10px 14px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                animation: "shake 0.4s"
              }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Mensagem de Sucesso */}
            {success && (
              <div style={{
                background: "rgba(0, 149, 246, 0.12)",
                border: "1px solid rgba(0, 149, 246, 0.2)",
                color: "#0095F6",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span>✅</span>
                <span>{success}</span>
              </div>
            )}

            {/* Botão de Ação */}
            <button 
              type="submit" 
              disabled={loading}
              style={{
                ...S.btn(loading ? "#0095F6aa" : "#0095F6"),
                padding: "14px 20px",
                fontSize: 14,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 8,
                justifyContent: "center",
                boxShadow: isDark ? "0 4px 12px rgba(0, 149, 246, 0.2)" : "0 4px 12px rgba(0, 149, 246, 0.1)",
                transition: "all 0.2s ease",
                transform: loading ? "scale(0.98)" : "none"
              }}
            >
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTop: "2px solid #fff",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                  }} />
                  <span>Processando...</span>
                </div>
              ) : activeTab === "login" ? "Entrar na Minha Conta" : activeTab === "register" ? "Cadastrar Minha Conta" : "Enviar E-mail de Recuperação"}
            </button>
          </form>
        </div>

        {/* Botão de Voltar para Seleção */}
        <button 
          onClick={onBack}
          style={{
            alignSelf: "center",
            padding: "10px 20px",
            background: "transparent",
            border: `1.5px solid ${t.cardBorder}`,
            color: t.text,
            borderRadius: 14,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = t.card;
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.transform = "none";
          }}
        >
          <span>←</span>
          <span>Acompanhar Campeonatos (Voltar)</span>
        </button>
      </div>

      {/* Estilos e animações globais inseridos dinamicamente */}
      <style>{`
        @keyframes pulse-logo {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(29, 158, 117, 0.1)); }
          50% { transform: scale(1.02); filter: drop-shadow(0 0 10px rgba(55, 138, 221, 0.2)); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

function SelectionScreen({onLoginScreen,onAccessCloud,t}){
  const S=makeStyles(t);
  const [code, setCode] = useState("");
  return(
    <div style={S.page}>
      <div style={{maxWidth:560,margin:"0 auto",display:"flex",flexDirection:"column",gap:24}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:32,fontWeight:800,color:t.text}}>⚽ Thorneios</div>
          <div style={{fontSize:14,color:t.textSec,marginTop:8}}>Faça login para acessar o painel de gerenciamento ou acompanhe um campeonato compartilhado abaixo.</div>
        </div>
        
        <button onClick={onLoginScreen} style={{...S.card,background:t.card,border:`1px solid ${t.cardBorder}`,padding:20,display:"flex",flexDirection:"column",gap:12,alignItems:"flex-start",cursor:"pointer",width:"100%",textAlign:"left"}}>
          <div style={{fontSize:22,color:t.text}}>🔐 Acesso Organizador (Login)</div>
          <div style={{color:t.textSec,fontSize:13}}>Acesse como Administrador ou Manager para gerenciar peladas, campeonatos, súmulas e moderações.</div>
          <div style={{color:"#378ADD",fontWeight:800,fontSize:14,marginTop:4}}>Ir para o Login →</div>
        </button>

        <div style={S.card}>
          <div style={{fontWeight:700,fontSize:14,color:t.text,marginBottom:8}}>🌐 Acompanhar Campeonato da Nuvem</div>
          <div style={{fontSize:12,color:t.textSec,marginBottom:12}}>Digite o código de 10 dígitos do campeonato fornecido pelo organizador para ver a tabela e placares.</div>
          <div style={{display:"flex",gap:8}}>
            <input 
              style={{...S.input, flex:1}} 
              value={code} 
              onChange={e=>setCode(e.target.value)} 
              placeholder="Ex: 5123abcdab" 
            />
            <button 
              onClick={() => {
                if (code.trim()) {
                  onAccessCloud(code.trim());
                } else {
                  alert("Por favor, insira um código de campeonato.");
                }
              }} 
              style={S.btn("#1D9E75")}
            >
              Acessar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagerRegistry({managers,onAdd,onUpdate,onRemove,onBack,t}){
  const S=makeStyles(t);
  const [form,setForm]=useState({name:"",email:"",password:"",scope:"campeonato"});
  const [error,setError]=useState("");
  const [editId,setEditId]=useState(null);

  const handleSave=()=>{
    if(!form.name.trim()||!form.email.trim()||!form.password.trim()){
      setError("Preencha nome, e-mail e senha do manager.");
      return;
    }
    if(managers.some(m=>m.id!==editId && String(m.email||"").toLowerCase()===String(form.email||"").trim().toLowerCase())){
      setError("Já existe um manager com esse e-mail.");
      return;
    }
    if(editId){
      onUpdate(editId, {
        name:form.name.trim(),
        email:form.email.trim().toLowerCase(),
        password:form.password,
        scope:form.scope,
      });
      setEditId(null);
    } else {
      onAdd({
        name:form.name.trim(),
        email:form.email.trim().toLowerCase(),
        password:form.password,
        scope:form.scope,
      });
    }
    setForm({name:"",email:"",password:"",scope:"campeonato"});
    setError("");
  };

  const iniciarEdicao=(m)=>{
    setEditId(m.id);
    setForm({name:m.name, email:m.email, password:m.password, scope:m.scope||"campeonato"});
    setError("");
  };

  const cancelarEdicao=()=>{
    setEditId(null);
    setForm({name:"",email:"",password:"",scope:"campeonato"});
    setError("");
  };

  return(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={onBack} style={S.btnSm()}>← Voltar</button><div><h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>Cadastro de Managers</h2><div style={{fontSize:12,color:t.textSec}}>Adicione e gerencie gestores com nome, e-mail, senha e tipo de acesso.</div></div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={S.card}>
          <div style={{fontWeight:700,fontSize:14,color:t.text,marginBottom:12}}>{editId ? "Editar manager" : "Novo manager"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div>
              <label style={S.label}>Nome</label>
              <input style={S.input} value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))} placeholder="Nome do manager" />
            </div>
            <div>
              <label style={S.label}>E-mail</label>
              <input style={S.input} value={form.email} onChange={e=>setForm(v=>({...v,email:e.target.value}))} placeholder="email@exemplo.com" />
            </div>
            <div>
              <label style={S.label}>Senha</label>
              <input style={S.input} type="password" value={form.password} onChange={e=>setForm(v=>({...v,password:e.target.value}))} placeholder="Senha" />
            </div>
            <div>
              <label style={S.label}>Tipo de acesso</label>
              <select style={S.select} value={form.scope} onChange={e=>setForm(v=>({...v,scope:e.target.value}))}>
                <option value="campeonato">Campeonato</option>
                <option value="pelada">Pelada</option>
                <option value="geral">Geral</option>
              </select>
            </div>
            {error && <div style={{color:"#E24B4A",fontSize:12,fontWeight:700}}>{error}</div>}
            <div style={{display:"flex",gap:8}}>
              <button onClick={handleSave} style={{...S.btn(),flex:1}}>{editId ? "Atualizar" : "Salvar Manager"}</button>
              {editId && <button onClick={cancelarEdicao} style={{...S.btn(t.card, t.textSec),border:`1px solid ${t.cardBorder}`}}>Cancelar</button>}
            </div>
          </div>
        </div>
        <div style={{...S.card,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontWeight:700,fontSize:14,color:t.text,marginBottom:12}}>Managers registrados</div>
          {managers.length===0 ? <div style={{color:t.textSec,fontSize:12}}>Nenhum manager cadastrado.</div> : managers.map(m=>(
            <div key={m.id} style={{padding:"10px 0",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
              <div>
                <div style={{fontWeight:700,color:t.text}}>{m.name}</div>
                <div style={{fontSize:12,color:t.textSec,marginBottom:4}}>{m.email}</div>
                <div style={{fontSize:12,color:t.textSec}}>{m.scope==="campeonato"?"Campeonato":m.scope==="pelada"?"Pelada":"Geral"}</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>iniciarEdicao(m)} style={S.btnSm("#378ADD22","#378ADD")}>✏️</button>
                <button onClick={()=>{if(window.confirm(`Excluir gestor ${m.name}?`))onRemove(m.id);}} style={S.btnSm("#E24B4A22","#E24B4A")}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PublicScreen({campeonatos,atletas,current,setCurrent,onBack,t}){
  const S=makeStyles(t);
  const [tab,setTab]=useState("tabela");

  const colorOf = useCallback((n,teams)=>COLORS[(teams||[]).indexOf(n)%COLORS.length],[]);

  const publicChamp = campeonatos.find(c=>current?.id===c.id) || current;
  const getPlayerNameById = id => getPlayerName(atletas.find(x=>String(x.id)===String(id)));

  const allEvents = [];
  if(publicChamp?.rounds) publicChamp.rounds.forEach(r=>r.matches.forEach(m=>m.events?.forEach(e=>allEvents.push(e))));
  if(publicChamp?.groups) publicChamp.groups.forEach(g=>g.rounds.forEach(r=>r.matches.forEach(m=>m.events?.forEach(e=>allEvents.push(e)))));
  if(publicChamp?.knockout) publicChamp.knockout.forEach(p=>p.matches.forEach(m=>m.events?.forEach(e=>allEvents.push(e))));

  const stats = {};
  allEvents.forEach(e => {
    const key = String(e.atletaId);
    if(!stats[key]) stats[key] = { atletaId:key, gols:0, am:0, vm:0, teamName:e.teamName };
    if(e.type==="gol") stats[key].gols++;
    if(e.type==="amarelo") stats[key].am++;
    if(e.type==="vermelho") stats[key].vm++;
  });

  const statsArr = Object.values(stats).map(s => ({
    ...s,
    atleta: atletas.find(x=>String(x.id)===String(s.atletaId))
  })).filter(x=>x.atleta);

  const topGols = [...statsArr].filter(x=>x.gols>0).sort((a,b)=>b.gols-a.gols);
  const topAm = [...statsArr].filter(x=>x.am>0).sort((a,b)=>b.am-a.am);
  const topVm = [...statsArr].filter(x=>x.vm>0).sort((a,b)=>b.vm-a.vm);

  if(current && !publicChamp){
    return (
      <div style={S.page}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setCurrent(null)} style={S.btnSm()}>← Voltar</button><h2 style={{fontSize:18,fontWeight:800,color:t.text}}>Campeonato não encontrado</h2></div>
      </div>
    );
  }

  const renderMatch = (m) => {
    const matchEvents = m.events || [];
    const goals = matchEvents.filter(e=>e.type==="gol");
    const yellows = matchEvents.filter(e=>e.type==="amarelo");
    const reds = matchEvents.filter(e=>e.type==="vermelho");
    const leftEvents = matchEvents.filter(e=>e.teamName===m.home);
    const rightEvents = matchEvents.filter(e=>e.teamName===m.away);
    const renderSide = (events, sideName) => {
      const goalsSide = events.filter(e=>e.type==="gol");
      const yellowSide = events.filter(e=>e.type==="amarelo");
      const redSide = events.filter(e=>e.type==="vermelho");
      return (
        <div style={{display:"flex",flexDirection:"column",gap:6,padding:10,border:`1px solid ${t.cardBorder}`,borderRadius:12,background:t.inputBg}}>
          <div style={{fontSize:12,fontWeight:700,color:t.text}}>{sideName}</div>
          {goalsSide.length>0 ? goalsSide.map((e,i)=><div key={`g-${i}`} style={{fontSize:12,color:t.text}}><span style={{marginRight:6}}>⚽</span>{getPlayerNameById(e.atletaId)}</div>) : <div style={{fontSize:12,color:t.textSec}}>Nenhum gol</div>}
          {yellowSide.length>0 ? yellowSide.map((e,i)=><div key={`y-${i}`} style={{fontSize:12,color:t.text}}><span style={{marginRight:6}}>🟨</span>{getPlayerNameById(e.atletaId)}</div>) : <div style={{fontSize:12,color:t.textSec}}>Nenhum amarelo</div>}
          {redSide.length>0 ? redSide.map((e,i)=><div key={`r-${i}`} style={{fontSize:12,color:t.text}}><span style={{marginRight:6}}>🟥</span>{getPlayerNameById(e.atletaId)}</div>) : <div style={{fontSize:12,color:t.textSec}}>Nenhum vermelho</div>}
        </div>
      );
    };
    return (
      <div key={`${m.home}-${m.away}-${m.date||Math.random()}`} style={{padding:12,border:`1px solid ${t.cardBorder}`,borderRadius:12,background:t.card,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0,justifyContent:"flex-start"}}><Avatar name={m.home} size={36} color={colorOf(m.home,publicChamp.teams)} src={publicChamp.emblems?.[m.home]}/><span style={{fontWeight:800,fontSize:15,color:t.text}}>{m.home}</span></div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:100,flexShrink:0}}><div style={{fontSize:20,fontWeight:900,color:t.text}}>{m.played?`${m.homeScore}×${m.awayScore}`:"—×—"}</div><div style={{fontSize:11,color:t.textSec,marginTop:4}}>{m.date?formatarData(m.date):"Data não informada"}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0,justifyContent:"flex-end"}}><span style={{fontWeight:800,fontSize:15,color:t.text}}>{m.away}</span><Avatar name={m.away} size={36} color={colorOf(m.away,publicChamp.teams)} src={publicChamp.emblems?.[m.away]}/></div>
        </div>
        {matchEvents.length ? (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {renderSide(leftEvents, m.home)}
            {renderSide(rightEvents, m.away)}
          </div>
        ) : null}
      </div>
    );
  };

  const renderStats = () => (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12,marginTop:18}}>
      <div style={S.card}>
        <div style={{fontSize:14,fontWeight:700,color:t.text,marginBottom:10}}>⚽ Top 10 Artilharia</div>
        {topGols.length===0 ? <div style={{fontSize:12,color:t.textSec}}>Nenhum gol registrado ainda.</div> : topGols.slice(0,10).map((x,i)=><div key={x.atletaId} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i!==Math.min(topGols.length,10)-1?`1px solid ${t.cardBorder}`:"none"}}><span style={{fontSize:12,color:t.text}}>{getPlayerNameById(x.atletaId)}</span><span style={{fontSize:12,fontWeight:700,color:t.text}}>{x.gols}</span></div>)}
      </div>
      <div style={S.card}>
        <div style={{fontSize:14,fontWeight:700,color:t.text,marginBottom:10}}>🟨 Amarelos</div>
        {topAm.length===0 ? <div style={{fontSize:12,color:t.textSec}}>Nenhum cartão amarelo.</div> : topAm.map((x,i)=><div key={x.atletaId} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i!==topAm.length-1?`1px solid ${t.cardBorder}`:"none"}}><span style={{fontSize:12,color:t.text}}>{getPlayerNameById(x.atletaId)}</span><span style={{fontSize:12,fontWeight:700,color:t.text}}>{x.am}</span></div>)}
      </div>
      <div style={S.card}>
        <div style={{fontSize:14,fontWeight:700,color:t.text,marginBottom:10}}>🟥 Vermelhos</div>
        {topVm.length===0 ? <div style={{fontSize:12,color:t.textSec}}>Nenhum cartão vermelho.</div> : topVm.map((x,i)=><div key={x.atletaId} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:i!==topVm.length-1?`1px solid ${t.cardBorder}`:"none"}}><span style={{fontSize:12,color:t.text}}>{getPlayerNameById(x.atletaId)}</span><span style={{fontSize:12,fontWeight:700,color:t.text}}>{x.vm}</span></div>)}
      </div>
    </div>
  );

  const renderTable = () => {
    if(publicChamp.type==="pontos") return (
      <>
        <StandingsTable standings={publicChamp.standings} teams={publicChamp.teams} colorOf={colorOf} t={t} emblems={publicChamp.emblems}/>
        {renderStats()}
      </>
    );
    if(publicChamp.type==="misto" || publicChamp.type==="liga") return (
      <>
        {publicChamp.groups.map((g,gi)=>(
          <div key={gi} style={{marginBottom:18}}>
            <h3 style={{fontSize:14,fontWeight:700,color:t.text,marginBottom:10}}>{g.name}{g.quadra ? ` (🏟️ ${g.quadra})` : ""}</h3>
            <StandingsTable standings={g.standings} teams={publicChamp.teams} colorOf={colorOf} t={t} emblems={publicChamp.emblems}/>
          </div>
        ))}
        {renderStats()}
      </>
    );
    return (
      <>
        <div style={{...S.card,color:t.textSec,fontSize:13}}>Este campeonato não tem tabela de pontos. Confira os jogos.</div>
        {renderStats()}
      </>
    );
  };

  const renderGames = () => {
    if(publicChamp.type==="pontos") return publicChamp.rounds.flatMap(r=>[
      <div key={`title-${r.round}`} style={{fontSize:13,fontWeight:700,color:t.textSec,marginBottom:6}}>Rodada {r.round}</div>,
      ...r.matches.map(renderMatch)
    ]);
    if(publicChamp.type==="misto" || publicChamp.type==="liga") return publicChamp.groups.flatMap((g,gi)=>[
      <div key={`group-${gi}`} style={{marginTop:gi===0?0:24}}><h3 style={{fontSize:14,fontWeight:700,color:t.text,marginBottom:10}}>{g.name}</h3></div>,
      ...g.rounds.flatMap(r=>[
        <div key={`grp-title-${gi}-${r.round}`} style={{fontSize:13,fontWeight:700,color:t.textSec,marginBottom:6}}>Rodada {r.round}</div>,
        ...r.matches.map(renderMatch)
      ])
    ]);
    if(publicChamp.type==="mata") return publicChamp.knockout.flatMap((phase,pi)=>[
      <div key={`phase-${pi}`} style={{marginTop:pi===0?0:24}}><h3 style={{fontSize:14,fontWeight:700,color:t.text,marginBottom:10}}>{phase.name}</h3></div>,
      ...phase.matches.map(renderMatch)
    ]);
    return null;
  };

  if(current){
    return(
      <div style={S.page}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setCurrent(null)} style={S.btnSm()}>← Voltar</button><div><h2 style={{fontSize:18,fontWeight:800,color:t.text,margin:0}}>{publicChamp.name}</h2><div style={{fontSize:12,color:t.textSec}}>{publicChamp.type==="pontos"?"Pontos Corridos":publicChamp.type==="mata"?"Mata-Mata":"Misto"}</div></div></div>
          <button onClick={onBack} style={S.btnSm()}>Voltar ao público</button>
        </div>
        <div style={{display:"flex",gap:0,marginBottom:18,borderBottom:`1px solid ${t.tabBorder}`,overflowX:"auto"}}>
          {[["tabela","Tabela"],["jogos","Jogos"]].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)} style={S.tab(tab===key)}>{label}</button>
          ))}
        </div>
        {tab==="tabela" && renderTable()}
        {tab==="jogos" && <div style={{display:"grid",gap:12}}>{renderGames()}</div>}
      </div>
    );
  }

  return(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,color:t.text,margin:0}}>👀 Acesso Público</h2>
          <div style={{fontSize:13,color:t.textSec,marginTop:6}}>Selecione um campeonato para ver resultados e classificação.</div>
        </div>
        <button onClick={onBack} style={S.btnSm()}>← Voltar</button>
      </div>
      {campeonatos.length===0 ? (
        <div style={{...S.card,textAlign:"center"}}><div style={{fontSize:14,fontWeight:700,color:t.text}}>Nenhum campeonato disponível.</div><div style={{fontSize:12,color:t.textSec,marginTop:6}}>Cadastre um campeonato para o público acompanhar.</div></div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>
          {campeonatos.map(c=>(
            <button key={c.id} onClick={()=>setCurrent(c)} style={{...S.card,textAlign:"left",padding:18,background:t.card,border:`1px solid ${t.cardBorder}`,cursor:"pointer"}}>
              <div style={{fontSize:16,fontWeight:700,color:t.text}}>{c.name}</div>
              <div style={{fontSize:12,color:t.textSec,marginTop:8}}>{c.teams.length} times · {c.type==="pontos"?"Pontos Corridos":c.type==="mata"?"Mata-Mata":"Misto"}</div>
              <div style={{fontSize:12,color:t.textSec,marginTop:12}}>Entrar para acompanhar resultados e tabela.</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── VISUALIZAÇÃO NUVEM PÚBLICA ──────────────── */
function CloudPublicChampScreen({champ,onBack,t}){
  const S=makeStyles(t);
  const c = champ;
  const [tab,setTab]=useState(c.type==="mata"?"chave":"tabela");
  const [lightboxPost, setLightboxPost] = useState(null);

  const [publicTeamName, setPublicTeamName] = useState("");
  const [publicTeamColors, setPublicTeamColors] = useState("");
  const [publicLeaderName, setPublicLeaderName] = useState("");
  const [publicLeaderContact, setPublicLeaderContact] = useState("");
  const [publicPlayersList, setPublicPlayersList] = useState([]);
  const [submittingReg, setSubmittingReg] = useState(false);

  const [playerForm, setPlayerForm] = useState({
    nome: "",
    apelido: "",
    documento: "",
    dataNascimento: "",
    numeroCamisa: "",
    customFields: {}
  });

  const handleAddPlayerToPublicList = () => {
    if (!playerForm.nome.trim()) {
      alert("Por favor, digite o nome do jogador.");
      return;
    }
    setPublicPlayersList(prev => [...prev, { ...playerForm }]);
    setPlayerForm({
      nome: "",
      apelido: "",
      documento: "",
      dataNascimento: "",
      numeroCamisa: "",
      customFields: {}
    });
  };

  const handleRemovePlayerFromPublicList = (idx) => {
    setPublicPlayersList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSendOnlineReg = async () => {
    if (!publicTeamName.trim()) {
      alert("Por favor, informe o nome do time.");
      return;
    }
    if (!publicLeaderName.trim()) {
      alert("Por favor, informe o nome do responsável.");
      return;
    }
    if (publicPlayersList.length === 0) {
      alert("Por favor, adicione pelo menos um atleta.");
      return;
    }

    try {
      setSubmittingReg(true);
      const docRef = doc(db, "campeonatos", c.id);
      
      const newReg = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        teamName: publicTeamName.trim(),
        teamColors: publicTeamColors.trim(),
        leaderName: publicLeaderName.trim(),
        leaderContact: publicLeaderContact.trim(),
        players: publicPlayersList.map((p, idx) => ({
          ...p,
          id: Date.now() + Math.floor(Math.random() * 100000) + idx
        })),
        status: "pendente",
        date: todayStr(),
        feedback: ""
      };

      const updatedPending = [...(c.pendingRegistrations || []), newReg];
      
      await setDoc(docRef, {
        ...c,
        pendingRegistrations: updatedPending
      });

      c.pendingRegistrations = updatedPending;
      
      alert("Solicitação de inscrição enviada com sucesso!");
      
      setPublicTeamName("");
      setPublicTeamColors("");
      setPublicLeaderName("");
      setPublicLeaderContact("");
      setPublicPlayersList([]);
    } catch (e) {
      console.error(e);
      alert("Erro ao enviar a inscrição: " + e.message);
    } finally {
      setSubmittingReg(false);
    }
  };

  const renderMuralPublic = () => {
    const noticias = (c.mural || []).filter(item => item.type === "noticia");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: t.text, margin: "0 0 4px 0" }}>📢 Mural de Comunicados (Estilo X)</h3>
        
        {noticias.length === 0 ? (
          <div style={{ ...S.card, textAlign: "center", padding: 30, color: t.textSec }}>
            Nenhum comunicado publicado no mural ainda. Fique atento às novidades da organização!
          </div>
        ) : (
          [...noticias].reverse().map((item, idx) => (
            <MuralPostCard 
              key={item.id || idx}
              item={item}
              isAdmin={false}
              t={t}
            />
          ))
        )}
      </div>
    );
  };

  const renderGaleriaPublic = () => {
    const midias = (c.mural || []).filter(item => item.type === "midia");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: t.text, margin: "0 0 4px 0" }}>🎬 Galeria de Fotos e Mídias (Estilo Instagram)</h3>
        
        {midias.length === 0 ? (
          <div style={{ ...S.card, textAlign: "center", padding: 30, color: t.textSec }}>
            Nenhuma foto ou mídia publicada na galeria ainda.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[...midias].reverse().map((item, idx) => (
              <div 
                key={item.id || idx}
                onClick={() => setLightboxPost(item)}
                style={{ 
                  aspectRatio: "1/1", 
                  borderRadius: 12, 
                  overflow: "hidden", 
                  cursor: "pointer", 
                  background: "#00000010",
                  position: "relative",
                  border: `1px solid ${t.cardBorder}`,
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <GaleriaThumbnail mediaUrl={item.mediaUrl} title={item.title} t={t} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderInscricaoPublic = () => {
    const customFieldsDef = c.customFieldsDef || [];
    const pendingRegs = c.pendingRegistrations || [];
    const mySubmissions = pendingRegs.filter(r => publicLeaderContact && r.leaderContact === publicLeaderContact);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={S.card}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: t.text, marginBottom: 8 }}>✍️ Ficha de Inscrição Online</h3>
          <p style={{ fontSize: 12, color: t.textSec, lineHeight: 1.5, marginBottom: 14 }}>
            Preencha a ficha abaixo para enviar a solicitação de inscrição do seu time. A organização analisará os dados no painel do torneio.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={S.label}>Nome do Time</label>
                <input 
                  style={S.input} 
                  placeholder="Ex: Spartanos FC" 
                  value={publicTeamName} 
                  onChange={e => setPublicTeamName(e.target.value)}
                />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={S.label}>Cores do Uniforme</label>
                <input 
                  style={S.input} 
                  placeholder="Ex: Azul e Branco" 
                  value={publicTeamColors} 
                  onChange={e => setPublicTeamColors(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={S.label}>Nome do Responsável</label>
                <input 
                  style={S.input} 
                  placeholder="Ex: João Silva" 
                  value={publicLeaderName} 
                  onChange={e => setPublicLeaderName(e.target.value)}
                />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={S.label}>Contato (WhatsApp)</label>
                <input 
                  style={S.input} 
                  placeholder="Ex: (11) 99999-9999" 
                  value={publicLeaderContact} 
                  onChange={e => setPublicLeaderContact(e.target.value)}
                />
              </div>
            </div>

            <div style={{ border: `1px solid ${t.cardBorder}`, borderRadius: 12, padding: 12, background: t.card, marginTop: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: t.text, marginBottom: 10 }}>➕ Adicionar Jogador ao Elenco</div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ flex: 2, minWidth: 150 }}>
                    <label style={{ ...S.label, fontSize: 10 }}>Nome Completo</label>
                    <input 
                      style={{ ...S.input, padding: "7px 10px" }} 
                      placeholder="Nome oficial" 
                      value={playerForm.nome} 
                      onChange={e => setPlayerForm(v => ({ ...v, nome: e.target.value }))}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <label style={{ ...S.label, fontSize: 10 }}>Apelido</label>
                    <input 
                      style={{ ...S.input, padding: "7px 10px" }} 
                      placeholder="Ex: Juninho" 
                      value={playerForm.apelido} 
                      onChange={e => setPlayerForm(v => ({ ...v, apelido: e.target.value }))}
                    />
                  </div>
                  <div style={{ width: 60 }}>
                    <label style={{ ...S.label, fontSize: 10 }}>Nº Camisa</label>
                    <input 
                      type="number" 
                      style={{ ...S.input, padding: "7px 4px", textAlign: "center" }} 
                      placeholder="—" 
                      value={playerForm.numeroCamisa} 
                      onChange={e => setPlayerForm(v => ({ ...v, numeroCamisa: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={{ ...S.label, fontSize: 10 }}>Data de Nascimento</label>
                    <input 
                      type="date" 
                      style={{ ...S.input, padding: "5px 10px" }} 
                      value={playerForm.dataNascimento} 
                      onChange={e => setPlayerForm(v => ({ ...v, dataNascimento: e.target.value }))}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={{ ...S.label, fontSize: 10 }}>Documento (CPF/RG)</label>
                    <input 
                      style={{ ...S.input, padding: "7px 10px" }} 
                      placeholder="Apenas números" 
                      value={playerForm.documento} 
                      onChange={e => setPlayerForm(v => ({ ...v, documento: e.target.value }))}
                    />
                  </div>
                </div>

                {customFieldsDef.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", borderTop: `1px dashed ${t.cardBorder}`, paddingTop: 10 }}>
                    {customFieldsDef.map(field => (
                      <div key={field} style={{ flex: 1, minWidth: 120 }}>
                        <label style={{ ...S.label, fontSize: 10 }}>{field}</label>
                        <input 
                          style={{ ...S.input, padding: "7px 10px" }} 
                          placeholder={`Informe o ${field}`} 
                          value={playerForm.customFields[field] || ""} 
                          onChange={e => {
                            const val = e.target.value;
                            setPlayerForm(v => ({
                              ...v,
                              customFields: { ...v.customFields, [field]: val }
                            }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  onClick={handleAddPlayerToPublicList} 
                  style={{ ...S.btn("#1D9E7522", "#1D9E75"), justifyContent: "center", padding: "8px 12px", fontSize: 12 }}
                >
                  ➕ Adicionar Jogador à Lista
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: t.textSec, marginBottom: 8 }}>Jogadores Adicionados ({publicPlayersList.length}):</div>
              {publicPlayersList.length === 0 ? (
                <div style={{ fontSize: 11, color: t.textSec, fontStyle: "italic", textAlign: "center", padding: "10px", border: `1px dashed ${t.cardBorder}`, borderRadius: 8 }}>
                  Nenhum jogador na lista. Adicione-os no card acima.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
                  {publicPlayersList.map((p, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 8, padding: "6px 10px", fontSize: 12 }}>
                      <span style={{ color: t.text }}>
                        <strong>{p.numeroCamisa ? `#${p.numeroCamisa} ` : ""}</strong>
                        {p.nome} {p.apelido ? `(${p.apelido})` : ""}
                      </span>
                      <button 
                        onClick={() => handleRemovePlayerFromPublicList(idx)} 
                        style={{ background: "none", border: "none", color: "#E24B4A", fontWeight: 800, cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={handleSendOnlineReg} 
              disabled={submittingReg}
              style={{ ...S.btn("#378ADD"), justifyContent: "center", padding: "12px", width: "100%", fontSize: 13, marginTop: 10 }}
            >
              {submittingReg ? "Enviando Inscrição..." : "🚀 Enviar Solicitação de Inscrição"}
            </button>
          </div>
        </div>

        {publicLeaderContact && mySubmissions.length > 0 && (
          <div style={S.card}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 12 }}>📋 Minhas Solicitações</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mySubmissions.map((sub, idx) => (
                <div key={idx} style={{ border: `1px solid ${t.cardBorder}`, borderRadius: 10, padding: 10, background: t.inputBg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{sub.teamName}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: sub.status === "aceito" ? "#1D9E75" : sub.status === "devolvido" ? "#BA7517" : sub.status === "rejeitado" ? "#E24B4A" : t.textSec,
                      background: sub.status === "aceito" ? "#1D9E7518" : sub.status === "devolvido" ? "#BA751718" : sub.status === "rejeitado" ? "#E24B4A18" : `${t.cardBorder}55`,
                      padding: "2px 6px",
                      borderRadius: 6
                    }}>
                      {sub.status === "aceito" ? "Aceito" : sub.status === "devolvido" ? "Devolvido" : sub.status === "rejeitado" ? "Rejeitado" : "Pendente"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: t.textSec }}>
                    Responsável: {sub.leaderName} · {sub.players.length} jogadores
                  </div>
                  {sub.feedback && (
                    <div style={{ marginTop: 8, padding: 8, background: "#BA751712", borderLeft: "3.5px solid #BA7517", borderRadius: 4, fontSize: 11, color: t.text }}>
                      <strong>Motivo de Retorno:</strong> {sub.feedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const colorOf = useCallback((n,teams)=>COLORS[(teams||[]).indexOf(n)%COLORS.length],[]);
  const getPlayerNameById = id => {
    const a = (c.atletas || []).find(x => String(x.id) === String(id));
    if (!a) return `Atleta Desconhecido (#${id})`;
    return a.apelido || a.nome || a.name || `Atleta Sem Nome (#${id})`;
  };

  const allEvents = [];
  if(c.rounds) c.rounds.forEach(r=>r.matches.forEach(m=>m.events?.forEach(e=>allEvents.push(e))));
  if(c.groups) c.groups.forEach(g=>g.rounds.forEach(r=>r.matches.forEach(m=>m.events?.forEach(e=>allEvents.push(e)))));
  if(c.knockout) c.knockout.forEach(p=>p.matches.forEach(m=>m.events?.forEach(e=>allEvents.push(e))));

  const stats = {};
  allEvents.forEach(e => {
    const key = String(e.atletaId || e.atleta);
    if(!stats[key]) stats[key] = { atletaId:key, gols:0, am:0, vm:0, teamName:e.teamName };
    if(e.type==="gol") stats[key].gols++;
    if(e.type==="amarelo") stats[key].am++;
    if(e.type==="vermelho") stats[key].vm++;
  });

  const statsArr = Object.values(stats).map(s => ({
    ...s,
    name: getPlayerNameById(s.atletaId)
  }));

  const topGols = [...statsArr].filter(x=>x.gols>0).sort((a,b)=>b.gols-a.gols);
  const topAm = [...statsArr].filter(x=>x.am>0).sort((a,b)=>b.am-a.am);
  const topVm = [...statsArr].filter(x=>x.vm>0).sort((a,b)=>b.vm-a.vm);

  const formatarDataLocal = (dStr) => {
    if(!dStr) return "";
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'});
    } catch(e) { return dStr; }
  };

  const renderMatch = (m) => {
    const matchEvents = m.events || [];
    const leftEvents = matchEvents.filter(e=>e.teamName===m.home);
    const rightEvents = matchEvents.filter(e=>e.teamName===m.away);
    const renderSide = (events, sideName) => {
      const goalsSide = events.filter(e=>e.type==="gol");
      const yellowSide = events.filter(e=>e.type==="amarelo");
      const redSide = events.filter(e=>e.type==="vermelho");
      return (
        <div style={{display:"flex",flexDirection:"column",gap:6,padding:10,border:`1px solid ${t.cardBorder}`,borderRadius:12,background:t.inputBg}}>
          <div style={{fontSize:12,fontWeight:700,color:t.text}}>{sideName}</div>
          {goalsSide.length>0 ? goalsSide.map((e,i)=><div key={`g-${i}`} style={{fontSize:12,color:t.text}}><span style={{marginRight:6}}>⚽</span>{getPlayerNameById(e.atletaId || e.atleta)}</div>) : <div style={{fontSize:12,color:t.textSec}}>Nenhum gol</div>}
          {yellowSide.length>0 ? yellowSide.map((e,i)=><div key={`y-${i}`} style={{fontSize:12,color:t.text}}><span style={{marginRight:6}}>🟨</span>{getPlayerNameById(e.atletaId || e.atleta)}</div>) : <div style={{fontSize:12,color:t.textSec}}>Nenhum amarelo</div>}
          {redSide.length>0 ? redSide.map((e,i)=><div key={`r-${i}`} style={{fontSize:12,color:t.text}}><span style={{marginRight:6}}>🟥</span>{getPlayerNameById(e.atletaId || e.atleta)}</div>) : <div style={{fontSize:12,color:t.textSec}}>Nenhum vermelho</div>}
        </div>
      );
    };
    return (
      <div key={`${m.home}-${m.away}-${m.date||Math.random()}`} style={{padding:12,border:`1px solid ${t.cardBorder}`,borderRadius:12,background:t.card,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0,justifyContent:"flex-start"}}><Avatar name={m.home} size={36} color={colorOf(m.home,c.teams)} src={c.emblems?.[m.home]}/><span style={{fontWeight:800,fontSize:15,color:t.text}}>{m.home}</span></div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minWidth:100,flexShrink:0}}><div style={{fontSize:20,fontWeight:900,color:t.text}}>{m.played?`${m.homeScore}×${m.awayScore}`:"—×—"}</div><div style={{fontSize:11,color:t.textSec,marginTop:4}}>{m.date?m.date.split("-").reverse().join("/"):"Data não informada"}</div></div>
          <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0,justifyContent:"flex-end"}}><span style={{fontWeight:800,fontSize:15,color:t.text}}>{m.away}</span><Avatar name={m.away} size={36} color={colorOf(m.away,c.teams)} src={c.emblems?.[m.away]}/></div>
        </div>
        {matchEvents.length ? (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {renderSide(leftEvents, m.home)}
            {renderSide(rightEvents, m.away)}
          </div>
        ) : null}
      </div>
    );
  };

  const tabs = [
    ...(c.type==="pontos" ? ["tabela","jogos","artilharia"] : c.type==="mata" ? ["chave","jogos","artilharia"] : ["tabela","chave","jogos","artilharia"]),
    "mural",
    "galeria"
  ];
  if (c.allowOnlineReg) {
    tabs.push("inscrição");
  }

  return (
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{...S.btnSm(t.card,t.text),border:`1px solid ${t.cardBorder}`,padding:"8px 12px"}}>← Sair</button>
          <div>
            <h2 style={{fontSize:20,fontWeight:800,color:t.text,margin:0}}>🏆 {c.name}</h2>
            <div style={{fontSize:11,color:t.textSec,marginTop:2}}>
              Nuvem · Atualizado em: {formatarDataLocal(c.lastPublished)}
            </div>
          </div>
        </div>
      </div>

      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`1px solid ${t.tabBorder}`,overflowX:"auto"}}>
        {tabs.map(tb=><button key={tb} onClick={()=>setTab(tb)} style={S.tab(tab===tb)}>{tb.charAt(0).toUpperCase()+tb.slice(1)}</button>)}
      </div>

      {tab==="tabela"&&c.type==="pontos"&&(
         <StandingsTable standings={c.standings || []} teams={c.teams || []} colorOf={colorOf} t={t} emblems={c.emblems}/>
      )}
            {tab==="tabela"&&(c.type==="misto"||c.type==="liga")&&(
         <div>
           {(c.groups || []).map((g,gi)=><div key={gi} style={{marginBottom:20}}><h3 style={{fontSize:14,fontWeight:700,marginBottom:10,color:t.text}}>{g.name}</h3><StandingsTable standings={g.standings || []} teams={c.teams || []} colorOf={colorOf} t={t} emblems={c.emblems}/></div>)}
         </div>
      )}

      {tab==="chave"&&c.knockout&&(
        <div style={{overflowX:"auto"}}>
          <div style={{display:"flex",gap:14,minWidth:"fit-content",paddingBottom:8}}>
            {(c.knockout || []).map((phase,pi)=>(
              <div key={pi} style={{minWidth:200}}>
                <div style={{fontSize:11,fontWeight:700,color:t.textSec,textAlign:"center",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>{phase.name}</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {(phase.matches || []).map((m,mi)=>(
                    <div key={mi} style={{border:`1px solid ${t.cardBorder}`,borderRadius:12,overflow:"hidden",background:t.card}}>
                      {[{tm:m.home,s:m.homeScore,w:m.winner===m.home},{tm:m.away,s:m.awayScore,w:m.winner===m.away}].map((side,si)=>(
                        <div key={si} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderBottom:si===0?`1px solid ${t.cardBorder}`:"none",background:side.w?"#1D9E7514":"transparent"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}><Avatar name={side.tm||"?"} color={colorOf(side.tm,c.teams)} size={26} src={c.emblems?.[side.tm]}/><span style={{fontSize:13,fontWeight:700,color:t.text}}>{side.tm||"—"}</span></div>
                          <span style={{fontWeight:800,color:side.w?"#1D9E75":t.text,fontSize:14}}>{m.played?side.s:"—"}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="jogos"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {c.rounds ? (c.rounds || []).map((r,ri)=>(
            <Sec key={ri} title={r.name} t={t}>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {(r.matches || []).map(renderMatch)}
              </div>
            </Sec>
          )) : c.groups ? (c.groups || []).map((g,gi)=>(
            <Sec key={gi} title={g.name} t={t}>
              {(g.rounds || []).map((r,ri)=>(
                <div key={ri} style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:t.textSec,marginBottom:8}}>{r.name}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {(r.matches || []).map(renderMatch)}
                  </div>
                </div>
              ))}
            </Sec>
          )) : null}
        </div>
      )}

      {tab==="artilharia"&&(
        <div style={{display:"flex",flexDirection:"column",gap:18}}>
          <Sec title="⚽ Artilharia (Gols)" t={t}>
            {topGols.length===0 ? <div style={{fontSize:12,color:t.textSec}}>Nenhum gol marcado</div> : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {topGols.map((s,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",border:`1px solid ${t.cardBorder}`,borderRadius:12,background:t.card,fontSize:13}}>
                    <span style={{color:t.text}}>{i+1}. <strong>{s.name}</strong> ({s.teamName})</span>
                    <strong style={{color:"#1D9E75"}}>{s.gols} gols</strong>
                  </div>
                ))}
              </div>
            )}
          </Sec>

          <Sec title="🟨 Cartões Amarelos" t={t}>
            {topAm.length===0 ? <div style={{fontSize:12,color:t.textSec}}>Nenhum cartão amarelo</div> : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {topAm.map((s,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",border:`1px solid ${t.cardBorder}`,borderRadius:12,background:t.card,fontSize:13}}>
                    <span style={{color:t.text}}>{i+1}. <strong>{s.name}</strong> ({s.teamName})</span>
                    <strong style={{color:"#BA7517"}}>{s.am} amarelo(s)</strong>
                  </div>
                ))}
              </div>
            )}
          </Sec>

          <Sec title="🟥 Cartões Vermelhos" t={t}>
            {topVm.length===0 ? <div style={{fontSize:12,color:t.textSec}}>Nenhum cartão vermelho</div> : (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {topVm.map((s,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",border:`1px solid ${t.cardBorder}`,borderRadius:12,background:t.card,fontSize:13}}>
                    <span style={{color:t.text}}>{i+1}. <strong>{s.name}</strong> ({s.teamName})</span>
                    <strong style={{color:"#E24B4A"}}>{s.vm} vermelho(s)</strong>
                  </div>
                ))}
              </div>
            )}
          </Sec>
        </div>
      )}
      {tab==="mural"&&renderMuralPublic()}
      {tab==="galeria"&&renderGaleriaPublic()}
      {tab==="inscrição"&&c.allowOnlineReg&&renderInscricaoPublic()}

      {/* Modal de Lightbox para exibição premium */}
      {lightboxPost && (
        <MuralLightboxModal 
          post={lightboxPost} 
          onClose={() => setLightboxPost(null)} 
          t={t} 
          isAdmin={false} 
        />
      )}
    </div>
  );
}

function Avatar({name,size=28,color="#378ADD",src}){
  if (src) {
    return (
      <img 
        src={src} 
        alt={name} 
        style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}}
      />
    );
  }
  const initials = String(name||"?").split(" ").filter(Boolean).map(n=>n[0].toUpperCase()).slice(0,2).join("");
  return(
    <div style={{width:size,height:size,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:color,color:"#fff",fontSize:Math.max(12, size*0.45),fontWeight:700,flexShrink:0}}>
      {initials || "?"}
    </div>
  );
}

function Tag({label,color="#1D9E75"}){
  return (
    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"4px 10px",borderRadius:999,background:color+"22",color:color,fontSize:11,fontWeight:700,letterSpacing:0.3}}>{label}</span>
  );
}

function Sec({title,children,t}){return<div style={{marginBottom:24}}><h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:t.text}}>{title}</h3>{children}</div>;}

/* ─────────────────────────── STANDINGS ──────────────────────────── */
function StandingsTable({standings,teams,colorOf,accent,t,emblems}){
  const ac=accent||"#1D9E75";
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:340}}>
        <thead><tr style={{borderBottom:`2px solid ${t.cardBorder}`}}>
          {["#","Time","J","V","E","D","GP","GC","SG","Pts"].map(h=><th key={h} style={{padding:"8px 6px",fontWeight:600,textAlign:h==="Time"?"left":"center",color:t.textSec}}>{h}</th>)}
        </tr></thead>
        <tbody>{(standings||[]).map((s,i)=>(
          <tr key={s.name} style={{borderBottom:`1px solid ${t.cardBorder}`,background:i===0?ac+"14":"transparent"}}>
            <td style={{padding:"9px 6px",textAlign:"center",fontWeight:700,color:t.textSec}}>{i+1}</td>
            <td style={{padding:"9px 6px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><Avatar name={s.name} color={colorOf?colorOf(s.name,teams):"#1D9E75"} size={28} src={emblems?.[s.name]}/><span style={{fontWeight:700,color:t.text,fontSize:14}}>{s.name}</span></div></td>
            {[s.j,s.v,s.e,s.d,s.gp,s.gc,s.sg].map((v,vi)=><td key={vi} style={{padding:"9px 6px",textAlign:"center",color:t.text,fontSize:12}}>{v}</td>)}
            <td style={{padding:"9px 6px",textAlign:"center",fontWeight:800,color:ac,fontSize:14}}>{s.pts}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────── RELATÓRIO PELADAS ───────────────────── */
function AbaRelatorioPelada({ peladaState, datas, atletas, selDataSorteio, repSortBy, setRepSortBy, formatarData, t }) {
  const S = makeStyles(t);
  const [activeRankTab, setActiveRankTab] = useState("linha");
  
  const colorOfTeam = n => {
    const i = (peladaState?.teams || []).findIndex(x => x.name === n);
    return COLORS[i % COLORS.length] || "#888";
  };

  const getFilteredMatches = () => {
    const log = peladaState?.matchLog || [];
    if (String(selDataSorteio) === "todas") {
      return log.filter(m => m.played);
    }
    return log.filter(m => m.played && String(m.dataRealizacaoId) === String(selDataSorteio));
  };

  const getPlayersFallback = (match, teamLetter) => {
    const teamName = teamLetter === 'A' ? match.teamA : match.teamB;
    const matchPlayers = teamLetter === 'A' ? match.playersA : match.playersB;
    if (Array.isArray(matchPlayers) && matchPlayers.length > 0) {
      return matchPlayers;
    }
    const dataId = match.dataRealizacaoId;
    if (dataId) {
      const dObj = datas.find(x => String(x.id) === String(dataId));
      if (dObj) {
        const teams = dObj.peladaState?.teams || dObj.drawnTeams || dObj.formacoes || dObj.teams || [];
        if (Array.isArray(teams)) {
          const foundTeam = teams.find(t => t.name === teamName);
          if (foundTeam && Array.isArray(foundTeam.players)) {
            return foundTeam.players;
          }
        }
      }
    }
    if (peladaState && Array.isArray(peladaState.teams)) {
      const foundTeam = peladaState.teams.find(t => t.name === teamName);
      if (foundTeam && Array.isArray(foundTeam.players)) {
        return foundTeam.players;
      }
    }
    return [];
  };

  const getAtletaAtualizado = (p) => {
    const pId = p.id || p.atleta_id;
    const encontrado = atletas.find(a => String(a.id) === String(pId));
    return encontrado || p;
  };

  const buildReportData = () => {
    const filteredMatches = getFilteredMatches();
    const stats = {};
    const totalPartidas = filteredMatches.length;

    filteredMatches.forEach(m => {
      const scoreA = parseInt(m.scoreA) || 0;
      const scoreB = parseInt(m.scoreB) || 0;
      const sumula = m.sumula || {};

      // Time A
      const playersA = getPlayersFallback(m, 'A');
      playersA.forEach(p => {
        const pId = String(p.id || p.atleta_id || '');
        if (!pId) return;
        const atletaAtual = getAtletaAtualizado(p);
        
        if (!stats[pId]) {
          stats[pId] = { 
            player: atletaAtual, 
            j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0, sgTime: 0, 
            bonusFidelidade: 0, ptsFinais: 0, mpj: 0, pctPresenca: 0,
            jogosGoleiro: 0,
            ptsGoleiro: 0,
            gcGoleiro: 0,
            sgGoleiro: 0,
            vGoleiro: 0,
            eGoleiro: 0,
            dGoleiro: 0,
            bonusFidelidadeGoleiro: 0,
            ptsFinaisGoleiro: 0,
            mpjGoleiro: 0
          };
        }
        const s = stats[pId];
        s.j++;
        const golsInd = parseInt(sumula[pId]) || parseInt(sumula[Number(pId)]) || 0;
        s.gp += golsInd;
        s.gc += scoreB;
        s.sgTime += (scoreA - scoreB);

        const foiGoleiroPartidaInteira = String(pId) === String(m.goleiroA) && m.goleiroAInteiro !== false;

        // Regras de Pontuação Base:
        let pontosPartida = 5; // 5 pontos de Presença por jogar
        
        if (scoreA > scoreB) {
          s.v++;
          pontosPartida += 10; // 10 pontos por Vitória
        } else if (scoreA === scoreB) {
          s.e++;
          pontosPartida += 5; // 5 pontos por Empate
        } else {
          s.d++;
        }

        if (foiGoleiroPartidaInteira) {
          // Bônus Baliza Zero para Goleiro: se o adversário (Time B) sofreu 0 gols, ganha 5 pontos
          if (scoreB === 0) {
            pontosPartida += 5;
          }
        } else {
          // Gols do Time: 2 pontos por gol marcado pelo time A
          pontosPartida += (scoreA * 2);
        }

        s.pts += pontosPartida;

        // Estatísticas específicas de atuação como goleiro na partida inteira
        if (foiGoleiroPartidaInteira) {
          s.jogosGoleiro++;
          s.ptsGoleiro += pontosPartida;
          s.gcGoleiro += scoreB;
          s.sgGoleiro += (scoreA - scoreB);
          if (scoreA > scoreB) {
            s.vGoleiro++;
          } else if (scoreA === scoreB) {
            s.eGoleiro++;
          } else {
            s.dGoleiro++;
          }
        }
      });

      // Time B
      const playersB = getPlayersFallback(m, 'B');
      playersB.forEach(p => {
        const pId = String(p.id || p.atleta_id || '');
        if (!pId) return;
        const atletaAtual = getAtletaAtualizado(p);
        
        if (!stats[pId]) {
          stats[pId] = { 
            player: atletaAtual, 
            j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0, sgTime: 0, 
            bonusFidelidade: 0, ptsFinais: 0, mpj: 0, pctPresenca: 0,
            jogosGoleiro: 0,
            ptsGoleiro: 0,
            gcGoleiro: 0,
            sgGoleiro: 0,
            vGoleiro: 0,
            eGoleiro: 0,
            dGoleiro: 0,
            bonusFidelidadeGoleiro: 0,
            ptsFinaisGoleiro: 0,
            mpjGoleiro: 0
          };
        }
        const s = stats[pId];
        s.j++;
        const golsInd = parseInt(sumula[pId]) || parseInt(sumula[Number(pId)]) || 0;
        s.gp += golsInd;
        s.gc += scoreA;
        s.sgTime += (scoreB - scoreA);

        const foiGoleiroPartidaInteira = String(pId) === String(m.goleiroB) && m.goleiroBInteiro !== false;

        // Regras de Pontuação Base:
        let pontosPartida = 5; // 5 pontos de Presença por jogar
        
        if (scoreB > scoreA) {
          s.v++;
          pontosPartida += 10; // 10 pontos por Vitória
        } else if (scoreB === scoreA) {
          s.e++;
          pontosPartida += 5; // 5 pontos por Empate
        } else {
          s.d++;
        }

        if (foiGoleiroPartidaInteira) {
          // Bônus Baliza Zero para Goleiro: se o adversário (Time A) sofreu 0 gols, ganha 5 pontos
          if (scoreA === 0) {
            pontosPartida += 5;
          }
        } else {
          // Gols do Time: 2 pontos por gol marcado pelo time B
          pontosPartida += (scoreB * 2);
        }

        s.pts += pontosPartida;

        // Estatísticas específicas de atuação como goleiro na partida inteira
        if (foiGoleiroPartidaInteira) {
          s.jogosGoleiro++;
          s.ptsGoleiro += pontosPartida;
          s.gcGoleiro += scoreA;
          s.sgGoleiro += (scoreB - scoreA);
          if (scoreB > scoreA) {
            s.vGoleiro++;
          } else if (scoreB === scoreA) {
            s.eGoleiro++;
          } else {
            s.dGoleiro++;
          }
        }
      });
    });

    const arr = Object.values(stats);
    arr.forEach(s => {
      s.pctPresenca = totalPartidas > 0 ? parseFloat(((s.j / totalPartidas) * 100).toFixed(1)) : 0;
      s.bonusFidelidade = parseFloat((s.j * 0.1).toFixed(2));
      s.ptsFinais = parseFloat((s.pts + s.bonusFidelidade).toFixed(2));
      s.mpj = s.j > 0 ? parseFloat((s.ptsFinais / s.j).toFixed(2)) : 0;

      s.bonusFidelidadeGoleiro = parseFloat((s.jogosGoleiro * 0.1).toFixed(2));
      s.ptsFinaisGoleiro = parseFloat((s.ptsGoleiro + s.bonusFidelidadeGoleiro).toFixed(2));
      s.mpjGoleiro = s.jogosGoleiro > 0 ? parseFloat((s.ptsFinaisGoleiro / s.jogosGoleiro).toFixed(2)) : 0;
    });

    return arr;
  };

  const totalPartidas = getFilteredMatches().length;
  const allStats = buildReportData();

  const sortRanking = (a, b) => {
    // 1. Qualificado primeiro
    const aQual = a.pctPresenca >= 50 ? 1 : 0;
    const bQual = b.pctPresenca >= 50 ? 1 : 0;
    if (aQual !== bQual) return bQual - aQual;

    // 2. Pontuação Final descrescente
    if (b.ptsFinais !== a.ptsFinais) return b.ptsFinais - a.ptsFinais;

    // 3. MPJ descrescente
    if (b.mpj !== a.mpj) return b.mpj - a.mpj;

    // 4. Saldo de Gols do Time descrescente
    if (b.sgTime !== a.sgTime) return b.sgTime - a.sgTime;

    // 5. Menor número de jogos
    return a.j - b.j;
  };

  const sortRankingGoleiros = (a, b) => {
    // 1. Qualificado primeiro (50% de presença como goleiro)
    const pctA = totalPartidas > 0 ? (a.jogosGoleiro / totalPartidas) * 100 : 0;
    const pctB = totalPartidas > 0 ? (b.jogosGoleiro / totalPartidas) * 100 : 0;
    const aQual = pctA >= 50 ? 1 : 0;
    const bQual = pctB >= 50 ? 1 : 0;
    if (aQual !== bQual) return bQual - aQual;

    // 2. Pontuação Final de Goleiro descrescente
    if (b.ptsFinaisGoleiro !== a.ptsFinaisGoleiro) return b.ptsFinaisGoleiro - a.ptsFinaisGoleiro;

    // 3. MPJ de Goleiro descrescente
    if (b.mpjGoleiro !== a.mpjGoleiro) return b.mpjGoleiro - a.mpjGoleiro;

    // 4. Saldo de Gols de Goleiro descrescente
    if (b.sgGoleiro !== a.sgGoleiro) return b.sgGoleiro - a.sgGoleiro;

    // 5. Menor número de jogos como goleiro
    return a.jogosGoleiro - b.jogosGoleiro;
  };

  // 1. Artilheiros
  const rankingArtilheiros = [...allStats]
    .filter(s => s.gp > 0)
    .sort((a, b) => b.gp - a.gp || b.mpj - a.mpj || a.j - b.j);

  // 2. Goleiros
  const rankingGoleiros = [...allStats]
    .filter(s => s.player.goleiro === true)
    .sort(sortRankingGoleiros);

  // 3. Jogadores de Linha
  const rankingJogadoresLinha = [...allStats]
    .filter(s => !s.player.goleiro)
    .sort(sortRanking);

  const getSelectedDateText = () => {
    if (String(selDataSorteio) === "todas") return "Todas as Datas";
    const dataObj = datas.find(x => String(x.id) === String(selDataSorteio));
    return dataObj ? formatarData(dataObj.data) : "—";
  };

  return (
    <div>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-relatorio, #printable-relatorio * {
            visibility: visible;
          }
          #printable-relatorio {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
            background: ${t.bg} !important;
            color: ${t.text} !important;
            font-family: Arial, sans-serif;
            padding: 20px;
            box-sizing: border-box;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Visão de Tela (Escondida no PDF) */}
      <div className="no-print">
        {/* Seletor de Cores do Relatório & Sistema */}
        <div style={{ ...S.card, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, borderColor: (t.accent || "#0095F6") + "55" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: t.text }}>🎨 Tema de Cor (Ranking & Sistema):</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { name: "Azul Instagram", color: "#0095F6" },
              { name: "Verde Esmeralda", color: "#1D9E75" },
              { name: "Roxo Classic", color: "#7F77DD" },
              { name: "Laranja Sol", color: "#BA7517" },
              { name: "Vermelho Sunset", color: "#E24B4A" },
              { name: "Preto Minimal", color: "#262626" }
            ].map(c => (
              <button
                key={c.color}
                onClick={() => t.changeAccentColor(c.color)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: c.color,
                  border: `2.5px solid ${t.accent === c.color ? (t.dark ? "#ffffff" : "#000000") : "transparent"}`,
                  cursor: "pointer",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                  transition: "transform 0.1s",
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Cards de Resumo & Botões de Ação */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "stretch" }} className="no-print">
          <div style={{ ...S.card, flex: 1, minWidth: 140, padding: 12, textAlign: "center", borderColor: (t.accent || "#0095F6") + "33", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 11, color: t.textSec, fontWeight: 600 }}>PARTIDAS JOGADAS</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.accent || "#0095F6", marginTop: 4 }}>{totalPartidas}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center", minWidth: 160 }}>
            <button 
              onClick={() => window.print()} 
              style={{...S.btnSm(t.accent || "#0095F6", "#fff"), fontWeight: 700, padding: "10px 14px"}}
            >
              📄 Exportar PDF do Ranking
            </button>
          </div>
        </div>

        {/* Abas internas do Ranking */}
        <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${t.tabBorder}`, overflowX: "auto", marginBottom: 16 }} className="no-print">
          {[
            { id: "linha", label: "👟 Jogadores de Linha" },
            { id: "goleiros", label: "🧤 Goleiros" },
            { id: "artilharia", label: "⚽ Artilharia" }
          ].map(tb => (
            <button 
              key={tb.id} 
              onClick={() => setActiveRankTab(tb.id)} 
              style={{
                padding: "8px 14px",
                border: "none",
                borderBottom: activeRankTab === tb.id ? `3px solid ${t.accent || "#0095F6"}` : "3px solid transparent",
                background: "none",
                color: activeRankTab === tb.id ? t.text : t.textSec,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: activeRankTab === tb.id ? 800 : 600,
                whiteSpace: "nowrap",
                transition: "all 0.2s ease"
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Tabela do Ranking (Linha) */}
        {activeRankTab === "linha" && (
          <div style={S.card}>
            <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 12 }}>👟 Melhores Jogadores de Linha</div>
            {rankingJogadoresLinha.length === 0 ? (
              <div style={{ textAlign: "center", color: t.textSec, padding: 20, fontSize: 13 }}>Nenhum jogador de linha com partidas no filtro selecionado.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 400 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${t.cardBorder}` }}>
                      {["Rank", "Jogador", "J", "Pts Base", "Fidelidade", "Pontuação Final", "MPJ", "SG Time"].map((h, hi) => {
                        let className = "";
                        if (["Pts Base", "Fidelidade", "SG Time"].includes(h)) {
                          className = "hide-on-mobile";
                        }
                        return (
                          <th key={hi} className={className} style={{ padding: "8px 6px", fontWeight: 600, textAlign: h === "Jogador" ? "left" : "center", color: t.textSec }}>
                            {h}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rankingJogadoresLinha.map((item, idx) => {
                      let badge = idx + 1;
                      if (idx === 0) badge = "🥇";
                      else if (idx === 1) badge = "🥈";
                      else if (idx === 2) badge = "🥉";
                      
                      const isInqualificavel = item.pctPresenca < 50;
                      
                      return (
                        <tr key={item.player.id} style={{ borderBottom: `1px solid ${t.cardBorder}`, background: idx === 0 ? (t.accent ? t.accent + "11" : "#0095F611") : "transparent", opacity: isInqualificavel ? 0.75 : 1 }}>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, fontSize: 13 }}>{badge}</td>
                          <td style={{ padding: "9px 6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <PlayerAvatar atleta={item.player} size={22} />
                              <span style={{ fontWeight: 600, color: t.text }}>{getPlayerName(item.player)}</span>
                              {isInqualificavel && (
                                <span 
                                  style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#E24B4A22", color: "#E24B4A", fontWeight: 700 }}
                                  title={`Inqualificável: ${item.pctPresenca}% de presença (mínimo 50% para qualificação)`}
                                >
                                  Inqualificável
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.text }}>{item.j}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.textSec }} className="hide-on-mobile">{item.pts}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.textSec }} className="hide-on-mobile">+{item.bonusFidelidade.toFixed(1)}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 800, color: t.accent || "#0095F6", fontSize: 13 }}>{item.ptsFinais.toFixed(1)}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, color: t.accent || "#0095F6" }}>{item.mpj.toFixed(2)}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: item.sgTime > 0 ? "#1D9E75" : item.sgTime < 0 ? "#E24B4A" : t.textSec, fontWeight: 600 }} className="hide-on-mobile">
                            {item.sgTime > 0 ? `+${item.sgTime}` : item.sgTime}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tabela do Ranking (Goleiros) */}
        {activeRankTab === "goleiros" && (
          <div style={S.card}>
            <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 12 }}>🧤 Melhores Goleiros</div>
            {rankingGoleiros.length === 0 ? (
              <div style={{ textAlign: "center", color: t.textSec, padding: 20, fontSize: 13 }}>Nenhum goleiro com partidas no filtro selecionado.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 400 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${t.cardBorder}` }}>
                      {["Rank", "Goleiro", "J", "Pts Base", "Fidelidade", "Pontuação Final", "MPJ", "SG Time"].map((h, hi) => {
                        let className = "";
                        if (["Pts Base", "Fidelidade", "SG Time"].includes(h)) {
                          className = "hide-on-mobile";
                        }
                        return (
                          <th key={hi} className={className} style={{ padding: "8px 6px", fontWeight: 600, textAlign: h === "Goleiro" ? "left" : "center", color: t.textSec }}>
                            {h}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rankingGoleiros.map((item, idx) => {
                      let badge = idx + 1;
                      if (idx === 0) badge = "🥇";
                      else if (idx === 1) badge = "🥈";
                      else if (idx === 2) badge = "🥉";
                      
                      const pctGoleiro = totalPartidas > 0 ? (item.jogosGoleiro / totalPartidas) * 100 : 0;
                      const isInqualificavel = pctGoleiro < 50;
                      
                      return (
                        <tr key={item.player.id} style={{ borderBottom: `1px solid ${t.cardBorder}`, background: idx === 0 ? (t.accent ? t.accent + "11" : "#0095F611") : "transparent", opacity: isInqualificavel ? 0.75 : 1 }}>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, fontSize: 13 }}>{badge}</td>
                          <td style={{ padding: "9px 6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <PlayerAvatar atleta={item.player} size={22} />
                              <span style={{ fontWeight: 600, color: t.text }}>{getPlayerName(item.player)}</span>
                              {isInqualificavel && (
                                <span 
                                  style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#E24B4A22", color: "#E24B4A", fontWeight: 700 }}
                                  title={`Inqualificável: ${pctGoleiro.toFixed(1)}% de presença como goleiro (mínimo 50% para qualificação)`}
                                >
                                  Inqualificável
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.text }}>{item.jogosGoleiro}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.textSec }} className="hide-on-mobile">{item.ptsGoleiro}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.textSec }} className="hide-on-mobile">+{item.bonusFidelidadeGoleiro.toFixed(1)}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 800, color: t.accent || "#0095F6", fontSize: 13 }}>{item.ptsFinaisGoleiro.toFixed(1)}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, color: t.accent || "#0095F6" }}>{item.mpjGoleiro.toFixed(2)}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: item.sgGoleiro > 0 ? "#1D9E75" : item.sgGoleiro < 0 ? "#E24B4A" : t.textSec, fontWeight: 600 }} className="hide-on-mobile">
                            {item.sgGoleiro > 0 ? `+${item.sgGoleiro}` : item.sgGoleiro}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tabela do Ranking (Artilharia) */}
        {activeRankTab === "artilharia" && (
          <div style={S.card}>
            <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 12 }}>⚽ Artilheiros (Gols Individuais)</div>
            {rankingArtilheiros.length === 0 ? (
              <div style={{ textAlign: "center", color: t.textSec, padding: 20, fontSize: 13 }}>Nenhum gol marcado no filtro selecionado.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 320 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${t.cardBorder}` }}>
                      {["Rank", "Jogador", "J", "Gols", "MPJ"].map((h, hi) => (
                        <th key={hi} style={{ padding: "8px 6px", fontWeight: 600, textAlign: h === "Jogador" ? "left" : "center", color: t.textSec }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rankingArtilheiros.map((item, idx) => {
                      let badge = idx + 1;
                      if (idx === 0) badge = "🥇";
                      else if (idx === 1) badge = "🥈";
                      else if (idx === 2) badge = "🥉";
                      
                      return (
                        <tr key={item.player.id} style={{ borderBottom: `1px solid ${t.cardBorder}`, background: idx === 0 ? (t.accent ? t.accent + "11" : "#0095F611") : "transparent" }}>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, fontSize: 13 }}>{badge}</td>
                          <td style={{ padding: "9px 6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <PlayerAvatar atleta={item.player} size={22} />
                              <span style={{ fontWeight: 600, color: t.text }}>{getPlayerName(item.player)}</span>
                            </div>
                          </td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.text }}>{item.j}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 800, color: t.accent || "#0095F6", fontSize: 13 }}>{item.gp}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.textSec }}>{item.mpj.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visão de Impressão Exclusiva (PDF) */}
      <div id="printable-relatorio" style={{ display: "none" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, textAlign: "center", marginBottom: 20, color: t.text }}>
          Ranking da Pelada do dia {getSelectedDateText()}
        </h2>

        {/* Resumo em Impressão */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ border: `1px solid ${t.cardBorder}`, background: t.card, padding: 12, borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: t.textSec, fontWeight: 600 }}>PARTIDAS JOGADAS</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.accent || "#0095F6", marginTop: 4 }}>{totalPartidas}</div>
          </div>
        </div>

        {/* 1. Ranking de Jogadores de Linha - Impressão */}
        <div style={{ border: `1px solid ${t.cardBorder}`, background: t.card, padding: 14, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 12 }}>👟 Melhores Jogadores de Linha</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.cardBorder}` }}>
                {["Rank", "Jogador", "Status", "J", "Pts Base", "Fidelidade", "Pontuação Final", "MPJ", "SG Time"].map((h, hi) => (
                  <th key={hi} style={{ padding: "8px 6px", fontWeight: 600, textAlign: h === "Jogador" ? "left" : "center", color: t.textSec }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankingJogadoresLinha.map((item, idx) => (
                <tr key={item.player.id} style={{ borderBottom: `1px solid ${t.cardBorder}`, opacity: item.pctPresenca < 50 ? 0.75 : 1 }}>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                  <td style={{ padding: "9px 6px", fontWeight: 600, color: t.text }}>{getPlayerName(item.player)}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, color: item.pctPresenca < 50 ? "#E24B4A" : "#1D9E75" }}>
                    {item.pctPresenca < 50 ? "Inqualificável" : "Qualificado"}
                  </td>
                  <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.j}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.pts}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center" }}>+{item.bonusFidelidade.toFixed(1)}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.ptsFinais.toFixed(1)}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.mpj.toFixed(2)}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.sgTime > 0 ? `+${item.sgTime}` : item.sgTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2. Ranking de Goleiros - Impressão */}
        <div style={{ border: `1px solid ${t.cardBorder}`, background: t.card, padding: 14, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 12 }}>🧤 Melhores Goleiros</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.cardBorder}` }}>
                {["Rank", "Goleiro", "Status", "J", "Pts Base", "Fidelidade", "Pontuação Final", "MPJ", "SG Time"].map((h, hi) => (
                  <th key={hi} style={{ padding: "8px 6px", fontWeight: 600, textAlign: h === "Goleiro" ? "left" : "center", color: t.textSec }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankingGoleiros.map((item, idx) => {
                const pctGoleiro = totalPartidas > 0 ? (item.jogosGoleiro / totalPartidas) * 100 : 0;
                const isInqualificavel = pctGoleiro < 50;
                return (
                  <tr key={item.player.id} style={{ borderBottom: `1px solid ${t.cardBorder}`, opacity: isInqualificavel ? 0.75 : 1 }}>
                    <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: "9px 6px", fontWeight: 600, color: t.text }}>{getPlayerName(item.player)}</td>
                    <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, color: isInqualificavel ? "#E24B4A" : "#1D9E75" }}>
                      {isInqualificavel ? "Inqualificável" : "Qualificado"}
                    </td>
                    <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.jogosGoleiro}</td>
                    <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.ptsGoleiro}</td>
                    <td style={{ padding: "9px 6px", textAlign: "center" }}>+{item.bonusFidelidadeGoleiro.toFixed(1)}</td>
                    <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.ptsFinaisGoleiro.toFixed(1)}</td>
                    <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.mpjGoleiro.toFixed(2)}</td>
                    <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.sgGoleiro > 0 ? `+${item.sgGoleiro}` : item.sgGoleiro}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 3. Ranking de Artilharia - Impressão */}
        <div style={{ border: `1px solid ${t.cardBorder}`, background: t.card, padding: 14, borderRadius: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 12 }}>⚽ Artilheiros (Gols Individuais)</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.cardBorder}` }}>
                {["Rank", "Jogador", "J", "Gols", "MPJ"].map((h, hi) => (
                  <th key={hi} style={{ padding: "8px 6px", fontWeight: 600, textAlign: h === "Jogador" ? "left" : "center", color: t.textSec }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankingArtilheiros.map((item, idx) => (
                <tr key={item.player.id} style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                  <td style={{ padding: "9px 6px", fontWeight: 600, color: t.text }}>{getPlayerName(item.player)}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.j}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.gp}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.mpj.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── FINANCEIRO ─────────────────────────── */
function FinancialPanel({finance,onChange,autoIncome=0,filtro="geral",filtroData="todas",peladas=[],datasRealizacao=[],t,entries,receitas,despesas,total}){
  const S=makeStyles(t);
  const[showAdd,setShowAdd]=useState(false);
  const[entry,setEntry]=useState({desc:"",amount:"",type:"receita",date:todayStr(),category:"",pelada_id:"",data_id:"",champ_id:""});
  const[editId,setEditId]=useState(null);

  const allEntries=finance?.entries||[];
  const isChamp = String(filtro).startsWith("champ:");
  const champId = isChamp ? filtro.split(":")[1] : null;
  const CATS=["Coletes","Água","Bola","Aluguel do campo","Arbitragem","Material esportivo","Premiação","Alimentação","Transporte","Taxa de inscrição","Outros"];

  function save(){
    if(!entry.desc||!entry.amount)return;
    const localIsPelada = String(filtro).startsWith("pelada:");
    const localIsChamp = String(filtro).startsWith("champ:");
    const localFiltroId = localIsPelada || localIsChamp ? filtro.split(":")[1] : null;

    const pId = localIsPelada ? localFiltroId : (localIsChamp ? "" : entry.pelada_id);
    const dId = localIsPelada ? entry.data_id : "";
    const cId = localIsChamp ? localFiltroId : (localIsPelada ? "" : entry.champ_id);

    const finalEntry = {
      ...entry,
      pelada_id: pId || "",
      data_id: dId || "",
      champ_id: cId || ""
    };
    if(editId){onChange({entries:allEntries.map(e=>e.id===editId?{...finalEntry,id:editId}:e)});setEditId(null);}
    else{onChange({entries:[...allEntries,{...finalEntry,id:Date.now()}]});}
    setEntry({desc:"",amount:"",type:"receita",date:todayStr(),category:"",pelada_id:"",data_id:"",champ_id:""});setShowAdd(false);
  }
  function startEdit(e){setEntry({desc:e.desc,amount:e.amount,type:e.type,date:e.date,category:e.category||"",pelada_id:e.pelada_id||"",data_id:e.data_id||""});setEditId(e.id);setShowAdd(true);}
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        {[["Receitas","#1D9E75",receitas],["Despesas","#E24B4A",despesas],["Saldo",total>=0?"#1D9E75":"#E24B4A",total]].map(([l,c,v])=>(
          <div key={l} style={{...S.card,textAlign:"center",padding:12}}><div style={{fontSize:10,color:t.textSec,fontWeight:700,marginBottom:4}}>{l}</div><div style={{fontSize:15,fontWeight:800,color:c}}>{fmtCur(Math.abs(v))}</div></div>
        ))}
      </div>
      {showAdd&&(
        <div style={{...S.card,marginBottom:14,border:"1.5px solid #1D9E7555"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1D9E75",marginBottom:12}}>{editId?"Editar":"Novo"} Lançamento</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:10}}>
            <div><label style={S.label}>Descrição</label><input style={S.input} value={entry.desc} onChange={e=>setEntry(v=>({...v,desc:e.target.value}))}/></div>
            <div><label style={S.label}>Valor (R$)</label><input style={S.input} type="number" min="0" value={entry.amount} onChange={e=>setEntry(v=>({...v,amount:e.target.value}))}/></div>
            <div><label style={S.label}>Tipo</label><div style={{display:"flex",gap:8}}>{["receita","despesa"].map(tp=><button key={tp} onClick={()=>setEntry(v=>({...v,type:tp}))} style={{flex:1,padding:8,border:`1px solid ${entry.type===tp?(tp==="receita"?"#1D9E75":"#E24B4A"):t.inputBorder}`,borderRadius:8,background:entry.type===tp?(tp==="receita"?"#1D9E75":"#E24B4A"):t.inputBg,color:entry.type===tp?"#fff":t.textSec,cursor:"pointer",fontSize:13,fontWeight:600,textTransform:"capitalize"}}>{tp}</button>)}</div></div>
            <div><label style={S.label}>Categoria</label><select style={S.select} value={entry.category} onChange={e=>setEntry(v=>({...v,category:e.target.value}))}><option value="">Sem categoria</option>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
            {filtro==="geral"&&<div><label style={S.label}>Vincular a Evento</label><select style={S.select} value={entry.pelada_id} onChange={e=>setEntry(v=>({...v,pelada_id:e.target.value}))}><option value="">Nenhum (Geral)</option>{peladas.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>}
            {filtro!=="geral"&&<div><label style={S.label}>Vincular à Data</label><select style={S.select} value={entry.data_id} onChange={e=>setEntry(v=>({...v,data_id:e.target.value}))}><option value="">Nenhuma (Geral do Evento)</option>{datasRealizacao.map(d=><option key={d.id} value={d.id}>{fmtDate(d.data)}</option>)}</select></div>}
            <div><label style={S.label}>Data</label><input style={S.input} type="date" value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} style={S.btn()}>{editId?"Atualizar":"Salvar"}</button>
            <button onClick={()=>{setShowAdd(false);setEditId(null);setEntry({desc:"",amount:"",type:"receita",date:todayStr(),category:"",pelada_id:"",data_id:""});}} className="no-print" style={S.btn(t.card,t.textSec)}>Cancelar</button>
          </div>
        </div>
      )}
      {!showAdd&&<button onClick={()=>setShowAdd(true)} className="no-print" style={{...S.btn("#378ADD"),marginBottom:14}}>+ Lançamento</button>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {entries.length===0&&<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:20}}>Nenhum lançamento.</div>}
        {entries.map(e=>(
          <div key={e.id} style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"10px 14px",borderRadius:12,border:`1px solid ${t.cardBorder}`,background:t.card,gap:8,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,color:t.text}}>{e.desc}</div><div style={{fontSize:11,color:t.textSec,marginTop:2}}>{fmtDate(e.date)} · <span style={{color:e.type==="receita"?"#1D9E75":"#E24B4A",fontWeight:600}}>{e.type}</span>{e.category&&<span style={{marginLeft:6,background:"#7F77DD22",color:"#7F77DD",padding:"1px 8px",borderRadius:8,fontSize:11}}>{e.category}</span>}{filtro==="geral"&&e.pelada_id&&<span style={{marginLeft:6,background:"#378ADD22",color:"#378ADD",padding:"1px 8px",borderRadius:8,fontSize:11}}>{peladas.find(p=>String(p.id)===String(e.pelada_id))?.nome||"Evento"}</span>}{filtro!=="geral"&&e.data_id&&<span style={{marginLeft:6,background:"#378ADD22",color:"#378ADD",padding:"1px 8px",borderRadius:8,fontSize:11}}>{fmtDate(datasRealizacao.find(d=>String(d.id)===String(e.data_id))?.data)||"Data Específica"}</span>}</div></div>
            <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <span style={{fontWeight:700,color:e.type==="receita"?"#1D9E75":"#E24B4A",fontSize:13}}>{e.type==="receita"?"+":"-"}{fmtCur(e.amount)}</span>
              <div style={{display:"flex",gap:6}} className="no-print">
                <button onClick={()=>startEdit(e)} style={S.btnSm("#378ADD22","#378ADD")}>✏️</button>
                <button onClick={()=>onChange({entries:allEntries.filter(x=>x.id!==e.id)})} style={S.btnSm("#E24B4A22","#E24B4A")}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceiroScreen({financeiro,setFinanceiro,participacoes,peladas,campeonatos,datasRealizacao,setScreen,DarkBtn,FontScaleBtn,t,atletas,auth}){
  const S=makeStyles(t);
  const getFiltroInicial = () => {
    if (!auth || auth.role === "adm" || auth.scope === "geral") return "geral";
    if (auth.scope === "campeonato") {
      const primeiroChamp = campeonatos[0];
      return primeiroChamp ? `champ:${primeiroChamp.id}` : "geral";
    }
    if (auth.scope === "pelada") {
      const primeiraPelada = peladas[0];
      return primeiraPelada ? `pelada:${primeiraPelada.id}` : "geral";
    }
    return "geral";
  };
  const[filtro,setFiltroLocal]=useState(getFiltroInicial);
  const[filtroData,setFiltroData]=useState("todas");

  function setFiltro(val){ setFiltroLocal(val); setFiltroData("todas"); }

  // helper to parse filtro values: 'geral' | 'pelada:<id>' | 'champ:<id>'
  const isGeral = filtro === "geral";
  const isPelada = String(filtro).startsWith("pelada:");
  const isChamp = String(filtro).startsWith("champ:");
  const filtroId = isPelada || isChamp ? filtro.split(":")[1] : null;

  const datasPelada = isPelada ? datasRealizacao.filter(d=>String(d.pelada_id)===String(filtroId)) : [];

  // restrict participacoes to visible peladas (manager-scoped peladas passed as prop)
  const visiblePeladaIds = peladas.map(p=>String(p.id));
  const participacoesVisiveis = participacoes.filter(p=> visiblePeladaIds.includes(String(p.pelada_id)) );

  let autoIncome = 0;
  let autoIncomeDinheiro = 0;
  let autoIncomeSaldo = 0;

  if(isGeral){
    autoIncomeDinheiro = participacoesVisiveis.filter(p=>p.pagou&&!p.usou_saldo).reduce((acc,p)=>acc+Number(p.valor||0),0);
    autoIncomeSaldo = participacoesVisiveis.filter(p=>p.pagou&&p.usou_saldo).reduce((acc,p)=>acc+Number(p.valor||0),0);
    autoIncome = autoIncomeDinheiro;
  } else if(isPelada){
    autoIncomeDinheiro = participacoes.filter(p=>{
      if(!p.pagou || p.usou_saldo || String(p.pelada_id)!==String(filtroId)) return false;
      if(filtroData!=="todas" && String(p.data_realizacao_id)!==String(filtroData)) return false;
      return true;
    }).reduce((acc,p)=>acc+Number(p.valor||0),0);

    autoIncomeSaldo = participacoes.filter(p=>{
      if(!p.pagou || !p.usou_saldo || String(p.pelada_id)!==String(filtroId)) return false;
      if(filtroData!=="todas" && String(p.data_realizacao_id)!==String(filtroData)) return false;
      return true;
    }).reduce((acc,p)=>acc+Number(p.valor||0),0);

    autoIncome = autoIncomeDinheiro + autoIncomeSaldo;
  } else if(isChamp){
    // championships don't use participacoes; inscription fee handled separately below
    autoIncome = 0; autoIncomeDinheiro = 0; autoIncomeSaldo = 0;
  }

  // recargas (mensalidades) should be computed only from finance entries related to visible peladas
  const recargasIncome = (()=>{
    if(isChamp) return 0;
    const entries = (financeiro.entries||[]).filter(e=>e.category==="Mensalidade");
    if(isGeral) return entries.filter(e=> !e.pelada_id || visiblePeladaIds.includes(String(e.pelada_id)) ).reduce((acc,e)=>acc+Number(e.amount||0),0);
    if(isPelada) return entries.filter(e=>String(e.pelada_id)===String(filtroId)).reduce((acc,e)=>acc+Number(e.amount||0),0);
    return 0;
  })();

  const allEntries = financeiro?.entries || [];
  const entries = allEntries.filter(e => {
    if (isChamp) return String(e.champ_id) === String(filtroId) || String(e.champ_id) === `champ:${filtroId}`;
    if (isPelada) {
      if (String(e.pelada_id) !== String(filtroId) && String(e.pelada_id) !== `pelada:${filtroId}`) return false;
      if (filtroData !== "todas" && e.data_id && String(e.data_id) !== String(filtroData)) return false;
      return true;
    }
    return true;
  });

  const despesas = entries.filter(e => e.type === "despesa").reduce((s, e) => s + Number(e.amount), 0);
  const receitas = entries.filter(e => e.type === "receita").reduce((s, e) => s + Number(e.amount), 0) + autoIncome;
  const total = receitas - despesas;

  return(
    <div style={S.page} id="print-area">
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-title {
            display: block !important;
          }
          /* Forçar cores de fundo brancas para os cards e bordas cinzas simples */
          div {
            background-color: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
          }
          /* Forçar o texto a ficar escuro e visível */
          h1, h2, h3, span, p, label, div {
            color: #000000 !important;
          }
          /* Manter as cores de status de receitas (verde) e despesas (vermelho) para melhor leitura, forçando-as */
          .receita-text, [style*="#1D9E75"] {
            color: #1D9E75 !important;
          }
          .despesa-text, [style*="#E24B4A"] {
            color: #E24B4A !important;
          }
          .info-text, [style*="#378ADD"] {
            color: #378ADD !important;
          }
        }
      `}</style>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}} className="no-print">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setScreen("home")} style={S.btnSm()}>← Voltar</button>
          <h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>💰 Financeiro</h2>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={() => window.print()} style={S.btnSm("#1D9E7522","#1D9E75")}>🖨️ Imprimir</button>
          {FontScaleBtn && <FontScaleBtn/>}
          <DarkBtn/>
        </div>
      </div>
      <div style={{display:"flex", gap:10, flexWrap:"wrap", marginBottom:16}} className="no-print">
        <div style={{flex:1, minWidth:200}}>
          <label style={{...S.label,marginRight:10}}>Visualizando Evento:</label>
          <select style={{...S.select,display:"inline-block"}} value={filtro} onChange={e=>setFiltro(e.target.value)}>
            {(!auth || auth.role === "adm" || auth.scope === "geral") && <option value="geral">Visão Geral (Todas as Peladas e Caixa Livre)</option>}
            {(!auth || auth.role === "adm" || auth.scope === "geral" || auth.scope === "campeonato") && campeonatos.map(c=> <option key={`champ:${c.id}`} value={`champ:${c.id}`}>🏆 {c.name}</option>)}
            {(!auth || auth.role === "adm" || auth.scope === "geral" || auth.scope === "pelada") && peladas.map(p=> <option key={`pelada:${p.id}`} value={`pelada:${p.id}`}>👟 {p.nome}</option>)}
          </select>
        </div>
        {filtro!=="geral"&&(
          <div style={{flex:1, minWidth:200}}>
            <label style={{...S.label,marginRight:10}}>Filtrar Data:</label>
            <select style={{...S.select,display:"inline-block"}} value={filtroData} onChange={e=>setFiltroData(e.target.value)}>
              <option value="todas">Todas as datas (Balanço da Pelada)</option>
              {datasPelada.map(d=><option key={d.id} value={d.id}>{fmtDate(d.data)}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Cabeçalho de Impressão */}
      <div className="print-title" style={{display:"none", borderBottom:"2px solid #1D9E75", paddingBottom:12, marginBottom:20}}>
        <h1 style={{fontSize:22, fontWeight:800, margin:0, color:t.text}}>📊 Relatório Financeiro Thorneios</h1>
        <p style={{fontSize:14, margin:"6px 0 0 0", color:t.textSec}}>
          <b>Evento:</b> {isGeral ? "Visão Geral (Todas as Peladas e Caixa Geral)" : (isChamp ? (campeonatos.find(c=>String(c.id)===String(filtroId))?.name || "Campeonato") : (peladas.find(p=>String(p.id)===String(filtroId))?.nome || "Pelada"))}
          {filtroData !== "todas" && isPelada && ` | <b>Data:</b> ${fmtDate(datasPelada.find(d=>String(d.id)===String(filtroData))?.data)}`}
        </p>
      </div>

      <div style={{...S.card,marginBottom:16,borderColor:"#1D9E7555",background:"#1D9E7508"}}>
        
        {isChamp ? (
          (()=> {
            const ch = campeonatos.find(c=>String(c.id)===String(filtroId));
            const fee = Number(ch?.fee||0);
            const totalAtletas = Object.values(ch?.rosters || {}).flat().length;
            const paidRegs = (ch?.registrations || []).filter(r => r.paid).length;
            const totalPago = paidRegs * fee;
            const totalPrevisto = totalAtletas * fee;
            return (
              <>
                <div style={{fontWeight:700,color:"#BA7517",marginBottom:8}}>Inscrições (Campeonato)</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:13,color:t.textSec}}>Taxa por atleta</span>
                  <span style={{fontSize:15,fontWeight:700,color:"#BA7517"}}>{fmtCur(fee)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:13,color:t.textSec}}>Atletas nos elencos</span>
                  <span style={{fontSize:15,fontWeight:700,color:t.text}}>{totalAtletas}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:13,color:t.textSec}}>Inscrições pagas</span>
                  <span style={{fontSize:15,fontWeight:700,color:"#1D9E75"}}>{paidRegs}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:13,color:t.textSec}}>Total arrecadado</span>
                  <span style={{fontSize:15,fontWeight:700,color:"#1D9E75"}}>{fmtCur(totalPago)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px dashed #1D9E7555",paddingTop:8}}>
                  <span style={{fontSize:14,color:t.text,fontWeight:600}}>Total previsto (Elencos)</span>
                  <span style={{fontSize:18,fontWeight:800,color:"#BA7517"}}>{fmtCur(totalPrevisto)}</span>
                </div>
              </>
            );
          })()
        ) : (
        <>
        <div style={{fontWeight:700,color:"#1D9E75",marginBottom:8}}>Receitas Automáticas (Peladas)</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <span style={{fontSize:13,color:t.textSec}}>Total pago na hora (dinheiro)</span>
          <span style={{fontSize:15,fontWeight:700,color:"#1D9E75"}}>{fmtCur(autoIncomeDinheiro)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:13,color:t.textSec}}>Total descontado de saldos (mensalistas)</span>
          <span style={{fontSize:15,fontWeight:700,color:"#378ADD"}}>{fmtCur(autoIncomeSaldo)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px dashed #1D9E7555",paddingTop:8}}>
          <span style={{fontSize:14,color:t.text,fontWeight:600}}>Arrecadação Bruta da Pelada</span>
          <span style={{fontSize:18,fontWeight:800,color:"#1D9E75"}}>{fmtCur(autoIncomeDinheiro+autoIncomeSaldo)}</span>
        </div>
        {isGeral&&(
          <>
            <div style={{height:1,background:"#1D9E7522",margin:"10px 0"}}/>
            <div style={{fontWeight:700,color:"#BA7517",marginBottom:8}}>Receitas de Mensalidades (Recargas)</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:13,color:t.textSec}}>Total recarregado por mensalistas</span>
              <span style={{fontSize:18,fontWeight:800,color:"#BA7517"}}>{fmtCur(recargasIncome)}</span>
            </div>
            <div style={{fontSize:11,color:t.textSec,lineHeight:1.4}}>
              * O valor "Pago com saldo" <b>não</b> é somado ao total de Receitas do Caixa Geral para evitar contagem dupla, pois o dinheiro real já foi contabilizado na categoria Recargas.
            </div>
          </>
        )}
        </>
      )}
      </div>
      {isPelada&&(
        <div style={{...S.card,marginBottom:16,borderColor:"#BA751755"}}>
          <div style={{fontWeight:700,color:"#BA7517",marginBottom:10}}>Resumo de Presenças e Pagamentos</div>
          {(()=>{
            const partesFiltradas = participacoes.filter(p=>{
              if(String(p.pelada_id)!==String(filtroId)) return false;
              if(filtroData!=="todas" && String(p.data_realizacao_id)!==String(filtroData)) return false;
              return true;
            });
            const presentesList = partesFiltradas.filter(p=>p.compareceu);
            const pagantesList = presentesList.filter(p=>p.pagou);
            const inadimplentesList = presentesList.filter(p=>!p.pagou);
            return(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
                  <div style={{...S.card,padding:"10px",textAlign:"center",background:"#378ADD10",borderColor:"#378ADD33"}}><div style={{fontSize:11,fontWeight:700,color:"#378ADD",marginBottom:4}}>Presentes</div><div style={{fontSize:16,fontWeight:800,color:"#378ADD"}}>{presentesList.length}</div></div>
                  <div style={{...S.card,padding:"10px",textAlign:"center",background:"#1D9E7510",borderColor:"#1D9E7533"}}><div style={{fontSize:11,fontWeight:700,color:"#1D9E75",marginBottom:4}}>Pagaram</div><div style={{fontSize:16,fontWeight:800,color:"#1D9E75"}}>{pagantesList.length}</div></div>
                  <div style={{...S.card,padding:"10px",textAlign:"center",background:"#E24B4A10",borderColor:"#E24B4A33"}}><div style={{fontSize:11,fontWeight:700,color:"#E24B4A",marginBottom:4}}>Pendentes</div><div style={{fontSize:16,fontWeight:800,color:"#E24B4A"}}>{inadimplentesList.length}</div></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#1D9E75",marginBottom:6,borderBottom:"1px solid #1D9E7533",paddingBottom:4}}>✅ Pagaram</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {pagantesList.map(p=>{
                        const a = getAtletaById(atletas, p.atleta_id);
                        return <div key={p.id} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}><PlayerAvatar atleta={a} size={16}/> {getPlayerName(a)}</div>;
                      })}
                      {pagantesList.length===0&&<div style={{fontSize:11,color:t.textSec}}>Ninguém.</div>}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#E24B4A",marginBottom:6,borderBottom:"1px solid #E24B4A33",paddingBottom:4}}>❌ Pendentes</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {inadimplentesList.map(p=>{
                        const a = getAtletaById(atletas, p.atleta_id);
                        return <div key={p.id} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}><PlayerAvatar atleta={a} size={16}/> {getPlayerName(a)}</div>;
                      })}
                      {inadimplentesList.length===0&&<div style={{fontSize:11,color:t.textSec}}>Nenhuma pendência.</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
      <h3 style={{fontSize:15,fontWeight:700,margin:"24px 0 10px 0",color:t.text}}>Lançamentos Manuais</h3>
      <FinancialPanel finance={financeiro} onChange={setFinanceiro} autoIncome={autoIncome} filtro={filtro} filtroData={filtroData} peladas={peladas} datasRealizacao={datasPelada} t={t} entries={entries} receitas={receitas} despesas={despesas} total={total} />
    </div>
  );
}

/* ─────────────────────────── CRUD ATLETAS ───────────────────────── */
function CRUDAtletas({
  atletas, onAdd, onUpdate, onRemove, onExport, onImport, onDownloadTemplate,
  atletasCampeonato, onAddCamp, onUpdateCamp, onRemoveCamp, onExportCamp, onImportCamp, onDownloadTemplateCamp,
  campeonatos, peladas, t
}){
  const S=makeStyles(t);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filtroVinculo, setFiltroVinculo] = useState("todos"); // "todos", "campeonato_ID", "pelada_ID"
  
  const defaultForm = {
    nome: "",
    apelido: "",
    foto: "",
    habilidade: 3,
    goleiro: false,
    ativo: true,
    documento: "", // RG/CPF
    dataNascimento: "",
    numeroCamisa: "",
    celular1: "",
    celular2: "",
    foneResidencial: "",
    email: "",
    tipoAtleta: "Adventista",
    igrejaMembro: "",
    logradouro: "Rua",
    nomeVia: "",
    cep: "",
    complemento: "",
    bairro: "",
    nomeMae: "",
    docFoto: "",
    modalidades: [],
    vinculos: [], // Array de strings formatadas: "campeonato_${id}" ou "pelada_${id}"
    customFields: {}
  };

  const [form, setForm] = useState(defaultForm);
  const [filtro, setFiltro] = useState("");
  const [expandMenu, setExpandMenu] = useState(false);

  // No modelo unificado, usamos sempre as ações gerais de Atleta
  const handleAdd = onAdd;
  const handleUpdate = onUpdate;
  const handleRemove = onRemove;
  const handleExport = onExport;
  const handleImport = onImport;
  const handleDownloadTemplate = onDownloadTemplate;

  function abrirNovo(){
    setEditId(null);
    const vinculosIniciais = [];
    if (filtroVinculo !== "todos") {
      vinculosIniciais.push(filtroVinculo);
    }
    setForm({
      ...defaultForm,
      nome: filtro.trim(),
      vinculos: vinculosIniciais
    });
    setModal(true);
  }

  function abrirEdicao(a){
    setEditId(a.id);
    setForm({
      nome: a.nome || "",
      apelido: a.apelido || "",
      foto: a.foto || "",
      habilidade: a.habilidade || 3,
      goleiro: a.goleiro || false,
      ativo: a.ativo !== false,
      documento: a.documento || "",
      dataNascimento: a.dataNascimento || "",
      numeroCamisa: a.numeroCamisa || "",
      celular1: a.celular1 || "",
      celular2: a.celular2 || "",
      foneResidencial: a.foneResidencial || "",
      email: a.email || "",
      tipoAtleta: a.tipoAtleta || "Adventista",
      igrejaMembro: a.igrejaMembro || "",
      logradouro: a.logradouro || "Rua",
      nomeVia: a.nomeVia || "",
      cep: a.cep || "",
      complemento: a.complemento || "",
      bairro: a.bairro || "",
      nomeMae: a.nomeMae || "",
      docFoto: a.docFoto || "",
      modalidades: Array.isArray(a.modalidades) ? a.modalidades : [],
      vinculos: Array.isArray(a.vinculos) ? a.vinculos : [],
      customFields: a.customFields || {}
    });
    setModal(true);
  }

  function salvar(){
    if(!form.nome.trim())return;
    // O cadastro de atletas depende de ter ao menos um vínculo (ou de ter Ligas/Peladas criadas no sistema)
    if (form.vinculos.length === 0) {
      alert("Por favor, selecione ao menos uma Liga ou Pelada para vincular o atleta!");
      return;
    }
    if(editId) handleUpdate(editId, form);
    else handleAdd(form);
    setModal(false);
  }
  
  const lista = atletas.filter(a => {
    const matchesTexto = a.nome.toLowerCase().includes(filtro.toLowerCase()) || 
                         (a.apelido && a.apelido.toLowerCase().includes(filtro.toLowerCase()));
    let matchesVinculo = true;
    if (filtroVinculo !== "todos") {
      matchesVinculo = Array.isArray(a.vinculos) && a.vinculos.includes(filtroVinculo);
    }
    return matchesTexto && matchesVinculo;
  });
  const ativos = lista.filter(a => a.ativo).length;

  return(
    <div>
      {/* Filtro Dropdown de Vínculos (Ligas/Peladas) */}
      <div style={{display:"flex", flexDirection:"column", gap:6, marginBottom:16}}>
        <label style={{...S.label, margin:0, fontWeight:700}}>Filtrar Atletas por Liga ou Pelada:</label>
        <select 
          style={{...S.select, margin:0, width:"100%"}} 
          value={filtroVinculo} 
          onChange={e=>{ setFiltroVinculo(e.target.value); setFiltro(""); }}
        >
          <option value="todos">🌍 Todos os Atletas (Sem Filtro)</option>
          {campeonatos && campeonatos.length > 0 && (
            <optgroup label="🏆 Ligas / Campeonatos">
              {campeonatos.map(c => <option key={c.id} value={"campeonato_" + c.id}>{c.name}</option>)}
            </optgroup>
          )}
          {peladas && peladas.length > 0 && (
            <optgroup label="👟 Peladas">
              {peladas.map(p => <option key={p.id} value={"pelada_" + p.id}>{p.nome}</option>)}
            </optgroup>
          )}
        </select>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[["Total",lista.length,"#378ADD"],["Ativos",ativos,"#1D9E75"],["Inativos",lista.length-ativos,"#E24B4A"]].map(([l,v,c])=>(
          <div key={l} style={{...S.card,textAlign:"center",padding:10}}><div style={{fontSize:9,fontWeight:700,color:t.textSec,marginBottom:3}}>{l}</div><div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div></div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input style={{...S.input,flex:1,minWidth:120}} placeholder="🔍 Buscar atleta por nome/apelido..." value={filtro} onChange={e=>setFiltro(e.target.value)}/>
        <button onClick={abrirNovo} style={S.btn("#1D9E75")}>+ Novo Atleta</button>
        <button onClick={()=>setExpandMenu(!expandMenu)} style={{...S.btn("#a0a0a0"),display:"inline-flex",gap:6}}>
          <span>⚙️ Importar/Exportar</span>
          <span style={{transform:expandMenu?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.3s",display:"inline-block"}}>▼</span>
        </button>
      </div>

      {expandMenu&&(
        <div style={{...S.card,marginBottom:14,background:t.inputBg,border:`1px solid ${t.inputBorder}`}}>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            <button onClick={()=>{handleExport();setExpandMenu(false);}} style={{textAlign:"left",padding:"12px 14px",border:"none",background:"transparent",color:t.text,cursor:"pointer",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s"}} onMouseEnter={e=>e.target.style.background=t.card} onMouseLeave={e=>e.target.style.background="transparent"}>
              <span>📤</span>
              <div><div style={{fontWeight:600}}>Exportar Atletas</div><div style={{fontSize:11,color:t.textSec}}>Baixar lista em XLS</div></div>
            </button>
            <button onClick={()=>{handleDownloadTemplate();setExpandMenu(false);}} style={{textAlign:"left",padding:"12px 14px",border:"none",background:"transparent",color:t.text,cursor:"pointer",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s"}} onMouseEnter={e=>e.target.style.background=t.card} onMouseLeave={e=>e.target.style.background="transparent"}>
              <span>📄</span>
              <div><div style={{fontWeight:600}}>Baixar Modelo</div><div style={{fontSize:11,color:t.textSec}}>Planilha em branco</div></div>
            </button>
            <label style={{textAlign:"left",padding:"12px 14px",border:"none",background:"transparent",color:t.text,cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s",margin:0}} onMouseEnter={e=>e.currentTarget.style.background=t.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span>📥</span>
              <div><div style={{fontWeight:600}}>Importar Atletas</div><div style={{fontSize:11,color:t.textSec}}>Carregar arquivo XLS</div></div>
              <input type="file" accept=".csv,.xls" style={{display:"none"}} onChange={(e)=>{handleImport(e);setExpandMenu(false);}} />
            </label>
          </div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {lista.length===0&&<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:20}}>Nenhum atleta encontrado nesta categoria.</div>}
        {lista.map(a=>(
          <div key={a.id} style={{...S.card,padding:"12px 14px",border:`1px solid ${a.ativo?t.cardBorder:t.cardBorder+"88"}`,opacity:a.ativo?1:0.6}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <PlayerAvatar atleta={a} size={38} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,color:t.text}}>
                  {getPlayerName(a)}
                  {a.apelido?<span style={{fontSize:11,color:t.textSec,marginLeft:6}}>({a.apelido})</span>:null}
                  {a.numeroCamisa && <span style={{fontSize:11,fontWeight:800,color:"#378ADD",background:"#378ADD15",padding:"1px 5px",borderRadius:4,marginLeft:6}}>#{a.numeroCamisa}</span>}
                  {!a.ativo&&<span style={{marginLeft:8,fontSize:10,background:"#E24B4A22",color:"#E24B4A",padding:"1px 7px",borderRadius:8}}>Inativo</span>}
                </div>
                
                {/* Badges de Ligas / Peladas Vinculadas */}
                {Array.isArray(a.vinculos) && a.vinculos.length > 0 && (
                  <div style={{display:"flex", flexWrap:"wrap", gap:4, marginTop:4, marginBottom:6}}>
                    {a.vinculos.map(vId => {
                      if (vId.startsWith("campeonato_")) {
                        const id = Number(vId.replace("campeonato_", ""));
                        const c = campeonatos.find(x => x.id === id);
                        if (!c) return null;
                        return (
                          <span key={vId} style={{fontSize:9, fontWeight:700, color:"#06AA48", background:"#06AA4812", padding:"2px 6px", borderRadius:4, border: "1px solid #06AA4822"}}>
                            🏆 {c.name}
                          </span>
                        );
                      } else if (vId.startsWith("pelada_")) {
                        const id = Number(vId.replace("pelada_", ""));
                        const p = peladas.find(x => x.id === id);
                        if (!p) return null;
                        return (
                          <span key={vId} style={{fontSize:9, fontWeight:700, color:"#378ADD", background:"#378ADD12", padding:"2px 6px", borderRadius:4, border: "1px solid #378ADD22"}}>
                            👟 {p.nome}
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                <div style={{fontSize:11,color:t.textSec,marginTop:4,display:"flex",flexDirection:"column",gap:2}}>
                  <div style={{color:SKILL_COLORS[a.habilidade-1],fontWeight:700}}>
                    {"⭐".repeat(a.habilidade)} · {SKILL_NAMES[a.habilidade-1]}
                    {a.dataNascimento && ` · 🎂 Nasc: ${a.dataNascimento.split("-").reverse().join("/")}`}
                    {a.documento && ` · 🪪 RG/CPF: ${a.documento}`}
                  </div>
                  <div>
                    <span style={{fontWeight:700,color:a.tipoAtleta === "Adventista" ? "#1D9E75" : "#BA7517"}}>
                      ⛪ {a.tipoAtleta || "Adventista"} {a.igrejaMembro ? `(${a.igrejaMembro})` : ""}
                    </span>
                    {a.celular1 && ` · 📞 ${a.celular1}`}
                    {a.email && ` · ✉️ ${a.email}`}
                  </div>
                  {a.nomeMae && <div>👤 Mãe: {a.nomeMae}</div>}
                  {(a.nomeVia || a.bairro) && <div>📍 Endereço: {a.logradouro || ""} {a.nomeVia || ""}, {a.bairro || ""}</div>}
                  
                  {Array.isArray(a.modalidades) && a.modalidades.length > 0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:3}}>
                      {a.modalidades.map(mid => {
                        const mod = MODALIDADES_ESPORTIVAS.find(x => x.id === mid);
                        if (!mod) return null;
                        return (
                          <span key={mid} style={{fontSize:10,fontWeight:700,color:mod.color,background:mod.color+"22",padding:"1px 7px",borderRadius:10,border:`1px solid ${mod.color}44`}}>
                            {mod.icon} {mod.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,marginTop:4}}>
                    {a.foto ? <span style={{color:"#1D9E75", fontSize: 10.5}}>✓ Foto Perfil 👤</span> : <span style={{color:"#E24B4A", fontSize: 10.5}}>✕ Sem Foto 👤</span>}
                    {a.docFoto ? <span style={{color:"#1D9E75", fontSize: 10.5}}>✓ Doc. Anexado 🪪</span> : <span style={{color:"#E24B4A", fontSize: 10.5}}>✕ Sem Doc. 🪪</span>}
                  </div>
                </div>

                {a.customFields && Object.keys(a.customFields).length > 0 && (
                  <div style={{fontSize:11,color:t.textSec,marginTop:3,display:"flex",gap:6,flexWrap:"wrap"}}>
                    {Object.entries(a.customFields).map(([k,v]) => v && (
                      <span key={k}><strong>{k}:</strong> {v}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>abrirEdicao(a)} style={S.btnSm("#378ADD22","#378ADD")}>✏️</button>
                <button onClick={()=>{if(window.confirm("Excluir atleta?"))handleRemove(a.id);}} style={S.btnSm("#E24B4A22","#E24B4A")}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:16}}>{editId ? "✏️ Editar Atleta" : "🆕 Novo Atleta"}</div>
            
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {/* 1. Identificação Básica */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>1. Identificação do Atleta</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Nome Completo</label><input style={S.input} value={form.nome} onChange={e=>setForm(v=>({...v,nome:e.target.value}))} placeholder="Nome completo"/></div>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Apelido</label><input style={S.input} value={form.apelido} onChange={e=>setForm(v=>({...v,apelido:e.target.value}))} placeholder="Nome de camisa"/></div>
              </div>
              
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:100}}>
                  <label style={S.label}>Número da Camisa</label>
                  <input type="text" style={S.input} value={form.numeroCamisa || ""} onChange={e=>setForm(v=>({...v,numeroCamisa:e.target.value}))} placeholder="Ex: 10"/>
                </div>
                <div style={{flex:1,minWidth:100,display:"flex",alignItems:"center",marginTop:16}}>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text}}><input type="checkbox" checked={form.goleiro} onChange={e=>setForm(v=>({...v,goleiro:e.target.checked}))}/>🧤 Goleiro</label>
                </div>
                <div style={{flex:1,minWidth:100,display:"flex",alignItems:"center",marginTop:16}}>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text}}><input type="checkbox" checked={form.ativo} onChange={e=>setForm(v=>({...v,ativo:e.target.checked}))}/>✓ Ativo</label>
                </div>
              </div>

              <div>
                <label style={S.label}>Habilidade (Nível técnico)</label>
                <div style={{display:"flex",gap:6}}>{[1,2,3,4,5].map(s=><button key={s} onClick={()=>setForm(v=>({...v,habilidade:s}))} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`2px solid ${form.habilidade===s?SKILL_COLORS[s-1]:t.inputBorder}`,background:form.habilidade===s?SKILL_COLORS[s-1]+"22":t.inputBg,cursor:"pointer",fontSize:12,color:form.habilidade===s?SKILL_COLORS[s-1]:t.textSec,fontWeight:form.habilidade===s?700:400}}>{"⭐".repeat(s)}</button>)}</div>
              </div>

              {/* Vínculo de Ligas e Peladas */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>Vínculos de Ligas e Peladas</div>
              <div>
                <div style={{
                  maxHeight: 140,
                  overflowY: "auto",
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 8,
                  padding: 10,
                  background: t.inputBg,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}>
                  {campeonatos && campeonatos.length > 0 && (
                    <div>
                      <div style={{fontSize: 10, fontWeight: 700, color: t.accent, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}>Ligas / Campeonatos</div>
                      {campeonatos.map(c => {
                        const vinculoId = "campeonato_" + c.id;
                        const checked = (form.vinculos || []).includes(vinculoId);
                        return (
                          <label key={c.id} style={{display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: t.text, padding: "2px 0"}}>
                            <input 
                              type="checkbox" 
                              checked={checked} 
                              onChange={() => {
                                setForm(v => {
                                  const cur = Array.isArray(v.vinculos) ? v.vinculos : [];
                                  return {
                                    ...v,
                                    vinculos: checked ? cur.filter(x => x !== vinculoId) : [...cur, vinculoId]
                                  };
                                });
                              }}
                            />
                            🏆 {c.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {peladas && peladas.length > 0 && (
                    <div style={{marginTop: 6}}>
                      <div style={{fontSize: 10, fontWeight: 700, color: "#378ADD", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}>Peladas</div>
                      {peladas.map(p => {
                        const vinculoId = "pelada_" + p.id;
                        const checked = (form.vinculos || []).includes(vinculoId);
                        return (
                          <label key={p.id} style={{display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: t.text, padding: "2px 0"}}>
                            <input 
                              type="checkbox" 
                              checked={checked} 
                              onChange={() => {
                                setForm(v => {
                                  const cur = Array.isArray(v.vinculos) ? v.vinculos : [];
                                  return {
                                    ...v,
                                    vinculos: checked ? cur.filter(x => x !== vinculoId) : [...cur, vinculoId]
                                  };
                                });
                              }}
                            />
                            👟 {p.nome}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {(!campeonatos || campeonatos.length === 0) && (!peladas || peladas.length === 0) && (
                    <div style={{fontSize: 12, color: t.textSec, fontStyle: "italic"}}>
                      Nenhuma Liga ou Pelada criada no sistema. Crie ao menos uma antes de cadastrar atletas.
                    </div>
                  )}
                </div>
                {(!campeonatos || campeonatos.length === 0) && (!peladas || peladas.length === 0) && (
                  <div style={{fontSize:11, color:"#E24B4A", marginTop:4}}>
                    ⚠️ Impossível salvar: cadastre uma Liga ou Pelada primeiro.
                  </div>
                )}
              </div>

              {/* 2. Dados de Contato e Pessoais */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>2. Dados Pessoais e de Contato</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Documento (RG/CPF)</label><input style={S.input} value={form.documento || ""} onChange={e=>setForm(v=>({...v,documento:e.target.value}))} placeholder="RG ou CPF"/></div>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Data de Nascimento</label><input type="date" style={S.input} value={form.dataNascimento || ""} onChange={e=>setForm(v=>({...v,dataNascimento:e.target.value}))}/></div>
              </div>
              
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Nome da Mãe</label><input style={S.input} value={form.nomeMae || ""} onChange={e=>setForm(v=>({...v,nomeMae:e.target.value}))} placeholder="Nome completo da mãe"/></div>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>E-mail</label><input type="email" style={S.input} value={form.email || ""} onChange={e=>setForm(v=>({...v,email:e.target.value}))} placeholder="exemplo@email.com"/></div>
              </div>

              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:100}}><label style={S.label}>Celular 1 (WhatsApp)</label><input style={S.input} value={form.celular1 || ""} onChange={e=>setForm(v=>({...v,celular1:e.target.value}))} placeholder="Ex: 11999999999"/></div>
                <div style={{flex:1,minWidth:100}}><label style={S.label}>Celular 2</label><input style={S.input} value={form.celular2 || ""} onChange={e=>setForm(v=>({...v,celular2:e.target.value}))} placeholder="Ex: 11999999998"/></div>
                <div style={{flex:1,minWidth:100}}><label style={S.label}>Fone Fixo</label><input style={S.input} value={form.foneResidencial || ""} onChange={e=>setForm(v=>({...v,foneResidencial:e.target.value}))} placeholder="Ex: 1136123456"/></div>
              </div>

              {/* 3. Modalidades de Inscrição */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>3. Modalidades de Inscrição</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>
                {MODALIDADES_ESPORTIVAS.map(m => {
                  const mods = Array.isArray(form.modalidades) ? form.modalidades : [];
                  const selected = mods.includes(m.id);
                  return (
                    <label key={m.id} style={{
                      display:"flex",alignItems:"center",gap:6,cursor:"pointer",
                      padding:"6px 12px",borderRadius:20,border:`2px solid ${selected ? m.color : t.cardBorder}`,
                      background:selected ? m.color + "22" : t.inputBg,
                      color:selected ? m.color : t.textSec,fontWeight:selected ? 700 : 500,fontSize:13,
                      transition:"all 0.15s",userSelect:"none"
                    }}>
                      <input type="checkbox" style={{display:"none"}} checked={selected}
                        onChange={() => setForm(v => {
                          const cur = Array.isArray(v.modalidades) ? v.modalidades : [];
                          return {...v, modalidades: selected ? cur.filter(x => x !== m.id) : [...cur, m.id]};
                        })}
                      />
                      {m.icon} {m.label}
                    </label>
                  );
                })}
              </div>
              {Array.isArray(form.modalidades) && form.modalidades.length === 0 && (
                <div style={{fontSize:11,color:"#E24B4A",marginTop:4}}>⚠️ Selecione ao menos uma modalidade.</div>
              )}

              {/* 4. Vínculo Religioso */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>4. Vínculo Religioso</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}>
                  <label style={S.label}>Tipo de Atleta</label>
                  <select style={S.select} value={form.tipoAtleta || "Adventista"} onChange={e=>setForm(v=>({...v,tipoAtleta:e.target.value}))}>
                    <option value="Adventista">Atleta Adventista</option>
                    <option value="Não Adventista">Atleta Não Adventista</option>
                  </select>
                </div>
                {form.tipoAtleta === "Adventista" && (
                  <div style={{flex:1,minWidth:140}}>
                    <label style={S.label}>Igreja da Carta de Membro</label>
                    <input style={S.input} value={form.igrejaMembro || ""} onChange={e=>setForm(v=>({...v,igrejaMembro:e.target.value}))} placeholder="IASD a qual é membro"/>
                  </div>
                )}
              </div>

              {/* 5. Endereço Residencial */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>5. Endereço Residencial</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:100}}><label style={S.label}>CEP</label><input style={S.input} value={form.cep || ""} onChange={e=>setForm(v=>({...v,cep:e.target.value}))} placeholder="Ex: 69000-000"/></div>
                <div style={{flex:1,minWidth:100}}>
                  <label style={{...S.label}}>Logradouro</label>
                  <select style={S.select} value={form.logradouro || "Rua"} onChange={e=>setForm(v=>({...v,logradouro:e.target.value}))}>
                    <option value="Rua">Rua</option>
                    <option value="Avenida">Avenida</option>
                    <option value="Travessa">Travessa</option>
                    <option value="Beco">Beco</option>
                  </select>
                </div>
                <div style={{flex:2,minWidth:140}}><label style={S.label}>Nome da Via</label><input style={S.input} value={form.nomeVia || ""} onChange={e=>setForm(v=>({...v,nomeVia:e.target.value}))} placeholder="Nome da rua/avenida"/></div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Bairro</label><input style={S.input} value={form.bairro || ""} onChange={e=>setForm(v=>({...v,bairro:e.target.value}))} placeholder="Bairro"/></div>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Complemento</label><input style={S.input} value={form.complemento || ""} onChange={e=>setForm(v=>({...v,complemento:e.target.value}))} placeholder="Ex: Casa, Apto, Fundos"/></div>
              </div>

              {/* 6. Documentos e Fotos */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>6. Uploads de Arquivos / Fotos</div>
              <div>
                <label style={S.label}>Foto de Rosto (Perfil)</label>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  {form.foto&&<img src={form.foto} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover"}}/>}
                  <input style={{...S.input,flex:1}} value={form.foto} onChange={e=>setForm(v=>({...v,foto:e.target.value}))} placeholder="Cole URL ou selecione arquivo..."/>
                  <label style={{...S.btn("#378ADD22","#378ADD"),margin:0}}>
                    📁 Rosto
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])resizeImage(e.target.files[0],300,(b64)=>setForm(v=>({...v,foto:b64})))}}/>
                  </label>
                </div>
              </div>

              <div>
                <label style={S.label}>Documento Oficial com Foto (Frente e Verso)</label>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  {form.docFoto&&<img src={form.docFoto} style={{width:40,height:40,borderRadius:4,objectFit:"cover"}}/>}
                  <input style={{...S.input,flex:1}} value={form.docFoto} onChange={e=>setForm(v=>({...v,docFoto:e.target.value}))} placeholder="Cole URL ou selecione arquivo..."/>
                  <label style={{...S.btn("#1D9E7522","#1D9E75"),margin:0}}>
                    📁 Doc. Foto
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])resizeImage(e.target.files[0],600,(b64)=>setForm(v=>({...v,docFoto:b64})))}}/>
                  </label>
                </div>
              </div>

              {form.customFields && Object.keys(form.customFields).length > 0 && (
                <div style={{display:"flex",flexDirection:"column",gap:10,borderTop:`1px dashed ${t.cardBorder}`,paddingTop:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:t.textSec}}>Campos Customizados Existentes:</div>
                  {Object.entries(form.customFields).map(([k,v]) => (
                    <div key={k}>
                      <label style={S.label}>{k}</label>
                      <input 
                        style={S.input} 
                        value={v || ""} 
                        onChange={e => {
                          const val = e.target.value;
                          setForm(prev => ({
                            ...prev,
                            customFields: {
                              ...prev.customFields,
                              [k]: val
                            }
                          }));
                        }} 
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button 
                onClick={salvar} 
                style={S.btn("#1D9E75")}
                disabled={(!campeonatos || campeonatos.length === 0) && (!peladas || peladas.length === 0)}
              >
                Salvar
              </button>
              <button onClick={()=>setModal(false)} style={S.btn(t.card,t.textSec)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── CRUD QUADRAS ───────────────────────── */
function CRUDQuadras({
  quadras, onAdd, onUpdate, onRemove, onExport, onImport, onDownloadTemplate, t
}) {
  const S = makeStyles(t);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: "", endereco: "", ativa: true });
  const [filtro, setFiltro] = useState("");
  const [expandMenu, setExpandMenu] = useState(false);

  function abrirNovo() {
    setEditId(null);
    setForm({ nome: filtro.trim(), endereco: "", ativa: true });
    setModal(true);
  }

  function abrirEdicao(q) {
    setEditId(q.id);
    setForm({
      nome: q.nome || "",
      endereco: q.endereco || "",
      ativa: q.ativa !== false
    });
    setModal(true);
  }

  function salvar() {
    if (!form.nome.trim()) return;
    if (editId) onUpdate(editId, form);
    else onAdd(form);
    setModal(false);
  }

  const lista = quadras.filter(q => 
    q.nome.toLowerCase().includes(filtro.toLowerCase()) || 
    (q.endereco && q.endereco.toLowerCase().includes(filtro.toLowerCase()))
  );
  const ativas = quadras.filter(q => q.ativa).length;

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[["Total", quadras.length, "#378ADD"], ["Ativas", ativas, "#1D9E75"], ["Inativas", quadras.length - ativas, "#E24B4A"]].map(([l,v,c])=>(
          <div key={l} style={{...S.card,textAlign:"center",padding:10}}>
            <div style={{fontSize:9,fontWeight:700,color:t.textSec,marginBottom:3}}>{l}</div>
            <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input style={{...S.input,flex:1,minWidth:120}} placeholder="🔍 Buscar quadra por nome ou endereço..." value={filtro} onChange={e=>setFiltro(e.target.value)}/>
        <button onClick={abrirNovo} style={S.btn("#378ADD")}>+ Nova Quadra</button>
        <button onClick={()=>setExpandMenu(!expandMenu)} style={{...S.btn("#a0a0a0"),display:"inline-flex",gap:6}}>
          <span>⚙️ Importar/Exportar</span>
          <span style={{transform:expandMenu?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.3s",display:"inline-block"}}>▼</span>
        </button>
      </div>

      {expandMenu&&(
        <div style={{...S.card,marginBottom:14,background:t.inputBg,border:`1px solid ${t.cardBorder}`}}>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            <button onClick={()=>{onExport();setExpandMenu(false);}} style={{textAlign:"left",padding:"12px 14px",border:"none",background:"transparent",color:t.text,cursor:"pointer",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background=t.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span>📤</span>
              <div><div style={{fontWeight:600}}>Exportar Quadras</div><div style={{fontSize:11,color:t.textSec}}>Baixar lista em XLS</div></div>
            </button>
            <button onClick={()=>{onDownloadTemplate();setExpandMenu(false);}} style={{textAlign:"left",padding:"12px 14px",border:"none",background:"transparent",color:t.text,cursor:"pointer",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background=t.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span>📄</span>
              <div><div style={{fontWeight:600}}>Baixar Modelo</div><div style={{fontSize:11,color:t.textSec}}>Planilha em branco</div></div>
            </button>
            <label style={{textAlign:"left",padding:"12px 14px",border:"none",background:"transparent",color:t.text,cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s",margin:0}} onMouseEnter={e=>e.currentTarget.style.background=t.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span>📥</span>
              <div><div style={{fontWeight:600}}>Importar Quadras</div><div style={{fontSize:11,color:t.textSec}}>Carregar arquivo XLS</div></div>
              <input type="file" accept=".csv,.xls" style={{display:"none"}} onChange={(e)=>{onImport(e);setExpandMenu(false);}} />
            </label>
          </div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {lista.length===0&&<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:20}}>Nenhuma quadra cadastrada.</div>}
        {lista.map(q=>(
          <div key={q.id} style={{...S.card,padding:"12px 14px",border:`1px solid ${q.ativa?t.cardBorder:t.cardBorder+"88"}`,opacity:q.ativa?1:0.6}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:24}}>🏟️</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,color:t.text}}>
                  {q.nome}
                  {!q.ativa&&<span style={{marginLeft:8,fontSize:10,background:"#E24B4A22",color:"#E24B4A",padding:"1px 7px",borderRadius:8}}>Inativa</span>}
                </div>
                <div style={{fontSize:11,color:t.textSec,marginTop:2}}>
                  📍 {q.endereco || "Sem endereço cadastrado"}
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>abrirEdicao(q)} style={S.btnSm("#378ADD22","#378ADD")}>✏️</button>
                <button onClick={()=>{if(window.confirm("Excluir quadra?"))onRemove(q.id);}} style={S.btnSm("#E24B4A22","#E24B4A")}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:16}}>{editId ? "✏️ Editar Quadra" : "🆕 Nova Quadra"}</div>
            
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={S.label}>Nome da Quadra / Campo</label>
                <input style={S.input} value={form.nome} onChange={e=>setForm(v=>({...v,nome:e.target.value}))} placeholder="Ex: Quadra Society 1"/>
              </div>
              <div>
                <label style={S.label}>Endereço ou Descrição</label>
                <input style={S.input} value={form.endereco} onChange={e=>setForm(v=>({...v,endereco:e.target.value}))} placeholder="Ex: Av. das Flores, 123"/>
              </div>
              <div>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:t.text,marginTop:6}}>
                  <input type="checkbox" checked={form.ativa} onChange={e=>setForm(v=>({...v,ativa:e.target.checked}))}/>
                  Quadra Ativa (disponível para campeonatos)
                </label>
              </div>
            </div>

            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={salvar} style={S.btn("#378ADD")}>Salvar</button>
              <button onClick={()=>setModal(false)} style={S.btn(t.card,t.textSec)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── CRIAR PELADA ───────────────────────── */
function CriarPelada({onSave,initial,t}){
  const S=makeStyles(t);
  const[nome,setNome]=useState(initial?.nome||"");
  const[dataCriacao,setDataCriacao]=useState(initial?.data_criacao||"");
  const[ativo,setAtivo]=useState(initial?.ativo!==false);
  function handle(){if(!nome.trim())return;onSave({nome:nome.trim(),data_criacao:dataCriacao||todayStr(),ativo});}
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div><label style={S.label}>Nome da pelada</label><input style={S.input} value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Pelada de Quinta"/></div>
      <div><label style={S.label}>Data de criação</label><input style={S.input} type="date" value={dataCriacao} onChange={e=>setDataCriacao(e.target.value)}/></div>
      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text}}><input type="checkbox" checked={ativo} onChange={e=>setAtivo(e.target.checked)}/>Ativa</label>
      <button onClick={handle} style={S.btn("#378ADD")}>{initial?"Salvar Alterações":"Criar Pelada 👟"}</button>
    </div>
  );
}

/* ─────────────────────────── ABA DATAS ──────────────────────────── */
function AbaDatas({peladaId,datasRealizacao,onAdd,onUpdate,onRemove,t,quadras=[]}){
  const S=makeStyles(t);
  const datas=datasRealizacao.filter(d=>d.pelada_id===peladaId);
  const[novaData,setNovaData]=useState("");
  const[novoLocal,setNovoLocal]=useState("");
  const[novoValor,setNovoValor]=useState("");
  const[editId,setEditId]=useState(null);
  const[editData,setEditData]=useState("");
  const[editLocal,setEditLocal]=useState("");
  const[editValor,setEditValor]=useState("");
  function adicionar(){if(!novaData)return;onAdd({pelada_id:peladaId,data:novaData,local:novoLocal,valor:novoValor,status:"agendado"});setNovaData("");setNovoLocal("");setNovoValor("");}
  function salvarEdicao(){onUpdate(editId,{data:editData,local:editLocal,valor:editValor});setEditId(null);}
  const STATUS_COLORS={"agendado":"#378ADD","realizado":"#1D9E75","cancelado":"#E24B4A"};
  const quadrasAtivas = Array.isArray(quadras) ? quadras.filter(q => q.ativa) : [];

  return(
    <div>
      <div style={{...S.card,marginBottom:14,border:"1px solid #378ADD33",padding:"12px 14px"}}>
        <div style={{fontWeight:700,fontSize:13,color:"#378ADD",marginBottom:10}}>📅 Agendar Data</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
          <input style={{...S.input,flex:1,minWidth:120}} type="date" value={novaData} onChange={e=>setNovaData(e.target.value)}/>
          <select style={{...S.select,flex:2,minWidth:140}} value={novoLocal} onChange={e=>setNovoLocal(e.target.value)}>
            <option value="">Selecionar Quadra/Campo (opcional)</option>
            {quadrasAtivas.map(q => (
              <option key={q.id} value={q.nome}>{q.nome}</option>
            ))}
          </select>
          <input style={{...S.input,flex:1,minWidth:100}} type="number" step="0.01" min="0" placeholder="Valor (R$)" value={novoValor} onChange={e=>setNovoValor(e.target.value)}/>
        </div>
        <button onClick={adicionar} style={S.btn("#378ADD")}>+ Adicionar Data</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {datas.length===0&&<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:20}}>Nenhuma data agendada.</div>}
        {datas.map(d=>(
          <div key={d.id} style={{...S.card,padding:"10px 14px"}}>
            {editId===d.id?(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <input style={{...S.input,flex:1}} type="date" value={editData} onChange={e=>setEditData(e.target.value)}/>
                  <select style={{...S.select,flex:2}} value={editLocal} onChange={e=>setEditLocal(e.target.value)}>
                    <option value="">Sem local</option>
                    {quadrasAtivas.map(q => (
                      <option key={q.id} value={q.nome}>{q.nome}</option>
                    ))}
                  </select>
                  <input style={{...S.input,flex:1}} type="number" step="0.01" min="0" placeholder="Valor (R$)" value={editValor} onChange={e=>setEditValor(e.target.value)}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={salvarEdicao} style={S.btn()}>Salvar</button>
                  <button onClick={()=>setEditId(null)} style={S.btn(t.card,t.textSec)}>Cancelar</button>
                </div>
              </div>
            ):(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,color:t.text}}>📅 {formatarData(d.data)}</div>
                  <div style={{fontSize:12,color:t.textSec,marginTop:2}}>{d.local||"Local não definido"} {d.valor ? `· ${fmtCur(d.valor)}` : ""}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <select value={d.status} onChange={e=>onUpdate(d.id,{status:e.target.value})} style={{...S.select,width:"auto",padding:"4px 8px",fontSize:12,color:STATUS_COLORS[d.status]||t.textSec}}>
                    <option value="agendado">Agendado</option>
                    <option value="realizado">Realizado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                  <button onClick={()=>{setEditId(d.id);setEditData(d.data);setEditLocal(d.local||"");setEditValor(d.valor||"");}} style={S.btnSm("#378ADD22","#378ADD")}>✏️</button>
                  <button onClick={()=>onRemove(d.id)} style={S.btnSm("#E24B4A22","#E24B4A")}>🗑</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── ABA ATLETAS PELADA ─────────────────── */
function AbaAtletasPelada({
  pelada,
  atletas,
  participacoes,
  onSavePartsLote,
  onAddFinanceiro,
  onAddAtleta,
  t,
  isRealizada,
  selDataSorteio,
  onUnsavedChangesChange,
  triggerSaveRef,
  onAddPart
}){
  const peladaId=pelada.id;
  const S=makeStyles(t);

  // Filtra as participações originais vinculadas à pelada na data selecionada
  const partsOriginais = React.useMemo(() => {
    const targetDataId = selDataSorteio || null;
    const partsMembros = participacoes.filter(p => p.pelada_id === peladaId && String(p.data_realizacao_id) === String(targetDataId));
    return partsMembros;
  }, [participacoes, peladaId, selDataSorteio]);

  // Estado local para gerenciar os vínculos da pelada
  const [localParts, setLocalParts] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Inicializa o estado local quando os vínculos originais mudam
  useEffect(() => {
    setLocalParts(partsOriginais);
    setHasChanges(false);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(false);
    }
  }, [partsOriginais]);

  // Monitora alterações para atualizar o estado de modificações pendentes
  useEffect(() => {
    const mudou = JSON.stringify(localParts) !== JSON.stringify(partsOriginais);
    setHasChanges(mudou);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(mudou);
    }
  }, [localParts, partsOriginais, onUnsavedChangesChange]);

  const handleSalvar = React.useCallback(() => {
    onSavePartsLote(peladaId, selDataSorteio || null, localParts);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(false);
    }
  }, [onSavePartsLote, peladaId, selDataSorteio, localParts, onUnsavedChangesChange]);

  useEffect(() => {
    if (triggerSaveRef) {
      triggerSaveRef.current = handleSalvar;
    }
    return () => {
      if (triggerSaveRef) {
        triggerSaveRef.current = null;
      }
    };
  }, [triggerSaveRef, handleSalvar]);

  const idsVinculadosData = React.useMemo(() => new Set(localParts.map(p => p.atleta_id)), [localParts]);

  // Lista de atletas vinculados à data selecionada, ordenada por nome
  const vinculados = React.useMemo(() => {
    const list = atletas.filter(a => idsVinculadosData.has(a.id));
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [atletas, idsVinculadosData]);

  // Lista dos demais atletas que não estão vinculados à data da pelada selecionada, mas que estão no cadastro vinculados à pelada
  const disponiveis = React.useMemo(() => {
    const list = atletas.filter(a => 
      a.ativo && 
      Array.isArray(a.vinculos) && 
      a.vinculos.includes("pelada_" + peladaId) && 
      !idsVinculadosData.has(a.id)
    );
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [atletas, peladaId, idsVinculadosData]);

  const [filtro, setFiltro] = useState("");

  const vinculadosFiltrados = React.useMemo(() => {
    return vinculados.filter(a => 
      a.nome.toLowerCase().includes(filtro.toLowerCase()) || 
      (a.apelido && a.apelido.toLowerCase().includes(filtro.toLowerCase()))
    );
  }, [vinculados, filtro]);

  const disponiveisFiltrados = React.useMemo(() => {
    return disponiveis.filter(a => 
      a.nome.toLowerCase().includes(filtro.toLowerCase()) || 
      (a.apelido && a.apelido.toLowerCase().includes(filtro.toLowerCase()))
    );
  }, [disponiveis, filtro]);

  const [modalAjustar, setModalAjustar] = useState(null);
  const [formTipo, setFormTipo] = useState("diarista");
  const [formValor, setFormValor] = useState("");
  const [formSaldo, setFormSaldo] = useState(0);
  const [recargaVal, setRecargaVal] = useState("");
  const [saldoOp, setSaldoOp] = useState("add");
  const [modalRelatorio, setModalRelatorio] = useState(false);

  const [modalNovoAtleta, setModalNovoAtleta] = useState(false);
  const [formAtleta, setFormAtleta] = useState({nome:"", apelido:"", foto:"", habilidade:3, goleiro:false, ativo:true});

  // Estado para modal de convidado
  const [modalConvidado, setModalConvidado] = useState(false);
  const [formConvidado, setFormConvidado] = useState({ nome: "", anfitriaoId: "", valor: "" });
 
  function abrirNovoAtleta() {
    setFormAtleta({nome: filtro.trim(), apelido:"", foto:"", habilidade:3, goleiro:false, ativo:true});
    setModalNovoAtleta(true);
  }

  function abrirModalConvidado() {
    // Pré-seleciona o primeiro atleta vinculado não-convidado como anfitrião
    const anfitrioes = vinculados.filter(a => !a.isConvidado);
    setFormConvidado({
      nome: "",
      anfitriaoId: anfitrioes[0]?.id || "",
      valor: String(pelada.valor_contribuicao || 15)
    });
    setModalConvidado(true);
  }

  function salvarConvidado() {
    if (!formConvidado.nome.trim()) { alert("Informe o nome do convidado!"); return; }
    if (!formConvidado.anfitriaoId) { alert("Selecione o anfitrião!"); return; }
    const anfitriao = atletas.find(a => String(a.id) === String(formConvidado.anfitriaoId));
    const novoId = Date.now();
    const novoConvidado = {
      id: novoId,
      nome: formConvidado.nome.trim(),
      apelido: "",
      foto: "",
      habilidade: anfitriao?.habilidade || 3,
      goleiro: false,
      ativo: true,
      isConvidado: true,
      convidadoDe: Number(formConvidado.anfitriaoId),
      vinculos: ["pelada_" + peladaId]
    };
    onAddAtleta(novoConvidado);
    if (onAddPart) {
      onAddPart({
        atleta_id: novoId,
        pelada_id: peladaId,
        data_realizacao_id: null,
        pagou: false,
        compareceu: false,
        tipo_pagamento: "diarista",
        valor_padrao: Number(formConvidado.valor) || pelada.valor_contribuicao || 15,
        saldo: 0
      });
    }
    const novoVinculoData = {
      id: "temp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      atleta_id: novoId,
      pelada_id: peladaId,
      data_realizacao_id: selDataSorteio || null,
      pagou: false,
      compareceu: true,
      tipo_pagamento: "diarista",
      valor_padrao: Number(formConvidado.valor) || pelada.valor_contribuicao || 15,
      saldo: 0
    };
    setLocalParts(prev => [...prev, novoVinculoData]);
    setModalConvidado(false);
  }
 
  const atualizarVinculoLocal = (partId, novosCampos) => {
    setLocalParts(prev => prev.map(p => p.id === partId ? { ...p, ...novosCampos } : p));
  };
 
  function salvarNovoAtleta() {
    if(!formAtleta.nome.trim()) return;
    const novoId = Date.now();
    const novoAtleta = {id: novoId, ...formAtleta, vinculos: ["pelada_" + peladaId]};
    onAddAtleta(novoAtleta);

    // Cria o vínculo permanente geral (data_realizacao_id === null) no estado global
    if (onAddPart) {
      onAddPart({
        atleta_id: novoId,
        pelada_id: peladaId,
        data_realizacao_id: null,
        pagou: false,
        compareceu: false,
        tipo_pagamento: "diarista",
        valor_padrao: pelada.valor_contribuicao || 15,
        saldo: 0
      });
    }

    // Adiciona a participação local na data selecionada
    const novoVinculoData = {
      id: "temp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      atleta_id: novoId,
      pelada_id: peladaId,
      data_realizacao_id: selDataSorteio || null,
      pagou: false,
      compareceu: true,
      tipo_pagamento: "diarista",
      valor_padrao: pelada.valor_contribuicao || 15,
      saldo: 0
    };
    setLocalParts(prev => [...prev, novoVinculoData]);
    setModalNovoAtleta(false);
    setFiltro("");
  }

  function vincular(id){
    // Busca se existe um vínculo geral (data_realizacao_id === null) para este atleta nesta pelada
    const vinculoGeral = participacoes.find(p => p.atleta_id === id && p.pelada_id === peladaId && p.data_realizacao_id === null);

    const novoVinculo = {
      id: "temp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      atleta_id: id,
      pelada_id: peladaId,
      data_realizacao_id: selDataSorteio || null,
      pagou: false,
      compareceu: true,
      tipo_pagamento: vinculoGeral?.tipo_pagamento || "diarista",
      valor_padrao: vinculoGeral?.valor_padrao || pelada.valor_contribuicao || 15,
      saldo: vinculoGeral?.saldo || 0
    };
    setLocalParts(prev => [...prev, novoVinculo]);
  }

  function desvincular(atletaId){
    setLocalParts(prev => prev.filter(p => p.atleta_id !== atletaId));
  }

  // Lista de anfitriões disponíveis para seleção no modal de convidado
  const anfitrioes = React.useMemo(() => vinculados.filter(a => !a.isConvidado), [vinculados]);

  return(
    <div>
      <div style={{marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap"}}>
        <input 
          style={{...S.input, flex: 1, minWidth: 160}} 
          placeholder="🔍 Buscar atleta por nome ou apelido..." 
          value={filtro} 
          onChange={e=>setFiltro(e.target.value)}
          disabled={isRealizada}
        />
        <button onClick={abrirNovoAtleta} style={S.btnSm(t.accent, "#fff")} disabled={isRealizada}>🆕 Novo Atleta</button>
        <button onClick={abrirModalConvidado} style={S.btnSm("#7F77DD22", "#7F77DD")} disabled={isRealizada} title="Adicionar convidado vinculado a um anfitrião">👤 Convidado</button>
      </div>

      <div style={{marginBottom: 14}}>
        <div style={{...S.card,textAlign:"center",padding:10}}><div style={{fontSize:9,fontWeight:700,color:t.textSec,marginBottom:3}}>Atletas Vinculados à Data</div><div style={{fontSize:20,fontWeight:800,color:"#1D9E75"}}>{vinculados.length}</div></div>
      </div>

      <div style={{marginBottom: 16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontWeight:700,fontSize:13,color:"#1D9E75"}}>✅ Atletas Vinculados à Data ({vinculadosFiltrados.length})</div>
          <button onClick={()=>setModalRelatorio(true)} style={S.btnSm(t.cardBorder,t.text)}>📋 Mensalistas</button>
        </div>
        
        {vinculadosFiltrados.length===0 ? (
          <div style={{...S.card,color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>
            {filtro ? "Nenhum atleta correspondente vinculado à data." : "Nenhum atleta vinculado a esta data da pelada."}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {vinculadosFiltrados.map(a=>{
              const vinculo = localParts.find(p=>p.atleta_id===a.id);
              const infoPag = vinculo?.tipo_pagamento === "mensalista" 
                ? `Mensalista (Saldo: ${fmtCur(vinculo.saldo||0)})`
                : `Diarista (Diária: ${fmtCur(vinculo?.valor_padrao||0)})`;
              const anfitriao = a.isConvidado && a.convidadoDe ? atletas.find(x => x.id === a.convidadoDe) : null;
              return(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:12,background: a.isConvidado ? "#7F77DD10" : "#1D9E7510",border: a.isConvidado ? "1px solid #7F77DD33" : "1px solid #1D9E7533",flexWrap:"wrap"}}>
                  <span style={{fontSize:16}}>{a.goleiro?"🧤":"⚽"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,color:t.text,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      {a.nome}{a.apelido ? ` (${a.apelido})` : ""}
                      {a.isConvidado && (
                        <span style={{fontSize:10,fontWeight:700,background:"#7F77DD22",color:"#7F77DD",padding:"1px 7px",borderRadius:20,whiteSpace:"nowrap"}}>
                          👤 Convidado de {anfitriao ? (anfitriao.apelido || anfitriao.nome) : "?"}
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:t.textSec}}>{infoPag}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>{
                      setModalAjustar(vinculo);
                      setFormTipo(vinculo?.tipo_pagamento || "diarista");
                      setFormValor(vinculo?.valor_padrao || 0);
                      setFormSaldo(vinculo?.saldo || 0);
                      setRecargaVal("");
                      setSaldoOp("add");
                    }} style={S.btnSm("#BA751722","#BA7517")} disabled={isRealizada}>⚙️ Ajustar</button>
                    <button onClick={()=>desvincular(a.id)} style={S.btnSm("#E24B4A22","#E24B4A")} disabled={isRealizada}>Remover</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{marginBottom: 16}}>
        <div style={{fontWeight:700,fontSize:13,color:t.textSec,marginBottom:8}}>➕ Disponíveis no Cadastro ({disponiveisFiltrados.length})</div>
        {disponiveisFiltrados.length===0 ? (
          <div style={{...S.card,color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>
            {filtro ? "Nenhum atleta correspondente disponível." : "Todos os atletas do cadastro já estão vinculados a esta data."}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {disponiveisFiltrados.map(a=>{
              const vinculoGeral = participacoes.find(p=>p.atleta_id===a.id && p.pelada_id===peladaId && p.data_realizacao_id === null);
              const infoPag = vinculoGeral?.tipo_pagamento === "mensalista" 
                ? `Mensalista (Saldo: ${fmtCur(vinculoGeral.saldo||0)})`
                : `Diarista (Diária: ${fmtCur(vinculoGeral?.valor_padrao||0)})`;
              return(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:12,background:t.card,border:`1px solid ${t.cardBorder}`,flexWrap:"wrap"}}>
                  <span style={{fontSize:16}}>{a.goleiro?"🧤":"⚽"}</span>
                  <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13,color:t.text}}>{a.nome}{a.apelido ? ` (${a.apelido})` : ""}</div><div style={{fontSize:11,color:t.textSec}}>{infoPag}</div></div>
                  <div>
                    <button onClick={()=>vincular(a.id)} style={S.btnSm("#1D9E7522","#1D9E75")} disabled={isRealizada}>➕ Vincular à Data</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalAjustar && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:360,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:16}}>⚙️ Configurar Atleta na Pelada</div>
            <div style={{fontSize:13,color:t.textSec,marginBottom:12}}>Atleta: <b>{getPlayerName(atletas.find(x=>x.id===modalAjustar.atleta_id))}</b></div>
            
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
              <div>
                <label style={S.label}>Tipo de Pagamento</label>
                <select style={S.select} value={formTipo} onChange={e=>setFormTipo(e.target.value)}>
                  <option value="diarista">Diarista</option>
                  <option value="mensalista">Mensalista</option>
                </select>
              </div>
              
              <div>
                <label style={S.label}>{formTipo === "mensalista" ? "Valor da Mensalidade (R$)" : "Valor da Diária (R$)"}</label>
                <input style={S.input} type="number" min="0" step="0.01" value={formValor} onChange={e=>setFormValor(e.target.value)}/>
              </div>

              {formTipo === "mensalista" && (
                <div style={{borderTop:`1px solid ${t.cardBorder}`,paddingTop:12,marginTop:4}}>
                  <div style={{fontWeight:600,fontSize:13,color:t.text,marginBottom:8}}>💰 Gerenciar Saldo do Mensalista</div>
                  <div style={{fontSize:12,color:t.textSec,marginBottom:8}}>Saldo Atual: <b style={{color:t.text}}>{fmtCur(formSaldo)}</b></div>
                  
                  <div style={{display:"flex",gap:6,marginBottom:8}}>
                    <button onClick={()=>setSaldoOp("add")} style={{flex:1,padding:"5px",fontSize:11,fontWeight:600,borderRadius:8,border:`1px solid ${saldoOp==="add"?"#1D9E75":t.cardBorder}`,background:saldoOp==="add"?"#1D9E75":"transparent",color:saldoOp==="add"?"#fff":t.textSec,cursor:"pointer"}}>➕ Recarregar</button>
                    <button onClick={()=>setSaldoOp("set")} style={{flex:1,padding:"5px",fontSize:11,fontWeight:600,borderRadius:8,border:`1px solid ${saldoOp==="set"?"#378ADD":t.cardBorder}`,background:saldoOp==="set"?"#378ADD":"transparent",color:saldoOp==="set"?"#fff":t.textSec,cursor:"pointer"}}>✏️ Corrigir Exato</button>
                  </div>

                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input style={{...S.input,flex:1}} type="number" step="0.01" value={recargaVal} onChange={e=>setRecargaVal(e.target.value)} placeholder="0.00"/>
                    <button onClick={()=>{
                      const val = Number(recargaVal);
                      if(isNaN(val) || val <= 0) return;
                      const a = atletas.find(x=>x.id===modalAjustar.atleta_id);
                      if(saldoOp === "add") {
                        const novo = (modalAjustar.saldo||0) + val;
                        atualizarVinculoLocal(modalAjustar.id, {saldo: novo});
                        setFormSaldo(novo);
                        setModalAjustar(prev => ({ ...prev, saldo: novo }));
                        if(onAddFinanceiro) onAddFinanceiro(`Recarga Saldo Pelada - ${getPlayerName(a)}`, val);
                        alert("Recarga realizada com sucesso!");
                      } else {
                        atualizarVinculoLocal(modalAjustar.id, {saldo: val});
                        setFormSaldo(val);
                        setModalAjustar(prev => ({ ...prev, saldo: val }));
                        alert("Saldo atualizado com sucesso!");
                      }
                      setRecargaVal("");
                    }} style={S.btn(saldoOp==="add"?"#1D9E75":"#378ADD")}>Aplicar</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{
                atualizarVinculoLocal(modalAjustar.id, {
                  tipo_pagamento: formTipo,
                  valor_padrao: Number(formValor),
                  saldo: Number(formSaldo)
                });
                setModalAjustar(null);
              }} style={S.btn("#378ADD")}>Confirmar</button>
              <button onClick={()=>setModalAjustar(null)} style={S.btn(t.card,t.textSec)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalRelatorio && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:360,maxHeight:"90vh",overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:16,color:t.text}}>📋 Mensalistas - {pelada.nome}</div>
              <button onClick={()=>setModalRelatorio(false)} style={{background:"none",border:"none",color:t.textSec,fontSize:20,cursor:"pointer"}}>×</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,overflowY:"auto"}}>
              {vinculados.map(a => {
                const vinc = localParts.find(p => p.atleta_id === a.id);
                if (vinc?.tipo_pagamento !== "mensalista") return null;
                const s = vinc.saldo || 0;
                return (
                  <div key={a.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",border:`1px solid ${t.cardBorder}`,borderRadius:8,background:t.inputBg}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <PlayerAvatar atleta={a} size={24}/>
                      <span style={{fontSize:13,fontWeight:600,color:t.text}}>{getPlayerName(a)}</span>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:s<0?"#E24B4A":s>0?"#1D9E75":t.textSec}}>
                      {fmtCur(s)}
                    </div>
                  </div>
                );
              }).filter(Boolean)}
              {vinculados.filter(a => {
                const vinc = localParts.find(p => p.atleta_id === a.id);
                return vinc?.tipo_pagamento === "mensalista";
              }).length === 0 && <div style={{fontSize:12,color:t.textSec,textAlign:"center",padding:20}}>Nenhum mensalista vinculado.</div>}
            </div>
          </div>
        </div>
      )}
      {modalNovoAtleta && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1001,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:16}}>🆕 Cadastrar e Vincular Atleta</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Nome</label><input style={S.input} value={formAtleta.nome} onChange={e=>setFormAtleta(v=>({...v,nome:e.target.value}))} placeholder="Nome completo"/></div>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Apelido</label><input style={S.input} value={formAtleta.apelido} onChange={e=>setFormAtleta(v=>({...v,apelido:e.target.value}))} placeholder="Como é chamado"/></div>
              </div>
              <div>
                <label style={S.label}>Foto</label>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  {formAtleta.foto&&<img src={formAtleta.foto} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover"}}/>}
                  <input style={{...S.input,flex:1}} value={formAtleta.foto} onChange={e=>setFormAtleta(v=>({...v,foto:e.target.value}))} placeholder="Cole URL da foto..."/>
                  <label style={{...S.btn("#378ADD22","#378ADD"),margin:0}}>
                    📁 Arquivo
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])resizeImage(e.target.files[0],300,(b64)=>setFormAtleta(v=>({...v,foto:b64})))}}/>
                  </label>
                </div>
              </div>
              <div>
                <label style={S.label}>Habilidade</label>
                <div style={{display:"flex",gap:6}}>{[1,2,3,4,5].map(s=><button key={s} onClick={()=>setFormAtleta(v=>({...v,habilidade:s}))} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`2px solid ${formAtleta.habilidade===s?SKILL_COLORS[s-1]:t.inputBorder}`,background:formAtleta.habilidade===s?SKILL_COLORS[s-1]+"22":t.inputBg,cursor:"pointer",fontSize:12,color:formAtleta.habilidade===s?SKILL_COLORS[s-1]:t.textSec,fontWeight:formAtleta.habilidade===s?700:400}}>{"⭐".repeat(s)}</button>)}</div>
              </div>
              <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text}}><input type="checkbox" checked={formAtleta.goleiro} onChange={e=>setFormAtleta(v=>({...v,goleiro:e.target.checked}))}/>🧤 Goleiro</label>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text}}><input type="checkbox" checked={formAtleta.ativo} onChange={e=>setFormAtleta(v=>({...v,ativo:e.target.checked}))}/>✓ Ativo</label>
              </div>

            </div>
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={salvarNovoAtleta} style={S.btn("#378ADD")}>Salvar e Vincular</button>
              <button onClick={()=>setModalNovoAtleta(false)} style={S.btn(t.card,t.textSec)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Convidado */}
      {modalConvidado && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1002,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:400,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:16,color:"#7F77DD"}}>👤 Adicionar Convidado</div>
              <button onClick={()=>setModalConvidado(false)} style={{background:"none",border:"none",color:t.textSec,cursor:"pointer",fontSize:20,padding:0}}>×</button>
            </div>
            <div style={{fontSize:12,color:t.textSec,marginBottom:16,background:"#7F77DD10",border:"1px solid #7F77DD30",borderRadius:8,padding:"8px 12px"}}>
              🔄 Convidados de revezamento entram no mesmo time do anfitrião e se revezam com ele durante a pelada.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={S.label}>Nome do Convidado</label>
                <input
                  style={S.input}
                  value={formConvidado.nome}
                  onChange={e=>setFormConvidado(v=>({...v,nome:e.target.value}))}
                  placeholder="Nome completo do convidado"
                  autoFocus
                />
              </div>
              <div>
                <label style={S.label}>Anfitrião (quem trouxe)</label>
                <select
                  style={S.select}
                  value={formConvidado.anfitriaoId}
                  onChange={e=>setFormConvidado(v=>({...v,anfitriaoId:e.target.value}))}
                >
                  <option value="">Selecione o anfitrião...</option>
                  {anfitrioes.map(a=>(
                    <option key={a.id} value={a.id}>{a.apelido || a.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Valor da Diária (R$)</label>
                <input
                  style={S.input}
                  type="number"
                  min={0}
                  step={0.5}
                  value={formConvidado.valor}
                  onChange={e=>setFormConvidado(v=>({...v,valor:e.target.value}))}
                  placeholder={String(pelada.valor_contribuicao || 15)}
                />
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:20}}>
              <button onClick={salvarConvidado} style={{...S.btn("#7F77DD"),flex:1,justifyContent:"center"}}>✓ Adicionar Convidado</button>
              <button onClick={()=>setModalConvidado(false)} style={{...S.btn(t.card,t.textSec),border:`1px solid ${t.cardBorder}`,justifyContent:"center"}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {hasChanges && (
        <div style={{
          position: "sticky",
          bottom: 10,
          background: t.card,
          border: `1px solid ${t.cardBorder}`,
          padding: "10px 14px",
          borderRadius: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 10,
          marginTop: 16
        }}>
          <span style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>⚠️ Alterações não salvas!</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={() => {
                setLocalParts(partsOriginais);
              }} 
              style={S.btnSm(t.card, t.textSec)}
            >
              Descartar
            </button>
            <button 
              onClick={handleSalvar} 
              style={S.btnSm("#1D9E75", "#fff")}
            >
              💾 Salvar Vínculos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── ABA PARTICIPAÇÕES ──────────────────── */
function AbaParticipacoes({
  pelada,
  atletas,
  participacoes,
  datasRealizacao,
  onAdd,
  onUpdate,
  onRemove,
  onUpdateAtleta,
  onAddFinanceiro,
  t,
  selDataSorteio,
  onUnsavedChangesChange,
  triggerSaveRef,
  onSavePartsLote
}){
  const peladaId=pelada.id;
  const S=makeStyles(t);
  const datas=datasRealizacao.filter(d=>d.pelada_id===peladaId&&d.status!=="cancelado");

  const partsOriginais = React.useMemo(() => {
    const targetDataId = selDataSorteio || null;
    return participacoes.filter(p => p.pelada_id === peladaId && String(p.data_realizacao_id) === String(targetDataId));
  }, [participacoes, peladaId, selDataSorteio]);

  const [localParts, setLocalParts] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalParts(partsOriginais);
    setHasChanges(false);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(false);
    }
  }, [partsOriginais]);

  useEffect(() => {
    const mudou = JSON.stringify(localParts) !== JSON.stringify(partsOriginais);
    setHasChanges(mudou);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(mudou);
    }
  }, [localParts, partsOriginais, onUnsavedChangesChange]);

  const handleSalvar = React.useCallback(() => {
    localParts.forEach(pLocal => {
      const pOrig = partsOriginais.find(o => o.atleta_id === pLocal.atleta_id);
      const vinculoGeral = participacoes.find(x => x.atleta_id === pLocal.atleta_id && x.pelada_id === peladaId && x.data_realizacao_id === null);
      
      if (vinculoGeral) {
        let saldoAtual = Number(vinculoGeral.saldo || 0);
        let mudou = false;

        const origUsouSaldo = pOrig?.pagou && pOrig?.usou_saldo;
        const localUsouSaldo = pLocal.pagou && pLocal.usou_saldo;

        if (localUsouSaldo && !origUsouSaldo) {
          saldoAtual -= Number(pLocal.valor || 0);
          mudou = true;
        } else if (!localUsouSaldo && origUsouSaldo) {
          saldoAtual += Number(pOrig.valor || pLocal.valor || 0);
          mudou = true;
        }

        if (mudou) {
          onUpdate(vinculoGeral.id, { saldo: saldoAtual });
        }
      }
    });

    onSavePartsLote(peladaId, selDataSorteio || null, localParts);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(false);
    }
  }, [onSavePartsLote, peladaId, selDataSorteio, localParts, partsOriginais, participacoes, onUpdate, onUnsavedChangesChange]);

  useEffect(() => {
    if (triggerSaveRef) {
      triggerSaveRef.current = handleSalvar;
    }
    return () => {
      if (triggerSaveRef) {
        triggerSaveRef.current = null;
      }
    };
  }, [triggerSaveRef, handleSalvar]);

  const vinculadosIds = React.useMemo(() => {
    return localParts.map(p => p.atleta_id);
  }, [localParts]);

  const vinculadosAtletas = React.useMemo(() => {
    const list = atletas.filter(a => vinculadosIds.includes(a.id));
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [atletas, vinculadosIds]);

  function registrarPresenca(atletaId){
    setLocalParts(prev => prev.map(p => {
      if (p.atleta_id === atletaId) {
        return { ...p, compareceu: !p.compareceu };
      }
      return p;
    }));
  }

  const [absentModal, setAbsentModal] = useState(null);

  function togglePagou(atletaId){
    const p = localParts.find(x => x.atleta_id === atletaId);
    if (!p) return;
    const dataObj = datasRealizacao.find(d => String(d.id) === String(selDataSorteio));
    const vinculo = participacoes.find(x => x.atleta_id === atletaId && x.pelada_id === peladaId && x.data_realizacao_id === null);
    const valorCobrado = dataObj?.valor || pelada.valor_contribuicao || vinculo?.valor_padrao || 0;

    const vaiPagar = !p.pagou;
    const isAusente = !p.compareceu;

    if(vaiPagar && isAusente){
      setAbsentModal({aid: atletaId, dataId: selDataSorteio, pId: p.id, valor: valorCobrado});
      return;
    }

    if(vaiPagar){
      if(vinculo && vinculo.tipo_pagamento === "mensalista" && (vinculo.saldo||0) >= Number(valorCobrado)){
        setLocalParts(prev => prev.map(x => {
          if (x.atleta_id === atletaId) {
            return { ...x, pagou: true, usou_saldo: true, valor: valorCobrado };
          }
          return x;
        }));
      } else {
        setLocalParts(prev => prev.map(x => {
          if (x.atleta_id === atletaId) {
            return { ...x, pagou: true, usou_saldo: false, valor: valorCobrado };
          }
          return x;
        }));
      }
    } else {
      setLocalParts(prev => prev.map(x => {
        if (x.atleta_id === atletaId) {
          return { ...x, pagou: false, usou_saldo: false };
        }
        return x;
      }));
    }
  }

  if(datas.length===0)return<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>Nenhuma data agendada ou realizada. Crie datas na aba Datas.</div>;
  if(vinculadosAtletas.length===0)return<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>Nenhum atleta vinculado. Vincule atletas na aba Atletas.</div>;

  const dataAtual=datas.find(d=>String(d.id)===String(selDataSorteio))||datas[0];
  const presentes=vinculadosAtletas.filter(a=>{const p=localParts.find(x=>x.atleta_id===a.id);return p?.compareceu;});
  const pagaram=vinculadosAtletas.filter(a=>{const p=localParts.find(x=>x.atleta_id===a.id);return p?.pagou;});
  const totalArrecadado=pagaram.reduce((s,a)=>{const p=localParts.find(x=>x.atleta_id===a.id);return s+((p?.usou_saldo)?0:Number(p?.valor||0));},0);

  return(
    <div>
      {dataAtual&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            {[["Presentes",presentes.length+"/"+ vinculadosAtletas.length,"#1D9E75"],["Pagaram",pagaram.length+"/"+presentes.length,"#378ADD"],["Arrecadado",fmtCur(totalArrecadado),"#BA7517"]].map(([l,v,c])=>(
              <div key={l} style={{...S.card,textAlign:"center",padding:10}}><div style={{fontSize:9,fontWeight:700,color:t.textSec,marginBottom:3}}>{l}</div><div style={{fontSize:13,fontWeight:800,color:c}}>{v}</div></div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {vinculadosAtletas.map(atleta=>{
              const aid=atleta.id;
              const part=localParts.find(p=>p.atleta_id===aid);
              const compareceu=part?.compareceu||false;
              const pagou=part?.pagou||false;
              const vinculo = participacoes.find(x=>x.atleta_id===aid && x.pelada_id===peladaId && x.data_realizacao_id===null);
              const anfitriao = atleta.isConvidado && atleta.convidadoDe ? atletas.find(x => x.id === atleta.convidadoDe) : null;
              return(
                <div key={aid} style={{...S.card,padding:"10px 14px",border:`1px solid ${compareceu?(atleta.isConvidado?"#7F77DD44":"#1D9E7533"):t.cardBorder}`,background:compareceu?(atleta.isConvidado?"#7F77DD08":"#1D9E7508"):t.card}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <PlayerAvatar atleta={atleta} size={30}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,color:t.text,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        {getPlayerName(atleta)}
                        {atleta.isConvidado && (
                          <span style={{fontSize:10,fontWeight:700,background:"#7F77DD22",color:"#7F77DD",padding:"1px 7px",borderRadius:20,whiteSpace:"nowrap"}}>
                            👤 Convidado de {anfitriao ? (anfitriao.apelido || anfitriao.nome) : "?"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <button onClick={()=>registrarPresenca(aid)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:`1px solid ${compareceu?"#1D9E75":"#ccc"}`,background:compareceu?"#1D9E75":"transparent",color:compareceu?"#fff":t.textSec,cursor:"pointer",fontWeight:600}}>{compareceu?"✓ Presente":"Ausente"}</button>
                      <button onClick={()=>togglePagou(aid)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:`1px solid ${pagou?(part?.usou_saldo?"#BA7517":"#378ADD"):"#ccc"}`,background:pagou?(part?.usou_saldo?"#BA7517":"#378ADD"):"transparent",color:pagou?"#fff":t.textSec,cursor:"pointer",fontWeight:600}}>{pagou?(part?.usou_saldo?"💳 Pago (Saldo)":"💰 Pago"):(vinculo?.tipo_pagamento==="mensalista" ? ((vinculo?.saldo||0)>=Number(dataAtual?.valor||pelada.valor_contribuicao||vinculo?.valor_padrao||0)?"💳 Debitar Saldo":"Pendente") : "Pendente")}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {absentModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:340}}>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:12}}>⚠️ Pagamento de Ausente</div>
            <div style={{fontSize:13,color:t.textSec,marginBottom:16}}>O atleta não compareceu, mas está pagando {fmtCur(absentModal.valor)}. Onde deseja registrar esse valor?</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>{
                setLocalParts(prev => prev.map(p => {
                  if (p.atleta_id === absentModal.aid) {
                    return { ...p, pagou: true, usou_saldo: false, valor: absentModal.valor };
                  }
                  return p;
                }));
                setAbsentModal(null);
              }} style={{...S.btn("#1D9E75"),justifyContent:"center"}}>💰 Ir para Caixa da Pelada</button>
              <button onClick={()=>{
                const atleta=atletas.find(a=>a.id===absentModal.aid);
                const vinculo = participacoes.find(x=>x.atleta_id===absentModal.aid && x.pelada_id===peladaId && x.data_realizacao_id===null);
                if(vinculo){
                  onUpdate(vinculo.id, {saldo: (vinculo.saldo||0) + Number(absentModal.valor)});
                }
                if(onAddFinanceiro) onAddFinanceiro(`Recarga de Saldo (Ausente) - ${getPlayerName(atleta)}`, absentModal.valor);
                setLocalParts(prev => prev.map(p => {
                  if (p.atleta_id === absentModal.aid) {
                    return { ...p, pagou: false, usou_saldo: false };
                  }
                  return p;
                }));
                setAbsentModal(null);
              }} style={{...S.btn("#BA7517"),justifyContent:"center"}}>💳 Converter em Saldo do Atleta</button>
              <button onClick={()=>setAbsentModal(null)} style={{...S.btn(t.card,t.textSec),justifyContent:"center",marginTop:8}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {hasChanges && (
        <div style={{
          position: "sticky",
          bottom: 0,
          background: t.card,
          border: `1px solid ${t.cardBorder}`,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderRadius: "12px 12px 0 0",
          zIndex: 10,
          marginTop: 16
        }}>
          <span style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>⚠️ Alterações não salvas!</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={() => {
                setLocalParts(partsOriginais);
              }} 
              style={S.btnSm(t.card, t.textSec)}
            >
              Descartar
            </button>
            <button 
              onClick={handleSalvar} 
              style={S.btnSm("#1D9E75", "#fff")}
            >
              💾 Salvar Presenças
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── GERENCIAR PELADA ───────────────────── */
function GerenciarPelada({pelada,atletas,participacoes,datasRealizacao,onUpdatePelada,onRemovePelada,onAddData,onUpdateData,onRemoveData,onAddPart,onUpdatePart,onRemovePart,onUpdateAtleta,onAddFinanceiro,onAddAtleta,onBack,t,aba,setAba, auth, managers, assegurarManagerColaborador, onSavePartsLote, quadras}){
  const S=makeStyles(t);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [localAba, setLocalAba] = useState("datas");
  const currentAba = aba || localAba;
  const currentSetAba = setAba || setLocalAba;
  const isDonoOuAdmin = auth.role === "adm" || (auth.role === "manager" && pelada.manager_id === auth.manager_id);
  const ABAS=["datas","atletas","participações","jogos","placar","ranking"];
  if (isDonoOuAdmin) {
    ABAS.push("colaboradores");
  }
  const datas=datasRealizacao.filter(d=>d.pelada_id===pelada.id);
  const parts=participacoes.filter(p=>p.pelada_id===pelada.id);
 
  const [hasUnsavedChangesAtletas, setHasUnsavedChangesAtletas] = useState(false);
  const [modalConfirmacaoNavegacao, setModalConfirmacaoNavegacao] = useState(null);
  const triggerSaveRef = useRef(null);
 
  const executarNavegacaoDestino = (dest) => {
    if (!dest) return;
    if (dest.type === "aba") {
      currentSetAba(dest.target);
    } else if (dest.type === "data") {
      setIsCarregandoDados(true);
      setTimeout(() => {
        setSelDataSorteio(dest.target);
        setIsCarregandoDados(false);
      }, 450);
    } else if (dest.type === "voltar") {
      onBack();
    }
  };
 
  /* sorteio / jogos */
  /* sorteio / jogos */
  const[drawnTeams,setDrawnTeams]=useState(pelada.drawnTeams||null);
  const[peladaState,setPeladaStateLocal]=useState(pelada.peladaState||null);
  const[benchState,setBenchState]=useState(pelada.initialBench||[]);
  const currentBench = peladaState?.bench || benchState;
  const [showEquipesFormadas, setShowEquipesFormadas] = useState(false);
  const[numTeams,setNumTeams]=useState(2);
  const [numTeamsInput, setNumTeamsInput] = useState("2");
  const[ppt,setPpt]=useState(pelada.playersPerTeam||7);
  const [pptInput, setPptInput] = useState(String(pelada.playersPerTeam||7));
  
  const getLoanTag = (atleta, currentTeamName) => {
    if (!atleta || !peladaState || !peladaState.teamBases || !currentTeamName) return null;
    const athleteId = String(atleta.id || atleta.atleta_id || atleta.idAtleta);
    const baseIds = peladaState.teamBases[currentTeamName] || [];
    if (baseIds.some(id => String(id) === athleteId)) return null;
    for (const teamName of Object.keys(peladaState.teamBases)) {
      const ids = peladaState.teamBases[teamName] || [];
      if (ids.some(id => String(id) === athleteId)) {
        const matches = teamName.match(/\d+/);
        const sigla = matches ? `T${matches[0]}` : teamName.substring(0, 3).toUpperCase();
        return <span style={{marginLeft: 4, color: "#FFA726", fontSize: 10, fontWeight: "bold"}} title={`Emprestado do ${teamName}`}>🤝 ({sigla})</span>;
      }
    }
    return null;
  };

  const reverterTimesOriginais = () => {
    if (!peladaState || !peladaState.teamBases) {
      alert("Não há dados de times originais salvos para esta rodada.");
      return;
    }
    
    if (!window.confirm("Deseja realmente voltar todos os jogadores para seus times originais de sorteio? Isso desfará trocas manuais e empréstimos ativos.")) {
      return;
    }

    const todosJogadores = [];
    if (peladaState.teams) peladaState.teams.forEach(tm => todosJogadores.push(...tm.players));
    if (peladaState.bench) peladaState.bench.forEach(p => todosJogadores.push(p));
    
    const uniquePlayers = [];
    const seenIds = new Set();
    todosJogadores.forEach(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      if (!seenIds.has(idStr)) {
        seenIds.add(idStr);
        uniquePlayers.push(p);
      }
    });

    const baseIds = [];
    Object.keys(peladaState.teamBases).forEach(tName => {
      baseIds.push(...(peladaState.teamBases[tName] || []));
    });
    const benchIds = pelada.initialBench || [];

    const sobressalentes = uniquePlayers.filter(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      return !baseIds.some(id => String(id) === idStr) && !benchIds.some(id => String(id) === idStr);
    });

    if (sobressalentes.length > 0) {
      setSobrasModalData({ sobressalentes, uniquePlayers });
    } else {
      executarReversaoDirect(uniquePlayers, [], "bench");
    }
  };

  const executarReversaoDirect = (uniquePlayers, sobressalentes, destinoSobras) => {
    let ps = deepClone(peladaState);
    
    ps.teams = ps.teams.map(t => {
      const baseIds = ps.teamBases[t.name] || [];
      const originalPlayers = baseIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
      return { ...t, players: originalPlayers };
    });

    const bancoOriginalIds = pelada.initialBench || [];
    const originalBenchPlayers = bancoOriginalIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
    ps.bench = originalBenchPlayers;

    if (sobressalentes.length > 0) {
      if (destinoSobras === "bench") {
        ps.bench.push(...sobressalentes);
      } else if (destinoSobras === "newTeam") {
        let maxNum = 0;
        ps.teams.forEach(tm => {
          const m = tm.name.match(/Time\s+(\d+)/i);
          if (m) {
            const num = parseInt(m[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        const nextNum = maxNum > 0 ? maxNum + 1 : ps.teams.length + 1;
        const novoTimeNome = `Time ${nextNum}`;
        const novoTimeObj = {
          name: novoTimeNome,
          players: [...sobressalentes]
        };
        ps.teams.push(novoTimeObj);
        if (ps.queue) {
          ps.queue.push(novoTimeNome);
        } else {
          ps.queue = [novoTimeNome];
        }
        if (!ps.teamBases) ps.teamBases = {};
        ps.teamBases[novoTimeNome] = sobressalentes.map(p => p.id || p.atleta_id || p.idAtleta);
      }
    }

    if (ps.currentMatch) {
      ps.currentMatch.teamAEmprestados = [];
      ps.currentMatch.teamBEmprestados = [];
      const teamAObj = ps.teams.find(tm => tm.name === ps.currentMatch.teamA);
      const teamBObj = ps.teams.find(tm => tm.name === ps.currentMatch.teamB);
      ps.currentMatch.goleiroA = teamAObj?.players?.find(p => p.goleiro || p.isGoalkeeper)?.id || "";
      ps.currentMatch.goleiroB = teamBObj?.players?.find(p => p.goleiro || p.isGoalkeeper)?.id || "";
    }

    setDrawnTeams(ps.teams);
    setPeladaStateLocal(ps);
    saveDateState({ peladaState: ps, drawnTeams: ps.teams });
    setSobrasModalData(null);
    alert("Jogadores restaurados com sucesso para as equipes e banco originais!");
  };

  useEffect(() => {
    if (!peladaState || isRealizada) return;
    const ps = { ...peladaState };
    const M = ps.minAtletasNovoTime || 3;
    const bench = ps.bench || [];
    const N = bench.length;
    const isFixo = ps.modoRodizioFixo || false;
    let changed = false;

    if (!isFixo) {
      if (N >= M) {
        let maxNum = 0;
        const teams = ps.teams || [];
        teams.forEach(tm => {
          const m = tm.name.match(/Time\s+(\d+)/i);
          if (m) {
            const num = parseInt(m[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        const nextNum = maxNum > 0 ? maxNum + 1 : teams.length + 1;
        const novoTimeNome = `Time ${nextNum}`;
        const novoTimeObj = {
          name: novoTimeNome,
          players: [...bench]
        };
        
        ps.teams = [...teams, novoTimeObj];
        ps.bench = [];
        if (ps.queue) {
          ps.queue.push(novoTimeNome);
        } else {
          ps.queue = [novoTimeNome];
        }
        if (!ps.teamBases) ps.teamBases = {};
        ps.teamBases[novoTimeNome] = bench.map(p => p.id || p.atleta_id || p.idAtleta);
        
        ps.modoRodizio = "misto";
        changed = true;
        
        alert(`O banco atingiu ${N} atletas (mínimo de ${M}). Um novo time (${novoTimeNome}) foi criado automaticamente e o modo de rodízio foi definido como Misto.`);
      } 
      else if (N >= 1 && N < M) {
        if (ps.modoRodizio !== "auto") {
          ps.modoRodizio = "auto";
          changed = true;
        }
      }
    }

    if (changed) {
      setDrawnTeams(ps.teams);
      setPeladaStateLocal(ps);
      saveDateState({ peladaState: ps, drawnTeams: ps.teams });
    }
  }, [peladaState?.bench?.length, peladaState?.minAtletasNovoTime, peladaState?.modoRodizioFixo, isRealizada]);

  const[scoreA,setScoreA]=useState("");const[scoreB,setScoreB]=useState("");
  const[proxTimeA,setProxTimeA]=useState("");
  const[proxTimeB,setProxTimeB]=useState("");
 
  const[modoSorteio,setModoSorteio]=useState("auto");
  const[showSorteioConfig,setShowSorteioConfig]=useState(false);
  const[manualAssignments,setManualAssignments]=useState({});
  const[assignModal,setAssignModal]=useState(null);
  const[subModal,setSubModal]=useState(null);
  const [sobrasModalData, setSobrasModalData] = useState(null);
  const[repSortBy,setRepSortBy]=useState("pts");
  const[sumulaGols,setSumulaGols]=useState({});
  const[editMatchId,setEditMatchId]=useState(null);
  const[editScoreA,setEditScoreA]=useState("");
  const[editScoreB,setEditScoreB]=useState("");
  const[editSumula,setEditSumula]=useState({});
  const[editGoleiroA,setEditGoleiroA]=useState("");
  const[editGoleiroB,setEditGoleiroB]=useState("");
  const[editGoleiroAInteiro,setEditGoleiroAInteiro]=useState(true);
  const[editGoleiroBInteiro,setEditGoleiroBInteiro]=useState(true);
 
  // Estado para modal de "Sair do Jogo"
  const[sairModal,setSairModal]=useState(null); // {playerId, playerName, teamName}
  const[sairMotivo,setSairMotivo]=useState("cansaco"); // cansaco | lesao | outro
  const[sairSubstitutoId,setSairSubstitutoId]=useState("");
  const[sairComConvidado,setSairComConvidado]=useState(false);
  const[substituirPorConvidado,setSubstituirPorConvidado]=useState(false);
  const[jogadoresPausados,setJogadoresPausados]=useState([]); // descansando — podem retornar
 
  const updateSumulaAndScore = (playerId, val, teamType) => {
    const cleanVal = val.replace(/\D/g,"");
    const numVal = parseInt(cleanVal) || 0;
    const oldVal = parseInt(sumulaGols[playerId]) || 0;
    const diff = numVal - oldVal;
    setSumulaGols(prev => ({...prev, [playerId]: cleanVal}));
    if (teamType === 'A') {
      setScoreA(prev => {
        const current = parseInt(prev) || 0;
        return String(Math.max(0, current + diff));
      });
    } else {
      setScoreB(prev => {
        const current = parseInt(prev) || 0;
        return String(Math.max(0, current + diff));
      });
    }
  };
 
  const updateEditSumulaAndScore = (playerId, val, teamType) => {
    const numVal = parseInt(val) || 0;
    const oldVal = parseInt(editSumula[playerId]) || 0;
    const diff = numVal - oldVal;
    setEditSumula(prev => ({...prev, [playerId]: numVal}));
    if (teamType === 'A') {
      setEditScoreA(prev => {
        const current = parseInt(prev) || 0;
        return String(Math.max(0, current + diff));
      });
    } else {
      setEditScoreB(prev => {
        const current = parseInt(prev) || 0;
        return String(Math.max(0, current + diff));
      });
    }
  };
 
  const[selDataSorteio,setSelDataSorteio]=useState(datas[0]?.id||"");
  
  // Filtros de Ano, Mês e Dia
  const [filtroAno, setFiltroAno] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
 
  const NOMES_MESES = {
    "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
    "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
    "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
  };
 
  const datasComAnoMes = React.useMemo(() => {
    return datas.map(d => {
      if (!d.data) return { ...d, ano: "", mes: "" };
      const parts = d.data.split("-");
      const ano = parts[0] || "";
      const mes = parts[1] || "";
      return { ...d, ano, mes };
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [datas]);
 
  const anosDisponiveis = React.useMemo(() => {
    const anosSet = new Set(datasComAnoMes.map(d => d.ano).filter(Boolean));
    return Array.from(anosSet).sort((a, b) => b.localeCompare(a));
  }, [datasComAnoMes]);
 
  useEffect(() => {
    if (anosDisponiveis.length > 0) {
      if (!filtroAno || !anosDisponiveis.includes(filtroAno)) {
        setFiltroAno(anosDisponiveis[0]);
      }
    } else {
      setFiltroAno("");
    }
  }, [anosDisponiveis, filtroAno]);
 
  const mesesDisponiveis = React.useMemo(() => {
    if (!filtroAno) return [];
    const mesesSet = new Set(datasComAnoMes.filter(d => d.ano === filtroAno).map(d => d.mes).filter(Boolean));
    return Array.from(mesesSet).sort((a, b) => a.localeCompare(b));
  }, [datasComAnoMes, filtroAno]);
 
  useEffect(() => {
    if (mesesDisponiveis.length > 0) {
      if (!filtroMes || !mesesDisponiveis.includes(filtroMes)) {
        setFiltroMes(mesesDisponiveis[0]);
      }
    } else {
      setFiltroMes("");
    }
  }, [mesesDisponiveis, filtroMes]);
 
  const diasDisponiveis = React.useMemo(() => {
    if (!filtroAno || !filtroMes) return [];
    return datasComAnoMes.filter(d => d.ano === filtroAno && d.mes === filtroMes);
  }, [datasComAnoMes, filtroAno, filtroMes]);
 
  useEffect(() => {
    if (selDataSorteio === "todas") return;
    if (diasDisponiveis.length > 0) {
      const match = diasDisponiveis.find(d => String(d.id) === String(selDataSorteio));
      if (!match) {
        setSelDataSorteio(diasDisponiveis[0].id);
      }
    } else if (datas.length > 0 && !selDataSorteio) {
      setSelDataSorteio(datas[0].id);
    }
  }, [diasDisponiveis, selDataSorteio, datas]);
 
  const lastLoadedDateIdRef = useRef(null);
 
  const getInitialPeladaStateForDate = (d) => {
    if (d.peladaState) return d.peladaState;
    if (d.confrontos && d.confrontos.length > 0) {
      const teams = d.drawnTeams || d.formacoes || [];
      const bench = d.initialBench || [];
      return {
        teams,
        queue: teams.map(t => t.name),
        bench,
        matchLog: d.confrontos,
        currentMatch: null
      };
    }
    return pelada.peladaState || null;
  };
 
  const saveDateState = (updates) => {
    if (!selDataSorteio) return;
    let finalUpdates = { ...updates };
    const dt = finalUpdates.drawnTeams !== undefined ? finalUpdates.drawnTeams : drawnTeams;
    let ps = finalUpdates.peladaState !== undefined ? finalUpdates.peladaState : peladaState;
    if (dt && ps) {
      const teamBases = {};
      dt.forEach(t => {
        teamBases[t.name] = t.players.map(p => p.id || p.atleta_id || p.idAtleta);
      });
      ps = { ...ps, teamBases };
      finalUpdates.peladaState = ps;
    }
    onUpdateData(selDataSorteio, finalUpdates);
  };
 
  useEffect(() => {
    if (!selDataSorteio) return;
    if (lastLoadedDateIdRef.current === selDataSorteio) return;
    const d = datas.find(x => String(x.id) === String(selDataSorteio));
    if (d) {
      setDrawnTeams(d.drawnTeams !== undefined ? d.drawnTeams : (pelada.drawnTeams || null));
      setPeladaStateLocal(getInitialPeladaStateForDate(d));
      setBenchState(d.initialBench !== undefined ? d.initialBench : (pelada.initialBench || []));
      setJogadoresPausados(d.jogadoresPausados !== undefined ? d.jogadoresPausados : []);
      const loadedPpt = d.playersPerTeam !== undefined ? d.playersPerTeam : (pelada.playersPerTeam || 7);
      const loadedNumTeams = d.numTeams !== undefined ? d.numTeams : 2;
      setPpt(loadedPpt);
      setPptInput(String(loadedPpt));
      setNumTeams(loadedNumTeams);
      setNumTeamsInput(String(loadedNumTeams));
      setManualAssignments(d.manualAssignments !== undefined ? d.manualAssignments : {});
      lastLoadedDateIdRef.current = selDataSorteio;
    } else {
      setDrawnTeams(null);
      setPeladaStateLocal(null);
      setBenchState([]);
      setJogadoresPausados([]);
      setPpt(7);
      setPptInput("7");
      setNumTeams(2);
      setNumTeamsInput("2");
      setManualAssignments({});
      lastLoadedDateIdRef.current = null;
    }
  }, [selDataSorteio, datas]);

  useEffect(() => {
    if (peladaState && peladaState.queue && peladaState.queue.length >= 2) {
      const q = peladaState.queue;
      if (!proxTimeA || !q.includes(proxTimeA)) {
        setProxTimeA(q[0]);
      }
      if (!proxTimeB || !q.includes(proxTimeB) || proxTimeB === proxTimeA) {
        const nextDiff = q.find(name => name !== (proxTimeA || q[0]));
        setProxTimeB(nextDiff || q[1]);
      }
    }
  }, [peladaState, proxTimeA, proxTimeB]);

  function iniciarPartidaManual() {
    if (!peladaState || !proxTimeA || !proxTimeB) return;
    if (proxTimeA === proxTimeB) {
      alert("Selecione dois times diferentes para jogar!");
      return;
    }
    const currentQueue = peladaState.queue || [];
    const rest = currentQueue.filter(t => t !== proxTimeA && t !== proxTimeB);
    const newQueue = [proxTimeA, proxTimeB, ...rest];
    
    const ps = startNextMatch({ ...peladaState, queue: newQueue }, selDataSorteio, ppt);
    setPeladaStateLocal(ps);
    saveDateState({ peladaState: ps });
  }

  const[addBenchId,setAddBenchId]=useState("");

  const vinculados = atletas.filter(a => Array.isArray(a.vinculos) && a.vinculos.includes("pelada_" + pelada.id));
  const vinculadosIds = vinculados.map(a => a.id);

  const presentesIds = parts.filter(p=>String(p.data_realizacao_id)===String(selDataSorteio)&&p.compareceu).map(p=>p.atleta_id);
  const presentes = vinculados.filter(a=>presentesIds.includes(a.id));

  function handleCriarNovaEquipe() {
    if (!drawnTeams) return;
    const nextNum = drawnTeams.length + 1;
    const newTeamName = `Time ${nextNum}`;
    
    const newDrawnTeams = [
      ...drawnTeams, 
      { name: newTeamName, players: [] }
    ];
    
    let newPs = peladaState ? { ...peladaState } : {
      teams: drawnTeams.map(t => ({ name: t.name, players: [...t.players] })),
      queue: drawnTeams.map(t => t.name),
      bench: currentBench,
      matchLog: [],
      currentMatch: null
    };
    
    newPs.teams = [
      ...newPs.teams,
      { name: newTeamName, players: [] }
    ];
    
    if (!newPs.queue.includes(newTeamName)) {
      newPs.queue = [
        ...newPs.queue,
        newTeamName
      ];
    }
    
    if (!newPs.currentMatch && newPs.queue.length >= 2) {
      newPs.currentMatch = {
        dataRealizacaoId: selDataSorteio,
        teamA: newPs.queue[0],
        teamB: newPs.queue[1],
        scoreA: "",
        scoreB: "",
        played: false,
        sumula: {}
      };
    }
    
    setDrawnTeams(newDrawnTeams);
    setPeladaStateLocal(newPs);
    saveDateState({
      drawnTeams: newDrawnTeams,
      peladaState: newPs
    });
  }

  function renomearEquipe(oldName, newName) {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) return;
    if (trimmedNewName === oldName) return;
    
    const jaExiste = drawnTeams.some(t => t.name.toLowerCase() === trimmedNewName.toLowerCase());
    if (jaExiste) {
      alert(`Já existe um time com o nome "${trimmedNewName}". Escolha outro nome.`);
      return;
    }
    
    const newDrawnTeams = drawnTeams.map(t => 
      t.name === oldName ? { ...t, name: trimmedNewName } : t
    );
    
    let newPs = peladaState ? { ...peladaState } : null;
    if (newPs) {
      newPs.teams = newPs.teams.map(t => 
        t.name === oldName ? { ...t, name: trimmedNewName } : t
      );
      
      newPs.queue = newPs.queue.map(name => 
        name === oldName ? trimmedNewName : name
      );
      
      if (newPs.currentMatch) {
        if (newPs.currentMatch.teamA === oldName) newPs.currentMatch.teamA = trimmedNewName;
        if (newPs.currentMatch.teamB === oldName) newPs.currentMatch.teamB = trimmedNewName;
      }
      
      if (newPs.matchLog) {
        newPs.matchLog = newPs.matchLog.map(m => {
          let updated = { ...m };
          if (updated.teamA === oldName) updated.teamA = trimmedNewName;
          if (updated.teamB === oldName) updated.teamB = trimmedNewName;
          if (updated.winner === oldName) updated.winner = trimmedNewName;
          if (updated.loser === oldName) updated.loser = trimmedNewName;
          return updated;
        });
      }
    }
    
    setDrawnTeams(newDrawnTeams);
    setPeladaStateLocal(newPs);
    saveDateState({
      drawnTeams: newDrawnTeams,
      peladaState: newPs
    });
  }

  function doDraw(){
    if(!selDataSorteio){alert("Selecione uma data para realizar o sorteio!");return;}
    if(drawnTeams) {
      if(!confirm("Tem certeza que deseja refazer o sorteio desta data? Isso apagará as partidas e pontuações do dia!")) {
        return;
      }
    }
    
    // Separa os presentes em sorteáveis (independentes) e revezadores
    const { sorteaveis, revezadores } = separarAtletasSorteio(presentes, numTeams, ppt);
    
    if(sorteaveis.length === 0){alert("Não existem atletas independentes presentes na data para realizar o sorteio!");return;}
    
    const { fullTeams, bench } = drawBalancedTeams(sorteaveis, numTeams, ppt);
    
    // Aloca os convidados de revezamento no mesmo time/banco que seus respectivos anfitriões
    revezadores.forEach(rev => {
      const hostId = rev.convidadoDe;
      
      // Procura o anfitrião nos times sorteados
      let alocado = false;
      fullTeams.forEach(t => {
        if (t.players.some(p => p.id === hostId)) {
          t.players.push(rev);
          alocado = true;
        }
      });
      
      // Se não encontrou nos times, coloca no banco logo atrás do anfitrião
      if (!alocado) {
        const hostIndex = bench.findIndex(p => p.id === hostId);
        if (hostIndex > -1) {
          bench.splice(hostIndex + 1, 0, rev);
        } else {
          // Fallback se o anfitrião por algum motivo não está sorteado
          bench.push(rev);
        }
      }
    });

    setDrawnTeams(fullTeams);setBenchState(bench);
    const oldLog = peladaState?.matchLog || [];
    const cleanLog = oldLog.filter(m => String(m.dataRealizacaoId) !== String(selDataSorteio));
    const ps=startNextMatch(buildInitialPeladaState(fullTeams,bench,cleanLog), selDataSorteio, ppt);
    setPeladaStateLocal(ps);
    saveDateState({
      drawnTeams: fullTeams,
      initialBench: bench,
      peladaState: ps,
      playersPerTeam: ppt,
      numTeams
    });
  }

  function confirmManualFormation() {
    if(!selDataSorteio){alert("Selecione uma data!");return;}
    if(drawnTeams) {
      if(!confirm("Tem certeza que deseja refazer o sorteio desta data? Isso apagará as partidas e pontuações do dia!")) {
        return;
      }
    }
    
    // Auto-aloca convidados de revezamento que ficaram "Sem Time" na mesma partição do anfitrião
    const updatedAssignments = { ...manualAssignments };
    presentes.filter(p => p.isConvidado && p.convidadoDe).forEach(rev => {
      const assignment = updatedAssignments[rev.id];
      if (!assignment || assignment === "none") {
        const hostAssignment = updatedAssignments[rev.convidadoDe];
        if (hostAssignment && hostAssignment !== "none") {
          updatedAssignments[rev.id] = hostAssignment;
        }
      }
    });

    const unassignedCount = presentes.filter(p => !updatedAssignments[p.id] || updatedAssignments[p.id]==="none").length;
    if(unassignedCount > 0 && !confirm(`Existem ${unassignedCount} atletas sem time. Deseja iniciar assim mesmo? (Eles não entrarão no jogo)`)) return;
    
    const fullTeams = [];
    for(let i=1; i<=numTeams; i++) {
       const pIds = Object.keys(updatedAssignments).filter(id => updatedAssignments[id] === `t${i}`);
       const teamPlayersCorrect = presentes.filter(p => pIds.includes(String(p.id)));
       if (teamPlayersCorrect.length > 0) fullTeams.push({name: "Time "+i, players: teamPlayersCorrect});
    }
    const benchIds = Object.keys(updatedAssignments).filter(id => updatedAssignments[id] === "bench");
    const bench = presentes.filter(p => benchIds.includes(String(p.id)));

    if(fullTeams.length < 2) { alert("Você precisa formar pelo menos 2 times!"); return; }

    setDrawnTeams(fullTeams);setBenchState(bench);
    const oldLog = peladaState?.matchLog || [];
    const cleanLog = oldLog.filter(m => String(m.dataRealizacaoId) !== String(selDataSorteio));
    const ps=startNextMatch(buildInitialPeladaState(fullTeams,bench,cleanLog), selDataSorteio, ppt);
    setPeladaStateLocal(ps);
    saveDateState({
      drawnTeams: fullTeams,
      initialBench: bench,
      peladaState: ps,
      playersPerTeam: ppt,
      numTeams,
      manualAssignments: updatedAssignments
    });
    currentSetAba("jogos");
  }

  function toggleManualAssignment(playerId, target) {
    const updatedAssignments = {...manualAssignments, [playerId]: target};
    setManualAssignments(updatedAssignments);
    saveDateState({ manualAssignments: updatedAssignments });
    setAssignModal(null);
  }

  function randomFillManual() {
    if(presentes.length === 0) return;
    const shuffled=cryptoShuffle(presentes);
    const newAssig = {};
    const nt=Math.min(numTeams,Math.floor(presentes.length/ppt)||numTeams);
    shuffled.forEach((a,idx) => {
       const ti = idx % nt;
       if (Math.floor(idx / nt) < ppt) {
          newAssig[a.id] = `t${ti+1}`;
       } else {
          newAssig[a.id] = "bench";
       }
    });
    setManualAssignments(newAssig);
    saveDateState({ manualAssignments: newAssig });
  }

  function addToBench(){
    if(!addBenchId)return;
    const a=atletas.find(x=>String(x.id)===String(addBenchId));if(!a)return;
    const newPlayer={nome:a.nome,name:a.nome,habilidade:a.habilidade,skill:a.habilidade,goleiro:a.goleiro,isGoalkeeper:a.goleiro,id:a.id};
    const newBench=[...benchState,newPlayer];
    setBenchState(newBench);
    let ps=peladaState;
    if(ps){ps={...ps,bench:[...ps.bench,newPlayer]};setPeladaStateLocal(ps);}
    saveDateState({initialBench:newBench,peladaState:ps});
    const pExistente = parts.find(p=>String(p.atleta_id)===String(a.id) && String(p.data_realizacao_id)===String(selDataSorteio));
    if(pExistente){
      if(!pExistente.compareceu) onUpdatePart(pExistente.id, {compareceu:true});
    }else{
      const dataObj = datas.find(d=>String(d.id)===String(selDataSorteio));
      onAddPart({atleta_id:a.id, pelada_id:pelada.id, data_realizacao_id:selDataSorteio, pagou:false, compareceu:true, valor:dataObj?.valor||pelada.valor_contribuicao||a.valor_padrao||0});
    }
    setAddBenchId("");
  }

  function removeFromRotation(playerId){
    if(!confirm("Remover este jogador do rodízio atual? (Ele será substituído por alguém do banco, se houver)")) return;
    let newBench=[...benchState];
    let newDrawnTeams=drawnTeams?deepClone(drawnTeams):null;
    let ps=peladaState?deepClone(peladaState):null;

    // Achar se esse jogador é um anfitrião e se o seu convidado correspondente está ativo
    const atleta = atletas.find(x => String(x.id) === String(playerId));
    const isHost = atleta && !atleta.isConvidado;
    let convidadoPromovido = null;
    
    if (isHost) {
      const guestAtleta = atletas.find(x => x.isConvidado && String(x.convidadoDe) === String(playerId));
      if (guestAtleta) {
        const inTeams = newDrawnTeams?.some(t => t.players.some(p => String(p.id) === String(guestAtleta.id)));
        const inBench = newBench.some(b => String(b.id) === String(guestAtleta.id));
        const inPsTeams = ps?.teams?.some(t => t.players.some(p => String(p.id) === String(guestAtleta.id)));
        const inPsBench = ps?.bench?.some(b => String(b.id) === String(guestAtleta.id));
        
        if (inTeams || inBench || inPsTeams || inPsBench) {
          convidadoPromovido = guestAtleta;
        }
      }
    }

    if (convidadoPromovido && confirm(`O atleta é anfitrião do convidado "${getPlayerName(convidadoPromovido)}". Deseja que este convidado assuma a vaga dele na pelada (como substituto permanente)?`)) {
      onUpdateAtleta(convidadoPromovido.id, { isConvidado: false, convidadoDe: null });
      // Remove o anfitrião, e o convidado permanece no mesmo local como substituto permanente e independente
      const promoteGuest = (p) => {
        if (String(p.id) === String(convidadoPromovido.id)) {
          return { ...p, isConvidado: false, convidadoDe: undefined };
        }
        return p;
      };
      newBench = newBench.filter(b => String(b.id) !== String(playerId)).map(promoteGuest);
      if (newDrawnTeams) {
        newDrawnTeams.forEach(t => {
          t.players = t.players.filter(p => String(p.id) !== String(playerId)).map(promoteGuest);
        });
      }
      if (ps) {
        ps.bench = ps.bench.filter(b => String(b.id) !== String(playerId)).map(promoteGuest);
        ps.teams.forEach(t => {
          t.players = t.players.filter(p => String(p.id) !== String(playerId)).map(promoteGuest);
        });
      }
      setBenchState(newBench);
      setDrawnTeams(newDrawnTeams);
      setPeladaStateLocal(ps);
      saveDateState({drawnTeams:newDrawnTeams,initialBench:newBench,peladaState:ps});
      return;
    }

    const inBenchIndex=newBench.findIndex(b=>String(b.id)===String(playerId));
    if(inBenchIndex>-1){
      newBench.splice(inBenchIndex,1);
      if(ps)ps.bench=ps.bench.filter(b=>String(b.id)!==String(playerId));
    }else{
      if(newDrawnTeams){
        newDrawnTeams.forEach(t=>{
          const pIdx=t.players.findIndex(p=>String(p.id)===String(playerId));
          if(pIdx>-1){
            t.players.splice(pIdx,1);
            if(newBench.length>0){const promoted=newBench.shift();t.players.push(promoted);}
          }
        });
      }
      if(ps){
        ps.teams.forEach(t=>{
          const pIdx=t.players.findIndex(p=>String(p.id)===String(playerId));
          if(pIdx>-1){
            t.players.splice(pIdx,1);
            if(ps.bench.length>0){const promoted=ps.bench.shift();t.players.push(promoted);}
          }
        });
      }
    }
    setBenchState(newBench);
    setDrawnTeams(newDrawnTeams);
    setPeladaStateLocal(ps);
    saveDateState({drawnTeams:newDrawnTeams,initialBench:newBench,peladaState:ps});
  }

  function movePlayerInRotation(playerId, target) {
    let newBench = [...benchState];
    let newDrawnTeams = drawnTeams ? deepClone(drawnTeams) : [];
    let ps = peladaState ? deepClone(peladaState) : null;

    // Achar o parceiro de revezamento (se houver) a partir do estado do dia
    let atletaObj = newBench.find(x => String(x.id) === String(playerId));
    if (!atletaObj) {
      newDrawnTeams.forEach(t => {
        const found = t.players.find(x => String(x.id) === String(playerId));
        if (found) atletaObj = found;
      });
    }
    
    let partnerId = null;
    if (atletaObj) {
      if (atletaObj.isConvidado && atletaObj.convidadoDe) {
        partnerId = atletaObj.convidadoDe;
      } else {
        // Busca se existe algum convidado atrelado a este jogador na partida
        let guest = newBench.find(x => x.isConvidado && String(x.convidadoDe) === String(playerId));
        if (!guest) {
          newDrawnTeams.forEach(t => {
            const found = t.players.find(x => x.isConvidado && String(x.convidadoDe) === String(playerId));
            if (found) guest = found;
          });
        }
        if (guest) partnerId = guest.id;
      }
    }

    const idsToMove = [playerId];
    
    // Verifica se o parceiro está no mesmo local de origem
    if (partnerId) {
      const isHostInBench = newBench.some(b => String(b.id) === String(playerId));
      const isPartnerInBench = newBench.some(b => String(b.id) === String(partnerId));
      
      if (isHostInBench && isPartnerInBench) {
        idsToMove.push(partnerId);
      } else {
        newDrawnTeams.forEach(t => {
          const isHostInTeam = t.players.some(p => String(p.id) === String(playerId));
          const isPartnerInTeam = t.players.some(p => String(p.id) === String(partnerId));
          if (isHostInTeam && isPartnerInTeam) {
            idsToMove.push(partnerId);
          }
        });
      }
    }

    let playersObjList = [];

    // Remove do banco todos os IDs a serem movidos
    idsToMove.forEach(id => {
      const idx = newBench.findIndex(b => String(b.id) === String(id));
      if (idx > -1) {
        playersObjList.push(newBench[idx]);
        newBench.splice(idx, 1);
      }
    });

    // Remove dos times todos os IDs a serem movidos
    idsToMove.forEach(id => {
      newDrawnTeams.forEach(t => {
        const idx = t.players.findIndex(p => String(p.id) === String(id));
        if (idx > -1) {
          playersObjList.push(t.players[idx]);
          t.players.splice(idx, 1);
        }
      });
    });

    if (playersObjList.length === 0) {
      setSubModal(null);
      return;
    }

    // Adiciona ao destino
    if (target === "bench") {
      newBench.push(...playersObjList);
    } else if (target.startsWith("t")) {
      const teamIndex = parseInt(target.replace("t", "")) - 1;
      if (newDrawnTeams[teamIndex]) {
        newDrawnTeams[teamIndex].players.push(...playersObjList);
      }
    }

    // Sincroniza peladaState
    if (ps) {
      idsToMove.forEach(id => {
        ps.bench = ps.bench.filter(b => String(b.id) !== String(id));
        ps.teams.forEach(t => {
          t.players = t.players.filter(p => String(p.id) !== String(id));
        });
      });

      if (target === "bench") {
        ps.bench.push(...playersObjList);
      } else if (target.startsWith("t")) {
        const teamIndex = parseInt(target.replace("t", "")) - 1;
        const teamName = newDrawnTeams[teamIndex]?.name || `Time ${teamIndex + 1}`;
        const targetTeam = ps.teams.find(t => t.name === teamName);
        if (targetTeam) {
          targetTeam.players.push(...playersObjList);
        } else {
          ps.teams.push({ name: teamName, players: playersObjList });
        }
      }
    }

    setBenchState(newBench);
    setDrawnTeams(newDrawnTeams);
    setPeladaStateLocal(ps);
    saveDateState({ drawnTeams: newDrawnTeams, initialBench: newBench, peladaState: ps });
    setSubModal(null);
  }

  function saveMatchLocal(){
    if(scoreA===""||scoreB==="")return;
    const ps2=resolveMatch({
      ...peladaState,
      currentMatch:{
        ...peladaState.currentMatch,
        scoreA,
        scoreB,
        played:true,
        sumula:sumulaGols
      }
    },scoreA,scoreB,selDataSorteio);
    const ps3=startNextMatch(ps2, selDataSorteio, ppt);
    setPeladaStateLocal(ps3);
    saveDateState({peladaState:ps3});
    setScoreA("");setScoreB("");
    setSumulaGols({});
  }

  function saveEditedMatch() {
    if (editMatchId === null) return;
    let ps = peladaState ? deepClone(peladaState) : null;
    if (ps && ps.matchLog[editMatchId]) {
      const match = ps.matchLog[editMatchId];
      
      const sA = parseInt(editScoreA) || 0;
      const sB = parseInt(editScoreB) || 0;
      
      const winner = sA > sB ? match.teamA : sA < sB ? match.teamB : match.teamA;
      const loser = winner === match.teamA ? match.teamB : match.teamA;

      ps.matchLog[editMatchId] = {
        ...match,
        scoreA: editScoreA,
        scoreB: editScoreB,
        winner,
        loser,
        sumula: editSumula,
        goleiroA: editGoleiroA,
        goleiroB: editGoleiroB,
        goleiroAInteiro: editGoleiroAInteiro,
        goleiroBInteiro: editGoleiroBInteiro
      };

      setPeladaStateLocal(ps);
      saveDateState({ peladaState: ps });
    }
    setEditMatchId(null);
  }

  function handleSairJogo() {
    if (!sairModal) return;
    const { playerId, teamName } = sairModal;

    let newBench = deepClone(benchState);
    let newDrawnTeams = drawnTeams ? deepClone(drawnTeams) : [];
    let newPausados = deepClone(jogadoresPausados);
    let ps = peladaState ? deepClone(peladaState) : null;
    if (!ps) { setSairModal(null); return; }

    // Helper: remove um jogador dos times e do drawn, retorna o objeto dele
    function removerDaPartida(pid) {
      let obj = null;
      ps.teams.forEach(t => {
        const idx = t.players.findIndex(p => String(p.id) === String(pid));
        if (idx > -1) { [obj] = t.players.splice(idx, 1); }
      });
      // também do banco interno do ps
      if (!obj) {
        const bIdx = ps.bench.findIndex(b => String(b.id) === String(pid));
        if (bIdx > -1) { [obj] = ps.bench.splice(bIdx, 1); }
      }
      newDrawnTeams.forEach(t => {
        const idx = t.players.findIndex(p => String(p.id) === String(pid));
        if (idx > -1) t.players.splice(idx, 1);
      });
      newBench = newBench.filter(b => String(b.id) !== String(pid));
      return obj;
    }

    // Passo 1: Remove o jogador principal
    const playerObj = removerDaPartida(playerId);

    // Passo 2: Remove convidado junto se o anfitriao escolheu levar o convidado
    let convidadoObj = null;
    const convidado = atletas.find(x => x.isConvidado && String(x.convidadoDe) === String(playerId));
    if (sairComConvidado) {
      if (convidado) {
        const emJogo = ps.teams.some(t => t.players.some(p => String(p.id) === String(convidado.id)))
          || ps.bench.some(b => String(b.id) === String(convidado.id))
          || newBench.some(b => String(b.id) === String(convidado.id))
          || newPausados.some(j => String(j.id) === String(convidado.id));
        if (emJogo) convidadoObj = removerDaPartida(convidado.id);
      }
    } else if (convidado && sairMotivo === "lesao") {
      onUpdateAtleta(convidado.id, { isConvidado: false, convidadoDe: null });
      // Se o anfitrião saiu por lesão (permanente) e o convidado ficou, promove o convidado a independente
      const promoteGuest = (p) => {
        if (String(p.id) === String(convidado.id)) {
          return { ...p, isConvidado: false, convidadoDe: undefined };
        }
        return p;
      };
      newBench = newBench.map(promoteGuest);
      newDrawnTeams.forEach(t => {
        t.players = t.players.map(promoteGuest);
      });
      ps.bench = ps.bench.map(promoteGuest);
      ps.teams.forEach(t => {
        t.players = t.players.map(promoteGuest);
      });
    }

    // Passo 3: Aplica substituto do banco (se escolhido) ou pelo convidado (se configurado)
    if (substituirPorConvidado && convidado) {
      // Localiza e remove o convidado do banco ou da lista de pausados
      const inBenchIdx = newBench.findIndex(b => String(b.id) === String(convidado.id));
      let subObj = null;
      if (inBenchIdx > -1) {
        subObj = newBench[inBenchIdx];
        newBench.splice(inBenchIdx, 1);
        ps.bench = ps.bench.filter(b => String(b.id) !== String(convidado.id));
      } else {
        const inPausadosIdx = newPausados.findIndex(j => String(j.id) === String(convidado.id));
        if (inPausadosIdx > -1) {
          subObj = newPausados[inPausadosIdx];
          newPausados.splice(inPausadosIdx, 1);
        }
      }

      // Fallback
      if (!subObj) {
        const aObj = atletas.find(x => String(x.id) === String(convidado.id));
        if (aObj) {
          subObj = { id: aObj.id, nome: aObj.nome, name: aObj.nome, habilidade: aObj.habilidade, skill: aObj.habilidade, goleiro: aObj.goleiro, isGoalkeeper: aObj.goleiro, isConvidado: true, convidadoDe: Number(playerId) };
        }
      }

      if (subObj) {
        const psTeam = ps.teams.find(t => t.name === teamName);
        if (psTeam && !psTeam.players.some(p => String(p.id) === String(convidado.id))) {
          psTeam.players.push(subObj);
        }
        const dtTeam = newDrawnTeams.find(t => t.name === teamName);
        if (dtTeam && !dtTeam.players.some(p => String(p.id) === String(convidado.id))) {
          dtTeam.players.push(subObj);
        }
      }
    } else if (sairSubstitutoId) {
      const subInBench = benchState.find(b => String(b.id) === String(sairSubstitutoId));
      ps.bench = ps.bench.filter(b => String(b.id) !== String(sairSubstitutoId));
      newBench = newBench.filter(b => String(b.id) !== String(sairSubstitutoId));
      if (subInBench) {
        const psTeam = ps.teams.find(t => t.name === teamName);
        if (psTeam) psTeam.players.push(subInBench);
        const dtTeam = newDrawnTeams.find(t => t.name === teamName);
        if (dtTeam) dtTeam.players.push(subInBench);
      }
    }

    // Passo 4: Destino conforme motivo
    const adicionarAoPausados = (obj) => {
      if (obj && !newPausados.some(j => String(j.id) === String(obj.id))) {
        newPausados.push(obj);
      }
      // Garante que não fica no bench do ps
      if (obj) ps.bench = ps.bench.filter(b => String(b.id) !== String(obj.id));
    };
    const removerCompletamente = (obj, pid) => {
      if (obj) ps.bench = ps.bench.filter(b => String(b.id) !== String(pid));
      newBench = newBench.filter(b => String(b.id) !== String(pid));
      newPausados = newPausados.filter(j => String(j.id) !== String(pid));
    };

    if (sairMotivo === "lesao") {
      removerCompletamente(playerObj, playerId);
      if (convidadoObj) removerCompletamente(convidadoObj, convidadoObj.id);
    } else {
      // Cansaço / Outro: vai para 'Descansando' (pode retornar depois)
      adicionarAoPausados(playerObj);
      if (convidadoObj) adicionarAoPausados(convidadoObj);
    }

    setJogadoresPausados(newPausados);
    setBenchState(newBench);
    setDrawnTeams(newDrawnTeams);
    setPeladaStateLocal(ps);
    saveDateState({ drawnTeams: newDrawnTeams, initialBench: newBench, peladaState: ps, jogadoresPausados: newPausados });
    setSairModal(null);
    setSairSubstitutoId("");
    setSairComConvidado(false);
  }

  function retornarJogador(playerId, retornarComVinculo) {
    const player = jogadoresPausados.find(j => String(j.id) === String(playerId));
    if (!player) return;

    let newPausados = jogadoresPausados.filter(j => String(j.id) !== String(playerId));
    let newBench = [...benchState];
    let newDrawnTeams = drawnTeams ? deepClone(drawnTeams) : [];
    let ps = peladaState ? deepClone(peladaState) : null;

    if (retornarComVinculo) {
      // Procura o convidado deste anfitrião
      const guest = atletas.find(x => x.isConvidado && String(x.convidadoDe) === String(playerId));
      if (guest) {
        // Função auxiliar para reestabelecer o vínculo de revezamento no jogador mapeado
        const updatePlayerVinculo = (p) => {
          if (String(p.id) === String(guest.id)) {
            return { ...p, isConvidado: true, convidadoDe: Number(playerId) };
          }
          if (String(p.id) === String(playerId)) {
            return { ...p, isConvidado: false, convidadoDe: undefined };
          }
          return p;
        };

        const hostPlayerObj = { ...player, isConvidado: false, convidadoDe: undefined };

        // Onde o convidado está atualmente na escalação ativa?
        let inTeamName = null;
        newDrawnTeams.forEach(t => {
          if (t.players.some(p => String(p.id) === String(guest.id))) {
            inTeamName = t.name;
          }
        });

        let inPsTeamName = null;
        if (ps) {
          ps.teams.forEach(t => {
            if (t.players.some(p => String(p.id) === String(guest.id))) {
              inPsTeamName = t.name;
            }
          });
        }

        const isGuestInBench = newBench.some(b => String(b.id) === String(guest.id));
        const isGuestInPsBench = ps?.bench?.some(b => String(b.id) === String(guest.id));
        const isGuestInPausados = newPausados.some(j => String(j.id) === String(guest.id));

        if (inTeamName) {
          // Coloca o anfitrião no mesmo time do convidado
          newDrawnTeams = newDrawnTeams.map(t => {
            if (t.name === inTeamName) {
              return { ...t, players: [...t.players.map(updatePlayerVinculo), hostPlayerObj] };
            }
            return { ...t, players: t.players.map(updatePlayerVinculo) };
          });
          if (ps && inPsTeamName) {
            ps.teams = ps.teams.map(t => {
              if (t.name === inPsTeamName) {
                return { ...t, players: [...t.players.map(updatePlayerVinculo), hostPlayerObj] };
              }
              return { ...t, players: t.players.map(updatePlayerVinculo) };
            });
          }
          // Atualiza as outras abas/banco
          newBench = newBench.map(updatePlayerVinculo);
          if (ps) ps.bench = ps.bench.map(updatePlayerVinculo);
        } else if (isGuestInBench || isGuestInPsBench) {
          // Ambos vão para o banco de reservas
          newBench = newBench.map(updatePlayerVinculo);
          newBench.push(hostPlayerObj);
          if (ps) {
            ps.bench = ps.bench.map(updatePlayerVinculo);
            if (!ps.bench.some(b => String(b.id) === String(playerId))) {
              ps.bench.push(hostPlayerObj);
            }
          }
          newDrawnTeams = newDrawnTeams.map(t => ({ ...t, players: t.players.map(updatePlayerVinculo) }));
          if (ps) {
            ps.teams = ps.teams.map(t => ({ ...t, players: t.players.map(updatePlayerVinculo) }));
          }
        } else if (isGuestInPausados) {
          // O convidado também estava descansando. Remove o convidado de pausados e coloca ambos no banco!
          newPausados = newPausados.filter(j => String(j.id) !== String(guest.id));
          const guestPlayerObj = { ...guest, isConvidado: true, convidadoDe: Number(playerId) };

          newBench.push(hostPlayerObj, guestPlayerObj);
          if (ps) {
            if (!ps.bench.some(b => String(b.id) === String(playerId))) ps.bench.push(hostPlayerObj);
            if (!ps.bench.some(b => String(b.id) === String(guest.id))) ps.bench.push(guestPlayerObj);
          }
          newDrawnTeams = newDrawnTeams.map(t => ({ ...t, players: t.players.map(updatePlayerVinculo) }));
          if (ps) {
            ps.teams = ps.teams.map(t => ({ ...t, players: t.players.map(updatePlayerVinculo) }));
          }
        } else {
          // Fallback: banco
          newBench.push(player);
          if (ps && !ps.bench.some(b => String(b.id) === String(playerId))) {
            ps.bench.push(player);
          }
        }
      } else {
        // Convidado não cadastrado / não ativo
        newBench.push(player);
        if (ps && !ps.bench.some(b => String(b.id) === String(playerId))) {
          ps.bench.push(player);
        }
      }
    } else {
      // Retornar sem vínculo
      newBench.push(player);
      if (ps && !ps.bench.some(b => String(b.id) === String(playerId))) {
        ps.bench.push(player);
      }
    }

    setJogadoresPausados(newPausados);
    setBenchState(newBench);
    setDrawnTeams(newDrawnTeams);
    setPeladaStateLocal(ps);
    saveDateState({
      drawnTeams: newDrawnTeams,
      initialBench: newBench,
      peladaState: ps,
      jogadoresPausados: newPausados
    });
  }
  function peladaStandings(){
    const stateParaCalcular = String(selDataSorteio) === "todas" ? consolidatedPeladaState : peladaState;
    if(!stateParaCalcular?.teams)return[];
    const st=stateParaCalcular.teams.map(t=>({name:t.name,j:0,v:0,e:0,d:0,gp:0,gc:0,sg:0,pts:0}));
    (stateParaCalcular.matchLog||[]).filter(m => String(selDataSorteio) === "todas" || String(m.dataRealizacaoId) === String(selDataSorteio)).forEach(m=>{
      const h=st.find(x=>x.name===m.teamA),a=st.find(x=>x.name===m.teamB);if(!h||!a)return;
      const hs=parseInt(m.scoreA),as2=parseInt(m.scoreB);
      h.j++;a.j++;h.gp+=hs;h.gc+=as2;a.gp+=as2;a.gc+=hs;h.sg=h.gp-h.gc;a.sg=a.gp-a.gc;
      if(hs>as2){h.v++;h.pts+=3;a.d++;}else if(hs===as2){h.e++;h.pts++;a.e++;a.pts++;}else{a.v++;a.pts+=3;h.d++;}
    });
    return st.sort((a,b)=>b.pts-a.pts||b.sg-a.sg||b.gp-a.gp);
  }
  const colorOfTeam=n=>{const i=(peladaState?.teams||[]).findIndex(x=>x.name===n);return COLORS[i%COLORS.length]||"#888";};
  const maxTeams=20;

  const selectedDateObj = datas.find(d => String(d.id) === String(selDataSorteio));
  const isRealizada = selectedDateObj?.status === "realizado";

  const consolidatedPeladaState = React.useMemo(() => {
    const allMatches = [];
    const allTeamsMap = new Map();
    datas.forEach(d => {
      const isCurrentActiveDate = String(d.id) === String(selDataSorteio);
      const activeState = isCurrentActiveDate ? peladaState : (d.peladaState || null);

      const matchLog = activeState?.matchLog || d.confrontos || [];
      if (Array.isArray(matchLog)) {
        matchLog.forEach((m, idx) => {
          const mappedMatch = {
            ...m,
            id: m.id || `${d.id}_match_${idx}`,
            dataRealizacaoId: m.dataRealizacaoId || d.id
          };
          if (!allMatches.some(am => am.id === mappedMatch.id)) {
            allMatches.push(mappedMatch);
          }
        });
      }
      const teams = activeState?.teams || d.drawnTeams || d.formacoes || [];
      if (Array.isArray(teams)) {
        teams.forEach(tm => {
          allTeamsMap.set(tm.name, tm);
        });
      }
    });
    if (pelada.peladaState) {
      if (Array.isArray(pelada.peladaState.matchLog)) {
        pelada.peladaState.matchLog.forEach((m, idx) => {
          const mappedMatch = {
            ...m,
            id: m.id || `${selDataSorteio}_match_${idx}`,
            dataRealizacaoId: m.dataRealizacaoId || selDataSorteio
          };
          if (!allMatches.some(am => am.id === mappedMatch.id)) {
            allMatches.push(mappedMatch);
          }
        });
      }
      if (Array.isArray(pelada.peladaState.teams)) {
        pelada.peladaState.teams.forEach(tm => {
          if (!allTeamsMap.has(tm.name)) {
            allTeamsMap.set(tm.name, tm);
          }
        });
      }
    }
    return {
      teams: Array.from(allTeamsMap.values()),
      matchLog: allMatches
    };
  }, [datas, pelada.peladaState, selDataSorteio, peladaState]);

  return(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
          <button 
            onClick={() => {
              if (hasUnsavedChangesAtletas) {
                setModalConfirmacaoNavegacao({ type: "voltar" });
              } else {
                onBack();
              }
            }} 
            style={S.btnSm()}
          >
            ← Voltar
          </button>
          <div style={{minWidth:0}}><h2 style={{fontSize:17,fontWeight:800,margin:0,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pelada.nome}</h2><div style={{fontSize:11,color:t.textSec}}>{vinculados.length} atletas · {datas.length} datas</div></div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          {!pelada.ativo&&<Tag label="Inativa" color="#E24B4A"/>}
          <button onClick={()=>onRemovePelada(pelada.id)} style={S.btnSm("#E24B4A22","#E24B4A")}>🗑</button>
        </div>
      </div>

      {/* Filtros Globais de Data */}
      {datas.length > 0 && (
        <div style={{
          ...S.card,
          display: "flex",
          gap: 12,
          padding: "12px 16px",
          marginBottom: 16,
          alignItems: "center",
          flexWrap: "wrap",
          border: `1px solid ${t.tabBorder}`,
          background: t.card
        }}>
          <div style={{fontSize: 13, fontWeight: 700, color: t.textSec, display: "flex", alignItems: "center", gap: 6}}>
            📅 Data Ativa:
          </div>
          <div style={{display: "flex", gap: 8, flex: 1, minWidth: 280, flexWrap: "wrap"}}>
            <div style={{flex: 1, minWidth: 90}}>
              <label style={{fontSize: 10, color: t.textSec, display: "block", marginBottom: 4, fontWeight: 600}}>ANO</label>
              <select 
                value={filtroAno} 
                onChange={e => setFiltroAno(e.target.value)} 
                style={{...S.select, padding: "8px 12px"}}
              >
                {anosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
            <div style={{flex: 1.2, minWidth: 110}}>
              <label style={{fontSize: 10, color: t.textSec, display: "block", marginBottom: 4, fontWeight: 600}}>MÊS</label>
              <select 
                value={filtroMes} 
                onChange={e => setFiltroMes(e.target.value)} 
                style={{...S.select, padding: "8px 12px"}}
              >
                {mesesDisponiveis.map(mes => (
                  <option key={mes} value={mes}>{NOMES_MESES[mes] || mes}</option>
                ))}
              </select>
            </div>
            <div style={{flex: 1.8, minWidth: 150}}>
              <label style={{fontSize: 10, color: t.textSec, display: "block", marginBottom: 4, fontWeight: 600}}>DIA DA PELADA</label>
              <select 
                value={selDataSorteio} 
                onChange={e => {
                  if (hasUnsavedChangesAtletas) {
                    setModalConfirmacaoNavegacao({ type: "data", target: e.target.value });
                  } else {
                    setSelDataSorteio(e.target.value);
                  }
                }} 
                style={{...S.select, padding: "8px 12px", border: `1px solid ${t.accent || "#7F77DD"}`}}
              >
                <option value="todas">Todas as Datas</option>
                {diasDisponiveis.map(d => (
                  <option key={d.id} value={d.id}>{formatarData(d.data)}{d.local ? ` (${d.local})` : ""}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Abas principais */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${t.tabBorder}`,overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:20}}>
        {ABAS.map(tb=>(
          <button 
            key={tb} 
            onClick={() => {
              if (hasUnsavedChangesAtletas) {
                setModalConfirmacaoNavegacao({ type: "aba", target: tb });
              } else {
                currentSetAba(tb);
              }
            }} 
            style={S.tab(currentAba===tb)}
          >
            {tb === "placar" ? "Classificação" : tb.charAt(0).toUpperCase()+tb.slice(1)}
          </button>
        ))}
      </div>

      {currentAba==="datas"&&(
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))", gap: 16}}>
          {/* Lado Esquerdo: Info da pelada e CriarPelada */}
          <div style={{display:"flex", flexDirection:"column", gap:12}}>
            <div style={S.card}>
              <div style={{fontWeight:600,fontSize:13,color:t.text,marginBottom:8}}>Informações da Pelada</div>
              <div style={{fontSize:13,color:t.textSec,lineHeight:2}}><b style={{color:t.text}}>Nome:</b> {pelada.nome}<br/><b style={{color:t.text}}>Criada em:</b> {formatarData(pelada.data_criacao)}<br/><b style={{color:t.text}}>Status:</b> {pelada.ativo?"🟢 Ativa":"🔴 Inativa"}</div>
            </div>
            <CriarPelada onSave={(d)=>onUpdatePelada(pelada.id,d)} initial={pelada} t={t}/>
          </div>
          {/* Lado Direito: Gerenciamento de Datas */}
          <AbaDatas peladaId={pelada.id} datasRealizacao={datasRealizacao} onAdd={onAddData} onUpdate={onUpdateData} onRemove={onRemoveData} t={t} quadras={quadras}/>
        </div>
      )}
      {currentAba==="atletas"&& (
        String(selDataSorteio) === "todas" ? (
          <div style={{textAlign:"center",padding:40,color:t.textSec,background:t.card,borderRadius:8,border:`1px solid ${t.tabBorder}`}}>
            Selecione uma data específica no seletor global "DIA DA PELADA" para gerenciar os atletas e convidados.
          </div>
        ) : (
          <AbaAtletasPelada pelada={pelada} atletas={atletas} participacoes={participacoes} onSavePartsLote={onSavePartsLote} onAddFinanceiro={onAddFinanceiro} onAddAtleta={onAddAtleta} t={t} isRealizada={isRealizada} selDataSorteio={selDataSorteio} onUnsavedChangesChange={setHasUnsavedChangesAtletas} triggerSaveRef={triggerSaveRef} onAddPart={onAddPart}/>
        )
      )}
      {currentAba==="participações"&& (
        String(selDataSorteio) === "todas" ? (
          <div style={{textAlign:"center",padding:40,color:t.textSec,background:t.card,borderRadius:8,border:`1px solid ${t.tabBorder}`}}>
            Selecione uma data específica no seletor global "DIA DA PELADA" para gerenciar as participações (presenças e pagamentos).
          </div>
        ) : (
          <AbaParticipacoes pelada={pelada} atletas={atletas} participacoes={participacoes} datasRealizacao={datasRealizacao} onAdd={onAddPart} onUpdate={onUpdatePart} onRemove={onRemovePart} onUpdateAtleta={onUpdateAtleta} onAddFinanceiro={onAddFinanceiro} t={t} selDataSorteio={selDataSorteio} onUnsavedChangesChange={setHasUnsavedChangesAtletas} triggerSaveRef={triggerSaveRef} onSavePartsLote={onSavePartsLote}/>
        )
      )}
      {currentAba==="colaboradores"&&isDonoOuAdmin&&(
        <AbaColaboradoresItem 
          collaborators={pelada.collaborators || []} 
          onSaveCollaborators={(novosColaboradores)=>onUpdatePelada(pelada.id, { collaborators: novosColaboradores })} 
          auth={auth} 
          managers={managers} 
          assegurarManagerColaborador={assegurarManagerColaborador} 
          t={t} 
          scope="pelada"
        />
      )}
      {currentAba==="jogos"&&(
        String(selDataSorteio) === "todas" ? (
          <div style={{textAlign:"center",padding:40,color:t.textSec,background:t.card,borderRadius:8,border:`1px solid ${t.tabBorder}`}}>
            Selecione uma data específica no seletor global "DIA DA PELADA" para gerenciar e registrar as partidas.
          </div>
        ) : (
          <div>
            {/* Seletor de Modo de Rodízio e Ajustes de Regra */}
            <div style={{...S.card, marginBottom: 14, padding: "14px 18px", background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 12}}>
              <div style={{display: "flex", flexDirection: "column", gap: 14}}>
                
                {/* Linha Superior: Título, Modo Atual e Cadeado */}
                <div style={{display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: 12}}>
                  <div>
                    <div style={{fontWeight: 700, fontSize: 13, color: t.text, display: "flex", alignItems: "center", gap: 6}}>
                      <span>⚙️ Modo de Funcionamento da Rodada</span>
                      <button
                        onClick={() => {
                          if (isRealizada) return;
                          const ps = { ...peladaState, modoRodizioFixo: !(peladaState?.modoRodizioFixo) };
                          setPeladaStateLocal(ps);
                          saveDateState({ peladaState: ps });
                        }}
                        disabled={isRealizada}
                        title={peladaState?.modoRodizioFixo ? "Cadeado Fechado: Modo fixado manualmente pelo gestor" : "Cadeado Aberto: Modo ajustado automaticamente pelas regras do banco"}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: isRealizada ? "default" : "pointer",
                          fontSize: 16,
                          padding: "2px 6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "transform 0.2s ease",
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                      >
                        {peladaState?.modoRodizioFixo ? "🔒" : "🔓"}
                      </button>
                    </div>
                    <div style={{fontSize: 11, color: t.textSec, marginTop: 4}}>
                      Defina o comportamento do revezamento. Ative o cadeado para fixar o modo manualmente.
                    </div>
                  </div>
                  
                  <div style={{display: "flex", alignItems: "center", gap: 8}}>
                    <div style={{display: "flex", background: t.inputBg, padding: 3, borderRadius: 20, border: `1px solid ${t.inputBorder}`, width: isMobile ? "100%" : "auto"}}>
                      {[
                        { key: "auto", label: "Automático", icon: "🤖", title: "Fila de times e rodízio de banco 100% automáticos" },
                        { key: "misto", label: "Misto (Híbrido)", icon: "🤝", title: "Fila de times automática com empréstimos pontuais" },
                        { key: "manual", label: "Manual", icon: "🎮", title: "Gestão livre: selecione quem joga e monte os times manualmente" }
                      ].map(opt => {
                        const isSelected = (peladaState?.modoRodizio || "auto") === opt.key;
                        return (
                          <button
                            key={opt.key}
                            onClick={() => {
                              if (isRealizada) return;
                              // Ao clicar manualmente em um modo, ativa o cadeado fixando a escolha do gestor!
                              const ps = { ...peladaState, modoRodizio: opt.key, modoRodizioFixo: true };
                              setPeladaStateLocal(ps);
                              saveDateState({ peladaState: ps });
                            }}
                            disabled={isRealizada}
                            title={opt.title}
                            style={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              padding: "6px 12px",
                              borderRadius: 18,
                              border: "none",
                              fontSize: 11,
                              fontWeight: isSelected ? 700 : 500,
                              cursor: isRealizada ? "default" : "pointer",
                              background: isSelected ? "#7F77DD" : "transparent",
                              color: isSelected ? "#FFFFFF" : t.textSec,
                              transition: "all 0.2s ease"
                            }}
                          >
                            <span>{opt.icon}</span>
                            {!isMobile && <span>{opt.label}</span>}
                            {isMobile && isSelected && <span>{opt.label}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                {/* Linha Inferior: Controle do Mínimo de Atletas para formar novo time e Botão Voltar Originais */}
                <div style={{display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: 12, paddingTop: 10, borderTop: `1px solid ${t.cardBorder}`}}>
                  <div style={{display: "flex", alignItems: "center", gap: 10}}>
                    <span style={{fontSize: 12, fontWeight: 600, color: t.text}}>⚽ Mínimo para formar time:</span>
                    <div style={{display: "flex", alignItems: "center", gap: 4, background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 8, padding: "2px 6px"}}>
                      <button
                        onClick={() => {
                          if (isRealizada) return;
                          const currentMin = peladaState?.minAtletasNovoTime || 3;
                          if (currentMin <= 1) return;
                          const ps = { ...peladaState, minAtletasNovoTime: currentMin - 1 };
                          setPeladaStateLocal(ps);
                          saveDateState({ peladaState: ps });
                        }}
                        disabled={isRealizada || (peladaState?.minAtletasNovoTime || 3) <= 1}
                        style={{border: "none", background: "transparent", color: t.text, cursor: "pointer", fontSize: 13, fontWeight: "bold", padding: "2px 6px"}}
                      >
                        -
                      </button>
                      <span style={{fontSize: 12, fontWeight: 700, color: t.text, minWidth: 16, textAlign: "center"}}>
                        {peladaState?.minAtletasNovoTime || 3}
                      </span>
                      <button
                        onClick={() => {
                          if (isRealizada) return;
                          const currentMin = peladaState?.minAtletasNovoTime || 3;
                          const ps = { ...peladaState, minAtletasNovoTime: currentMin + 1 };
                          setPeladaStateLocal(ps);
                          saveDateState({ peladaState: ps });
                        }}
                        disabled={isRealizada}
                        style={{border: "none", background: "transparent", color: t.text, cursor: "pointer", fontSize: 13, fontWeight: "bold", padding: "2px 6px"}}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {peladaState?.teamBases && !isRealizada && (
                    <button
                      onClick={reverterTimesOriginais}
                      style={S.btnSm("#E24B4A22", "#E24B4A")}
                      title="Devolve todos os jogadores às escalações originais de sorteio e restaura o banco"
                    >
                      🔄 Voltar jogadores originais
                    </button>
                  )}
                </div>
                
              </div>
            </div>

            {isRealizada && !drawnTeams && (
              <div style={{...S.card, marginBottom: 14, background: "#1D9E7512", border: "1px solid #1D9E7533", color: "#1D9E75", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 8}}>
                <span>🔒</span>
                <span style={{fontSize: 13, fontWeight: 700}}>Esta rodada foi realizada e as formações de times estão congeladas (sem alterações).</span>
              </div>
            )}

            {(!isRealizada || !drawnTeams) && (
              <div style={{
                ...S.card, 
                marginBottom: 14, 
                background: t.inputBg, 
                border: `1px solid ${t.cardBorder}`, 
                padding: drawnTeams ? "12px 16px" : "16px"
              }}>
                {drawnTeams ? (
                  <button 
                    onClick={() => setShowSorteioConfig(!showSorteioConfig)} 
                    style={{
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      cursor: "pointer",
                      width: "100%",
                      background: "none",
                      border: "none",
                      padding: 0,
                      fontFamily: "inherit",
                      textAlign: "left"
                    }}
                  >
                    <div style={{fontWeight: 700, fontSize: 13, color: t.text, display: "flex", alignItems: "center", gap: 6}}>
                      <span>🎲 Painel de Sorteio</span>
                      <span style={{fontSize: 10, background: "#1D9E7522", color: "#1D9E75", padding: "2px 6px", borderRadius: 4, fontWeight: 700}}>Sorteado</span>
                    </div>
                    <span style={{fontSize: 11, color: t.textSec, fontWeight: 700}}>{showSorteioConfig ? "▲ Recolher Ajustes" : "▼ Ajustes de Sorteio"}</span>
                  </button>
                ) : null}

                {(!drawnTeams || showSorteioConfig) && (
                  <div style={drawnTeams ? {marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.cardBorder}`} : {}}>
                    <div style={{display:"flex",gap:10,marginBottom:14,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:14}}>
                      <button onClick={()=>setModoSorteio("auto")} style={{flex:1,padding:"10px",borderRadius:8,fontWeight:600,fontSize:13,background:modoSorteio==="auto"?"#7F77DD":"transparent",color:modoSorteio==="auto"?"#fff":t.textSec,border:`1px solid ${modoSorteio==="auto"?"#7F77DD":t.cardBorder}`,cursor:"pointer"}}>🎲 Sorteio Automático</button>
                      <button onClick={()=>setModoSorteio("manual")} style={{flex:1,padding:"10px",borderRadius:8,fontWeight:600,fontSize:13,background:modoSorteio==="manual"?"#378ADD":"transparent",color:modoSorteio==="manual"?"#fff":t.textSec,border:`1px solid ${modoSorteio==="manual"?"#378ADD":t.cardBorder}`,cursor:"pointer"}}>🖐️ Formação Manual</button>
                    </div>
                    
                    <div style={{marginBottom: 14, fontSize: 13, color: t.textSec}}>
                      <b>Jogadores Presentes ({presentes.length}):</b> {presentes.map(p => getPlayerName(p)).join(", ") || "Nenhum jogador marcado como presente nesta data."}
                    </div>

                    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <label style={{...S.label,margin:0}}>Jogadores/time:</label>
                        <input 
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={pptInput} 
                          onChange={e=>{
                            const cleanVal = e.target.value.replace(/\D/g, "");
                            setPptInput(cleanVal);
                            if (cleanVal !== "") {
                              const val = Math.max(5, Math.min(15, Number(cleanVal)));
                              setPpt(val);
                              saveDateState({playersPerTeam:val});
                            }
                          }}
                          onBlur={() => {
                            const val = Math.max(5, Math.min(15, Number(pptInput) || 7));
                            setPpt(val);
                            setPptInput(String(val));
                            saveDateState({playersPerTeam:val});
                          }}
                          style={{...S.input,width:60}}
                        />
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <label style={{...S.label,margin:0}}>Times (máx {maxTeams}):</label>
                        <input 
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={numTeamsInput} 
                          onChange={e=>{
                            const cleanVal = e.target.value.replace(/\D/g, "");
                            setNumTeamsInput(cleanVal);
                            if (cleanVal !== "") {
                              const val = Math.max(2, Math.min(maxTeams, Number(cleanVal)));
                              setNumTeams(val);
                              saveDateState({numTeams:val});
                            }
                          }}
                          onBlur={() => {
                            const val = Math.max(2, Math.min(maxTeams, Number(numTeamsInput) || 2));
                            setNumTeams(val);
                            setNumTeamsInput(String(val));
                            saveDateState({numTeams:val});
                          }}
                          style={{...S.input,width:56}}
                        />
                      </div>
                    </div>

                    {modoSorteio==="auto" && (
                      <button onClick={doDraw} style={S.btn("#7F77DD")}>🎲 Sortear Times Automaticamente</button>
                    )}
                    
                    {modoSorteio==="manual" && (
                      <div>
                        <div style={{display:"flex",gap:10,marginBottom:20}}>
                          <button onClick={randomFillManual} style={{...S.btn(t.card,t.text),border:`1px solid ${t.cardBorder}`,flex:1,justifyContent:"center"}}>Preencher Aleatório</button>
                          <button onClick={confirmManualFormation} style={{...S.btn("#378ADD"),flex:1,justifyContent:"center"}}>✓ Iniciar Pelada</button>
                        </div>
                        
                        <div style={{marginBottom:16}}>
                          <div style={{fontWeight:700,fontSize:12,color:t.textSec,marginBottom:8}}>Sem Time ({presentes.filter(p=>!manualAssignments[p.id]||manualAssignments[p.id]==="none").length})</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                            {presentes.filter(p=>!manualAssignments[p.id]||manualAssignments[p.id]==="none").map(p=>(
                               <button key={p.id} onClick={()=>setAssignModal(p.id)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,border:`1px solid ${t.cardBorder}`,background:t.card,color:t.text,cursor:"pointer"}}><PlayerAvatar atleta={p} size={18}/> {getPlayerName(p)}</button>
                            ))}
                          </div>
                        </div>

                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
                          {Array.from({length:numTeams}).map((_,i)=>{
                            const tId = `t${i+1}`;
                            const pInTeam = presentes.filter(p=>manualAssignments[p.id]===tId);
                            return(
                              <div key={tId} style={{...S.card,padding:10,borderColor:COLORS[i%COLORS.length]+"55"}}>
                                <div style={{fontWeight:700,fontSize:13,color:COLORS[i%COLORS.length],marginBottom:8}}>Time {i+1} ({pInTeam.length})</div>
                                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                  {pInTeam.map(p=>(
                                     <div key={p.id} onClick={()=>setAssignModal(p.id)} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,cursor:"pointer",padding:"4px",borderRadius:4,background:t.inputBg}}><PlayerAvatar atleta={p} size={16}/> {getPlayerName(p)}</div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                          <div style={{...S.card,padding:10,borderColor:"#BA751755"}}>
                            <div style={{fontWeight:700,fontSize:13,color:"#BA7517",marginBottom:8}}>Banco ({presentes.filter(p=>manualAssignments[p.id]==="bench").length})</div>
                            <div style={{display:"flex",flexDirection:"column",gap:6}}>
                              {presentes.filter(p=>manualAssignments[p.id]==="bench").map(p=>(
                                 <div key={p.id} onClick={()=>setAssignModal(p.id)} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,cursor:"pointer",padding:"4px",borderRadius:4,background:t.inputBg}}><PlayerAvatar atleta={p} size={16}/> {getPlayerName(p)}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {drawnTeams && (
              /* --- JOGOS E BANCO / FILA / GESTÃO --- */
              <div>
                {/* SELETOR DE MODO DE RODÍZIO */}
                {!isRealizada && (
                  <div style={{
                    ...S.card,
                    marginBottom: 16,
                    padding: "12px 16px",
                    background: t.inputBg,
                    border: `1px solid ${t.cardBorder}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12
                  }}>
                    <div>
                      <div style={{fontWeight: 700, fontSize: 13, color: t.text}}>⚙️ Modo de Rodízio dos Atletas</div>
                      <div style={{fontSize: 11, color: t.textSec, marginTop: 2}}>
                        Escolha se o revezamento de atletas com o banco de reservas ocorre de forma automática ou manual.
                      </div>
                    </div>
                    <div style={{display: "flex", gap: 8}}>
                      <button
                        onClick={() => {
                          const ps = { ...peladaState, modoRodizio: "auto" };
                          setPeladaStateLocal(ps);
                          saveDateState({ peladaState: ps });
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                          background: (peladaState?.modoRodizio || "auto") === "auto" ? "#1D9E75" : "transparent",
                          color: (peladaState?.modoRodizio || "auto") === "auto" ? "#fff" : t.textSec,
                          border: `1px solid ${(peladaState?.modoRodizio || "auto") === "auto" ? "#1D9E75" : t.cardBorder}`
                        }}
                      >
                        🤖 Automático
                      </button>
                      <button
                        onClick={() => {
                          const ps = { ...peladaState, modoRodizio: "manual" };
                          setPeladaStateLocal(ps);
                          saveDateState({ peladaState: ps });
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                          background: (peladaState?.modoRodizio || "auto") === "manual" ? "#378ADD" : "transparent",
                          color: (peladaState?.modoRodizio || "auto") === "manual" ? "#fff" : t.textSec,
                          border: `1px solid ${(peladaState?.modoRodizio || "auto") === "manual" ? "#378ADD" : t.cardBorder}`
                        }}
                      >
                        🖐️ Manual
                      </button>
                    </div>
                  </div>
                )}

                {/* CONFIGURAÇÕES DE ROTAÇÃO DE EQUIPES */}
                {!isRealizada && (
                  <div style={{
                    ...S.card,
                    marginBottom: 16,
                    padding: "14px 16px",
                    background: t.inputBg,
                    border: `1px solid ${t.cardBorder}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12
                  }}>
                    <div style={{fontWeight: 700, fontSize: 13, color: t.text}}>⚙️ Regras de Rodízio de Equipes</div>
                    
                    {/* Regra de Empate (Ambos Saem) */}
                    <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8}}>
                      <div>
                        <div style={{fontWeight: 600, fontSize: 12, color: t.text}}>No empate, saem os dois times</div>
                        <div style={{fontSize: 10, color: t.textSec}}>Os dois times voltam para o final da fila e pontuam 1 no ranking.</div>
                      </div>
                      <label style={{position: 'relative', display: 'inline-block', width: 44, height: 22}}>
                        <input 
                          type="checkbox" 
                          checked={peladaState?.empateAmbosSaem === true} 
                          onChange={e => {
                            const ps = { ...peladaState, empateAmbosSaem: e.target.checked };
                            setPeladaStateLocal(ps);
                            saveDateState({ peladaState: ps });
                          }}
                          style={{opacity: 0, width: 0, height: 0}}
                        />
                        <span style={{
                          position: 'absolute', cursor: 'pointer', inset: 0,
                          background: peladaState?.empateAmbosSaem ? '#1D9E75' : '#ccc',
                          borderRadius: 22, transition: '0.3s',
                          display: 'flex', alignItems: 'center', padding: '0 4px'
                        }}>
                          <span style={{
                            width: 16, height: 16, background: '#fff', borderRadius: '50%',
                            transition: '0.3s',
                            transform: peladaState?.empateAmbosSaem ? 'translateX(20px)' : 'translateX(0px)'
                          }}/>
                        </span>
                      </label>
                    </div>

                    <div style={{height: 1, background: t.cardBorder}}/>

                    {/* Limite de Vitórias Seguidas */}
                    <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8}}>
                      <div>
                        <div style={{fontWeight: 600, fontSize: 12, color: t.text}}>Limite de vitórias seguidas (permanência)</div>
                        <div style={{fontSize: 10, color: t.textSec}}>O time que atingir o limite sai da quadra na próxima rodada.</div>
                      </div>
                      <select
                        value={peladaState?.limiteVitorias || 0}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          const ps = { ...peladaState, limiteVitorias: val };
                          setPeladaStateLocal(ps);
                          saveDateState({ peladaState: ps });
                        }}
                        style={{...S.select, width: "auto", fontSize: 11, padding: "4px 8px", height: 26}}
                      >
                        <option value={0}>Sem limite (padrão)</option>
                        <option value={2}>2 vitórias seguidas</option>
                        <option value={3}>3 vitórias seguidas</option>
                        <option value={4}>4 vitórias seguidas</option>
                        <option value={5}>5 vitórias seguidas</option>
                      </select>
                    </div>

                    {/* Destino ao atingir o limite */}
                    {(peladaState?.limiteVitorias || 0) > 0 && (
                      <>
                        <div style={{height: 1, background: t.cardBorder}}/>
                        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8}}>
                          <div>
                            <div style={{fontWeight: 600, fontSize: 12, color: t.text}}>Ação ao atingir o limite de vitórias</div>
                            <div style={{fontSize: 10, color: t.textSec}}>Escolha para onde o time vencedor vai ao atingir o limite.</div>
                          </div>
                          <select
                            value={peladaState?.destinoVencedorLimite || "finalFila"}
                            onChange={e => {
                              const ps = { ...peladaState, destinoVencedorLimite: e.target.value };
                              setPeladaStateLocal(ps);
                              saveDateState({ peladaState: ps });
                            }}
                            style={{...S.select, width: "auto", fontSize: 11, padding: "4px 8px", height: 26}}
                          >
                            <option value="finalFila">Ir para o final da fila de espera</option>
                            <option value="esperarUmJogo">Esperar 1 jogo fora e voltar logo em seguida</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* GESTÃO GERAL DAS EQUIPES E REFAZER SORTEIO */}
                <div style={{marginTop:8, paddingTop:4, marginBottom: 20}}>
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${t.cardBorder}`, paddingBottom: 8, marginBottom: 14}}>
                    <button 
                      onClick={() => setShowEquipesFormadas(!showEquipesFormadas)}
                      style={{
                        display: "flex", 
                        alignItems: "center", 
                        gap: 8,
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                        fontFamily: "inherit",
                        textAlign: "left"
                      }}
                    >
                      <h3 style={{fontSize:14, fontWeight:700, margin:0, color:t.text}}>👥 Equipes Formadas</h3>
                      <span style={{fontSize: 11, color: t.textSec, fontWeight: 700}}>{showEquipesFormadas ? "▲ Recolher" : "▼ Expandir Lista"}</span>
                    </button>
                    
                    {!isRealizada && showEquipesFormadas && (
                      <div style={{display: "flex", gap: 8}}>
                        <button 
                          onClick={handleCriarNovaEquipe} 
                          style={S.btnSm("#378ADD22","#378ADD")}
                        >
                          ➕ Nova Equipe
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm("Tem certeza que deseja refazer o sorteio desta data? Isso apagará as partidas e pontuações do dia!")) {
                              setDrawnTeams(null);
                              setBenchState([]);
                              setPeladaStateLocal(null);
                              saveDateState({
                                drawnTeams: null,
                                initialBench: [],
                                peladaState: null,
                                manualAssignments: {}
                              });
                            }
                          }} 
                          style={S.btnSm("#E24B4A22","#E24B4A")}
                        >
                          🔄 Refazer Sorteio
                        </button>
                      </div>
                    )}
                  </div>

                  {showEquipesFormadas && (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
                      {drawnTeams.map((tm,ti)=>(
                        <div key={ti} style={{...S.card,borderColor:COLORS[ti%COLORS.length]+"55",padding:12}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:8}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{width:10,height:10,borderRadius:"50%",background:COLORS[ti%COLORS.length]}}/>
                              <span style={{fontWeight:700,fontSize:13,color:t.text}}>{tm.name}</span>
                            </div>
                            {!isRealizada && (
                              <button 
                                onClick={() => {
                                  const novoNome = prompt(`Editar nome do time "${tm.name}":`, tm.name);
                                  if (novoNome) renomearEquipe(tm.name, novoNome);
                                }}
                                style={{border:"none",background:"transparent",color:t.textSec,cursor:"pointer",padding:0,fontSize:11}}
                                title="Editar nome do time"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                          {tm.players.map((p,pi)=>{
                            const pIsRev = p.isConvidado && p.convidadoDe;
                            const pAnfNome = pIsRev ? (atletas.find(x=>x.id===p.convidadoDe)?.apelido||atletas.find(x=>x.id===p.convidadoDe)?.nome||"?") : null;
                            return(
                              <div key={pi} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,padding:"3px 0",borderBottom:`1px solid ${t.cardBorder}`,background: pIsRev ? "#7F77DD08" : "transparent",borderRadius: pIsRev ? 4 : 0,paddingLeft: pIsRev ? 4 : 0}}>
                                <PlayerAvatar atleta={p} size={18}/>
                                <span>{(p.goleiro||p.isGoalkeeper)?"🧤":"⚽"}</span>
                                <span style={{flex:1,fontWeight:500,color: pIsRev ? "#7F77DD" : t.text}}>{getPlayerName(p)}</span>
                                {pIsRev && <span style={{fontSize:9,color:"#7F77DD",opacity:0.8}} title={`Reveza com ${pAnfNome}`}>🔄</span>}
                                {!isRealizada && pIsRev && (
                                  <button
                                    onClick={()=>{
                                      if(confirm(`Promover "${getPlayerName(p)}" a jogador independente?`)){
                                        onUpdateAtleta(p.id, { isConvidado: false, convidadoDe: null });
                                        let newBenchLocal = benchState.map(x=>String(x.id)===String(p.id)?{...x,isConvidado:false,convidadoDe:undefined}:x);
                                        let newDTLocal = drawnTeams.map(team=>({...team,players:team.players.map(pl=>String(pl.id)===String(p.id)?{...pl,isConvidado:false,convidadoDe:undefined}:pl)}));
                                        let psLocal = peladaState ? {...peladaState,bench:peladaState.bench.map(x=>String(x.id)===String(p.id)?{...x,isConvidado:false,convidadoDe:undefined}:x),teams:peladaState.teams.map(team=>({...team,players:team.players.map(pl=>String(pl.id)===String(p.id)?{...pl,isConvidado:false,convidadoDe:undefined}:pl)}))} : null;
                                        setBenchState(newBenchLocal); setDrawnTeams(newDTLocal); setPeladaStateLocal(psLocal);
                                        saveDateState({drawnTeams:newDTLocal,initialBench:newBenchLocal,peladaState:psLocal});
                                      }
                                    }}
                                    style={{border:"none",background:"transparent",color:"#1D9E75",cursor:"pointer",padding:"0 2px",fontSize:10,fontWeight:800}}
                                    title="Promover a titular independente"
                                  >⬆</button>
                                )}
                                {!isRealizada && (
                                  <>
                                    <button onClick={()=>setSubModal(p.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:"0 4px",fontSize:11,fontWeight:700}} title="Substituir / Mover">🔄</button>
                                    <button onClick={()=>{setSairMotivo("cansaco");setSairSubstitutoId("");setSairModal({playerId:p.id,playerName:getPlayerName(p),teamName:tm.name});}} style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:"0 2px",fontSize:11}} title="Sair do jogo">🚑</button>
                                    <button onClick={()=>removeFromRotation(p.id)} style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:0,fontSize:12,fontWeight:700}}>×</button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {peladaState?.currentMatch&&!peladaState.currentMatch.played&&String(peladaState.currentMatch.dataRealizacaoId)===String(selDataSorteio)&&(
                  <div style={{...S.card,border:`2px solid ${isRealizada ? t.cardBorder : "#1D9E7555"}`,marginBottom:20}}>
                    <div style={{fontSize:11,fontWeight:700,color:isRealizada ? t.textSec : "#1D9E75",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>
                      ⚽ Jogo {(peladaState.matchLog?.filter(m=>String(m.dataRealizacaoId)===String(selDataSorteio)).length||0)+1} {isRealizada && "(Congelado - Rodada Realizada)"}
                    </div>
                    
                    {!isRealizada && <MatchTimer t={t} defaultMinutes={10} timerKey={`pelada_${pelada.id}`} />}

                    <div style={{display:"flex", justifyContent:"center", marginBottom:12}}>
                      <div style={{textAlign:"center",padding:"0 2px",flexShrink:0}}>
                        <div style={{display:"flex",gap:4,alignItems:"center"}}>
                          {isRealizada ? (
                            <span style={{fontSize:20,fontWeight:850,color:t.text}}>{scoreA || "0"} × {scoreB || "0"}</span>
                          ) : (
                            <>
                              <input type="number" min={0} max={99} value={scoreA} onChange={e=>setScoreA(e.target.value)} style={{...S.input,width:40,textAlign:"center",padding:"6px 2px",fontSize:16,fontWeight:800}}/>
                              <span style={{fontWeight:700,color:t.textSec,fontSize:14}}>×</span>
                              <input type="number" min={0} max={99} value={scoreB} onChange={e=>setScoreB(e.target.value)} style={{...S.input,width:40,textAlign:"center",padding:"6px 2px",fontSize:16,fontWeight:800}}/>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,alignItems:"start",width:"100%",overflow:"hidden",marginBottom:12}}>
                      <div style={{...S.card,border:`2px solid ${colorOfTeam(peladaState.currentMatch.teamA)}55`,padding:6,textAlign:"right",minWidth:0,overflow:"hidden"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,minWidth:0,overflow:"hidden"}}><span style={{fontWeight:700,fontSize:12,color:t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{peladaState.currentMatch.teamA}</span><div style={{width:8,height:8,borderRadius:"50%",background:colorOfTeam(peladaState.currentMatch.teamA),flexShrink:0}}/></div>
                        <div style={{fontSize:11,color:t.textSec,marginTop:6,display:"flex",flexDirection:"column",gap:6}}>
                          {peladaState.teams?.find(tm=>tm.name===peladaState.currentMatch.teamA)?.players.map((p,pi)=>(
                            <div key={pi} style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                              <span style={{fontWeight:500,color:t.text,overflow:"hidden",textOverflow:"ellipsis",flex:1,textAlign:"right"}}>{getPlayerName(p)}{getLoanTag(p, peladaState.currentMatch.teamA)}</span>
                              {isRealizada ? (
                                sumulaGols[p.id] ? <span style={{fontSize:10,fontWeight:600,color:"#BA7517"}}>⚽({sumulaGols[p.id]})</span> : null
                              ) : (
                                <>
                                  <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0" value={sumulaGols[p.id]||""} onChange={e=>updateSumulaAndScore(p.id, e.target.value, 'A')} style={{...S.input,width:24,padding:"1px 2px",fontSize:10,textAlign:"center",height:18}}/>
                                  <button onClick={()=>setSubModal(p.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:"0 2px",fontSize:10}} title="Substituir">🔄</button>
                                  <button onClick={()=>{setSairMotivo("cansaco");setSairSubstitutoId("");setSairModal({playerId:p.id,playerName:getPlayerName(p),teamName:peladaState.currentMatch.teamA});}} style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:"0 2px",fontSize:10}} title="Sair do jogo">🚑</button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{marginTop: 8, borderTop: `1px solid ${t.cardBorder}`, paddingTop: 6, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end"}}>
                          <div style={{display: "flex", alignItems: "center", gap: 4}}>
                            <span style={{fontSize: 10, color: t.textSec}}>🧤 Goleiro:</span>
                            <select 
                              value={peladaState.currentMatch.goleiroA || ""} 
                              onChange={e => {
                                if (isRealizada) return;
                                const ps = {
                                  ...peladaState,
                                  currentMatch: { ...peladaState.currentMatch, goleiroA: e.target.value }
                                };
                                setPeladaStateLocal(ps);
                                saveDateState({ peladaState: ps });
                              }}
                              disabled={isRealizada}
                              style={{...S.select, padding: "1px 4px", fontSize: 10, width: "auto", height: 20}}
                            >
                              <option value="">Nenhum</option>
                              {(peladaState.teams?.find(tm=>tm.name===peladaState.currentMatch.teamA)?.players || []).map(p => (
                                <option key={p.id} value={p.id}>{getPlayerName(p)}</option>
                              ))}
                            </select>
                          </div>
                          <label style={{display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: t.textSec, cursor: isRealizada ? "default" : "pointer"}}>
                            <input 
                              type="checkbox" 
                              checked={peladaState.currentMatch.goleiroAInteiro !== false} 
                              onChange={e => {
                                if (isRealizada) return;
                                const ps = {
                                  ...peladaState,
                                  currentMatch: { ...peladaState.currentMatch, goleiroAInteiro: e.target.checked }
                                };
                                setPeladaStateLocal(ps);
                                saveDateState({ peladaState: ps });
                              }}
                              disabled={isRealizada}
                              style={{width: 10, height: 10, margin: 0}}
                            />
                            Jogou todo o jogo
                          </label>
                        </div>
                      </div>
                      <div style={{...S.card,border:`2px solid ${colorOfTeam(peladaState.currentMatch.teamB)}55`,padding:6,minWidth:0,overflow:"hidden"}}>
                        <div style={{display:"flex",alignItems:"center",gap:4,minWidth:0,overflow:"hidden"}}><div style={{width:8,height:8,borderRadius:"50%",background:colorOfTeam(peladaState.currentMatch.teamB),flexShrink:0}}/><span style={{fontWeight:700,fontSize:12,color:t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{peladaState.currentMatch.teamB}</span></div>
                        <div style={{fontSize:11,color:t.textSec,marginTop:6,display:"flex",flexDirection:"column",gap:6}}>
                          {peladaState.teams?.find(tm=>tm.name===peladaState.currentMatch.teamB)?.players.map((p,pi)=>(
                            <div key={pi} style={{display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                              {!isRealizada && <button onClick={()=>setSubModal(p.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:"0 2px",fontSize:10}} title="Substituir">🔄</button>}
                              {!isRealizada && <button onClick={()=>{setSairMotivo("cansaco");setSairSubstitutoId("");setSairModal({playerId:p.id,playerName:getPlayerName(p),teamName:peladaState.currentMatch.teamB});}} style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:"0 2px",fontSize:10}} title="Sair do jogo">🚑</button>}
                              {isRealizada ? (
                                sumulaGols[p.id] ? <span style={{fontSize:10,fontWeight:600,color:"#BA7517"}}>⚽({sumulaGols[p.id]})</span> : null
                              ) : (
                                <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0" value={sumulaGols[p.id]||""} onChange={e=>updateSumulaAndScore(p.id, e.target.value, 'B')} style={{...S.input,width:24,padding:"1px 2px",fontSize:10,textAlign:"center",marginRight:2,height:18}}/>
                              )}
                              <span style={{fontWeight:500,color:t.text,overflow:"hidden",textOverflow:"ellipsis"}}>{getPlayerName(p)}{getLoanTag(p, peladaState.currentMatch.teamB)}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{marginTop: 8, borderTop: `1px solid ${t.cardBorder}`, paddingTop: 6, display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start"}}>
                          <div style={{display: "flex", alignItems: "center", gap: 4}}>
                            <span style={{fontSize: 10, color: t.textSec}}>🧤 Goleiro:</span>
                            <select 
                              value={peladaState.currentMatch.goleiroB || ""} 
                              onChange={e => {
                                if (isRealizada) return;
                                const ps = {
                                  ...peladaState,
                                  currentMatch: { ...peladaState.currentMatch, goleiroB: e.target.value }
                                };
                                setPeladaStateLocal(ps);
                                saveDateState({ peladaState: ps });
                              }}
                              disabled={isRealizada}
                              style={{...S.select, padding: "1px 4px", fontSize: 10, width: "auto", height: 20}}
                            >
                              <option value="">Nenhum</option>
                              {(peladaState.teams?.find(tm=>tm.name===peladaState.currentMatch.teamB)?.players || []).map(p => (
                                <option key={p.id} value={p.id}>{getPlayerName(p)}</option>
                              ))}
                            </select>
                          </div>
                          <label style={{display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: t.textSec, cursor: isRealizada ? "default" : "pointer"}}>
                            <input 
                              type="checkbox" 
                              checked={peladaState.currentMatch.goleiroBInteiro !== false} 
                              onChange={e => {
                                if (isRealizada) return;
                                const ps = {
                                  ...peladaState,
                                  currentMatch: { ...peladaState.currentMatch, goleiroBInteiro: e.target.checked }
                                };
                                setPeladaStateLocal(ps);
                                saveDateState({ peladaState: ps });
                              }}
                              disabled={isRealizada}
                              style={{width: 10, height: 10, margin: 0}}
                            />
                            Jogou todo o jogo
                          </label>
                        </div>
                      </div>
                    </div>
                    {!isRealizada && <button onClick={saveMatchLocal} style={{...S.btn(),width:"100%",justifyContent:"center"}}>✓ Registrar</button>}
                  </div>
                )}

                {!peladaState?.currentMatch&&peladaState?.queue?.length>=2&&(
                  <div style={{...S.card,textAlign:"center",marginBottom:16,border:`2px solid ${isRealizada ? t.cardBorder : "#7F77DD55"}`}}>
                    <div style={{fontWeight:600,color:t.text,marginBottom:12}}>Próximo Jogo {isRealizada && "(Congelado)"}</div>
                    
                    {(peladaState?.modoRodizio || "auto") === "manual" && !isRealizada ? (
                      <div>
                        {/* SELEÇÃO MANUAL DE TIMES */}
                        <div style={{display: "flex", gap: 12, justifyContent: "center", alignItems: "center", marginBottom: 16, flexWrap: "wrap"}}>
                          <div style={{display: "flex", flexDirection: "column", gap: 4, minWidth: 140, textAlign: "left"}}>
                            <label style={{...S.label, margin: 0, fontSize: 11}}>Time A:</label>
                            <select 
                              value={proxTimeA} 
                              onChange={e => {
                                const val = e.target.value;
                                setProxTimeA(val);
                                if (val === proxTimeB) {
                                  const other = peladaState.queue.find(t => t !== val);
                                  if (other) setProxTimeB(other);
                                }
                              }} 
                              style={S.select}
                            >
                              {peladaState.queue.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </div>
                          <span style={{fontWeight: 700, color: t.textSec, fontSize: 16, marginTop: 14}}>vs</span>
                          <div style={{display: "flex", flexDirection: "column", gap: 4, minWidth: 140, textAlign: "left"}}>
                            <label style={{...S.label, margin: 0, fontSize: 11}}>Time B:</label>
                            <select 
                              value={proxTimeB} 
                              onChange={e => {
                                const val = e.target.value;
                                setProxTimeB(val);
                                if (val === proxTimeA) {
                                  const other = peladaState.queue.find(t => t !== val);
                                  if (other) setProxTimeA(other);
                                }
                              }} 
                              style={S.select}
                            >
                              {peladaState.queue.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* LISTA DE JOGADORES DO TIMES SELECIONADOS NO MODO MANUAL */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                          <div style={{background:"#378ADD11",padding:10,borderRadius:12}}>
                            <b style={{color:"#378ADD",display:"block",marginBottom:8}}>{proxTimeA}</b>
                            <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                              {peladaState.teams?.find(tm=>tm.name===proxTimeA)?.players.map((p,pi)=><div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}>
                                <PlayerAvatar atleta={p} size={20}/>{getPlayerName(p)}{getLoanTag(p, proxTimeA)} {!isRealizada && <button onClick={()=>setSubModal(p.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:"0 4px",fontSize:10}} title="Substituir">🔄</button>}
                              </div>)}
                            </div>
                          </div>
                          <div style={{background:"#378ADD11",padding:10,borderRadius:12}}>
                            <b style={{color:"#378ADD",display:"block",marginBottom:8}}>{proxTimeB}</b>
                            <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                              {peladaState.teams?.find(tm=>tm.name===proxTimeB)?.players.map((p,pi)=><div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}>
                                <PlayerAvatar atleta={p} size={20}/>{getPlayerName(p)}{getLoanTag(p, proxTimeB)} {!isRealizada && <button onClick={()=>setSubModal(p.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:"0 4px",fontSize:10}} title="Substituir">🔄</button>}
                              </div>)}
                            </div>
                          </div>
                        </div>

                        <button onClick={iniciarPartidaManual} style={S.btn("#378ADD")}>▶ Iniciar Partida Manual</button>
                      </div>
                    ) : (
                      <>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                          <div style={{background:"#7F77DD11",padding:10,borderRadius:12}}>
                            <b style={{color:"#7F77DD",display:"block",marginBottom:8}}>{peladaState.queue[0]}</b>
                            <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                              {peladaState.teams?.find(tm=>tm.name===peladaState.queue[0])?.players.map((p,pi)=><div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}>
                                <PlayerAvatar atleta={p} size={20}/>{getPlayerName(p)}{getLoanTag(p, peladaState.queue[0])} {!isRealizada && <button onClick={()=>setSubModal(p.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:"0 4px",fontSize:10}} title="Substituir">🔄</button>}
                              </div>)}
                            </div>
                          </div>
                          <div style={{background:"#7F77DD11",padding:10,borderRadius:12}}>
                            <b style={{color:"#7F77DD",display:"block",marginBottom:8}}>{peladaState.queue[1]}</b>
                            <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                              {peladaState.teams?.find(tm=>tm.name===peladaState.queue[1])?.players.map((p,pi)=><div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}>
                                <PlayerAvatar atleta={p} size={20}/>{getPlayerName(p)}{getLoanTag(p, peladaState.queue[1])} {!isRealizada && <button onClick={()=>setSubModal(p.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:"0 4px",fontSize:10}} title="Substituir">🔄</button>}
                              </div>)}
                            </div>
                          </div>
                        </div>
                        {!isRealizada && <button onClick={()=>{const ps=startNextMatch(peladaState, selDataSorteio, ppt);setPeladaStateLocal(ps);saveDateState({peladaState:ps});}} style={S.btn("#7F77DD")}>▶ Iniciar Próximo Jogo na data selecionada</button>}
                      </>
                    )}
                  </div>
                )}

                {(!peladaState || (!peladaState.currentMatch && (!peladaState.queue || peladaState.queue.length < 2))) && (
                  <div style={{textAlign:"center",padding:40,color:t.textSec}}>
                    {isRealizada ? "Todos os jogos desta data foram concluídos e registrados." : "Faça o sorteio primeiro para a data selecionada."}
                  </div>
                )}

                {/* FILA DE ESPERA COMPLETA COM SEUS ATLETAS E AÇÕES */}
                {peladaState?.queue?.length > 2 && (
                  <div style={{marginTop:16, paddingTop:16, borderTop:`1px dashed ${t.cardBorder}`, marginBottom: 20}}>
                    <div style={{fontSize:13, fontWeight:800, color:t.textSec, marginBottom:12, textAlign:"center"}}>📋 Fila de Espera</div>
                    <div style={{display:"flex", flexDirection:"column", gap:14}}>
                      {peladaState.queue.slice(2).map((teamName, qIdx) => {
                        const teamData = peladaState.teams?.find(tm => tm.name === teamName);
                        return (
                          <div key={teamName} style={{background: t.inputBg, borderRadius: 10, padding: 10, border: `1px solid ${t.cardBorder}`}}>
                            <div style={{fontSize:12, fontWeight:700, color:"#7F77DD", marginBottom:8, display:"flex", alignItems:"center", gap:6}}>
                              <div style={{width:8, height:8, borderRadius:"50%", background:colorOfTeam(teamName)}}/>
                              <span>{qIdx === 0 ? "Próximo a entrar" : `${qIdx + 1}º na Fila`}: {teamName}</span>
                            </div>
                            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                              {teamData?.players.map((p, pi) => {
                                const pIsRev = p.isConvidado && p.convidadoDe;
                                const pAnfNome = pIsRev ? (atletas.find(x=>x.id===p.convidadoDe)?.apelido||atletas.find(x=>x.id===p.convidadoDe)?.nome||"?") : null;
                                return (
                                  <div key={pi} style={{display:"inline-flex", alignItems:"center", gap:4, fontSize:11, background: t.card, padding:"4px 8px", borderRadius:12, border:`1px solid ${t.inputBorder}`}}>
                                    <PlayerAvatar atleta={p} size={16}/>
                                    <span style={{fontWeight:500, color: pIsRev ? "#7F77DD" : t.text}}>{getPlayerName(p)}</span>
                                    {pIsRev && <span style={{fontSize:9, color:"#7F77DD", opacity:0.8}} title={`Reveza com ${pAnfNome}`}>🔄</span>}
                                    {!isRealizada && (
                                      <>
                                        <button onClick={()=>setSubModal(p.id)} style={{border:"none", background:"transparent", color:"#0095F6", cursor:"pointer", padding:"0 2px", fontSize:11}} title="Mover / Substituir">🔄</button>
                                        <button onClick={()=>{setSairMotivo("cansaco");setSairSubstitutoId("");setSairModal({playerId:p.id,playerName:getPlayerName(p),teamName:teamName});}} style={{border:"none", background:"transparent", color:"#E24B4A", cursor:"pointer", padding:"0 2px", fontSize:11}} title="Sair do jogo">🚑</button>
                                        <button onClick={()=>removeFromRotation(p.id)} style={{border:"none", background:"transparent", color:"#E24B4A", cursor:"pointer", padding:"0 2px", fontSize:11}} title="Remover do Rodízio">×</button>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* BANCO DE RESERVAS E RETARDATÁRIOS */}
                {drawnTeams && (
                  <div style={{marginBottom: 20}}>
                    {!isRealizada && (
                      <div style={{...S.card,marginBottom:14,background:t.inputBg,border:`1px dashed ${t.cardBorder}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                        <label style={{...S.label,margin:0}}>+ Retardatário:</label>
                        <select style={{...S.select,flex:1,minWidth:140}} value={addBenchId} onChange={e=>setAddBenchId(e.target.value)}>
                          <option value="">Selecione quem chegou...</option>
                          {vinculados.filter(a=>!currentBench.some(b=>String(b.id)===String(a.id)) && !drawnTeams.some(t=>t.players.some(p=>String(p.id)===String(a.id)))).map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}
                        </select>
                        <button onClick={addToBench} style={S.btn("#BA7517")}>Adicionar ao Banco</button>
                      </div>
                    )}
                    {currentBench.length>0&& (
                      <div style={{...S.card,border:"1px solid #BA751733",background:"#BA751710",marginBottom:12}}>
                        <div style={{fontWeight:700,color:"#BA7517",marginBottom:6}}>🪑 Banco ({currentBench.length})</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {currentBench.map((b,i)=>{
                            const isRev = b.isConvidado && b.convidadoDe;
                            const anfitriaoNome = isRev ? (atletas.find(x=>x.id===b.convidadoDe)?.apelido || atletas.find(x=>x.id===b.convidadoDe)?.nome || "?") : null;
                            return (
                              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,padding:"3px 10px",borderRadius:16,background: isRev ? "#7F77DD22" : "#BA751722",color: isRev ? "#7F77DD" : "#BA7517",fontWeight:600,border: isRev ? "1px solid #7F77DD44" : "none"}}>
                                <PlayerAvatar atleta={b} size={16}/>
                                {b.goleiro?"🧤":"⚽"} {getPlayerName(b)}
                                {isRev && <span title={`Reveza com ${anfitriaoNome}`} style={{fontSize:9,opacity:0.85}}>🔄{anfitriaoNome}</span>}
                                {!isRealizada && isRev && (
                                  <button
                                    onClick={()=>{
                                      if(confirm(`Promover "${getPlayerName(b)}" a jogador independente? Ele deixará de revezar com o anfitrião.`)){
                                        onUpdateAtleta(b.id, { isConvidado: false, convidadoDe: null });
                                        let newBenchLocal = benchState.map(x => String(x.id)===String(b.id) ? {...x,isConvidado:false,convidadoDe:undefined} : x);
                                        let newDTLocal = drawnTeams ? drawnTeams.map(tm => ({...tm,players:tm.players.map(p=>String(p.id)===String(b.id)?{...p,isConvidado:false,convidadoDe:undefined}:p)})) : drawnTeams;
                                        let psLocal = peladaState ? {...peladaState, bench: peladaState.bench.map(x=>String(x.id)===String(b.id)?{...x,isConvidado:false,convidadoDe:undefined}:x), teams: peladaState.teams.map(tm=>({...tm,players:tm.players.map(p=>String(p.id)===String(b.id)?{...p,isConvidado:false,convidadoDe:undefined}:p)}))} : null;
                                        setBenchState(newBenchLocal); setDrawnTeams(newDTLocal); setPeladaStateLocal(psLocal);
                                        saveDateState({drawnTeams:newDTLocal,initialBench:newBenchLocal,peladaState:psLocal});
                                      }
                                    }}
                                    style={{border:"none",background:"transparent",color:"#1D9E75",cursor:"pointer",padding:"0 2px",fontSize:10,fontWeight:800}}
                                    title="Promover a titular independente"
                                  >⬆</button>
                                )}
                                {!isRealizada && (
                                  <>
                                    <button onClick={()=>setSubModal(b.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:0,marginLeft:2,marginRight:2,fontSize:10,fontWeight:800}} title="Substituir / Mover">↔</button>
                                    <button onClick={()=>{setSairMotivo("cansaco");setSairSubstitutoId("");setSairModal({playerId:b.id,playerName:getPlayerName(b),teamName:"bench"});}} style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:0,marginLeft:2,marginRight:2,fontSize:10,fontWeight:800}} title="Sair do jogo">🚑</button>
                                    <button onClick={()=>removeFromRotation(b.id)} style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:0,marginLeft:2,fontWeight:800}}>×</button>
                                  </>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ATLETAS QUE SAÍRAM / DESCANSANDO */}
                {jogadoresPausados.length > 0 && (
                  <div style={{...S.card, border: `1px solid ${t.cardBorder}`, marginBottom: 20}}>
                    <div style={{fontSize:12, fontWeight:700, color:t.text, marginBottom:10, display:"flex", alignItems:"center", gap:6}}>
                      <span>🚑 Atletas que Saíram / Descansando ({jogadoresPausados.length})</span>
                    </div>
                    <div style={{display:"flex", flexDirection:"column", gap:8}}>
                      {jogadoresPausados.map((p) => {
                        const guest = atletas.find(x => x.isConvidado && String(x.convidadoDe) === String(p.id));
                        const isGuestActive = guest && (
                          benchState.some(b => String(b.id) === String(guest.id)) ||
                          (drawnTeams && drawnTeams.some(t => t.players.some(pl => String(pl.id) === String(guest.id)))) ||
                          jogadoresPausados.some(j => String(j.id) === String(guest.id))
                        );
                        return (
                          <div key={p.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:t.inputBg, borderRadius:10, border:`1px solid ${t.inputBorder}`}}>
                            <div style={{display:"flex", alignItems:"center", gap:8}}>
                              <PlayerAvatar atleta={p} size={24}/>
                              <div>
                                <div style={{fontWeight:600, fontSize:13, color:t.text}}>{getPlayerName(p)}</div>
                                {guest && isGuestActive && (
                                  <div style={{fontSize:11, color:"#7F77DD", marginTop:2, display:"flex", alignItems:"center", gap:4}}>
                                    <input 
                                      type="checkbox" 
                                      id={`retornar-vinculo-${p.id}`}
                                      defaultChecked={true}
                                      style={{width:14, height:14, accentColor:"#7F77DD"}}
                                    />
                                    <label htmlFor={`retornar-vinculo-${p.id}`} style={{cursor:"pointer", fontSize: 11}}>Retornar com vínculo com {getPlayerName(guest)}</label>
                                  </div>
                                )}
                              </div>
                            </div>
                            {!isRealizada && (
                              <button 
                                onClick={() => {
                                  const chk = document.getElementById(`retornar-vinculo-${p.id}`);
                                  const retornarComVinculo = chk ? chk.checked : false;
                                  retornarJogador(p.id, retornarComVinculo);
                                }} 
                                style={S.btn("#1D9E75")}
                              >
                                Retornar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


                {/* HISTÓRICO DA DATA */}
                {(peladaState?.matchLog||[]).filter(m => String(m.dataRealizacaoId) === String(selDataSorteio)).length>0&&(
                  <div style={{marginTop:20}}>
                    <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 10px 0",color:t.text}}>📜 Histórico da Data</h3>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {(peladaState?.matchLog||[]).map((m, originalIndex) => ({m, originalIndex})).filter(({m}) => String(m.dataRealizacaoId) === String(selDataSorteio)).reverse().map(({m, originalIndex})=>(
                        <div key={originalIndex} style={{...S.card,padding:"10px 12px",position:"relative"}}>
                          {!isRealizada && (
                            <button 
                              onClick={() => {
                                setEditMatchId(originalIndex);
                                setEditScoreA(m.scoreA);
                                setEditScoreB(m.scoreB);
                                setEditSumula(m.sumula || {});
                                setEditGoleiroA(m.goleiroA || "");
                                setEditGoleiroB(m.goleiroB || "");
                                setEditGoleiroAInteiro(m.goleiroAInteiro !== false);
                                setEditGoleiroBInteiro(m.goleiroBInteiro !== false);
                              }}
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 12,
                                padding: 2
                              }}
                              title="Editar Partida e Súmula"
                            >
                              ✏️
                            </button>
                          )}
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:8}}>
                            <span style={{fontWeight:800,fontSize:15,color:"#378ADD"}}>{m.scoreA} × {m.scoreB}</span>
                            <div style={{marginTop:2,textAlign:"center"}}>
                              <span style={{fontSize:10,color:"#1D9E75",fontWeight:600,display:"block"}}>🏆 {m.winner}</span>
                              {m.dataRealizacaoId && datas.find(d=>String(d.id)===String(m.dataRealizacaoId)) && (
                                <span style={{fontSize:9,color:t.textSec,display:"block",marginTop:2}}>
                                  📅 {formatarData(datas.find(d=>String(d.id)===String(m.dataRealizacaoId)).data)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                            <div style={{flex:1,textAlign:"left",minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:m.winner===m.teamA?700:500,color:m.winner===m.teamA?"#1D9E75":t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.teamA}</div>
                              <div style={{fontSize:10,color:t.textSec,marginTop:2,display:"flex",flexDirection:"column",gap:2}}>
                                {(m.playersA||[]).map((p,pi)=>{
                                  const gols = m.sumula?.[p.id] ? ` ⚽(${m.sumula[p.id]})` : "";
                                  return <div key={pi} style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{getPlayerName(p)}{gols}</div>;
                                })}
                              </div>
                            </div>
                            <div style={{flex:1,textAlign:"right",minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:m.winner===m.teamB?700:500,color:m.winner===m.teamB?"#1D9E75":t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.teamB}</div>
                              <div style={{fontSize:10,color:t.textSec,marginTop:2,display:"flex",flexDirection:"column",gap:2}}>
                                {(m.playersB||[]).map((p,pi)=>{
                                  const gols = m.sumula?.[p.id] ? ` (${m.sumula[p.id]})⚽` : "";
                                  return <div key={pi} style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{getPlayerName(p)}{gols}</div>;
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}
      {currentAba==="placar"&&<StandingsTable standings={peladaStandings()} teams={(String(selDataSorteio) === "todas" ? (consolidatedPeladaState?.teams || []) : (peladaState?.teams || [])).map(x=>x.name)} colorOf={colorOfTeam} accent="#378ADD" t={t}/>}
      {currentAba==="ranking"&&<AbaRelatorioPelada peladaState={consolidatedPeladaState} datas={datas} atletas={atletas} selDataSorteio={selDataSorteio} repSortBy={repSortBy} setRepSortBy={setRepSortBy} formatarData={formatarData} t={t} />}

      {subModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:300}}>
            <div style={{fontWeight:700,fontSize:15,color:t.text,marginBottom:12}}>Mover / Substituir Jogador para:</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {drawnTeams.map((tm,i)=>(
                <button key={i} onClick={()=>movePlayerInRotation(subModal, `t${i+1}`)} style={{...S.btn(COLORS[i%COLORS.length]+"22",COLORS[i%COLORS.length]),justifyContent:"center",fontWeight:700}}>{tm.name}</button>
              ))}
              <button onClick={()=>movePlayerInRotation(subModal, "bench")} style={{...S.btn("#BA751722","#BA7517"),justifyContent:"center",fontWeight:700}}>Banco (Espera)</button>
              <button onClick={()=>setSubModal(null)} style={{...S.btn(t.card,t.textSec),justifyContent:"center",marginTop:8,border:`1px solid ${t.cardBorder}`}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {sobrasModalData && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:400,textAlign:"center"}}>
            <div style={{fontWeight:700,fontSize:15,color:t.text,marginBottom:8}}>⚠️ Jogadores sem Time de Origem</div>
            <div style={{fontSize:12,color:t.textSec,marginBottom:14}}>
              Os seguintes atletas foram adicionados após o sorteio ou não faziam parte das equipes/banco originais:
            </div>
            
            <div style={{maxHeight:120,overflowY:"auto",background:t.inputBg,border:`1px solid ${t.inputBorder}`,borderRadius:8,padding:8,marginBottom:16,display:"flex",flexDirection:"column",gap:4,textAlign:"left"}}>
              {sobrasModalData.sobressalentes.map((p,pi)=>(
                <div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}>
                  <PlayerAvatar atleta={p} size={18}/><span>{getPlayerName(p)}</span>
                </div>
              ))}
            </div>

            <div style={{fontSize:12,fontWeight:600,color:t.text,marginBottom:12}}>O que deseja fazer com estes jogadores?</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button 
                onClick={() => executarReversaoDirect(sobrasModalData.uniquePlayers, sobrasModalData.sobressalentes, "bench")} 
                style={{...S.btn("#1D9E7522","#1D9E75"),justifyContent:"center",fontWeight:700}}
              >
                📥 Enviar todos para o Banco de Espera
              </button>
              <button 
                onClick={() => executarReversaoDirect(sobrasModalData.uniquePlayers, sobrasModalData.sobressalentes, "newTeam")} 
                style={{...S.btn("#378ADD22","#378ADD"),justifyContent:"center",fontWeight:700}}
              >
                ➕ Criar um novo Time com eles
              </button>
              <button 
                onClick={() => setSobrasModalData(null)} 
                style={{...S.btn(t.card,t.textSec),justifyContent:"center",marginTop:8,border:`1px solid ${t.cardBorder}`}}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sair do Jogo */}
      {sairModal && (()=>{
        // Detecta se o jogador que vai sair é anfitrião com convidado ativo
        const sairPlayerObj = atletas.find(x => String(x.id) === String(sairModal.playerId));
        const isHostLeaving = sairPlayerObj && !sairPlayerObj.isConvidado;
        const convidadoDoSaindo = isHostLeaving
          ? atletas.find(x => x.isConvidado && String(x.convidadoDe) === String(sairModal.playerId))
          : null;
        const convidadoEstaAtivo = convidadoDoSaindo && (
          peladaState?.teams?.some(t => t.players.some(p => String(p.id) === String(convidadoDoSaindo.id))) ||
          benchState.some(b => String(b.id) === String(convidadoDoSaindo.id)) ||
          jogadoresPausados.some(j => String(j.id) === String(convidadoDoSaindo.id))
        );
        // Substitutos disponíveis = banco normal (excluindo o próprio convidado, se for sair junto)
        const substitutosDisponiveis = benchState.filter(b =>
          !sairComConvidado || !convidadoDoSaindo || String(b.id) !== String(convidadoDoSaindo.id)
        );
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1001,padding:16}}>
            <div style={{...S.card,width:"100%",maxWidth:360,maxHeight:"92vh",overflowY:"auto"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${t.cardBorder}`}}>
                <span style={{fontSize:22}}>🚑</span>
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:t.text}}>{sairModal.playerName}</div>
                  <div style={{fontSize:11,color:t.textSec}}>está saindo antes do fim do jogo</div>
                </div>
              </div>

              {/* Motivo */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:t.textSec,textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>Motivo</div>
                <div style={{display:"flex",gap:6}}>
                  {[
                    {id:"cansaco", label:"⚡ Cansaço", color:"#BA7517"},
                    {id:"lesao",   label:"🤕 Lesão",   color:"#E24B4A"},
                    {id:"outro",   label:"📱 Outro",   color:"#6B7280"},
                  ].map(m=>(
                    <button
                      key={m.id}
                      onClick={()=>setSairMotivo(m.id)}
                      style={{
                        flex:1,padding:"8px 4px",borderRadius:10,fontSize:11,fontWeight:700,cursor:"pointer",
                        border:`2px solid ${sairMotivo===m.id ? m.color : t.cardBorder}`,
                        background: sairMotivo===m.id ? m.color+"22" : "transparent",
                        color: sairMotivo===m.id ? m.color : t.textSec,
                        transition:"all 0.15s"
                      }}
                    >{m.label}</button>
                  ))}
                </div>
                {sairMotivo==="lesao" && (
                  <div style={{fontSize:11,color:"#E24B4A",marginTop:8,background:"#E24B4A10",padding:"6px 10px",borderRadius:8}}>
                    ⚠️ Lesão remove o atleta da rotação. Ele não poderá retornar.
                  </div>
                )}
                {sairMotivo!=="lesao" && (
                  <div style={{fontSize:11,color:"#1D9E75",marginTop:8,background:"#1D9E7510",padding:"6px 10px",borderRadius:8}}>
                    ⏸️ Irá para a seção "Descansando" — pode retornar ao banco quando quiser.
                  </div>
                )}
              </div>

              {/* Convidado de carona — só aparece se o anfitrião tiver convidado ativo */}
              {convidadoEstaAtivo && (
                <div style={{marginBottom:16,padding:"10px 12px",borderRadius:10,background:"#7F77DD10",border:"1px solid #7F77DD33"}}>
                  <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
                    <input
                      type="checkbox"
                      checked={sairComConvidado}
                      onChange={e=>{
                        setSairComConvidado(e.target.checked);
                        if (e.target.checked) setSubstituirPorConvidado(false);
                      }}
                      style={{marginTop:2,width:16,height:16,accentColor:"#7F77DD",flexShrink:0}}
                    />
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:"#7F77DD"}}>🚗 Convidado também sai</div>
                      <div style={{fontSize:11,color:t.textSec,marginTop:2}}>
                        <b>{convidadoDoSaindo.apelido||convidadoDoSaindo.nome}</b> (convidado de carona) também vai embora junto.
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Opção: Substituir pelo Convidado */}
              {sairModal.teamName !== "bench" && convidadoEstaAtivo && !sairComConvidado && (
                <div style={{marginBottom:16,padding:"10px 12px",borderRadius:10,background:"#1D9E7510",border:"1px solid #1D9E7533"}}>
                  <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
                    <input
                      type="checkbox"
                      checked={substituirPorConvidado}
                      onChange={e=>setSubstituirPorConvidado(e.target.checked)}
                      style={{marginTop:2,width:16,height:16,accentColor:"#1D9E75",flexShrink:0}}
                    />
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:"#1D9E75"}}>🔄 Substituir pelo convidado</div>
                      <div style={{fontSize:11,color:t.textSec,marginTop:2}}>
                        <b>{convidadoDoSaindo.apelido||convidadoDoSaindo.nome}</b> entrará automaticamente no jogo no lugar de {sairModal.playerName}.
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Substituto do banco */}
              {sairModal.teamName !== "bench" && (
                <>
                  {!substituirPorConvidado && substitutosDisponiveis.length > 0 && (
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:t.textSec,textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>Substituir por (opcional)</div>
                      <select
                        value={sairSubstitutoId}
                        onChange={e=>setSairSubstitutoId(e.target.value)}
                        style={{...S.select,fontSize:13}}
                      >
                        <option value="">— Nenhum (sai sem substituto) —</option>
                        {substitutosDisponiveis.map(b=>(
                          <option key={b.id} value={b.id}>{getPlayerName(b)}{b.goleiro ? " 🧤" : ""}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!substituirPorConvidado && substitutosDisponiveis.length === 0 && (
                    <div style={{fontSize:12,color:t.textSec,marginBottom:16,background:t.inputBg,padding:"8px 12px",borderRadius:8}}>Banco vazio — o time jogará com um a menos.</div>
                  )}
                </>
              )}

              {/* Ações */}
              <div style={{display:"flex",gap:8}}>
                <button
                  onClick={handleSairJogo}
                  style={{...S.btn(sairMotivo==="lesao" ? "#E24B4A" : "#BA7517"),flex:1,justifyContent:"center"}}
                >
                  {sairMotivo==="lesao" ? "🤕 Confirmar Saída (Lesão)" : "⏸️ Confirmar Saída"}
                </button>
                <button
                  onClick={()=>{setSairModal(null);setSairComConvidado(false);setSubstituirPorConvidado(false);}}
                  style={{...S.btn(t.card,t.textSec),border:`1px solid ${t.cardBorder}`,justifyContent:"center"}}
                >Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {editMatchId !== null && peladaState?.matchLog[editMatchId] && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:350,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:15,color:t.text,marginBottom:12,textAlign:"center"}}>Editar Partida & Súmula</div>
            
            {/* Placar */}
            <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",marginBottom:16}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:11,fontWeight:650,color:t.textSec,marginBottom:4}}>{peladaState.matchLog[editMatchId].teamA}</div>
                <input 
                  type="number" 
                  min={0} 
                  value={editScoreA} 
                  onChange={e=>setEditScoreA(e.target.value)} 
                  style={{...S.input,width:60,textAlign:"center",fontSize:18,fontWeight:800}}
                />
              </div>
              <span style={{fontWeight:700,color:t.textSec,fontSize:20,marginTop:16}}>×</span>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:11,fontWeight:650,color:t.textSec,marginBottom:4}}>{peladaState.matchLog[editMatchId].teamB}</div>
                <input 
                  type="number" 
                  min={0} 
                  value={editScoreB} 
                  onChange={e=>setEditScoreB(e.target.value)} 
                  style={{...S.input,width:60,textAlign:"center",fontSize:18,fontWeight:800}}
                />
              </div>
            </div>

            {/* Marcadores de Gols */}
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
              {/* Marcadores Time A */}
              <div style={{borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:10}}>
                <div style={{fontWeight:700,color:colorOfTeam(peladaState.matchLog[editMatchId].teamA),fontSize:12,marginBottom:6}}>{peladaState.matchLog[editMatchId].teamA} (Marcadores)</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {(peladaState.matchLog[editMatchId].playersA || []).map(p => (
                    <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12}}>
                      <span style={{color:t.text}}>{getPlayerName(p)}</span>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <input 
                          type="number" 
                          min={0} 
                          placeholder="0"
                          value={editSumula[p.id] || ""} 
                          onChange={e => updateEditSumulaAndScore(p.id, e.target.value, 'A')}
                          style={{...S.input,width:40,padding:"3px 6px",fontSize:11,textAlign:"center"}}
                        />
                        <span>⚽</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marcadores Time B */}
              <div>
                <div style={{fontWeight:700,color:colorOfTeam(peladaState.matchLog[editMatchId].teamB),fontSize:12,marginBottom:6}}>{peladaState.matchLog[editMatchId].teamB} (Marcadores)</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {(peladaState.matchLog[editMatchId].playersB || []).map(p => (
                    <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12}}>
                      <span style={{color:t.text}}>{getPlayerName(p)}</span>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <input 
                          type="number" 
                          min={0} 
                          placeholder="0"
                          value={editSumula[p.id] || ""} 
                          onChange={e => updateEditSumulaAndScore(p.id, e.target.value, 'B')}
                          style={{...S.input,width:40,padding:"3px 6px",fontSize:11,textAlign:"center"}}
                        />
                        <span>⚽</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Goleiros das Equipes */}
            <div style={{borderTop:`1px solid ${t.cardBorder}`,paddingTop:10,marginBottom:16,display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontWeight:700,fontSize:12,color:t.text}}>🧤 Goleiros da Partida</div>
              
              {/* Goleiro Time A */}
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <div style={{fontSize:11,fontWeight:600,color:colorOfTeam(peladaState.matchLog[editMatchId].teamA)}}>{peladaState.matchLog[editMatchId].teamA}:</div>
                <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"space-between"}}>
                  <select 
                    value={editGoleiroA} 
                    onChange={e => setEditGoleiroA(e.target.value)}
                    style={{...S.select,padding:"3px 6px",fontSize:11,width:"60%"}}
                  >
                    <option value="">Nenhum</option>
                    {(peladaState.matchLog[editMatchId].playersA || []).map(p => (
                      <option key={p.id} value={p.id}>{getPlayerName(p)}</option>
                    ))}
                  </select>
                  <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:t.textSec,cursor:"pointer"}}>
                    <input 
                      type="checkbox" 
                      checked={editGoleiroAInteiro} 
                      onChange={e => setEditGoleiroAInteiro(e.target.checked)}
                      style={{width:12,height:12,margin:0}}
                    />
                    Todo o jogo
                  </label>
                </div>
              </div>

              {/* Goleiro Time B */}
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <div style={{fontSize:11,fontWeight:600,color:colorOfTeam(peladaState.matchLog[editMatchId].teamB)}}>{peladaState.matchLog[editMatchId].teamB}:</div>
                <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"space-between"}}>
                  <select 
                    value={editGoleiroB} 
                    onChange={e => setEditGoleiroB(e.target.value)}
                    style={{...S.select,padding:"3px 6px",fontSize:11,width:"60%"}}
                  >
                    <option value="">Nenhum</option>
                    {(peladaState.matchLog[editMatchId].playersB || []).map(p => (
                      <option key={p.id} value={p.id}>{getPlayerName(p)}</option>
                    ))}
                  </select>
                  <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:t.textSec,cursor:"pointer"}}>
                    <input 
                      type="checkbox" 
                      checked={editGoleiroBInteiro} 
                      onChange={e => setEditGoleiroBInteiro(e.target.checked)}
                      style={{width:12,height:12,margin:0}}
                    />
                    Todo o jogo
                  </label>
                </div>
              </div>
            </div>

            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={saveEditedMatch} style={{...S.btn("#1D9E75"),flex:1,justifyContent:"center"}}>✓ Salvar</button>
              <button onClick={()=>setEditMatchId(null)} style={{...S.btn(t.card,t.textSec),flex:1,justifyContent:"center",border:`1px solid ${t.cardBorder}`}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalConfirmacaoNavegacao && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:400,textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:12}}>⚠️</div>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:8}}>Alterações Não Salvas!</div>
            <p style={{fontSize:13,color:t.textSec,marginBottom:20}}>Você tem modificações na lista de atletas vinculados desta rodada. Deseja salvar antes de prosseguir?</p>
            
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button 
                onClick={async () => {
                  if (triggerSaveRef.current) {
                    await triggerSaveRef.current();
                  }
                  setHasUnsavedChangesAtletas(false);
                  const dest = modalConfirmacaoNavegacao;
                  setModalConfirmacaoNavegacao(null);
                  executarNavegacaoDestino(dest);
                }} 
                style={S.btn("#1D9E75")}
              >
                💾 Salvar e Continuar
              </button>
              <button 
                onClick={() => {
                  setHasUnsavedChangesAtletas(false);
                  const dest = modalConfirmacaoNavegacao;
                  setModalConfirmacaoNavegacao(null);
                  executarNavegacaoDestino(dest);
                }} 
                style={S.btn("#E24B4A")}
              >
                🗑️ Descartar Alterações
              </button>
              <button 
                onClick={() => setModalConfirmacaoNavegacao(null)} 
                style={S.btn(t.card, t.textSec)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ─────────────────────────── ABA COLABORADORES ITEM ───────────────── */
function AbaColaboradoresItem({ collaborators, onSaveCollaborators, auth, managers, assegurarManagerColaborador, t, scope = "campeonato" }) {
  const S = makeStyles(t);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleAdicionar = (e) => {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) {
      alert("Por favor, preencha o nome e o e-mail do colaborador.");
      return;
    }
    const trimmedEmail = email.toLowerCase().trim();
    if (trimmedEmail === "lucas7s7@gmail.com") {
      alert("Não é possível adicionar o e-mail do administrador padrão como colaborador.");
      return;
    }
    if (collaborators.some(c => String(c.email || "").toLowerCase().trim() === trimmedEmail)) {
      alert("Este colaborador já está cadastrado nesta modalidade.");
      return;
    }

    // Busca se esse colaborador já existe no managers global para ver se precisamos de senha
    const globalManager = (managers || []).find(m => String(m.email || "").toLowerCase().trim() === trimmedEmail);
    if (!globalManager && !senha.trim()) {
      alert("Este é um novo colaborador no sistema. Por favor, forneça uma senha de acesso para ele.");
      return;
    }

    // Cria/assegura no managers global
    const senhaFinal = senha.trim() || (globalManager ? globalManager.password : "");
    assegurarManagerColaborador(nome.trim(), trimmedEmail, senhaFinal, scope);

    // Salva na modalidade local
    const novo = { id: Date.now(), name: nome.trim(), email: trimmedEmail };
    const novaLista = [...collaborators, novo];
    onSaveCollaborators(novaLista);

    // Limpa os campos
    setNome("");
    setEmail("");
    setSenha("");
    alert("Colaborador cadastrado com sucesso!");
  };

  const handleRemover = (id) => {
    if (confirm("Tem certeza que deseja remover o acesso deste colaborador?")) {
      const novaLista = collaborators.filter(c => c.id !== id);
      onSaveCollaborators(novaLista);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={S.card}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px 0", color: t.text }}>➕ Cadastrar Colaborador</h3>
        <p style={{ fontSize: 12, color: t.textSec, marginBottom: 12 }}>
          Cadastre um colaborador para ajudar na gestão desta modalidade. Se o e-mail já possuir cadastro no sistema, ele usará a mesma conta para acumular os acessos.
        </p>
        <form onSubmit={handleAdicionar} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={S.label}>Nome Completo:</label>
            <input 
              type="text" 
              placeholder="Ex: João Silva" 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
              style={S.input} 
              required
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={S.label}>E-mail de Acesso:</label>
            <input 
              type="email" 
              placeholder="Ex: joao@email.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              style={S.input} 
              required
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={S.label}>Senha de Acesso:</label>
            <input 
              type="password" 
              placeholder="Senha (deixe em branco se o colaborador já possui conta)" 
              value={senha} 
              onChange={e => setSenha(e.target.value)} 
              style={S.input} 
            />
            <span style={{ fontSize: 10, color: t.textSec }}>
              * Se o e-mail já for de um usuário cadastrado no sistema, ele poderá fazer login com a senha atual dele.
            </span>
          </div>
          <button type="submit" style={{ ...S.btn("#1D9E75"), marginTop: 6, justifyContent: "center" }}>
            ✓ Adicionar Colaborador
          </button>
        </form>
      </div>

      <div style={S.card}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px 0", color: t.text }}>👥 Colaboradores Cadastrados ({collaborators.length})</h3>
        {collaborators.length === 0 ? (
          <p style={{ fontSize: 13, color: t.textSec, textAlign: "center", margin: "20px 0" }}>Nenhum colaborador cadastrado para esta modalidade.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {collaborators.map(colab => (
              <div key={colab.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: `1px solid ${t.cardBorder}`, borderRadius: 8, background: t.inputBg }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: t.text }}>{colab.name}</span>
                  <span style={{ fontSize: 11, color: t.textSec }}>{colab.email}</span>
                </div>
                <button 
                  onClick={() => handleRemover(colab.id)} 
                  style={{ ...S.btnSm("#E24B4A22", "#E24B4A"), padding: "6px 10px" }}
                  title="Remover Acesso"
                >
                  🗑️ Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/* ─────────────────────────── MURAL ORGANIZADOR ───────────────────── */
function AbaMuralOrganizador({ c, onUpdate, t }) {
  const S = makeStyles(t);
  const mural = (c.mural || []).filter(item => item.type === "noticia");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("noticia");
  const [mediaUrl, setMediaUrl] = useState("");
  const [showAddPost, setShowAddPost] = useState(false);

  // Estados para Edição de Publicação
  const [editingPostId, setEditingPostId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState("noticia");
  const [editMediaUrl, setEditMediaUrl] = useState("");

  const handleStartEdit = (post) => {
    setEditingPostId(post.id);
    setEditTitle(post.title || "");
    setEditContent(post.content || "");
    setEditType(post.type || "noticia");
    setEditMediaUrl(post.mediaUrl || "");
  };

  const handleSaveEdit = (id) => {
    try {
      if (!editTitle.trim() || !editContent.trim()) {
        alert("Por favor, preencha o título e o conteúdo.");
        return;
      }
      const tc = deepClone(c);
      tc.mural = (tc.mural || []).map(post => {
        if (post.id === id) {
          return {
            ...post,
            title: editTitle.trim(),
            content: editContent.trim(),
            type: editType,
            mediaUrl: editMediaUrl.trim()
          };
        }
        return post;
      });
      onUpdate(tc);
      setEditingPostId(null);
      alert("Publicação atualizada com sucesso!");
    } catch (err) {
      console.error("Erro fatal ao editar post do mural:", err);
      alert("Ocorreu um erro ao salvar as alterações: " + err.message);
    }
  };

  const handleSavePost = () => {
    console.log("Iniciando handleSavePost...");
    try {
      if (!title.trim() || !content.trim()) {
        alert("Por favor, preencha o título e o conteúdo.");
        return;
      }
      console.log("Validações de título e conteúdo passaram com sucesso. Título:", title);
      const tc = deepClone(c);
      tc.mural = tc.mural || [];
      const newPost = {
        id: Date.now(),
        title: title.trim(),
        content: content.trim(),
        type,
        mediaUrl: mediaUrl.trim(),
        date: todayStr()
      };
      tc.mural.push(newPost);
      console.log("Novo post criado:", newPost);
      
      console.log("Chamando prop onUpdate...");
      onUpdate(tc);
      console.log("onUpdate executada com sucesso!");
      
      setTitle("");
      setContent("");
      setMediaUrl("");
      setShowAddPost(false);
      alert("Publicado no mural!");
    } catch (err) {
      console.error("Erro fatal ao salvar post no mural:", err);
      alert("Ocorreu um erro ao salvar o post: " + err.message);
    }
  };

  const handleDeletePost = (id) => {
    console.log("Iniciando handleDeletePost para o ID:", id);
    try {
      if (!window.confirm("Deseja excluir esta publicação?")) return;
      const tc = deepClone(c);
      tc.mural = (tc.mural || []).filter(item => item.id !== id);
      console.log("Lista filtrada de mural após exclusão do post:", tc.mural);
      
      console.log("Chamando prop onUpdate...");
      onUpdate(tc);
      console.log("onUpdate executada com sucesso!");
      
      alert("Publicação excluída.");
    } catch (err) {
      console.error("Erro fatal ao excluir post do mural:", err);
      alert("Ocorreu um erro ao excluir o post: " + err.message);
    }
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...S.card, borderColor: "#378ADD55", background: t.inputBg }}>
        <button 
          onClick={() => setShowAddPost(!showAddPost)}
          style={{
            background: "none",
            border: "none",
            color: "#378ADD",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
            width: "100%",
            textAlign: "left"
          }}
        >
          {showAddPost ? "▼ Fechar Novo Post" : "📣 Publicar no Mural (Notícias/Fotos/Vídeos)"}
        </button>

        {showAddPost && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={S.label}>Tipo de Publicação</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={()=>setType("noticia")} style={{ ...S.btnSm(type === "noticia" ? "#378ADD" : "transparent", type === "noticia" ? "#fff" : t.textSec), border: `1px solid ${type === "noticia" ? "#378ADD" : t.cardBorder}`, flex: 1 }}>📢 Notícia / Comunicado</button>
                <button onClick={()=>setType("midia")} style={{ ...S.btnSm(type === "midia" ? "#1D9E75" : "transparent", type === "midia" ? "#fff" : t.textSec), border: `1px solid ${type === "midia" ? "#1D9E75" : t.cardBorder}`, flex: 1 }}>🎬 Foto / Vídeo / Youtube</button>
              </div>
            </div>

            <div>
              <label style={S.label}>Título</label>
              <input style={S.input} placeholder="Título do post" value={title} onChange={e=>setTitle(e.target.value)} />
            </div>

            <div>
              <label style={S.label}>Conteúdo</label>
              <textarea style={{ ...S.input, height: 100, resize: "vertical" }} placeholder="Conteúdo..." value={content} onChange={e=>setContent(e.target.value)} />
            </div>

            <div>
              <label style={S.label}>
                {type === "noticia" ? "Link da Imagem de Capa (Opcional)" : "Link da Mídia (YouTube, imagem, etc.)"}
              </label>
              <input style={S.input} placeholder="https://..." value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} />
            </div>

            <button onClick={handleSavePost} style={S.btn(type === "noticia" ? "#378ADD" : "#1D9E75")}>🚀 Publicar</button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Estilos CSS do Mural Editorial inseridos dinamicamente */}
        <style>{`
          .mural-card {
            background: ${t.card};
            border-radius: 20px;
            border: 1px solid ${t.cardBorder};
            padding: 22px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
            position: relative;
          }
          .mural-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.07);
            border-color: #378ADD55;
          }
          .mural-layout {
            display: flex;
            flex-direction: row;
            gap: 20px;
            align-items: stretch;
          }
          @media (max-width: 600px) {
            .mural-layout {
              flex-direction: column;
            }
          }
          .mural-img-container {
            width: 260px;
            height: 175px;
            border-radius: 14px;
            overflow: hidden;
            position: relative;
            flex-shrink: 0;
            border: 1px solid ${t.cardBorder};
            background: #00000008;
          }
          @media (max-width: 600px) {
            .mural-img-container {
              width: 100%;
              height: 200px;
            }
          }
          .mural-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            display: block;
          }
          .mural-card:hover .mural-img {
            transform: scale(1.05);
          }
          .mural-video-container {
            width: 260px;
            height: 175px;
            border-radius: 14px;
            overflow: hidden;
            position: relative;
            flex-shrink: 0;
            border: 1px solid ${t.cardBorder};
          }
          @media (max-width: 600px) {
            .mural-video-container {
              width: 100%;
              height: 0;
              padding-bottom: 56.25%;
            }
          }
          .mural-content {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            flex-grow: 1;
            gap: 8px;
          }
          .mural-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .mural-badge {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 3px 10px;
            border-radius: 8px;
            letter-spacing: 0.5px;
          }
          .mural-title {
            font-size: 18px;
            font-weight: 850;
            color: ${t.text};
            margin: 0;
            line-height: 1.3;
            letter-spacing: -0.3px;
          }
          .mural-text {
            font-size: 13.5px;
            color: ${t.textSec};
            line-height: 1.6;
            white-space: pre-wrap;
            margin: 0;
          }
          .mural-link {
            font-size: 12px;
            color: #378ADD;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            font-weight: 700;
            margin-top: auto;
            padding-top: 8px;
          }
          .mural-link:hover {
            color: #1D9E75;
          }
        `}</style>

        {mural.length === 0 ? (
          <div style={{ ...S.card, textAlign: "center", padding: 24, color: t.textSec }}>
            Nenhuma publicação no mural.
          </div>
        ) : (
          [...mural].reverse().map((item, idx) => (
            <MuralPostCard 
              key={item.id || idx}
              item={item}
              isAdmin={true}
              onStartEdit={handleStartEdit}
              onDelete={handleDeletePost}
              t={t}
              editingPostId={editingPostId}
              setEditingPostId={setEditingPostId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editContent={editContent}
              setEditContent={setEditContent}
              editType={editType}
              setEditType={setEditType}
              editMediaUrl={editMediaUrl}
              setEditMediaUrl={setEditMediaUrl}
              onSaveEdit={handleSaveEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}

const getCampeonatoMatchesLinear = (c) => {
  const list = [];
  if (c.groups) {
    c.groups.forEach((g, gi) => {
      if (g.rounds) {
        g.rounds.forEach((r, ri) => {
          if (r.matches) {
            r.matches.forEach((m, mi) => {
              list.push({ ...m, key: `gr-${gi}-${ri}-${mi}`, originalMatch: m });
            });
          }
        });
      }
    });
  }
  if (c.rounds) {
    c.rounds.forEach((r, ri) => {
      if (r.matches) {
        r.matches.forEach((m, mi) => {
          list.push({ ...m, key: `rr-${ri}-${mi}`, originalMatch: m });
        });
      }
    });
  }
  if (c.knockout) {
    c.knockout.forEach((ph, pi) => {
      if (ph.matches) {
        ph.matches.forEach((m, mi) => {
          list.push({ ...m, key: `ko-${pi}-${mi}`, originalMatch: m });
        });
      }
    });
  }
  return list;
};

const getSuspendedPlayersForMatch = (c, targetKey) => {
  const matches = getCampeonatoMatchesLinear(c);
  const targetIndex = matches.findIndex(m => m.key === targetKey);
  if (targetIndex === -1) return {};
  const playerStats = {};
  const prevMatches = matches.slice(0, targetIndex);
  prevMatches.forEach(m => {
    Object.keys(playerStats).forEach(aid => {
      const stats = playerStats[aid];
      if (stats.suspensoProximoJogo) {
        if (stats.motivoSuspensao === "amarelos") {
          stats.amarelosAcumulados = 0;
        }
        stats.suspensoProximoJogo = false;
        stats.motivoSuspensao = "";
      }
    });
    const events = m.events || [];
    const athleteEvents = {};
    events.forEach(e => {
      if (!athleteEvents[e.atletaId]) athleteEvents[e.atletaId] = [];
      athleteEvents[e.atletaId].push(e.type);
    });
    Object.keys(athleteEvents).forEach(aid => {
      const types = athleteEvents[aid];
      const yellows = types.filter(t => t === "amarelo").length;
      const reds = types.filter(t => t === "vermelho").length;
      if (!playerStats[aid]) {
        playerStats[aid] = { amarelosAcumulados: 0, suspensoProximoJogo: false, motivoSuspensao: "" };
      }
      const stats = playerStats[aid];
      if (reds > 0 || yellows >= 2) {
        stats.suspensoProximoJogo = true;
        stats.motivoSuspensao = "vermelho";
      } else if (yellows === 1) {
        stats.amarelosAcumulados++;
        if (stats.amarelosAcumulados >= 3) {
          stats.suspensoProximoJogo = true;
          stats.motivoSuspensao = "amarelos";
        }
      }
    });
  });
  const suspended = {};
  Object.keys(playerStats).forEach(aid => {
    const stats = playerStats[aid];
    if (stats.suspensoProximoJogo) {
      suspended[aid] = stats.motivoSuspensao === "vermelho" ? "Vermelho 🟥" : "3 Amarelos 🟨";
    }
  });
  return suspended;
};

/* ─────────────────────────── CAMPEONATO ─────────────────────────── */
function CampeonatoScreen({champ,atletas,onUpdate,onDelete,onBack,setFinanceiro,onAddAtleta,onUpdateAtleta,cloudLoading,publicarNaNuvem,t,tab,setTab,isMobile,auth,managers,assegurarManagerColaborador}){
  const S=makeStyles(t);
  const c = champ;
  const atletasDoCampeonato = atletas.filter(a => Array.isArray(a.vinculos) && a.vinculos.includes("campeonato_" + c.id));
  const isDonoOuAdmin = auth?.role === "adm" || !c.manager_id || c.manager_id === auth?.manager_id;
  const champTabs = [
    "elencos",
    ...(c.type === "pontos" ? ["tabela", "jogos"] : c.type === "mata" ? ["chave", "jogos"] : ["tabela", "chave", "jogos"]),
    "estatísticas"
  ];
  if (c.allowOnlineReg) {
    champTabs.push("solicitações");
  }
  if (isDonoOuAdmin) {
    champTabs.push("colaboradores");
  }
  champTabs.push("mural", "galeria", "configurações", "nuvem");
  const rosters = c.rosters || {};
  const colorOf = (n,teams) => COLORS[(teams||[]).indexOf(n)%COLORS.length];
  const getRosterByTeamName = (teamName) => {
    if (!teamName || !rosters) return [];
    if (rosters[teamName] && rosters[teamName].length > 0) {
      return rosters[teamName];
    }
    const key = Object.keys(rosters).find(k => k.trim().toLowerCase() === teamName.trim().toLowerCase());
    if (key && rosters[key] && rosters[key].length > 0) {
      return rosters[key];
    }
    return [];
  };
  const [editingTeams,setEditingTeams] = useState(false);
  const [teamsDraft,setTeamsDraft] = useState(Array.isArray(champ.teams)?[...champ.teams]:[]);
  const [localTab, setLocalTab] = useState("jogos");
  const currentTab = tab || localTab;
  const currentSetTab = setTab || setLocalTab;
  const[editing,setEditing]=useState(null);
  const[sumulaModal,setSumulaModal]=useState(null); // {match, eKey, onSaveSumula, home, away}
  const[sumulaSelection,setSumulaSelection]=useState({home:"",away:""});
  const[selTeamElenco,setSelTeamElenco]=useState(champ.teams[0]||"");
  const [showCelebration, setShowCelebration] = useState(false);

  // ── Função para salvar fotos de uma partida específica ────────
  const saveMatchPhoto = (eKey, photoBase64) => {
    try {
      const tc = deepClone(c);
      // Helper para atualizar um match em qualquer estrutura
      const addPhoto = (matches) => matches.map(m => {
        const key = `${m.home}-${m.away}`;
        if (eKey.includes(key) || m._eKey === eKey) {
          return { ...m, photos: [...(m.photos || []), { id: Date.now(), data: photoBase64, date: todayStr() }] };
        }
        return m;
      });
      // Identificar o match pelo eKey e atualizar
      if (eKey.startsWith('rr-') && tc.rounds) {
        const parts = eKey.replace('rr-','').split('-');
        const ri = Number(parts[0]), mi = Number(parts[1]);
        if (tc.rounds[ri] && tc.rounds[ri].matches[mi]) {
          const m = tc.rounds[ri].matches[mi];
          tc.rounds[ri].matches[mi] = { ...m, photos: [...(m.photos||[]), { id: Date.now(), data: photoBase64, date: todayStr() }] };
        }
      } else if (eKey.startsWith('ko-') && tc.knockout) {
        const parts = eKey.replace('ko-','').split('-');
        const pi = Number(parts[0]), mi = Number(parts[1]);
        if (tc.knockout[pi] && tc.knockout[pi].matches[mi]) {
          const m = tc.knockout[pi].matches[mi];
          tc.knockout[pi].matches[mi] = { ...m, photos: [...(m.photos||[]), { id: Date.now(), data: photoBase64, date: todayStr() }] };
        }
      } else if (eKey.startsWith('gr-') && tc.groups) {
        const parts = eKey.replace('gr-','').split('-');
        const gi = Number(parts[0]), ri = Number(parts[1]), mi = Number(parts[2]);
        if (tc.groups[gi] && tc.groups[gi].rounds[ri] && tc.groups[gi].rounds[ri].matches[mi]) {
          const m = tc.groups[gi].rounds[ri].matches[mi];
          tc.groups[gi].rounds[ri].matches[mi] = { ...m, photos: [...(m.photos||[]), { id: Date.now(), data: photoBase64, date: todayStr() }] };
        }
      }
      onUpdate(tc);
    } catch(err) { console.error('Erro ao salvar foto da partida:', err); }
  };

  const removeMatchPhoto = (eKey, photoId) => {
    try {
      const tc = deepClone(c);
      const removePhoto = (m) => ({ ...m, photos: (m.photos||[]).filter(p => p.id !== photoId) });
      if (eKey.startsWith('rr-') && tc.rounds) {
        const parts = eKey.replace('rr-','').split('-');
        const ri = Number(parts[0]), mi = Number(parts[1]);
        if (tc.rounds[ri]?.matches[mi]) tc.rounds[ri].matches[mi] = removePhoto(tc.rounds[ri].matches[mi]);
      } else if (eKey.startsWith('ko-') && tc.knockout) {
        const parts = eKey.replace('ko-','').split('-');
        const pi = Number(parts[0]), mi = Number(parts[1]);
        if (tc.knockout[pi]?.matches[mi]) tc.knockout[pi].matches[mi] = removePhoto(tc.knockout[pi].matches[mi]);
      } else if (eKey.startsWith('gr-') && tc.groups) {
        const parts = eKey.replace('gr-','').split('-');
        const gi = Number(parts[0]), ri = Number(parts[1]), mi = Number(parts[2]);
        if (tc.groups[gi]?.rounds[ri]?.matches[mi]) tc.groups[gi].rounds[ri].matches[mi] = removePhoto(tc.groups[gi].rounds[ri].matches[mi]);
      }
      onUpdate(tc);
    } catch(err) { console.error('Erro ao remover foto:', err); }
  };

  const [filtroElenco, setFiltroElenco] = useState("");
  const [filtroGrupoElenco, setFiltroGrupoElenco] = useState("");
  const [modalNovoAtleta, setModalNovoAtleta] = useState(false);
  const [editAtletaId, setEditAtletaId] = useState(null);
  const [formAtleta, setFormAtleta] = useState({
    nome: "",
    apelido: "",
    foto: "",
    habilidade: 3,
    goleiro: false,
    ativo: true,
    documento: "",
    dataNascimento: "",
    numeroCamisa: "",
    modalidades: [],
    vinculos: [],
    customFields: {}
  });

  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [quickTeamName, setQuickTeamName] = useState("");
  const [quickPlayersText, setQuickPlayersText] = useState("");
  const [showXlsMenuElenco, setShowXlsMenuElenco] = useState(false);

  // --- XLS Elenco: Modelo, Import, Export ---
  const ELENCO_HEADERS = ["nome","apelido","numeroCamisa","documento","dataNascimento","celular1","email","tipoAtleta","igrejaMembro","modalidades","time","logradouro","nomeVia","bairro","cep","nomeMae","ativo","goleiro"];

  const downloadModeloElenco = () => {
    const sample = {
      nome: "João da Silva", apelido: "Joãozinho", numeroCamisa: "10",
      documento: "12.345.678-9", dataNascimento: "1995-06-15", celular1: "(11) 91234-5678",
      email: "joao@email.com", tipoAtleta: "Adventista", igrejaMembro: "Igreja Central",
      modalidades: "Futsal,Vôlei",
      time: "Time A", logradouro: "Rua", nomeVia: "das Flores", bairro: "Centro",
      cep: "01234-567", nomeMae: "Maria da Silva", ativo: "true", goleiro: "false"
    };
    downloadXls(`modelo-atletas-campeonato.xls`, ELENCO_HEADERS, [sample]);
  };

  const exportarElenco = () => {
    const allRosteredIds = Object.values(c.rosters || {}).flat();
    const atletasCamp = atletas.filter(a => allRosteredIds.includes(a.id));
    if (atletasCamp.length === 0) { alert("Nenhum atleta escalado para exportar."); return; }
    const rows = atletasCamp.map(a => {
      const obj = {};
      ELENCO_HEADERS.forEach(h => {
        if (h === "modalidades" && Array.isArray(a[h])) {
          obj[h] = a[h].join(",");
        } else if (h === "time") {
          obj[h] = a.grupo ?? "";
        } else {
          obj[h] = a[h] ?? "";
        }
      });
      return obj;
    });
    downloadXls(`elencos-${(c.name||"campeonato").replace(/\s+/g,"-")}-${todayStr()}.xls`, ELENCO_HEADERS, rows);
  };

  const importarElenco = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Suporta CSV (novo formato) e HTML-XLS (formato legado)
      let allRows;
      if (file.name.endsWith('.csv') || !text.trimStart().startsWith('<')) {
        // Parsing CSV
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
        allRows = lines.map(line => line.split(',').map(cell => cell.startsWith('"') && cell.endsWith('"') ? cell.slice(1,-1).replace(/""/g,'"') : cell));
      } else {
        // Parsing HTML-XLS legado
        const parser = new DOMParser();
        const doc2 = parser.parseFromString(text, "text/html");
        const table = doc2.querySelector("table");
        if (!table) throw new Error("Arquivo não contém tabela válida. Use o modelo CSV.");
        allRows = Array.from(table.querySelectorAll("tr")).map(row =>
          Array.from(row.querySelectorAll("th,td")).map(cell => cell.textContent || "")
        );
      }
      if (allRows.length < 2) throw new Error("A planilha de elenco não contém dados de atletas.");
      const headers = allRows[0].map(h => String(h).trim());
      const dataRows = allRows.slice(1).filter(r => r.some(cell => String(cell).trim() !== ""));

      let adicionados = 0;
      let atualizados = 0;
      const tc = deepClone(c);
      tc.rosters = tc.rosters || {};

      dataRows.forEach((cells, idx) => {
        const item = {};
        cells.forEach((value, i) => {
          const key = headers[i];
          if (key) {
            if (key === "time") {
              item.grupo = String(value).trim();
            } else {
              item[key] = String(value).trim();
            }
          }
        });

        if (!item.nome) return;

        const modsArray = item.modalidades ? item.modalidades.split(",").map(m => m.trim()).filter(Boolean) : [];

        const existingIdx = atletas.findIndex(a =>
          a.nome.toLowerCase() === item.nome.toLowerCase() ||
          (item.apelido && a.apelido && a.apelido.toLowerCase() === item.apelido.toLowerCase())
        );

        let atletaId;
        if (existingIdx >= 0) {
          atletaId = atletas[existingIdx].id;
          const aExistente = atletas[existingIdx];
          const vinculos = Array.isArray(aExistente.vinculos) ? [...aExistente.vinculos] : [];
          if (!vinculos.includes("campeonato_" + c.id)) {
            vinculos.push("campeonato_" + c.id);
          }
          onUpdateAtleta(atletaId, {
            ...aExistente,
            ...item,
            vinculos,
            modalidades: modsArray,
            ativo: item.ativo !== "false",
            goleiro: item.goleiro === "true",
          });
          atualizados++;
        } else {
          atletaId = Date.now() + Math.floor(Math.random() * 100000) + idx;
          onAddAtleta({
            id: atletaId,
            ...item,
            vinculos: ["campeonato_" + c.id],
            modalidades: modsArray,
            ativo: item.ativo !== "false",
            goleiro: item.goleiro === "true",
            habilidade: 3,
            foto: "",
            docFoto: "",
            customFields: {},
          });
          adicionados++;
        }

        // Escalar no time selecionado ou no time vindo da planilha
        const timePlanilha = item.grupo || "";
        const timeFinal = selTeamElenco || timePlanilha;
        if (timeFinal) {
          tc.rosters[timeFinal] = tc.rosters[timeFinal] || [];
          if (!tc.rosters[timeFinal].includes(atletaId)) {
            tc.rosters[timeFinal].push(atletaId);
          }
        }
      });

      onUpdate(tc);
      alert(`Importação concluída! ${adicionados} atletas adicionados, ${atualizados} atualizados.`);
    } catch (err) {
      alert("Erro ao importar planilha: " + (err.message || err));
    } finally {
      if (event.target) event.target.value = "";
      setShowXlsMenuElenco(false);
    }
  };

  const renderPrintableSumula = () => {
    if (!sumulaModal) return null;
    const m = sumulaModal.m;
    const tmHome = m.home;
    const tmAway = m.away;
    const rosterHome = getRosterByTeamName(tmHome);
    const rosterAway = getRosterByTeamName(tmAway);

    const maxLength = Math.max(15, rosterHome.length, rosterAway.length);
    const rows = Array.from({ length: maxLength });

    return (
      <div id="printable-sumula" style={{ display: "none" }}>
        <style>{`
          @media print {
            #printable-sumula {
              display: block !important;
              font-family: Arial, sans-serif;
              color: #000;
              background: #fff;
              padding: 10px;
              width: 100%;
              box-sizing: border-box;
            }
            body * {
              visibility: hidden;
            }
            #printable-sumula, #printable-sumula * {
              visibility: visible;
            }
            #printable-sumula {
              position: absolute;
              left: 0;
              top: 0;
            }
          }
          .sumula-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 11px;
          }
          .sumula-table th, .sumula-table td {
            border: 1px solid #000;
            padding: 5px;
            text-align: left;
          }
          .sumula-table th {
            background-color: #f2f2f2 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        `}</style>

        {/* Cabeçalho */}
        <div style={{ border: "2px solid #000", padding: "10px", borderRadius: "8px", marginBottom: "15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: "20px", margin: 0, fontWeight: "bold", letterSpacing: "1px" }}>🏆 THORNEIOS</h1>
              <div style={{ fontSize: "12px", marginTop: "2px", fontWeight: "bold" }}>SÚMULA OFICIAL DE PARTIDA</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", fontWeight: "bold" }}>🏆 {c.name.toUpperCase()}</div>
              <div style={{ fontSize: "11px", color: "#333", marginTop: "2px" }}>Futebol Manager</div>
            </div>
          </div>

          <hr style={{ border: "0", borderTop: "1px solid #000", margin: "10px 0" }} />

          {/* Placar e Confronto */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0" }}>
            <div style={{ flex: 1, fontSize: "16px", fontWeight: "bold", textAlign: "right", paddingRight: "15px" }}>{tmHome}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ border: "2px solid #000", width: "40px", height: "40px", fontSize: "24px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>{m.played ? m.homeScore : ""}</div>
              <span style={{ fontSize: "20px", fontWeight: "bold" }}>X</span>
              <div style={{ border: "2px solid #000", width: "40px", height: "40px", fontSize: "24px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>{m.played ? m.awayScore : ""}</div>
            </div>
            <div style={{ flex: 1, fontSize: "16px", fontWeight: "bold", paddingLeft: "15px" }}>{tmAway}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginTop: "10px", background: "#f9f9f9", padding: "5px", border: "1px solid #ccc" }}>
            <div><strong>RODADA:</strong> {m.round || sumulaModal.round || "—"}</div>
            <div><strong>DATA:</strong> {m.date ? fmtDate(m.date) : "___/___/_____"}</div>
            <div><strong>LOCAL:</strong> _________________________</div>
          </div>
        </div>

        {/* Tabelas de Elenco Lado a Lado */}
        <div style={{ display: "flex", gap: "15px" }}>
          {/* Mandante */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", paddingBottom: "4px", borderBottom: "2px solid #000" }}>⚽ {tmHome} (MANDANTE)</div>
            <table className="sumula-table">
              <thead>
                <tr>
                  <th style={{ width: "25px", textAlign: "center" }}>Nº</th>
                  <th>NOME DO ATLETA</th>
                  <th style={{ width: "50px", textAlign: "center" }}>GOLS</th>
                  <th style={{ width: "40px", textAlign: "center" }}>CART.</th>
                  <th style={{ width: "80px" }}>ASSINATURA</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((_, idx) => {
                  const aid = rosterHome[idx];
                  const a = aid ? atletas.find(x => String(x.id) === String(aid)) : null;
                  return (
                    <tr key={`h-${idx}`} style={{ height: "24px" }}>
                      <td style={{ textAlign: "center", fontWeight: "bold" }}>{a?.numeroCamisa || "—"}</td>
                      <td style={{ fontWeight: a ? "bold" : "normal", color: a ? "#000" : "#888" }}>
                        <span style={{ marginRight: 6, color: "#888", fontSize: "10px" }}>{String(idx + 1).padStart(2, '0')}.</span>
                        {a ? getPlayerName(a) : "...................................................................................................."}
                      </td>
                      <td style={{ textAlign: "center" }}></td>
                      <td style={{ textAlign: "center", fontSize: "9px" }}>🟨 🟥</td>
                      <td></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Visitante */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", paddingBottom: "4px", borderBottom: "2px solid #000" }}>⚽ {tmAway} (VISITANTE)</div>
            <table className="sumula-table">
              <thead>
                <tr>
                  <th style={{ width: "25px", textAlign: "center" }}>Nº</th>
                  <th>NOME DO ATLETA</th>
                  <th style={{ width: "50px", textAlign: "center" }}>GOLS</th>
                  <th style={{ width: "40px", textAlign: "center" }}>CART.</th>
                  <th style={{ width: "80px" }}>ASSINATURA</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((_, idx) => {
                  const aid = rosterAway[idx];
                  const a = aid ? atletas.find(x => String(x.id) === String(aid)) : null;
                  return (
                    <tr key={`a-${idx}`} style={{ height: "24px" }}>
                      <td style={{ textAlign: "center", fontWeight: "bold" }}>{a?.numeroCamisa || "—"}</td>
                      <td style={{ fontWeight: a ? "bold" : "normal", color: a ? "#000" : "#888" }}>
                        <span style={{ marginRight: 6, color: "#888", fontSize: "10px" }}>{String(idx + 1).padStart(2, '0')}.</span>
                        {a ? getPlayerName(a) : "...................................................................................................."}
                      </td>
                      <td style={{ textAlign: "center" }}></td>
                      <td style={{ textAlign: "center", fontSize: "9px" }}>🟨 🟥</td>
                      <td></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé e Observações */}
        <div style={{ marginTop: "15px", border: "1px solid #000", padding: "8px", borderRadius: "6px" }}>
          <div style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "4px" }}>✍️ OCORRÊNCIAS / OBSERVAÇÕES DA PARTIDA:</div>
          {m.observations && m.observations.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "10px" }}>
              {m.observations.map((obs, oIdx) => {
                const homeNames = (obs.homeAthletes || []).map(id => {
                  const at = atletas.find(x => String(x.id) === String(id));
                  return at ? (at.apelido || at.nome) : `Atleta #${id}`;
                });
                const awayNames = (obs.awayAthletes || []).map(id => {
                  const at = atletas.find(x => String(x.id) === String(id));
                  return at ? (at.apelido || at.nome) : `Atleta #${id}`;
                });
                const athletesStr = [];
                if (homeNames.length > 0) athletesStr.push(`${tmHome}: ${homeNames.join(", ")}`);
                if (awayNames.length > 0) athletesStr.push(`${tmAway}: ${awayNames.join(", ")}`);

                return (
                  <div key={obs.id} style={{ borderBottom: oIdx < m.observations.length - 1 ? "1px dashed #ccc" : "none", paddingBottom: "4px", marginBottom: "4px" }}>
                    <strong>[{obs.type.toUpperCase()}]</strong> {obs.text}
                    {athletesStr.length > 0 && (
                      <span style={{ fontSize: "9px", color: "#444", marginLeft: "6px" }}>
                        ({athletesStr.join(" | ")})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: "55px", border: "1px dashed #ccc" }}></div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", fontSize: "10px" }}>
          <div style={{ textAlign: "center", width: "30%" }}>
            <div style={{ borderTop: "1px solid #000", paddingTop: "5px" }}>ASSINATURA DO ÁRBITRO</div>
          </div>
          <div style={{ textAlign: "center", width: "30%" }}>
            <div style={{ borderTop: "1px solid #000", paddingTop: "5px", textTransform: "uppercase" }}>
              {m.homeRepresentative ? `REP.: ${m.homeRepresentative}` : "REPRESENTANTE MANDANTE"}
            </div>
          </div>
          <div style={{ textAlign: "center", width: "30%" }}>
            <div style={{ borderTop: "1px solid #000", paddingTop: "5px", textTransform: "uppercase" }}>
              {m.awayRepresentative ? `REP.: ${m.awayRepresentative}` : "REPRESENTANTE VISITANTE"}
            </div>
          </div>
        </div>
      </div>
    );
  };

    function abrirNovoAtletaCamp() {
    setEditAtletaId(null);
    setFormAtleta({
      nome: filtroElenco.trim(),
      apelido: "",
      foto: "",
      habilidade: 3,
      goleiro: false,
      ativo: true,
      documento: "", // RG
      dataNascimento: "",
      numeroCamisa: "",
      celular1: "",
      celular2: "",
      foneResidencial: "",
      email: "",
      tipoAtleta: "Adventista",
      igrejaMembro: "",
      modalidades: c.modalidade ? [c.modalidade] : [],
      logradouro: "Rua",
      nomeVia: "",
      cep: "",
      complemento: "",
      bairro: "",
      nomeMae: "",
      docFoto: "",
      vinculos: ["campeonato_" + c.id],
      customFields: {}
    });
    setModalNovoAtleta(true);
  }

  function abrirEditarAtletaCamp(a) {
    setEditAtletaId(a.id);
    setFormAtleta({
      nome: a.nome,
      apelido: a.apelido || "",
      foto: a.foto || "",
      habilidade: a.habilidade || 3,
      goleiro: a.goleiro || false,
      ativo: a.ativo !== false,
      documento: a.documento || "",
      dataNascimento: a.dataNascimento || "",
      numeroCamisa: a.numeroCamisa || "",
      celular1: a.celular1 || "",
      celular2: a.celular2 || "",
      foneResidencial: a.foneResidencial || "",
      email: a.email || "",
      tipoAtleta: a.tipoAtleta || "Adventista",
      igrejaMembro: a.igrejaMembro || "",
      modalidades: a.modalidades || [],
      logradouro: a.logradouro || "Rua",
      nomeVia: a.nomeVia || "",
      cep: a.cep || "",
      complemento: a.complemento || "",
      bairro: a.bairro || "",
      nomeMae: a.nomeMae || "",
      docFoto: a.docFoto || "",
      vinculos: Array.isArray(a.vinculos) ? a.vinculos : [],
      customFields: a.customFields || {}
    });
    setModalNovoAtleta(true);
  }

  function salvarNovoAtletaCamp() {
    if(!formAtleta.nome.trim()) return;
    
    if (editAtletaId) {
      if (onUpdateAtleta) {
        onUpdateAtleta(editAtletaId, formAtleta);
      }
      alert("Cadastro do atleta atualizado com sucesso!");
    } else {
      const novoId = Date.now();
      const novoAtleta = {
        id: novoId, 
        ...formAtleta,
        vinculos: ["campeonato_" + c.id]
      };
      onAddAtleta(novoAtleta);
      
      const tc = deepClone(c);
      tc.rosters = tc.rosters || {};
      tc.rosters[selTeamElenco] = [...(tc.rosters[selTeamElenco] || []), novoId];
      onUpdate(tc);
    }

    setModalNovoAtleta(false);
    setEditAtletaId(null);
    setFiltroElenco("");
  }

  function saveRR(ri, mi, hs, as2, dt, newHome, newAway, newRound) {
    const tc = deepClone(c);
    const m = tc.rounds[ri].matches[mi];
    m.homeScore = hs;
    m.awayScore = as2;
    m.played = hs !== "" && as2 !== "";
    if (dt) m.date = dt;
    if (!m.played) {
      if (newHome) m.home = newHome;
      if (newAway) m.away = newAway;
    }
    if (newRound !== undefined && Number(newRound) !== tc.rounds[ri].round) {
      tc.rounds[ri].matches.splice(mi, 1);
      const targetRound = tc.rounds.find(r => r.round === Number(newRound));
      if (targetRound) targetRound.matches.push(m);
    }
    tc.standings = recalcStandings(tc.teams, tc.rounds);
    onUpdate(tc);
    setEditing(null);
  }
  function saveGroup(gi, ri, mi, hs, as2, dt, newHome, newAway, newRound) {
    const tc = deepClone(c);
    const m = tc.groups[gi].rounds[ri].matches[mi];
    m.homeScore = hs;
    m.awayScore = as2;
    m.played = hs !== "" && as2 !== "";
    if (dt) m.date = dt;
    if (!m.played) {
      if (newHome) m.home = newHome;
      if (newAway) m.away = newAway;
    }
    if (newRound !== undefined && Number(newRound) !== tc.groups[gi].rounds[ri].round) {
      tc.groups[gi].rounds[ri].matches.splice(mi, 1);
      const targetRound = tc.groups[gi].rounds.find(r => r.round === Number(newRound));
      if (targetRound) targetRound.matches.push(m);
    }
    tc.groups[gi].standings = recalcStandings(tc.groups[gi].teams, tc.groups[gi].rounds);
    onUpdate(tc);
    setEditing(null);
  }
  function saveKO(pi, mi, hs, as2, dt, newHome, newAway) {
    if (hs !== "" && as2 !== "" && parseInt(hs) === parseInt(as2)) {
      alert("Sem empate no mata-mata!");
      return;
    }
    const tc = deepClone(c);
    const ph = tc.knockout[pi];
    const m = ph.matches[mi];
    m.homeScore = hs;
    m.awayScore = as2;
    m.played = hs !== "" && as2 !== "";
    if (m.played) {
      m.winner = parseInt(hs) > parseInt(as2) ? m.home : m.away;
    } else {
      m.winner = null;
    }
    if (dt) m.date = dt;
    if (!m.played) {
      if (newHome) m.home = newHome;
      if (newAway) m.away = newAway;
    }
    if (ph.matches.every(x => x.played)) {
      ph.advancers = ph.matches.map(x => x.winner);
      if (tc.knockout[pi + 1]) {
        const adv = ph.advancers;
        tc.knockout[pi + 1].matches = [];
        for (let i = 0; i < adv.length; i += 2) {
          if (adv[i + 1]) {
            tc.knockout[pi + 1].matches.push({
              home: adv[i],
              away: adv[i + 1],
              homeScore: "",
              awayScore: "",
              played: false,
              winner: null,
              date: ""
            });
          }
        }
      }
    }
    onUpdate(tc);
    setEditing(null);
  }
    function advanceMixed(){
    const tc=deepClone(c);
    const q=[];
    if (tc.type === "liga") {
      const numGroups = tc.groups.length;
      for (let i = 0; i < numGroups; i++) {
        const firstTeam = tc.groups[i].standings[0]?.name || null;
        const secondTeam = tc.groups[numGroups - 1 - i].standings[1]?.name || null;
        q.push(firstTeam);
        q.push(secondTeam);
      }
      tc.knockout=generateKO(q, true);
    } else {
      tc.groups.forEach(g=>{
        if(g.standings[0])q.push(g.standings[0].name);
        if(g.standings[1])q.push(g.standings[1].name);
      });
      tc.knockout=generateKO(q);
    }
    tc.mixedPhase="knockout";
    onUpdate(tc);
  }
  const lastPhase=c.knockout?.length>0?c.knockout[c.knockout.length-1]:null;
  const champion=(c.type==="mata"||((c.type==="misto"||c.type==="liga")&&c.mixedPhase==="knockout"))&&lastPhase?.matches?.[0]?.winner||(c.type==="pontos"&&c.rounds?.every(r=>r.matches.every(m=>m.played))&&c.standings?.[0]?.name)||null;
  const tabs = [
    "elencos",
    ...(c.type==="pontos"?["tabela","jogos"]:c.type==="mata"?["chave","jogos"]:["tabela","chave","jogos"]),
    "estatísticas"
  ];
  if (c.allowOnlineReg) {
    tabs.push("solicitações");
  }
  tabs.push("mural", "galeria");
  if (isDonoOuAdmin) {
    tabs.push("colaboradores");
  }
  tabs.push("configurações", "nuvem");

  const getArtilheiro = () => {
    const evts = [];
    if(c.rounds) c.rounds.forEach(r=>r.matches.forEach(m=>m.events?.forEach(e=>evts.push(e))));
    if(c.groups) c.groups.forEach(g=>g.rounds.forEach(r=>r.matches.forEach(m=>m.events?.forEach(e=>evts.push(e)))));
    if(c.knockout) c.knockout.forEach(p=>p.matches.forEach(m=>m.events?.forEach(e=>evts.push(e))));

    const stats = {};
    evts.forEach(e => {
       if(e.type==="gol") {
          if(!stats[e.atletaId]) stats[e.atletaId] = {gols:0, teamName: e.teamName};
          stats[e.atletaId].gols++;
       }
    });

    const arr = Object.keys(stats).map(aid => ({ atleta: atletas.find(x=>String(x.id)===String(aid)), ...stats[aid] })).filter(x=>x.atleta);
    const sorted = [...arr].sort((a,b)=>b.gols-a.gols);
    return sorted[0] || null;
  };
  const artilheiro = getArtilheiro();

  useEffect(() => {
    if (champion) {
      const key = `celeb_visto_${c.id}`;
      if (!localStorage.getItem(key)) {
        setShowCelebration(true);
        localStorage.setItem(key, "true");
      }
    }
  }, [champion, c.id]);

  function handleSaveSumula(m, events) {
     const tc=deepClone(c);
     
     let golsHome = events.filter(e => e.type === "gol" && e.teamName === m.home).length;
     let golsAway = events.filter(e => e.type === "gol" && e.teamName === m.away).length;
     const hs = String(golsHome);
     const as2 = String(golsAway);

     let found = false;

     // 1. Pontos Corridos
     if(tc.rounds) {
       for(let ri=0; ri<tc.rounds.length; ri++){ 
         const r = tc.rounds[ri];
         const mi = r.matches.findIndex(x=>x.home===m.home&&x.away===m.away); 
         if(mi > -1){ 
           const mr = r.matches[mi];
           mr.events = events; 
           mr.homeScore = hs;
           mr.awayScore = as2;
           mr.played = true;
           if (!mr.date) mr.date = todayStr();
           mr.homeRepresentative = m.homeRepresentative || "";
           mr.awayRepresentative = m.awayRepresentative || "";
           mr.observations = m.observations || [];
           tc.standings = recalcStandings(tc.teams, tc.rounds);
           found = true; 
           break; 
         } 
       }
     }

     // 2. Misto (Fase de Grupos)
     if(!found && tc.groups) {
       for(let gi=0; gi<tc.groups.length; gi++){ 
         const g = tc.groups[gi];
         for(let ri=0; ri<g.rounds.length; ri++){ 
           const r = g.rounds[ri];
           const mi = r.matches.findIndex(x=>x.home===m.home&&x.away===m.away); 
           if(mi > -1){ 
             const mr = r.matches[mi];
             mr.events = events; 
             mr.homeScore = hs;
             mr.awayScore = as2;
             mr.played = true;
             if (!mr.date) mr.date = todayStr();
             mr.homeRepresentative = m.homeRepresentative || "";
             mr.awayRepresentative = m.awayRepresentative || "";
             mr.observations = m.observations || [];
             g.standings = recalcStandings(g.teams, g.rounds);
             found = true; 
             break; 
           } 
         }
         if (found) break;
       }
     }

     // 3. Mata-Mata
     if(!found && tc.knockout) {
       for(let pi=0; pi<tc.knockout.length; pi++){ 
         const ph = tc.knockout[pi];
         const mi = ph.matches.findIndex(x=>x.home===m.home&&x.away===m.away); 
         if(mi > -1){ 
           if (parseInt(hs) === parseInt(as2)) {
             alert("Sem empate no mata-mata da súmula! Por favor, adicione o desempate/pênaltis na súmula.");
             return;
           }
           const mr = ph.matches[mi];
           mr.events = events; 
           mr.homeScore = hs;
           mr.awayScore = as2;
           mr.played = true;
           mr.winner = parseInt(hs) > parseInt(as2) ? mr.home : mr.away;
           if (!mr.date) mr.date = todayStr();
           mr.homeRepresentative = m.homeRepresentative || "";
           mr.awayRepresentative = m.awayRepresentative || "";
           mr.observations = m.observations || [];

           if (ph.matches.every(x => x.played)) {
             ph.advancers = ph.matches.map(x => x.winner);
             if (tc.knockout[pi + 1]) {
               const adv = ph.advancers;
               tc.knockout[pi + 1].matches = [];
               for (let i = 0; i < adv.length; i += 2) {
                 if (adv[i + 1]) {
                   tc.knockout[pi + 1].matches.push({
                     home: adv[i],
                     away: adv[i + 1],
                     homeScore: "",
                     awayScore: "",
                     played: false,
                     winner: null,
                     date: ""
                   });
                 }
               }
             }
           }
           found = true; 
           break; 
         } 
       }
     }

     onUpdate(tc);
     setSumulaModal(null);
  }

  function renderEstatisticas() {
    const evts = [];
    if(c.rounds) c.rounds.forEach(r=>r.matches.forEach(m=>m.events?.forEach(e=>evts.push(e))));
    if(c.groups) c.groups.forEach(g=>g.rounds.forEach(r=>r.matches.forEach(m=>m.events?.forEach(e=>evts.push(e)))));
    if(c.knockout) c.knockout.forEach(p=>p.matches.forEach(m=>m.events?.forEach(e=>evts.push(e))));

    const stats = {}; // aid -> {gols:0, am:0, vm:0, teamName: ""}
    evts.forEach(e => {
       if(!stats[e.atletaId]) stats[e.atletaId] = {gols:0, am:0, vm:0, teamName: e.teamName};
       if(e.type==="gol") stats[e.atletaId].gols++;
       if(e.type==="amarelo") stats[e.atletaId].am++;
       if(e.type==="vermelho") stats[e.atletaId].vm++;
    });

    const arr = Object.keys(stats).map(aid => ({ atleta: atletas.find(x=>String(x.id)===String(aid)), ...stats[aid] })).filter(x=>x.atleta);
    
    const rankGols = [...arr].filter(x=>x.gols>0).sort((a,b)=>b.gols-a.gols);
    const rankAm = [...arr].filter(x=>x.am>0).sort((a,b)=>b.am-a.am);
    const rankVm = [...arr].filter(x=>x.vm>0).sort((a,b)=>b.vm-a.vm);

    return (
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        <div style={S.card}>
          <h3 style={{fontSize:14,fontWeight:800,color:t.text,marginBottom:12}}>⚽ Artilharia</h3>
          {rankGols.length===0 && <div style={{fontSize:12,color:t.textSec}}>Nenhum gol registrado.</div>}
          {rankGols.map((x,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${t.cardBorder}`}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:700,color:"#378ADD",width:20}}>{i+1}º</span><PlayerAvatar atleta={x.atleta} size={24}/><div style={{display:"flex",flexDirection:"column"}}><span style={{fontSize:13,fontWeight:600,color:t.text}}>{getPlayerName(x.atleta)}</span><span style={{fontSize:11,color:t.textSec}}>{x.teamName}</span></div></div><div style={{fontWeight:800,color:"#378ADD"}}>{x.gols}</div></div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div style={S.card}>
            <h3 style={{fontSize:14,fontWeight:800,color:t.text,marginBottom:12}}>🟨 Cartões Amarelos</h3>
            {rankAm.length===0 && <div style={{fontSize:12,color:t.textSec}}>Nenhum cartão.</div>}
            {rankAm.map((x,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${t.cardBorder}`}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{display:"flex",flexDirection:"column"}}><span style={{fontSize:12,fontWeight:600,color:t.text}}>{getPlayerName(x.atleta)}</span><span style={{fontSize:10,color:t.textSec}}>{x.teamName}</span></div></div><div style={{fontWeight:700,color:"#BA7517"}}>{x.am}</div></div>)}
          </div>
          <div style={S.card}>
            <h3 style={{fontSize:14,fontWeight:800,color:t.text,marginBottom:12}}>🟥 Cartões Vermelhos</h3>
            {rankVm.length===0 && <div style={{fontSize:12,color:t.textSec}}>Nenhum cartão.</div>}
            {rankVm.map((x,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${t.cardBorder}`}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{display:"flex",flexDirection:"column"}}><span style={{fontSize:12,fontWeight:600,color:t.text}}>{getPlayerName(x.atleta)}</span><span style={{fontSize:10,color:t.textSec}}>{x.teamName}</span></div></div><div style={{fontWeight:700,color:"#E24B4A"}}>{x.vm}</div></div>)}
          </div>
        </div>
      </div>
    );
  }

  function renderKnockout() {
    if (!c.knockout || c.knockout.length === 0) {
      return (
        <div style={{...S.card, textAlign: "center", padding: 20, color: t.textSec}}>
          Nenhuma chave de mata-mata foi gerada ainda. Finalize os jogos da fase de grupos e avance para gerar o mata-mata.
        </div>
      );
    }
    return (
      <div style={{overflowX:"auto"}}>
        <div style={{display:"flex",gap:14,minWidth:"fit-content",paddingBottom:8}}>
          {(c.knockout || []).map((phase,pi)=>(
            <div key={pi} style={{minWidth:200}}>
              <div style={{fontSize:11,fontWeight:700,color:t.textSec,textAlign:"center",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>{phase.name}</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {(phase.matches || []).map((m,mi)=>(
                  <div key={mi} style={{border:`1px solid ${t.cardBorder}`,borderRadius:12,overflow:"hidden",background:t.card}}>
                    {[{tm:m.home,s:m.homeScore,w:m.winner===m.home},{tm:m.away,s:m.awayScore,w:m.winner===m.away}].map((side,si)=>(
                      <div key={si} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderBottom:si===0?`1px solid ${t.cardBorder}`:"none",background:side.w?"#1D9E7514":"transparent"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}><Avatar name={side.tm||"?"} color={colorOf(side.tm,c.teams)} size={26} src={c.emblems?.[side.tm]}/><span style={{fontSize:13,fontWeight:700,color:t.text}}>{side.tm||"—"}</span></div>
                        <span style={{fontWeight:800,color:side.w?"#1D9E75":t.text,fontSize:14}}>{m.played?side.s:"—"}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderJogos() {
    return (
      <>
        {currentTab==="jogos"&&c.type==="pontos"&&<div style={{display:"flex",flexDirection:"column",gap:18}}>{(c.rounds || []).map((rd,ri)=><Sec key={ri} title={"Rodada "+rd.round} t={t}><div style={{display:"flex",flexDirection:"column",gap:8}}>{(rd.matches || []).map((m,mi)=><MatchRow key={mi} m={m} eKey={"rr-"+ri+"-"+mi} onSave={(hs,as2,dt,nh,na,nr)=>saveRR(ri,mi,hs,as2,dt,nh,na,nr)} roundsList={(c.rounds || []).map(r=>r.round)} currentRound={rd.round} teamsList={c.teams || []}/>)}</div></Sec>)}</div>}
        {currentTab==="jogos"&&c.type==="mata"&&<div style={{display:"flex",flexDirection:"column",gap:18}}>{(c.knockout || []).map((phase,pi)=><Sec key={pi} title={phase.name} t={t}><div style={{display:"flex",flexDirection:"column",gap:8}}>{(phase.matches || []).map((m,mi)=><MatchRow key={mi} m={m} eKey={"ko-"+pi+"-"+mi} onSave={(hs,as2,dt,nh,na)=>saveKO(pi,mi,hs,as2,dt,nh,na)} teamsList={c.teams || []}/>)}</div></Sec>)}</div>}
        {currentTab==="jogos"&&(c.type==="misto"||c.type==="liga")&&<div style={{display:"flex",flexDirection:"column",gap:24}}>{(c.groups || []).map((g,gi)=><div key={gi}><h3 style={{fontSize:14,fontWeight:700,marginBottom:10,color:t.text}}>{g.name}{g.quadra ? ` (🏟️ ${g.quadra})` : ""}</h3>{(g.rounds || []).map((rd,ri)=><Sec key={ri} title={"Rodada "+rd.round} t={t}><div style={{display:"flex",flexDirection:"column",gap:8}}>{(rd.matches || []).map((m,mi)=><MatchRow key={mi} m={m} eKey={"gr-"+gi+"-"+ri+"-"+mi} onSave={(hs,as2,dt,nh,na,nr)=>saveGroup(gi,ri,mi,hs,as2,dt,nh,na,nr)} roundsList={(g.rounds || []).map(r=>r.round)} currentRound={rd.round} teamsList={g.teams || []} quadra={g.quadra||""}/>)}</div></Sec>)}</div>)}</div>}
      </>
    );
  }

  function ResumoArtilharia() {
    const evts = [];
    if(c.rounds) c.rounds.forEach(r=>r.matches.forEach(m=>m.events?.forEach(e=>evts.push(e))));
    if(c.groups) c.groups.forEach(g=>g.rounds.forEach(r=>r.matches.forEach(m=>m.events?.forEach(e=>evts.push(e)))));
    if(c.knockout) c.knockout.forEach(p=>p.matches.forEach(m=>m.events?.forEach(e=>evts.push(e))));

    const stats = {};
    evts.forEach(e => {
       if(e.type==="gol") {
          if(!stats[e.atletaId]) stats[e.atletaId] = {gols:0, teamName: e.teamName};
          stats[e.atletaId].gols++;
       }
    });

    const arr = Object.keys(stats).map(aid => ({ atleta: atletas.find(x=>String(x.id)===String(aid)), ...stats[aid] })).filter(x=>x.atleta);
    const rankGols = [...arr].sort((a,b)=>b.gols-a.gols).slice(0, 3);

    if(rankGols.length === 0) return null;

    return (
      <div style={{...S.card, marginTop:20}}>
        <h3 style={{fontSize:14,fontWeight:800,color:t.text,marginBottom:12}}>⚽ Top Artilheiros</h3>
        {rankGols.map((x,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:i!==rankGols.length-1?`1px solid ${t.cardBorder}`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontWeight:700,color:"#378ADD",width:20}}>{i+1}º</span>
              <PlayerAvatar atleta={x.atleta} size={24}/>
              <div style={{display:"flex",flexDirection:"column"}}>
                 <span style={{fontSize:13,fontWeight:600,color:t.text}}>{getPlayerName(x.atleta)}</span>
                 <span style={{fontSize:11,color:t.textSec}}>{x.teamName}</span>
              </div>
            </div>
            <div style={{fontWeight:800,color:"#378ADD"}}>{x.gols}</div>
          </div>
        ))}
      </div>
    );
  }

  function AbaElencos() {
    if(!selTeamElenco && c.teams.length > 0) {
      setSelTeamElenco(c.teams[0]);
    }
    const teamRoster = selTeamElenco ? (rosters[selTeamElenco] || []) : [];
    const allRosteredIds = Object.values(rosters).flat();
    const notInTeam = atletasDoCampeonato.filter(a => !allRosteredIds.includes(a.id));
    const gruposUnicos = Array.from(new Set(atletasDoCampeonato.map(a => a.grupo).filter(Boolean)));
    const dispFiltrados = notInTeam.filter(a => {
      const matchesNome = a.nome.toLowerCase().includes(filtroElenco.toLowerCase()) || (a.apelido && a.apelido.toLowerCase().includes(filtroElenco.toLowerCase()));
      const matchesGrupo = !filtroGrupoElenco || a.grupo === filtroGrupoElenco;
      return matchesNome && matchesGrupo;
    });

    const handleQuickRegister = () => {
      const nomeTime = quickTeamName.trim();
      if (!nomeTime) {
        alert("Por favor, informe o nome do time.");
        return;
      }
      const listaNomes = quickPlayersText
        .split("\n")
        .map(n => n.trim())
        .filter(Boolean);
      
      if (listaNomes.length === 0) {
        alert("Por favor, adicione pelo menos um nome de atleta.");
        return;
      }

      const tc = deepClone(c);
      tc.rosters = tc.rosters || {};
      
      // 1. Garantir time cadastrado
      if (!tc.teams.includes(nomeTime)) {
        tc.teams.push(nomeTime);
      }
      tc.rosters[nomeTime] = tc.rosters[nomeTime] || [];

      // 2. Processar atletas
      let novosCadastrados = 0;
      
      listaNomes.forEach((nome, idx) => {
        let a = atletas.find(x => x.nome.toLowerCase() === nome.toLowerCase() || (x.apelido && x.apelido.toLowerCase() === nome.toLowerCase()));
        
        if (!a) {
          const novoId = Date.now() + Math.floor(Math.random() * 100000) + idx;
          a = {
            id: novoId,
            nome: nome,
            apelido: "",
            foto: "",
            habilidade: 3,
            goleiro: false,
            ativo: true,
            vinculos: ["campeonato_" + c.id]
          };
          onAddAtleta(a);
          novosCadastrados++;
        } else {
          const vinculos = Array.isArray(a.vinculos) ? [...a.vinculos] : [];
          if (!vinculos.includes("campeonato_" + c.id)) {
            a.vinculos = [...vinculos, "campeonato_" + c.id];
            onUpdateAtleta(a.id, a);
          }
        }
        
        if (!tc.rosters[nomeTime].includes(a.id)) {
          tc.rosters[nomeTime].push(a.id);
        }
      });

      onUpdate(tc);
      setSelTeamElenco(nomeTime);
      setQuickTeamName("");
      setQuickPlayersText("");
      setShowQuickRegister(false);

      alert(`Sucesso! Time "${nomeTime}" inscrito. ${listaNomes.length} jogadores processados (${novosCadastrados} novos cadastrados adicionados ao banco global).`);
    };

    return (
      <div>
        {/* Menu de Importar/Exportar Planilha de Atletas */}
        <div style={{...S.card, marginBottom: 12, borderColor: "#1D9E7555", background: t.inputBg}}>
          <button
            onClick={() => setShowXlsMenuElenco(!showXlsMenuElenco)}
            style={{
              background: "none", border: "none", color: "#1D9E75", fontWeight: 800,
              fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center",
              gap: 6, padding: 0, width: "100%", textAlign: "left"
            }}
          >
            {showXlsMenuElenco ? "▼ Fechar Planilha" : "📊 Importar / Exportar Atletas por Planilha (XLS)"}
          </button>

          {showXlsMenuElenco && (
            <div style={{marginTop: 12, display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${t.cardBorder}`, borderRadius: 10, overflow: "hidden"}}>
              <button
                onClick={() => { downloadModeloElenco(); setShowXlsMenuElenco(false); }}
                style={{textAlign:"left",padding:"12px 14px",border:"none",background:"transparent",color:t.text,cursor:"pointer",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s"}}
                onMouseEnter={e => e.currentTarget.style.background = t.card}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span>📄</span>
                <div>
                  <div style={{fontWeight:600}}>Baixar Modelo de Planilha</div>
                  <div style={{fontSize:11,color:t.textSec}}>Planilha em branco com todos os campos para preenchimento</div>
                </div>
              </button>

              <label
                style={{textAlign:"left",padding:"12px 14px",border:"none",background:"transparent",color:t.text,cursor:"pointer",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s",margin:0}}
                onMouseEnter={e => e.currentTarget.style.background = t.card}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span>📥</span>
                <div>
                  <div style={{fontWeight:600}}>Importar Atletas da Planilha</div>
                  <div style={{fontSize:11,color:t.textSec}}>
                    Carrega atletas da planilha XLS{selTeamElenco ? ` e escalona automaticamente em "${selTeamElenco}"` : ""}
                  </div>
                </div>
                <input type="file" accept=".csv,.xls,.xlsx" style={{display:"none"}} onChange={importarElenco} />
              </label>

              <button
                onClick={() => { exportarElenco(); setShowXlsMenuElenco(false); }}
                style={{textAlign:"left",padding:"12px 14px",border:"none",background:"transparent",color:t.text,cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s"}}
                onMouseEnter={e => e.currentTarget.style.background = t.card}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span>📤</span>
                <div>
                  <div style={{fontWeight:600}}>Exportar Elencos Atuais</div>
                  <div style={{fontSize:11,color:t.textSec}}>Baixar lista de todos os atletas escalados em XLS</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Formulário de Inscrição Rápida de Elenco em Lote */}
        <div style={{...S.card, marginBottom: 16, borderColor: "#378ADD55", background: t.inputBg}}>
          <button 
            onClick={() => setShowQuickRegister(!showQuickRegister)} 
            style={{
              background: "none",
              border: "none",
              color: "#378ADD",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: 0,
              width: "100%",
              textAlign: "left"
            }}
          >
            {showQuickRegister ? "▼ Fechar Inscrição Rápida" : "📥 Inscrição Rápida de Time e Atletas (Lote)"}
          </button>
          
          {showQuickRegister && (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={S.label}>Nome do Time</label>
                <input 
                  style={S.input} 
                  placeholder="Ex: Real Madrid, Barcelona..." 
                  value={quickTeamName} 
                  onChange={e => setQuickTeamName(e.target.value)}
                />
              </div>
              <div>
                <label style={S.label}>Lista de Atletas (um nome por linha)</label>
                <textarea 
                  style={{
                    ...S.input,
                    height: 120,
                    fontFamily: "inherit",
                    resize: "vertical",
                    padding: "8px 12px"
                  }} 
                  placeholder="Ex:&#10;Cristiano Ronaldo&#10;Karim Benzema&#10;Luka Modric"
                  value={quickPlayersText}
                  onChange={e => setQuickPlayersText(e.target.value)}
                />
                <span style={{ fontSize: 10, color: t.textSec, marginTop: 4, display: "block" }}>
                  💡 O sistema criará o time e cadastrará/escalará cada jogador da lista de forma 100% automática.
                </span>
              </div>
              <button 
                onClick={handleQuickRegister} 
                style={{ ...S.btn("#378ADD"), justifyContent: "center", marginTop: 4 }}
              >
                📥 Inscrever Time e Elenco
              </button>
            </div>
          )}
        </div>

        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
          <button onClick={()=>{setEditingTeams(e=>!e); setTeamsDraft(Array.isArray(champ.teams)?[...champ.teams]:[]);}} style={S.btnSm(editingTeams?"#BA7517":"#378ADD")}>{editingTeams?"Cancelar edição":"Editar Times"}</button>
          {editingTeams&&<button onClick={()=>{
              const cleaned = teamsDraft.map(x=>String(x||"").trim()).filter(Boolean);
              const tc = {...champ, teams: cleaned};
              onUpdate(tc);
              setEditingTeams(false);
            }} style={S.btnSm("#1D9E75")}>Salvar Times</button>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
          <label style={{fontSize:13,fontWeight:700,color:t.text,whiteSpace:"nowrap"}}>🏆 Time:</label>
          <select
            value={selTeamElenco}
            onChange={e => setSelTeamElenco(e.target.value)}
            style={{...S.select, flex:1, minWidth:180, maxWidth:320, fontWeight:600}}
          >
            {(editingTeams ? teamsDraft : c.teams).map((tm,i) => (
              <option key={tm+String(i)} value={tm}>{tm}</option>
            ))}
          </select>
          {editingTeams && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button onClick={() => setTeamsDraft(d => [...d,""])} style={{...S.btnSm("#1D9E7522","#1D9E75")}}>+ Time</button>
            </div>
          )}
        </div>

        
        {selTeamElenco ? (
          <div style={S.card}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Avatar name={selTeamElenco} color={colorOf(selTeamElenco,c.teams)} size={32} src={c.emblems?.[selTeamElenco]}/>
                <span style={{fontWeight:800,fontSize:15,color:colorOf(selTeamElenco,c.teams)}}>Elenco: {selTeamElenco}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <label style={{
                  ...S.btnSm("#378ADD22","#378ADD"),
                  display:"inline-flex",
                  alignItems:"center",
                  cursor:"pointer",
                  fontWeight:700,
                  fontSize:11,
                  padding:"4px 8px"
                }}>
                  🛡️ Upload Escudo
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e)=>{
                      const file = e.target.files?.[0];
                      if(!file) return;
                      resizeImage(file, 200, (b64) => {
                        const tc = deepClone(c);
                        tc.emblems = tc.emblems || {};
                        tc.emblems[selTeamElenco] = b64;
                        onUpdate(tc);
                      });
                    }} 
                    style={{display:"none"}}
                  />
                </label>
                {c.emblems?.[selTeamElenco] && (
                  <button 
                    onClick={()=>{
                      if(window.confirm(`Remover emblema de "${selTeamElenco}"?`)){
                        const tc = deepClone(c);
                        tc.emblems = tc.emblems || {};
                        delete tc.emblems[selTeamElenco];
                        onUpdate(tc);
                      }
                    }} 
                    style={S.btnSm("#E24B4A22","#E24B4A")}
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {teamRoster.map(id=>{
                const a = atletas.find(x=>x.id===id);
                if(!a || !Array.isArray(a.vinculos) || !a.vinculos.includes("campeonato_" + c.id)) return null;
                const regs = c.registrations || [];
                const isPaid = regs.some(r => r.atletaId === id && r.team === selTeamElenco && r.paid);
                return (
                  <div key={id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:12,background:t.inputBg,border:`1px solid ${t.cardBorder}`,gap:8,flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:180}}>
                      <PlayerAvatar atleta={a} size={22}/>
                      <div style={{display:"flex",flexDirection:"column"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:13,fontWeight:600,color:t.text}}>{getPlayerName(a)}</span>
                          {a.numeroCamisa && <span style={{fontSize:11,fontWeight:800,color:"#378ADD",background:"#378ADD15",padding:"1px 5px",borderRadius:4}}>#{a.numeroCamisa}</span>}
                        </div>
                        <div style={{fontSize:11,color:t.textSec,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                          {a.documento && <span>RG/CPF: {a.documento}</span>}
                          {a.dataNascimento && <span>Nasc: {a.dataNascimento.split("-").reverse().join("/")}</span>}
                          {c.customFieldsDef && c.customFieldsDef.map(f => a.customFields?.[f] && (
                            <span key={f}><strong>{f}:</strong> {a.customFields[f]}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      {isPaid ? (
                        <span style={{fontSize:11,color:"#1D9E75",fontWeight:700,background:"#1D9E7522",padding:"2px 8px",borderRadius:8}}>Inscrição Paga</span>
                      ) : (
                        <button onClick={()=>{
                          const fee = Number(c.fee||0);
                          if(fee > 0){
                            setFinanceiro(s=>{
                              const entries = Array.isArray(s.entries)?[...s.entries]:[];
                              entries.push({
                                id:Date.now(),
                                desc:`Inscrição - ${c.name} - ${selTeamElenco} - ${getPlayerName(a)}`,
                                amount:fee,
                                type:"receita",
                                date:todayStr(),
                                category:"Taxa de inscrição",
                                champ_id:c.id,
                                manager_id:c.manager_id||null
                              });
                              return {entries};
                            });
                          }
                          const tc = deepClone(c);
                          tc.registrations = tc.registrations||[];
                          tc.registrations.push({atletaId:id,team:selTeamElenco,paid:true,date:todayStr(),amount:fee});
                          onUpdate(tc);
                        }} style={S.btnSm("#378ADD22","#378ADD")}>Pagar Taxa {c.fee ? `(${fmtCur(c.fee)})` : ""}</button>
                      )}
                      <button onClick={()=>abrirEditarAtletaCamp(a)} style={{background:"none",border:"none",color:"#378ADD",cursor:"pointer",fontSize:13,padding:"4px 8px"}} title="Editar Cadastro do Atleta">✏️</button>
                      <button onClick={()=>{
                        if(window.confirm(`Remover ${getPlayerName(a)} do time?`)){
                          const tc = deepClone(c);
                          tc.rosters = tc.rosters||{};
                          tc.rosters[selTeamElenco]=tc.rosters[selTeamElenco].filter(x=>x!==id);
                          tc.registrations = (tc.registrations||[]).filter(r=> !(r.atletaId===id && r.team===selTeamElenco));
                          onUpdate(tc);
                        }
                      }} style={{background:"none",border:"none",color:"#E24B4A",cursor:"pointer",fontSize:14,fontWeight:700,padding:"4px 8px"}}>✕</button>
                    </div>
                  </div>
                );
              })}
              {teamRoster.length===0 && <div style={{fontSize:12,color:t.textSec,textAlign:"center",padding:12}}>Nenhum atleta associado a este time.</div>}
            </div>
            <div style={{fontWeight:700,fontSize:12,color:t.textSec,marginBottom:8}}>Adicionar ao time:</div>
            <div style={{display:"flex",gap:8,marginBottom:10,flexDirection:"column"}}>
              <div style={{display:"flex",gap:8}}>
                <input style={{...S.input,flex:1,margin:0}} placeholder="🔍 Buscar atleta para escalar..." value={filtroElenco} onChange={e=>setFiltroElenco(e.target.value)}/>
                {filtroElenco.trim() && (
                  <button onClick={abrirNovoAtletaCamp} style={S.btn("#378ADD")}>+ Novo Atleta</button>
                )}
              </div>
              {gruposUnicos.length > 0 && (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:12,color:t.textSec,fontWeight:600}}>Filtrar por Grupo:</span>
                  <select style={{...S.select,flex:1,margin:0,padding:"6px 10px",height:36}} value={filtroGrupoElenco} onChange={e=>setFiltroGrupoElenco(e.target.value)}>
                    <option value="">Todos os Grupos</option>
                    {gruposUnicos.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div style={{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
              {(() => {
                const sorted = [...dispFiltrados].sort((a, b) => {
                  const aMatches = c.modalidade && Array.isArray(a.modalidades) && a.modalidades.includes(c.modalidade) ? 1 : 0;
                  const bMatches = c.modalidade && Array.isArray(b.modalidades) && b.modalidades.includes(c.modalidade) ? 1 : 0;
                  return bMatches - aMatches;
                });
                return sorted.map(a => {
                  const temModalidade = c.modalidade && Array.isArray(a.modalidades) && a.modalidades.includes(c.modalidade);
                  const mDef = c.modalidade ? MODALIDADES_ESPORTIVAS.find(x => x.id === c.modalidade) : null;
                  return (
                    <div key={a.id} onClick={()=>{
                      const tc=deepClone(c); tc.rosters = tc.rosters||{}; tc.rosters[selTeamElenco]=[...(tc.rosters[selTeamElenco]||[]), a.id]; onUpdate(tc);
                      setFiltroElenco("");
                    }} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,background:t.inputBg,cursor:"pointer",border:`1px solid ${temModalidade ? `${mDef?.color || "#378ADD"}44` : "transparent"}`}}>
                      <PlayerAvatar atleta={a} size={20}/>
                      <span style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                        {getPlayerName(a)}
                        {a.grupo && <span style={{fontSize:10,fontWeight:700,color:"#9C27B0",background:"#9C27B015",padding:"1px 4px",borderRadius:4}}>👥 {a.grupo}</span>}
                        {temModalidade && mDef && (
                          <span style={{fontSize:9,fontWeight:800,color:mDef.color,background:`${mDef.color}15`,border:`1px solid ${mDef.color}33`,padding:"1px 4px",borderRadius:4,display:"inline-flex",alignItems:"center",gap:2}}>
                            {mDef.icon} {mDef.label}
                          </span>
                        )}
                      </span>
                      <span style={{marginLeft:"auto",color:"#378ADD",fontWeight:700,fontSize:14}}>+</span>
                    </div>
                  );
                });
              })()}
              {dispFiltrados.length === 0 && <div style={{fontSize:12,color:t.textSec,textAlign:"center",padding:10}}>Nenhum atleta disponível correspondente ou crie um acima.</div>}
            </div>
          </div>
        ) : (
          <div style={{...S.card, textAlign:"center", padding:24, color:t.textSec}}>
            ⚽ Comece adicionando ou inscrevendo um time acima para gerenciar os elencos!
          </div>
        )}
      </div>
    );
  }

  function AbaSolicitacoes() {
    const pendingRegs = c.pendingRegistrations || [];
    const [feedbackTexts, setFeedbackTexts] = useState({});

    const handleAccept = (sub) => {
      if (!window.confirm(`Deseja aprovar a inscrição do time "${sub.teamName}"?`)) return;

      const tc = deepClone(c);
      tc.rosters = tc.rosters || {};
      
      if (!tc.teams.includes(sub.teamName)) {
        tc.teams.push(sub.teamName);
      }
      tc.rosters[sub.teamName] = tc.rosters[sub.teamName] || [];

      sub.players.forEach(p => {
        let a = atletas.find(x => x.nome.toLowerCase() === p.nome.toLowerCase() || (x.apelido && x.apelido.toLowerCase() === p.apelido.toLowerCase()));
        
        if (!a) {
          const newPlayer = {
            id: p.id || Date.now() + Math.floor(Math.random() * 100000),
            nome: p.nome,
            apelido: p.apelido || "",
            foto: "",
            habilidade: p.habilidade || 3,
            goleiro: p.goleiro || false,
            ativo: true,
            documento: p.documento || "",
            dataNascimento: p.dataNascimento || "",
            numeroCamisa: p.numeroCamisa || "",
            customFields: p.customFields || {},
            vinculos: ["campeonato_" + c.id]
          };
          onAddAtleta(newPlayer);
          a = newPlayer;
        } else {
          const vinculos = Array.isArray(a.vinculos) ? [...a.vinculos] : [];
          if (!vinculos.includes("campeonato_" + c.id)) {
            vinculos.push("campeonato_" + c.id);
          }
          onUpdateAtleta(a.id, {
            ...a,
            documento: a.documento || p.documento || "",
            dataNascimento: a.dataNascimento || p.dataNascimento || "",
            numeroCamisa: a.numeroCamisa || p.numeroCamisa || "",
            customFields: { ...(a.customFields || {}), ...(p.customFields || {}) },
            vinculos
          });
        }

        if (!tc.rosters[sub.teamName].includes(a.id)) {
          tc.rosters[sub.teamName].push(a.id);
        }
      });

      tc.pendingRegistrations = tc.pendingRegistrations.filter(r => r.id !== sub.id);

      onUpdate(tc);
      alert(`Inscrição do time "${sub.teamName}" aprovada!`);
    };

    const handleReject = (subId) => {
      if (!window.confirm("Deseja rejeitar e excluir esta solicitação?")) return;
      const tc = deepClone(c);
      tc.pendingRegistrations = tc.pendingRegistrations.filter(r => r.id !== subId);
      onUpdate(tc);
      alert("Inscrição rejeitada.");
    };

    const handleReturn = (sub, feedback) => {
      if (!feedback.trim()) {
        alert("Por favor, informe a observação para devolução.");
        return;
      }
      const tc = deepClone(c);
      const target = tc.pendingRegistrations.find(r => r.id === sub.id);
      if (target) {
        target.status = "devolvido";
        target.feedback = feedback.trim();
      }
      onUpdate(tc);
      alert("Solicitação devolvida para correção.");
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={S.card}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: t.text, marginBottom: 8 }}>📥 Solicitações de Inscrições Pendentes</h3>
          <p style={{ fontSize: 12, color: t.textSec, lineHeight: 1.5, marginBottom: 14 }}>
            Aprove, rejeite ou devolva inscrições de times e elencos enviadas por responsáveis do formulário online.
          </p>

          {pendingRegs.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: t.textSec, fontStyle: "italic" }}>
              Nenhuma solicitação de inscrição pendente.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {pendingRegs.map((sub, idx) => (
                <div key={idx} style={{ border: `1.5px solid ${t.cardBorder}`, borderRadius: 12, padding: 12, background: t.inputBg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 10, borderBottom: `1px dashed ${t.cardBorder}`, paddingBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 800, color: t.text }}>{sub.teamName}</span>
                      {sub.teamColors && <span style={{ fontSize: 11, color: t.textSec, marginLeft: 8 }}>({sub.teamColors})</span>}
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: sub.status === "devolvido" ? "#BA7517" : "#BA7517",
                      background: sub.status === "devolvido" ? "#BA751718" : "transparent",
                      padding: sub.status === "devolvido" ? "2px 6px" : "0",
                      borderRadius: 6
                    }}>
                      {sub.status === "devolvido" ? "Devolvido" : "Pendente"}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: t.textSec, marginBottom: 10 }}>
                    <strong>Responsável:</strong> {sub.leaderName} ({sub.leaderContact}) · <strong>Data:</strong> {fmtDate(sub.date)}
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.textSec, marginBottom: 6 }}>ATLETAS SOLICITADOS ({sub.players?.length}):</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {sub.players?.map((p, i) => (
                        <div key={i} style={{ fontSize: 11, color: t.text, display: "flex", justifyContent: "space-between", background: t.card, padding: "4px 8px", borderRadius: 6, border: `1px solid ${t.cardBorder}` }}>
                          <span>
                            <strong>{p.numeroCamisa ? `#${p.numeroCamisa} ` : ""}</strong>
                            {p.nome} {p.apelido ? `(${p.apelido})` : ""}
                          </span>
                          <span style={{ fontSize: 10, color: t.textSec }}>
                            Nasc: {p.dataNascimento ? p.dataNascimento.split("-").reverse().join("/") : "—"} · RG/CPF: {p.documento || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {sub.feedback && (
                    <div style={{ fontSize: 11, color: "#BA7517", background: "#BA751712", padding: 6, borderRadius: 6, marginBottom: 10, borderLeft: "3.5px solid #BA7517" }}>
                      <strong>Feedback enviado:</strong> {sub.feedback}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button onClick={() => handleAccept(sub)} style={S.btnSm("#1D9E75", "#fff")}>✓ Aprovar</button>
                    <button onClick={() => handleReject(sub.id)} style={S.btnSm("#E24B4A22", "#E24B4A")}>🗑 Rejeitar</button>
                    
                    <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 200, marginLeft: "auto" }}>
                      <input 
                        style={{ ...S.input, padding: "5px 10px", fontSize: 11, flex: 1, margin: 0 }} 
                        placeholder="Motivo para devolver..." 
                        value={feedbackTexts[sub.id] || ""} 
                        onChange={e => setFeedbackTexts(prev => ({ ...prev, [sub.id]: e.target.value }))}
                      />
                      <button onClick={() => handleReturn(sub, feedbackTexts[sub.id] || "")} style={S.btnSm("#BA751722", "#BA7517")}>↩ Devolver</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }



  function AbaConfiguracoes() {
    const [editName, setEditName] = useState(c.name);
    const [editDate, setEditDate] = useState(c.date || "");
    const [editFee, setEditFee] = useState(c.fee || 0);
    const [editSlug, setEditSlug] = useState(c.customSlug || "");
    const [editAllowOnline, setEditAllowOnline] = useState(c.allowOnlineReg || false);
    const [newCustomField, setNewCustomField] = useState("");
    const [customFields, setCustomFields] = useState(c.customFieldsDef || []);
    const [editGroupsData, setEditGroupsData] = useState(c.groups ? c.groups.map(g => ({ name: g.name, quadra: g.quadra || "" })) : []);

    const handleAddField = () => {
      const fieldName = newCustomField.trim();
      if (!fieldName) return;
      if (customFields.includes(fieldName)) {
        alert("Este campo já foi adicionado.");
        return;
      }
      setCustomFields(prev => [...prev, fieldName]);
      setNewCustomField("");
    };

    const handleRemoveField = (field) => {
      setCustomFields(prev => prev.filter(f => f !== field));
    };

    const handleSaveConfig = () => {
      if(!editName.trim()){
        alert("Nome do campeonato não pode ser vazio.");
        return;
      }
      
      const slugVal = editSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");

      const novosGrupos = c.groups ? c.groups.map((g, gi) => ({
        ...g,
        quadra: editGroupsData[gi]?.quadra || ""
      })) : null;

      const tc = {
        ...c,
        name: editName.trim(),
        date: editDate,
        fee: Number(editFee),
        customSlug: slugVal,
        allowOnlineReg: editAllowOnline,
        customFieldsDef: customFields,
        ...(novosGrupos ? { groups: novosGrupos } : {})
      };
      onUpdate(tc);
      alert("Configurações salvas com sucesso!");
    };

    const getShareLink = () => {
      const slug = editSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "") || c.npointId;
      if (!slug) return "";
      const base = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "https://futebol-manager.vercel.app";
      return `${base}?c=${slug}`;
    };

    const shareLink = getShareLink();
    const qrCodeUrl = shareLink ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareLink)}` : "";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={S.card}>
          <h3 style={{fontSize:15,fontWeight:700,color:t.text,marginBottom:14}}>Configurações Básicas</h3>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={S.label}>Nome do Campeonato</label>
              <input style={S.input} value={editName} onChange={e=>setEditName(e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Data de Início</label>
              <input type="date" style={S.input} value={editDate} onChange={e=>setEditDate(e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Taxa de inscrição por atleta (R$)</label>
              <input type="number" min={0} step="0.01" style={S.input} value={editFee} onChange={e=>setEditFee(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Inscrições Online e Campos Customizados */}
        <div style={S.card}>
          <h3 style={{fontSize:15,fontWeight:700,color:t.text,marginBottom:14}}>✍️ Inscrições Online Públicas</h3>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text,fontWeight:600}}>
              <input type="checkbox" checked={editAllowOnline} onChange={e=>setEditAllowOnline(e.target.checked)} />
              Habilitar Inscrições Públicas via Link / Nuvem
            </label>
            
            {editAllowOnline && (
              <div style={{ borderTop: `1px dashed ${t.cardBorder}`, paddingTop: 12, marginTop: 4 }}>
                <label style={S.label}>Campos Personalizados da Ficha do Jogador</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input 
                    style={{ ...S.input, flex: 1, margin: 0, padding: "7px 10px" }} 
                    placeholder="Ex: Posição, CPF, Responsável..." 
                    value={newCustomField} 
                    onChange={e=>setNewCustomField(e.target.value)}
                  />
                  <button onClick={handleAddField} style={S.btn("#378ADD")}>+ Adicionar</button>
                </div>
                
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {customFields.map(f => (
                    <span key={f} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, padding: "4px 10px", borderRadius: 16, background: `${t.inputBg}`, border: `1px solid ${t.cardBorder}`, color: t.text, fontWeight: 600 }}>
                      {f}
                      <button onClick={()=>handleRemoveField(f)} style={{ background: "none", border: "none", color: "#E24B4A", fontWeight: 800, cursor: "pointer", padding: 0 }}>×</button>
                    </span>
                  ))}
                  {customFields.length === 0 && (
                    <div style={{ fontSize: 11, color: t.textSec, fontStyle: "italic" }}>Nenhum campo personalizado criado. O sistema exigirá apenas dados nativos (Nome, Apelido, Camisa, Documento e Nascimento).</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quadras dos Grupos/Chaves */}
        {c.groups && c.groups.length > 0 && (
          <div style={S.card}>
            <h3 style={{fontSize:15,fontWeight:700,color:t.text,marginBottom:14}}>🏟️ Quadras dos Grupos / Chaves</h3>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {editGroupsData.map((g, gi) => (
                <div key={gi} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                  <span style={{fontSize:13,fontWeight:600,color:t.text}}>{g.name}</span>
                  <select
                    value={g.quadra}
                    onChange={e => {
                      const val = e.target.value;
                      setEditGroupsData(prev => {
                        const copy = [...prev];
                        copy[gi] = { ...copy[gi], quadra: val };
                        return copy;
                      });
                    }}
                    style={{...S.input,width:180,padding:"4px 8px",fontSize:12,height:"auto"}}
                  >
                    <option value="">Sem Quadra</option>
                    {quadras.filter(q => q.ativa).map(q => (
                      <option key={q.id} value={q.nome}>{q.nome}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divulgação & Links */}
        <div style={S.card}>
          <h3 style={{fontSize:15,fontWeight:700,color:t.text,marginBottom:14}}>🔗 Divulgação & Link Amigável</h3>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={S.label}>Apelido do Campeonato (Slug na URL)</label>
              <input 
                style={S.input} 
                placeholder="Ex: copa-bairro-novo-2026" 
                value={editSlug} 
                onChange={e=>setEditSlug(e.target.value)} 
              />
              <span style={{ fontSize: 10, color: t.textSec, marginTop: 4, display: "block" }}>
                ⚠️ Apenas letras minúsculas, números e traços. Exemplo de link: <code>{shareLink || "Pendente de publicação na nuvem"}</code>
              </span>
            </div>

            {c.npointId && shareLink && (
              <div style={{ display: "flex", gap: 16, alignItems: "center", borderTop: `1px dashed ${t.cardBorder}`, paddingTop: 12, marginTop: 4, flexWrap: "wrap" }}>
                <div>
                  <img src={qrCodeUrl} alt="QR Code de Compartilhamento" style={{ width: 120, height: 120, border: `3px solid #000`, borderRadius: 8, background: "#fff", padding: 4 }} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: t.text, marginBottom: 4 }}>Divulgue por QR Code!</div>
                  <p style={{ fontSize: 11, color: t.textSec, lineHeight: 1.4, margin: "0 0 10px 0" }}>Torcedores e atletas podem escanear este código com a câmera do celular para acessar placares, tabelas e fazer inscrições.</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(shareLink);
                        alert("Link de compartilhamento copiado!");
                      }} 
                      style={S.btnSm("#378ADD22", "#378ADD")}
                    >
                      📋 Copiar Link
                    </button>
                    <a href={qrCodeUrl} target="_blank" download="qrcode-campeonato.png" rel="noreferrer" style={{ ...S.btnSm("#1D9E7522", "#1D9E75"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                      📥 Baixar QR Code
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <button onClick={handleSaveConfig} style={{...S.btn("#1D9E75"), width: "100%", justifyContent: "center", padding: "12px", fontSize: 13, marginTop: 4}}>✓ Salvar Configurações</button>
      </div>
    );
  }

  function MatchRow({m,eKey,onSave,roundsList=[],currentRound=null,teamsList=[],quadra=""}){
    const isEd=editing?.key===eKey;
    const[hs,setHs]=useState(m.homeScore||"");const[as2,setAs2]=useState(m.awayScore||"");const[dt,setDt]=useState(m.date||"");
    const[homeTeam,setHomeTeam]=useState(m.home);const[awayTeam,setAwayTeam]=useState(m.away);
    const[selectedRound,setSelectedRound]=useState(currentRound||"");
    const getPlayerNameById = id => getPlayerName(atletas.find(x=>String(x.id)===String(id)));
    if(isEd)return(
      <div style={{...S.card,padding:12,border:"1.5px solid #1D9E7555"}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {!m.played && (
            /* Cronômetro com Alarme no Campeonato */
            <MatchTimer t={t} defaultMinutes={40} timerKey={`champ_${c.id}_match_${eKey}`} />
          )}
          {!m.played ? (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div>
                <label style={{...S.label,fontSize:11,marginBottom:4}}>Time Mandante</label>
                <select value={homeTeam} onChange={e=>setHomeTeam(e.target.value)} style={S.select}>
                  {teamsList.map(tName=><option key={tName} value={tName}>{tName}</option>)}
                </select>
              </div>
              <div>
                <label style={{...S.label,fontSize:11,marginBottom:4}}>Time Visitante</label>
                <select value={awayTeam} onChange={e=>setAwayTeam(e.target.value)} style={S.select}>
                  {teamsList.map(tName=><option key={tName} value={tName}>{tName}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><Avatar name={m.home} color={colorOf(m.home,c.teams)} size={30} src={c.emblems?.[m.home]}/><span style={{fontSize:14,fontWeight:800,color:t.text}}>{m.home}</span></div>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:800,color:t.text}}>{m.away}</span><Avatar name={m.away} color={colorOf(m.away,c.teams)} size={30} src={c.emblems?.[m.away]}/></div>
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:4}}>
            <label style={{...S.label,fontSize:11}}>Resultado (Deixe em branco para partida pendente)</label>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
              <span style={{fontSize:11,color:t.textSec,flex:1,textAlign:"right"}}>{m.played?"":"Gols Mandante"}</span>
              <input type="number" min={0} max={99} value={hs} onChange={e=>setHs(e.target.value)} style={{...S.input,width:56,textAlign:"center",padding:"6px 4px"}} placeholder="—"/>
              <span style={{color:t.textSec,fontWeight:700}}>×</span>
              <input type="number" min={0} max={99} value={as2} onChange={e=>setAs2(e.target.value)} style={{...S.input,width:56,textAlign:"center",padding:"6px 4px"}} placeholder="—"/>
              <span style={{fontSize:11,color:t.textSec,flex:1}}>{m.played?"":"Gols Visitante"}</span>
            </div>
          </div>

          <div>
            <label style={{...S.label,fontSize:11,marginBottom:4}}>Data da Partida</label>
            <input type="date" value={dt} onChange={e=>setDt(e.target.value)} style={S.input}/>
          </div>

          {!m.played && roundsList.length > 1 && currentRound && (
            <div>
              <label style={{...S.label,fontSize:11,marginBottom:4}}>Remanejar para Rodada</label>
              <select value={selectedRound} onChange={e=>setSelectedRound(Number(e.target.value))} style={S.select}>
                {roundsList.map(rdNum=><option key={rdNum} value={rdNum}>Rodada {rdNum}</option>)}
              </select>
            </div>
          )}

          <div style={{display:"flex",gap:8,marginTop:6}}>
            <button onClick={()=>onSave(hs,as2,dt,homeTeam,awayTeam,selectedRound)} style={{...S.btn(),flex:1,justifyContent:"center"}}>Salvar</button>
            <button onClick={()=>setEditing(null)} style={S.btn(t.card,t.textSec)}>✕</button>
          </div>
        </div>
      </div>
    );
    const matchEvents = m.events || [];
    const leftEvents = matchEvents.filter(e=>e.teamName===m.home);
    const rightEvents = matchEvents.filter(e=>e.teamName===m.away);
    const renderSideEvents = (events, teamName) => {
      const goals = events.filter(e=>e.type==="gol");
      const yellows = events.filter(e=>e.type==="amarelo");
      const reds = events.filter(e=>e.type==="vermelho");
      return (
        <div style={{display:"flex",flexDirection:"column",gap:6,background:t.inputBg,padding:10,border:`1px solid ${t.cardBorder}`,borderRadius:12}}>
          <div style={{fontSize:12,fontWeight:700,color:t.text,marginBottom:6}}>{teamName}</div>
          {goals.length>0 ? goals.map((e,i)=><div key={i} style={{fontSize:12,color:t.text}}><span style={{marginRight:6}}>⚽</span>{getPlayerNameById(e.atletaId)}</div>) : <div style={{fontSize:12,color:t.textSec}}>Nenhum gol</div>}
          {yellows.length>0 ? yellows.map((e,i)=><div key={i} style={{fontSize:12,color:t.text}}><span style={{marginRight:6}}>🟨</span>{getPlayerNameById(e.atletaId)}</div>) : <div style={{fontSize:12,color:t.textSec}}>Nenhum amarelo</div>}
          {reds.length>0 ? reds.map((e,i)=><div key={i} style={{fontSize:12,color:t.text}}><span style={{marginRight:6}}>🟥</span>{getPlayerNameById(e.atletaId)}</div>) : <div style={{fontSize:12,color:t.textSec}}>Nenhum vermelho</div>}
        </div>
      );
    };
    return(
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",flexDirection:"column",border:`1px solid ${t.cardBorder}`,borderRadius:12,background:t.card,overflow:"hidden"}}>
          {quadra && (
            <div style={{background:"#378ADD18",borderBottom:`1px solid ${t.cardBorder}`,padding:"4px 12px",display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:"#378ADD"}}>🏟️</span>
              <span style={{fontSize:11,fontWeight:600,color:"#378ADD"}}>{quadra}</span>
            </div>
          )}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",gap:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flex:1,justifyContent:"flex-end",minWidth:100}}><span style={{fontSize:14,fontWeight:700,color:t.text,textAlign:"right"}}>{m.home}</span><Avatar name={m.home} color={colorOf(m.home,c.teams)} size={32} src={c.emblems?.[m.home]}/></div>
            <div style={{textAlign:"center",minWidth:80,flexShrink:0}}>{m.played?<span style={{fontWeight:900,fontSize:18,color:"#1D9E75"}}>{m.homeScore}×{m.awayScore}</span>:<span style={{color:t.textSec,fontSize:14}}>—×—</span>}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:100}}><Avatar name={m.away} color={colorOf(m.away,c.teams)} size={32} src={c.emblems?.[m.away]}/><span style={{fontSize:14,fontWeight:700,color:t.text}}>{m.away}</span></div>
            <div style={{display:"flex",gap:4,flexShrink:0,alignItems:"center"}}>
               <button onClick={()=>setSumulaModal({m, eKey, round: m.round || currentRound})} style={{...S.btnSm("#378ADD22","#378ADD"),padding:"6px"}} title="Súmula da Partida">📝</button>
             {/* Câmera — apenas em dispositivos móveis/tablet com câmera */}
             {isMobile && (
               <label style={{...S.btnSm("#D85A3022","#D85A30"),padding:"6px",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:10}} title="Tirar foto do jogo">
                 📷
                 <input
                   type="file"
                   accept="image/*"
                   capture="environment"
                   style={{display:"none"}}
                   onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (!file) return;
                     resizeImage(file, 400, (base64) => {
                       saveMatchPhoto(eKey, base64);
                     });
                     e.target.value = '';
                   }}
                 />
               </label>
             )}
               <button onClick={()=>setEditing({key:eKey})} style={{...S.btnSm(),padding:"6px 12px"}}>{m.played?"✏️":"▶"}</button>
            </div>
          </div>
        </div>
        {(() => {
          const suspended = getSuspendedPlayersForMatch(c, eKey);
          const suspendedKeys = Object.keys(suspended);
          if (suspendedKeys.length === 0) return null;
          return (
            <div style={{
              fontSize: 11,
              color: "#E24B4A",
              background: "#E24B4A0d",
              border: "1px dashed #E24B4A44",
              padding: "6px 10px",
              borderRadius: 8,
              marginTop: -4,
              display: "flex",
              flexDirection: "column",
              gap: 2
            }}>
              <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                <span>⚠️ Atletas suspensos para este jogo:</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                {suspendedKeys.map(aid => {
                  const at = atletas.find(x => String(x.id) === String(aid));
                  return (
                    <span key={aid} style={{ background: "#E24B4A15", padding: "2px 6px", borderRadius: 4, fontWeight: 550 }}>
                      {at ? getPlayerName(at) : `Atleta #${aid}`} ({suspended[aid]})
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })()}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {renderSideEvents(leftEvents, m.home)}
          {renderSideEvents(rightEvents, m.away)}
        </div>

        {/* Galeria de fotos da partida */}
        {(() => {
          const photos = m.photos || [];
          if (photos.length === 0 && !isMobile) return null;
          return (
            <div style={{marginTop: 4}}>
              {photos.length > 0 && (
                <>
                  <div style={{fontSize:10,fontWeight:700,color:t.textSec,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>📷 Fotos da Partida ({photos.length})</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {photos.map((photo) => (
                      <div key={photo.id} style={{position:"relative",width:72,height:72,borderRadius:8,overflow:"hidden",border:`1px solid ${t.cardBorder}`}}>
                        <img src={photo.data} alt="Foto da partida" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        <button
                          onClick={() => { if(window.confirm('Remover esta foto?')) removeMatchPhoto(eKey, photo.id); }}
                          style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",fontSize:10,borderRadius:4,width:18,height:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {isMobile && (
                <label style={{
                  display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",
                  padding:"6px 12px",borderRadius:10,border:`1px dashed ${t.cardBorder}`,
                  fontSize:12,color:t.textSec,marginTop: photos.length>0?8:0,fontFamily:"'Outfit',sans-serif"
                }}>
                  <span>📷</span> Adicionar foto do jogo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{display:"none"}}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      resizeImage(file, 400, (base64) => saveMatchPhoto(eKey, base64));
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          );
        })()}
      </div>
    );
  }

  return(
    <div style={S.page}>
      {/* Top Header - Estilo 365scores Competição Header */}
      <div style={{
        ...S.card,
        background: 'linear-gradient(135deg, ' + t.card + ' 0%, ' + t.inputBg + ' 100%)',
        padding:16,
        marginBottom:16,
        border:'1px solid ' + t.cardBorder,
        display:"flex",
        flexDirection:"column",
        gap:12
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,width:"100%"}}>
          <button onClick={onBack} style={{...S.btnSm(), padding:"6px 12px"}}>← Voltar à Home</button>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {champion&&<Tag label={"🏆 "+champion} color={t.accent}/>}
            <button onClick={()=>onDelete(c.id)} style={S.btnSm("#E24B4A15","#E24B4A")} title="Excluir Campeonato">🗑 Excluir</button>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:4}}>
          {(() => {
            const mDef = c.modalidade ? MODALIDADES_ESPORTIVAS.find(x => x.id === c.modalidade) : null;
            const mIcon = mDef ? mDef.icon : "🏆";
            const mColor = mDef ? mDef.color : (t.accent || "#20E278");
            return (
              <div style={{width:46,height:46,borderRadius:"50%",background:mColor + '15',color:mColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:"bold",flexShrink:0}}>
                {mIcon}
              </div>
            );
          })()}
          <div style={{minWidth:0,flex:1}}>
            <h2 style={{fontSize:18,fontWeight:900,margin:0,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</h2>
            <div style={{fontSize:12,color:t.textSec,marginTop:2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
              <span style={{fontWeight:700,color:t.accent}}>{c.type==="pontos"?"Pontos Corridos":c.type==="mata"?"Mata-Mata":c.type==="liga"?"Liga":"Misto"}</span>
              <span>•</span>
              <span>{c.teams.length} times</span>
              {c.local && (
                <>
                  <span>•</span>
                  <span>📍 {c.local}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Abas locais do Campeonato */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${t.tabBorder}`,overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:20}}>
        {champTabs.map(tb => (
          <button
            key={tb}
            onClick={() => currentSetTab(tb)}
            style={S.tab(currentTab === tb)}
          >
            {tb === "nuvem" ? "🌐 Nuvem" : tb.charAt(0).toUpperCase() + tb.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid Container Responsivo (2 Colunas no Desktop) */}
      <div style={S.layoutContainer(isMobile)}>
        
        {/* COLUNA CENTRAL (Conteúdo Ativo) */}
        <div style={S.mainContent}>
          {champion && (
            <div style={{
              background: "linear-gradient(135deg, rgba(32, 226, 120, 0.1) 0%, rgba(212, 175, 55, 0.1) 100%)",
              border: "2px solid #D4AF37",
              borderRadius: 16,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.15) 0%, transparent 50%)",
                pointerEvents: "none"
              }} />
              
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, zIndex: 1}}>
                <div style={{display: "flex", alignItems: "center", gap: 12}}>
                  <span style={{fontSize: 34}}>🏆</span>
                  <div>
                    <div style={{fontSize: 10, fontWeight: 700, color: "#D4AF37", textTransform: "uppercase", letterSpacing: 1.5}}>Campeão Declarado</div>
                    <div style={{fontSize: 22, fontWeight: 900, color: t.text}}>{champion}</div>
                  </div>
                </div>
                {artilheiro && (
                  <div style={{display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.06)", padding: "8px 14px", borderRadius: 14, border: '1px solid ' + t.cardBorder}}>
                    <span style={{fontSize: 22}}>⚽</span>
                    <div>
                      <div style={{fontSize: 9, fontWeight: 700, color: t.textSec, textTransform: "uppercase", letterSpacing: 0.5}}>Artilheiro</div>
                      <div style={{fontSize: 13, fontWeight: 700, color: t.text}}>{getPlayerName(artilheiro.atleta)}</div>
                      <div style={{fontSize: 11, color: t.textSec}}>{artilheiro.teamName} · <strong style={{color: "#378ADD"}}>{artilheiro.gols} gols</strong></div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{display: "flex", gap: 8, zIndex: 1, marginTop: 4}}>
                <button onClick={() => setShowCelebration(true)} style={{...S.btn("#D4AF37"), color: "#0F1116", fontWeight: 800, padding: "8px 16px", fontSize: 13, cursor: "pointer"}}>🎉 Celebrar Conquista</button>
              </div>
            </div>
          )}

          {/* Aba ativa */}
          {currentTab==="tabela"&&c.type==="pontos"&&(
             <div style={{display:"flex",flexDirection:"column",gap:16}}>
               <StandingsTable standings={c.standings} teams={c.teams} colorOf={colorOf} accent={t.accent} t={t} emblems={c.emblems}/>
               <ResumoArtilharia />
             </div>
          )}
          {currentTab==="tabela"&&c.type==="misto"&&(
             <div style={{display:"flex",flexDirection:"column",gap:20}}>
               {c.groups.map((g,gi)=><div key={gi} style={S.card}><h3 style={{fontSize:13,fontWeight:800,marginBottom:12,color:t.text,textTransform:"uppercase",letterSpacing:0.8}}>{g.name}{g.quadra ? ` (🏟️ ${g.quadra})` : ""}</h3><StandingsTable standings={g.standings} teams={c.teams} colorOf={colorOf} accent={t.accent} t={t} emblems={c.emblems}/></div>)}
               {c.mixedPhase==="groups"&&<button onClick={advanceMixed} style={S.btn(t.accent)}>Avançar para Mata-Mata →</button>}
               <ResumoArtilharia />
             </div>
          )}
          {currentTab==="tabela"&&c.type==="liga"&&(
             <div style={{display:"flex",flexDirection:"column",gap:20}}>
               {c.groups.map((g,gi)=><div key={gi} style={S.card}><h3 style={{fontSize:13,fontWeight:800,marginBottom:12,color:t.text,textTransform:"uppercase",letterSpacing:0.8}}>{g.name}{g.quadra ? ` (🏟️ ${g.quadra})` : ""}</h3><StandingsTable standings={g.standings} teams={c.teams} colorOf={colorOf} accent={t.accent} t={t} emblems={c.emblems}/></div>)}
               {c.mixedPhase==="groups"&&<button onClick={advanceMixed} style={S.btn(t.accent)}>Avançar para Mata-Mata →</button>}
               <ResumoArtilharia />
             </div>
          )}
          {currentTab==="chave"&&(c.type==="mata"||c.type==="misto"||c.type==="liga")&&renderKnockout()}
          {currentTab==="jogos"&&renderJogos()}
          {currentTab==="elencos" && <AbaElencos />}
          {currentTab==="estatísticas" && renderEstatisticas()}
          {currentTab==="solicitações" && c.allowOnlineReg && <AbaSolicitacoes />}
          {currentTab==="mural" && <AbaMuralOrganizador c={c} onUpdate={onUpdate} t={t} />}
          {currentTab==="galeria" && <AbaGaleriaOrganizador c={c} onUpdate={onUpdate} t={t} />}
          {currentTab==="colaboradores" && isDonoOuAdmin && (
            <AbaColaboradoresItem 
              collaborators={c.collaborators || []} 
              onSaveCollaborators={(novosColaboradores)=>onUpdate({ ...c, collaborators: novosColaboradores })} 
              auth={auth} 
              managers={managers} 
              assegurarManagerColaborador={assegurarManagerColaborador} 
              t={t} 
              scope="campeonato"
            />
          )}
          {currentTab==="configurações" && <AbaConfiguracoes />}
          {currentTab==="nuvem" && (
            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              <div style={S.card}>
                <h3 style={{fontSize:16,fontWeight:800,marginBottom:12,color:t.text,display:"flex",alignItems:"center",gap:8}}>
                  🌐 Compartilhar na Nuvem (Público)
                </h3>
                <p style={{fontSize:13,color:t.textSec,lineHeight:"1.5",marginBottom:16}}>
                  Por padrão, os dados do Thorneios ficam armazenados de forma 100% segura apenas no seu dispositivo. 
                  Ao publicar na nuvem, você gera um código e um link de acesso para que jogadores e torcedores acompanhem a tabela, rodadas, placares e artilharia em tempo real de qualquer outro dispositivo, sem precisar de login.
                </p>

                {c.npointId ? (
                  <div style={{display:"flex",flexDirection:"column",gap:16}}>
                    <div style={{background: t.bg, borderRadius:12, padding:14, border:'1px dashed ' + t.cardBorder, display:"flex", flexDirection:"column", gap:8}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
                        <span style={{color:t.textSec}}>Status de Sincronização:</span>
                        <strong style={{color:"#1D9E75"}}>● Ativo e Compartilhado</strong>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
                        <span style={{color:t.textSec}}>Última Sincronização:</span>
                        <strong style={{color:t.text}}>{c.lastPublished || "Desconhecida"}</strong>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
                        <span style={{color:t.textSec}}>Código do Campeonato:</span>
                        <strong style={{color:"#1D9E75",fontSize:16,fontFamily:"monospace",letterSpacing:0.5}}>{c.npointId}</strong>
                      </div>
                    </div>

                    <div>
                      <label style={S.label}>Link de Acesso do Público</label>
                      <div style={{display:"flex",gap:8,marginTop:6}}>
                        <input 
                          readOnly 
                          value={window.location.origin + window.location.pathname + "?c=" + c.npointId} 
                          style={{...S.input, flex:1, fontFamily:"monospace", fontSize:12, background:t.bg}} 
                        />
                        <button 
                          onClick={() => {
                            const link = window.location.origin + window.location.pathname + "?c=" + c.npointId;
                            navigator.clipboard.writeText(link);
                            alert("Link de acesso copiado para a área de transferência!");
                          }} 
                          style={S.btn("#378ADD")}
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button onClick={publicarNaNuvem} style={S.btn("#378ADD")}>
                    🚀 Publicar Agora na Nuvem
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA (Estatísticas no Desktop) */}
        {!isMobile && (
          <div style={S.sidebarRight(isMobile)}>
            {artilheiro && (
              <div style={S.card}>
                <div style={{fontSize:11,fontWeight:800,color:t.textSec,marginBottom:10,textTransform:"uppercase",letterSpacing:0.8}}>⚽ Artilheiro</div>
                <div style={{display:"flex",alignItems:"center",gap:12,marginTop:6}}>
                  <Avatar name={getPlayerName(artilheiro.atleta)} color={t.accent} size={36}/>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:t.text}}>{getPlayerName(artilheiro.atleta)}</div>
                    <div style={{fontSize:11,color:t.textSec,marginTop:2}}>{artilheiro.teamName}</div>
                    <div style={{fontSize:12,fontWeight:900,color:t.accent,marginTop:4}}>{artilheiro.gols} Gols Marcados</div>
                  </div>
                </div>
              </div>
            )}

            <div style={S.card}>
              <div style={{fontSize:11,fontWeight:800,color:t.textSec,marginBottom:10,textTransform:"uppercase",letterSpacing:0.8}}>🏟️ Local das Partidas</div>
              <div style={{fontSize:13,fontWeight:700,color:t.text}}>
                📍 {c.local || "Quadra Geral da Liga"}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {sumulaModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:400,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:16,color:t.text}}>📝 Súmula da Partida</div>
              <button onClick={()=>setSumulaModal(null)} style={{background:"none",border:"none",color:t.textSec,fontSize:20,cursor:"pointer"}}>✕</button>
            </div>

            <button 
              onClick={() => window.print()}
              style={{
                ...S.btn("#378ADD18", "#378ADD"),
                justifyContent: "center",
                marginBottom: 16,
                fontSize: 12,
                padding: "8px 12px",
                width: "100%",
                border: "1px dashed #378ADDaa"
              }}
            >
              🖨️ Exportar / Imprimir Súmula Física (A4)
            </button>
            
            <div style={{display:"flex",justifyContent:"center",gap:20,marginBottom:20}}>
              <div style={{textAlign:"center",fontWeight:700,color:t.text}}>{sumulaModal.m.home}<br/><span style={{fontSize:20,color:"#1D9E75"}}>{sumulaModal.m.homeScore}</span></div>
              <div style={{fontSize:20,fontWeight:700,color:t.textSec,marginTop:10}}>×</div>
              <div style={{textAlign:"center",fontWeight:700,color:t.text}}>{sumulaModal.m.away}<br/><span style={{fontSize:20,color:"#1D9E75"}}>{sumulaModal.m.awayScore}</span></div>
            </div>

            <div style={{flex:1,overflowY:"auto",paddingRight:4,display:"flex",flexDirection:"column",gap:16}}>
              {(() => {
                const suspended = getSuspendedPlayersForMatch(c, sumulaModal.eKey);
                return ["home","away"].map(side=>{
                   const tm = sumulaModal.m[side];
                   const rst = getRosterByTeamName(tm);
                   const tmRoster = (rst && rst.length > 0) ? rst : atletas.map(a=>a.id);
                   const evts = (sumulaModal.m.events||[]).filter(e=>e.teamName===tm);
                   return (
                     <div key={side} style={{border:`1px solid ${t.cardBorder}`,padding:10,borderRadius:12}}>
                       <div style={{fontWeight:800,color:colorOf(tm,c.teams),marginBottom:10,fontSize:13}}>{tm}</div>
                       <div style={{display:"flex",flexDirection:"column",gap:6}}>
                         {evts.map((e,i)=>{
                           const at = atletas.find(x=>String(x.id)===String(e.atletaId));
                           return (
                             <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:t.text,background:t.inputBg,padding:"6px 10px",borderRadius:8}}>
                               <span>{e.type==="gol"?"⚽":e.type==="amarelo"?"🟨":"🟥"}</span>
                               <PlayerAvatar atleta={at} size={18}/>
                               <span style={{flex:1}}>{getPlayerName(at) || `Atleta #${e.atletaId}`}</span>
                               <button onClick={()=>{
                                  const newEvts = [...(sumulaModal.m.events||[])];
                                  newEvts.splice(newEvts.indexOf(e),1);
                                  setSumulaModal(prev=>({...prev, m:{...prev.m, events:newEvts}}));
                               }} style={{background:"none",border:"none",color:"#E24B4A",cursor:"pointer",fontWeight:800}}>✕</button>
                             </div>
                           );
                         })}
                       </div>
                       <div style={{marginTop:10,display:"flex",gap:6}}>
                         <select id={`sel-${side}`} value={sumulaSelection[side]} onChange={e=>setSumulaSelection(prev=>({...prev,[side]:e.target.value}))} style={{...S.select,padding:"6px",fontSize:12,flex:1}}>
                           <option value="">Selecione o jogador...</option>
                           {tmRoster.map(id=>{
                             const at = atletas.find(x=>String(x.id)===String(id));
                             const isSuspended = suspended && suspended[id];
                             return (
                               <option key={id} value={id} disabled={!!isSuspended}>
                                 {getPlayerName(at) || `Atleta #${id}`} {isSuspended ? `(Suspenso - ${isSuspended}) ❌` : ""}
                               </option>
                             );
                           })}
                         </select>
                         <div style={{display:"flex",gap:4}}>
                           <button onClick={()=>{
                              const val = sumulaSelection[side]; if(!val)return;
                              const newEvts = [...(sumulaModal.m.events||[]), {id:Date.now()+Math.random(), type:"gol", atletaId:val, teamName:tm}];
                              setSumulaModal(prev=>({...prev, m:{...prev.m, events:newEvts}}));
                           }} style={{...S.btnSm("#378ADD22","#378ADD"),padding:"6px"}}>⚽</button>
                           <button onClick={()=>{
                              const val = sumulaSelection[side]; if(!val)return;
                              const newEvts = [...(sumulaModal.m.events||[]), {id:Date.now()+Math.random(), type:"amarelo", atletaId:val, teamName:tm}];
                              setSumulaModal(prev=>({...prev, m:{...prev.m, events:newEvts}}));
                           }} style={{...S.btnSm("#BA751722","#BA7517"),padding:"6px"}}>🟨</button>
                           <button onClick={()=>{
                              const val = sumulaSelection[side]; if(!val)return;
                              const newEvts = [...(sumulaModal.m.events||[]), {id:Date.now()+Math.random(), type:"vermelho", atletaId:val, teamName:tm}];
                              setSumulaModal(prev=>({...prev, m:{...prev.m, events:newEvts}}));
                           }} style={{...S.btnSm("#E24B4A22","#E24B4A"),padding:"6px"}}>🟥</button>
                         </div>
                       </div>
                     </div>
                   );
                });
              })()}
            </div>

            {/* Representantes das Equipes */}
            <div style={{border:`1px solid ${t.cardBorder}`,padding:12,borderRadius:12,display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
              <div style={{fontWeight:800,color:t.text,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                <span>🤝</span> Representantes das Equipes
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div>
                  <label style={{...S.label,fontSize:11,marginBottom:4}}>Representante Mandante ({sumulaModal.m.home})</label>
                  <input 
                    type="text" 
                    style={S.input} 
                    value={sumulaModal.m.homeRepresentative || ""} 
                    onChange={e => {
                      const val = e.target.value;
                      setSumulaModal(prev => ({
                        ...prev,
                        m: { ...prev.m, homeRepresentative: val }
                      }));
                    }} 
                    placeholder="Nome do representante"
                  />
                </div>
                <div>
                  <label style={{...S.label,fontSize:11,marginBottom:4}}>Representante Visitante ({sumulaModal.m.away})</label>
                  <input 
                    type="text" 
                    style={S.input} 
                    value={sumulaModal.m.awayRepresentative || ""} 
                    onChange={e => {
                      const val = e.target.value;
                      setSumulaModal(prev => ({
                        ...prev,
                        m: { ...prev.m, awayRepresentative: val }
                      }));
                    }} 
                    placeholder="Nome do representante"
                  />
                </div>
              </div>
            </div>

            {/* Registrar Nova Ocorrência */}
            <div style={{border:`1px solid ${t.cardBorder}`,padding:12,borderRadius:12,display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
              <div style={{fontWeight:800,color:t.text,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                <span>⚠️</span> Registrar Ocorrência / Observação
              </div>
              
              {/* Tipo de Ocorrência */}
              <div>
                <label style={{...S.label,fontSize:11,marginBottom:4}}>Tipo de Ocorrência</label>
                <select 
                  style={S.select} 
                  value={sumulaModal.newObs?.type || "Indisciplina"}
                  onChange={e => {
                    const val = e.target.value;
                    setSumulaModal(prev => ({
                      ...prev,
                      newObs: { ...(prev.newObs || { text: "", homeAthletes: [], awayAthletes: [] }), type: val }
                    }));
                  }}
                >
                  <option value="Indisciplina">Indisciplina</option>
                  <option value="Irregularidade">Irregularidade</option>
                  <option value="Reclamação">Reclamação</option>
                </select>
              </div>

              {/* Duas listas de atletas (uma por time) com checkboxes */}
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {["home", "away"].map(side => {
                  const teamName = sumulaModal.m[side];
                  const rst = getRosterByTeamName(teamName);
                  const rosterIds = (rst && rst.length > 0) ? rst : atletas.map(a => a.id);
                  const selectedList = side === "home" 
                    ? (sumulaModal.newObs?.homeAthletes || [])
                    : (sumulaModal.newObs?.awayAthletes || []);

                  return (
                    <div key={side} style={{flex:1,minWidth:140,border:`1px solid ${t.cardBorder}`,borderRadius:8,padding:6,background:t.card}}>
                      <div style={{fontSize:11,fontWeight:700,color:colorOf(teamName, c.teams),marginBottom:6,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4}}>
                        {side === "home" ? "Atletas Mandante" : "Atletas Visitante"}
                      </div>
                      <div style={{maxHeight:120,overflowY:"auto",display:"flex",flexDirection:"column",gap:4,paddingRight:2}}>
                        {rosterIds.map(id => {
                          const at = atletas.find(x => String(x.id) === String(id));
                          if (!at) return null;
                          const isChecked = selectedList.includes(id);
                          return (
                            <label key={id} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:t.text,cursor:"pointer",padding:"2px 4px",borderRadius:4,background:isChecked?t.inputBg:"transparent"}}>
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={() => {
                                  setSumulaModal(prev => {
                                    const currentObs = prev.newObs || { type: "Indisciplina", text: "", homeAthletes: [], awayAthletes: [] };
                                    const oldList = side === "home" ? (currentObs.homeAthletes || []) : (currentObs.awayAthletes || []);
                                    const newList = oldList.includes(id)
                                      ? oldList.filter(x => x !== id)
                                      : [...oldList, id];
                                    
                                    return {
                                      ...prev,
                                      newObs: {
                                        ...currentObs,
                                        [side === "home" ? "homeAthletes" : "awayAthletes"]: newList
                                      }
                                    };
                                  });
                                }}
                              />
                              <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{getPlayerName(at)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Texto da Ocorrência */}
              <div>
                <label style={{...S.label,fontSize:11,marginBottom:4}}>Descrição da Ocorrência</label>
                <textarea 
                  style={{...S.input,height:60,fontFamily:"inherit",fontSize:12,resize:"none"}}
                  value={sumulaModal.newObs?.text || ""}
                  onChange={e => {
                    const val = e.target.value;
                    setSumulaModal(prev => ({
                      ...prev,
                      newObs: { ...(prev.newObs || { type: "Indisciplina", homeAthletes: [], awayAthletes: [] }), text: val }
                    }));
                  }}
                  placeholder="Ex: Ofendeu o árbitro aos 10 minutos de jogo..."
                />
              </div>

              {/* Botão de Adicionar */}
              <button 
                onClick={() => {
                  const currentObs = sumulaModal.newObs || { type: "Indisciplina", text: "", homeAthletes: [], awayAthletes: [] };
                  if (!currentObs.text || !currentObs.text.trim()) {
                    alert("Por favor, digite uma descrição para a ocorrência.");
                    return;
                  }
                  const newObsItem = {
                    id: Date.now() + Math.random(),
                    type: currentObs.type || "Indisciplina",
                    text: currentObs.text.trim(),
                    homeAthletes: currentObs.homeAthletes || [],
                    awayAthletes: currentObs.awayAthletes || []
                  };
                  setSumulaModal(prev => ({
                    ...prev,
                    m: {
                      ...prev.m,
                      observations: [...(prev.m.observations || []), newObsItem]
                    },
                    newObs: { type: "Indisciplina", text: "", homeAthletes: [], awayAthletes: [] }
                  }));
                }}
                style={{...S.btn("#378ADD18","#378ADD"),justifyContent:"center",fontSize:11,padding:6}}
              >
                ＋ Adicionar Ocorrência
              </button>
            </div>

            {/* Lista de Ocorrências Cadastradas */}
            {sumulaModal.m.observations && sumulaModal.m.observations.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
                <div style={{fontWeight:700,fontSize:12,color:t.textSec}}>Ocorrências Registradas:</div>
                {sumulaModal.m.observations.map(obs => {
                  // Mapeia nomes dos atletas
                  const homeNames = (obs.homeAthletes || []).map(id => {
                    const at = atletas.find(x => String(x.id) === String(id));
                    return at ? (at.apelido || at.nome) : `Atleta #${id}`;
                  });
                  const awayNames = (obs.awayAthletes || []).map(id => {
                    const at = atletas.find(x => String(x.id) === String(id));
                    return at ? (at.apelido || at.nome) : `Atleta #${id}`;
                  });

                  // Cores por tipo
                  let badgeBg = "#BA751722";
                  let badgeColor = "#BA7517";
                  if (obs.type === "Irregularidade") {
                    badgeBg = "#E24B4A22";
                    badgeColor = "#E24B4A";
                  } else if (obs.type === "Reclamação") {
                    badgeBg = "#378ADD22";
                    badgeColor = "#378ADD";
                  }

                  return (
                    <div key={obs.id} style={{border:`1px solid ${t.cardBorder}`,padding:10,borderRadius:10,background:t.inputBg,display:"flex",flexDirection:"column",gap:6}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:10,fontWeight:800,background:badgeBg,color:badgeColor,padding:"2px 8px",borderRadius:6,textTransform:"uppercase"}}>
                          {obs.type}
                        </span>
                        <button 
                          onClick={() => {
                            const updatedObs = sumulaModal.m.observations.filter(x => x.id !== obs.id);
                            setSumulaModal(prev => ({
                              ...prev,
                              m: { ...prev.m, observations: updatedObs }
                            }));
                          }}
                          style={{background:"none",border:"none",color:"#E24B4A",cursor:"pointer",fontWeight:800,fontSize:12}}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{fontSize:12,color:t.text,lineHeight:"1.4",whiteSpace:"pre-wrap"}}>
                        {obs.text}
                      </div>
                      {(homeNames.length > 0 || awayNames.length > 0) && (
                        <div style={{borderTop:`1px dashed ${t.cardBorder}`,paddingTop:4,marginTop:2,fontSize:10,color:t.textSec,display:"flex",flexDirection:"column",gap:2}}>
                          {homeNames.length > 0 && (
                            <div><strong>{sumulaModal.m.home}:</strong> {homeNames.join(", ")}</div>
                          )}
                          {awayNames.length > 0 && (
                            <div><strong>{sumulaModal.m.away}:</strong> {awayNames.join(", ")}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            <div style={{marginTop:16}}>
              <button onClick={()=>handleSaveSumula(sumulaModal.m, sumulaModal.m.events||[])} style={{...S.btn(),width:"100%",justifyContent:"center"}}>Salvar Súmula</button>
            </div>
          </div>
        </div>
      )}

      {/* Súmula Oficial Formatada para Impressão A4 Física */}
      {renderPrintableSumula()}
    </div>
  );
}

/* ─────────────────────────── NOVO CAMPEONATO ────────────────────── */
function NovoCampeonato({quadras,onSave,onCancel,t}){
  const S=makeStyles(t);
  const[cf,setCf]=useState({
    name:"",
    type:"pontos",
    modalidade:"Futsal",
    turno:true,
    date:"",
    teams:["",""],
    groupCount:2,
    teamsPerGroup:4,
    groupsData:[],
    fee:0
  });

  const [importedAtletas, setImportedAtletas] = useState([]);
  const [importFeedback, setImportFeedback] = useState("");

  const handleImportPlanilha = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let rows;
      if (file.name.endsWith('.csv') || !text.trimStart().startsWith('<')) {
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
        rows = lines.map(line => line.split(',').map(cell => cell.startsWith('"') && cell.endsWith('"') ? cell.slice(1,-1).replace(/""/g,'"') : cell));
      } else {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const table = doc.querySelector("table");
        if (!table) throw new Error("O arquivo não contém uma tabela válida. Use o modelo CSV.");
        rows = Array.from(table.querySelectorAll("tr")).map(row => Array.from(row.querySelectorAll("th,td")).map(cell => cell.textContent || ""));
      }
      if (rows.length < 2) throw new Error("A tabela não contém dados de atletas.");
      const headers = rows[0].map(h => String(h).trim());
      const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell).trim() !== ""));

      const athletesList = [];
      const timesUnicosSet = new Set();

      dataRows.forEach((cells, index) => {
        const item = {};
        cells.forEach((value, idx) => {
          const key = headers[idx];
          if (!key) return;
          if (key === "customFields") {
            try {
              item.customFields = JSON.parse(value || "{}");
            } catch {
              item.customFields = {};
            }
            return;
          }
          if (key === "habilidade") {
            item.habilidade = Number(value) || 3;
            return;
          }
          if (key === "goleiro" || key === "ativo") {
            item[key] = String(value).trim().toLowerCase() === "true";
            return;
          }
          if (key === "id") {
            item.id = value ? Number(value) : undefined;
            return;
          }
          item[key] = value;
        });

        const timeAtleta = (item.time || item.grupo || "").trim();
        if (timeAtleta) {
          timesUnicosSet.add(timeAtleta);
        }

        athletesList.push({
          ...item,
          id: item.id || Date.now() + Math.floor(Math.random() * 100000) + index,
          habilidade: Number(item.habilidade) || 3,
          ativo: item.ativo !== false,
          goleiro: item.goleiro === true,
          grupo: timeAtleta,
          customFields: item.customFields && typeof item.customFields === "object" ? item.customFields : {},
        });
      });

      const timesUnicos = Array.from(timesUnicosSet);
      setImportedAtletas(athletesList);
      setImportFeedback(`Sucesso: ${athletesList.length} atleta(s) e ${timesUnicos.length} time(s) carregados da planilha.`);

      if (cf.type === "liga") {
        const totalTimes = timesUnicos.length;
        let gc = cf.groupCount;
        let tpg = cf.teamsPerGroup;

        if (totalTimes > 0) {
          gc = Math.max(2, Math.ceil(totalTimes / 4));
          tpg = Math.ceil(totalTimes / gc);
        }

        const activeQuadrasImport = quadras.filter(q => q.ativa);
        const newGroups = [];
        for (let i = 0; i < gc; i++) {
          const name = "Grupo " + (i + 1);
          const teams = [];
          for (let j = 0; j < tpg; j++) {
            const timeIdx = i * tpg + j;
            teams.push(timesUnicos[timeIdx] || "");
          }
          const autoQuadra = activeQuadrasImport.length > 0
            ? (activeQuadrasImport[i % activeQuadrasImport.length]?.nome || "")
            : "";
          newGroups.push({
            name: name,
            teams: teams,
            quadra: autoQuadra
          });
        }

        setCf(prev => ({
          ...prev,
          groupCount: gc,
          teamsPerGroup: tpg,
          groupsData: newGroups,
          teams: timesUnicos
        }));
      } else {
        setCf(prev => ({
          ...prev,
          teams: timesUnicos.length >= 2 ? timesUnicos : [...timesUnicos, ""]
        }));
      }

    } catch (error) {
      console.error("Erro na importação da planilha no campeonato:", error);
      alert("Erro ao ler planilha: " + (error.message || error));
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const downloadModeloPlanilha = () => {
    const headers = ["id", "nome", "apelido", "foto", "habilidade", "goleiro", "ativo", "documento", "dataNascimento", "numeroCamisa", "time", "celular1", "celular2", "foneResidencial", "email", "logradouro", "nomeVia", "cep", "complemento", "bairro", "nomeMae", "docFoto", "customFields"];
    const sample = {
      id: "",
      nome: "João Silva",
      apelido: "João",
      foto: "",
      habilidade: "3",
      goleiro: "false",
      ativo: "true",
      documento: "1234567",
      dataNascimento: "1990-01-01",
      numeroCamisa: "10",
      time: "Ex: Real Madrid",
      celular1: "11999999999",
      celular2: "",
      foneResidencial: "",
      email: "joao@email.com",
      logradouro: "Rua",
      nomeVia: "Das Flores",
      cep: "01001-000",
      complemento: "Apto 12",
      bairro: "Centro",
      nomeMae: "Maria Silva",
      docFoto: "",
      customFields: "{}"
    };
    const _csvLines = [headers.map(h => { const s = String(sample[h] ?? ''); return (s.includes(',') || s.includes('"')) ? '"' + s.replace(/"/g,'""') + '"' : s; }).join(',')];
    const csv = '\uFEFF' + [headers.map(h => h).join(','), ..._csvLines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `modelo-cadastro-atletas-campeonato.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  useEffect(() => {
    if (cf.type === "liga") {
      const gc = cf.groupCount || 2;
      const tpg = cf.teamsPerGroup || 4;
      const newGroups = [];
      const activeQuadras = quadras.filter(q => q.ativa);
      for (let i = 0; i < gc; i++) {
        const name = "Grupo " + (i + 1);
        const existing = cf.groupsData?.[i];
        const teams = [];
        for (let j = 0; j < tpg; j++) {
          teams.push(existing?.teams?.[j] || "");
        }
        const defaultQuadra = activeQuadras.length > 0 ? (activeQuadras[i % activeQuadras.length]?.nome || "") : "";
        newGroups.push({
          name: name,
          teams: teams,
          quadra: existing?.quadra !== undefined ? existing.quadra : defaultQuadra
        });
      }
      
      const same = cf.groupsData && cf.groupsData.length === newGroups.length &&
        cf.groupsData.every((g, gi) => g.teams.length === newGroups[gi].teams.length);
      if (!same) {
        setCf(prev => ({ ...prev, groupsData: newGroups }));
      }
    }
  }, [cf.type, cf.groupCount, cf.teamsPerGroup, quadras]);

  function criar(){
    if (cf.type === "liga") {
      const allTeamsList = cf.groupsData.flatMap(g => g.teams.map(t => t.trim()).filter(Boolean));
      if (allTeamsList.length < (cf.groupCount * 2)) {
        alert(`Preencha pelo menos ${cf.groupCount * 2} times no total (mínimo de 2 por grupo)!`);
        return;
      }
      if (new Set(allTeamsList).size !== allTeamsList.length) {
        alert("Não é permitido times duplicados no campeonato!");
        return;
      }
      
      // Embaralha de forma aleatória todos os times preenchidos
      const shuffledTeams = shuffleArray(allTeamsList);

      // Inicializa os grupos vazios
      const groups = cf.groupsData.map(g => ({
        name: g.name,
        teams: [],
        quadra: g.quadra
      }));

      // Distribui os times embaralhados de forma equilibrada (round-robin) nos grupos
      shuffledTeams.forEach((tm, i) => {
        const groupIdx = i % cf.groupCount;
        groups[groupIdx].teams.push(tm);
      });

      // Mapeia os grupos com suas respectivas rodadas e tabelas de classificação
      const finalGroups = groups.map(g => ({
        ...g,
        rounds: generateRR(g.teams, false),
        standings: initStandings(g.teams)
      }));
      
      let data = {
        id: Date.now(),
        name: cf.name || "Campeonato",
        type: "liga",
        modalidade: cf.modalidade || "Futsal",
        teams: shuffledTeams,
        date: cf.date,
        fee: Number(cf.fee || 0),
        groups: finalGroups,
        knockout: null,
        mixedPhase: "groups"
      };
      onSave(data, importedAtletas);
    } else {
      const teams=cf.teams.map(x=>x.trim()).filter(Boolean);
      if(teams.length<2){alert("Mínimo 2 times!");return;}
      if(new Set(teams).size!==teams.length){alert("Times duplicados!");return;}
      
      let data={id:Date.now(),name:cf.name||"Campeonato",type:cf.type,modalidade:cf.modalidade||"Futsal",teams,date:cf.date,fee:Number(cf.fee||0)};
      if(cf.type==="pontos"){data.rounds=generateRR(teams,cf.turno);data.standings=initStandings(teams);}
      else if(cf.type==="mata"){data.knockout=generateKO(teams);}
      else {
        const gc=Math.min(cf.groupCount,Math.floor(teams.length/2));
        const shuffledTeams = shuffleArray(teams); // Embaralha a lista plana de times
        const activeQuadras = quadras.filter(q => q.ativa);
        const groups=Array.from({length:gc},(_,i)=>({
          name:"Grupo "+(i+1),
          teams:[],
          quadra: activeQuadras.length > 0 ? (activeQuadras[i % activeQuadras.length]?.nome || "") : ""
        }));
        shuffledTeams.forEach((tm,i)=>groups[i%gc].teams.push(tm));
        
        data.teams = shuffledTeams; // Salva na ordem embaralhada
        data.groups=groups.map(g=>({...g,rounds:generateRR(g.teams,false),standings:initStandings(g.teams)}));
        data.knockout=null;
        data.mixedPhase="groups";
      }
      onSave(data, importedAtletas);
    }
  }

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div><label style={S.label}>Nome</label><input style={S.input} value={cf.name} onChange={e=>setCf(v=>({...v,name:e.target.value}))} placeholder="Ex: Copa da Várzea"/></div>
        <div><label style={S.label}>Data</label><input style={S.input} type="date" value={cf.date} onChange={e=>setCf(v=>({...v,date:e.target.value}))}/></div>
      </div>

      <div>
        <label style={S.label}>Esporte / Modalidade</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>
          {MODALIDADES_ESPORTIVAS.map(m => (
            <button key={m.id} onClick={()=>setCf(f=>({...f,modalidade:m.id}))}
              style={{padding:"8px 14px",borderRadius:20,border:`2px solid ${cf.modalidade===m.id?m.color:t.inputBorder}`,
                background:cf.modalidade===m.id?m.color+"22":t.inputBg,
                color:cf.modalidade===m.id?m.color:t.textSec,cursor:"pointer",
                fontWeight:cf.modalidade===m.id?700:500,fontSize:13,transition:"all 0.15s"
              }}
            >{m.icon} {m.label}</button>
          ))}
        </div>
      </div>

      <div>
        <label style={S.label}>Tipo de Torneio</label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(80px, 1fr))",gap:8}}>
          {[["pontos","Pontos Corridos"],["mata","Mata-Mata"],["misto","Misto"],["liga","Liga (Grupos + Mata)"]].map(([v,l])=>(
            <button key={v} onClick={()=>setCf(f=>({...f,type:v}))} style={{padding:"10px 4px",borderRadius:10,border:`2px solid ${cf.type===v?"#1D9E75":t.inputBorder}`,background:cf.type===v?"#1D9E7522":t.inputBg,color:cf.type===v?"#1D9E75":t.text,cursor:"pointer",fontWeight:cf.type===v?700:400,fontSize:12}}>{l}</button>
          ))}
        </div>
      </div>
      
      {cf.type==="pontos"&&<label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:t.text}}><input type="checkbox" checked={cf.turno} onChange={e=>setCf(v=>({...v,turno:e.target.checked}))}/>Turno e returno</label>}
      
      {cf.type==="misto"&&<div style={{display:"flex",gap:10,alignItems:"center"}}><label style={{fontSize:13,color:t.textSec}}>Grupos:</label><input type="number" min={2} max={8} value={cf.groupCount} onChange={e=>setCf(v=>({...v,groupCount:Number(e.target.value)}))} style={{...S.input,width:60}}/></div>}
      
      {cf.type==="liga"&& (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <label style={S.label}>Quantidade de Chaves/Grupos</label>
            <input type="number" min={2} max={16} value={cf.groupCount} onChange={e=>setCf(v=>({...v,groupCount:Math.max(2, Number(e.target.value))}))} style={S.input}/>
          </div>
          <div>
            <label style={S.label}>Times por Chave/Grupo</label>
            <input type="number" min={2} max={20} value={cf.teamsPerGroup} onChange={e=>setCf(v=>({...v,teamsPerGroup:Math.max(2, Number(e.target.value))}))} style={S.input}/>
          </div>
        </div>
      )}

      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><label style={S.label}>Taxa de inscrição por atleta (R$)</label><input type="number" min={0} value={cf.fee} onChange={e=>setCf(v=>({...v,fee:Number(e.target.value)}))} style={{...S.input,width:180}}/></div>
      </div>

      <div style={{...S.card, padding: 14, border: `1px solid ${t.cardBorder}`, background: t.cardBg || t.inputBg, display: "flex", flexDirection: "column", gap: 10, borderRadius: 8}}>
        <div style={{fontSize: 13, fontWeight: 700, color: t.text}}>📥 Importar Atletas & Times por Planilha (Opcional)</div>
        <div style={{fontSize: 11, color: t.textSec, lineHeight: "1.4"}}>
          Selecione uma planilha de atletas com a coluna <strong>time</strong> para criar o campeonato com os times e atletas já cadastrados e vinculados.
        </div>
        <div style={{display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center"}}>
          <button 
            type="button" 
            onClick={downloadModeloPlanilha} 
            style={{...S.btnSm("#20E27815", t.accent), display: "flex", alignItems: "center", gap: 6, border: `1px solid ${t.accent}`, background: "transparent", color: t.accent, cursor: "pointer", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600}}
          >
            <span>📄</span> Baixar Modelo CSV
          </button>
          <label 
            style={{
              padding: "6px 12px", 
              borderRadius: 6, 
              background: "#20E27822", 
              color: t.accent, 
              cursor: "pointer", 
              fontSize: 12, 
              fontWeight: 600, 
              display: "flex", 
              alignItems: "center", 
              gap: 6, 
              border: `1px solid ${t.accent}`
            }}
          >
            <span>📥</span> Carregar Planilha
            <input type="file" accept=".csv,.xls,.xlsx" style={{display: "none"}} onChange={handleImportPlanilha} />
          </label>
        </div>
        {importFeedback && (
          <div style={{fontSize: 12, color: "#1D9E75", fontWeight: 600, display: "flex", alignItems: "center", gap: 6}}>
            <span>✅</span> {importFeedback}
          </div>
        )}
      </div>

      <div>
        {cf.type==="liga" ? (
          <div>
            <label style={{...S.label, marginBottom:10, display:"block"}}>Grupos e Quadras</label>
            <div style={{display:"flex",flexDirection:"column",gap:16,marginTop:8}}>
              {cf.groupsData && cf.groupsData.map((g, gi) => (
                <div key={gi} style={{...S.card,padding:14,border:`1px solid ${t.cardBorder}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
                    <h4 style={{margin:0,fontSize:14,fontWeight:700,color:t.text}}>{g.name}</h4>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <label style={{fontSize:12,color:t.textSec,margin:0}}>Quadra:</label>
                      <select 
                        value={g.quadra || ""} 
                        onChange={e => {
                          const val = e.target.value;
                          setCf(prev => {
                            const newGData = [...prev.groupsData];
                            newGData[gi] = { ...newGData[gi], quadra: val };
                            return { ...prev, groupsData: newGData };
                          });
                        }}
                        style={{...S.input,width:160,padding:"4px 8px",fontSize:12,height:"auto"}}
                      >
                        <option value="">Sem Quadra</option>
                        {quadras.filter(q => q.ativa).map(q => (
                          <option key={q.id} value={q.nome}>{q.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {g.teams && g.teams.map((tm, ti) => {
                      const absoluteIndex = gi * (cf.teamsPerGroup || 4) + ti;
                      return (
                        <div key={ti} style={{display:"flex",alignItems:"center",gap:8}}>
                          <Avatar name={tm || String(ti+1)} color={COLORS[absoluteIndex % COLORS.length]} size={28}/>
                          <input 
                            value={tm} 
                            onChange={e => {
                              const val = e.target.value;
                              setCf(prev => {
                                const newGData = [...prev.groupsData];
                                const newTeams = [...newGData[gi].teams];
                                newTeams[ti] = val;
                                newGData[gi] = { ...newGData[gi], teams: newTeams };
                                return { ...prev, groupsData: newGData };
                              });
                            }} 
                            placeholder={`Time ${ti+1}`} 
                            style={{...S.input,flex:1,padding:"6px 10px",fontSize:12}}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><label style={S.label}>Times ({cf.teams.filter(Boolean).length})</label><button onClick={()=>setCf(f=>({...f,teams:[...f.teams,""]}))} style={S.btnSm("#1D9E7522","#1D9E75")}>+ Time</button></div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {cf.teams.map((tm,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                  <Avatar name={tm||String(i+1)} color={COLORS[i%COLORS.length]} size={32}/>
                  <input value={tm} onChange={e=>{const ts=[...cf.teams];ts[i]=e.target.value;setCf(f=>({...f,teams:ts}));}} placeholder={`Time ${i+1}`} style={{...S.input,flex:1}}/>
                  {cf.teams.length>2&&<button onClick={()=>setCf(f=>({...f,teams:f.teams.filter((_,j)=>j!==i)}))} style={{fontSize:18,border:"none",background:"none",color:t.textSec,cursor:"pointer",padding:"0 4px"}}>×</button>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{display:"flex",gap:8}}>
        <button onClick={criar} style={{...S.btn(),flex:1,justifyContent:"center"}}>Criar Campeonato 🏆</button>
        <button onClick={onCancel} style={S.btn(t.card,t.textSec)}>Cancelar</button>
      </div>
    </div>
  );
}

/* ─────────────────────────── APP ROOT ───────────────────────────── */
export default function App(){
  const{dark,setDark,t:themeBase}=useTheme();
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : false);


  
  const [fontScale, setFontScale] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_font_scale");
      return saved !== null ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.remove("scale-115", "scale-130", "scale-145");
      if (fontScale === 1.15) document.body.classList.add("scale-115");
      else if (fontScale === 1.30) document.body.classList.add("scale-130");
      else if (fontScale === 1.45) document.body.classList.add("scale-145");
    }
  }, [fontScale]);

  const toggleFontScale = () => {
    setFontScale(prev => {
      let next = 1.0;
      if (prev === 1.0) next = 1.15;
      else if (prev === 1.15) next = 1.30;
      else if (prev === 1.30) next = 1.45;
      else next = 1.0;
      
      localStorage.setItem("app_font_scale", String(next));
      return next;
    });
  };
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem("system_accent") || "#20E278";
  });
  const changeAccentColor = (color) => {
    setAccentColor(color);
    localStorage.setItem("system_accent", color);
  };
  const t = { ...themeBase, accent: accentColor, changeAccentColor };
  const S=makeStyles(t);

  // ── ESTADOS E COMPONENTES DO MENU GLOBAL (LAYOUT SIMPLIFICADO) ─
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeChampTab, setActiveChampTab] = useState("jogos");
  const [activePeladaTab, setActivePeladaTab] = useState("info");
  const [expandMenuHome, setExpandMenuHome] = useState(false);
  const [selectedFinanceChamp, setSelectedFinanceChamp] = useState("geral");

  const GEHeader = () => {
    let subBarTitle = "Thorneios";
    let links = [];
    const isGlobalScreen = ["home", "atletas", "quadras", "financeiro", "backup", "managerRegistry", "novoChamp", "novaPelada"].includes(screen);
    if (isGlobalScreen) {
      subBarTitle = "Painel Geral";
      links = [
        { label: "Início", active: screen === "home", onClick: () => setScreen("home") },
        { label: "Atletas", active: screen === "atletas", onClick: () => setScreen("atletas") },
        { label: "Quadras", active: screen === "quadras", onClick: () => setScreen("quadras") },
        { label: "Financeiro", active: screen === "financeiro", onClick: () => setScreen("financeiro") },
        { label: "Backup", active: screen === "backup", onClick: () => setScreen("backup") },
      ];
      if (auth.role === "adm") {
        links.push({ label: "Gestores", active: screen === "managerRegistry", onClick: () => setScreen("managerRegistry") });
      }
    } else if (screen === "gerenciarChamp" && current) {
      const c = campeonatos.find(x => x.id === current.id) || current;
      subBarTitle = c.name;
      const champTabs = [
        "elencos",
        ...(c.type === "pontos" ? ["tabela", "jogos"] : c.type === "mata" ? ["chave", "jogos"] : ["tabela", "chave", "jogos"]),
        "estatísticas"
      ];
      if (c.allowOnlineReg) {
        champTabs.push("solicitações");
      }
      champTabs.push("mural", "galeria", "configurações", "nuvem");
      links = [
        { label: "← Voltar", active: false, onClick: () => setScreen("home"), style: { color: "#E24B4A", fontWeight: "900" } },
        ...champTabs.map(tb => ({
          label: tb === "nuvem" ? "🌐 Nuvem" : tb.charAt(0).toUpperCase() + tb.slice(1),
          active: activeChampTab === tb,
          onClick: () => setActiveChampTab(tb)
        }))
      ];
    } else if (screen === "gerenciarPelada" && current) {
      const p = peladas.find(x => x.id === current.id) || current;
      subBarTitle = p.nome;
      const pelAbas = [
        { id: "info", label: "Sorteio" },
        { id: "datas", label: "Datas" },
        { id: "atletas", label: "Atletas" },
        { id: "participações", label: "Presenças" }
      ];
      links = [
        { label: "← Voltar", active: false, onClick: () => setScreen("home"), style: { color: "#E24B4A", fontWeight: "900" } },
        ...pelAbas.map(ab => ({
          label: ab.label,
          active: activePeladaTab === ab.id,
          onClick: () => setActivePeladaTab(ab.id)
        }))
      ];
    }
    return (
      <div style={{width: "100%", zIndex: 1000, display: "flex", flexDirection: "column"}}>
        {/* Barra Superior Principal */}
        <div style={{
          backgroundColor: "#06AA48",
          height: 48,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          position: "relative",
          zIndex: 1002
        }}>
          <div style={{
            width: "100%",
            maxWidth: "1200px",
            height: "100%",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            boxSizing: "border-box"
          }}>
            <div style={{display: "flex", alignItems: "center", gap: 14}}>
              <button 
                onClick={() => setMenuOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 8px",
                  borderRadius: 4,
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: "800",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}
              >
                <span style={{fontSize: 16}}>☰</span>
                <span style={{display: isMobile ? "none" : "inline"}}>MENU</span>
              </button>
              <div style={{height: 20, width: 1, backgroundColor: "rgba(255,255,255,0.2)"}} />
              <div 
                onClick={() => setScreen("home")}
                style={{
                  fontSize: 18,
                  fontWeight: "900",
                  color: "#fff",
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: "0.5px",
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                Thorneios
              </div>
            </div>
            <div style={{display: "flex", alignItems: "center", gap: 12}}>
              {!isMobile && (
                <span style={{fontSize: 12, color: "#fff", opacity: 0.9, fontFamily: "'Outfit', sans-serif"}}>
                  Olá, <strong>{auth.name || "Gestor"}</strong>
                </span>
              )}
              <FontScaleBtn />
              <DarkBtn />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const GEDrawer = () => {
    if (!menuOpen) return null;
    return (
      <div style={{position: "fixed", inset: 0, zIndex: 10000}}>
        <div 
          onClick={() => setMenuOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            transition: "opacity 0.3s ease"
          }} 
        />
        <div style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 280,
          backgroundColor: t.card,
          borderRight: "1px solid " + t.cardBorder,
          boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Outfit', sans-serif"
        }}>
          <div style={{
            height: 48,
            backgroundColor: "#06AA48",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            color: "#fff"
          }}>
            <div style={{fontSize: 20, fontWeight: "900", letterSpacing: "0.5px"}}>
              Thorneios
            </div>
            <button 
              onClick={() => setMenuOpen(false)}
              style={{background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: 4}}
            >
              ✕
            </button>
          </div>
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 0",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <div>
              <div style={{fontSize: 10, fontWeight: "900", color: t.textSec, padding: "0 20px 8px 20px", textTransform: "uppercase", letterSpacing: "1px"}}>Painel Administrativo</div>
              <div style={{display: "flex", flexDirection: "column"}}>
                {[
                  { label: "Início / Home", icon: "🏠", active: screen === "home", onClick: () => { setScreen("home"); setMenuOpen(false); } },
                  { label: "Atletas Campeonato", icon: "👤", active: screen === "atletas", onClick: () => { setScreen("atletas"); setMenuOpen(false); } },
                  { label: "Quadras / Campos", icon: "🏟️", active: screen === "quadras", onClick: () => { setScreen("quadras"); setMenuOpen(false); } },
                  { label: "Caixa Financeiro", icon: "💰", active: screen === "financeiro", onClick: () => { setScreen("financeiro"); setMenuOpen(false); } },
                  { label: "Importar / Exportar (Backup)", icon: "💾", active: screen === "backup", onClick: () => { setScreen("backup"); setMenuOpen(false); } },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={item.onClick}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 20px",
                      width: "100%",
                      textAlign: "left",
                      background: item.active ? "rgba(6, 170, 72, 0.08)" : "transparent",
                      border: "none",
                      borderLeft: `4px solid ${item.active ? "#06AA48" : "transparent"}`,
                      color: item.active ? "#06AA48" : t.text,
                      fontWeight: item.active ? "800" : "600",
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <span style={{fontSize: 15}}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize: 10, fontWeight: "900", color: t.textSec, padding: "0 20px 8px 20px", textTransform: "uppercase", letterSpacing: "1px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <span>Minhas Ligas ({campeonatos.length})</span>
                <button onClick={() => { setScreen("novoChamp"); setMenuOpen(false); }} style={{background: "none", border: "none", color: "#06AA48", fontWeight: "900", cursor: "pointer", fontSize: 11, padding: 0}}>+ Nova</button>
              </div>
              <div style={{display: "flex", flexDirection: "column", maxHeight: 180, overflowY: "auto"}}>
                {campeonatos.map(c => {
                  const mDef = MODALIDADES_ESPORTIVAS.find(x => x.id === c.modalidade);
                  const mIcon = mDef ? mDef.icon : "🏆";
                  const isCur = screen === "gerenciarChamp" && current?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setCurrent(c); setScreen("gerenciarChamp"); setMenuOpen(false); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 20px",
                        width: "100%",
                        textAlign: "left",
                        background: isCur ? "rgba(6, 170, 72, 0.08)" : "transparent",
                        border: "none",
                        borderLeft: `4px solid ${isCur ? "#06AA48" : "transparent"}`,
                        color: isCur ? "#06AA48" : t.text,
                        fontWeight: isCur ? "800" : "550",
                        fontSize: 12.5,
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <span style={{fontSize: 13}}>{mIcon}</span>
                      <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1}}>{c.name}</span>
                    </button>
                  );
                })}
                {campeonatos.length === 0 && <div style={{fontSize: 11, color: t.textSec, fontStyle: "italic", padding: "4px 20px"}}>Nenhum campeonato.</div>}
              </div>
            </div>
            <div>
              <div style={{fontSize: 10, fontWeight: "900", color: t.textSec, padding: "0 20px 8px 20px", textTransform: "uppercase", letterSpacing: "1px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <span>Minhas Peladas ({peladas.length})</span>
                <button onClick={() => { setScreen("novaPelada"); setMenuOpen(false); }} style={{background: "none", border: "none", color: "#378ADD", fontWeight: "900", cursor: "pointer", fontSize: 11, padding: 0}}>+ Nova</button>
              </div>
              <div style={{display: "flex", flexDirection: "column", maxHeight: 150, overflowY: "auto"}}>
                {peladas.map(p => {
                  const isCur = screen === "gerenciarPelada" && current?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setCurrent(p); setScreen("gerenciarPelada"); setMenuOpen(false); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 20px",
                        width: "100%",
                        textAlign: "left",
                        background: isCur ? "rgba(55, 138, 221, 0.08)" : "transparent",
                        border: "none",
                        borderLeft: `4px solid ${isCur ? "#378ADD" : "transparent"}`,
                        color: isCur ? "#378ADD" : t.text,
                        fontWeight: isCur ? "800" : "550",
                        fontSize: 12.5,
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <span style={{fontSize: 13}}>👟</span>
                      <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1}}>{p.nome}</span>
                    </button>
                  );
                })}
                {peladas.length === 0 && <div style={{fontSize: 11, color: t.textSec, fontStyle: "italic", padding: "4px 20px"}}>Nenhuma pelada.</div>}
              </div>
            </div>
          </div>
          <div style={{
            borderTop: "1px solid " + t.cardBorder,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            backgroundColor: t.bg
          }}>
            {auth.role === "adm" && (
              <button onClick={() => { setScreen("managerRegistry"); setMenuOpen(false); }} style={{...S.btnSm(t.card, t.text), justifyContent: "center", fontSize: 12, fontWeight: "700"}}>👥 Gestores da Liga</button>
            )}
            <div style={{display: "flex", gap: 6}}>
              <button onClick={() => { setModalPassword(true); setMenuOpen(false); }} style={{...S.btnSm(t.card, t.text), flex: 1, justifyContent: "center", fontSize: 11.5, fontWeight: "700"}}>🔐 Senha</button>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} style={{...S.btnSm("#E24B4A22", "#E24B4A"), flex: 1, justifyContent: "center", fontSize: 11.5, fontWeight: "800"}}>🚪 Sair</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── SIDEBAR PERMANENTE (Desktop) ──────────────────────────────── */
  const PermanentSidebar = () => {
    if (isMobile) return null;
    const navItems = [
      { label: "Início", icon: "🏠", screen: "home" },
      { label: "Atletas", icon: "👤", screen: "atletas" },
      { label: "Quadras / Campos", icon: "🏟️", screen: "quadras" },
      { label: "Financeiro", icon: "💰", screen: "financeiro" },
      { label: "Backup", icon: "💾", screen: "backup" },
      ...(auth.role === "adm" ? [{ label: "Gestores", icon: "👥", screen: "managerRegistry" }] : []),
    ];

    const avatarLetter = (auth.name || "U")[0].toUpperCase();

    return (
      <div style={{
        width: 240,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid " + t.cardBorder,
        backgroundColor: t.card,
        height: "100%",
        overflowY: "auto",
        fontFamily: "'Outfit', sans-serif",
        gap: 0,
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        maxHeight: "calc(100vh - 88px)",
      }}>
        {/* Perfil do usuário */}
        <div style={{
          padding: "16px 14px",
          borderBottom: "1px solid " + t.cardBorder,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #06AA48, #20E278)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 18,
            color: "#fff",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(6,170,72,0.3)"
          }}>
            {avatarLetter}
          </div>
          <div style={{minWidth: 0, flex: 1}}>
            <div style={{fontSize: 13, fontWeight: 800, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
              {auth.name || "Gestor"}
            </div>
            <div style={{fontSize: 10, color: t.textSec, marginTop: 1, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700}}>
              {auth.role === "adm" ? "⚡ Administrador" : "📋 Gestor"}
            </div>
          </div>
        </div>

        {/* Navegação Principal */}
        <div style={{padding: "10px 0"}}>
          <div style={{fontSize: 9, fontWeight: 900, color: t.textSec, padding: "0 14px 6px 14px", textTransform: "uppercase", letterSpacing: 1.2}}>
            Menu
          </div>
          {navItems.map((item) => {
            const isActive = screen === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => setScreen(item.screen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 14px",
                  width: "100%",
                  textAlign: "left",
                  background: isActive ? "#06AA4812" : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${isActive ? "#06AA48" : "transparent"}`,
                  color: isActive ? "#06AA48" : t.text,
                  fontWeight: isActive ? 800 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = t.inputBg; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; } }}
              >
                <span style={{fontSize: 14, flexShrink: 0}}>{item.icon}</span>
                <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Campeonatos */}
        <div style={{padding: "0 0 8px 0", borderTop: "1px solid " + t.cardBorder}}>
          <div style={{
            fontSize: 9, fontWeight: 900, color: t.textSec,
            padding: "10px 14px 6px 14px", textTransform: "uppercase", letterSpacing: 1.2,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span>Ligas ({campeonatos.length})</span>
            <button onClick={() => setScreen("novoChamp")} style={{background: "none", border: "none", color: "#06AA48", fontWeight: 900, cursor: "pointer", fontSize: 11, padding: 0, fontFamily: "'Outfit', sans-serif"}}>
              + Nova
            </button>
          </div>
          <div style={{maxHeight: 180, overflowY: "auto"}}>
            {campeonatos.map(c2 => {
              const mDef = MODALIDADES_ESPORTIVAS.find(x => x.id === c2.modalidade);
              const mIcon = mDef ? mDef.icon : "🏆";
              const isCur = screen === "gerenciarChamp" && current?.id === c2.id;
              return (
                <button
                  key={c2.id}
                  onClick={() => { setCurrent(c2); setScreen("gerenciarChamp"); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 14px",
                    width: "100%", textAlign: "left",
                    background: isCur ? "#06AA4812" : "transparent",
                    border: "none",
                    borderLeft: `3px solid ${isCur ? "#06AA48" : "transparent"}`,
                    color: isCur ? "#06AA48" : t.text,
                    fontWeight: isCur ? 800 : 500,
                    fontSize: 12, cursor: "pointer",
                    fontFamily: "'Outfit', sans-serif",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => { if (!isCur) e.currentTarget.style.background = t.inputBg; }}
                  onMouseLeave={e => { if (!isCur) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{fontSize: 12, flexShrink: 0}}>{mIcon}</span>
                  <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1}}>{c2.name}</span>
                </button>
              );
            })}
            {campeonatos.length === 0 && (
              <div style={{fontSize: 11, color: t.textSec, fontStyle: "italic", padding: "4px 14px"}}>Nenhuma liga.</div>
            )}
          </div>
        </div>

        {/* Peladas */}
        <div style={{padding: "0 0 8px 0", borderTop: "1px solid " + t.cardBorder}}>
          <div style={{
            fontSize: 9, fontWeight: 900, color: t.textSec,
            padding: "10px 14px 6px 14px", textTransform: "uppercase", letterSpacing: 1.2,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span>Peladas ({peladas.length})</span>
            <button onClick={() => setScreen("novaPelada")} style={{background: "none", border: "none", color: "#378ADD", fontWeight: 900, cursor: "pointer", fontSize: 11, padding: 0, fontFamily: "'Outfit', sans-serif"}}>
              + Nova
            </button>
          </div>
          <div style={{maxHeight: 140, overflowY: "auto"}}>
            {peladas.map(p2 => {
              const isCur = screen === "gerenciarPelada" && current?.id === p2.id;
              return (
                <button
                  key={p2.id}
                  onClick={() => { setCurrent(p2); setScreen("gerenciarPelada"); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 14px",
                    width: "100%", textAlign: "left",
                    background: isCur ? "#378ADD12" : "transparent",
                    border: "none",
                    borderLeft: `3px solid ${isCur ? "#378ADD" : "transparent"}`,
                    color: isCur ? "#378ADD" : t.text,
                    fontWeight: isCur ? 800 : 500,
                    fontSize: 12, cursor: "pointer",
                    fontFamily: "'Outfit', sans-serif",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => { if (!isCur) e.currentTarget.style.background = t.inputBg; }}
                  onMouseLeave={e => { if (!isCur) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{fontSize: 12, flexShrink: 0}}>👟</span>
                  <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1}}>{p2.nome}</span>
                </button>
              );
            })}
            {peladas.length === 0 && (
              <div style={{fontSize: 11, color: t.textSec, fontStyle: "italic", padding: "4px 14px"}}>Nenhuma pelada.</div>
            )}
          </div>
        </div>

        {/* Rodapé da Sidebar */}
        <div style={{marginTop: "auto", borderTop: "1px solid " + t.cardBorder, padding: "10px 10px", display: "flex", flexDirection: "column", gap: 6}}>
          <button onClick={() => setModalPassword(true)} style={{...S.btnSm(t.inputBg, t.textSec), justifyContent: "center", fontSize: 11.5, width: "100%"}}>
            🔐 Alterar Senha
          </button>
          <button onClick={handleLogout} style={{...S.btnSm("#E24B4A22", "#E24B4A"), justifyContent: "center", fontSize: 11.5, width: "100%", fontWeight: 800}}>
            🚪 Sair
          </button>
        </div>
      </div>
    );
  };

  const renderComLayout = (conteudo) => {
    const layout = isMobile ? (
      <div style={{display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: t.bg}}>
        <GEHeader />
        <GEDrawer />
        <div style={{flex: 1, padding: "10px", boxSizing: "border-box"}}>
          {conteudo}
        </div>
      </div>
    ) : (
      <div style={{display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: t.bg}}>
        <GEHeader />
        <GEDrawer />
        <div style={{flex: 1, display: "flex", maxWidth: "1200px", width: "100%", margin: "0 auto", boxSizing: "border-box", alignItems: "flex-start", gap: 0}}>
          <PermanentSidebar />
          <div style={{flex: 1, minWidth: 0, padding: "16px 20px", overflowX: "hidden"}}>
            {conteudo}
          </div>
        </div>
      </div>
    );

    return (
      <>
        {layout}
        {cloudConflict && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
            <div style={{...S.card,width:"100%",maxWidth:400,textAlign:"center"}}>
              <div style={{fontSize:45,marginBottom:12}}>⚠️</div>
              <h3 style={{fontSize:16,fontWeight:800,color:t.text,margin:"0 0 8px 0"}}>Conflito de Dados Detectado!</h3>
              <p style={{fontSize:13,color:t.textSec,lineHeight:1.5,marginBottom:20}}>
                Outro aparelho atualizou os dados na nuvem em um horário mais recente do que a última sincronização deste dispositivo.
                <br/><br/>
                <b>Nuvem:</b> Atualizado em {new Date(cloudConflict.nuvemTime).toLocaleString("pt-BR")} por <b>{cloudConflict.updatedBy}</b>.
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <button 
                  onClick={async () => {
                    setAppState(cloudConflict.payload);
                    localStorage.setItem("last_sync_time", String(new Date(cloudConflict.nuvemTime).getTime()));
                    setCloudConflict(null);
                    alert("Dados da nuvem carregados com sucesso! 🚀");
                  }}
                  style={S.btn("#1D9E75")}
                >
                  📥 Carregar Dados da Nuvem (Recomendado)
                </button>
                <button 
                  onClick={async () => {
                    if (confirm("Atenção: Isso irá apagar a versão mais recente que está na nuvem e salvar os dados locais por cima. Tem certeza?")) {
                      try {
                        setCloudLoading(true);
                        const docKey = (auth.role === "adm" || auth.role === "manager") ? "admin_data" : `manager_${auth.manager_id || "unknown"}`;
                        const payload = {
                          appState: appState,
                          lastUpdated: new Date().toISOString(),
                          updatedBy: auth.name || "Sem Nome"
                        };
                        const cleanPayload = JSON.parse(JSON.stringify(payload));
                        await setDoc(doc(db, "sistema", docKey), cleanPayload);
                        localStorage.setItem("last_sync_time", String(new Date(payload.lastUpdated).getTime()));
                        setCloudConflict(null);
                        alert("Dados locais salvos na nuvem com sucesso! 🚀");
                      } catch (err) {
                        alert("Erro ao salvar dados locais na nuvem: " + err.message);
                      } finally {
                        setCloudLoading(false);
                      }
                    }
                  }}
                  style={S.btnSm("#E24B4A22", "#E24B4A")}
                >
                  🚀 Sobrescrever Nuvem com meus Dados Locais
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };


  // ── Estado Global (Salvo em localStorage) ─────────────────────
  const initialAppState = {
    campeonatos: [],
    peladas: [],
    datasRealizacao: [],
    atletas: [],
    atletasCampeonato: [],
    quadras: [],
    participacoes: [],
    financeiro: { entries: [] },
    managers: [],
    adminPassword: "1204110411",
  };
  
  const [appState, setAppState, loading] = useLocalStorage(initialAppState);

  // Getters com Fallback (Segurança extra contra tela branca)
  const allCampeonatos = Array.isArray(appState?.campeonatos) ? appState.campeonatos : [];
  const allPeladas = Array.isArray(appState?.peladas) ? appState.peladas : [];
  const datasRealizacao = Array.isArray(appState?.datasRealizacao) ? appState.datasRealizacao : [];
  const allAtletas = Array.isArray(appState?.atletas) ? appState.atletas : [];
  const allAtletasRef = useRef(allAtletas);
  useEffect(() => {
    allAtletasRef.current = allAtletas;
  }, [allAtletas]);
  const allAtletasCampeonato = Array.isArray(appState?.atletasCampeonato) ? appState.atletasCampeonato : [];
  const allAtletasCampeonatoRef = useRef(allAtletasCampeonato);
  useEffect(() => {
    allAtletasCampeonatoRef.current = allAtletasCampeonato;
  }, [allAtletasCampeonato]);
  const allQuadras = Array.isArray(appState?.quadras) ? appState.quadras : [];
  const allQuadrasRef = useRef(allQuadras);
  useEffect(() => {
    allQuadrasRef.current = allQuadras;
  }, [allQuadras]);
  const participacoesRaw = Array.isArray(appState?.participacoes) ? appState.participacoes : [];
  const participacoes = React.useMemo(() => {
    const ids = new Set(allAtletas.map(a => a.id));
    return participacoesRaw.filter(p => ids.has(p.atleta_id));
  }, [allAtletas, participacoesRaw]);
  const financeiro = appState?.financeiro && typeof appState.financeiro === 'object' ? appState.financeiro : { entries: [] };
  const managers = Array.isArray(appState?.managers) ? appState.managers : [];
  const managersRef = useRef(managers);
  useEffect(() => {
    managersRef.current = managers;
  }, [managers]);
  const adminPassword = appState?.adminPassword || "1204110411";

  // Efeito para limpar automaticamente participações órfãs (atletas excluídos)
  useEffect(() => {
    if (loading) return;
    if (Array.isArray(appState?.participacoes) && Array.isArray(appState?.atletas)) {
      const atletaIds = new Set(appState.atletas.map(a => a.id));
      const temOrfas = appState.participacoes.some(p => !atletaIds.has(p.atleta_id));
      if (temOrfas) {
        const limpas = appState.participacoes.filter(p => atletaIds.has(p.atleta_id));
        setAppState(prev => ({ ...prev, participacoes: limpas }));
        console.log("[AUTO-LIMPEZA] Removidas participações órfãs de atletas deletados.");
      }
    }
  }, [loading, appState?.participacoes, appState?.atletas, setAppState]);

  // Efeito de migração automática dos dados históricos de atletas e vínculos (Grupo -> Liga/Pelada N:N)
  useEffect(() => {
    if (loading) return; // Aguarda o carregamento do LocalStorage

    const legacyAtletasCamp = appState?.atletasCampeonato || [];
    const legacyAtletasPel = appState?.atletas || [];
    
    const precisaMigrarAtletasCamp = legacyAtletasCamp.length > 0;
    const precisaMigrarVinculos = legacyAtletasPel.some(a => !Array.isArray(a.vinculos));

    if (precisaMigrarAtletasCamp || precisaMigrarVinculos) {
      console.log("[MIGRAÇÃO] Iniciando migração de dados de Atletas e Vínculos...");

      const camps = Array.isArray(appState?.campeonatos) ? appState.campeonatos : [];
      const parts = Array.isArray(appState?.participacoes) ? appState.participacoes : [];

      const mapAtletaVinculos = (atletaId, isFromCamp) => {
        const vinculos = [];
        
        // 1. Mapeia campeonatos com base nos rosters
        camps.forEach(c => {
          if (c.rosters) {
            const pertenceAoCamp = Object.values(c.rosters).some(rosterArray => 
              Array.isArray(rosterArray) && rosterArray.map(String).includes(String(atletaId))
            );
            if (pertenceAoCamp) {
              vinculos.push("campeonato_" + c.id);
            }
          }
        });

        // 2. Mapeia peladas com base em participações
        parts.forEach(p => {
          if (String(p.atleta_id) === String(atletaId) && p.pelada_id) {
            const vinculoId = "pelada_" + p.pelada_id;
            if (!vinculos.includes(vinculoId)) {
              vinculos.push(vinculoId);
            }
          }
        });

        // 3. Fallback para peladas se for atleta de pelada e não possuir participações
        if (!isFromCamp && vinculos.length === 0 && appState?.peladas?.length > 0) {
          vinculos.push("pelada_" + appState.peladas[0].id);
        }

        return vinculos;
      };

      const novosAtletas = [];

      // Migrar atletas de pelada
      legacyAtletasPel.forEach(a => {
        const vinculos = Array.isArray(a.vinculos) ? a.vinculos : mapAtletaVinculos(a.id, false);
        const atletaMigrado = {
          ...a,
          vinculos
        };
        delete atletaMigrado.grupo;
        novosAtletas.push(atletaMigrado);
      });

      // Migrar atletas de campeonato
      legacyAtletasCamp.forEach(a => {
        if (novosAtletas.some(x => String(x.id) === String(a.id))) return;
        const vinculos = mapAtletaVinculos(a.id, true);
        const atletaMigrado = {
          ...a,
          vinculos
        };
        delete atletaMigrado.grupo;
        novosAtletas.push(atletaMigrado);
      });

      setAppState(prev => ({
        ...prev,
        atletas: novosAtletas,
        atletasCampeonato: []
      }));
      
      console.log("[MIGRAÇÃO] Migração concluída! Atletas unificados:", novosAtletas.length);
    }
  }, [loading, appState, setAppState]);

  const [auth, setAuth] = useState({ role:"", name:"", manager_id: null, scope: "geral", email: "" });
  const [authLoading, setAuthLoading] = useState(true);

  const [dashboardTab, setDashboardTab] = useState("campeonatos");
  const [dashboardSelectedId, setDashboardSelectedId] = useState("");
  const [dashboardSelectedDataId, setDashboardSelectedDataId] = useState("");

  // Sincroniza dinamicamente o escopo do manager com base nos seus vínculos reais de colaboração
  useEffect(() => {
    if (auth.role !== "manager" || !auth.email) return;

    const emailLogado = String(auth.email || "").toLowerCase().trim();
    const camps = Array.isArray(appState?.campeonatos) ? appState.campeonatos : [];
    const pels = Array.isArray(appState?.peladas) ? appState.peladas : [];

    const isColabCamp = camps.some(c => Array.isArray(c.collaborators) && c.collaborators.some(col => String(col.email || "").toLowerCase().trim() === emailLogado));
    const isColabPel = pels.some(p => Array.isArray(p.collaborators) && p.collaborators.some(col => String(col.email || "").toLowerCase().trim() === emailLogado));

    let computedScope = "campeonato";
    
    // Busca se existe no managers global para ver se há escopo pré-definido
    const managerDef = (appState?.managers || []).find(m => String(m.email || "").toLowerCase().trim() === emailLogado);
    if (managerDef && managerDef.scope) {
      computedScope = managerDef.scope;
    }

    if (isColabCamp && isColabPel) {
      computedScope = "geral";
    } else if (isColabPel) {
      computedScope = "pelada";
    } else if (isColabCamp) {
      computedScope = "campeonato";
    }

    if (auth.scope !== computedScope) {
      setAuth(prev => ({ ...prev, scope: computedScope }));
      if (computedScope === "pelada") {
        setDashboardTab("peladas");
      } else if (computedScope === "campeonato") {
        setDashboardTab("campeonatos");
      }
    }
  }, [appState?.campeonatos, appState?.peladas, appState?.managers, auth.email, auth.role, auth.scope]);
  const lastAuthUserEmail = useRef("");
  const [screen, setScreen] = useState("selection");
  const [cloudConflict, setCloudConflict] = useState(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [publicCloudChamp, setPublicCloudChamp] = useState(null);

  // Monitora alterações de autenticação no Firebase Auth
  useEffect(() => {
    console.log("[DEBUG AUTH] useEffect onAuthStateChanged registrado! isFirebaseConfigured:", isFirebaseConfigured);
    if (!isFirebaseConfigured || !firebaseAuth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      console.log("[DEBUG AUTH] onAuthStateChanged disparado! Usuário:", user ? user.email : "null");
      if (user) {
        const activeSession = sessionStorage.getItem("active_session");
        if (!activeSession) {
          console.log("[DEBUG AUTH] Sessão persistente anterior inválida nesta aba. Deslogando...");
          try {
            await signOut(firebaseAuth);
          } catch(e) {
            console.error("Erro ao limpar sessao local:", e);
          }
          setAuth({ role: "", name: "", manager_id: null, scope: "geral", email: "" });
          lastAuthUserEmail.current = "";
          setScreen("selection");
          setAuthLoading(false);
          return;
        }
        const trimmedEmail = String(user.email || "").toLowerCase().trim();
        const isNewLogin = lastAuthUserEmail.current !== trimmedEmail;
        console.log("[DEBUG AUTH] trimmedEmail:", trimmedEmail, "lastAuthUserEmail.current:", lastAuthUserEmail.current, "isNewLogin:", isNewLogin);
        
        // Verifica se é o Administrador padrão
        if (trimmedEmail === "lucas7s7@gmail.com") {
          setAuth({ role: "adm", name: "Lucas", manager_id: null, scope: "geral", email: trimmedEmail });
          setScreen(prev => (prev === "login" || prev === "selection") ? "home" : prev);
          if (isNewLogin) {
            console.log("[DEBUG AUTH] Novo login admin detectado! Chamando autoRestaurarDaNuvem");
            lastAuthUserEmail.current = trimmedEmail;
            await autoRestaurarDaNuvem("adm", null);
          }
        } else {
          // Verifica se é um Manager cadastrado localmente
          let manager = (managersRef.current || []).find(m => String(m.email || "").toLowerCase().trim() === trimmedEmail);
          console.log("[DEBUG AUTH] Buscando manager local para email:", trimmedEmail, "Encontrado:", manager ? manager.name : "Não");
          
          // Se não encontrou na lista local (por exemplo, primeiro login num dispositivo novo com localStorage limpo),
          // busca no documento global "admin_data" no Firestore que contém o appState de administrador com a lista de todos os managers.
          if (!manager) {
            try {
              console.log("[DEBUG AUTH] Manager não encontrado localmente. Buscando lista global no Firestore (admin_data)...");
              const adminSnap = await getDoc(doc(db, "sistema", "admin_data"));
              if (adminSnap.exists()) {
                const adminData = adminSnap.data();
                const cloudManagers = adminData?.appState?.managers || [];
                manager = cloudManagers.find(m => String(m.email || "").toLowerCase().trim() === trimmedEmail);
                if (manager) {
                  console.log("[DEBUG AUTH] Manager encontrado no Firestore:", manager.name);
                }
              }
            } catch (err) {
              console.error("[DEBUG AUTH] Erro ao buscar managers de admin_data:", err);
            }
          }

          if (manager) {
            setAuth({ role: "manager", name: manager.name || "Manager", manager_id: manager.id, scope: manager.scope || "campeonato", email: trimmedEmail });
            setScreen(prev => (prev === "login" || prev === "selection") ? "home" : prev);
            if (isNewLogin) {
              console.log("[DEBUG AUTH] Novo login manager detectado! Chamando autoRestaurarDaNuvem");
              lastAuthUserEmail.current = trimmedEmail;
              await autoRestaurarDaNuvem("manager", manager.id);
            }
          } else {
            // Se for outro usuário (por exemplo, um novo usuário básico)
            console.log("[DEBUG AUTH] Usuário público logado");
            setAuth({ role: "public", name: user.displayName || trimmedEmail.split("@")[0], manager_id: null, scope: "leitura", email: trimmedEmail });
            setScreen(prev => (prev === "login" || prev === "selection") ? "public" : prev);
          }
        }
      } else {
        // Usuário deslogado
        console.log("[DEBUG AUTH] Usuário deslogado. Limpando email em lastAuthUserEmail");
        setAuth({ role: "", name: "", manager_id: null, scope: "geral", email: "" });
        lastAuthUserEmail.current = "";
      }
      setAuthLoading(false);
    });

    return () => {
      console.log("[DEBUG AUTH] Cancelando inscrição do onAuthStateChanged!");
      unsubscribe();
    };
  }, [isFirebaseConfigured]);

  // Proteção de Rotas Internas Reativa
  const publicScreens = ["selection", "login", "public", "publicCloud"];
  const isInternalScreen = !publicScreens.includes(screen);
  const isAuthenticated = auth.role === "adm" || auth.role === "manager";

  useEffect(() => {
    if (!loading && !authLoading && isInternalScreen && !isAuthenticated) {
      setScreen("selection");
    }
  }, [screen, auth, loading, authLoading, isInternalScreen, isAuthenticated]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("c") || params.get("campeonato");
      if (code) {
        setCloudLoading(true);
        const loadFromFirestore = async () => {
          try {
            if (!isFirebaseConfigured) {
              throw new Error("O Firebase Firestore não está configurado.");
            }
            
            const docRef = doc(db, "campeonatos", code);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              setPublicCloudChamp(docSnap.data());
              setScreen("publicCloud");
            } else {
              const q = query(collection(db, "campeonatos"), where("customSlug", "==", code.toLowerCase()));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const champData = querySnapshot.docs[0].data();
                setPublicCloudChamp(champData);
                setScreen("publicCloud");
              } else {
                throw new Error("Campeonato não encontrado.");
              }
            }
          } catch (err) {
            console.error(err);
            alert("Erro ao conectar com a nuvem: " + err.message);
          } finally {
            setCloudLoading(false);
          }
        };

        loadFromFirestore();
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      if (window.scrollTo) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }
  }, [screen, loading]);

  // Novos estados para alteração de senha
  const [modalPassword, setModalPassword] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", newPwd: "", confirm: "" });
  const [pwdError, setPwdError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);



  const autoRestaurarDaNuvem = async (role, managerId) => {
    if (!isFirebaseConfigured) return;
    try {
      const docKey = (role === "adm" || role === "manager") ? "admin_data" : `manager_${managerId || "unknown"}`;
      const docSnap = await getDoc(doc(db, "sistema", docKey));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.appState) {
          setAppState(data.appState);
          const syncTime = data.lastUpdated ? new Date(data.lastUpdated).getTime() : Date.now();
          localStorage.setItem("last_sync_time", String(syncTime));
          console.log("Dados sincronizados automaticamente da nuvem no login!");
        }
      }
    } catch (e) {
      console.error("Erro ao sincronizar login da nuvem:", e);
    }
  };

  // Auto-salvamento na Nuvem em background com controle de concorrência
  useEffect(() => {
    if (!isFirebaseConfigured || loading || cloudConflict) return;
    if (auth.role !== "adm" && auth.role !== "manager") return;

    const timer = setTimeout(async () => {
      try {
        const docKey = (auth.role === "adm" || auth.role === "manager") ? "admin_data" : `manager_${auth.manager_id || "unknown"}`;
        
        // 1. Antes de salvar, busca na nuvem para verificar concorrência
        const docSnap = await getDoc(doc(db, "sistema", docKey));
        if (docSnap.exists()) {
          const dataNuvem = docSnap.data();
          if (dataNuvem.lastUpdated) {
            const timeNuvem = new Date(dataNuvem.lastUpdated).getTime();
            const timeLocalSync = localStorage.getItem("last_sync_time") ? Number(localStorage.getItem("last_sync_time")) : 0;
            
            // Margem de segurança de 2 segundos para evitar falsos conflitos causados por pequenos delays
            if (timeNuvem > timeLocalSync + 2000) {
              console.warn("Conflito de dados detectado! A nuvem tem dados mais recentes.");
              setCloudConflict({
                nuvemTime: dataNuvem.lastUpdated,
                updatedBy: dataNuvem.updatedBy || "Outro Aparelho",
                payload: dataNuvem.appState
              });
              return; // Bloqueia o auto-salvamento
            }
          }
        }

        const payload = {
          appState: appState,
          lastUpdated: new Date().toISOString(),
          updatedBy: auth.name || "Sem Nome"
        };
        const cleanPayload = JSON.parse(JSON.stringify(payload));
        await setDoc(doc(db, "sistema", docKey), cleanPayload);
        
        // Atualiza a hora do último sincronismo bem sucedido
        localStorage.setItem("last_sync_time", String(new Date(payload.lastUpdated).getTime()));
        console.log("Banco de dados sincronizado automaticamente na Nuvem!");
      } catch (e) {
        console.error("Erro no auto-salvamento na nuvem:", e);
      }
    }, 2000); // 2 segundos de debounce para evitar excesso de requisições ao Firestore

    return () => clearTimeout(timer);
  }, [appState, auth, loading, cloudConflict]);

  const handleLogin = async ({email, password}) => {
    const trimmed = String(email||"").trim().toLowerCase();
    if(!trimmed||!password) return "Informe e-mail e senha.";

    try {
      if (!isFirebaseConfigured || !firebaseAuth) {
        throw new Error("O Firebase Auth não está configurado.");
      }
      await setPersistence(firebaseAuth, browserSessionPersistence);
      sessionStorage.setItem("active_session", "true");
      await signInWithEmailAndPassword(firebaseAuth, trimmed, password);
      return "";
    } catch (error) {
      console.error("Erro no login Firebase Auth:", error);
      
      // MIGRACAO AUTOMATICA se o usuário não for encontrado no Firebase mas for admin/manager local
      if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        if (trimmed === "lucas7s7@gmail.com" && password === adminPassword) {
          try {
            sessionStorage.setItem("active_session", "true");
            await createUserWithEmailAndPassword(firebaseAuth, trimmed, password);
            return "";
          } catch (createErr) {
            console.error("Erro ao migrar admin local:", createErr);
            return "Erro ao migrar sua conta admin padrão: " + createErr.message;
          }
        }
        
        const manager = managers.find(m => String(m.email||"").toLowerCase() === trimmed && m.password === password);
        if (manager) {
          try {
            sessionStorage.setItem("active_session", "true");
            await createUserWithEmailAndPassword(firebaseAuth, trimmed, password);
            return "";
          } catch (createErr) {
            console.error("Erro ao migrar manager local:", createErr);
            return "Erro ao migrar sua conta de manager: " + createErr.message;
          }
        }
      }

      switch (error.code) {
        case "auth/invalid-email":
          return "O endereço de e-mail é inválido.";
        case "auth/user-disabled":
          return "Esta conta de usuário foi desativada.";
        case "auth/user-not-found":
        case "auth/invalid-credential":
        case "auth/wrong-password":
          return "Credenciais inválidas. Verifique seu e-mail e senha.";
        case "auth/too-many-requests":
          return "Muitas tentativas malsucedidas de login. Tente novamente mais tarde.";
        default:
          return error.message || "Erro ao fazer login.";
      }
    }
  };

  const handleRegister = async ({email, password, name}) => {
    const trimmed = String(email||"").trim().toLowerCase();
    if(!trimmed || !password || !name?.trim()) return "Preencha todos os campos.";
    if(password.length < 6) return "A senha deve ter pelo menos 6 caracteres.";

    try {
      if (!isFirebaseConfigured || !firebaseAuth) {
        throw new Error("O Firebase Auth não está configurado.");
      }

      await createUserWithEmailAndPassword(firebaseAuth, trimmed, password);
      return "";
    } catch (error) {
      console.error("Erro ao registrar conta:", error);
      switch (error.code) {
        case "auth/email-already-in-use":
          return "Este endereço de e-mail já está em uso.";
        case "auth/invalid-email":
          return "O endereço de e-mail é inválido.";
        case "auth/weak-password":
          return "A senha é muito fraca (mínimo 6 caracteres).";
        default:
          return error.message || "Erro ao registrar usuário.";
      }
    }
  };

  const handleForgotPassword = async (email) => {
    const trimmed = String(email||"").trim().toLowerCase();
    if(!trimmed) return "Por favor, informe seu e-mail.";

    try {
      if (!isFirebaseConfigured || !firebaseAuth) {
        throw new Error("O Firebase Auth não está configurado.");
      }
      await sendPasswordResetEmail(firebaseAuth, trimmed);
      return "";
    } catch (error) {
      console.error("Erro ao solicitar redefinição:", error);
      switch (error.code) {
        case "auth/invalid-email":
          return "O endereço de e-mail é inválido.";
        case "auth/user-not-found":
          return "Não encontramos um usuário cadastrado com este e-mail.";
        default:
          return error.message || "Erro ao enviar e-mail de recuperação.";
      }
    }
  };

  const handlePublicAccess = () => {
    setAuth({ role:"public", name:"Público" });
    setCurrent(null);
    setScreen("public");
  };

  const handleLogout = async () => {
    sessionStorage.removeItem("active_session");
    if (isFirebaseConfigured && firebaseAuth) {
      try {
        await signOut(firebaseAuth);
      } catch (e) {
        console.error("Erro ao deslogar do Firebase Auth:", e);
      }
    }
    setAuth({ role:"", name:"", manager_id: null, scope: "geral" });
    setCurrent(null);
    setScreen("selection");
  };

  const handleUpdatePassword = () => {
    setPwdError("");
    const { current: curPwd, newPwd, confirm } = pwdForm;
    if (!curPwd || !newPwd || !confirm) {
      setPwdError("Por favor, preencha todos os campos.");
      return;
    }
    if (newPwd !== confirm) {
      setPwdError("A nova senha e a confirmação não coincidem.");
      return;
    }
    if (newPwd.length < 4) {
      setPwdError("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }

    if (auth.role === "adm") {
      if (curPwd !== adminPassword) {
        setPwdError("Senha atual incorreta.");
        return;
      }
      setAdminPassword(newPwd);
      alert("Senha de Administrador alterada com sucesso!");
    } else if (auth.role === "manager") {
      const mIdx = managers.findIndex(m => m.id === auth.manager_id);
      if (mIdx === -1) {
        setPwdError("Gestor não encontrado no sistema.");
        return;
      }
      if (managers[mIdx].password !== curPwd) {
        setPwdError("Senha atual incorreta.");
        return;
      }
      atualizarManager(auth.manager_id, { password: newPwd });
      alert("Senha de Gestor alterada com sucesso!");
    } else {
      setPwdError("Usuários não autenticados não podem alterar senhas.");
      return;
    }

    setPwdForm({ current: "", newPwd: "", confirm: "" });
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setModalPassword(false);
  };
  
  // Filtro por manager e scope
  const filterByManager = (items) => {
    if (auth.role === "adm") return items;
    if (auth.role === "manager") {
      const emailLogado = String(auth.email || "").toLowerCase().trim();
      return items.filter(item => {
        const isOwner = item.manager_id === auth.manager_id;
        const isCollaborator = Array.isArray(item.collaborators) && item.collaborators.some(
          colab => String(colab.email || "").toLowerCase().trim() === emailLogado
        );
        return isOwner || isCollaborator;
      });
    }
    return [];
  };
  const campeonatos = filterByManager(allCampeonatos).filter(c => {
    const isCollaborator = Array.isArray(c.collaborators) && c.collaborators.some(
      colab => String(colab.email || "").toLowerCase().trim() === String(auth.email || "").toLowerCase().trim()
    );
    return auth.role === "adm" || auth.scope === "geral" || auth.scope === "campeonato" || isCollaborator;
  });
  const peladas = filterByManager(allPeladas).filter(p => {
    const isCollaborator = Array.isArray(p.collaborators) && p.collaborators.some(
      colab => String(colab.email || "").toLowerCase().trim() === String(auth.email || "").toLowerCase().trim()
    );
    return auth.role === "adm" || auth.scope === "geral" || auth.scope === "pelada" || isCollaborator;
  });
  const atletas = (() => {
    if (auth.role === "adm") return allAtletas;
    if (auth.role === "manager") {
      const emailLogado = String(auth.email || "").toLowerCase().trim();
      
      // Obtém as peladas e campeonatos permitidos
      const peladasPermitidasIds = allPeladas.filter(p => 
        p.manager_id === auth.manager_id || 
        (Array.isArray(p.collaborators) && p.collaborators.some(col => String(col.email || "").toLowerCase().trim() === emailLogado))
      ).map(p => "pelada_" + p.id);

      const campeonatosPermitidosIds = allCampeonatos.filter(c => 
        c.manager_id === auth.manager_id || 
        (Array.isArray(c.collaborators) && c.collaborators.some(col => String(col.email || "").toLowerCase().trim() === emailLogado))
      ).map(c => "campeonato_" + c.id);

      const vinculosPermitidos = [...peladasPermitidasIds, ...campeonatosPermitidosIds];

      return allAtletas.filter(atleta => {
        const isOwner = atleta.manager_id === auth.manager_id;
        const belongsToPermittedModalidade = Array.isArray(atleta.vinculos) && atleta.vinculos.some(v => vinculosPermitidos.includes(v));
        // Se o atleta não tem vínculo com nada, mas é de propriedade do admin ou do manager
        const isOrphanAndOwned = (!Array.isArray(atleta.vinculos) || atleta.vinculos.length === 0) && (atleta.manager_id === auth.manager_id || !atleta.manager_id);
        
        return isOwner || belongsToPermittedModalidade || isOrphanAndOwned;
      });
    }
    return [];
  })();

  const atletasCampeonato = atletas.filter(a => Array.isArray(a.vinculos) && a.vinculos.some(v => v.startsWith("campeonato_")));
  
  const quadras = (() => {
    if (auth.role === "adm") return allQuadras;
    if (auth.role === "manager") {
      // Retorna as quadras criadas pelo admin (manager_id === null) ou pelo próprio manager
      return allQuadras.filter(q => q.manager_id === auth.manager_id || !q.manager_id);
    }
    return [];
  })();

  const escapeHtml = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const downloadAtletasTemplate = () => {
    const headers = ["id","nome","apelido","foto","habilidade","goleiro","ativo","documento","dataNascimento","numeroCamisa","grupo","customFields"];
    const sample = {
      id: "",
      nome: "João Silva",
      apelido: "João",
      foto: "",
      habilidade: "3",
      goleiro: "false",
      ativo: "true",
      documento: "12345678900",
      dataNascimento: "1990-01-01",
      numeroCamisa: "10",
      grupo: "Sábado",
      customFields: "{}"
    };
    const _csvLines = [headers.map(h => { const s = String(sample[h] ?? ''); return (s.includes(',') || s.includes('"')) ? '"' + s.replace(/"/g,'""') + '"' : s; }).join(',')];
    const csv = '\uFEFF' + [headers.map(h => h).join(','), ..._csvLines].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `modelo-atletas.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const exportAtletas = () => {
    const headers = ["id","nome","apelido","foto","habilidade","goleiro","ativo","documento","dataNascimento","numeroCamisa","grupo","customFields"];
    const esc = (v) => { const s = String(v == null ? '' : v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g,'""') + '"' : s; };
    const rows = atletas.map(a => headers.map(h => esc(h === "customFields" ? JSON.stringify(a.customFields || {}) : a[h])).join(','));
    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `atletas-${todayStr()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const parseValue = (text) => {
    if (text === null || text === undefined) return "";
    const trimmed = String(text).trim();
    if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === "true";
    if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
    return trimmed;
  };

  const importAtletas = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Suporta CSV (novo formato) e HTML-XLS (formato legado)
      let rows;
      if (file.name.endsWith('.csv') || text.trimStart().startsWith('id,') || text.trimStart().startsWith('\uFEFFid,')) {
        // Parsing CSV
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
        rows = lines.map(line => line.split(',').map(cell => cell.startsWith('"') && cell.endsWith('"') ? cell.slice(1,-1).replace(/""/g,'"') : cell));
      } else {
        // Parsing HTML-XLS legado
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const table = doc.querySelector('table');
        if (!table) throw new Error('Arquivo não contém tabela válida. Use o modelo CSV.');
        rows = Array.from(table.querySelectorAll('tr')).map(row => Array.from(row.querySelectorAll('th,td')).map(cell => cell.textContent || ''));
      }
      if (rows.length < 2) throw new Error('O arquivo não contém dados de atletas.');
      const headers = rows[0].map(h => String(h).trim());
      const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell).trim() !== ''));
      const normalized = dataRows.map(cells => {
        const item = {};
        cells.forEach((value, index) => {
          const key = headers[index];
          if (!key) return;
          if (key === "customFields") {
            try {
              item.customFields = JSON.parse(value || "{}");
            } catch {
              item.customFields = {};
            }
            return;
          }
          if (key === "habilidade") {
            item.habilidade = Number(value) || 3;
            return;
          }
          if (key === "goleiro" || key === "ativo") {
            item[key] = String(value).trim().toLowerCase() === "true";
            return;
          }
          if (key === "id") {
            item.id = value ? Number(value) : undefined;
            return;
          }
          item[key] = value;
        });
        return {
          ...item,
          id: item.id || Date.now() + Math.floor(Math.random() * 100000),
          habilidade: Number(item.habilidade) || 3,
          ativo: item.ativo !== false,
          goleiro: item.goleiro === true,
          manager_id: auth.role === "manager" ? auth.manager_id : item.manager_id,
          customFields: item.customFields && typeof item.customFields === "object" ? item.customFields : {},
        };
      });
            if (!window.confirm("Importar atletas substituirá a lista atual de atletas. Deseja continuar?")) return;
      setAtletas(normalized);
      alert(`Importação concluída com ${normalized.length} atletas.`);
    } catch (error) {
      console.error("Importar atletas falhou:", error);
      alert("Erro ao importar atletas: " + (error.message || error));
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const downloadAtletasCampeonatoTemplate = () => {
    const headers = ["id","nome","apelido","foto","habilidade","goleiro","ativo","documento","dataNascimento","numeroCamisa","time","celular1","celular2","foneResidencial","email","tipoAtleta","igrejaMembro","logradouro","nomeVia","cep","complemento","bairro","nomeMae","docFoto","customFields"];
    const sample = {
      id: "",
      nome: "João Silva",
      apelido: "João",
      foto: "",
      habilidade: "3",
      goleiro: "false",
      ativo: "true",
      documento: "1234567",
      dataNascimento: "1990-01-01",
      numeroCamisa: "10",
      time: "Time A",
      celular1: "11999999999",
      celular2: "",
      foneResidencial: "",
      email: "joao@email.com",
      tipoAtleta: "Adventista",
      igrejaMembro: "Igreja Central",
      logradouro: "Rua",
      nomeVia: "Das Flores",
      cep: "01001-000",
      complemento: "Apto 12",
      bairro: "Centro",
      nomeMae: "Maria Silva",
      docFoto: "",
      customFields: "{}"
    };
    const _csvLines = [headers.map(h => { const s = String(sample[h] ?? ''); return (s.includes(',') || s.includes('"')) ? '"' + s.replace(/"/g,'""') + '"' : s; }).join(',')];
    const csv = '\uFEFF' + [headers.map(h => h).join(','), ..._csvLines].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `modelo-atletas-campeonato.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const exportAtletasCampeonato = () => {
    const headers = ["id","nome","apelido","foto","habilidade","goleiro","ativo","documento","dataNascimento","numeroCamisa","time","celular1","celular2","foneResidencial","email","tipoAtleta","igrejaMembro","logradouro","nomeVia","cep","complemento","bairro","nomeMae","docFoto","customFields"];
    const esc = (v) => { const s = String(v == null ? '' : v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g,'""') + '"' : s; };
    const rows = atletasCampeonato.map(a => headers.map(h => esc(h === "customFields" ? JSON.stringify(a.customFields || {}) : (h === "time" ? a.grupo : a[h]))).join(','));
    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `atletas-campeonato-${todayStr()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const importAtletasCampeonato = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Suporta CSV (novo formato) e HTML-XLS (formato legado)
      let rows;
      if (file.name.endsWith('.csv') || text.trimStart().startsWith('id,') || text.trimStart().startsWith('\uFEFFid,')) {
        // Parsing CSV
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
        rows = lines.map(line => line.split(',').map(cell => cell.startsWith('"') && cell.endsWith('"') ? cell.slice(1,-1).replace(/""/g,'"') : cell));
      } else {
        // Parsing HTML-XLS legado
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const table = doc.querySelector("table");
        if (!table) throw new Error("O arquivo não contém uma tabela válida. Use o modelo CSV.");
        rows = Array.from(table.querySelectorAll("tr")).map(row => Array.from(row.querySelectorAll("th,td")).map(cell => cell.textContent || ""));
      }
      if (rows.length < 2) throw new Error("A tabela de atletas de campeonato não contém dados.");
      const headers = rows[0].map(h => String(h).trim());
      const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell).trim() !== ""));
      const normalized = dataRows.map(cells => {
        const item = {};
        cells.forEach((value, index) => {
          const key = headers[index];
          if (!key) return;
          if (key === "customFields") {
            try {
              item.customFields = JSON.parse(value || "{}");
            } catch {
              item.customFields = {};
            }
            return;
          }
          if (key === "habilidade") {
            item.habilidade = Number(value) || 3;
            return;
          }
          if (key === "goleiro" || key === "ativo") {
            item[key] = String(value).trim().toLowerCase() === "true";
            return;
          }
          if (key === "id") {
            item.id = value ? Number(value) : undefined;
            return;
          }
          if (key === "time" || key === "grupo") {
            item.grupo = value;
            return;
          }
          item[key] = value;
        });
        return {
          ...item,
          id: item.id || Date.now() + Math.floor(Math.random() * 100000),
          habilidade: Number(item.habilidade) || 3,
          ativo: item.ativo !== false,
          goleiro: item.goleiro === true,
          manager_id: auth.role === "manager" ? auth.manager_id : item.manager_id,
          customFields: item.customFields && typeof item.customFields === "object" ? item.customFields : {},
        };
      });
            if (!window.confirm("Importar atletas substituirá a lista atual de atletas de campeonatos. Deseja continuar?")) return;
      setAtletasCampeonato(normalized);
      alert(`Importação concluída com ${normalized.length} atletas de campeonato.`);
    } catch (error) {
      console.error("Importar atletas de campeonato falhou:", error);
      alert("Erro ao importar atletas de campeonato: " + (error.message || error));
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const downloadQuadrasTemplate = () => {
    const headers = ["id", "nome", "endereco", "ativa"];
    const sample = {
      id: "",
      nome: "Quadra Central Coberta",
      endereco: "Av. Principal, 500",
      ativa: "true"
    };
    const _csvLines = [headers.map(h => { const s = String(sample[h] ?? ''); return (s.includes(',') || s.includes('"')) ? '"' + s.replace(/"/g,'""') + '"' : s; }).join(',')];
    const csv = '\uFEFF' + [headers.map(h => h).join(','), ..._csvLines].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `modelo-quadras.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const exportQuadras = () => {
    const headers = ["id", "nome", "endereco", "ativa"];
    const esc = (v) => { const s = String(v == null ? '' : v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g,'""') + '"' : s; };
    const rows = quadras.map(q => headers.map(h => esc(q[h])).join(','));
    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `quadras-${todayStr()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const importQuadras = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Suporta CSV (novo formato) e HTML-XLS (formato legado)
      let rows;
      if (file.name.endsWith('.csv') || text.trimStart().startsWith('id,') || text.trimStart().startsWith('\uFEFFid,')) {
        // Parsing CSV
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
        rows = lines.map(line => line.split(',').map(cell => cell.startsWith('"') && cell.endsWith('"') ? cell.slice(1,-1).replace(/""/g,'"') : cell));
      } else {
        // Parsing HTML-XLS legado
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const table = doc.querySelector("table");
        if (!table) throw new Error("O arquivo não contém uma tabela válida. Use o modelo CSV.");
        rows = Array.from(table.querySelectorAll("tr")).map(row => Array.from(row.querySelectorAll("th,td")).map(cell => cell.textContent || ""));
      }
      if (rows.length < 2) throw new Error("A tabela de quadras não contém dados.");
      const headers = rows[0].map(h => String(h).trim());
      const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell).trim() !== ""));
      const normalized = dataRows.map(cells => {
        const item = {};
        cells.forEach((value, index) => {
          const key = headers[index];
          if (!key) return;
          if (key === "ativa") {
            item.ativa = String(value).trim().toLowerCase() === "true";
            return;
          }
          if (key === "id") {
            item.id = value ? Number(value) : undefined;
            return;
          }
          item[key] = value;
        });
        return {
          ...item,
          id: item.id || Date.now() + Math.floor(Math.random() * 1000),
          ativa: item.ativa !== false,
          manager_id: auth.role === "manager" ? auth.manager_id : item.manager_id,
        };
      });
      if (!window.confirm("Importar quadras substituirá a lista atual de quadras. Deseja continuar?")) return;
      setQuadras(normalized);
      alert(`Importação concluída com ${normalized.length} quadras.`);
    } catch (error) {
      console.error("Importar quadras falhou:", error);
      alert("Erro ao importar quadras: " + (error.message || error));
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const financeiroFiltered = auth.role === "adm" ? financeiro : (auth.role === "manager" ? {
    entries: (financeiro.entries || []).filter(e => {
      if (String(e.manager_id) !== String(auth.manager_id)) return false;
      if (auth.scope === "campeonato") return !e.pelada_id;
      if (auth.scope === "pelada") return !e.champ_id;
      return true;
    })
  } : { entries: [] });
  const setFinanceiroWrapped = d => setFinanceiro(s => {
    const next = typeof d === 'function' ? d(s) : d;
    if (auth.role === "adm") return next;
    if (auth.role === "manager") {
      const nextEntries = next.entries?.map(e => ({ ...e, manager_id: auth.manager_id })) || [];
      const preservedEntries = (s.entries || []).filter(e => String(e.manager_id) !== String(auth.manager_id));
      return { ...s, ...next, entries: [...preservedEntries, ...nextEntries] };
    }
    return next;
  });

  // Setters que atualizam o appState
  const setCampeonatos = d => setAppState(s => ({ ...s, campeonatos: typeof d === 'function' ? d(Array.isArray(s.campeonatos) ? s.campeonatos : []) : d }));
  const setPeladas = d => setAppState(s => ({ ...s, peladas: typeof d === 'function' ? d(Array.isArray(s.peladas) ? s.peladas : []) : d }));
  const setDatasRealizacao = d => setAppState(s => ({ ...s, datasRealizacao: typeof d === 'function' ? d(Array.isArray(s.datasRealizacao) ? s.datasRealizacao : []) : d }));
    const setAtletas = d => setAppState(s => ({ ...s, atletas: typeof d === 'function' ? d(Array.isArray(s.atletas) ? s.atletas : []) : d }));
  const setAtletasCampeonato = d => setAppState(s => ({ ...s, atletasCampeonato: typeof d === 'function' ? d(Array.isArray(s.atletasCampeonato) ? s.atletasCampeonato : []) : d }));
  const setQuadras = d => setAppState(s => ({ ...s, quadras: typeof d === 'function' ? d(Array.isArray(s.quadras) ? s.quadras : []) : d }));
  const setParticipacoes = d => setAppState(s => ({ ...s, participacoes: typeof d === 'function' ? d(Array.isArray(s.participacoes) ? s.participacoes : []) : d }));
  const setFinanceiro = d => setAppState(s => ({ ...s, financeiro: typeof d === 'function' ? d(s.financeiro && typeof s.financeiro === 'object' ? s.financeiro : { entries: [] }) : d }));
  const setManagers = d => setAppState(s => ({ ...s, managers: typeof d === 'function' ? d(Array.isArray(s.managers) ? s.managers : []) : d }));
  const setAdminPassword = d => setAppState(s => ({ ...s, adminPassword: typeof d === 'function' ? d(s.adminPassword || "1204110411") : d }));
  const adicionarManager = d => setManagers(p => [...p, { ...d, id: Date.now() }]);
  const atualizarManager = (id, d) => setManagers(p => p.map(m => m.id === id ? { ...m, ...d } : m));
  const removerManager = id => setManagers(p => p.filter(m => m.id !== id));
  const assegurarManagerColaborador = (name, email, password, targetScope = "campeonato") => {
    const trimmedEmail = String(email || "").toLowerCase().trim();
    const list = Array.isArray(appState?.managers) ? appState.managers : [];
    const index = list.findIndex(m => String(m.email || "").toLowerCase().trim() === trimmedEmail);
    if (index === -1) {
      adicionarManager({
        name: name.trim(),
        email: trimmedEmail,
        password: password,
        scope: targetScope
      });
    } else {
      const existingManager = list[index];
      const currentScope = existingManager.scope || "campeonato";
      let newScope = currentScope;
      if (currentScope !== "geral" && currentScope !== targetScope) {
        newScope = "geral";
      }
      atualizarManager(existingManager.id, {
        password: password || existingManager.password,
        scope: newScope
      });
    }
  };
  const acessarCampeonatoNuvem = (code) => {
    setCloudLoading(true);
    
    if (!isFirebaseConfigured) {
      alert("O Firebase Firestore não está configurado. Por favor, adicione suas credenciais no arquivo 'src/firebase.js' para poder baixar campeonatos da nuvem.");
      setCloudLoading(false);
      return;
    }

    const docRef = doc(db, "campeonatos", code);
    getDoc(docRef)
      .then(docSnap => {
        if (!docSnap.exists()) {
          throw new Error("Campeonato não encontrado ou código inválido.");
        }
        const data = docSnap.data();
        setPublicCloudChamp(data);
        setScreen("publicCloud");
      })
      .catch(err => {
        alert("Erro ao baixar campeonato: " + err.message);
      })
      .finally(() => {
        setCloudLoading(false);
      });
  };

  const[current,setCurrent]=useState(null);

  const [storageSize, setStorageSize] = useState(0);

  useEffect(() => {
    if (screen === "backup") {
      getLocalStorageSize().then(setStorageSize);
    }
  }, [screen]);

      // ── CRUD Atletas ───────────────────────────────────────────────
  const adicionarAtleta  =d=>setAtletas(p=>[...p,{...d,id:d.id || Date.now() + Math.floor(Math.random() * 100000), manager_id: auth.role === "manager" ? auth.manager_id : null}]);
  const atualizarAtleta  =(id,d)=>setAtletas(p=>p.map(a=>a.id===id?{...a,...d}:a));
  const removerAtleta    =id=>{
    setAtletas(p=>p.filter(a=>a.id!==id));
    setParticipacoes(prev=>prev.filter(part=>part.atleta_id!==id));
  };
  const adicionarAtletaCampeonato  =d=>setAtletas(p=>[...p,{...d,id:d.id || Date.now() + Math.floor(Math.random() * 100000), manager_id: auth.role === "manager" ? auth.manager_id : null}]);
  const atualizarAtletaCampeonato  =(id,d)=>setAtletas(p=>p.map(a=>a.id===id?{...a,...d}:a));
  const removerAtletaCampeonato    =id=>{
    setAtletas(p=>p.filter(a=>a.id!==id));
    setParticipacoes(prev=>prev.filter(part=>part.atleta_id!==id));
  };

  // ── CRUD Quadras ───────────────────────────────────────────────
  const adicionarQuadra = d => setQuadras(p => [...p, { ...d, id: d.id || Date.now(), manager_id: auth.role === "manager" ? auth.manager_id : null }]);
  const atualizarQuadra = (id, d) => setQuadras(p => p.map(q => q.id === id ? { ...q, ...d } : q));
  const removerQuadra = id => setQuadras(p => p.filter(q => q.id !== id));

  // ── CRUD Datas Realização ──────────────────────────────────────
  const adicionarData=(d)=>setDatasRealizacao(p=>[...p,{...d,id:Date.now()}]);
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
  const removerData  =id=>setDatasRealizacao(p=>p.filter(x=>String(x.id)!==String(id)));

  // ── CRUD Participações ─────────────────────────────────────────
  const adicionarPart=(d)=>{
    setParticipacoes(p=>{
      const next = [...p,{...d,id:Date.now()}];
      if (d.data_realizacao_id) {
        const presentesIds = next.filter(x => String(x.data_realizacao_id) === String(d.data_realizacao_id) && x.compareceu).map(x => x.atleta_id);
        setTimeout(() => atualizarData(d.data_realizacao_id, { presenca: presentesIds }), 0);
      }
      return next;
    });
  };
  const atualizarPart=(id,d)=>{
    setParticipacoes(p=>{
      const next = p.map(x=>x.id===id?{...x,...d}:x);
      const part = p.find(x=>x.id===id);
      if (part && part.data_realizacao_id) {
        const presentesIds = next.filter(x => String(x.data_realizacao_id) === String(part.data_realizacao_id) && x.compareceu).map(x => x.atleta_id);
        setTimeout(() => atualizarData(part.data_realizacao_id, { presenca: presentesIds }), 0);
      }
      return next;
    });
  };
  const removerPart  =id=>{
    setParticipacoes(p=>{
      const part = p.find(x=>x.id===id);
      const next = p.filter(x=>x.id!==id);
      if (part && part.data_realizacao_id) {
        const presentesIds = next.filter(x => String(x.data_realizacao_id) === String(part.data_realizacao_id) && x.compareceu).map(x => x.atleta_id);
        setTimeout(() => atualizarData(part.data_realizacao_id, { presenca: presentesIds }), 0);
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

  // ── CRUD Peladas ───────────────────────────────────────────────
  const adicionarPelada=d=>setPeladas(p=>[...p,{id:Date.now(),nome:d.nome,data_criacao:d.data_criacao||todayStr(),ativo:d.ativo!==false, manager_id: auth.role === "manager" ? auth.manager_id : null}]);
  const atualizarPelada=(id,d)=>setPeladas(p=>p.map(x=>x.id===id?{...x,...d}:x));
  const removerPelada  =id=>{setPeladas(p=>p.filter(x=>x.id!==id));setDatasRealizacao(p=>p.filter(x=>x.pelada_id!==id));setParticipacoes(p=>p.filter(x=>x.pelada_id!==id));};
  const atualizarChamp = (u) => {
    setCampeonatos(p => p.map(c => c.id === u.id ? u : c));
    if (u.npointId) {
      setTimeout(async () => {
        try {
          if (!isFirebaseConfigured) return;
          const payload = {
            ...u,
            lastPublished: new Date().toISOString(),
                        atletas: allAtletasCampeonatoRef.current.map(a => ({ 
              id: a.id, 
              nome: a.nome || "", 
              apelido: a.apelido || "", 
              name: a.apelido || a.nome || a.name || "" 
            }))
          };
          const cleanPayload = JSON.parse(JSON.stringify(payload));
          await setDoc(doc(db, "campeonatos", u.npointId), cleanPayload);
          console.log("Campeonato sincronizado automaticamente na nuvem!");
        } catch (e) {
          console.error("Erro na sincronização automática em background: ", e);
        }
      }, 500);
    }
  };
  const removerChamp  =id=>setCampeonatos(p=>p.filter(c=>c.id!==id));

  const publicarNaNuvem = async (c) => {
    setCloudLoading(true);
    
    try {
      if (!isFirebaseConfigured) {
        throw new Error("O Firebase Firestore não está configurado. Por favor, adicione suas credenciais no arquivo 'src/firebase.js' para ativar a sincronização na nuvem.");
      }

      let npointId = c.npointId;
      let docId = npointId;

      if (!docId) {
        // Cria uma referência com ID gerado automaticamente pelo Firestore
        const novoDocRef = doc(collection(db, "campeonatos"));
        docId = novoDocRef.id;
      }

      const payload = {
        ...c,
        npointId: docId,
        lastPublished: new Date().toISOString(),
                atletas: allAtletasCampeonatoRef.current.map(a => ({ 
          id: a.id, 
          nome: a.nome || "", 
          apelido: a.apelido || "", 
          name: a.apelido || a.nome || a.name || "" 
        }))
      };

      // Remove campos com valor undefined (não suportados pelo Firestore)
      const cleanPayload = JSON.parse(JSON.stringify(payload));

      // Salva ou atualiza os dados na coleção "campeonatos" do Firestore
      await setDoc(doc(db, "campeonatos", docId), cleanPayload);

      const dataHoraStr = new Date().toLocaleString("pt-BR");
      const cAtualizado = {
        ...c,
        npointId: docId,
        lastPublished: dataHoraStr
      };
      
      atualizarChamp(cAtualizado);
      alert("Campeonato publicado com sucesso na nuvem do Firebase!");
      return cAtualizado;
    } catch (err) {
      console.error(err);
      let errMsg = err.message;
      if (err instanceof TypeError && err.message.includes("failed to fetch")) {
        errMsg = "Erro de conexão. Não foi possível acessar o Firestore. Verifique sua conexão com a internet.";
      }
      alert("Erro ao publicar: " + errMsg);
      return null;
    } finally {
      setCloudLoading(false);
    }
  };

  // ── BACKUP / RESTAURAR ─────────────────────────────────────────
  async function exportJSON(){
    const data = {campeonatos,peladas,datasRealizacao,atletas,atletasCampeonato,quadras,participacoes,financeiro,managers};
    const fileName = `futebol_manager_backup_${todayStr()}.json`;
    const jsonStr = JSON.stringify(data, null, 2);
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: 'Exportar Backup JSON',
          text: 'Arquivo de backup do Futebol Manager',
          url: result.uri,
          dialogTitle: 'Compartilhar Backup',
        });
        return;
      } catch (e) {
        console.error('Erro ao exportar JSON nativo:', e);
      }
    }

    const blob = new Blob([jsonStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName;
    a.click(); URL.revokeObjectURL(url);
  }

  async function exportTXT(){
    let txt = `BACKUP FUTEBOL MANAGER - ${formatarData(todayStr())}\n\n`;
    txt += `--- ATLETAS (${atletas.length}) ---\n`;
    atletas.forEach(a => txt += `${a.nome} - Habilidade: ${a.habilidade} - ${a.goleiro?"Goleiro":"Linha"} - ${a.ativo?"Ativo":"Inativo"}\n`);
    txt += `\n--- PELADAS (${peladas.length}) ---\n`;
    peladas.forEach(p => {
      txt += `\n[${p.nome}] - Criada em ${formatarData(p.data_criacao)} - ${p.ativo?"Ativa":"Inativa"}\n`;
      const ds = datasRealizacao.filter(d=>d.pelada_id===p.id);
      txt += `  Datas: ${ds.length}\n`;
      ds.forEach(d => txt += `  - ${formatarData(d.data)} (${d.status}) - ${d.local||"Sem local"}\n`);
    });
    txt += `\n--- CAMPEONATOS (${campeonatos.length}) ---\n`;
    campeonatos.forEach(c => {
      txt += `\n[${c.name}] - ${c.type==="pontos"?"Pontos":c.type==="mata"?"Mata-Mata":"Misto"} - Times: ${c.teams.join(", ")} - Inscrição por time: ${fmtCur(Number(c.fee||0))}\n`;
    });

    const fileName = `futebol_manager_backup_${todayStr()}.txt`;
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: txt,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: 'Exportar Relatório TXT',
          text: 'Relatório do Futebol Manager',
          url: result.uri,
          dialogTitle: 'Compartilhar Relatório',
        });
        return;
      } catch (e) {
        console.error('Erro ao exportar TXT nativo:', e);
      }
    }

    const blob = new Blob([txt], {type: "text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName;
    a.click(); URL.revokeObjectURL(url);
  }
  function importJSON(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if(Array.isArray(data.atletas)) setAtletas(data.atletas);
        if(Array.isArray(data.atletasCampeonato)) setAtletasCampeonato(data.atletasCampeonato);
        if(Array.isArray(data.quadras)) setQuadras(data.quadras);
        if(Array.isArray(data.peladas)) setPeladas(data.peladas);
        if(Array.isArray(data.datasRealizacao)) setDatasRealizacao(data.datasRealizacao);
        if(Array.isArray(data.participacoes)) setParticipacoes(data.participacoes);
        if(Array.isArray(data.campeonatos)) setCampeonatos(data.campeonatos);
        if(data.financeiro && typeof data.financeiro === 'object') setFinanceiro(data.financeiro);
        if(Array.isArray(data.managers)) setManagers(data.managers);
        alert("Backup restaurado com sucesso!");
        setScreen("home");
      } catch(err) {
        alert("Erro ao ler arquivo de backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const salvarBackupNuvem = async () => {
    if (!isFirebaseConfigured) {
      alert("O Firebase não está configurado. Verifique o arquivo src/firebase.js.");
      return;
    }
    setCloudLoading(true);
    try {
      // Otimiza todas as imagens em background antes de salvar
      const otimizado = await otimizarTodoEstado(appState);
      
      // Atualiza o estado local com os dados comprimidos
      setAppState(otimizado);

      const docKey = (auth.role === "adm" || auth.role === "manager") ? "admin_data" : `manager_${auth.manager_id || "unknown"}`;
      const payload = {
        appState: otimizado,
        lastUpdated: new Date().toISOString(),
        updatedBy: auth.name || "Sem Nome"
      };
      
      const cleanPayload = JSON.parse(JSON.stringify(payload));
      await setDoc(doc(db, "sistema", docKey), cleanPayload);
      localStorage.setItem("last_sync_time", String(new Date(payload.lastUpdated).getTime()));
      alert("Banco de dados completo otimizado e salvo na Nuvem com sucesso! 🚀");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar na nuvem: " + e.message);
    } finally {
      setCloudLoading(false);
    }
  };

  const restaurarBackupNuvem = async () => {
    if (!isFirebaseConfigured) {
      alert("O Firebase não está configurado. Verifique o arquivo src/firebase.js.");
      return;
    }
    if (!window.confirm("Atenção: Isso irá substituir TODOS os seus dados atuais (atletas, peladas, campeonatos e financeiro) pelos dados salvos na nuvem. Deseja continuar?")) {
      return;
    }
    setCloudLoading(true);
    try {
      const docKey = (auth.role === "adm" || auth.role === "manager") ? "admin_data" : `manager_${auth.manager_id || "unknown"}`;
      const docSnap = await getDoc(doc(db, "sistema", docKey));
      if (!docSnap.exists()) {
        alert("Nenhum backup encontrado na nuvem para a sua conta.");
        return;
      }
      const data = docSnap.data();
      if (data.appState) {
        setAppState(data.appState);
        const syncTime = data.lastUpdated ? new Date(data.lastUpdated).getTime() : Date.now();
        localStorage.setItem("last_sync_time", String(syncTime));
        alert(`Dados restaurados com sucesso a partir da nuvem! 🚀\nAtualizado em: ${new Date(data.lastUpdated).toLocaleString("pt-BR")} por ${data.updatedBy}`);
        setScreen("home");
      } else {
        alert("O documento de backup na nuvem está inválido.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao restaurar da nuvem: " + e.message);
    } finally {
      setCloudLoading(false);
    }
  };

  useEffect(()=>{document.body.style.background=t.bg;document.body.style.color=t.text;},[t]);

  if (loading || authLoading) {
    return (
      <div style={{...S.page, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16}}>
        <div style={{fontSize:40, animation: "bounce 2s infinite"}}>⚽</div>
        <div style={{fontWeight:700, color:t.textSec}}>Carregando dados...</div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }`}</style>
      </div>
    );
  }

  if (cloudLoading) {
    return (
      <div style={{...S.page, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16}}>
        <div style={{fontSize:40, animation: "spin 2s linear infinite"}}>🌐</div>
        <div style={{fontWeight:700, color:t.textSec}}>Conectando à nuvem...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const FontScaleBtn = () => {
    let text = "A";
    let title = "Tamanho do Texto: Normal";
    if (fontScale === 1.15) { text = "A+"; title = "Tamanho do Texto: Grande"; }
    else if (fontScale === 1.30) { text = "A++"; title = "Tamanho do Texto: Extra Grande"; }
    else if (fontScale === 1.45) { text = "A+++"; title = "Tamanho do Texto: Gigante"; }
    
    return (
      <button 
        onClick={toggleFontScale} 
        style={{
          ...S.btnSm(t.card, t.text),
          padding: "8px 12px",
          fontSize: 14,
          fontWeight: 800,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          gap: 4
        }}
        title={title}
      >
        🔎 {text}
      </button>
    );
  };

  const DarkBtn=()=><button onClick={()=>setDark(d=>!d)} style={{...S.btnSm(t.card,t.text),padding:"8px 12px",fontSize:15,border:`1px solid ${t.cardBorder}`,borderRadius:12}}>{dark?"☀️":"🌙"}</button>;

  if(screen==="selection"){
    return <SelectionScreen onLoginScreen={()=>setScreen("login")} onAccessCloud={acessarCampeonatoNuvem} t={t} />;
  }

  if(screen==="managerRegistry"){
    if(auth.role !== "adm"){
      return <SelectionScreen onLoginScreen={()=>setScreen("login")} onAccessCloud={acessarCampeonatoNuvem} t={t} />;
    }
    return <ManagerRegistry managers={managers} onAdd={adicionarManager} onUpdate={atualizarManager} onRemove={removerManager} onBack={()=>setScreen("home")} t={t} />;
  }

  if(screen==="login"){
    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={handleForgotPassword} onBack={() => setScreen("selection")} t={t} />;
  }

    if(screen==="public"){
    return <PublicScreen campeonatos={campeonatos} atletas={atletasCampeonato} current={current} setCurrent={setCurrent} onBack={()=>{setCurrent(null);setScreen("selection");}} t={t} />;
  }

  if(screen==="publicCloud"){
    return <CloudPublicChampScreen champ={publicCloudChamp} onBack={()=>{setPublicCloudChamp(null);setScreen("selection");}} t={t} />;
  }

  /* ── HOME ────────────────────────────────────────────────────── */
  if(screen==="home"){
    // Cálculo financeiro
    let entries = [];
    if (dashboardSelectedId !== "") {
      const selectedIdNum = Number(dashboardSelectedId);
      if (dashboardTab === "campeonatos") {
        entries = (financeiroFiltered?.entries || []).filter(e => String(e.champ_id) === String(selectedIdNum));
      } else {
        entries = (financeiroFiltered?.entries || []).filter(e => String(e.pelada_id) === String(selectedIdNum));
      }
    }
    const totalReceita = entries.filter(e => e.type === "receita").reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalDespesa = entries.filter(e => e.type === "despesa").reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const saldoFinal = totalReceita - totalDespesa;

    // Comunicados recentes (últimos posts do mural de todos campeonatos)
    const comunicados = [];
    campeonatos.forEach(c => {
      if (c.mural && c.mural.length > 0) {
        const posts = c.mural.filter(p => p.type === "comunicado" || p.type === "noticia" || p.type === "texto").slice(-2);
        posts.forEach(p => comunicados.push({ ...p, champName: c.name, champId: c.id, champ: c }));
      }
    });
    comunicados.sort((a, b) => (b.date || 0) > (a.date || 0) ? 1 : -1);
    const comunicadosRecentes = comunicados.slice(0, 3);

    // 1. Cálculo de atletas e presença/times para o Card 1
    let card1Label = "Atletas";
    let card1Value = `${atletas.length}`;
    
    if (dashboardTab === "campeonatos") {
      card1Label = "Times / Atletas";
      if (dashboardSelectedId !== "") {
        const campIdSel = Number(dashboardSelectedId);
        const campObj = campeonatos.find(c => c.id === campIdSel);
        const numTimes = campObj && Array.isArray(campObj.teams) ? campObj.teams.length : 0;
        const numAtletas = atletas.filter(a => Array.isArray(a.vinculos) && a.vinculos.includes("campeonato_" + campIdSel)).length;
        card1Value = `${numTimes} / ${numAtletas}`;
      } else {
        const numTimesTotal = campeonatos.reduce((sum, c) => sum + (Array.isArray(c.teams) ? c.teams.length : 0), 0);
        const numAtletasTotal = atletas.filter(a => Array.isArray(a.vinculos) && a.vinculos.some(v => v.startsWith("campeonato_"))).length;
        card1Value = `${numTimesTotal} / ${numAtletasTotal}`;
      }
    } else {
      card1Label = "Atletas / Presença";
      if (dashboardSelectedId !== "") {
        const peladaIdSel = Number(dashboardSelectedId);
        const atletasVinc = atletas.filter(a => Array.isArray(a.vinculos) && a.vinculos.includes("pelada_" + peladaIdSel));
        
        if (dashboardSelectedDataId !== "" && dashboardSelectedDataId !== "todas") {
          const dataIdSel = Number(dashboardSelectedDataId);
          // Filtrar participações daquela pelada e rodada
          const partsData = participacoes.filter(p => p.pelada_id === peladaIdSel && String(p.data_realizacao_id) === String(dataIdSel));
          
          let cadastrados = partsData.length;
          if (cadastrados === 0) {
            cadastrados = atletasVinc.length; // Fallback se as participações não tiverem sido salvas/inicializadas
          }
          const presentesCount = partsData.filter(p => p.compareceu).length;
          card1Value = `${cadastrados} / ${presentesCount}`;
        } else {
          // Todas as datas da pelada
          const datasPel = datasRealizacao.filter(d => d.pelada_id === peladaIdSel && d.status === "realizado");
          
          let totalCadastrados = 0;
          let totalComparecidos = 0;
          datasPel.forEach(d => {
            const partsData = participacoes.filter(p => p.pelada_id === peladaIdSel && String(p.data_realizacao_id) === String(d.id));
            totalCadastrados += partsData.length > 0 ? partsData.length : atletasVinc.length;
            totalComparecidos += partsData.filter(p => p.compareceu).length;
          });
          
          const mediaCadastrados = datasPel.length > 0 ? (totalCadastrados / datasPel.length) : atletasVinc.length;
          const mediaComparecidos = datasPel.length > 0 ? (totalComparecidos / datasPel.length) : 0;
          
          card1Value = `${mediaCadastrados.toFixed(0)} / ${mediaComparecidos.toFixed(0)}`;
        }
      } else {
        // Caso global das peladas
        const totalAtletasPeladas = atletas.filter(a => Array.isArray(a.vinculos) && a.vinculos.some(v => v.startsWith("pelada_"))).length;
        const datasRealizadasTotal = datasRealizacao.filter(d => d.status === "realizado");
        
        let totalCadastradosGeral = 0;
        let totalComparecidosGeral = 0;
        datasRealizadasTotal.forEach(d => {
          const partsData = participacoes.filter(p => p.pelada_id === d.pelada_id && String(p.data_realizacao_id) === String(d.id));
          if (partsData.length > 0) {
            totalCadastradosGeral += partsData.length;
            totalComparecidosGeral += partsData.filter(p => p.compareceu).length;
          } else {
            const atletasVinc = atletas.filter(a => Array.isArray(a.vinculos) && a.vinculos.includes("pelada_" + d.pelada_id));
            totalCadastradosGeral += atletasVinc.length;
          }
        });
        
        const mediaCadastradosGeral = datasRealizadasTotal.length > 0 ? (totalCadastradosGeral / datasRealizadasTotal.length) : totalAtletasPeladas;
        const mediaComparecidosGeral = datasRealizadasTotal.length > 0 ? (totalComparecidosGeral / datasRealizadasTotal.length) : 0;
        
        card1Value = `${mediaCadastradosGeral.toFixed(0)} / ${mediaComparecidosGeral.toFixed(0)}`;
      }
    }

    // 2. Ajuste do Card 2 (Campeonatos ou Peladas)
    let card2Label = "Campeonatos";
    let card2Value = campeonatos.length;
    let card2Icon = "🏆";
    let card2Color = "#06AA48";

    if (dashboardTab === "peladas") {
      card2Label = "Peladas";
      card2Value = peladas.length;
      card2Icon = "👟";
      card2Color = "#378ADD";
    }

    const statCards = [
      { label: card1Label, value: card1Value, icon: "👤", color: "#8e44ad" },
      { label: card2Label, value: card2Value, icon: card2Icon, color: card2Color },
      { label: "Saldo Caixa", value: fmtCur(saldoFinal), icon: "💰", color: saldoFinal >= 0 ? "#20E278" : "#E24B4A" },
    ];

    // Computa o Painel Dinâmico (Artilharia / Info / Ações Rápidas)
    const renderPainelDinamico = () => {
      // 1. Caso Peladas e Selecionado uma Pelada
      if (dashboardTab === "peladas" && dashboardSelectedId !== "") {
        const peladaIdSel = Number(dashboardSelectedId);
        const peladaObj = peladas.find(p => p.id === peladaIdSel);
        
        // Coleta e calcula a artilharia
        const golsAcumulados = {};
        const datasArt = datasRealizacao.filter(d => {
          if (d.pelada_id !== peladaIdSel) return false;
          if (dashboardSelectedDataId !== "" && dashboardSelectedDataId !== "todas") {
            return d.id === Number(dashboardSelectedDataId);
          }
          return true; // Todas as datas
        });

        datasArt.forEach(d => {
          const ps = d.peladaState;
          if (ps && Array.isArray(ps.matchLog)) {
            ps.matchLog.forEach(m => {
              if (m && m.played && m.sumula) {
                Object.keys(m.sumula).forEach(atletaId => {
                  const gols = Number(m.sumula[atletaId]) || 0;
                  if (gols > 0) {
                    golsAcumulados[atletaId] = (golsAcumulados[atletaId] || 0) + gols;
                  }
                });
              }
            });
          }
        });

        const rankArtilharia = Object.keys(golsAcumulados)
          .map(atletaId => {
            const atletaObj = allAtletas.find(a => String(a.id) === String(atletaId));
            return {
              atletaId,
              atleta: atletaObj,
              gols: golsAcumulados[atletaId]
            };
          })
          .filter(x => x.gols > 0)
          .sort((a, b) => b.gols - a.gols);

        if (rankArtilharia.length > 0) {
          // Exibe Artilharia Top 10
          return (
            <div style={S.card}>
              <div style={{fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 14, display: "flex", alignItems: "center", gap: 8}}>
                <span>⚽</span>
                Artilharia - Top 10 ({peladaObj?.nome || "Pelada"})
              </div>
              <div style={{display: "flex", flexDirection: "column", gap: 0}}>
                {rankArtilharia.slice(0, 10).map((x, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px",
                    borderBottom: i !== Math.min(rankArtilharia.length, 10) - 1 ? `1px solid ${t.cardBorder}` : "none",
                    background: i % 2 === 0 ? t.inputBg + "44" : "transparent",
                    borderRadius: 8
                  }}>
                    <div style={{display: "flex", alignItems: "center", gap: 10}}>
                      <span style={{
                        fontWeight: 900,
                        color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : t.textSec,
                        width: 24, fontSize: 13
                      }}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                      </span>
                      <PlayerAvatar atleta={x.atleta} size={28} />
                      <span style={{fontSize: 13, fontWeight: 700, color: t.text}}>
                        {x.atleta ? getPlayerName(x.atleta) : "Atleta Deletado"}
                      </span>
                    </div>
                    <div style={{fontWeight: 800, color: "#378ADD", fontSize: 14, display: "flex", alignItems: "center", gap: 4}}>
                      {x.gols} <span style={{fontSize: 10, color: t.textSec}}>gols</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        } else {
          // Informações da Pelada
          const datasDessaPelada = datasRealizacao.filter(d => d.pelada_id === peladaIdSel);
          const realizadas = datasDessaPelada.filter(d => d.status === "realizado").length;
          const agendadas = datasDessaPelada.filter(d => d.status === "agendado").length;
          const proximaData = datasDessaPelada.find(d => d.status === "agendado");
          
          return (
            <div style={S.card}>
              <div style={{fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 14, display: "flex", alignItems: "center", gap: 8}}>
                <span>👟</span>
                Informações da Pelada: {peladaObj?.nome}
              </div>
              <div style={{display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: t.textSec, lineHeight: 1.6, marginBottom: 16}}>
                <div><b>Data de Criação:</b> {formatarData(peladaObj?.data_criacao)}</div>
                <div style={{display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4}}>
                  <div style={{background: "#378ADD15", padding: "4px 10px", borderRadius: 8, color: "#378ADD", fontWeight: 700}}>
                    📅 {datasDessaPelada.length} Total
                  </div>
                  <div style={{background: "#1D9E7515", padding: "4px 10px", borderRadius: 8, color: "#1D9E75", fontWeight: 700}}>
                    ✅ {realizadas} Realizadas
                  </div>
                  <div style={{background: "#E24B4A15", padding: "4px 10px", borderRadius: 8, color: "#E24B4A", fontWeight: 700}}>
                    ⏳ {agendadas} Agendadas
                  </div>
                </div>
                {proximaData && (
                  <div style={{marginTop: 6, padding: "8px 12px", background: t.inputBg, borderRadius: 8, border: `1px solid ${t.cardBorder}`}}>
                    <b>Próximo Encontro Agendado:</b><br/>
                    📆 {formatarData(proximaData.data)} {proximaData.local ? `em 🏟️ ${proximaData.local}` : ""}
                  </div>
                )}
                {Array.isArray(peladaObj?.collaborators) && peladaObj.collaborators.length > 0 && (
                  <div style={{marginTop: 4}}>
                    <b>Colaboradores ({peladaObj.collaborators.length}):</b><br/>
                    <div style={{display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4}}>
                      {peladaObj.collaborators.map(c => (
                        <span key={c.id} style={{fontSize: 11, background: t.cardBorder + "55", padding: "2px 8px", borderRadius: 6, color: t.text}}>
                          👤 {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => { setCurrent(peladaObj); setScreen("gerenciarPelada"); }}
                style={{...S.btn("#378ADD"), width: "100%", fontWeight: 700}}
              >
                Gerenciar Pelada ⚙️
              </button>
            </div>
          );
        }
      }

      // 2. Caso Campeonatos e Selecionado um Campeonato
      if (dashboardTab === "campeonatos" && dashboardSelectedId !== "") {
        const campIdSel = Number(dashboardSelectedId);
        const campObj = campeonatos.find(c => c.id === campIdSel);
        
        const mDef = campObj ? MODALIDADES_ESPORTIVAS.find(x => x.id === campObj.modalidade) : null;
        
        const stats = {};
        if (campObj && Array.isArray(campObj.groups)) {
          campObj.groups.forEach(g => {
            if (Array.isArray(g.rounds)) {
              g.rounds.forEach(r => {
                if (Array.isArray(r.matches)) {
                  r.matches.forEach(m => {
                    if (Array.isArray(m.events)) {
                      m.events.forEach(e => {
                        if (e.type === "gol") {
                          stats[e.atletaId] = (stats[e.atletaId] || 0) + 1;
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
        
        const artilheiros = Object.keys(stats)
          .map(aid => ({ atletaId: aid, gols: stats[aid] }))
          .sort((a,b) => b.gols - a.gols);
          
        const principalArtilheiro = artilheiros.length > 0 ? allAtletas.find(a => String(a.id) === String(artilheiros[0].atletaId)) : null;

        return (
          <div style={S.card}>
            <div style={{fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 14, display: "flex", alignItems: "center", gap: 8}}>
              <span>🏆</span>
              Informações do Campeonato: {campObj?.name}
            </div>
            <div style={{display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: t.textSec, lineHeight: 1.6, marginBottom: 16}}>
              <div><b>Modalidade:</b> {mDef ? `${mDef.icon} ${mDef.name}` : "🏆 Futebol"}</div>
              <div><b>Tipo de disputa:</b> {campObj?.type === "pontos" ? "Tabela Corrida" : campObj?.type === "mata" ? "Mata-mata" : campObj?.type === "liga" ? "Liga com Grupos" : "Misto"}</div>
              {principalArtilheiro && (
                <div style={{padding: "8px 12px", background: "#FFD70010", borderRadius: 8, border: "1px solid #FFD70033", display: "flex", alignItems: "center", gap: 10}}>
                  <span style={{fontSize: 20}}>👑</span>
                  <div>
                    <div style={{fontWeight: 700, color: t.text}}>Artilheiro Principal:</div>
                    <div style={{fontSize: 12}}>{getPlayerName(principalArtilheiro)} ({artilheiros[0].gols} gols)</div>
                  </div>
                </div>
              )}
              {Array.isArray(campObj?.collaborators) && campObj.collaborators.length > 0 && (
                <div style={{marginTop: 4}}>
                  <b>Colaboradores ({campObj.collaborators.length}):</b><br/>
                  <div style={{display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4}}>
                    {campObj.collaborators.map(c => (
                      <span key={c.id} style={{fontSize: 11, background: t.cardBorder + "55", padding: "2px 8px", borderRadius: 6, color: t.text}}>
                        👤 {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => { setCurrent(campObj); setScreen("gerenciarChamp"); }}
              style={{...S.btn(t.accent), width: "100%", fontWeight: 700}}
            >
              Gerenciar Campeonato ⚙️
            </button>
          </div>
        );
      }

      // 3. Caso Geral (sem nada selecionado): Renderiza as Ações Rápidas Originais
      return (
        <div>
          <div style={{fontSize: 11, fontWeight: 800, color: t.textSec, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8}}>Ações Rápidas</div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12}}>
            {[
              {icon: "🏆", label: "Novo Campeonato", sub: "Grupos, pontos ou chaves", action: () => setScreen("novoChamp"), color: t.accent, scope: "campeonato"},
              {icon: "👟", label: "Nova Pelada", sub: "Sorteador de times rápidos", action: () => setScreen("novaPelada"), color: "#378ADD", scope: "pelada"},
            ].filter(b => auth.role === "adm" || auth.scope === "geral" || auth.scope === b.scope).map(b => (
              <button key={b.label} onClick={b.action}
                style={{
                  ...S.card,
                  textAlign: "center",
                  cursor: "pointer",
                  border: "1.5px solid " + b.color + "22",
                  display: "block",
                  width: "100%",
                  padding: 16,
                  background: t.card,
                  boxSizing: "border-box",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = b.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = b.color + "22"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{fontSize: 28, marginBottom: 6}}>{b.icon}</div>
                <div style={{fontWeight: 800, fontSize: 14, color: b.color}}>{b.label}</div>
                <div style={{fontSize: 11, color: t.textSec, marginTop: 4, lineHeight: 1.4}}>{b.sub}</div>
              </button>
            ))}
          </div>
        </div>
      );
    };

    return renderComLayout(
      <div style={{display: "flex", flexDirection: "column", gap: 20, paddingTop: 4}}>

        {/* Banner de Sincronização */}
        <div style={{...S.card, background: isFirebaseConfigured ? "#20E27808" : "#378ADD08", borderColor: isFirebaseConfigured ? "#20E27830" : "#378ADD30", padding: "12px 16px"}}>
          <div style={{display: "flex", alignItems: "center", gap: 10}}>
            <div style={{fontSize: 18}}>{isFirebaseConfigured ? "☁️" : "💾"}</div>
            <div style={{flex: 1}}>
              <div style={{fontSize: 13, fontWeight: 800, color: isFirebaseConfigured ? "#20E278" : "#378ADD", marginBottom: 2}}>
                {isFirebaseConfigured ? "Conectado ao Firebase Cloud Sync" : "Armazenamento Local Ativo"}
              </div>
              <div style={{fontSize: 11, color: t.textSec}}>
                {isFirebaseConfigured
                  ? "Seus dados são salvos online automaticamente."
                  : "Dados salvos de forma segura neste dispositivo."}
              </div>
            </div>
          </div>
        </div>

        {/* Seleção de Modalidade (Tabs) */}
        <div style={{display: "flex", gap: 10, background: t.inputBg, padding: 6, borderRadius: 16, border: `1px solid ${t.cardBorder}`}}>
          <button 
            onClick={() => { setDashboardTab("campeonatos"); setDashboardSelectedId(""); setDashboardSelectedDataId(""); }}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 12, fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", transition: "all 0.2s ease",
              background: dashboardTab === "campeonatos" ? t.accent : "transparent",
              color: dashboardTab === "campeonatos" ? "#fff" : t.textSec
            }}
          >
            🏆 Campeonatos / Ligas
          </button>
          <button 
            onClick={() => { setDashboardTab("peladas"); setDashboardSelectedId(""); setDashboardSelectedDataId(""); }}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 12, fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", transition: "all 0.2s ease",
              background: dashboardTab === "peladas" ? "#378ADD" : "transparent",
              color: dashboardTab === "peladas" ? "#fff" : t.textSec
            }}
          >
            👟 Peladas / Sorteadores
          </button>
        </div>

        {/* Filtros Elegantes do Dashboard */}
        <div style={{...S.card, padding: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center"}}>
          <div style={{fontSize: 12, fontWeight: 800, color: t.textSec, textTransform: "uppercase", letterSpacing: 0.5}}>Filtro Rápido:</div>
          {dashboardTab === "campeonatos" ? (
            <select 
              value={dashboardSelectedId} 
              onChange={e => setDashboardSelectedId(e.target.value)} 
              style={{...S.select, flex: 1, minWidth: 200}}
            >
              <option value="">Todos os Campeonatos</option>
              {campeonatos.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <>
              <select 
                value={dashboardSelectedId} 
                onChange={e => { setDashboardSelectedId(e.target.value); setDashboardSelectedDataId(""); }} 
                style={{...S.select, flex: 1, minWidth: 200}}
              >
                <option value="">Todas as Peladas</option>
                {peladas.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
              
              {dashboardSelectedId !== "" && (
                <select 
                  value={dashboardSelectedDataId} 
                  onChange={e => setDashboardSelectedDataId(e.target.value)} 
                  style={{...S.select, flex: 1, minWidth: 180}}
                >
                  <option value="todas">Todas as Datas</option>
                  {datasRealizacao.filter(d => d.pelada_id === Number(dashboardSelectedId)).map(d => (
                    <option key={d.id} value={d.id}>📅 {formatarData(d.data)} {d.local ? `(${d.local})` : ""}</option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>

        {/* Cards de Estatísticas */}
        <div style={{display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 12}}>
          {statCards.map((sc, i) => (
            <div key={i} style={{
              ...S.card,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              borderLeft: `4px solid ${sc.color}`,
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "none"}
            >
              <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                <span style={{fontSize: 11, fontWeight: 800, color: t.textSec, textTransform: "uppercase", letterSpacing: 0.5}}>{sc.label}</span>
                <span style={{fontSize: 18}}>{sc.icon}</span>
              </div>
              <div style={{fontSize: 22, fontWeight: 900, color: sc.color, fontFamily: "'Outfit', sans-serif"}}>{sc.value}</div>
            </div>
          ))}
        </div>

        <div style={{display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 16, alignItems: "flex-start"}}>
          {/* COLUNA PRINCIPAL */}
          <div style={{display: "flex", flexDirection: "column", gap: 16}}>

            {/* Painel Dinâmico */}
            {renderPainelDinamico()}

            {/* Feed de Partidas Recentes removido */}

            {/* Lista Mobile de campeonatos */}
            {isMobile && (
              <>
                {campeonatos.length > 0 && (
                  <div>
                    <h3 style={{fontSize: 14, fontWeight: 700, margin: "8px 0 10px 0", color: t.text}}>🏆 Campeonatos</h3>
                    <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                      {campeonatos.map(c => (
                        <div key={c.id} style={{...S.card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", cursor: "pointer"}} onClick={() => {setCurrent(c); setScreen("gerenciarChamp");}}>
                          <div style={{fontWeight: 700, fontSize: 14, color: t.text}}>{c.name}</div>
                          <div style={{fontSize: 11, color: t.textSec}}>{c.teams.length} times</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {peladas.length > 0 && (
                  <div>
                    <h3 style={{fontSize: 14, fontWeight: 700, margin: "8px 0 10px 0", color: t.text}}>👟 Peladas</h3>
                    <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                      {peladas.map(p => (
                        <div key={p.id} style={{...S.card, padding: "12px 14px", cursor: "pointer"}} onClick={() => {setCurrent(p); setScreen("gerenciarPelada");}}>
                          <div style={{fontWeight: 700, fontSize: 14, color: t.text}}>{p.nome}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* COLUNA DIREITA: Financeiro + Comunicados */}
          <div style={{display: "flex", flexDirection: "column", gap: 14}}>
            {/* Resumo Financeiro */}
            <div style={S.card}>
              <div style={{fontSize: 11, fontWeight: 800, color: t.textSec, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8}}>💰 Caixa da Liga</div>
              <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <span style={{fontSize: 12, color: t.textSec}}>Arrecadado:</span>
                  <span style={{fontSize: 13, fontWeight: 700, color: "#20E278"}}>{fmtCur(totalReceita)}</span>
                </div>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <span style={{fontSize: 12, color: t.textSec}}>Despesas:</span>
                  <span style={{fontSize: 13, fontWeight: 700, color: "#E24B4A"}}>{fmtCur(totalDespesa)}</span>
                </div>
                <div style={{borderBottom: "1px solid " + t.cardBorder, margin: "2px 0"}}/>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <span style={{fontSize: 13, fontWeight: 800, color: t.text}}>Saldo:</span>
                  <span style={{fontSize: 15, fontWeight: 900, color: saldoFinal >= 0 ? t.accent : "#E24B4A"}}>{fmtCur(saldoFinal)}</span>
                </div>
                <button onClick={() => setScreen("financeiro")} style={{...S.btnSm(), width: "100%", justifyContent: "center", marginTop: 4}}>
                  Ver Caixa Completo →
                </button>
              </div>
            </div>

            {/* Comunicados Recentes removido */}
          </div>
        </div>
      </div>
    );
  }





  /* ── FINANCEIRO ────────────────────────────────────────────────── */
  if(screen==="financeiro"){
    return renderComLayout(<FinanceiroScreen financeiro={financeiroFiltered} setFinanceiro={setFinanceiroWrapped} participacoes={participacoes} peladas={peladas} campeonatos={campeonatos} datasRealizacao={datasRealizacao} setScreen={setScreen} DarkBtn={DarkBtn} FontScaleBtn={FontScaleBtn} t={t} atletas={atletas} auth={auth} />);
  }

  /* ── BACKUP ────────────────────────────────────────────────────── */
  if(screen==="backup")return renderComLayout(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>💾 Backup e Importação/Exportação</h2>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {isFirebaseConfigured && (
          <div style={{...S.card, borderColor:"#378ADD55", background:"#378ADD08"}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:"#378ADD"}}>☁️ Sincronização e Backup Online (Firebase)</h3>
            <p style={{fontSize:13,color:t.textSec,marginBottom:14}}>
              <b>Sincronização Ativa:</b> Suas alterações locais são salvas na nuvem automaticamente.
            </p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button onClick={salvarBackupNuvem} style={S.btn("#378ADD")}>🚀 Salvar Banco na Nuvem</button>
              <button onClick={restaurarBackupNuvem} style={S.btn("#1D9E75")}>📥 Restaurar da Nuvem</button>
            </div>
          </div>
        )}

        <div style={{...S.card,borderColor:"#1D9E7555",background:"#1D9E7508"}}>
          <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:"#1D9E75"}}>{isFirebaseConfigured ? "✅ Armazenamento Local" : "✅ Armazenamento Automático"}</h3>
          <p style={{fontSize:13,color:t.textSec,marginBottom:8}}>Seus dados são salvos automaticamente no navegador.</p>
          <div style={{fontSize:12,color:t.textSec,background:t.inputBg,padding:"10px",borderRadius:8,marginBottom:10}}>
            <b>Tamanho dos dados salvos:</b> {(storageSize / 1024).toFixed(2)} KB
          </div>
        </div>

        <div style={S.card}>
          <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:t.text}}>📥 Exportar Dados</h3>
          <p style={{fontSize:13,color:t.textSec,marginBottom:14}}>Faça o download de todos os dados do sistema.</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button onClick={exportJSON} style={S.btn("#1D9E75")}>📄 Exportar JSON</button>
            <button onClick={exportTXT} style={S.btn("#378ADD")}>📄 Exportar TXT</button>
          </div>
        </div>
        <div style={{...S.card,borderColor:"#E24B4A55"}}>
          <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:"#E24B4A"}}>📤 Importar Dados (Restaurar)</h3>
          <p style={{fontSize:13,color:t.textSec,marginBottom:14}}>Restaure os dados a partir de um arquivo JSON.</p>
          <label style={{...S.btn("#E24B4A"),display:"inline-flex",cursor:"pointer"}}>
            📂 Selecionar Arquivo JSON
            <input type="file" accept=".json" style={{display:"none"}} onChange={importJSON} />
          </label>
        </div>
      </div>
    </div>
  );

  /* ── QUADRAS ──────────────────────────────────────────────────── */
  if(screen==="quadras")return renderComLayout(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>🏟️ Gerenciamento de Quadras / Campos</h2>
      </div>
      <CRUDQuadras 
        quadras={quadras} 
        onAdd={adicionarQuadra} 
        onUpdate={atualizarQuadra} 
        onRemove={removerQuadra} 
        onExport={exportQuadras} 
        onImport={importQuadras} 
        onDownloadTemplate={downloadQuadrasTemplate} 
        t={t}
      />
    </div>
  );

  /* ── ATLETAS ──────────────────────────────────────────────────── */
  if(screen==="atletas")return renderComLayout(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>👤 Gerenciamento Geral de Atletas</h2>
      </div>
      <CRUDAtletas 
        atletas={atletas} 
        onAdd={adicionarAtleta} 
        onUpdate={atualizarAtleta} 
        onRemove={removerAtleta} 
        onExport={exportAtletas} 
        onImport={importAtletas} 
        onDownloadTemplate={downloadAtletasTemplate} 
        atletasCampeonato={atletasCampeonato} 
        onAddCamp={adicionarAtletaCampeonato} 
        onUpdateCamp={atualizarAtletaCampeonato} 
        onRemoveCamp={removerAtletaCampeonato} 
        onExportCamp={exportAtletasCampeonato} 
        onImportCamp={importAtletasCampeonato} 
        onDownloadTemplateCamp={downloadAtletasCampeonatoTemplate} 
        campeonatos={campeonatos}
        peladas={peladas}
        t={t}
      />
    </div>
  );

  /* ── NOVO CAMPEONATO ──────────────────────────────────────────── */
  if(screen==="novoChamp")return renderComLayout(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>🏆 Criar Novo Campeonato / Liga</h2>
      </div>
      <NovoCampeonato quadras={quadras} onSave={(d, importedAtletas)=>{
        const newD = {...d, manager_id: auth.role === "manager" ? auth.manager_id : null};
        
        if (importedAtletas && importedAtletas.length > 0) {
          newD.rosters = newD.rosters || {};
          const novosAtletasList = [];
          
          importedAtletas.forEach(a => {
            const timeDoAtleta = a.grupo || "";
            if (timeDoAtleta) {
              newD.rosters[timeDoAtleta] = newD.rosters[timeDoAtleta] || [];
              if (!newD.rosters[timeDoAtleta].includes(a.id)) {
                newD.rosters[timeDoAtleta].push(a.id);
              }
            }
            novosAtletasList.push(a);
          });
          
          setAtletasCampeonato(prev => {
            const updated = [...prev];
            novosAtletasList.forEach(a => {
              const idx = updated.findIndex(u => u.nome.toLowerCase() === a.nome.toLowerCase());
              if (idx >= 0) {
                // Atualiza mantendo o ID existente
                updated[idx] = { ...updated[idx], ...a, id: updated[idx].id };
                const timeDoAtleta = a.grupo || "";
                if (timeDoAtleta && newD.rosters[timeDoAtleta]) {
                  newD.rosters[timeDoAtleta] = newD.rosters[timeDoAtleta].map(x => x === a.id ? updated[idx].id : x);
                }
              } else {
                // Adiciona novo atleta
                updated.push({
                  ...a,
                  manager_id: auth.role === "manager" ? auth.manager_id : null
                });
              }
            });
            return updated;
          });
        }

        setCampeonatos(p=>[...p,newD]);
        setCurrent(newD);
        setScreen("gerenciarChamp");
      }} onCancel={()=>setScreen("home")} t={t}/>
    </div>
  );

  /* ── GERENCIAR CAMPEONATO ─────────────────────────────────────── */
  if(screen==="gerenciarChamp"&&current)return renderComLayout(
    <CampeonatoScreen 
      champ={campeonatos.find(c=>c.id===current.id)||current} 
      atletas={atletasCampeonato} 
      onUpdate={atualizarChamp} 
      onDelete={id=>{removerChamp(id); setFinanceiroWrapped(f=>({entries:(f.entries||[]).filter(e=>String(e.champ_id)!==String(id))})); setScreen("home");}} 
      onBack={()=>setScreen("home")} 
      setFinanceiro={setFinanceiroWrapped}
      onAddAtleta={adicionarAtletaCampeonato}
      onUpdateAtleta={atualizarAtletaCampeonato}
      cloudLoading={cloudLoading}
      publicarNaNuvem={publicarNaNuvem}
      t={t}
      tab={activeChampTab}
      setTab={setActiveChampTab}
      isMobile={isMobile}
      auth={auth}
      managers={managers}
      assegurarManagerColaborador={assegurarManagerColaborador}
    />
  );

  /* ── NOVA PELADA ──────────────────────────────────────────────── */
  if(screen==="novaPelada")return renderComLayout(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>👟 Criar Nova Pelada / Sorteador</h2>
      </div>
      <CriarPelada onSave={d=>{adicionarPelada(d);setScreen("home");}} t={t}/>
    </div>
  );

  /* ── GERENCIAR PELADA ─────────────────────────────────────────── */
  if(screen==="gerenciarPelada"&&current){
    const pelAtual=peladas.find(p=>p.id===current.id)||current;
    return renderComLayout(
      <GerenciarPelada
        pelada={pelAtual}
        atletas={atletas}
        participacoes={participacoes}
        datasRealizacao={datasRealizacao}
        onUpdatePelada={atualizarPelada}
        onRemovePelada={id=>{removerPelada(id);setScreen("home");}}
        onAddData={adicionarData}
        onUpdateData={atualizarData}
        onRemoveData={removerData}
        onAddPart={adicionarPart}
        onUpdatePart={atualizarPart}
        onRemovePart={removerPart}
        onSavePartsLote={salvarParticipacoesLote}
        onUpdateAtleta={atualizarAtleta}
        onAddFinanceiro={(desc, amount)=>{setFinanceiroWrapped(f=>({entries:[...f.entries,{id:Date.now(),desc,amount,type:"receita",date:todayStr(),category:"Mensalidade",pelada_id:pelAtual.id,manager_id:auth.role==="manager"?auth.manager_id:null}]}))}}
        onAddAtleta={adicionarAtleta}
        onBack={()=>setScreen("home")}
        t={t}
        aba={activePeladaTab}
        setAba={setActivePeladaTab}
        auth={auth}
        managers={managers}
        assegurarManagerColaborador={assegurarManagerColaborador}
        quadras={quadras}
      />
    );
  }

  if(screen==="managerRegistry"){
    if(auth.role !== "adm"){
      return <SelectionScreen onLoginScreen={()=>setScreen("login")} onAccessCloud={acessarCampeonatoNuvem} t={t} />;
    }
    return renderComLayout(<ManagerRegistry managers={managers} onAdd={adicionarManager} onUpdate={atualizarManager} onRemove={removerManager} onBack={()=>setScreen("home")} t={t} />);
  }

  return null;
}
