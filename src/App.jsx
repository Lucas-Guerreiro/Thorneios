import React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useLocalStorage, clearLocalStorage, getLocalStorageSize } from "./hooks/useLocalStorage";

/* ─────────────────────────── CONSTANTES ─────────────────────────── */
const COLORS = ["#1D9E75","#378ADD","#D85A30","#7F77DD","#BA7517","#D4537E","#639922","#E24B4A","#5F5E5A","#0F6E56"];
const deepClone = o => JSON.parse(JSON.stringify(o));
const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString("pt-BR") : "—";
const fmtCur  = v => `R$ ${Number(v||0).toFixed(2).replace(".",",")}`;
const todayStr= () => new Date().toISOString().split("T")[0];
const SKILL_COLORS = ["#888","#BA7517","#378ADD","#1D9E75","#D85A30"];
const SKILL_NAMES  = ["Iniciante","Básico","Intermediário","Avançado","Elite"];
const LIGHT = { bg:"#f4f6fa",card:"#ffffff",cardBorder:"#e2e8f0",inputBg:"#eef2ff",inputBorder:"#c7d2fe",inputColor:"#1e1e2e",text:"#1e293b",textSec:"#64748b",tabBorder:"#e2e8f0" };
const DARK  = { bg:"#0f1117",card:"#1a1d27",cardBorder:"#2a2d3e",inputBg:"#1e2235",inputBorder:"#3a3f5c",inputColor:"#e2e8f0",text:"#e2e8f0",textSec:"#8892b0",tabBorder:"#2a2d3e" };

function useTheme(){ const[dark,setDark]=useState(false); return{dark,setDark,t:dark?DARK:LIGHT}; }
function makeStyles(t){
  return{
    page:  {minHeight:"100vh",padding:"16px 12px",maxWidth:780,margin:"0 auto",background:t.bg,color:t.text},
    card:  {background:t.card,borderRadius:16,padding:"16px",border:`1px solid ${t.cardBorder}`},
    input: {padding:"9px 13px",borderRadius:10,border:`1.5px solid ${t.inputBorder}`,fontSize:14,background:t.inputBg,color:t.inputColor,width:"100%",boxSizing:"border-box",outline:"none"},
    select:{padding:"9px 13px",borderRadius:10,border:`1.5px solid ${t.inputBorder}`,fontSize:14,background:t.inputBg,color:t.inputColor,width:"100%",boxSizing:"border-box",outline:"none"},
    btn:   (bg,c)=>({padding:"10px 18px",borderRadius:10,border:"none",background:bg||"#1D9E75",color:c||"#fff",cursor:"pointer",fontWeight:600,fontSize:14,display:"inline-flex",alignItems:"center",gap:6}),
    btnSm: (bg,c)=>({padding:"6px 12px",borderRadius:8,border:"none",background:bg||t.card,color:c||t.textSec,cursor:"pointer",fontWeight:500,fontSize:12}),
    label: {fontSize:11,color:t.textSec,fontWeight:700,textTransform:"uppercase",letterSpacing:0.5,marginBottom:5,display:"block"},
    tab:   a=>({padding:"10px 14px",border:"none",borderBottom:a?"2px solid #1D9E75":"2px solid transparent",background:"none",color:a?"#1D9E75":t.textSec,cursor:"pointer",fontSize:13,fontWeight:a?700:400,whiteSpace:"nowrap"}),
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

const getPlayerName = a => a?.apelido || a?.nome || a?.name || "";
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
function generateKO(teams){
  const s=cryptoShuffle([...teams]);const phases=[];let cur=s,ph=1;
  while(cur.length>1){
    const pairs=[];for(let i=0;i<cur.length;i+=2)if(cur[i+1])pairs.push({home:cur[i],away:cur[i+1],homeScore:"",awayScore:"",played:false,winner:null,date:""});
    phases.push({phase:ph,name:phaseName(cur.length),matches:pairs,advancers:[]});
    cur=new Array(Math.ceil(cur.length/2)).fill(null);ph++;
  }
  return phases;
}
function drawBalancedTeams(athletes,numTeams,ppt){
  const shuffled=cryptoShuffle(athletes);
  const teams=Array.from({length:numTeams},(_,i)=>({name:"Time "+(i+1),players:[],skillSum:0}));
  shuffled.forEach((a,idx)=>{const ti=idx%numTeams;teams[ti].players.push(a);teams[ti].skillSum+=a.habilidade||a.skill||3;});
  const bench=cryptoShuffle(teams.reduce((acc,t)=>acc.concat(t.players.slice(ppt)),[]));
  return{fullTeams:teams.map(t=>({name:t.name,players:t.players.slice(0,ppt)})),bench};
}
function buildInitialPeladaState(drawnTeams,bench){
  const queue=drawnTeams.map(t=>t.name);
  return{teams:drawnTeams,queue,bench,matchLog:[],currentMatch:null};
}
function startNextMatch(ps){
  if(!ps||ps.queue.length<2)return ps;
  const[a,b]=[ps.queue[0],ps.queue[1]];
  return{...ps,currentMatch:{teamA:a,teamB:b,scoreA:"",scoreB:"",date:todayStr(),played:false}};
}
function resolveMatch(ps,scoreA,scoreB){
  const sA=parseInt(scoreA),sB=parseInt(scoreB);
  const winner=sA>sB?ps.currentMatch.teamA:sA<sB?ps.currentMatch.teamB:ps.currentMatch.teamA;
  const loser=winner===ps.currentMatch.teamA?ps.currentMatch.teamB:ps.currentMatch.teamA;
  
  const teamAObj = ps.teams.find(t=>t.name===ps.currentMatch.teamA);
  const teamBObj = ps.teams.find(t=>t.name===ps.currentMatch.teamB);
  const playersA = teamAObj ? deepClone(teamAObj.players) : [];
  const playersB = teamBObj ? deepClone(teamBObj.players) : [];

  let newTeams = [...ps.teams];
  let newBench = [...ps.bench];
  const loserObj = newTeams.find(t=>t.name===loser);
  
  if(loserObj && newBench.length > 0) {
    const swapCount = Math.min(newBench.length, loserObj.players.length);
    const leaving = loserObj.players.slice(-swapCount);
    const remaining = loserObj.players.slice(0, loserObj.players.length - swapCount);
    const incoming = newBench.slice(0, swapCount);
    
    const newLoserPlayers = [...incoming, ...remaining];
    newBench = [...newBench.slice(swapCount), ...leaving];
    
    newTeams = newTeams.map(t=>t.name===loser ? {...t, players: newLoserPlayers} : t);
  }
  
  const log=[...ps.matchLog,{...ps.currentMatch,scoreA,scoreB,winner,loser,played:true,playersA,playersB}];
  const rest=ps.queue.slice(2);
  return{...ps,teams:newTeams,queue:[winner,...rest,loser],bench:newBench,matchLog:log,currentMatch:null};
}

/* ─────────────────────────── SMALL UI ───────────────────────────── */
function Avatar({name,size,color}){
  const sz=size||36,col=color||"#1D9E75";
  return <div style={{width:sz,height:sz,borderRadius:"50%",background:col+"33",border:`2px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:sz*0.38,fontWeight:700,color:col}}>{(name||"?")[0].toUpperCase()}</div>;
}
function Tag({label,color}){const c=color||"#1D9E75";return<span style={{background:c+"22",color:c,fontSize:11,padding:"2px 10px",borderRadius:20,fontWeight:600}}>{label}</span>;}
function Sec({title,children,t}){return<div style={{marginBottom:24}}><h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:t.text}}>{title}</h3>{children}</div>;}

/* ─────────────────────────── STANDINGS ──────────────────────────── */
function StandingsTable({standings,teams,colorOf,accent,t}){
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
            <td style={{padding:"9px 6px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><Avatar name={s.name} color={colorOf?colorOf(s.name,teams):"#1D9E75"} size={22}/><span style={{fontWeight:600,color:t.text,fontSize:12}}>{s.name}</span></div></td>
            {[s.j,s.v,s.e,s.d,s.gp,s.gc,s.sg].map((v,vi)=><td key={vi} style={{padding:"9px 6px",textAlign:"center",color:t.text,fontSize:12}}>{v}</td>)}
            <td style={{padding:"9px 6px",textAlign:"center",fontWeight:800,color:ac,fontSize:14}}>{s.pts}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────── FINANCEIRO ─────────────────────────── */
function FinancialPanel({finance,onChange,autoIncome=0,filtro="geral",filtroData="todas",peladas=[],datasRealizacao=[],t}){
  const S=makeStyles(t);
  const[showAdd,setShowAdd]=useState(false);
  const[entry,setEntry]=useState({desc:"",amount:"",type:"receita",date:todayStr(),category:"",pelada_id:"",data_id:""});
  const[editId,setEditId]=useState(null);

  const allEntries=finance?.entries||[];
  const entries = allEntries.filter(e=>{
    if(filtro!=="geral" && String(e.pelada_id)!==String(filtro)) return false;
    if(filtro!=="geral" && filtroData!=="todas" && e.data_id && String(e.data_id)!==String(filtroData)) return false;
    return true;
  });

  const total=entries.reduce((s,e)=>e.type==="receita"?s+Number(e.amount):s-Number(e.amount),0) + autoIncome;
  const receitas=entries.filter(e=>e.type==="receita").reduce((s,e)=>s+Number(e.amount),0) + autoIncome;
  const despesas=entries.filter(e=>e.type==="despesa").reduce((s,e)=>s+Number(e.amount),0);
  const CATS=["Coletes","Água","Bola","Aluguel do campo","Arbitragem","Material esportivo","Premiação","Alimentação","Transporte","Taxa de inscrição","Outros"];

  function save(){
    if(!entry.desc||!entry.amount)return;
    const pId = filtro!=="geral" ? filtro : entry.pelada_id;
    const dId = filtro!=="geral" && pId ? entry.data_id : "";
    const finalEntry = {...entry, pelada_id: pId, data_id: dId};
    if(editId){onChange({entries:allEntries.map(e=>e.id===editId?{...finalEntry,id:editId}:e)});setEditId(null);}
    else{onChange({entries:[...allEntries,{...finalEntry,id:Date.now()}]});}
    setEntry({desc:"",amount:"",type:"receita",date:todayStr(),category:"",pelada_id:"",data_id:""});setShowAdd(false);
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
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}} className="no-print">
              <span style={{fontWeight:700,color:e.type==="receita"?"#1D9E75":"#E24B4A",fontSize:13}}>{e.type==="receita"?"+":"-"}{fmtCur(e.amount)}</span>
              <button onClick={()=>startEdit(e)} style={S.btnSm("#378ADD22","#378ADD")}>✏️</button>
              <button onClick={()=>onChange({entries:allEntries.filter(x=>x.id!==e.id)})} style={S.btnSm("#E24B4A22","#E24B4A")}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceiroScreen({financeiro,setFinanceiro,participacoes,peladas,datasRealizacao,setScreen,DarkBtn,t,atletas}){
  const S=makeStyles(t);
  const[filtro,setFiltroLocal]=useState("geral");
  const[filtroData,setFiltroData]=useState("todas");

  function setFiltro(val){ setFiltroLocal(val); setFiltroData("todas"); }

  const datasPelada = filtro==="geral" ? [] : datasRealizacao.filter(d=>String(d.pelada_id)===String(filtro));

  let autoIncome = 0;
  let autoIncomeDinheiro = 0;
  let autoIncomeSaldo = 0;

  if(filtro==="geral"){
    autoIncomeDinheiro = participacoes.filter(p=>p.pagou&&!p.usou_saldo).reduce((acc,p)=>acc+Number(p.valor||0),0);
    autoIncomeSaldo = participacoes.filter(p=>p.pagou&&p.usou_saldo).reduce((acc,p)=>acc+Number(p.valor||0),0);
    autoIncome = autoIncomeDinheiro;
  }else{
    autoIncomeDinheiro = participacoes.filter(p=>{
      if(!p.pagou || p.usou_saldo || String(p.pelada_id)!==String(filtro)) return false;
      if(filtroData!=="todas" && String(p.data_realizacao_id)!==String(filtroData)) return false;
      return true;
    }).reduce((acc,p)=>acc+Number(p.valor||0),0);

    autoIncomeSaldo = participacoes.filter(p=>{
      if(!p.pagou || !p.usou_saldo || String(p.pelada_id)!==String(filtro)) return false;
      if(filtroData!=="todas" && String(p.data_realizacao_id)!==String(filtroData)) return false;
      return true;
    }).reduce((acc,p)=>acc+Number(p.valor||0),0);

    autoIncome = autoIncomeDinheiro + autoIncomeSaldo;
  }
  const recargasIncome = filtro==="geral" ? financeiro.entries.filter(e=>e.category==="Mensalidade").reduce((acc,e)=>acc+Number(e.amount||0),0) : 0;

  return(
    <div style={S.page} id="print-area">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; box-sizing: border-box; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}} className="no-print">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setScreen("home")} style={S.btnSm()}>← Voltar</button>
          <h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>💰 Financeiro</h2>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>window.print()} style={S.btnSm("#1D9E7522","#1D9E75")}>📄 PDF</button>
          <DarkBtn/>
        </div>
      </div>
      <div style={{display:"flex", gap:10, flexWrap:"wrap", marginBottom:16}} className="no-print">
        <div style={{flex:1, minWidth:200}}>
          <label style={{...S.label,marginRight:10}}>Visualizando Evento:</label>
          <select style={{...S.select,display:"inline-block"}} value={filtro} onChange={e=>setFiltro(e.target.value)}>
            <option value="geral">Visão Geral (Todas as Peladas e Caixa Livre)</option>
            {peladas.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
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
      <div style={{...S.card,marginBottom:16,borderColor:"#1D9E7555",background:"#1D9E7508"}}>
        <h2 style={{fontSize:18,fontWeight:800,margin:"0 0 16px 0",color:t.text,display:"none"}} className="print-title">Relatório Financeiro: {filtro==="geral"?"Geral":(peladas.find(p=>String(p.id)===String(filtro))?.nome||"Evento")}{filtroData!=="todas"&&` - Data: ${fmtDate(datasPelada.find(d=>String(d.id)===String(filtroData))?.data)}`}</h2>
        <style>{`@media print { .print-title { display: block !important; } }`}</style>
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
        {filtro==="geral"&&(
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
      </div>
      {filtro!=="geral"&&(
        <div style={{...S.card,marginBottom:16,borderColor:"#BA751755"}}>
          <div style={{fontWeight:700,color:"#BA7517",marginBottom:10}}>Resumo de Presenças e Pagamentos</div>
          {(()=>{
            const partesFiltradas = participacoes.filter(p=>{
              if(String(p.pelada_id)!==String(filtro)) return false;
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
      <FinancialPanel finance={financeiro} onChange={setFinanceiro} autoIncome={autoIncome} filtro={filtro} filtroData={filtroData} peladas={peladas} datasRealizacao={datasPelada} t={t} />
    </div>
  );
}

/* ─────────────────────────── CRUD ATLETAS ───────────────────────── */
function CRUDAtletas({atletas,onAdd,onUpdate,onRemove,onAddSaldo,t}){
  const S=makeStyles(t);
  const[modal,setModal]=useState(false);
  const[editId,setEditId]=useState(null);
  const[form,setForm]=useState({nome:"",apelido:"",foto:"",habilidade:3,valor_padrao:"",goleiro:false,ativo:true,tipo_pagamento:"diarista",saldo:0});
  const[filtro,setFiltro]=useState("");
  
  const[modalSaldo,setModalSaldo]=useState(null);
  const[addSaldoAmount,setAddSaldoAmount]=useState("");
  const[saldoOp,setSaldoOp]=useState("add"); // "add" | "set"
  const[modalRelatorio,setModalRelatorio]=useState(false);

  function abrirNovo(){setEditId(null);setForm({nome:"",apelido:"",foto:"",habilidade:3,valor_padrao:"",goleiro:false,ativo:true,tipo_pagamento:"diarista",saldo:0});setModal(true);}
  function abrirEdicao(a){setEditId(a.id);setForm({nome:a.nome,apelido:a.apelido||"",foto:a.foto||"",habilidade:a.habilidade,valor_padrao:a.valor_padrao||"",goleiro:a.goleiro,ativo:a.ativo,tipo_pagamento:a.tipo_pagamento||"diarista",saldo:a.saldo||0});setModal(true);}
  function salvar(){if(!form.nome.trim())return;if(editId)onUpdate(editId,form);else onAdd(form);setModal(false);}
  
  function handleAddSaldo(){
    if(addSaldoAmount==="")return;
    const val = Number(addSaldoAmount);
    const a = atletas.find(x=>x.id===modalSaldo);
    
    if(saldoOp === "add") {
      onUpdate(modalSaldo,{saldo:(a.saldo||0)+val});
      if(val > 0) onAddSaldo(a.nome, val); // Só registra no financeiro se for adição real
    } else {
      // Ajuste de valor exato (não passa pelo fluxo de Recarga padrão para não duplicar entradas se for apenas correção)
      onUpdate(modalSaldo,{saldo:val});
    }
    
    setModalSaldo(null);setAddSaldoAmount("");setSaldoOp("add");
  }
  const lista=atletas.filter(a=>a.nome.toLowerCase().includes(filtro.toLowerCase()));
  const ativos=atletas.filter(a=>a.ativo).length;
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[["Total",atletas.length,"#378ADD"],["Ativos",ativos,"#1D9E75"],["Inativos",atletas.length-ativos,"#E24B4A"]].map(([l,v,c])=>(
          <div key={l} style={{...S.card,textAlign:"center",padding:10}}><div style={{fontSize:9,fontWeight:700,color:t.textSec,marginBottom:3}}>{l}</div><div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div></div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <input style={{...S.input,flex:1,minWidth:120}} placeholder="🔍 Buscar atleta..." value={filtro} onChange={e=>setFiltro(e.target.value)}/>
        <button onClick={()=>setModalRelatorio(true)} style={S.btn(t.cardBorder,t.text)}>📋 Mensalistas</button>
        <button onClick={abrirNovo} style={S.btn("#378ADD")}>+ Novo Atleta</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {lista.length===0&&<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:20}}>Nenhum atleta encontrado.</div>}
        {lista.map(a=>(
          <div key={a.id} style={{...S.card,padding:"12px 14px",border:`1px solid ${a.ativo?t.cardBorder:t.cardBorder+"88"}`,opacity:a.ativo?1:0.6}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <PlayerAvatar atleta={a} size={38} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,color:t.text}}>{getPlayerName(a)}{a.apelido?<span style={{fontSize:11,color:t.textSec,marginLeft:6}}>({a.nome})</span>:null}{!a.ativo&&<span style={{marginLeft:8,fontSize:10,background:"#E24B4A22",color:"#E24B4A",padding:"1px 7px",borderRadius:8}}>Inativo</span>}</div>
                <div style={{fontSize:11,color:SKILL_COLORS[a.habilidade-1],fontWeight:600}}>{"⭐".repeat(a.habilidade)} · {SKILL_NAMES[a.habilidade-1]}{a.tipo_pagamento==="mensalista"?` · Mensalista (Saldo: ${fmtCur(a.saldo||0)})`:(a.valor_padrao?` · Diarista (${fmtCur(a.valor_padrao)})`:"")}</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>{setModalSaldo(a.id);setSaldoOp("add");setAddSaldoAmount("");}} style={S.btnSm("#BA751722","#BA7517")}>💰 Saldo</button>
                <button onClick={()=>abrirEdicao(a)} style={S.btnSm("#378ADD22","#378ADD")}>✏️</button>
                <button onClick={()=>{if(window.confirm("Excluir atleta?"))onRemove(a.id);}} style={S.btnSm("#E24B4A22","#E24B4A")}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:16}}>{editId?"✏️ Editar Atleta":"🆕 Novo Atleta"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Nome</label><input style={S.input} value={form.nome} onChange={e=>setForm(v=>({...v,nome:e.target.value}))} placeholder="Nome completo"/></div>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Apelido</label><input style={S.input} value={form.apelido} onChange={e=>setForm(v=>({...v,apelido:e.target.value}))} placeholder="Como é chamado"/></div>
              </div>
              <div>
                <label style={S.label}>Foto</label>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  {form.foto&&<img src={form.foto} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover"}}/>}
                  <input style={{...S.input,flex:1}} value={form.foto} onChange={e=>setForm(v=>({...v,foto:e.target.value}))} placeholder="Cole URL da foto..."/>
                  <label style={{...S.btn("#378ADD22","#378ADD"),margin:0}}>
                    📁 Arquivo
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])resizeImage(e.target.files[0],300,(b64)=>setForm(v=>({...v,foto:b64})))}}/>
                  </label>
                </div>
              </div>
              <div>
                <label style={S.label}>Habilidade</label>
                <div style={{display:"flex",gap:6}}>{[1,2,3,4,5].map(s=><button key={s} onClick={()=>setForm(v=>({...v,habilidade:s}))} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`2px solid ${form.habilidade===s?SKILL_COLORS[s-1]:t.inputBorder}`,background:form.habilidade===s?SKILL_COLORS[s-1]+"22":t.inputBg,cursor:"pointer",fontSize:12,color:form.habilidade===s?SKILL_COLORS[s-1]:t.textSec,fontWeight:form.habilidade===s?700:400}}>{"⭐".repeat(s)}</button>)}</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1}}><label style={S.label}>Tipo de Pagamento</label><select style={S.select} value={form.tipo_pagamento} onChange={e=>setForm(v=>({...v,tipo_pagamento:e.target.value}))}><option value="diarista">Diarista</option><option value="mensalista">Mensalista</option></select></div>
                {form.tipo_pagamento==="diarista" && <div style={{flex:1}}><label style={S.label}>Valor padrão (R$)</label><input style={S.input} type="number" min="0" step="0.01" value={form.valor_padrao} onChange={e=>setForm(v=>({...v,valor_padrao:e.target.value}))}/></div>}
              </div>
              <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text}}><input type="checkbox" checked={form.goleiro} onChange={e=>setForm(v=>({...v,goleiro:e.target.checked}))}/>🧤 Goleiro</label>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text}}><input type="checkbox" checked={form.ativo} onChange={e=>setForm(v=>({...v,ativo:e.target.checked}))}/>✓ Ativo</label>
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={salvar} style={S.btn("#378ADD")}>Salvar</button>
              <button onClick={()=>setModal(false)} style={S.btn(t.card,t.textSec)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {modalSaldo&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:320}}>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:12}}>💰 Gerenciar Saldo</div>
            <div style={{fontSize:13,color:t.textSec,marginBottom:12}}>Atleta: <b>{getPlayerName(atletas.find(x=>x.id===modalSaldo))}</b><br/>Saldo Atual: <b style={{color:t.text}}>{fmtCur(atletas.find(x=>x.id===modalSaldo)?.saldo||0)}</b></div>
            
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              <button onClick={()=>setSaldoOp("add")} style={{flex:1,padding:"6px",fontSize:12,fontWeight:600,borderRadius:8,border:`1px solid ${saldoOp==="add"?"#1D9E75":t.cardBorder}`,background:saldoOp==="add"?"#1D9E75":"transparent",color:saldoOp==="add"?"#fff":t.textSec,cursor:"pointer"}}>➕ Recarregar</button>
              <button onClick={()=>setSaldoOp("set")} style={{flex:1,padding:"6px",fontSize:12,fontWeight:600,borderRadius:8,border:`1px solid ${saldoOp==="set"?"#378ADD":t.cardBorder}`,background:saldoOp==="set"?"#378ADD":"transparent",color:saldoOp==="set"?"#fff":t.textSec,cursor:"pointer"}}>✏️ Corrigir Exato</button>
            </div>

            <div style={{marginBottom:16}}>
              <label style={S.label}>{saldoOp==="add"?"Valor da Recarga (R$)":"Novo Saldo Exato (R$)"}</label>
              <input style={S.input} type="number" step="0.01" value={addSaldoAmount} onChange={e=>setAddSaldoAmount(e.target.value)} placeholder="0.00"/>
              {saldoOp==="add" && <div style={{fontSize:10,color:t.textSec,marginTop:4}}>* Será somado ao saldo atual e registrado no Financeiro Geral.</div>}
              {saldoOp==="set" && <div style={{fontSize:10,color:t.textSec,marginTop:4}}>* Substituirá o saldo atual. Não gera registro no Financeiro.</div>}
            </div>
            
            <div style={{display:"flex",gap:8}}>
              <button onClick={handleAddSaldo} style={S.btn(saldoOp==="add"?"#1D9E75":"#378ADD")}>Confirmar</button>
              <button onClick={()=>{setModalSaldo(null);setAddSaldoAmount("");setSaldoOp("add");}} style={S.btn(t.card,t.textSec)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalRelatorio&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:400,maxHeight:"90vh",overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:16,color:t.text}}>📋 Relatório de Mensalistas</div>
              <button onClick={()=>setModalRelatorio(false)} style={{background:"none",border:"none",color:t.textSec,fontSize:20,cursor:"pointer"}}>×</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,overflowY:"auto",paddingRight:4}}>
              {atletas.filter(a=>a.tipo_pagamento==="mensalista").sort((a,b)=>(a.saldo||0)-(b.saldo||0)).map(a=>{
                const s = a.saldo||0;
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
                )
              })}
              {atletas.filter(a=>a.tipo_pagamento==="mensalista").length===0 && <div style={{fontSize:12,color:t.textSec,textAlign:"center",padding:20}}>Nenhum mensalista cadastrado.</div>}
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
function AbaDatas({peladaId,datasRealizacao,onAdd,onUpdate,onRemove,t}){
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
  return(
    <div>
      <div style={{...S.card,marginBottom:14,border:"1px solid #378ADD33",padding:"12px 14px"}}>
        <div style={{fontWeight:700,fontSize:13,color:"#378ADD",marginBottom:10}}>📅 Agendar Data</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
          <input style={{...S.input,flex:1,minWidth:120}} type="date" value={novaData} onChange={e=>setNovaData(e.target.value)}/>
          <input style={{...S.input,flex:2,minWidth:140}} placeholder="Local (opcional)" value={novoLocal} onChange={e=>setNovoLocal(e.target.value)}/>
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
                  <input style={{...S.input,flex:2}} value={editLocal} onChange={e=>setEditLocal(e.target.value)}/>
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
function AbaAtletasPelada({pelada,atletas,participacoes,onAddPart,onRemovePart,t}){
  const peladaId=pelada.id;
  const S=makeStyles(t);
  const partsPelada=participacoes.filter(p=>p.pelada_id===peladaId);
  const idsVinculados=new Set(partsPelada.map(p=>p.atleta_id));
  const vinculados=atletas.filter(a=>idsVinculados.has(a.id));
  const disponiveis=atletas.filter(a=>a.ativo&&!idsVinculados.has(a.id));
  const[filtro,setFiltro]=useState("");
  const dispFiltrados=disponiveis.filter(a=>a.nome.toLowerCase().includes(filtro.toLowerCase()));
  function vincular(id){
    const atleta=atletas.find(a=>a.id===id);
    onAddPart({atleta_id:id,pelada_id:peladaId,data_realizacao_id:null,pagou:false,compareceu:false,valor:pelada.valor_contribuicao||atleta?.valor_padrao||0});
  }
  function desvincular(atletaId){const p=partsPelada.find(x=>x.atleta_id===atletaId&&x.data_realizacao_id===null);if(p)onRemovePart(p.id);}
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        <div style={{...S.card,textAlign:"center",padding:10}}><div style={{fontSize:9,fontWeight:700,color:t.textSec,marginBottom:3}}>Vinculados</div><div style={{fontSize:18,fontWeight:800,color:"#1D9E75"}}>{vinculados.length}</div></div>
        <div style={{...S.card,textAlign:"center",padding:10}}><div style={{fontSize:9,fontWeight:700,color:t.textSec,marginBottom:3}}>Disponíveis</div><div style={{fontSize:18,fontWeight:800,color:"#378ADD"}}>{disponiveis.length}</div></div>
      </div>
      {vinculados.length>0&&(
        <div style={{marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"#1D9E75",marginBottom:8}}>✅ Atletas Vinculados ({vinculados.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {vinculados.map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:12,background:"#1D9E7510",border:"1px solid #1D9E7533",flexWrap:"wrap"}}>
                <span style={{fontSize:16}}>{a.goleiro?"🧤":"⚽"}</span>
                <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13,color:t.text}}>{a.nome}</div><div style={{fontSize:11,color:SKILL_COLORS[a.habilidade-1]}}>{"⭐".repeat(a.habilidade)} · {SKILL_NAMES[a.habilidade-1]}</div></div>
                <button onClick={()=>desvincular(a.id)} style={S.btnSm("#E24B4A22","#E24B4A")}>Remover</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <div style={{fontWeight:700,fontSize:13,color:"#378ADD",marginBottom:8}}>🔗 Vincular Atleta</div>
        <input style={{...S.input,marginBottom:10}} placeholder="🔍 Buscar atleta disponível..." value={filtro} onChange={e=>setFiltro(e.target.value)}/>
        {dispFiltrados.length===0&&<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:16}}>{atletas.filter(a=>a.ativo).length===0?"Cadastre atletas na seção Atletas primeiro.":"Todos os atletas ativos já estão vinculados."}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {dispFiltrados.map(a=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:12,background:t.inputBg,border:`1px solid ${t.inputBorder}`,flexWrap:"wrap"}}>
              <span style={{fontSize:16}}>{a.goleiro?"🧤":"⚽"}</span>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13,color:t.text}}>{a.nome}</div><div style={{fontSize:11,color:SKILL_COLORS[a.habilidade-1]}}>{"⭐".repeat(a.habilidade)} · {a.valor_padrao?fmtCur(a.valor_padrao):"Sem valor"}</div></div>
              <button onClick={()=>vincular(a.id)} style={S.btn("#1D9E75")}>+ Vincular</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── ABA PARTICIPAÇÕES ──────────────────── */
function AbaParticipacoes({pelada,atletas,participacoes,datasRealizacao,onAdd,onUpdate,onRemove,onUpdateAtleta,onAddFinanceiro,t}){
  const peladaId=pelada.id;
  const S=makeStyles(t);
  const datas=datasRealizacao.filter(d=>d.pelada_id===peladaId&&d.status!=="cancelado");
  const partsPelada=participacoes.filter(p=>p.pelada_id===peladaId);
  const vinculados=[...new Set(partsPelada.map(p=>p.atleta_id))];
  const[selData,setSelData]=useState(datas[0]?.id||null);

  useEffect(()=>{if(!selData&&datas.length>0)setSelData(datas[0].id);},[datas]);

  function registrarPresenca(atletaId,dataId){
    const existe=participacoes.find(p=>p.atleta_id===atletaId&&p.data_realizacao_id===dataId&&p.pelada_id===peladaId);
    const dataObj=datasRealizacao.find(d=>d.id===dataId);
    if(!existe){const atleta=atletas.find(a=>a.id===atletaId);onAdd({atleta_id:atletaId,pelada_id:peladaId,data_realizacao_id:dataId,pagou:false,compareceu:true,valor:dataObj?.valor||pelada.valor_contribuicao||atleta?.valor_padrao||0});}
    else{onUpdate(existe.id,{compareceu:!existe.compareceu});}
  }
  const[absentModal,setAbsentModal]=useState(null);

  function togglePagou(atletaId,dataId){
    const p=participacoes.find(x=>x.atleta_id===atletaId&&x.data_realizacao_id===dataId&&x.pelada_id===peladaId);
    const dataObj=datasRealizacao.find(d=>d.id===dataId);
    const atleta=atletas.find(a=>a.id===atletaId);
    const valorCobrado = dataObj?.valor||pelada.valor_contribuicao||atleta?.valor_padrao||0;

    const vaiPagar = p ? !p.pagou : true;
    const isAusente = p ? !p.compareceu : true;

    if(vaiPagar && isAusente){
      setAbsentModal({aid:atletaId, dataId, pId:p?.id, valor:valorCobrado});
      return;
    }

    if(vaiPagar){
      if((atleta.saldo||0) >= Number(valorCobrado)){
        onUpdateAtleta(atleta.id, {saldo: (atleta.saldo||0) - Number(valorCobrado)});
        if(p) onUpdate(p.id,{pagou:true, usou_saldo:true, valor:valorCobrado});
        else onAdd({atleta_id:atletaId,pelada_id:peladaId,data_realizacao_id:dataId,pagou:true,compareceu:false,valor:valorCobrado,usou_saldo:true});
      } else {
        if(p) onUpdate(p.id,{pagou:true, usou_saldo:false, valor:valorCobrado});
        else onAdd({atleta_id:atletaId,pelada_id:peladaId,data_realizacao_id:dataId,pagou:true,compareceu:false,valor:valorCobrado,usou_saldo:false});
      }
    } else {
      if(p?.usou_saldo) onUpdateAtleta(atleta.id, {saldo: (atleta.saldo||0) + Number(p.valor||valorCobrado)});
      if(p) onUpdate(p.id,{pagou:false, usou_saldo:false});
    }
  }

  if(datas.length===0)return<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>Nenhuma data agendada ou realizada. Crie datas na aba Datas.</div>;
  if(vinculados.length===0)return<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>Nenhum atleta vinculado. Vincule atletas na aba Atletas.</div>;

  const dataAtual=datas.find(d=>d.id===selData)||datas[0];
  const presentes=vinculados.filter(aid=>{const p=participacoes.find(x=>x.atleta_id===aid&&x.data_realizacao_id===dataAtual?.id&&x.pelada_id===peladaId);return p?.compareceu;});
  const pagaram=vinculados.filter(aid=>{const p=participacoes.find(x=>x.atleta_id===aid&&x.data_realizacao_id===dataAtual?.id&&x.pelada_id===peladaId);return p?.pagou;});
  const totalArrecadado=pagaram.reduce((s,aid)=>{const p=participacoes.find(x=>x.atleta_id===aid&&x.data_realizacao_id===dataAtual?.id&&x.pelada_id===peladaId);return s+((p?.usou_saldo)?0:Number(p?.valor||0));},0);

  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {datas.map(d=><button key={d.id} onClick={()=>setSelData(d.id)} style={{padding:"6px 12px",borderRadius:20,fontSize:12,border:`1px solid ${selData===d.id?"#7F77DD":t.cardBorder}`,background:selData===d.id?"#7F77DD":t.card,color:selData===d.id?"#fff":t.textSec,cursor:"pointer",fontWeight:selData===d.id?700:400}}>{formatarData(d.data)}</button>)}
      </div>
      {dataAtual&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            {[["Presentes",presentes.length+"/"+ vinculados.length,"#1D9E75"],["Pagaram",pagaram.length+"/"+presentes.length,"#378ADD"],["Arrecadado",fmtCur(totalArrecadado),"#BA7517"]].map(([l,v,c])=>(
              <div key={l} style={{...S.card,textAlign:"center",padding:10}}><div style={{fontSize:9,fontWeight:700,color:t.textSec,marginBottom:3}}>{l}</div><div style={{fontSize:13,fontWeight:800,color:c}}>{v}</div></div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {vinculados.map(aid=>{
              const atleta=atletas.find(a=>a.id===aid);if(!atleta)return null;
              const part=participacoes.find(p=>p.atleta_id===aid&&p.data_realizacao_id===dataAtual.id&&p.pelada_id===peladaId);
              const compareceu=part?.compareceu||false;
              const pagou=part?.pagou||false;
              return(
                <div key={aid} style={{...S.card,padding:"10px 14px",border:`1px solid ${compareceu?"#1D9E7533":t.cardBorder}`,background:compareceu?"#1D9E7508":t.card}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <PlayerAvatar atleta={atleta} size={30}/>
                    <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13,color:t.text}}>{getPlayerName(atleta)}</div><div style={{fontSize:11,color:SKILL_COLORS[atleta.habilidade-1]}}>{"⭐".repeat(atleta.habilidade)}</div></div>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <button onClick={()=>registrarPresenca(aid,dataAtual.id)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:`1px solid ${compareceu?"#1D9E75":"#ccc"}`,background:compareceu?"#1D9E75":"transparent",color:compareceu?"#fff":t.textSec,cursor:"pointer",fontWeight:600}}>{compareceu?"✓ Presente":"Ausente"}</button>
                      <button onClick={()=>togglePagou(aid,dataAtual.id)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:`1px solid ${pagou?(part?.usou_saldo?"#BA7517":"#378ADD"):"#ccc"}`,background:pagou?(part?.usou_saldo?"#BA7517":"#378ADD"):"transparent",color:pagou?"#fff":t.textSec,cursor:"pointer",fontWeight:600}}>{pagou?(part?.usou_saldo?"💳 Pago (Saldo)":"💰 Pago"):((atleta.saldo||0)>=Number(dataAtual?.valor||pelada.valor_contribuicao||atleta?.valor_padrao||0)?"💳 Debitar Saldo":"Pendente")}</button>
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
                if(absentModal.pId) onUpdate(absentModal.pId, {pagou:true, usou_saldo:false, valor:absentModal.valor});
                else onAdd({atleta_id:absentModal.aid,pelada_id:peladaId,data_realizacao_id:absentModal.dataId,pagou:true,compareceu:false,valor:absentModal.valor,usou_saldo:false});
                setAbsentModal(null);
              }} style={{...S.btn("#1D9E75"),justifyContent:"center"}}>💰 Ir para Caixa da Pelada</button>
              <button onClick={()=>{
                const atleta=atletas.find(a=>a.id===absentModal.aid);
                onUpdateAtleta(atleta.id, {saldo: (atleta.saldo||0) + Number(absentModal.valor)});
                if(onAddFinanceiro) onAddFinanceiro(`Recarga de Saldo (Ausente) - ${getPlayerName(atleta)}`, absentModal.valor);
                if(absentModal.pId) onUpdate(absentModal.pId, {pagou:false, usou_saldo:false});
                setAbsentModal(null);
              }} style={{...S.btn("#BA7517"),justifyContent:"center"}}>💳 Converter em Saldo do Atleta</button>
              <button onClick={()=>setAbsentModal(null)} style={{...S.btn(t.card,t.textSec),justifyContent:"center",marginTop:8}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── GERENCIAR PELADA ───────────────────── */
function GerenciarPelada({pelada,atletas,participacoes,datasRealizacao,onUpdatePelada,onRemovePelada,onAddData,onUpdateData,onRemoveData,onAddPart,onUpdatePart,onRemovePart,onUpdateAtleta,onAddFinanceiro,onBack,t}){
  const S=makeStyles(t);
  const[aba,setAba]=useState("info");
  const ABAS=["info","datas","atletas","participações"];
  const datas=datasRealizacao.filter(d=>d.pelada_id===pelada.id);
  const parts=participacoes.filter(p=>p.pelada_id===pelada.id);

  /* sorteio / jogos */
  const[drawnTeams,setDrawnTeams]=useState(pelada.drawnTeams||null);
  const[peladaState,setPeladaStateLocal]=useState(pelada.peladaState||null);
  const[benchState,setBenchState]=useState(pelada.initialBench||[]);
  const[numTeams,setNumTeams]=useState(2);
  const[ppt,setPpt]=useState(pelada.playersPerTeam||7);
  const[scoreA,setScoreA]=useState("");const[scoreB,setScoreB]=useState("");

  const[modoSorteio,setModoSorteio]=useState("auto");
  const[manualAssignments,setManualAssignments]=useState({});
  const[assignModal,setAssignModal]=useState(null);

  const[selDataSorteio,setSelDataSorteio]=useState(datas[0]?.id||"");
  useEffect(()=>{if(!selDataSorteio&&datas.length>0)setSelDataSorteio(datas[0].id);},[datas]);
  const[addBenchId,setAddBenchId]=useState("");

  const vinculadosIds=[...new Set(parts.map(p=>p.atleta_id))];
  const vinculados=atletas.filter(a=>vinculadosIds.includes(a.id));

  const presentesIds = parts.filter(p=>p.data_realizacao_id===selDataSorteio&&p.compareceu).map(p=>p.atleta_id);
  const presentes = vinculados.filter(a=>presentesIds.includes(a.id));

  function doDraw(){
    if(!selDataSorteio){alert("Selecione uma data para realizar o sorteio!");return;}
    if(presentes.length<ppt){alert(`Você precisa de ao menos ${ppt} atletas presentes na data! (Atuais: ${presentes.length})`);return;}
    const nt=Math.min(numTeams,Math.floor(presentes.length/ppt));
    const{fullTeams,bench}=drawBalancedTeams(presentes,nt,ppt);
    setDrawnTeams(fullTeams);setBenchState(bench);
    const ps=startNextMatch(buildInitialPeladaState(fullTeams,bench));
    setPeladaStateLocal(ps);
    onUpdatePelada(pelada.id,{drawnTeams:fullTeams,initialBench:bench,peladaState:ps,playersPerTeam:ppt});
  }

  function confirmManualFormation() {
    if(!selDataSorteio){alert("Selecione uma data!");return;}
    const unassignedCount = presentes.filter(p => !manualAssignments[p.id] || manualAssignments[p.id]==="none").length;
    if(unassignedCount > 0 && !confirm(`Existem ${unassignedCount} atletas sem time. Deseja iniciar assim mesmo? (Eles não entrarão no jogo)`)) return;
    
    const fullTeams = [];
    for(let i=1; i<=numTeams; i++) {
       const pIds = Object.keys(manualAssignments).filter(id => manualAssignments[id] === `t${i}`);
       const teamPlayers = presentes.filter(p => pIds.includes(String(p.id)));
       if (teamPlayers.length > 0) fullTeams.push({name: "Time "+i, players: teamPlayers});
    }
    const benchIds = Object.keys(manualAssignments).filter(id => manualAssignments[id] === "bench");
    const bench = presentes.filter(p => benchIds.includes(String(p.id)));

    if(fullTeams.length < 2) { alert("Você precisa formar pelo menos 2 times!"); return; }

    setDrawnTeams(fullTeams);setBenchState(bench);
    const ps=startNextMatch(buildInitialPeladaState(fullTeams,bench));
    setPeladaStateLocal(ps);
    onUpdatePelada(pelada.id,{drawnTeams:fullTeams,initialBench:bench,peladaState:ps,playersPerTeam:ppt});
    setAba("jogos");
  }

  function toggleManualAssignment(playerId, target) {
    setManualAssignments(prev => ({...prev, [playerId]: target}));
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
  }

  function addToBench(){
    if(!addBenchId)return;
    const a=atletas.find(x=>String(x.id)===String(addBenchId));if(!a)return;
    const newPlayer={nome:a.nome,name:a.nome,habilidade:a.habilidade,skill:a.habilidade,goleiro:a.goleiro,isGoalkeeper:a.goleiro,id:a.id};
    const newBench=[...benchState,newPlayer];
    setBenchState(newBench);
    let ps=peladaState;
    if(ps){ps={...ps,bench:[...ps.bench,newPlayer]};setPeladaStateLocal(ps);}
    onUpdatePelada(pelada.id,{initialBench:newBench,peladaState:ps});
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
    onUpdatePelada(pelada.id,{drawnTeams:newDrawnTeams,initialBench:newBench,peladaState:ps});
  }
  function saveMatchLocal(){
    if(scoreA===""||scoreB==="")return;
    const ps2=resolveMatch({...peladaState,currentMatch:{...peladaState.currentMatch,scoreA,scoreB,played:true}},scoreA,scoreB);
    const ps3=startNextMatch(ps2);
    setPeladaStateLocal(ps3);
    onUpdatePelada(pelada.id,{peladaState:ps3});
    setScoreA("");setScoreB("");
  }
  function peladaStandings(){
    if(!peladaState?.teams)return[];
    const st=peladaState.teams.map(t=>({name:t.name,j:0,v:0,e:0,d:0,gp:0,gc:0,sg:0,pts:0}));
    (peladaState.matchLog||[]).forEach(m=>{
      const h=st.find(x=>x.name===m.teamA),a=st.find(x=>x.name===m.teamB);if(!h||!a)return;
      const hs=parseInt(m.scoreA),as2=parseInt(m.scoreB);
      h.j++;a.j++;h.gp+=hs;h.gc+=as2;a.gp+=as2;a.gc+=hs;h.sg=h.gp-h.gc;a.sg=a.gp-a.gc;
      if(hs>as2){h.v++;h.pts+=3;a.d++;}else if(hs===as2){h.e++;h.pts++;a.e++;a.pts++;}else{a.v++;a.pts+=3;h.d++;}
    });
    return st.sort((a,b)=>b.pts-a.pts||b.sg-a.sg||b.gp-a.gp);
  }
  const colorOfTeam=n=>{const i=(peladaState?.teams||[]).findIndex(x=>x.name===n);return COLORS[i%COLORS.length]||"#888";};
  const maxTeams=Math.floor(vinculados.length/ppt)||2;

  return(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
          <button onClick={onBack} style={S.btnSm()}>← Voltar</button>
          <div style={{minWidth:0}}><h2 style={{fontSize:17,fontWeight:800,margin:0,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pelada.nome}</h2><div style={{fontSize:11,color:t.textSec}}>{vinculados.length} atletas · {datas.length} datas</div></div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          {!pelada.ativo&&<Tag label="Inativa" color="#E24B4A"/>}
          <button onClick={()=>onRemovePelada(pelada.id)} style={S.btnSm("#E24B4A22","#E24B4A")}>🗑</button>
        </div>
      </div>

      {/* Abas principais */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${t.tabBorder}`,overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:20}}>
        {[...ABAS,"sorteio","jogos","placar"].map(tb=><button key={tb} onClick={()=>setAba(tb)} style={S.tab(aba===tb)}>{tb.charAt(0).toUpperCase()+tb.slice(1)}</button>)}
      </div>

      {aba==="info"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={S.card}>
            <div style={{fontWeight:600,fontSize:13,color:t.text,marginBottom:8}}>Informações da Pelada</div>
            <div style={{fontSize:13,color:t.textSec,lineHeight:2}}><b style={{color:t.text}}>Nome:</b> {pelada.nome}<br/><b style={{color:t.text}}>Criada em:</b> {formatarData(pelada.data_criacao)}<br/><b style={{color:t.text}}>Status:</b> {pelada.ativo?"🟢 Ativa":"🔴 Inativa"}</div>
          </div>
          <CriarPelada onSave={(d)=>onUpdatePelada(pelada.id,d)} initial={pelada} t={t}/>
        </div>
      )}
      {aba==="datas"&&<AbaDatas peladaId={pelada.id} datasRealizacao={datasRealizacao} onAdd={onAddData} onUpdate={onUpdateData} onRemove={onRemoveData} t={t}/>}
      {aba==="atletas"&&<AbaAtletasPelada pelada={pelada} atletas={atletas} participacoes={participacoes} onAddPart={onAddPart} onRemovePart={onRemovePart} t={t}/>}
      {aba==="participações"&&<AbaParticipacoes pelada={pelada} atletas={atletas} participacoes={participacoes} datasRealizacao={datasRealizacao} onAdd={onAddPart} onUpdate={onUpdatePart} onRemove={onRemovePart} onUpdateAtleta={onUpdateAtleta} onAddFinanceiro={onAddFinanceiro} t={t}/>}
      {aba==="sorteio"&&(
        <div>
          <div style={{...S.card,marginBottom:14,background:t.inputBg,border:`1px solid ${t.cardBorder}`}}>
            <div style={{display:"flex",gap:10,marginBottom:14,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:14}}>
              <button onClick={()=>setModoSorteio("auto")} style={{flex:1,padding:"10px",borderRadius:8,fontWeight:600,fontSize:13,background:modoSorteio==="auto"?"#7F77DD":"transparent",color:modoSorteio==="auto"?"#fff":t.textSec,border:`1px solid ${modoSorteio==="auto"?"#7F77DD":t.cardBorder}`,cursor:"pointer"}}>🎲 Sorteio Automático</button>
              <button onClick={()=>setModoSorteio("manual")} style={{flex:1,padding:"10px",borderRadius:8,fontWeight:600,fontSize:13,background:modoSorteio==="manual"?"#378ADD":"transparent",color:modoSorteio==="manual"?"#fff":t.textSec,border:`1px solid ${modoSorteio==="manual"?"#378ADD":t.cardBorder}`,cursor:"pointer"}}>🖐️ Formação Manual</button>
            </div>
            
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
              <label style={{...S.label,margin:0}}>Atletas presentes na data:</label>
              <select style={{...S.select,width:160}} value={selDataSorteio} onChange={e=>setSelDataSorteio(e.target.value)}>
                {datas.map(d=><option key={d.id} value={d.id}>{formatarData(d.data)}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><label style={{...S.label,margin:0}}>Jogadores/time:</label><input type="number" min={5} max={15} value={ppt} onChange={e=>setPpt(Math.max(5,Number(e.target.value)))} style={{...S.input,width:60}}/></div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}><label style={{...S.label,margin:0}}>Times (máx {maxTeams}):</label><input type="number" min={2} max={maxTeams} value={numTeams} onChange={e=>setNumTeams(Math.min(maxTeams,Math.max(2,Number(e.target.value))))} style={{...S.input,width:56}}/></div>
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
          
          {assignModal && (
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
              <div style={{...S.card,width:"100%",maxWidth:300}}>
                <div style={{fontWeight:700,fontSize:15,color:t.text,marginBottom:12}}>Mover {getPlayerName(atletas.find(a=>a.id===assignModal))} para:</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {Array.from({length:numTeams}).map((_,i)=>(
                    <button key={i} onClick={()=>toggleManualAssignment(assignModal, `t${i+1}`)} style={{...S.btn(COLORS[i%COLORS.length]+"22",COLORS[i%COLORS.length]),justifyContent:"center",fontWeight:700}}>Time {i+1}</button>
                  ))}
                  <button onClick={()=>toggleManualAssignment(assignModal, "bench")} style={{...S.btn("#BA751722","#BA7517"),justifyContent:"center",fontWeight:700}}>Banco</button>
                  <button onClick={()=>toggleManualAssignment(assignModal, "none")} style={{...S.btn(t.inputBg,t.text),justifyContent:"center",border:`1px solid ${t.cardBorder}`}}>Sem Time</button>
                  <button onClick={()=>setAssignModal(null)} style={{...S.btn(t.card,t.textSec),justifyContent:"center",marginTop:8,border:"none"}}>Cancelar</button>
                </div>
              </div>
            </div>
          )}
          {drawnTeams&&(
            <div>
              <div style={{...S.card,marginBottom:14,background:t.inputBg,border:`1px dashed ${t.cardBorder}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <label style={{...S.label,margin:0}}>+ Retardatário:</label>
                <select style={{...S.select,flex:1,minWidth:140}} value={addBenchId} onChange={e=>setAddBenchId(e.target.value)}>
                  <option value="">Selecione quem chegou...</option>
                  {vinculados.filter(a=>!benchState.some(b=>String(b.id)===String(a.id)) && !drawnTeams.some(t=>t.players.some(p=>String(p.id)===String(a.id)))).map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
                <button onClick={addToBench} style={S.btn("#BA7517")}>Adicionar ao Banco</button>
              </div>
              {benchState.length>0&&<div style={{...S.card,border:"1px solid #BA751733",background:"#BA751710",marginBottom:12}}><div style={{fontWeight:700,color:"#BA7517",marginBottom:6}}>🪑 Banco ({benchState.length})</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{benchState.map((b,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,padding:"3px 10px",borderRadius:16,background:"#BA751722",color:"#BA7517",fontWeight:600}}><PlayerAvatar atleta={b} size={16}/>{b.goleiro?"🧤":"⚽"} {getPlayerName(b)} <button onClick={()=>removeFromRotation(b.id)} style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:0,marginLeft:4,fontWeight:800}}>×</button></span>)}</div></div>}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
                {drawnTeams.map((tm,ti)=>(
                  <div key={ti} style={{...S.card,borderColor:COLORS[ti%COLORS.length]+"55",padding:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><div style={{width:10,height:10,borderRadius:"50%",background:COLORS[ti%COLORS.length]}}/><span style={{fontWeight:700,fontSize:13,color:t.text}}>{tm.name}</span></div>
                    {tm.players.map((p,pi)=><div key={pi} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,padding:"3px 0",borderBottom:`1px solid ${t.cardBorder}`}}><PlayerAvatar atleta={p} size={18}/><span>{(p.goleiro||p.isGoalkeeper)?"🧤":"⚽"}</span><span style={{flex:1,fontWeight:500,color:t.text}}>{getPlayerName(p)}</span><span style={{color:SKILL_COLORS[(p.habilidade||p.skill||3)-1],fontSize:10}}>{"⭐".repeat(p.habilidade||p.skill||3)}</span><button onClick={()=>removeFromRotation(p.id)} style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:0,fontSize:12,fontWeight:700}}>×</button></div>)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {aba==="jogos"&&(
        <div>
          {peladaState?.currentMatch&&!peladaState.currentMatch.played&&(
            <div style={{...S.card,border:"2px solid #1D9E7555",marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:"#1D9E75",textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>⚽ Jogo {(peladaState.matchLog?.length||0)+1}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:12}}>
                <div style={{...S.card,border:`2px solid ${colorOfTeam(peladaState.currentMatch.teamA)}55`,padding:10,textAlign:"right"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:6}}><span style={{fontWeight:700,fontSize:13,color:t.text}}>{peladaState.currentMatch.teamA}</span><div style={{width:10,height:10,borderRadius:"50%",background:colorOfTeam(peladaState.currentMatch.teamA),flexShrink:0}}/></div>
                  <div style={{fontSize:11,color:t.textSec,marginTop:6,display:"flex",flexDirection:"column",gap:4}}>{peladaState.teams?.find(tm=>tm.name===peladaState.currentMatch.teamA)?.players.map((p,pi)=><div key={pi} style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>{getPlayerName(p)} <PlayerAvatar atleta={p} size={16}/></div>)}</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="number" min={0} max={99} value={scoreA} onChange={e=>setScoreA(e.target.value)} style={{...S.input,width:50,textAlign:"center",padding:"8px 4px",fontSize:18,fontWeight:800}}/>
                    <span style={{fontWeight:700,color:t.textSec}}>×</span>
                    <input type="number" min={0} max={99} value={scoreB} onChange={e=>setScoreB(e.target.value)} style={{...S.input,width:50,textAlign:"center",padding:"8px 4px",fontSize:18,fontWeight:800}}/>
                  </div>
                </div>
                <div style={{...S.card,border:`2px solid ${colorOfTeam(peladaState.currentMatch.teamB)}55`,padding:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:"50%",background:colorOfTeam(peladaState.currentMatch.teamB),flexShrink:0}}/><span style={{fontWeight:700,fontSize:13,color:t.text}}>{peladaState.currentMatch.teamB}</span></div>
                  <div style={{fontSize:11,color:t.textSec,marginTop:6,display:"flex",flexDirection:"column",gap:4}}>{peladaState.teams?.find(tm=>tm.name===peladaState.currentMatch.teamB)?.players.map((p,pi)=><div key={pi} style={{display:"flex",alignItems:"center",gap:6}}><PlayerAvatar atleta={p} size={16}/> {getPlayerName(p)}</div>)}</div>
                </div>
              </div>
              <button onClick={saveMatchLocal} style={{...S.btn(),width:"100%",justifyContent:"center"}}>✓ Registrar</button>
              {peladaState?.queue?.length > 2 && (
                <div style={{marginTop:16, paddingTop:16, borderTop:`1px dashed ${t.cardBorder}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:t.textSec,marginBottom:8,textAlign:"center"}}>Próximo a entrar: <span style={{color:"#7F77DD"}}>{peladaState.queue[2]}</span></div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
                    {peladaState.teams?.find(tm=>tm.name===peladaState.queue[2])?.players.map((p,pi)=><div key={pi} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,background:t.inputBg,padding:"4px 10px",borderRadius:12,border:`1px solid ${t.inputBorder}`}}><PlayerAvatar atleta={p} size={16}/>{getPlayerName(p)}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}
          {!peladaState?.currentMatch&&peladaState?.queue?.length>=2&&(
            <div style={{...S.card,textAlign:"center",marginBottom:16,border:"2px solid #7F77DD55"}}>
              <div style={{fontWeight:600,color:t.text,marginBottom:12}}>Próximo Jogo</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                <div style={{background:"#7F77DD11",padding:10,borderRadius:12}}>
                  <b style={{color:"#7F77DD",display:"block",marginBottom:8}}>{peladaState.queue[0]}</b>
                  <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                    {peladaState.teams?.find(tm=>tm.name===peladaState.queue[0])?.players.map((p,pi)=><div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}><PlayerAvatar atleta={p} size={20}/>{getPlayerName(p)}</div>)}
                  </div>
                </div>
                <div style={{background:"#7F77DD11",padding:10,borderRadius:12}}>
                  <b style={{color:"#7F77DD",display:"block",marginBottom:8}}>{peladaState.queue[1]}</b>
                  <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                    {peladaState.teams?.find(tm=>tm.name===peladaState.queue[1])?.players.map((p,pi)=><div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}><PlayerAvatar atleta={p} size={20}/>{getPlayerName(p)}</div>)}
                  </div>
                </div>
              </div>
              <button onClick={()=>{const ps=startNextMatch(peladaState);setPeladaStateLocal(ps);onUpdatePelada(pelada.id,{peladaState:ps});}} style={S.btn("#7F77DD")}>▶ Iniciar Próximo Jogo</button>
            </div>
          )}
          {!peladaState&&<div style={{textAlign:"center",padding:40,color:t.textSec}}>Faça o sorteio primeiro.</div>}
          {(peladaState?.matchLog||[]).length>0&&(
            <div>
              <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 10px 0",color:t.text}}>📜 Histórico</h3>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[...(peladaState.matchLog||[])].reverse().map((m,i)=>(
                  <div key={i} style={{...S.card,padding:"10px 12px"}}>
                    <div style={{display:"flex",justifyContent:"center",marginBottom:4}}><span style={{fontWeight:800,fontSize:15,color:"#378ADD"}}>{m.scoreA} × {m.scoreB}</span></div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:4}}>
                      <div style={{flex:1,textAlign:"left"}}>
                        <div style={{fontSize:13,fontWeight:m.winner===m.teamA?700:500,color:m.winner===m.teamA?"#1D9E75":t.text}}>{m.teamA}</div>
                        <div style={{fontSize:10,color:t.textSec,marginTop:2,display:"flex",flexDirection:"column",gap:2}}>{(m.playersA||peladaState.teams?.find(tm=>tm.name===m.teamA)?.players||[]).map((p,pi)=><div key={pi}>{getPlayerName(p)}</div>)}</div>
                      </div>
                      <div style={{padding:"0 6px",marginTop:2}}><span style={{fontSize:10,color:"#1D9E75",fontWeight:600}}>🏆 {m.winner}</span></div>
                      <div style={{flex:1,textAlign:"right"}}>
                        <div style={{fontSize:13,fontWeight:m.winner===m.teamB?700:500,color:m.winner===m.teamB?"#1D9E75":t.text}}>{m.teamB}</div>
                        <div style={{fontSize:10,color:t.textSec,marginTop:2,display:"flex",flexDirection:"column",gap:2}}>{(m.playersB||peladaState.teams?.find(tm=>tm.name===m.teamB)?.players||[]).map((p,pi)=><div key={pi}>{getPlayerName(p)}</div>)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {aba==="placar"&&<StandingsTable standings={peladaStandings()} teams={(peladaState?.teams||[]).map(x=>x.name)} colorOf={colorOfTeam} accent="#378ADD" t={t}/>}
    </div>
  );
}

/* ─────────────────────────── CAMPEONATO ─────────────────────────── */
function CampeonatoScreen({champ,atletas,onUpdate,onDelete,onBack,t}){
  const S=makeStyles(t);
  const[tab,setTab]=useState("jogos");
  const[editing,setEditing]=useState(null);
  const[sumulaModal,setSumulaModal]=useState(null); // {match, eKey, onSaveSumula, home, away}
  const[selTeamElenco,setSelTeamElenco]=useState(champ.teams[0]||"");
  const colorOf=useCallback((n,teams)=>COLORS[(teams||[]).indexOf(n)%COLORS.length],[]);
  const c=champ;
  const rosters = c.rosters || {}; // { teamName: [id1, id2] }
  function saveRR(ri,mi,hs,as2,dt){const tc=deepClone(c);const m=tc.rounds[ri].matches[mi];m.homeScore=hs;m.awayScore=as2;m.played=true;if(dt)m.date=dt;tc.standings=recalcStandings(tc.teams,tc.rounds);onUpdate(tc);setEditing(null);}
  function saveGroup(gi,ri,mi,hs,as2,dt){const tc=deepClone(c);const m=tc.groups[gi].rounds[ri].matches[mi];m.homeScore=hs;m.awayScore=as2;m.played=true;if(dt)m.date=dt;tc.groups[gi].standings=recalcStandings(tc.groups[gi].teams,tc.groups[gi].rounds);onUpdate(tc);setEditing(null);}
  function saveKO(pi,mi,hs,as2,dt){
    if(parseInt(hs)===parseInt(as2)){alert("Sem empate no mata-mata!");return;}
    const tc=deepClone(c);const ph=tc.knockout[pi];const m=ph.matches[mi];
    m.homeScore=hs;m.awayScore=as2;m.played=true;m.winner=parseInt(hs)>parseInt(as2)?m.home:m.away;if(dt)m.date=dt;
    if(ph.matches.every(x=>x.played)){ph.advancers=ph.matches.map(x=>x.winner);if(tc.knockout[pi+1]){const adv=ph.advancers;tc.knockout[pi+1].matches=[];for(let i=0;i<adv.length;i+=2)if(adv[i+1])tc.knockout[pi+1].matches.push({home:adv[i],away:adv[i+1],homeScore:"",awayScore:"",played:false,winner:null,date:""}); }}
    onUpdate(tc);setEditing(null);
  }
  function advanceMixed(){const tc=deepClone(c);const q=[];tc.groups.forEach(g=>{if(g.standings[0])q.push(g.standings[0].name);if(g.standings[1])q.push(g.standings[1].name);});tc.knockout=generateKO(q);tc.mixedPhase="knockout";onUpdate(tc);}
  const lastPhase=c.knockout?.length>0?c.knockout[c.knockout.length-1]:null;
  const champion=(c.type==="mata"||(c.type==="misto"&&c.mixedPhase==="knockout"))&&lastPhase?.matches?.[0]?.winner||(c.type==="pontos"&&c.rounds?.every(r=>r.matches.every(m=>m.played))&&c.standings?.[0]?.name)||null;
  const tabs=["elencos", ... (c.type==="pontos"?["tabela","jogos"]:c.type==="mata"?["chave","jogos"]:["tabela","chave","jogos"]), "estatísticas"];

  function handleSaveSumula(m, events) {
     const tc=deepClone(c);
     // Encontrar a partida no tc e salvar os events
     let found = false;
     if(tc.rounds) {
       for(const r of tc.rounds){ const mr=r.matches.find(x=>x.home===m.home&&x.away===m.away); if(mr){ mr.events=events; found=true; break; } }
     }
     if(!found && tc.groups) {
       for(const g of tc.groups){ for(const r of g.rounds){ const mr=r.matches.find(x=>x.home===m.home&&x.away===m.away); if(mr){ mr.events=events; found=true; break; } } }
     }
     if(!found && tc.knockout) {
       for(const p of tc.knockout){ const mr=p.matches.find(x=>x.home===m.home&&x.away===m.away); if(mr){ mr.events=events; found=true; break; } }
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
    if(!selTeamElenco) return null;
    const teamRoster = rosters[selTeamElenco] || [];
    const allRosteredIds = Object.values(rosters).flat();
    const notInTeam = atletas.filter(a => !allRosteredIds.includes(a.id));
    return (
      <div>
        <div style={{display:"flex",gap:8,overflowX:"auto",marginBottom:16,paddingBottom:8}}>
          {c.teams.map(tm=>(
            <button key={tm} onClick={()=>setSelTeamElenco(tm)} style={{...S.btnSm(selTeamElenco===tm?colorOf(tm,c.teams):"transparent", selTeamElenco===tm?"#fff":t.textSec), border:`1px solid ${selTeamElenco===tm?colorOf(tm,c.teams):t.cardBorder}`, whiteSpace:"nowrap", fontWeight:600}}>{tm}</button>
          ))}
        </div>
        <div style={S.card}>
          <div style={{fontWeight:800,fontSize:14,color:colorOf(selTeamElenco,c.teams),marginBottom:12}}>Elenco: {selTeamElenco}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
            {teamRoster.map(id=>{
              const a = atletas.find(x=>x.id===id);
              if(!a) return null;
              return <span key={id} onClick={()=>{
                 const tc=deepClone(c); tc.rosters = tc.rosters||{}; tc.rosters[selTeamElenco]=tc.rosters[selTeamElenco].filter(x=>x!==id); onUpdate(tc);
              }} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:20,background:t.inputBg,border:`1px solid ${t.cardBorder}`,fontSize:12,color:t.text,cursor:"pointer"}}><PlayerAvatar atleta={a} size={16}/> {getPlayerName(a)} ✕</span>
            })}
            {teamRoster.length===0 && <div style={{fontSize:12,color:t.textSec}}>Nenhum atleta associado a este time.</div>}
          </div>
          <div style={{fontWeight:700,fontSize:12,color:t.textSec,marginBottom:8}}>Adicionar ao time:</div>
          <div style={{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
            {notInTeam.map(a=>(
               <div key={a.id} onClick={()=>{
                  const tc=deepClone(c); tc.rosters = tc.rosters||{}; tc.rosters[selTeamElenco]=[...(tc.rosters[selTeamElenco]||[]), a.id]; onUpdate(tc);
               }} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,background:t.inputBg,cursor:"pointer",border:`1px solid transparent`}}>
                 <PlayerAvatar atleta={a} size={20}/>
                 <span style={{fontSize:12,color:t.text}}>{getPlayerName(a)}</span>
                 <span style={{marginLeft:"auto",color:"#378ADD",fontWeight:700,fontSize:14}}>+</span>
               </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  function MatchRow({m,eKey,onSave}){
    const isEd=editing?.key===eKey;
    const[hs,setHs]=useState(m.homeScore||"");const[as2,setAs2]=useState(m.awayScore||"");const[dt,setDt]=useState(m.date||"");
    if(isEd)return(
      <div style={{...S.card,padding:12,border:"1.5px solid #1D9E7555"}}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:5,flex:1}}><Avatar name={m.home} color={colorOf(m.home,c.teams)} size={22}/><span style={{fontSize:12,color:t.text}}>{m.home}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <input type="number" min={0} max={99} value={hs} onChange={e=>setHs(e.target.value)} style={{...S.input,width:46,textAlign:"center",padding:"5px 4px"}}/>
              <span style={{color:t.textSec,fontWeight:700}}>×</span>
              <input type="number" min={0} max={99} value={as2} onChange={e=>setAs2(e.target.value)} style={{...S.input,width:46,textAlign:"center",padding:"5px 4px"}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,flex:1,justifyContent:"flex-end"}}><span style={{fontSize:12,color:t.text}}>{m.away}</span><Avatar name={m.away} color={colorOf(m.away,c.teams)} size={22}/></div>
          </div>
          <input type="date" value={dt} onChange={e=>setDt(e.target.value)} style={S.input}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onSave(hs,as2,dt)} style={{...S.btn(),flex:1,justifyContent:"center"}}>Salvar</button>
            <button onClick={()=>setEditing(null)} style={S.btn(t.card,t.textSec)}>✕</button>
          </div>
        </div>
      </div>
    );
    return(
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",border:`1px solid ${t.cardBorder}`,borderRadius:12,background:t.card,gap:6,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:5,flex:1,justifyContent:"flex-end",minWidth:80}}><span style={{fontSize:12,fontWeight:500,color:t.text,textAlign:"right"}}>{m.home}</span><Avatar name={m.home} color={colorOf(m.home,c.teams)} size={24}/></div>
        <div style={{textAlign:"center",minWidth:70,flexShrink:0}}>{m.played?<span style={{fontWeight:800,fontSize:15,color:"#1D9E75"}}>{m.homeScore}×{m.awayScore}</span>:<span style={{color:t.textSec}}>—×—</span>}</div>
        <div style={{display:"flex",alignItems:"center",gap:5,flex:1,minWidth:80}}><Avatar name={m.away} color={colorOf(m.away,c.teams)} size={24}/><span style={{fontSize:12,fontWeight:500,color:t.text}}>{m.away}</span></div>
        <div style={{display:"flex",gap:4,flexShrink:0}}>
           {m.played && <button onClick={()=>setSumulaModal({m, eKey})} style={{...S.btnSm("#378ADD22","#378ADD"),padding:"6px"}}>📝</button>}
           <button onClick={()=>setEditing({key:eKey})} style={{...S.btnSm(),padding:"6px 12px"}}>{m.played?"✏️":"▶"}</button>
        </div>
      </div>
    );
  }

  return(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
          <button onClick={onBack} style={S.btnSm()}>← Voltar</button>
          <div style={{minWidth:0}}><h2 style={{fontSize:17,fontWeight:800,margin:0,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</h2><div style={{fontSize:11,color:t.textSec}}>{c.type==="pontos"?"Pontos Corridos":c.type==="mata"?"Mata-Mata":"Misto"} · {c.teams.length} times</div></div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          {champion&&<Tag label={"🏆 "+champion}/>}
          <button onClick={()=>onDelete(c.id)} style={S.btnSm("#E24B4A22","#E24B4A")}>🗑</button>
        </div>
      </div>
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`1px solid ${t.tabBorder}`,overflowX:"auto"}}>
        {tabs.map(tb=><button key={tb} onClick={()=>setTab(tb)} style={S.tab(tab===tb)}>{tb.charAt(0).toUpperCase()+tb.slice(1)}</button>)}
      </div>
      {tab==="tabela"&&c.type==="pontos"&&(
         <>
           <StandingsTable standings={c.standings} teams={c.teams} colorOf={colorOf} t={t}/>
           <ResumoArtilharia />
         </>
      )}
      {tab==="tabela"&&c.type==="misto"&&(
         <div>
           {c.groups.map((g,gi)=><div key={gi} style={{marginBottom:20}}><h3 style={{fontSize:14,fontWeight:700,marginBottom:10,color:t.text}}>{g.name}</h3><StandingsTable standings={g.standings} teams={c.teams} colorOf={colorOf} t={t}/></div>)}
           {c.mixedPhase==="groups"&&<button onClick={advanceMixed} style={S.btn("#378ADD")}>Avançar para Mata-Mata →</button>}
           <ResumoArtilharia />
         </div>
      )}
      
      {tab==="elencos" && <AbaElencos />}
      {tab==="estatísticas" && renderEstatisticas()}
      {tab==="chave"&&c.knockout&&(
        <div style={{overflowX:"auto"}}>
          <div style={{display:"flex",gap:14,minWidth:"fit-content",paddingBottom:8}}>
            {c.knockout.map((phase,pi)=>(
              <div key={pi} style={{minWidth:200}}>
                <div style={{fontSize:11,fontWeight:700,color:t.textSec,textAlign:"center",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>{phase.name}</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {phase.matches.map((m,mi)=>{
                    const eKey="ko-"+pi+"-"+mi,isEd=editing?.key===eKey;
                    return(
                      <div key={mi} style={{border:`1px solid ${t.cardBorder}`,borderRadius:12,overflow:"hidden",background:t.card}}>
                        {[{tm:m.home,s:m.homeScore,w:m.winner===m.home},{tm:m.away,s:m.awayScore,w:m.winner===m.away}].map((side,si)=>(
                          <div key={si} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",borderBottom:si===0?`1px solid ${t.cardBorder}`:"none",background:side.w?"#1D9E7514":"transparent"}}>
                            <div style={{display:"flex",alignItems:"center",gap:5}}><Avatar name={side.tm||"?"} color={colorOf(side.tm,c.teams)} size={20}/><span style={{fontSize:11,color:t.text}}>{side.tm||"—"}</span></div>
                            <span style={{fontWeight:700,color:side.w?"#1D9E75":t.text,fontSize:13}}>{m.played?side.s:"—"}</span>
                          </div>
                        ))}
                        {m.home&&m.away&&(isEd?(
                          <div style={{padding:10,display:"flex",flexDirection:"column",gap:7,background:t.inputBg}}>
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <input type="number" min={0} max={99} value={editing.hs||""} onChange={e=>setEditing(v=>({...v,hs:e.target.value}))} style={{...S.input,width:42,textAlign:"center",padding:"5px 3px"}}/>
                              <span style={{color:t.text}}>×</span>
                              <input type="number" min={0} max={99} value={editing.as2||""} onChange={e=>setEditing(v=>({...v,as2:e.target.value}))} style={{...S.input,width:42,textAlign:"center",padding:"5px 3px"}}/>
                            </div>
                            <input type="date" value={editing.dt||""} onChange={e=>setEditing(v=>({...v,dt:e.target.value}))} style={{...S.input,fontSize:11,padding:"5px 7px"}}/>
                            <div style={{display:"flex",gap:5}}>
                              <button onClick={()=>saveKO(pi,mi,editing.hs||"",editing.as2||"",editing.dt||"")} style={{...S.btn(),flex:1,justifyContent:"center",fontSize:11,padding:5}}>Salvar</button>
                              <button onClick={()=>setEditing(null)} style={{...S.btn(t.card,t.textSec),padding:"5px 8px",fontSize:11}}>✕</button>
                            </div>
                          </div>
                        ):(
                          <div style={{padding:"5px 10px",textAlign:"center",display:"flex",gap:4,justifyContent:"center"}}>
                            {m.played && <button onClick={()=>setSumulaModal({m, eKey})} style={{...S.btnSm("#378ADD22","#378ADD"),padding:"4px 10px"}}>📝 Súmula</button>}
                            <button onClick={()=>setEditing({key:eKey,hs:m.homeScore||"",as2:m.awayScore||"",dt:m.date||""})} style={S.btnSm()}>{m.played?"✏️":"▶"}</button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab==="jogos"&&c.type==="pontos"&&<div style={{display:"flex",flexDirection:"column",gap:18}}>{c.rounds.map((rd,ri)=><Sec key={ri} title={"Rodada "+rd.round} t={t}><div style={{display:"flex",flexDirection:"column",gap:8}}>{rd.matches.map((m,mi)=><MatchRow key={mi} m={m} eKey={"rr-"+ri+"-"+mi} onSave={(hs,as2,dt)=>saveRR(ri,mi,hs,as2,dt)}/>)}</div></Sec>)}</div>}
      {tab==="jogos"&&c.type==="mata"&&<div style={{display:"flex",flexDirection:"column",gap:18}}>{c.knockout.map((phase,pi)=><Sec key={pi} title={phase.name} t={t}><div style={{display:"flex",flexDirection:"column",gap:8}}>{phase.matches.map((m,mi)=><MatchRow key={mi} m={m} eKey={"ko-"+pi+"-"+mi} onSave={(hs,as2,dt)=>saveKO(pi,mi,hs,as2,dt)}/>)}</div></Sec>)}</div>}
      {tab==="jogos"&&c.type==="misto"&&<div style={{display:"flex",flexDirection:"column",gap:24}}>{c.groups.map((g,gi)=><div key={gi}><h3 style={{fontSize:14,fontWeight:700,marginBottom:10,color:t.text}}>{g.name}</h3>{g.rounds.map((rd,ri)=><Sec key={ri} title={"Rodada "+rd.round} t={t}><div style={{display:"flex",flexDirection:"column",gap:8}}>{rd.matches.map((m,mi)=><MatchRow key={mi} m={m} eKey={"gr-"+gi+"-"+ri+"-"+mi} onSave={(hs,as2,dt)=>saveGroup(gi,ri,mi,hs,as2,dt)}/>)}</div></Sec>)}</div>)}</div>}
      
      {sumulaModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:400,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:16,color:t.text}}>📝 Súmula da Partida</div>
              <button onClick={()=>setSumulaModal(null)} style={{background:"none",border:"none",color:t.textSec,fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            
            <div style={{display:"flex",justifyContent:"center",gap:20,marginBottom:20}}>
              <div style={{textAlign:"center",fontWeight:700,color:t.text}}>{sumulaModal.m.home}<br/><span style={{fontSize:20,color:"#1D9E75"}}>{sumulaModal.m.homeScore}</span></div>
              <div style={{fontSize:20,fontWeight:700,color:t.textSec,marginTop:10}}>×</div>
              <div style={{textAlign:"center",fontWeight:700,color:t.text}}>{sumulaModal.m.away}<br/><span style={{fontSize:20,color:"#1D9E75"}}>{sumulaModal.m.awayScore}</span></div>
            </div>

            <div style={{flex:1,overflowY:"auto",paddingRight:4,display:"flex",flexDirection:"column",gap:16}}>
              {["home","away"].map(side=>{
                 const tm = sumulaModal.m[side];
                 const tmRoster = rosters[tm] || [];
                 const evts = (sumulaModal.m.events||[]).filter(e=>e.teamName===tm);
                 return (
                   <div key={side} style={{border:`1px solid ${t.cardBorder}`,padding:10,borderRadius:12}}>
                     <div style={{fontWeight:800,color:colorOf(tm,c.teams),marginBottom:10,fontSize:13}}>{tm}</div>
                     <div style={{display:"flex",flexDirection:"column",gap:6}}>
                       {evts.map((e,i)=>(
                         <div key={i} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:t.text,background:t.inputBg,padding:"6px 10px",borderRadius:8}}>
                           <span>{e.type==="gol"?"⚽":e.type==="amarelo"?"🟨":"🟥"}</span>
                           <PlayerAvatar atleta={atletas.find(x=>String(x.id)===String(e.atletaId))} size={18}/>
                           <span style={{flex:1}}>{getPlayerName(atletas.find(x=>String(x.id)===String(e.atletaId)))}</span>
                           <button onClick={()=>{
                              const newEvts = [...(sumulaModal.m.events||[])];
                              newEvts.splice(newEvts.indexOf(e),1);
                              setSumulaModal(prev=>({...prev, m:{...prev.m, events:newEvts}}));
                           }} style={{background:"none",border:"none",color:"#E24B4A",cursor:"pointer",fontWeight:800}}>✕</button>
                         </div>
                       ))}
                     </div>
                     <div style={{marginTop:10,display:"flex",gap:6}}>
                       <select id={`sel-${side}`} style={{...S.select,padding:"6px",fontSize:12,flex:1}}>
                         <option value="">Selecione o jogador...</option>
                         {tmRoster.map(id=><option key={id} value={id}>{getPlayerName(atletas.find(x=>String(x.id)===String(id)))}</option>)}
                       </select>
                       <div style={{display:"flex",gap:4}}>
                         <button onClick={()=>{
                            const val = document.getElementById(`sel-${side}`).value; if(!val)return;
                            const newEvts = [...(sumulaModal.m.events||[]), {id:Date.now()+Math.random(), type:"gol", atletaId:val, teamName:tm}];
                            setSumulaModal(prev=>({...prev, m:{...prev.m, events:newEvts}}));
                         }} style={{...S.btnSm("#378ADD22","#378ADD"),padding:"6px"}}>⚽</button>
                         <button onClick={()=>{
                            const val = document.getElementById(`sel-${side}`).value; if(!val)return;
                            const newEvts = [...(sumulaModal.m.events||[]), {id:Date.now()+Math.random(), type:"amarelo", atletaId:val, teamName:tm}];
                            setSumulaModal(prev=>({...prev, m:{...prev.m, events:newEvts}}));
                         }} style={{...S.btnSm("#BA751722","#BA7517"),padding:"6px"}}>🟨</button>
                         <button onClick={()=>{
                            const val = document.getElementById(`sel-${side}`).value; if(!val)return;
                            const newEvts = [...(sumulaModal.m.events||[]), {id:Date.now()+Math.random(), type:"vermelho", atletaId:val, teamName:tm}];
                            setSumulaModal(prev=>({...prev, m:{...prev.m, events:newEvts}}));
                         }} style={{...S.btnSm("#E24B4A22","#E24B4A"),padding:"6px"}}>🟥</button>
                       </div>
                     </div>
                   </div>
                 )
              })}
            </div>
            
            <div style={{marginTop:16}}>
              <button onClick={()=>handleSaveSumula(sumulaModal.m, sumulaModal.m.events||[])} style={{...S.btn(),width:"100%",justifyContent:"center"}}>Salvar Súmula</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── NOVO CAMPEONATO ────────────────────── */
function NovoCampeonato({onSave,onCancel,t}){
  const S=makeStyles(t);
  const[cf,setCf]=useState({name:"",type:"pontos",turno:true,date:"",teams:["",""],groupCount:2});
  function criar(){
    const teams=cf.teams.map(x=>x.trim()).filter(Boolean);
    if(teams.length<2){alert("Mínimo 2 times!");return;}
    if(new Set(teams).size!==teams.length){alert("Times duplicados!");return;}
    let data={id:Date.now(),name:cf.name||"Campeonato",type:cf.type,teams,date:cf.date};
    if(cf.type==="pontos"){data.rounds=generateRR(teams,cf.turno);data.standings=initStandings(teams);}
    else if(cf.type==="mata"){data.knockout=generateKO(teams);}
    else{const gc=Math.min(cf.groupCount,Math.floor(teams.length/2));const groups=Array.from({length:gc},(_,i)=>({name:"Grupo "+String.fromCharCode(65+i),teams:[]}));teams.forEach((tm,i)=>groups[i%gc].teams.push(tm));data.groups=groups.map(g=>({...g,rounds:generateRR(g.teams,false),standings:initStandings(g.teams)}));data.knockout=null;data.mixedPhase="groups";}
    onSave(data);
  }
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div><label style={S.label}>Nome</label><input style={S.input} value={cf.name} onChange={e=>setCf(v=>({...v,name:e.target.value}))} placeholder="Ex: Copa da Várzea"/></div>
        <div><label style={S.label}>Data</label><input style={S.input} type="date" value={cf.date} onChange={e=>setCf(v=>({...v,date:e.target.value}))}/></div>
      </div>
      <div><label style={S.label}>Modalidade</label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{[["pontos","Pontos Corridos"],["mata","Mata-Mata"],["misto","Misto"]].map(([v,l])=><button key={v} onClick={()=>setCf(f=>({...f,type:v}))} style={{padding:"10px 4px",borderRadius:10,border:`2px solid ${cf.type===v?"#1D9E75":t.inputBorder}`,background:cf.type===v?"#1D9E7522":t.inputBg,color:cf.type===v?"#1D9E75":t.text,cursor:"pointer",fontWeight:cf.type===v?700:400,fontSize:12}}>{l}</button>)}</div></div>
      {cf.type==="pontos"&&<label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:t.text}}><input type="checkbox" checked={cf.turno} onChange={e=>setCf(v=>({...v,turno:e.target.checked}))}/>Turno e returno</label>}
      {cf.type==="misto"&&<div style={{display:"flex",gap:10,alignItems:"center"}}><label style={{fontSize:13,color:t.textSec}}>Grupos:</label><input type="number" min={2} max={8} value={cf.groupCount} onChange={e=>setCf(v=>({...v,groupCount:Number(e.target.value)}))} style={{...S.input,width:60}}/></div>}
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
      <div style={{display:"flex",gap:8}}>
        <button onClick={criar} style={{...S.btn(),flex:1,justifyContent:"center"}}>Criar Campeonato 🏆</button>
        <button onClick={onCancel} style={S.btn(t.card,t.textSec)}>Cancelar</button>
      </div>
    </div>
  );
}

/* ─────────────────────────── APP ROOT ───────────────────────────── */
export default function App(){
  const{dark,setDark,t}=useTheme();
  const S=makeStyles(t);

  // ── Estado Global (Salvo em localStorage) ─────────────────────
  const initialAppState = {
    campeonatos: [],
    peladas: [],
    datasRealizacao: [],
    atletas: [],
    participacoes: [],
    financeiro: { entries: [] },
  };
  
  const [appState, setAppState] = useLocalStorage(initialAppState);
  
  // Getters
  const campeonatos = appState.campeonatos;
  const peladas = appState.peladas;
  const datasRealizacao = appState.datasRealizacao;
  const atletas = appState.atletas;
  const participacoes = appState.participacoes;
  const financeiro = appState.financeiro;
  
  // Setters que atualizam o appState
  const setCampeonatos = d => setAppState(s => ({ ...s, campeonatos: d }));
  const setPeladas = d => setAppState(s => ({ ...s, peladas: d }));
  const setDatasRealizacao = d => setAppState(s => ({ ...s, datasRealizacao: d }));
  const setAtletas = d => setAppState(s => ({ ...s, atletas: d }));
  const setParticipacoes = d => setAppState(s => ({ ...s, participacoes: d }));
  const setFinanceiro = d => setAppState(s => ({ ...s, financeiro: d }));

  const[screen,setScreen]=useState("home"); // home | novoChamp | gerenciarChamp | novaPelada | gerenciarPelada | atletas
  const[current,setCurrent]=useState(null);

  // ── CRUD Atletas ───────────────────────────────────────────────
  const adicionarAtleta  =d=>setAtletas(p=>[...p,{...d,id:Date.now()}]);
  const atualizarAtleta  =(id,d)=>setAtletas(p=>p.map(a=>a.id===id?{...a,...d}:a));
  const removerAtleta    =id=>setAtletas(p=>p.filter(a=>a.id!==id));

  // ── CRUD Datas Realização ──────────────────────────────────────
  const adicionarData=(d)=>setDatasRealizacao(p=>[...p,{...d,id:Date.now()}]);
  const atualizarData=(id,d)=>setDatasRealizacao(p=>p.map(x=>x.id===id?{...x,...d}:x));
  const removerData  =id=>setDatasRealizacao(p=>p.filter(x=>x.id!==id));

  // ── CRUD Participações ─────────────────────────────────────────
  const adicionarPart=(d)=>setParticipacoes(p=>[...p,{...d,id:Date.now()}]);
  const atualizarPart=(id,d)=>setParticipacoes(p=>p.map(x=>x.id===id?{...x,...d}:x));
  const removerPart  =id=>setParticipacoes(p=>p.filter(x=>x.id!==id));

  // ── CRUD Peladas ───────────────────────────────────────────────
  const adicionarPelada=d=>setPeladas(p=>[...p,{id:Date.now(),nome:d.nome,data_criacao:d.data_criacao||todayStr(),ativo:d.ativo!==false}]);
  const atualizarPelada=(id,d)=>setPeladas(p=>p.map(x=>x.id===id?{...x,...d}:x));
  const removerPelada  =id=>{setPeladas(p=>p.filter(x=>x.id!==id));setDatasRealizacao(p=>p.filter(x=>x.pelada_id!==id));setParticipacoes(p=>p.filter(x=>x.pelada_id!==id));};

  // ── CRUD Campeonatos ───────────────────────────────────────────
  const atualizarChamp=u=>setCampeonatos(p=>p.map(c=>c.id===u.id?u:c));
  const removerChamp  =id=>setCampeonatos(p=>p.filter(c=>c.id!==id));

  // ── BACKUP / RESTAURAR ─────────────────────────────────────────
  function exportJSON(){
    const data = {campeonatos,peladas,datasRealizacao,atletas,participacoes,financeiro};
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `futebol_manager_backup_${todayStr()}.json`;
    a.click(); URL.revokeObjectURL(url);
  }
  function exportTXT(){
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
      txt += `\n[${c.name}] - ${c.type==="pontos"?"Pontos":c.type==="mata"?"Mata-Mata":"Misto"} - Times: ${c.teams.join(", ")}\n`;
    });
    const blob = new Blob([txt], {type: "text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `futebol_manager_backup_${todayStr()}.txt`;
    a.click(); URL.revokeObjectURL(url);
  }
  function importJSON(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if(data.atletas) setAtletas(data.atletas);
        if(data.peladas) setPeladas(data.peladas);
        if(data.datasRealizacao) setDatasRealizacao(data.datasRealizacao);
        if(data.participacoes) setParticipacoes(data.participacoes);
        if(data.campeonatos) setCampeonatos(data.campeonatos);
        if(data.financeiro) setFinanceiro(data.financeiro);
        alert("Backup restaurado com sucesso!");
        setScreen("home");
      } catch(err) {
        alert("Erro ao ler arquivo de backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  useEffect(()=>{document.body.style.background=t.bg;document.body.style.color=t.text;},[t]);

  const DarkBtn=()=><button onClick={()=>setDark(d=>!d)} style={{...S.btnSm(t.card,t.text),padding:"8px 12px",fontSize:15,border:`1px solid ${t.cardBorder}`,borderRadius:12}}>{dark?"☀️":"🌙"}</button>;

  /* ── HOME ────────────────────────────────────────────────────── */
  if(screen==="home")return(
    <div style={S.page}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div><h1 style={{fontSize:22,fontWeight:800,margin:0,color:t.text}}>⚽ Futebol Manager</h1><p style={{color:t.textSec,margin:"4px 0 0",fontSize:12}}>Campeonatos · Peladas · Atletas</p></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setScreen("atletas")} style={{...S.btn("#378ADD"),fontSize:12,padding:"8px 14px"}}>👤 Atletas</button>
          <button onClick={()=>setScreen("financeiro")} style={{...S.btn("#BA7517"),fontSize:12,padding:"8px 14px"}}>💰 Financeiro</button>
          <button onClick={()=>setScreen("backup")} style={{...S.btn("#7F77DD"),fontSize:12,padding:"8px 14px"}}>💾 Backup</button>
          <DarkBtn/>
        </div>
      </div>

      {/* Banner informativo sobre localStorage */}
      <div style={{...S.card,background:"#1D9E7510",borderColor:"#1D9E7555",marginBottom:20,padding:12}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
          <div style={{fontSize:18}}>💾</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:"#1D9E75",marginBottom:2}}>Dados salvos automaticamente</div>
            <div style={{fontSize:12,color:t.textSec}}>Seus dados de atletas, peladas, campeonatos e financeiro são salvos automaticamente no seu navegador. Nenhuma conexão com internet é necessária! 🌐</div>
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:28}}>
        {[
          {icon:"🏆",label:"Novo Campeonato",sub:"Pontos, mata-mata ou misto",action:()=>setScreen("novoChamp"),color:"#1D9E75"},
          {icon:"👟",label:"Nova Pelada",sub:"Sorteio e fila de times",action:()=>setScreen("novaPelada"),color:"#378ADD"},
        ].map(b=>(
          <button key={b.label} onClick={b.action} style={{...S.card,textAlign:"center",cursor:"pointer",border:`2px solid ${b.color}44`,display:"block",width:"100%",padding:16,background:t.card,boxSizing:"border-box"}}>
            <div style={{fontSize:30,marginBottom:6}}>{b.icon}</div>
            <div style={{fontWeight:700,fontSize:13,color:b.color}}>{b.label}</div>
            <div style={{fontSize:11,color:t.textSec,marginTop:3,lineHeight:1.4}}>{b.sub}</div>
          </button>
        ))}
      </div>

      {/* Campeonatos */}
      {campeonatos.length>0&&(
        <div style={{marginBottom:20}}>
          <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 10px 0",color:t.text}}>🏆 Campeonatos</h3>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {campeonatos.map(c=>(
              <div key={c.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",gap:8}}>
                <div style={{cursor:"pointer",flex:1,minWidth:0}} onClick={()=>{setCurrent(c);setScreen("gerenciarChamp");}}>
                  <div style={{fontWeight:700,fontSize:14,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                  <div style={{fontSize:11,color:t.textSec}}>{c.teams.length} times · {c.type==="pontos"?"Pontos Corridos":c.type==="mata"?"Mata-Mata":"Misto"}</div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>removerChamp(c.id)} style={S.btnSm("#E24B4A22","#E24B4A")}>🗑</button>
                  <button onClick={()=>{setCurrent(c);setScreen("gerenciarChamp");}} style={{fontSize:18,border:"none",background:"none",color:t.textSec,cursor:"pointer",padding:"0 4px"}}>›</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peladas */}
      {peladas.length>0&&(
        <div>
          <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 10px 0",color:t.text}}>👟 Peladas</h3>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {peladas.map(p=>{
              const datas=datasRealizacao.filter(d=>d.pelada_id===p.id);
              const parts=participacoes.filter(x=>x.pelada_id===p.id);
              const vinc=[...new Set(parts.map(x=>x.atleta_id))].length;
              return(
                <div key={p.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",gap:8}}>
                  <div style={{cursor:"pointer",flex:1,minWidth:0}} onClick={()=>{setCurrent(p);setScreen("gerenciarPelada");}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{fontWeight:700,fontSize:14,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nome}</div>{!p.ativo&&<Tag label="Inativa" color="#E24B4A"/>}</div>
                    <div style={{fontSize:11,color:t.textSec,marginTop:2}}>{vinc} atletas · {datas.length} datas · Criada {formatarData(p.data_criacao)}</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexShrink:0}}>
                    <button onClick={()=>removerPelada(p.id)} style={S.btnSm("#E24B4A22","#E24B4A")}>🗑</button>
                    <button onClick={()=>{setCurrent(p);setScreen("gerenciarPelada");}} style={{fontSize:18,border:"none",background:"none",color:t.textSec,cursor:"pointer",padding:"0 4px"}}>›</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {campeonatos.length===0&&peladas.length===0&&(
        <div style={{...S.card,textAlign:"center",padding:40,border:"2px dashed "+t.cardBorder}}>
          <div style={{fontSize:40,marginBottom:12}}>⚽</div>
          <div style={{fontWeight:700,fontSize:15,color:t.text,marginBottom:6}}>Nenhum evento criado</div>
          <div style={{fontSize:13,color:t.textSec}}>Crie um campeonato, uma pelada ou cadastre atletas para começar.</div>
        </div>
      )}
    </div>
  );

  /* ── FINANCEIRO ────────────────────────────────────────────────── */
  if(screen==="financeiro"){
    return <FinanceiroScreen financeiro={financeiro} setFinanceiro={setFinanceiro} participacoes={participacoes} peladas={peladas} datasRealizacao={datasRealizacao} setScreen={setScreen} DarkBtn={DarkBtn} t={t} atletas={atletas} />;
  }

  /* ── BACKUP ────────────────────────────────────────────────────── */
  if(screen==="backup")return(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setScreen("home")} style={S.btnSm()}>← Voltar</button><h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>💾 Backup</h2></div>
        <DarkBtn/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{...S.card,borderColor:"#1D9E7555",background:"#1D9E7508"}}>
          <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:"#1D9E75"}}>✅ Armazenamento Automático</h3>
          <p style={{fontSize:13,color:t.textSec,marginBottom:8}}>Seus dados são salvos automaticamente no navegador (localStorage) a cada alteração. Isso significa que os dados persistem mesmo após fechar e reabrir o aplicativo.</p>
          <div style={{fontSize:12,color:t.textSec,background:t.inputBg,padding:"10px",borderRadius:8,marginBottom:10}}>
            <b>Tamanho dos dados salvos:</b> {(getLocalStorageSize() / 1024).toFixed(2)} KB
          </div>
          <p style={{fontSize:12,color:t.textSec,margin:0}}>🌐 <b>Importante:</b> Os dados são salvos localmente no seu navegador/dispositivo. Se você limpar o cache ou dados do navegador, os dados serão perdidos. Por isso, recomendamos fazer backups regularmente.</p>
        </div>

        <div style={S.card}>
          <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:t.text}}>📥 Exportar Dados</h3>
          <p style={{fontSize:13,color:t.textSec,marginBottom:14}}>Faça o download de todos os dados do sistema. O formato JSON é ideal para restauração futura, enquanto o formato TXT é útil para leitura humana.</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button onClick={exportJSON} style={S.btn("#1D9E75")}>📄 Exportar JSON</button>
            <button onClick={exportTXT} style={S.btn("#378ADD")}>📄 Exportar TXT</button>
          </div>
        </div>
        <div style={{...S.card,borderColor:"#E24B4A55"}}>
          <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:"#E24B4A"}}>📤 Importar Dados (Restaurar)</h3>
          <p style={{fontSize:13,color:t.textSec,marginBottom:14}}>Restaure os dados a partir de um arquivo JSON exportado anteriormente. <b>Atenção:</b> Isso irá sobrescrever todos os dados atuais do sistema.</p>
          <label style={{...S.btn("#E24B4A"),display:"inline-flex",cursor:"pointer"}}>
            📂 Selecionar Arquivo JSON
            <input type="file" accept=".json" style={{display:"none"}} onChange={importJSON} />
          </label>
        </div>

        <div style={{...S.card,borderColor:"#BA751755",background:"#BA751508"}}>
          <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:"#BA7517"}}>🗑️ Limpar Dados</h3>
          <p style={{fontSize:13,color:t.textSec,marginBottom:14}}><b>Cuidado:</b> Esta ação irá apagar <b>todos</b> os dados salvos no navegador (localStorage). Isso não pode ser desfeito a menos que você tenha um backup exportado.</p>
          <button onClick={()=>{if(window.confirm("Tem certeza? Todos os dados serão apagados permanentemente.")){clearLocalStorage();setAppState({campeonatos:[],peladas:[],datasRealizacao:[],atletas:[],participacoes:[],financeiro:{entries:[]}});alert("Dados limpos com sucesso!");setScreen("home");}}} style={S.btn("#BA7517")}>🗑️ Limpar Todos os Dados</button>
        </div>
      </div>
    </div>
  );

  /* ── ATLETAS ──────────────────────────────────────────────────── */
  if(screen==="atletas")return(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setScreen("home")} style={S.btnSm()}>← Voltar</button><h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>👤 Atletas</h2></div>
        <DarkBtn/>
      </div>
      <CRUDAtletas atletas={atletas} onAdd={adicionarAtleta} onUpdate={atualizarAtleta} onRemove={removerAtleta} onAddSaldo={(nome, amount)=>{setFinanceiro(f=>({entries:[...f.entries,{id:Date.now(),desc:`Recarga de Saldo - ${nome}`,amount,type:"receita",date:todayStr(),category:"Mensalidade"}]}))}} t={t}/>
    </div>
  );

  /* ── NOVO CAMPEONATO ──────────────────────────────────────────── */
  if(screen==="novoChamp")return(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setScreen("home")} style={S.btnSm()}>← Voltar</button><h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>🏆 Novo Campeonato</h2></div>
        <DarkBtn/>
      </div>
      <NovoCampeonato onSave={d=>{setCampeonatos(p=>[...p,d]);setCurrent(d);setScreen("gerenciarChamp");}} onCancel={()=>setScreen("home")} t={t}/>
    </div>
  );

  /* ── GERENCIAR CAMPEONATO ─────────────────────────────────────── */
  if(screen==="gerenciarChamp"&&current)return(
    <CampeonatoScreen champ={campeonatos.find(c=>c.id===current.id)||current} atletas={atletas} onUpdate={atualizarChamp} onDelete={id=>{removerChamp(id);setScreen("home");}} onBack={()=>setScreen("home")} t={t}/>
  );

  /* ── NOVA PELADA ──────────────────────────────────────────────── */
  if(screen==="novaPelada")return(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setScreen("home")} style={S.btnSm()}>← Voltar</button><h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>👟 Nova Pelada</h2></div>
        <DarkBtn/>
      </div>
      <CriarPelada onSave={d=>{adicionarPelada(d);setScreen("home");}} t={t}/>
    </div>
  );

  /* ── GERENCIAR PELADA ─────────────────────────────────────────── */
  if(screen==="gerenciarPelada"&&current){
    const pelAtual=peladas.find(p=>p.id===current.id)||current;
    return(
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
        onUpdateAtleta={atualizarAtleta}
        onAddFinanceiro={(desc, amount)=>{setFinanceiro(f=>({entries:[...f.entries,{id:Date.now(),desc,amount,type:"receita",date:todayStr(),category:"Mensalidade"}]}))}}
        onBack={()=>setScreen("home")}
        t={t}
      />
    );
  }

  return null;
}
