import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity, ArrowRight, BookOpen, Brain, CalendarDays, Check, Clock3,
  GraduationCap, LayoutDashboard, Library, Moon, Plus, Settings2, Sun,
  Target, TrendingUp, Upload, Download, Play, Pause, RotateCcw, Trash2
} from "lucide-react";
import {
  disciplineRepository, notebookRepository, sessionRepository, studyBlockRepository,
  subjectRepository, settingsRepository
} from "./storage/repositories";
import {
  STUDY_BLOCK_SECONDS, addStudyTime, canAdvanceToNextNotebook,
  getStudyBlockProgress, pauseStudyBlock, resumeStudyBlock, type StudyBlock
} from "./domain/studyBlocks";

type Section = "Painel" | "Estudar" | "Disciplinas" | "Assuntos" | "Cadernos" | "Histórico" | "Configurações";
type Row = { id:string; name:string; createdAt:string; updatedAt:string; disciplineId?:string; description?:string };
type Session = { id:string; createdAt:string; updatedAt:string; disciplineId:string; notebookId:string; durationSeconds:number; questions:number; correct:number; date:string };

const sections: {name:Section; icon:typeof LayoutDashboard}[] = [
  {name:"Painel",icon:LayoutDashboard},{name:"Estudar",icon:BookOpen},
  {name:"Disciplinas",icon:GraduationCap},{name:"Assuntos",icon:Target},{name:"Cadernos",icon:Library},
  {name:"Histórico",icon:TrendingUp},{name:"Configurações",icon:Settings2}
];

const nowIso=()=>new Date().toISOString();
const makeId=()=>crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;
const fmt=(s:number)=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

export default function App(){
  const [section,setSection]=useState<Section>("Painel");
  const [dark,setDark]=useState(false);
  const [disciplines,setDisciplines]=useState<Row[]>([]);
  const [notebooks,setNotebooks]=useState<Row[]>([]);
  const [subjects,setSubjects]=useState<Row[]>([]);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [blocks,setBlocks]=useState<StudyBlock[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [refresh,setRefresh]=useState(0);

  const reload=useCallback(async()=>{
    setLoading(true); setError("");
    try{
      const [d,n,s,h,b,theme]=await Promise.all([
        disciplineRepository.list(),notebookRepository.list(),subjectRepository.list(),
        sessionRepository.list(),studyBlockRepository.list(),settingsRepository.get<string>("theme")
      ]);
      setDisciplines(d as Row[]); setNotebooks(n as Row[]); setSubjects(s as Row[]);
      setSessions(h as Session[]); setBlocks(b); setDark(theme==="dark");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar os dados locais.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void reload();},[reload,refresh]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?"dark":"light";void settingsRepository.set("theme",dark?"dark":"light").catch(()=>{});},[dark]);

  const activeBlock=blocks.find(b=>b.status==="in_progress"||b.status==="paused");
  const title=section;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><GraduationCap size={21}/></div><div><strong>EstudosFlix</strong><small>MÉTODO KYRLA / TATA</small></div></div>
      <div className="profile-switch"><div className="avatar">E</div><div className="profile-copy"><strong>Meu espaço</strong><small>Dados locais</small></div></div>
      <nav className="navigation">{sections.map(item=>{const Icon=item.icon;return <button key={item.name} className={section===item.name?"nav-item active":"nav-item"} onClick={()=>setSection(item.name)}><Icon size={17}/><span>{item.name}</span></button>;})}</nav>
      <div className="sidebar-bottom"><div className="offline"><span/> Armazenamento local</div><button className="theme-toggle" onClick={()=>setDark(v=>!v)}>{dark?<Sun size={16}/>:<Moon size={16}/>} {dark?"Tema claro":"Tema escuro"}</button><small className="version">EstudosFlix · versão em construção</small></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>EstudosFlix</span><b>/</b><strong>{title}</strong></div><span className="local-pill"><Check size={14}/> Dados neste dispositivo</span></header>
      <div className="page-content">
        {error&&<div className="demo-notice" role="alert">{error}</div>}
        {loading?<div className="panel"><p>Carregando seus dados locais…</p></div>:null}
        {!loading&&section==="Painel"&&<Dashboard disciplines={disciplines} notebooks={notebooks} sessions={sessions} onGo={setSection}/>}
        {!loading&&section==="Estudar"&&<StudyPage disciplines={disciplines} notebooks={notebooks} subjects={subjects} blocks={blocks} reload={()=>setRefresh(x=>x+1)}/>}
        {!loading&&section==="Disciplinas"&&<DisciplinePage disciplines={disciplines} reload={()=>setRefresh(x=>x+1)}/>}
        {!loading&&section==="Assuntos"&&<SubjectPage disciplines={disciplines} subjects={subjects} reload={()=>setRefresh(x=>x+1)}/>}
        {!loading&&section==="Cadernos"&&<NotebookPage disciplines={disciplines} notebooks={notebooks} reload={()=>setRefresh(x=>x+1)}/>}
        {!loading&&section==="Histórico"&&<HistoryPage sessions={sessions} disciplines={disciplines} notebooks={notebooks}/>}
        {!loading&&section==="Configurações"&&<SettingsPage dark={dark} setDark={setDark} reload={()=>setRefresh(x=>x+1)}/>}
      </div>
    </main>
  </div>;
}

function Header({eyebrow,title,subtitle}:{eyebrow:string;title:string;subtitle:string}){
 return <div className="welcome-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div></div>;
}
function Dashboard({disciplines,notebooks,sessions,onGo}:{disciplines:Row[];notebooks:Row[];sessions:Session[];onGo:(s:Section)=>void}){
 const total=sessions.reduce((a,s)=>a+s.durationSeconds,0);
 const passes=sessions.reduce((a,s)=>a+Math.floor(s.durationSeconds/STUDY_BLOCK_SECONDS),0);
 return <><Header eyebrow="VISÃO GERAL" title="Seu espaço de estudos" subtitle="Organize suas passadas, acompanhe seu tempo e retome de onde parou."/>
 <div className="metric-grid">
  <Metric icon={<GraduationCap/>} label="Disciplinas" value={String(disciplines.length)} detail="Cadastradas"/>
  <Metric icon={<Library/>} label="Cadernos" value={String(notebooks.length)} detail="Na sua biblioteca"/>
  <Metric icon={<Clock3/>} label="Tempo estudado" value={fmt(total)} detail="Tempo registrado"/>
  <Metric icon={<Target/>} label="Passadas completas" value={String(passes)} detail="Blocos de 15 minutos"/>
 </div>
 <div className="content-grid">
  <div className="panel"><div className="panel-heading"><div><span className="eyebrow">PRÓXIMA AÇÃO</span><h2>Continue seu método</h2></div><BookOpen/></div><p className="muted-copy">Cada passada corresponde a 15 minutos líquidos em um caderno. Se precisar parar, seu tempo e sua posição ficam salvos.</p><button className="button primary" onClick={()=>onGo("Estudar")}>Ir para estudar <ArrowRight size={16}/></button></div>
  <div className="panel"><div className="panel-heading"><div><span className="eyebrow">COMECE POR AQUI</span><h2>Monte sua estrutura</h2></div><Activity/></div><p className="muted-copy">Cadastre disciplinas e depois organize os cadernos que fazem parte de cada uma.</p><div className="recommend-actions"><button className="button secondary" onClick={()=>onGo("Disciplinas")}>Disciplinas</button><button className="button secondary" onClick={()=>onGo("Cadernos")}>Cadernos</button></div></div>
 </div>
 <div className="panel"><div className="panel-heading"><div><span className="eyebrow">SEU PROGRESSO</span><h2>Atividade recente</h2></div><button className="text-button" onClick={()=>onGo("Histórico")}>Ver histórico <ArrowRight size={14}/></button></div>
 {sessions.length===0?<p className="muted-copy">Ainda não há sessões registradas. Quando concluir seu primeiro bloco, ele aparecerá aqui.</p>:sessions.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(s=><div className="diagnostic-row" key={s.id}><span className="diagnostic-dot green-dot"/><div><strong>{notebooks.find(n=>n.id===s.notebookId)?.name??"Caderno"}</strong><small>{new Date(s.date).toLocaleString("pt-BR")} · {fmt(s.durationSeconds)} · {s.questions} questões</small></div><b>{s.questions?Math.round(s.correct/s.questions*100)+"%":"—"}</b></div>)}</div>
 </>;
}
function Metric({icon,label,value,detail}:{icon:ReactNode;label:string;value:string;detail:string}){
 return <div className="metric-card"><div className="metric-top"><span className="metric-icon blue">{icon}</span><span>{label}</span></div><div className="metric-value">{value}</div><div className="metric-detail">{detail}</div></div>;
}
function DisciplinePage({disciplines,reload}:{disciplines:Row[];reload:()=>void}){
 const [name,setName]=useState(""); const [description,setDescription]=useState(""); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState("");
 async function save(e:FormEvent){e.preventDefault();if(!name.trim())return;setBusy(true);setMsg("");try{await disciplineRepository.save({name:name.trim(),description:description.trim()});setName("");setDescription("");reload();}catch(err){setMsg(err instanceof Error?err.message:"Erro ao salvar.");}finally{setBusy(false);}}
 async function remove(id:string){if(!confirm("Excluir esta disciplina? Os cadernos vinculados não serão excluídos automaticamente."))return;await disciplineRepository.remove(id);reload();}
 return <><Header eyebrow="PLANEJAMENTO" title="Disciplinas" subtitle="Cadastre as disciplinas que organizam sua jornada de aprendizagem."/><div className="content-grid"><form className="panel form-panel" onSubmit={save}><h2>Nova disciplina</h2><label>Nome da disciplina<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Direito Constitucional" required/></label><label>Descrição (opcional)<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Objetivo ou observações"/></label>{msg&&<p className="error-text">{msg}</p>}<button className="button primary" disabled={busy}>{busy?"Salvando…":<><Plus size={16}/> Adicionar disciplina</>}</button></form><div className="panel"><div className="panel-heading"><h2>Suas disciplinas</h2><b>{disciplines.length}</b></div>{disciplines.length===0?<p className="muted-copy">Nenhuma disciplina cadastrada.</p>:disciplines.map(d=><div className="diagnostic-row" key={d.id}><span className="diagnostic-dot green-dot"/><div><strong>{d.name}</strong><small>{d.description||"Sem descrição"}</small></div><button className="icon-button danger" onClick={()=>void remove(d.id)} aria-label={"Excluir "+d.name}><Trash2 size={16}/></button></div>)}</div></div></>;
}
function SubjectPage({disciplines,subjects,reload}:{disciplines:Row[];subjects:Row[];reload:()=>void}){
 const [disciplineId,setDisciplineId]=useState(disciplines[0]?.id??"");const [name,setName]=useState("");const [description,setDescription]=useState("");const [parentId,setParentId]=useState("");
 useEffect(()=>{if(!disciplineId&&disciplines[0])setDisciplineId(disciplines[0].id);},[disciplines,disciplineId]);
 const filtered=subjects.filter(s=>s.disciplineId===disciplineId);
 async function save(e:FormEvent){e.preventDefault();if(!disciplineId||!name.trim())return;await subjectRepository.save({name:name.trim(),description:description.trim(),disciplineId,parentId:parentId||undefined});setName("");setDescription("");setParentId("");reload();}
 async function remove(id:string){if(!confirm("Excluir este assunto?"))return;await subjectRepository.remove(id);reload();}
 return <><Header eyebrow="PLANEJAMENTO" title="Assuntos e subassuntos" subtitle="Estruture o conteúdo dentro de cada disciplina e organize os pré-requisitos da sua trilha."/><div className="content-grid"><form className="panel form-panel" onSubmit={save}><h2>Novo assunto</h2><label>Disciplina<select value={disciplineId} onChange={e=>setDisciplineId(e.target.value)} required><option value="">Selecione</option>{disciplines.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Nome do assunto<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Direitos fundamentais" required/></label><label>Assunto principal (opcional)<select value={parentId} onChange={e=>setParentId(e.target.value)}><option value="">É um assunto principal</option>{filtered.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Descrição<textarea value={description} onChange={e=>setDescription(e.target.value)}/></label><button className="button primary" disabled={!disciplines.length}><Plus size={16}/> Adicionar assunto</button>{!disciplines.length&&<p className="muted-copy">Cadastre uma disciplina primeiro.</p>}</form><div className="panel"><div className="panel-heading"><h2>Assuntos cadastrados</h2><b>{filtered.length}</b></div>{filtered.length===0?<p className="muted-copy">Nenhum assunto nesta disciplina.</p>:filtered.map(s=><div className="diagnostic-row" key={s.id}><span className="diagnostic-dot blue-dot"/><div><strong>{s.parentId?"↳ ":""}{s.name}</strong><small>{s.description|| (s.parentId?"Subassunto":"Assunto principal")}</small></div><button className="icon-button danger" onClick={()=>void remove(s.id)} aria-label={"Excluir "+s.name}><Trash2 size={16}/></button></div>)}</div></div></>;
}
function NotebookPage({disciplines,notebooks,reload}:{disciplines:Row[];notebooks:Row[];reload:()=>void}){
 const [name,setName]=useState("");const [disciplineId,setDisciplineId]=useState(disciplines[0]?.id??"");const [description,setDescription]=useState("");
 useEffect(()=>{if(!disciplineId&&disciplines[0])setDisciplineId(disciplines[0].id);},[disciplines,disciplineId]);
 async function save(e:FormEvent){e.preventDefault();if(!name.trim()||!disciplineId)return;await notebookRepository.save({name:name.trim(),disciplineId,description:description.trim()});setName("");setDescription("");reload();}
 async function remove(id:string){if(!confirm("Excluir este caderno?"))return;await notebookRepository.remove(id);reload();}
 return <><Header eyebrow="PLANEJAMENTO" title="Cadernos" subtitle="Organize os cadernos por disciplina. Cada passada de estudo dura 15 minutos."/><div className="content-grid"><form className="panel form-panel" onSubmit={save}><h2>Novo caderno</h2><label>Disciplina<select value={disciplineId} onChange={e=>setDisciplineId(e.target.value)} required><option value="">Selecione</option>{disciplines.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Nome do caderno<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: 01 — Conceitos" required/></label><label>Observações<textarea value={description} onChange={e=>setDescription(e.target.value)}/></label><button className="button primary" disabled={!disciplines.length}><Plus size={16}/> Adicionar caderno</button>{!disciplines.length&&<p className="muted-copy">Cadastre uma disciplina primeiro.</p>}</form><div className="panel"><h2>Seus cadernos</h2>{notebooks.length===0?<p className="muted-copy">Nenhum caderno cadastrado.</p>:notebooks.map(n=><div className="diagnostic-row" key={n.id}><span className="diagnostic-dot blue-dot"/><div><strong>{n.name}</strong><small>{disciplines.find(d=>d.id===n.disciplineId)?.name??"Disciplina não encontrada"}</small></div><button className="icon-button danger" onClick={()=>void remove(n.id)} aria-label={"Excluir "+n.name}><Trash2 size={16}/></button></div>)}</div></div></>;
}
function StudyPage({disciplines,notebooks,subjects,blocks,reload}:{disciplines:Row[];notebooks:Row[];subjects:Row[];blocks:StudyBlock[];reload:()=>void}){
 const paused=blocks.find(b=>b.status==="paused"||b.status==="in_progress");
 const [disciplineId,setDisciplineId]=useState(paused?.disciplineId??disciplines[0]?.id??"");
 const [notebookId,setNotebookId]=useState(paused?.notebookId??"");
 const [elapsed,setElapsed]=useState(paused?.elapsedSeconds??0);
 const [running,setRunning]=useState(paused?.status==="in_progress");
 const [question,setQuestion]=useState(paused?.lastQuestionNumber?String(paused.lastQuestionNumber):"");
 const [questions,setQuestions]=useState("0");const [correct,setCorrect]=useState("0");
 const [subjectId,setSubjectId]=useState("");
 const [block,setBlock]=useState<StudyBlock|undefined>(paused);
 const elapsedRef=useRef(elapsed);\n useEffect(()=>{elapsedRef.current=elapsed;},[elapsed]);
 const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");
 const available=notebooks.filter(n=>n.disciplineId===disciplineId);
 const progress=getStudyBlockProgress({elapsedSeconds:elapsed});
 const linkedSubjects=subjects.filter(s=>s.disciplineId===disciplineId);
 useEffect(()=>{if(!notebookId&&available[0])setNotebookId(available[0].id);},[available,notebookId]);
 useEffect(()=>{if(!running)return;const timer=window.setInterval(()=>setElapsed(v=>Math.min(STUDY_BLOCK_SECONDS,v+1)),1000);return()=>window.clearInterval(timer);},[running]);
 useEffect(()=>{if(block&&running){const timer=window.setInterval(()=>{const next={...block,elapsedSeconds:elapsedRef.current,updatedAt:nowIso(),lastQuestionNumber:question?Number(question):block.lastQuestionNumber};void studyBlockRepository.save(next);},5000);return()=>window.clearInterval(timer);}},[block,running,question]);
 useEffect(()=>{if(elapsed>=STUDY_BLOCK_SECONDS&&running){setRunning(false);void completeBlock();}},[elapsed,running]);
 async function begin(){if(!notebookId){setMessage("Cadastre ou selecione um caderno antes de iniciar.");return;}let current=block;if(!current){const now=nowIso();current={id:makeId(),createdAt:now,updatedAt:now,disciplineId,notebookId,elapsedSeconds:0,status:"in_progress",startedAt:now};}else current=resumeStudyBlock({...current,disciplineId,notebookId});await studyBlockRepository.save(current);setBlock(current);setElapsed(current.elapsedSeconds);setRunning(true);setMessage("");}
 async function pause(){setRunning(false);if(!block)return;const next=pauseStudyBlock({...block,elapsedSeconds:elapsed,lastQuestionNumber:question?Number(question):block.lastQuestionNumber});await studyBlockRepository.save(next);setBlock(next);setMessage("Bloco pausado. Seu tempo e sua posição foram salvos.");}
 async function completeBlock(){if(!block)return;const next=addStudyTime({...block,status:"in_progress"},Math.max(0,STUDY_BLOCK_SECONDS-block.elapsedSeconds));await studyBlockRepository.save(next);setBlock(next);setElapsed(STUDY_BLOCK_SECONDS);setMessage("Passada concluída! Você completou 15 minutos neste caderno.");reload();}
 async function finishSession(){if(!block||elapsed===0)return;setSaving(true);try{const now=nowIso();const q=Math.max(0,Number(questions)||0);const a=Math.min(q,Math.max(0,Number(correct)||0));await sessionRepository.save({disciplineId:block.disciplineId,notebookId:block.notebookId,durationSeconds:elapsed,questions:q,correct:a,date:now});const saved={...block,elapsedSeconds:elapsed,lastQuestionNumber:question?Number(question):block.lastQuestionNumber,updatedAt:now,status:elapsed>=STUDY_BLOCK_SECONDS?"completed" as const:"paused" as const,...(elapsed>=STUDY_BLOCK_SECONDS?{completedAt:now}:{})};await studyBlockRepository.save(saved);setBlock(saved);setRunning(false);setMessage("Sessão registrada com sucesso.");reload();}catch(e){setMessage(e instanceof Error?e.message:"Não foi possível registrar a sessão.");}finally{setSaving(false);}}
 const nextNotebook=useMemo(()=>available.find((n,i)=>i>available.findIndex(x=>x.id===notebookId))??available[0],[available,notebookId]);
 return <><Header eyebrow="MÉTODO KYRLA / TATA" title="Estudar por passadas" subtitle="Cada passada tem 15 minutos líquidos em um único caderno. Interrompa e retome quando precisar."/>
 <div className="content-grid"><div className="panel timer-panel"><div className="panel-heading"><div><span className="eyebrow">BLOCO ATUAL</span><h2>{block?notebooks.find(n=>n.id===block.notebookId)?.name??"Caderno selecionado":"Prepare sua passada"}</h2></div><span className={running?"status-label success":"status-label warning"}>{running?"Em andamento":elapsed>=STUDY_BLOCK_SECONDS?"Concluído":"Pausado"}</span></div>
 <div className="timer-display">{fmt(elapsed)}<small> / 15:00</small></div><div className="trail-bar timer-bar"><span style={{width:progress.completionPercent+"%"}}/></div><div className="timer-caption"><span>{fmt(elapsed)} estudados</span><span>{fmt(progress.remainingSeconds)} restantes</span></div>
 <div className="timer-actions">{!running?<button className="button primary" onClick={()=>void begin()} disabled={!disciplines.length||!notebooks.length||elapsed>=STUDY_BLOCK_SECONDS}><Play size={16}/> {elapsed?"Retomar bloco":"Iniciar passada"}</button>:<button className="button secondary" onClick={()=>void pause()}><Pause size={16}/> Pausar</button>}{block&&<button className="button secondary" onClick={()=>void finishSession()} disabled={saving}><Check size={16}/> Registrar sessão</button>}</div>
 {message&&<p className="muted-copy" role="status">{message}</p>}
 </div>
 <div className="panel form-panel"><h2>Configurar estudo</h2><label>Disciplina<select value={disciplineId} onChange={e=>{setDisciplineId(e.target.value);setNotebookId("");}} disabled={!!block&&elapsed>0}><option value="">Selecione</option>{disciplines.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Caderno<select value={notebookId} onChange={e=>setNotebookId(e.target.value)} disabled={!!block&&elapsed>0}><option value="">Selecione</option>{available.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label><label>Última questão / posição<input type="number" min="0" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ex.: 27"/></label><label>Assunto (opcional)<select value={subjectId} onChange={e=>setSubjectId(e.target.value)}><option value="">Não especificado</option>{linkedSubjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><div className="divider"/><h3>Desempenho da sessão</h3><div className="two-fields"><label>Questões<input type="number" min="0" value={questions} onChange={e=>setQuestions(e.target.value)}/></label><label>Acertos<input type="number" min="0" value={correct} onChange={e=>setCorrect(e.target.value)}/></label></div><p className="muted-copy small-copy">O bloco é contado pelo tempo. Questões e acertos são métricas complementares.</p></div></div>
 {block&&<div className="panel"><div className="panel-heading"><h2>Retomada preservada</h2><RotateCcw size={17}/></div><p className="muted-copy">Seu bloco permanece vinculado ao mesmo caderno. Se você parar agora, o sistema preserva {fmt(elapsed)} e faltam {fmt(progress.remainingSeconds)} para concluir a passada.</p>{canAdvanceToNextNotebook(block)&&<p className="success-copy">Próximo caderno sugerido: {nextNotebook?.name??"Cadastre outro caderno nesta disciplina"}.</p>}</div>}
 </>;
}
function HistoryPage({sessions,disciplines,notebooks}:{sessions:Session[];disciplines:Row[];notebooks:Row[]}){
 const total=sessions.reduce((a,s)=>a+s.durationSeconds,0);
 return <><Header eyebrow="ANÁLISE" title="Histórico de sessões" subtitle="Consulte o tempo investido e o desempenho que você registrou."/><div className="metric-grid"><Metric icon={<Clock3/>} label="Tempo total" value={fmt(total)} detail="Somatório registrado"/><Metric icon={<CalendarDays/>} label="Sessões" value={String(sessions.length)} detail="Registros salvos"/><Metric icon={<Target/>} label="Questões" value={String(sessions.reduce((a,s)=>a+s.questions,0))} detail="Questões registradas"/><Metric icon={<Check/>} label="Acertos" value={String(sessions.reduce((a,s)=>a+s.correct,0))} detail="Respostas corretas"/></div><div className="panel"><h2>Registros</h2>{sessions.length===0?<p className="muted-copy">Nenhuma sessão registrada ainda.</p>:sessions.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(s=><div className="diagnostic-row" key={s.id}><span className="diagnostic-dot green-dot"/><div><strong>{disciplines.find(d=>d.id===s.disciplineId)?.name??"Disciplina"} · {notebooks.find(n=>n.id===s.notebookId)?.name??"Caderno"}</strong><small>{new Date(s.date).toLocaleString("pt-BR")} · {fmt(s.durationSeconds)} · {s.questions} questões</small></div><b>{s.questions?Math.round(s.correct/s.questions*100)+"%":"—"}</b></div>)}</div></>;
}
function SettingsPage({dark,setDark,reload}:{dark:boolean;setDark:(v:boolean)=>void;reload:()=>void}){
 const [message,setMessage]=useState("");
 async function exportData(){const [disciplines,notebooks,subjects,sessions,blocks]=await Promise.all([disciplineRepository.list(),notebookRepository.list(),subjectRepository.list(),sessionRepository.list(),studyBlockRepository.list()]);const payload={format:"estudosflix-backup",version:1,exportedAt:nowIso(),data:{disciplines,notebooks,subjects,sessions,blocks}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="backup-estudosflix-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url);setMessage("Backup exportado.");}
 async function importData(file?:File){if(!file)return;try{const payload=JSON.parse(await file.text());if(payload.format!=="estudosflix-backup"||!payload.data)throw new Error("Arquivo de backup inválido.");for(const [key,repo] of [["disciplines",disciplineRepository],["notebooks",notebookRepository],["subjects",subjectRepository],["sessions",sessionRepository],["blocks",studyBlockRepository]] as const){const rows=payload.data[key];if(Array.isArray(rows))for(const row of rows)await repo.save(row as never);}setMessage("Backup importado. Os dados existentes foram preservados e os registros do arquivo foram adicionados/atualizados.");reload();}catch(e){setMessage(e instanceof Error?e.message:"Falha ao importar backup.");}}
 return <><Header eyebrow="SISTEMA" title="Configurações" subtitle="Ajuste a aparência e cuide dos seus dados locais."/><div className="content-grid"><div className="panel"><h2>Aparência</h2><p className="muted-copy">Escolha o tema que prefere utilizar.</p><button className="button secondary" onClick={()=>setDark(!dark)}>{dark?<Sun size={16}/>:<Moon size={16}/>} Ativar tema {dark?"claro":"escuro"}</button></div><div className="panel"><h2>Backup e restauração</h2><p className="muted-copy">Seus dados ficam neste navegador. Exporte um arquivo para transferir ou guardar uma cópia.</p><div className="recommend-actions"><button className="button primary" onClick={()=>void exportData()}><Download size={16}/> Baixar backup</button><label className="button secondary file-button"><Upload size={16}/> Importar<input type="file" accept="application/json,.json" onChange={e=>void importData(e.target.files?.[0])}/></label></div>{message&&<p className="muted-copy" role="status">{message}</p>}</div></div><div className="panel"><h2>Privacidade</h2><p className="muted-copy">O EstudosFlix utiliza armazenamento local do navegador. Limpar os dados do site ou trocar de dispositivo pode apagar ou tornar indisponíveis seus registros. Mantenha backups atualizados.</p></div></>;
}
