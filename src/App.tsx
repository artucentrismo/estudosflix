import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { reviewFlashcard, selectDailyReviewQueue, type Flashcard } from "./domain/flashcards";
import { calculateDomain, calculateRetention, type Attempt, type Exposure } from "./domain/metrics";
import { importRecordsAtomically, type DatabaseImportData } from "./storage/database";
import {
  Activity, ArrowRight, BookOpen, Brain, CalendarDays, Check, Clock3, Compass,
  GraduationCap, LayoutDashboard, Library, Moon, Plus, Settings2, Sun,
  Target, TrendingUp, Upload, Download, Play, Pause, RotateCcw, Trash2, TriangleAlert
} from "lucide-react";
import {
  disciplineRepository, notebookRepository, notebookSubjectRepository, studyPlanRepository, studyPlanItemRepository, sessionRepository, sessionSegmentRepository, studyBlockRepository,
  subjectRepository, subjectDependencyRepository, settingsRepository, flashcardRepository, flashcardReviewRepository
} from "./storage/repositories";
import {
  STUDY_BLOCK_SECONDS,
  getStudyBlockProgress, pauseStudyBlock, resumeStudyBlock, type StudyBlock
} from "./domain/studyBlocks";
import { completeCycleNotebook, getCycleProgressPercent, reconcileStudyCycle, type StudyCycleProgress } from "./domain/studyCycles";

type Section = "Início" | "Estudar" | "Disciplinas" | "Revisões" | "Evolução" | "Assuntos" | "Cadernos" | "Configurações" | "Plano de Estudos" | "Flashcards" | "Histórico" | "Pré-requisitos" | "Diagnóstico" | "Relatórios";
type Row = { id:string; name:string; createdAt:string; updatedAt:string; disciplineId?:string; description?:string; parentId?:string; cycleOrder?:number };
type Session = { id:string; createdAt:string; updatedAt:string; disciplineId:string; notebookId?:string; notebookIds?:string[]; durationSeconds:number; questions:number; correct:number; date:string };
type StudySessionDraft = { disciplineId:string; sessionElapsed:number; segments:SegmentDraft[]; visitedNotebookIds:string[]; startedAt:string };
type SegmentDraft = { key:string; subjectId:string; questions:string; correct:string; difficulties:string[] };
type SegmentRecord = { id:string; createdAt:string; updatedAt:string; sessionId:string; subjectId:string; questions:number; correct:number; difficulties:string[]; date:string };
type DependencyRecord = { id:string; createdAt:string; updatedAt:string; prerequisiteSubjectId:string; dependentSubjectId:string; strength:"critical"|"strong"|"moderate"|"weak" };
type NotebookSubjectRecord = { id:string; createdAt:string; updatedAt:string; notebookId:string; subjectId:string };
type PlanRecord = { id:string; createdAt:string; updatedAt:string; name:string };
type PlanItemRecord = { id:string; createdAt:string; updatedAt:string; planId:string; disciplineId:string; minutes:number; blockCount:number };

const sections: {name:Section; icon:typeof LayoutDashboard}[] = [
  {name:"Início",icon:LayoutDashboard},
  {name:"Disciplinas",icon:GraduationCap},
  {name:"Revisões",icon:Brain},
  {name:"Evolução",icon:TrendingUp}
];

const nowIso=()=>new Date().toISOString();
const makeId=()=>crypto.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;
const fmt=(s:number)=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

export default function App(){
  const [section,setSection]=useState<Section>("Início");
  const [dark,setDark]=useState(false);
  const [disciplines,setDisciplines]=useState<Row[]>([]);
  const [notebooks,setNotebooks]=useState<Row[]>([]);
  const [notebookSubjects,setNotebookSubjects]=useState<NotebookSubjectRecord[]>([]);
  const [subjects,setSubjects]=useState<Row[]>([]);
  const [sessions,setSessions]=useState<Session[]>([]);
  const [blocks,setBlocks]=useState<StudyBlock[]>([]);
  const [flashcards,setFlashcards]=useState<Flashcard[]>([]);
  const [sessionSegments,setSessionSegments]=useState<SegmentRecord[]>([]);
  const [dependencies,setDependencies]=useState<DependencyRecord[]>([]);
  const [plans,setPlans]=useState<PlanRecord[]>([]);
  const [planItems,setPlanItems]=useState<PlanItemRecord[]>([]);
  const [reviewLimit,setReviewLimit]=useState(30);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [refresh,setRefresh]=useState(0);
  const loadedRef=useRef(false);

  const reload=useCallback(async()=>{
    if(!loadedRef.current)setLoading(true); setError("");
    try{
      const [d,n,s,h,b,fc,sg,dp,pl,pi,ns,theme,limit]=await Promise.all([
        disciplineRepository.list(),notebookRepository.list(),subjectRepository.list(),
        sessionRepository.list(),studyBlockRepository.list(),flashcardRepository.list(),sessionSegmentRepository.list(),subjectDependencyRepository.list(),studyPlanRepository.list(),studyPlanItemRepository.list(),notebookSubjectRepository.list(),settingsRepository.get("theme") as Promise<string | undefined>,settingsRepository.get("reviewLimit") as Promise<number | undefined>
      ]);
      setDisciplines(d as Row[]); setNotebooks(n as Row[]); setNotebookSubjects(ns as NotebookSubjectRecord[]); setSubjects(s as Row[]);
      setSessions(h as Session[]); setBlocks(b); setFlashcards(fc as Flashcard[]); setSessionSegments(sg as SegmentRecord[]); setDependencies(dp as DependencyRecord[]); setPlans(pl as PlanRecord[]); setPlanItems(pi as PlanItemRecord[]); setReviewLimit([20,30,50].includes(Number(limit))?Number(limit):30); setDark(theme==="dark");
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível carregar os dados locais.");}
    finally{loadedRef.current=true;setLoading(false);}
  },[]);
  useEffect(()=>{void reload();},[reload,refresh]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?"dark":"light";if(loadedRef.current)void settingsRepository.set("theme",dark?"dark":"light").catch(()=>{});},[dark]);

  const activeBlock=blocks.find(b=>b.status==="in_progress"||b.status==="paused");
  const title=section;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><GraduationCap size={21}/></div><div><strong>EstudosFlix</strong><small>MÉTODO KYRLA / TATA</small></div></div>
      <div className="profile-switch"><div className="avatar">E</div><div className="profile-copy"><strong>Meu espaço</strong><small>Dados locais</small></div></div>
      <nav className="navigation">{sections.map(item=>{const Icon=item.icon;return <button key={item.name} className={section===item.name?"nav-item active":"nav-item"} onClick={()=>setSection(item.name)}><Icon size={17}/><span>{item.name}</span></button>;})}</nav>
      <div className="sidebar-bottom"><div className="offline"><span/> Armazenamento local</div><button className="theme-toggle" onClick={()=>setDark(v=>!v)}>{dark?<Sun size={16}/>:<Moon size={16}/>} {dark?"Tema claro":"Tema escuro"}</button><button className="theme-toggle" onClick={()=>setSection("Configurações")}><Settings2 size={16}/> Configurações</button><small className="version">EstudosFlix · ciclo de estudos</small></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>EstudosFlix</span><b>/</b><strong>{title}</strong></div><span className="local-pill"><Check size={14}/> Dados neste dispositivo</span></header>
      <div className="page-content">
        {error&&<div className="demo-notice" role="alert">{error}</div>}
        {loading?<div className="panel"><p>Carregando seus dados locais…</p></div>:null}
        {!loading&&section==="Início"&&<Dashboard disciplines={disciplines} notebooks={notebooks} sessions={sessions} blocks={blocks} flashcards={flashcards} reviewLimit={reviewLimit} onGo={setSection}/>}
        {!loading&&section==="Estudar"&&<StudyPage disciplines={disciplines} notebooks={notebooks} subjects={subjects} notebookSubjects={notebookSubjects} dependencies={dependencies} sessionSegments={sessionSegments} blocks={blocks} reload={()=>setRefresh(x=>x+1)}/>}
        {!loading&&section==="Plano de Estudos"&&<PlanPage disciplines={disciplines} plans={plans} items={planItems} reload={()=>setRefresh(x=>x+1)}/>}
        {!loading&&section==="Disciplinas"&&<><DisciplinePage disciplines={disciplines} reload={()=>setRefresh(x=>x+1)}/><NotebookPage disciplines={disciplines} subjects={subjects} notebooks={notebooks} mappings={notebookSubjects} reload={()=>setRefresh(x=>x+1)}/></>}
        
        
        
        {!loading&&section==="Revisões"&&<FlashcardsPage disciplines={disciplines} subjects={subjects} cards={flashcards} limit={reviewLimit} reload={()=>setRefresh(x=>x+1)}/>}
        
        
        
        {!loading&&section==="Evolução"&&<EvolutionPage disciplines={disciplines} subjects={subjects} segments={sessionSegments} sessions={sessions} notebooks={notebooks}/>}
        {!loading&&section==="Configurações"&&<SettingsPage dark={dark} setDark={setDark} reviewLimit={reviewLimit} setReviewLimit={setReviewLimit} reload={()=>setRefresh(x=>x+1)}/>}
      </div>
    </main>
  </div>;
}

function Header({eyebrow,title,subtitle}:{eyebrow:string;title:string;subtitle:string}){
 return <div className="welcome-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div></div>;
}
function Dashboard({disciplines,notebooks,sessions,blocks,flashcards,reviewLimit,onGo}:{disciplines:Row[];notebooks:Row[];sessions:Session[];blocks:StudyBlock[];flashcards:Flashcard[];reviewLimit:number;onGo:(s:Section)=>void}){
 const [cycles,setCycles]=useState<Record<string,StudyCycleProgress>>({});
 const [completedPasses,setCompletedPasses]=useState(0);
 useEffect(()=>{let alive=true;void Promise.all(disciplines.map(async d=>[d.id,await settingsRepository.get("studyCycle:"+d.id)] as const)).then(entries=>{if(!alive)return;const next:Record<string,StudyCycleProgress>={};for(const [id,value] of entries){if(value&&typeof value==="object")next[id]=value as StudyCycleProgress;}setCycles(next);setCompletedPasses(Object.values(next).reduce((sum,x)=>sum+x.completedPasses,0));});return()=>{alive=false;};},[disciplines,notebooks]);
 const total=sessions.reduce((a,s)=>a+s.durationSeconds,0);
 const activeBlock=blocks.find(b=>b.status==="paused"||b.status==="in_progress");
 const dueCards=selectDailyReviewQueue(flashcards,new Date(),reviewLimit).length;
 const activeNotebook=activeBlock?notebooks.find(n=>n.id===activeBlock.notebookId):undefined;
 const nextDiscipline=disciplines.find(d=>notebooks.some(n=>n.disciplineId===d.id));
 const cycle=nextDiscipline?cycles[nextDiscipline.id]:undefined;
 const ordered=notebooks.filter(n=>n.disciplineId===nextDiscipline?.id).sort((a,b)=>(a.cycleOrder??0)-(b.cycleOrder??0)||a.createdAt.localeCompare(b.createdAt));
 const nextNotebook=activeNotebook??notebooks.find(n=>n.id===cycle?.notebookIds[cycle.currentNotebookIndex])??ordered[0];
 return <><Header eyebrow="SEU CICLO DE ESTUDOS" title="O que vamos estudar agora?" subtitle="O EstudosFlix organiza o próximo passo. Você só precisa seguir o ciclo."/>
 <div className="content-grid">
  <div className="panel"><div className="panel-heading"><div><span className="eyebrow">PRÓXIMO ESTUDO</span><h2>{activeBlock?"Continue de onde parou":"Seu próximo caderno"}</h2></div><Compass/></div>
   <h3 className="recommend-title">{targetDiscipline?.name??"Comece cadastrando uma disciplina"}</h3>
   <p className="muted-copy">{nextNotebook?.name??"Adicione cadernos à sua disciplina para montar o ciclo."}</p>
   {cycle&&<p className="muted-copy">Passada {cycle.completedPasses+1} · Progresso do ciclo: {getCycleProgressPercent(cycle)}% · Tempo previsto: 15 minutos</p>}
   <button className="button primary" onClick={()=>onGo("Estudar")} disabled={!nextNotebook}>{activeBlock?"Retomar estudo":"Iniciar estudo"} <ArrowRight size={16}/></button>
  </div>
  <div className="panel"><div className="panel-heading"><div><span className="eyebrow">REVISÕES DO DIA</span><h2>{dueCards} flashcards pendentes</h2></div><Brain/></div><p className="muted-copy">As revisões ficam fora do ciclo de cadernos e têm uma fila própria.</p><button className="button secondary" onClick={()=>onGo("Revisões")}>Iniciar revisões <ArrowRight size={16}/></button></div>
 </div>
 <div className="metric-grid">
  <Metric icon={<GraduationCap/>} label="Disciplinas" value={String(disciplines.length)} detail="Em estudo"/>
  <Metric icon={<Clock3/>} label="Tempo estudado" value={fmt(total)} detail="Tempo líquido registrado"/>
  <Metric icon={<Check/>} label="Passadas completas" value={String(completedPasses)} detail="Voltas completas no ciclo"/>
  <Metric icon={<Brain/>} label="Revisões hoje" value={String(dueCards)} detail="Flashcards na fila"/>
 </div>
 {targetDiscipline&&<div className="panel"><div className="panel-heading"><div><span className="eyebrow">CICLO ATUAL</span><h2>{targetDiscipline.name}</h2></div><b>Passada {(cycle?.completedPasses??0)+1}</b></div><div className="trail-bar"><span style={{width:(cycle?getCycleProgressPercent(cycle):0)+"%"}}/></div>{ordered.map((n,i)=><div className="diagnostic-row" key={n.id}><span className={i<(cycle?.currentNotebookIndex??0)?"diagnostic-dot green-dot":n.id===nextNotebook?.id?"diagnostic-dot blue-dot":"diagnostic-dot"}/><div><strong>{n.name}</strong><small>{i<(cycle?.currentNotebookIndex??0)?"Concluído nesta passada":n.id===nextNotebook?.id?"Próximo caderno":"Aguardando sua vez"}</small></div>{n.id===nextNotebook?.id&&<b>Agora</b>}</div>)}</div>}
 <div className="panel"><div className="panel-heading"><div><span className="eyebrow">EVOLUÇÃO RECENTE</span><h2>Últimas atividades</h2></div><button className="text-button" onClick={()=>onGo("Evolução")}>Ver evolução <ArrowRight size={14}/></button></div>
 {sessions.length===0?<p className="muted-copy">Seu histórico aparecerá aqui após os primeiros estudos.</p>:sessions.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(s=><div className="diagnostic-row" key={s.id}><span className="diagnostic-dot green-dot"/><div><strong>{s.notebookIds&&s.notebookIds.length>1?"Vários cadernos":notebooks.find(n=>n.id===s.notebookId)?.name??"Caderno"}</strong><small>{new Date(s.date).toLocaleString("pt-BR")} · {fmt(s.durationSeconds)} · {s.questions} questões</small></div><b>{s.questions?Math.round(s.correct/s.questions*100)+"%":"—"}</b></div>)}</div>
 </>;
}
function Metric({icon,label,value,detail}:{icon:ReactNode;label:string;value:string;detail:string}){
 return <div className="metric-card"><div className="metric-top"><span className="metric-icon blue">{icon}</span><span>{label}</span></div><div className="metric-value">{value}</div><div className="metric-detail">{detail}</div></div>;
}
function PlanPage({disciplines,plans,items,reload}:{disciplines:Row[];plans:PlanRecord[];items:PlanItemRecord[];reload:()=>void}){
 const [name,setName]=useState("");const [planId,setPlanId]=useState(plans[0]?.id??"");const [disciplineId,setDisciplineId]=useState(disciplines[0]?.id??"");const [minutes,setMinutes]=useState("60");const [message,setMessage]=useState("");
 useEffect(()=>{if(!planId&&plans[0])setPlanId(plans[0].id);},[plans,planId]);useEffect(()=>{if(!disciplineId&&disciplines[0])setDisciplineId(disciplines[0].id);},[disciplines,disciplineId]);
 const selected=items.filter(i=>i.planId===planId);const total=selected.reduce((sum,i)=>sum+i.minutes,0);const blocks=selected.reduce((sum,i)=>sum+i.blockCount,0);
 async function createPlan(e:FormEvent){e.preventDefault();if(!name.trim())return;const plan=await studyPlanRepository.save({name:name.trim()});setName("");setPlanId(plan.id);setMessage("Plano criado.");reload();}
 async function addTime(){const amount=Math.max(0,Number(minutes)||0);if(!planId||!disciplineId||amount<15){setMessage("Informe pelo menos 15 minutos.");return;}const existing=selected.find(i=>i.disciplineId===disciplineId);if(existing){await studyPlanItemRepository.save({...existing,minutes:existing.minutes+amount,blockCount:Math.floor((existing.minutes+amount)/15)});}else{await studyPlanItemRepository.save({planId,disciplineId,minutes:amount,blockCount:Math.floor(amount/15)});}setMessage("Tempo adicionado ao plano.");reload();}
 async function removeItem(id:string){if(!confirm("Remover esta distribuição?"))return;await studyPlanItemRepository.remove(id);reload();}
 return <><Header eyebrow="PLANEJAMENTO" title="Plano de Estudos" subtitle="Distribua o tempo por disciplina. A cada 15 minutos planejados, o sistema calcula uma passada."/><div className="content-grid"><form className="panel form-panel" onSubmit={createPlan}><h2>Criar plano</h2><label>Nome do plano<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Ciclo semanal" required/></label><button className="button primary"><Plus size={16}/> Criar plano</button><div className="divider"/><h2>Distribuir tempo</h2><label>Plano<select value={planId} onChange={e=>setPlanId(e.target.value)}><option value="">Selecione</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Disciplina<select value={disciplineId} onChange={e=>setDisciplineId(e.target.value)}><option value="">Selecione</option>{disciplines.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Tempo a adicionar (minutos)<input type="number" min="15" step="15" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label><button type="button" className="button secondary" onClick={()=>void addTime()} disabled={!planId||!disciplines.length}><Plus size={16}/> Adicionar tempo</button>{message&&<p className="muted-copy" role="status">{message}</p>}</form><div className="panel"><div className="panel-heading"><h2>Distribuição</h2><select className="compact-select" value={planId} onChange={e=>setPlanId(e.target.value)}><option value="">Plano</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div className="metric-grid plan-metrics"><Metric icon={<Clock3/>} label="Tempo planejado" value={String(total)+" min"} detail="Tempo total"/><Metric icon={<Target/>} label="Passadas previstas" value={String(blocks)} detail="Blocos de 15 min"/></div>{selected.length===0?<p className="muted-copy">Adicione tempo às disciplinas para montar seu plano.</p>:selected.map(item=><div className="diagnostic-row" key={item.id}><span className="diagnostic-dot blue-dot"/><div><strong>{disciplines.find(d=>d.id===item.disciplineId)?.name??"Disciplina"}</strong><small>{item.minutes} minutos · {item.blockCount} passadas</small></div><button className="icon-button danger" onClick={()=>void removeItem(item.id)} aria-label="Remover distribuição"><Trash2 size={16}/></button></div>)}</div></div></>;
}
function DisciplinePage({disciplines,reload}:{disciplines:Row[];reload:()=>void}){
 const [name,setName]=useState(""); const [description,setDescription]=useState(""); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState("");
 async function save(e:FormEvent){e.preventDefault();if(!name.trim())return;setBusy(true);setMsg("");try{await disciplineRepository.save({name:name.trim(),description:description.trim()});setName("");setDescription("");reload();}catch(err){setMsg(err instanceof Error?err.message:"Erro ao salvar.");}finally{setBusy(false);}}
 async function remove(id:string){if(!confirm("Excluir esta disciplina? Os cadernos vinculados não serão excluídos automaticamente."))return;await disciplineRepository.remove(id);reload();}
 return <><Header eyebrow="SUA ORGANIZAÇÃO" title="Disciplinas e cadernos" subtitle="Organize as disciplinas e monte a ordem dos cadernos que formam cada ciclo."/><div className="content-grid"><form className="panel form-panel" onSubmit={save}><h2>Nova disciplina</h2><label>Nome da disciplina<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Direito Constitucional" required/></label><label>Descrição (opcional)<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Objetivo ou observações"/></label>{msg&&<p className="error-text">{msg}</p>}<button className="button primary" disabled={busy}>{busy?"Salvando…":<><Plus size={16}/> Adicionar disciplina</>}</button></form><div className="panel"><div className="panel-heading"><h2>Suas disciplinas</h2><b>{disciplines.length}</b></div>{disciplines.length===0?<p className="muted-copy">Nenhuma disciplina cadastrada.</p>:disciplines.map(d=><div className="diagnostic-row" key={d.id}><span className="diagnostic-dot green-dot"/><div><strong>{d.name}</strong><small>{d.description||"Sem descrição"}</small></div><button className="icon-button danger" onClick={()=>void remove(d.id)} aria-label={"Excluir "+d.name}><Trash2 size={16}/></button></div>)}</div></div></>;
}
function SubjectPage({disciplines,subjects,reload}:{disciplines:Row[];subjects:Row[];reload:()=>void}){
 const [disciplineId,setDisciplineId]=useState(disciplines[0]?.id??"");const [name,setName]=useState("");const [description,setDescription]=useState("");const [parentId,setParentId]=useState("");
 useEffect(()=>{if(!disciplineId&&disciplines[0])setDisciplineId(disciplines[0].id);},[disciplines,disciplineId]);
 const filtered=subjects.filter(s=>s.disciplineId===disciplineId);
 async function save(e:FormEvent){e.preventDefault();if(!disciplineId||!name.trim())return;await subjectRepository.save({name:name.trim(),description:description.trim(),disciplineId,parentId:parentId||undefined});setName("");setDescription("");setParentId("");reload();}
 async function remove(id:string){if(!confirm("Excluir este assunto?"))return;await subjectRepository.remove(id);reload();}
 return <><Header eyebrow="PLANEJAMENTO" title="Assuntos e subassuntos" subtitle="Estruture o conteúdo dentro de cada disciplina e organize os pré-requisitos da sua trilha."/><div className="content-grid"><form className="panel form-panel" onSubmit={save}><h2>Novo assunto</h2><label>Disciplina<select value={disciplineId} onChange={e=>setDisciplineId(e.target.value)} required><option value="">Selecione</option>{disciplines.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Nome do assunto<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Direitos fundamentais" required/></label><label>Assunto principal (opcional)<select value={parentId} onChange={e=>setParentId(e.target.value)}><option value="">É um assunto principal</option>{filtered.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Descrição<textarea value={description} onChange={e=>setDescription(e.target.value)}/></label><button className="button primary" disabled={!disciplines.length}><Plus size={16}/> Adicionar assunto</button>{!disciplines.length&&<p className="muted-copy">Cadastre uma disciplina primeiro.</p>}</form><div className="panel"><div className="panel-heading"><h2>Assuntos cadastrados</h2><b>{filtered.length}</b></div>{filtered.length===0?<p className="muted-copy">Nenhum assunto nesta disciplina.</p>:filtered.map(s=><div className="diagnostic-row" key={s.id}><span className="diagnostic-dot blue-dot"/><div><strong>{s.parentId?"↳ ":""}{s.name}</strong><small>{s.description|| (s.parentId?"Subassunto":"Assunto principal")}</small></div><button className="icon-button danger" onClick={()=>void remove(s.id)} aria-label={"Excluir "+s.name}><Trash2 size={16}/></button></div>)}</div></div></>;
}
function NotebookPage({disciplines,subjects,notebooks,mappings,reload}:{disciplines:Row[];subjects:Row[];notebooks:Row[];mappings:NotebookSubjectRecord[];reload:()=>void}){
 const [name,setName]=useState("");const [disciplineId,setDisciplineId]=useState(disciplines[0]?.id??"");const [description,setDescription]=useState("");const [selectedSubjectIds,setSelectedSubjectIds]=useState<string[]>([]);
 const subjectOptions=subjects.filter(s=>s.disciplineId===disciplineId);
 const orderedNotebooks=notebooks.slice().sort((a,b)=>(a.disciplineId??"").localeCompare(b.disciplineId??"")||(a.cycleOrder??0)-(b.cycleOrder??0)||a.createdAt.localeCompare(b.createdAt));
 useEffect(()=>{if(!disciplineId&&disciplines[0])setDisciplineId(disciplines[0].id);},[disciplines,disciplineId]);
 async function save(e:FormEvent){e.preventDefault();if(!name.trim()||!disciplineId)return;const cycleOrder=notebooks.filter(n=>n.disciplineId===disciplineId).length;const notebook=await notebookRepository.save({name:name.trim(),disciplineId,description:description.trim(),cycleOrder});for(const subjectId of selectedSubjectIds)await notebookSubjectRepository.save({notebookId:notebook.id,subjectId});setName("");setDescription("");setSelectedSubjectIds([]);reload();}
 async function move(id:string,direction:-1|1){const current=notebooks.find(n=>n.id===id);if(!current)return;const group=notebooks.filter(n=>n.disciplineId===current.disciplineId).sort((a,b)=>(a.cycleOrder??0)-(b.cycleOrder??0)||a.createdAt.localeCompare(b.createdAt));const index=group.findIndex(n=>n.id===id);const target=index+direction;if(target<0||target>=group.length)return;const reordered=[...group];[reordered[index],reordered[target]]=[reordered[target],reordered[index]];for(let i=0;i<reordered.length;i++)await notebookRepository.save({...reordered[i],cycleOrder:i});reload();}
 async function remove(id:string){if(!confirm("Excluir este caderno e seus vínculos com assuntos?"))return;for(const mapping of mappings.filter(m=>m.notebookId===id))await notebookSubjectRepository.remove(mapping.id);await notebookRepository.remove(id);reload();}
 return <><div className="content-grid"><form className="panel form-panel" onSubmit={save}><h2>Novo caderno</h2><label>Disciplina<select value={disciplineId} onChange={e=>{setDisciplineId(e.target.value);setSelectedSubjectIds([]);}} required><option value="">Selecione</option>{disciplines.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label><label>Nome do caderno<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: 01 — Conceitos" required/></label><label>Observações<textarea value={description} onChange={e=>setDescription(e.target.value)}/></label><div className="subject-check-list"><strong>Assuntos deste caderno</strong>{subjectOptions.length===0?<small>Cadastre assuntos nesta disciplina para vinculá-los ao caderno.</small>:subjectOptions.map(s=><label key={s.id}><input type="checkbox" checked={selectedSubjectIds.includes(s.id)} onChange={e=>setSelectedSubjectIds(v=>e.target.checked?[...v,s.id]:v.filter(id=>id!==s.id))}/>{s.name}</label>)}</div><button className="button primary" disabled={!disciplines.length}><Plus size={16}/> Adicionar caderno</button>{!disciplines.length&&<p className="muted-copy">Cadastre uma disciplina primeiro.</p>}</form><div className="panel"><h2>Seus cadernos</h2>{notebooks.length===0?<p className="muted-copy">Nenhum caderno cadastrado.</p>:orderedNotebooks.map(n=>{const names=mappings.filter(m=>m.notebookId===n.id).map(m=>subjects.find(s=>s.id===m.subjectId)?.name).filter(Boolean);const group=orderedNotebooks.filter(x=>x.disciplineId===n.disciplineId);const position=group.findIndex(x=>x.id===n.id);return <div className="diagnostic-row" key={n.id}><span className="diagnostic-dot blue-dot"/><div><strong>{n.name}</strong><small>{disciplines.find(d=>d.id===n.disciplineId)?.name??"Disciplina não encontrada"} · {names.length?names.join(", "):"Sem assuntos vinculados"} · Posição {position+1} no ciclo</small></div><button className="icon-button" disabled={position===0} onClick={()=>void move(n.id,-1)} aria-label={"Mover "+n.name+" para cima"}>↑</button><button className="icon-button" disabled={position===group.length-1} onClick={()=>void move(n.id,1)} aria-label={"Mover "+n.name+" para baixo"}>↓</button><button className="icon-button danger" onClick={()=>void remove(n.id)} aria-label={"Excluir "+n.name}><Trash2 size={16}/></button></div>})}</div></div></>;
}
function StudyPage({disciplines,notebooks,subjects,notebookSubjects,dependencies,sessionSegments,blocks,reload}:{disciplines:Row[];notebooks:Row[];subjects:Row[];notebookSubjects:NotebookSubjectRecord[];dependencies:DependencyRecord[];sessionSegments:SegmentRecord[];blocks:StudyBlock[];reload:()=>void}){
 const paused=blocks.find(b=>b.status==="paused"||b.status==="in_progress");
 const [disciplineId,setDisciplineId]=useState(paused?.disciplineId??disciplines[0]?.id??"");
 const [notebookId,setNotebookId]=useState(paused?.notebookId??"");
 const [elapsed,setElapsed]=useState(paused?.elapsedSeconds??0);
 const [sessionElapsed,setSessionElapsed]=useState(0);
 const [visitedNotebookIds,setVisitedNotebookIds]=useState<string[]>([]);
 const [sessionStartedAt,setSessionStartedAt]=useState<string>();
 const sessionDraftRef=useRef<StudySessionDraft|null>(null);
 const [running,setRunning]=useState(false);
 const [question,setQuestion]=useState(paused?.lastQuestionNumber?String(paused.lastQuestionNumber+1):"");
 const [segments,setSegments]=useState<SegmentDraft[]>([{key:makeId(),subjectId:"",questions:"0",correct:"0",difficulties:[]}]);
 const [block,setBlock]=useState<StudyBlock|undefined>(paused?{...paused,status:"paused"}:undefined);
 const [cycleProgress,setCycleProgress]=useState<StudyCycleProgress>();
 const [cycleReady,setCycleReady]=useState(false);
 useEffect(()=>{if(paused?.status==="in_progress"){void studyBlockRepository.save({...paused,status:"paused",updatedAt:nowIso()});}},[]);
 useEffect(()=>{let alive=true;void settingsRepository.get("activeStudySession").then(value=>{if(!alive||!value||typeof value!=="object")return;const draft=value as StudySessionDraft;setDisciplineId(draft.disciplineId||disciplineId);setSessionElapsed(Number(draft.sessionElapsed)||0);if(Array.isArray(draft.segments))setSegments(draft.segments);if(Array.isArray(draft.visitedNotebookIds))setVisitedNotebookIds(draft.visitedNotebookIds);if(draft.startedAt)setSessionStartedAt(draft.startedAt);});return()=>{alive=false;};},[]);
 useEffect(()=>{sessionDraftRef.current=sessionElapsed>0?{disciplineId,sessionElapsed,segments,visitedNotebookIds,startedAt:sessionStartedAt??nowIso()}:null;},[disciplineId,sessionElapsed,segments,visitedNotebookIds,sessionStartedAt]);
 useEffect(()=>{const timer=window.setInterval(()=>{const draft=sessionDraftRef.current;if(draft)void settingsRepository.set("activeStudySession",draft);},5000);return()=>window.clearInterval(timer);},[]);

 const elapsedRef=useRef(elapsed);
 useEffect(()=>{elapsedRef.current=elapsed;},[elapsed]);
 const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");
 const available=notebooks.filter(n=>n.disciplineId===disciplineId).sort((a,b)=>(a.cycleOrder??0)-(b.cycleOrder??0)||a.createdAt.localeCompare(b.createdAt));
 const isNotebookBlocked=(notebookId:string)=>{
  const subjectIds=notebookSubjects.filter(m=>m.notebookId===notebookId).map(m=>m.subjectId);
  for(const subjectId of subjectIds){for(const dependency of dependencies.filter(d=>d.dependentSubjectId===subjectId)){
   const rows=sessionSegments.filter(s=>s.subjectId===dependency.prerequisiteSubjectId);
   const attempts:Attempt[]=rows.map(s=>({questions:s.questions,correct:s.correct,date:s.date}));
   const exposures:Exposure[]=rows.filter(s=>s.questions>=10).map(s=>({questions:s.questions,correct:s.correct,date:s.date}));
   const result=calculateDomain(attempts,exposures);
   if(result.value===null||result.totalQuestions<30||exposures.length<2)continue;
   const factor=dependency.strength==="critical"?1:dependency.strength==="strong"?.7:dependency.strength==="moderate"?.4:.2;
   if((100-result.value)*factor>=60)return true;
  }}
  return false;
 };
 const eligibleNotebooks=available.filter(n=>!isNotebookBlocked(n.id));
 const eligibleIdsKey=eligibleNotebooks.map(n=>n.id).join("|");
 useEffect(()=>{let alive=true;setCycleReady(false);void settingsRepository.get("studyCycle:"+disciplineId).then(value=>{if(!alive)return;const saved=value&&typeof value==="object"?value as StudyCycleProgress:undefined;const reconciled=reconcileStudyCycle(saved,disciplineId,eligibleNotebooks.map(n=>n.id));if(!saved&&paused){const pausedIndex=eligibleNotebooks.findIndex(n=>n.id===paused.notebookId);if(pausedIndex>=0)reconciled.currentNotebookIndex=pausedIndex;}setCycleProgress(reconciled);void settingsRepository.set("studyCycle:"+disciplineId,reconciled);setCycleReady(true);});return()=>{alive=false;};},[disciplineId,eligibleIdsKey]);
 const progress=getStudyBlockProgress({elapsedSeconds:elapsed});
 const mappedSubjectIds=notebookSubjects.filter(m=>m.notebookId===notebookId).map(m=>m.subjectId);
 const linkedSubjects=subjects.filter(s=>s.disciplineId===disciplineId&&(!mappedSubjectIds.length||mappedSubjectIds.includes(s.id)));
 const notebookHistory=blocks.filter(b=>b.notebookId===notebookId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
 useEffect(()=>{if(!block){setQuestion(notebookHistory?.lastQuestionNumber!==undefined?String(notebookHistory.lastQuestionNumber+1):"");}},[notebookId,blocks,block?.id]);
 useEffect(()=>{if(!notebookId&&available[0])setNotebookId(available[0].id);},[available,notebookId]);
 useEffect(()=>{if(!block&&cycleProgress?.notebookIds.length){const currentId=cycleProgress.notebookIds[cycleProgress.currentNotebookIndex];if(currentId)setNotebookId(currentId);}},[cycleProgress,block?.id]);
 useEffect(()=>{if(!running)return;const timer=window.setInterval(()=>{setElapsed(v=>Math.min(STUDY_BLOCK_SECONDS,v+1));setSessionElapsed(v=>v+1);},1000);return()=>window.clearInterval(timer);},[running]);
 useEffect(()=>{if(block&&running){const timer=window.setInterval(()=>{const next={...block,elapsedSeconds:elapsedRef.current,updatedAt:nowIso(),lastQuestionNumber:question?Math.max(0,Number(question)-1):block.lastQuestionNumber};void studyBlockRepository.save(next);},5000);return()=>window.clearInterval(timer);}},[block,running,question]);
 useEffect(()=>{if(elapsed>=STUDY_BLOCK_SECONDS&&running){setRunning(false);void completeBlock();}},[elapsed,running]);
 async function begin(){if(!cycleReady){setMessage("Preparando seu ciclo de estudos…");return;}if(!notebookId){setMessage("Cadastre ou selecione um caderno antes de iniciar.");return;}if(isNotebookBlocked(notebookId)){setMessage("Este caderno depende de um pré-requisito que ainda está bloqueado. Reforce o assunto anterior antes de avançar.");return;}let current=block;if(!current){const now=nowIso();current={id:makeId(),createdAt:now,updatedAt:now,disciplineId,notebookId,elapsedSeconds:0,status:"in_progress",startedAt:now};}else current=resumeStudyBlock({...current,disciplineId,notebookId});await studyBlockRepository.save(current);setBlock(current);setElapsed(current.elapsedSeconds);setSessionStartedAt(v=>v??nowIso());setVisitedNotebookIds(v=>v.includes(notebookId)?v:[...v,notebookId]);setRunning(true);setMessage("");}
 async function pause(){setRunning(false);if(!block)return;const next=pauseStudyBlock({...block,elapsedSeconds:elapsed,lastQuestionNumber:question?Math.max(0,Number(question)-1):block.lastQuestionNumber});await studyBlockRepository.save(next);setBlock(next);setMessage("Bloco pausado. O tempo e a posição foram salvos; sua sessão continua aberta.");reload();}
 async function completeBlock(){
  if(!block)return;
  const completed={...block,elapsedSeconds:STUDY_BLOCK_SECONDS,status:"completed" as const,lastQuestionNumber:question?Math.max(0,Number(question)-1):block.lastQuestionNumber,updatedAt:nowIso(),completedAt:nowIso()};
  await studyBlockRepository.save(completed);
  const storedProgress=await settingsRepository.get("studyCycle:"+disciplineId);const currentProgress=reconcileStudyCycle(storedProgress&&typeof storedProgress==="object"?storedProgress as StudyCycleProgress:cycleProgress,disciplineId,eligibleNotebooks.map(n=>n.id));
  const step=completeCycleNotebook(currentProgress,nowIso());
  setCycleProgress(step.progress);
  await settingsRepository.set("studyCycle:"+disciplineId,step.progress);
  const next=eligibleNotebooks.find(n=>n.id===step.nextNotebookId);
  setNotebookId(next?.id??block.notebookId);
  setBlock(undefined);setElapsed(0);setQuestion("");
  setMessage(step.completedPass?"Ciclo completo! Passada "+step.progress.completedPasses+" concluída. O ciclo recomeça pelo primeiro caderno.":"Bloco de 15 minutos concluído. Próximo caderno: "+(next?.name??"nenhum disponível")+". Progresso do ciclo: "+step.progressPercent+"%.");
  reload();
 }
 async function finishSession(){
  if(sessionElapsed===0)return;
  setSaving(true);
  try{
   setRunning(false);
   if(block){const pausedBlock=pauseStudyBlock({...block,elapsedSeconds:elapsed,lastQuestionNumber:question?Math.max(0,Number(question)-1):block.lastQuestionNumber});await studyBlockRepository.save(pausedBlock);setBlock(pausedBlock);}
   const now=nowIso();const valid=segments.filter(x=>x.subjectId&&Math.max(0,Number(x.questions)||0)>0);
   const q=valid.reduce((sum,x)=>sum+Math.max(0,Number(x.questions)||0),0);
   const a=valid.reduce((sum,x)=>sum+Math.min(Math.max(0,Number(x.questions)||0),Math.max(0,Number(x.correct)||0)),0);
   const saved=await sessionRepository.save({disciplineId,notebookId:visitedNotebookIds.length===1?visitedNotebookIds[0]:undefined,notebookIds:visitedNotebookIds,durationSeconds:sessionElapsed,questions:q,correct:a,date:now});
   for(const segment of valid){const count=Math.max(0,Number(segment.questions)||0);await sessionSegmentRepository.save({sessionId:saved.id,subjectId:segment.subjectId,questions:count,correct:Math.min(count,Math.max(0,Number(segment.correct)||0)),difficulties:segment.difficulties,date:now});}
   setSessionElapsed(0);setSegments([{key:makeId(),subjectId:"",questions:"0",correct:"0",difficulties:[]}]);setVisitedNotebookIds([]);setSessionStartedAt(undefined);sessionDraftRef.current=null;await settingsRepository.set("activeStudySession",null);
   setMessage("Sessão finalizada e registrada. Suas passadas concluídas permanecem salvas.");
   reload();
  }catch(e){setMessage(e instanceof Error?e.message:"Não foi possível finalizar a sessão.");}
  finally{setSaving(false);}
 }
 return <><Header eyebrow="MÉTODO KYRLA / TATA" title="Seu ciclo de estudos" subtitle="Estude 15 minutos em cada caderno. A passada termina quando você percorre todo o ciclo."/>
 <div className="content-grid"><div className="panel timer-panel"><div className="panel-heading"><div><span className="eyebrow">PRÓXIMO CADERNO DO CICLO</span><h2>{block?notebooks.find(n=>n.id===block.notebookId)?.name??"Caderno selecionado":notebooks.find(n=>n.id===notebookId)?.name??"Prepare seu ciclo"}</h2></div><span className={running?"status-label success":"status-label warning"}>{running?"Em andamento":elapsed>=STUDY_BLOCK_SECONDS?"Concluído":"Pausado"}</span></div>
 <div className="timer-display">{fmt(elapsed)}<small> / 15:00</small></div><div className="trail-bar timer-bar"><span style={{width:progress.completionPercent+"%"}}/></div><div className="timer-caption"><span>{fmt(elapsed)} estudados</span><span>{fmt(progress.remainingSeconds)} restantes</span></div>
 <div className="timer-actions">{!running?<button className="button primary" onClick={()=>void begin()} disabled={!cycleReady||!disciplines.length||!eligibleNotebooks.length||elapsed>=STUDY_BLOCK_SECONDS||isNotebookBlocked(notebookId)}><Play size={16}/> {elapsed?"Retomar bloco":"Iniciar bloco de 15 min"}</button>:<button className="button secondary" onClick={()=>void pause()}><Pause size={16}/> Pausar</button>}{sessionElapsed>0&&<button className="button secondary" onClick={()=>void finishSession()} disabled={saving}><Check size={16}/> Finalizar sessão</button>}</div>
 {message&&<p className="muted-copy" role="status">{message}</p>}
 </div>
 <div className="panel form-panel"><h2>Registro da sessão</h2><div className="diagnostic-row"><span className="diagnostic-dot blue-dot"/><div><strong>{disciplines.find(d=>d.id===disciplineId)?.name??"Disciplina"}</strong><small>{notebooks.find(n=>n.id===notebookId)?.name??"Próximo caderno do ciclo"}</small></div></div><label>Próxima questão / posição<input type="number" min="0" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ex.: 27"/></label><div className="divider"/><div className="panel-heading"><h3>Desempenho por assunto</h3><button type="button" className="text-button" onClick={()=>setSegments(v=>[...v,{key:makeId(),subjectId:"",questions:"0",correct:"0",difficulties:[]}])}><Plus size={14}/> Adicionar assunto</button></div>{segments.map((segment,index)=><div className="segment-editor" key={segment.key}><div className="segment-head"><strong>Assunto {index+1}</strong>{segments.length>1&&<button type="button" className="text-button danger" onClick={()=>setSegments(v=>v.filter(x=>x.key!==segment.key))}>Remover</button>}</div><label>Assunto<select value={segment.subjectId} onChange={e=>setSegments(v=>v.map(x=>x.key===segment.key?{...x,subjectId:e.target.value}:x))}><option value="">Selecione o assunto</option>{linkedSubjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><div className="two-fields"><label>Questões<input type="number" min="0" value={segment.questions} onChange={e=>setSegments(v=>v.map(x=>x.key===segment.key?{...x,questions:e.target.value}:x))}/></label><label>Acertos<input type="number" min="0" max={segment.questions} value={segment.correct} onChange={e=>setSegments(v=>v.map(x=>x.key===segment.key?{...x,correct:e.target.value}:x))}/></label></div><div className="difficulty-picks">{["Errei conceitos","Acertei no chute","Acertei sem segurança"].map(label=><label key={label}><input type="checkbox" checked={segment.difficulties.includes(label)} onChange={e=>setSegments(v=>v.map(x=>x.key===segment.key?{...x,difficulties:e.target.checked?[...x.difficulties,label]:x.difficulties.filter(d=>d!==label)}:x))}/>{label}</label>)}</div></div>)}<p className="muted-copy small-copy">Tempo desta sessão: {fmt(sessionElapsed)} em {visitedNotebookIds.length} cadernos. Cada bloco concluído conta para o progresso do ciclo; uma passada só termina após visitar todos os cadernos elegíveis.</p></div></div>
 {disciplineId&&<div className="panel"><div className="panel-heading"><h2>Ciclo da disciplina</h2><RotateCcw size={17}/></div><p className="muted-copy">Passada atual: {(cycleProgress?.completedPasses??0)+1} · Progresso: {cycleProgress?getCycleProgressPercent(cycleProgress):0}% · {cycleProgress?.currentNotebookIndex??0} de {cycleProgress?.notebookIds.length??eligibleNotebooks.length} cadernos concluídos nesta volta.</p><div className="trail-bar"><span style={{width:(cycleProgress?getCycleProgressPercent(cycleProgress):0)+"%"}}/></div>{block?<p className="muted-copy">Seu bloco permanece vinculado ao mesmo caderno. Se você parar agora, o sistema preserva {fmt(elapsed)} e faltam {fmt(progress.remainingSeconds)} para concluir o bloco deste caderno.</p>:<p className="muted-copy">O ciclo avança automaticamente conforme você conclui os blocos de 15 minutos.</p>}</div>}
 </>;
}
function DependenciesPage({subjects,dependencies,reload}:{subjects:Row[];dependencies:DependencyRecord[];reload:()=>void}){
 const [prerequisiteSubjectId,setPrerequisiteSubjectId]=useState("");const [dependentSubjectId,setDependentSubjectId]=useState("");const [strength,setStrength]=useState<DependencyRecord["strength"]>("critical");const [message,setMessage]=useState("");
 async function save(e:FormEvent){e.preventDefault();if(!prerequisiteSubjectId||!dependentSubjectId||prerequisiteSubjectId===dependentSubjectId){setMessage("Escolha dois assuntos diferentes.");return;}if(dependencies.some(d=>d.prerequisiteSubjectId===prerequisiteSubjectId&&d.dependentSubjectId===dependentSubjectId)){setMessage("Essa dependência já existe.");return;}const reaches=(from:string,target:string,seen=new Set<string>()):boolean=>{if(from===target)return true;if(seen.has(from))return false;seen.add(from);return dependencies.filter(d=>d.prerequisiteSubjectId===from).some(d=>reaches(d.dependentSubjectId,target,seen));};if(reaches(dependentSubjectId,prerequisiteSubjectId)){setMessage("Essa relação criaria um ciclo na trilha. Ajuste a sequência pedagógica.");return;}await subjectDependencyRepository.save({prerequisiteSubjectId,dependentSubjectId,strength});setMessage("Pré-requisito cadastrado.");setPrerequisiteSubjectId("");setDependentSubjectId("");reload();}
 async function remove(id:string){if(!confirm("Remover esta dependência?"))return;await subjectDependencyRepository.remove(id);reload();}
 const name=(id:string)=>subjects.find(s=>s.id===id)?.name??"Assunto removido";
 return <><Header eyebrow="PLANEJAMENTO" title="Pré-requisitos" subtitle="Defina quais assuntos precisam ser fortalecidos antes de avançar para outros conteúdos."/><div className="content-grid"><form className="panel form-panel" onSubmit={save}><h2>Nova dependência</h2><label>Assunto que é pré-requisito<select value={prerequisiteSubjectId} onChange={e=>setPrerequisiteSubjectId(e.target.value)} required><option value="">Selecione</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Assunto dependente<select value={dependentSubjectId} onChange={e=>setDependentSubjectId(e.target.value)} required><option value="">Selecione</option>{subjects.filter(s=>s.id!==prerequisiteSubjectId).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Intensidade da dependência<select value={strength} onChange={e=>setStrength(e.target.value as DependencyRecord["strength"])}><option value="critical">Crítica</option><option value="strong">Forte</option><option value="moderate">Moderada</option><option value="weak">Fraca</option></select></label><button className="button primary" disabled={subjects.length<2}><Plus size={16}/> Adicionar pré-requisito</button>{message&&<p className="muted-copy" role="status">{message}</p>}</form><div className="panel"><h2>Dependências cadastradas</h2>{dependencies.length===0?<p className="muted-copy">Nenhum pré-requisito definido.</p>:dependencies.map(d=><div className="diagnostic-row" key={d.id}><span className="diagnostic-dot amber-dot"/><div><strong>{name(d.prerequisiteSubjectId)} → {name(d.dependentSubjectId)}</strong><small>Intensidade: {d.strength==="critical"?"Crítica":d.strength==="strong"?"Forte":d.strength==="moderate"?"Moderada":"Fraca"}</small></div><button className="icon-button danger" onClick={()=>void remove(d.id)} aria-label="Remover dependência"><Trash2 size={16}/></button></div>)}</div></div></>;
}
function AnalysisPage({subjects,segments,dependencies,mode}:{subjects:Row[];segments:SegmentRecord[];dependencies:DependencyRecord[];mode:"diagnosis"|"reports"}){
 const base=subjects.map(subject=>{
  const rows=segments.filter(s=>s.subjectId===subject.id).sort((a,b)=>a.date.localeCompare(b.date));
  const attempts:Attempt[]=rows.map(s=>({questions:s.questions,correct:s.correct,date:s.date}));
  const exposures:Exposure[]=rows.filter(s=>s.questions>=10).map(s=>({questions:s.questions,correct:s.correct,date:s.date}));
  const domain=calculateDomain(attempts,exposures);const retention=calculateRetention(exposures);
  let q=0,a=0;for(const row of [...rows].reverse()){if(q>=30)break;const take=Math.min(row.questions,30-q);if(row.questions>0){q+=take;a+=row.correct*(take/row.questions);}}
  const persistent=q>=30&&a/q<.6&&exposures.length>=2;
  return {subject,rows,domain,retention,persistent};
 });
 const results=base.map(item=>{
  const blockers=dependencies.filter(d=>d.dependentSubjectId===item.subject.id).map(dep=>{
   const prerequisite=base.find(x=>x.subject.id===dep.prerequisiteSubjectId);
   if(!prerequisite||prerequisite.domain.value===null)return {name:subjects.find(s=>s.id===dep.prerequisiteSubjectId)?.name??"Pré-requisito",index:null,confirmed:false};
   const factor=dep.strength==="critical"?1:dep.strength==="strong"?.7:dep.strength==="moderate"?.4:.2;
   const index=(100-prerequisite.domain.value)*factor;
   const evidence=prerequisite.domain.totalQuestions>=30&&prerequisite.rows.filter(r=>r.questions>=10).length>=2;
   return {name:prerequisite.subject.name,index,confirmed:evidence&&index>=60};
  });
  return {...item,blockers,blocked:blockers.some(b=>b.confirmed)};
 });
 const insufficient=results.filter(x=>x.domain.value===null).length;
 const blocked=results.filter(x=>x.blocked).length;
 return <><Header eyebrow={mode==="diagnosis"?"ANÁLISE / EVIDÊNCIAS":"ANÁLISE / DESEMPENHO"} title={mode==="diagnosis"?"Diagnóstico por assunto":"Relatórios de aprendizagem"} subtitle={mode==="diagnosis"?"Identifique dificuldades persistentes e pré-requisitos que precisam de reforço.":"Acompanhe desempenho atual, retenção e confiança a partir das sessões registradas."}/>
 <div className="metric-grid"><Metric icon={<Target/>} label="Assuntos cadastrados" value={String(subjects.length)} detail="Na sua trilha"/><Metric icon={<Activity/>} label="Com evidência" value={String(results.filter(x=>x.domain.totalQuestions>0).length)} detail="Com questões registradas"/><Metric icon={<Brain/>} label="Dados insuficientes" value={String(insufficient)} detail="Precisam de mais evidências"/><Metric icon={<TriangleAlert/>} label="Bloqueios confirmados" value={String(blocked)} detail="Somente com evidência suficiente"/></div>
 <div className="panel"><div className="panel-heading"><h2>{mode==="diagnosis"?"Situação dos assuntos":"Desempenho por assunto"}</h2></div>{results.length===0?<p className="muted-copy">Cadastre assuntos e registre sessões para gerar análises.</p>:results.map(item=><div className="analysis-row" key={item.subject.id}><div className="analysis-main"><strong>{item.subject.name}</strong><small>{item.domain.totalQuestions} questões · {item.rows.length} exposições registradas · {item.domain.confidence==="insufficient"?"Dados insuficientes":item.domain.confidence==="low"?"Confiança baixa":item.domain.confidence==="moderate"?"Confiança moderada":"Confiança alta"}</small>{item.blockers.map((b,i)=><small key={i}>{b.confirmed?"Bloqueado por: ":b.index===null?"Evidência insuficiente em: ":"Pré-requisito em atenção: "}{b.name}{b.index===null?"":` (índice ${Math.round(b.index)})`}</small>)}</div><div className="analysis-value"><b>{item.domain.value===null?"—":Math.round(item.domain.value)+"%"}</b><small>Domínio</small></div><div className="analysis-value"><b>{item.retention.value===null?"—":Math.round(item.retention.value)+"%"}</b><small>Retenção</small></div><span className={item.blocked||item.persistent?"status-label warning":"status-label success"}>{item.blocked?"Bloqueio confirmado":item.persistent?"Dificuldade persistente":item.domain.value===null?"Coletar dados":"Sem trava confirmada"}</span></div>)}</div>
 <p className="muted-copy small-copy">Bloqueios usam o índice (100 − domínio do pré-requisito) × intensidade da dependência. A confirmação exige pelo menos 30 questões e duas exposições válidas; ausência de dados nunca é tratada como domínio saudável.</p>
 </>;
}
function EvolutionPage({disciplines,subjects,segments,sessions,notebooks}:{disciplines:Row[];subjects:Row[];segments:SegmentRecord[];sessions:Session[];notebooks:Row[]}){
 const [passes,setPasses]=useState(0);
 useEffect(()=>{let alive=true;void Promise.all(disciplines.map(d=>settingsRepository.get("studyCycle:"+d.id))).then(values=>{if(alive)setPasses(values.reduce<number>((sum,value)=>sum+(value&&typeof value==="object"?Number((value as StudyCycleProgress).completedPasses)||0:0),0));});return()=>{alive=false;};},[disciplines]);
 const bySubject=subjects.map(subject=>{const rows=segments.filter(s=>s.subjectId===subject.id).sort((a,b)=>a.date.localeCompare(b.date));const attempts:Attempt[]=rows.map(s=>({questions:s.questions,correct:s.correct,date:s.date}));const exposures:Exposure[]=rows.filter(s=>s.questions>=10).map(s=>({questions:s.questions,correct:s.correct,date:s.date}));return {subject,rows,domain:calculateDomain(attempts,exposures),retention:calculateRetention(exposures)};});
 const weighted=(items:typeof bySubject,key:"domain"|"retention")=>{const valid=items.filter(x=>x[key].value!==null);const totalWeight=valid.reduce((sum,x)=>sum+(key==="domain"?x.domain.totalQuestions:Math.max(1,x.rows.filter(r=>r.questions>=10).length)),0);return totalWeight?valid.reduce((sum,x)=>sum+(x[key].value??0)*(key==="domain"?x.domain.totalQuestions:Math.max(1,x.rows.filter(r=>r.questions>=10).length)),0)/totalWeight:null;};
 const byDiscipline=disciplines.map(d=>{const items=bySubject.filter(x=>x.subject.disciplineId===d.id);const rows=segments.filter(s=>items.some(x=>x.subject.id===s.subjectId));return {discipline:d,domainValue:weighted(items,"domain"),retentionValue:weighted(items,"retention"),questions:rows.reduce((sum,s)=>sum+s.questions,0)};});
 const overallDomain=weighted(bySubject,"domain");const overallRetention=weighted(bySubject,"retention");
 const bottlenecks=bySubject.filter(x=>x.domain.value!==null).sort((a,b)=>(a.domain.value??100)-(b.domain.value??100)).slice(0,5);
 const totalTime=sessions.reduce((sum,s)=>sum+s.durationSeconds,0);const totalQuestions=sessions.reduce((sum,s)=>sum+s.questions,0);
 return <><Header eyebrow="SUA JORNADA" title="Evolução" subtitle="Entenda seu progresso, identifique dificuldades e veja o que merece atenção agora."/>
 <div className="metric-grid"><Metric icon={<Target/>} label="Domínio geral" value={overallDomain===null?"—":Math.round(overallDomain)+"%"} detail="Média ponderada das evidências"/><Metric icon={<Activity/>} label="Retenção" value={overallRetention===null?"—":Math.round(overallRetention)+"%"} detail="Média das retenções com evidência"/><Metric icon={<Check/>} label="Passadas" value={String(passes)} detail="Ciclos completos"/><Metric icon={<BookOpen/>} label="Questões" value={String(totalQuestions)} detail={fmt(totalTime)+" de estudo líquido"}/></div>
 <div className="panel"><div className="panel-heading"><div><span className="eyebrow">VISÃO GERAL</span><h2>Evolução por disciplina</h2></div></div>{byDiscipline.length===0?<p className="muted-copy">Cadastre disciplinas para acompanhar sua evolução.</p>:byDiscipline.map(item=><div className="analysis-row" key={item.discipline.id}><div className="analysis-main"><strong>{item.discipline.name}</strong><small>{item.questions} questões registradas · {item.domainValue===null?"Dados insuficientes":"Com base nos conteúdos com evidência"}</small></div><div className="analysis-value"><b>{item.domainValue===null?"—":Math.round(item.domainValue)+"%"}</b><small>Domínio</small></div><div className="analysis-value"><b>{item.retentionValue===null?"—":Math.round(item.retentionValue)+"%"}</b><small>Retenção</small></div></div>)}</div>
 <div className="content-grid"><div className="panel"><div className="panel-heading"><div><span className="eyebrow">PONTOS DE ATENÇÃO</span><h2>Gargalos identificados</h2></div><TriangleAlert/></div>{bottlenecks.length===0?<p className="muted-copy">Ainda não há evidências suficientes para identificar gargalos. Continue registrando questões e sessões.</p>:bottlenecks.map(item=><div className="diagnostic-row" key={item.subject.id}><span className="diagnostic-dot amber-dot"/><div><strong>{item.subject.name}</strong><small>{item.domain.value===null?"Dados insuficientes":"Domínio "+Math.round(item.domain.value)+"%"} · {item.domain.totalQuestions} questões analisadas</small></div></div>)}</div>
 <div className="panel"><div className="panel-heading"><div><span className="eyebrow">PRÓXIMA AÇÃO</span><h2>Recomendação</h2></div><Compass/></div>{bottlenecks[0]?<><p className="muted-copy">Priorize o reforço de <strong>{bottlenecks[0].subject.name}</strong> antes de avançar pelos conteúdos que dependem dele.</p><span className="status-label warning">Atenção recomendada</span></>:<p className="muted-copy">Continue seguindo o próximo caderno do ciclo. O sistema recomendará reforços quando houver evidência suficiente.</p>}</div></div>
 <div className="panel"><div className="panel-heading"><div><span className="eyebrow">ATIVIDADE</span><h2>Histórico integrado</h2></div><b>{sessions.length} sessões</b></div>{sessions.length===0?<p className="muted-copy">Seu histórico aparecerá aqui após os primeiros estudos.</p>:sessions.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(s=><div className="diagnostic-row" key={s.id}><span className="diagnostic-dot green-dot"/><div><strong>{disciplines.find(d=>d.id===s.disciplineId)?.name??"Disciplina"} · {s.notebookIds&&s.notebookIds.length>1?"Vários cadernos":notebooks.find(n=>n.id===s.notebookId)?.name??"Caderno"}</strong><small>{new Date(s.date).toLocaleString("pt-BR")} · {fmt(s.durationSeconds)} · {s.questions} questões</small></div><b>{s.questions?Math.round(s.correct/s.questions*100)+"%":"—"}</b></div>)}</div>
 </>;
}
function FlashcardsPage({disciplines,subjects,cards,limit,reload}:{disciplines:Row[];subjects:Row[];cards:Flashcard[];limit:number;reload:()=>void}){
 const [subjectId,setSubjectId]=useState(subjects[0]?.id??"");const [front,setFront]=useState("");const [back,setBack]=useState("");
 const [activeId,setActiveId]=useState<string|undefined>();const [revealed,setRevealed]=useState(false);const [startedAt,setStartedAt]=useState(0);const [message,setMessage]=useState("");
 const queue=selectDailyReviewQueue(cards,new Date(),limit);const current=queue.find(c=>c.id===activeId)??queue[0];
 useEffect(()=>{if(current){setStartedAt(Date.now());setRevealed(false);}},[current?.id]);
 async function create(e:FormEvent){e.preventDefault();if(!subjectId||!front.trim()||!back.trim())return;const duplicate=cards.find(c=>c.subjectId===subjectId&&c.front.trim().toLowerCase()===front.trim().toLowerCase()&&!c.archived);const now=nowIso();if(duplicate){await flashcardRepository.save({...duplicate,back:back.trim(),updatedAt:now});setMessage("Card existente atualizado para evitar duplicação.");}else{const card:Flashcard={id:makeId(),createdAt:now,updatedAt:now,subjectId,front:front.trim(),back:back.trim(),level:0,consecutiveCorrect:0,reviewCount:0,responseTimeTotalMs:0,responseTimeCount:0,nextReviewAt:now,archived:false};await flashcardRepository.save(card);setMessage("Flashcard criado e incluído na fila de revisão.");}setFront("");setBack("");reload();}
 function beginReview(card:Flashcard){setActiveId(card.id);setRevealed(false);setStartedAt(Date.now());}
 async function grade(remembered:boolean){if(!current)return;const now=nowIso();const result=reviewFlashcard(current,remembered,Math.max(0,Date.now()-startedAt),now);await flashcardRepository.save(result.card);await flashcardReviewRepository.save(result.review);setActiveId(undefined);setRevealed(false);setMessage(result.card.archived?"Card arquivado automaticamente após evidência consistente.":remembered?"Revisão registrada.":"Card voltou ao início da sequência de revisão.");reload();}
 const activeCards=cards.filter(c=>!c.archived);
 return <><Header eyebrow="ESTUDAR / REVISÕES" title="Revisões do dia" subtitle="Revise os conceitos que o sistema selecionou para você. Os flashcards ficam fora do ciclo de cadernos."/><div className="metric-grid"><Metric icon={<Brain/>} label="Cards ativos" value={String(activeCards.length)} detail="No seu acervo"/><Metric icon={<CalendarDays/>} label="Para revisar hoje" value={String(queue.length)} detail={"Limite diário de "+limit}/><Metric icon={<Check/>} label="Arquivados" value={String(cards.filter(c=>c.archived).length)} detail="Mantidos no histórico"/><Metric icon={<Target/>} label="Assuntos cobertos" value={String(new Set(cards.map(c=>c.subjectId)).size)} detail="Com flashcards"/></div>
 <div className="content-grid"><form className="panel form-panel" onSubmit={create}><h2>Novo flashcard</h2><label>Assunto de origem<select value={subjectId} onChange={e=>setSubjectId(e.target.value)} required><option value="">Selecione</option>{subjects.map(s=><option key={s.id} value={s.id}>{disciplines.find(d=>d.id===s.disciplineId)?.name} · {s.name}</option>)}</select></label><label>Pergunta<input value={front} onChange={e=>setFront(e.target.value)} placeholder="Uma pergunta direta, um conceito" required/></label><label>Resposta<textarea value={back} onChange={e=>setBack(e.target.value)} placeholder="Resposta curta e objetiva" required/></label><button className="button primary" disabled={!subjects.length}><Plus size={16}/> Criar flashcard</button>{!subjects.length&&<p className="muted-copy">Cadastre um assunto primeiro.</p>}</form>
 <div className="panel review-panel"><div className="panel-heading"><div><span className="eyebrow">FILA DIÁRIA</span><h2>Revisar agora</h2></div><span className="status-label success">{queue.length} / 30</span></div>{current?<><div className="review-card"><span className="eyebrow">PERGUNTA</span><h3>{current.front}</h3>{revealed?<div className="review-answer"><span className="eyebrow">RESPOSTA</span><p>{current.back}</p></div>:<button className="button secondary" onClick={()=>{setRevealed(true);setStartedAt(startedAt||Date.now());}}>Mostrar resposta</button>}</div>{revealed&&<div className="timer-actions"><button className="button secondary" onClick={()=>void grade(false)}>Não lembrei</button><button className="button primary" onClick={()=>void grade(true)}>Lembrei</button></div>}</>:<p className="muted-copy">Sua fila está vazia. Crie flashcards a partir de lacunas ou volte às questões para identificar novos conceitos.</p>}{message&&<p className="muted-copy" role="status">{message}</p>}</div></div>
 <div className="panel"><div className="panel-heading"><h2>Biblioteca de flashcards</h2><b>{cards.length}</b></div>{cards.length===0?<p className="muted-copy">Nenhum flashcard cadastrado.</p>:cards.map(card=><div className="diagnostic-row" key={card.id}><span className={card.archived?"diagnostic-dot green-dot":"diagnostic-dot blue-dot"}/><div><strong>{card.front}</strong><small>{subjects.find(s=>s.id===card.subjectId)?.name??"Assunto"} · {card.archived?"Arquivado":`${card.consecutiveCorrect} acertos consecutivos · próxima revisão ${new Date(card.nextReviewAt).toLocaleDateString("pt-BR")}`}</small></div>{!card.archived&&<button className="text-button" onClick={()=>beginReview(card)}>Revisar</button>}</div>)}</div>
 </>;
}
function HistoryPage({sessions,disciplines,notebooks}:{sessions:Session[];disciplines:Row[];notebooks:Row[]}){
 const total=sessions.reduce((a,s)=>a+s.durationSeconds,0);
 return <><Header eyebrow="ANÁLISE" title="Histórico de sessões" subtitle="Consulte o tempo investido e o desempenho que você registrou."/><div className="metric-grid"><Metric icon={<Clock3/>} label="Tempo total" value={fmt(total)} detail="Somatório registrado"/><Metric icon={<CalendarDays/>} label="Sessões" value={String(sessions.length)} detail="Registros salvos"/><Metric icon={<Target/>} label="Questões" value={String(sessions.reduce((a,s)=>a+s.questions,0))} detail="Questões registradas"/><Metric icon={<Check/>} label="Acertos" value={String(sessions.reduce((a,s)=>a+s.correct,0))} detail="Respostas corretas"/></div><div className="panel"><h2>Registros</h2>{sessions.length===0?<p className="muted-copy">Nenhuma sessão registrada ainda.</p>:sessions.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(s=><div className="diagnostic-row" key={s.id}><span className="diagnostic-dot green-dot"/><div><strong>{disciplines.find(d=>d.id===s.disciplineId)?.name??"Disciplina"} · {s.notebookIds&&s.notebookIds.length>1?"Vários cadernos":notebooks.find(n=>n.id===s.notebookId)?.name??"Caderno"}</strong><small>{new Date(s.date).toLocaleString("pt-BR")} · {fmt(s.durationSeconds)} · {s.questions} questões</small></div><b>{s.questions?Math.round(s.correct/s.questions*100)+"%":"—"}</b></div>)}</div></>;
}
function SettingsPage({dark,setDark,reviewLimit,setReviewLimit,reload}:{dark:boolean;setDark:(v:boolean)=>void;reviewLimit:number;setReviewLimit:(n:number)=>void;reload:()=>void}){
 const [message,setMessage]=useState("");
 async function exportData(){const disciplineRows=await disciplineRepository.list();const [disciplines,notebooks,subjects,notebookSubjects,dependencies,plans,planItems,sessions,sessionSegments,blocks,flashcards,flashcardReviews,theme,reviewLimit,activeStudySession,cycleSettings]=await Promise.all([Promise.resolve(disciplineRows),notebookRepository.list(),subjectRepository.list(),notebookSubjectRepository.list(),subjectDependencyRepository.list(),studyPlanRepository.list(),studyPlanItemRepository.list(),sessionRepository.list(),sessionSegmentRepository.list(),studyBlockRepository.list(),flashcardRepository.list(),flashcardReviewRepository.list(),settingsRepository.get("theme"),settingsRepository.get("reviewLimit"),settingsRepository.get("activeStudySession"),Promise.all(disciplineRows.map(async d=>({key:"studyCycle:"+d.id,value:await settingsRepository.get("studyCycle:"+d.id)})))]);const stamp=nowIso();const settings=[{key:"theme",value:theme??"light",updatedAt:stamp},{key:"reviewLimit",value:reviewLimit??30,updatedAt:stamp},...(activeStudySession?[{key:"activeStudySession",value:activeStudySession,updatedAt:stamp}]:[]),...cycleSettings.filter(x=>x.value).map(x=>({key:x.key,value:x.value,updatedAt:stamp}))];const payload={format:"estudosflix-backup",version:4,exportedAt:stamp,data:{disciplines,notebooks,subjects,notebookSubjects,dependencies,plans,planItems,sessions,sessionSegments,blocks,flashcards,flashcardReviews,settings}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="backup-estudosflix-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(url);setMessage("Backup exportado.");}
 async function importData(file?:File){
  if(!file)return;
  try{
   const payload=JSON.parse(await file.text()) as {format?:string;version?:number;data?:Record<string,unknown>};
   if(payload.format!=="estudosflix-backup"||![2,3,4].includes(payload.version??0)||!payload.data)throw new Error("Arquivo de backup inválido ou versão não compatível.");
   const keys=["disciplines","notebooks","subjects","notebookSubjects","dependencies","plans","planItems","sessions","sessionSegments","blocks","flashcards","flashcardReviews","settings"];
   const storeMap:Record<string,string>={disciplines:"disciplines",notebooks:"notebooks",subjects:"subjects",notebookSubjects:"notebookSubjects",dependencies:"subjectDependencies",plans:"studyPlans",planItems:"studyPlanItems",sessions:"sessions",sessionSegments:"sessionSegments",blocks:"studyBlocks",flashcards:"flashcards",flashcardReviews:"flashcardReviews",settings:"settings"};
   const normalized:Record<string,unknown[]>={};let count=0;
   for(const key of keys){const rows=payload.data[key]??[];if(!Array.isArray(rows))throw new Error("O backup contém uma lista inválida: "+key+".");for(const row of rows){if(!row||typeof row!=="object")throw new Error("Registro inválido no grupo "+key+".");const record=row as {id?:unknown;key?:unknown;createdAt?:unknown;updatedAt?:unknown};if(key==="settings"?typeof record.key!=="string"||typeof record.updatedAt!=="string":typeof record.id!=="string"||typeof record.createdAt!=="string"||typeof record.updatedAt!=="string")throw new Error("Registro inválido no grupo "+key+".");}normalized[storeMap[key]]=rows;count+=rows.length;}
   if(count===0)throw new Error("O backup não contém registros para importar.");
   const hasRef=(key:string,id:unknown)=>typeof id==="string"&&Boolean(normalized[storeMap[key]]?.some(row=>(row as {id?:string}).id===id));
   const checkRefs=(key:string,field:string,target:string)=>{for(const row of normalized[storeMap[key]]??[]){const id=(row as Record<string,unknown>)[field];if(id!==undefined&&id!==null&&!hasRef(target,id))throw new Error("Referência inválida em "+key+": "+field+".");}};
   checkRefs("notebooks","disciplineId","disciplines");checkRefs("subjects","disciplineId","disciplines");checkRefs("notebookSubjects","notebookId","notebooks");checkRefs("notebookSubjects","subjectId","subjects");
   checkRefs("dependencies","prerequisiteSubjectId","subjects");checkRefs("dependencies","dependentSubjectId","subjects");
   checkRefs("planItems","planId","plans");checkRefs("planItems","disciplineId","disciplines");
   checkRefs("sessions","disciplineId","disciplines");checkRefs("sessions","notebookId","notebooks");
   checkRefs("sessionSegments","sessionId","sessions");checkRefs("sessionSegments","subjectId","subjects");
   checkRefs("blocks","disciplineId","disciplines");checkRefs("blocks","notebookId","notebooks");
   checkRefs("flashcards","subjectId","subjects");checkRefs("flashcardReviews","flashcardId","flashcards");
   const preview=keys.map(key=>key+": "+(normalized[storeMap[key]]?.length??0)).join("\n");
   if(!confirm("Prévia do backup ("+count+" registros):\n"+preview+"\n\nA importação mescla os dados por identificador. Antes, será baixada uma cópia preventiva dos dados atuais. Continuar?"))return;
   await exportData();
   await importRecordsAtomically(normalized as DatabaseImportData);
   setMessage("Backup importado com sucesso. Os registros foram mesclados em uma única transação.");
   reload();
  }catch(e){setMessage(e instanceof Error?e.message:"Falha ao importar backup.");}
 }
 return <><Header eyebrow="SISTEMA" title="Configurações" subtitle="Ajuste a aparência e cuide dos seus dados locais."/><div className="content-grid"><div className="panel"><h2>Aparência</h2><p className="muted-copy">Escolha o tema que prefere utilizar.</p><button className="button secondary" onClick={()=>setDark(!dark)}>{dark?<Sun size={16}/>:<Moon size={16}/>} Ativar tema {dark?"claro":"escuro"}</button></div><div className="panel"><h2>Backup e restauração</h2><p className="muted-copy">Seus dados ficam neste navegador. Exporte um arquivo para transferir ou guardar uma cópia.</p><div className="recommend-actions"><button className="button primary" onClick={()=>void exportData()}><Download size={16}/> Baixar backup</button><label className="button secondary file-button"><Upload size={16}/> Importar<input type="file" accept="application/json,.json" onChange={e=>void importData(e.target.files?.[0])}/></label></div>{message&&<p className="muted-copy" role="status">{message}</p>}</div></div><div className="panel"><h2>Meta diária de flashcards</h2><p className="muted-copy">Ajuste o volume de revisões conforme seu ritmo.</p><select className="compact-select" value={reviewLimit} onChange={e=>{const value=Number(e.target.value);setReviewLimit(value);void settingsRepository.set("reviewLimit",value);}}><option value={20}>Iniciante · 20 por dia</option><option value={30}>Intermediário · 30 por dia</option><option value={50}>Avançado · 50 por dia</option></select></div><div className="panel"><h2>Privacidade</h2><p className="muted-copy">O EstudosFlix utiliza armazenamento local do navegador. Limpar os dados do site ou trocar de dispositivo pode apagar ou tornar indisponíveis seus registros. Mantenha backups atualizados.</p></div></>;
}
