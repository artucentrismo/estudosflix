import { useEffect, useState } from "react";\nimport type { ReactNode } from "react";
import {
  Activity, ArrowRight, BookOpen, Brain, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleAlert, Clock3, Compass, GraduationCap, LayoutDashboard,
  Moon, PanelLeftClose, Plus, Settings2, ShieldCheck, Sun, Target, TrendingUp,
  TriangleAlert, Upload, Download, Library, Search, Sparkles
} from "lucide-react";

type Section = "Painel" | "Próximo estudo" | "Registrar sessão" | "Revisões" | "Plano de Estudos" | "Disciplinas e Trilhas" | "Cadernos" | "Diagnóstico" | "Relatórios" | "Configurações";

const menu: { group: string; items: { label: Section; icon: typeof LayoutDashboard }[] }[] = [
  { group: "VISÃO GERAL", items: [{ label: "Painel", icon: LayoutDashboard }] },
  { group: "ESTUDAR", items: [{ label: "Próximo estudo", icon: Compass }, { label: "Registrar sessão", icon: Plus }, { label: "Revisões", icon: Brain }] },
  { group: "PLANEJAMENTO", items: [{ label: "Plano de Estudos", icon: CalendarDays }, { label: "Disciplinas e Trilhas", icon: GraduationCap }, { label: "Cadernos", icon: Library }] },
  { group: "ANÁLISE", items: [{ label: "Diagnóstico", icon: Activity }, { label: "Relatórios", icon: TrendingUp }] },
  { group: "SISTEMA", items: [{ label: "Configurações", icon: Settings2 }] },
];

function App() {
  const [section, setSection] = useState<Section>("Painel");
  const [dark, setDark] = useState(() => localStorage.getItem("estudosflix-theme") !== "light");
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("estudosflix-theme", dark ? "dark" : "light");
  }, [dark]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><GraduationCap size={21}/></div><div><strong>EstudosFlix</strong><small>GPS PEDAGÓGICO</small></div></div>
      <div className="profile-switch"><div className="avatar">A</div><div className="profile-copy"><strong>Meu espaço</strong><small>Perfil local</small></div><ChevronDown size={15}/></div>
      <nav className="navigation">
        {menu.map(group => <div className="nav-group" key={group.group}><p>{group.group}</p>{group.items.map(item => {
          const Icon = item.icon;
          return <button key={item.label} className={section === item.label ? "nav-item active" : "nav-item"} onClick={() => setSection(item.label)}><Icon size={17}/><span>{item.label}</span>{section === item.label && <span className="active-dot"/>}</button>;
        })}</div>)}
      </nav>
      <div className="sidebar-bottom"><div className="offline"><span/> Operando localmente</div><button className="theme-toggle" onClick={() => setDark(v => !v)}>{dark ? <Sun size={16}/> : <Moon size={16}/>} {dark ? "Tema claro" : "Tema escuro"}</button><small className="version">EstudosFlix · versão inicial</small></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>EstudosFlix</span><ChevronRight size={14}/><strong>{section}</strong></div><div className="top-actions"><span className="local-pill"><ShieldCheck size={14}/> Dados neste dispositivo</span><button className="icon-button" aria-label="Pesquisar"><Search size={18}/></button><div className="avatar small">A</div></div></header>
      {section === "Painel" ? <Dashboard onNavigate={setSection} expanded={expanded} setExpanded={setExpanded}/> : <Placeholder section={section} onNavigate={setSection}/>} 
    </main>
  </div>;
}

function Dashboard({ onNavigate, expanded, setExpanded }: { onNavigate: (s: Section) => void; expanded: boolean; setExpanded: (v: boolean) => void }) {
  return <div className="page-content">
    <div className="welcome-row"><div><div className="eyebrow">{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date()).toUpperCase()}</div><h1>Bom estudo! <span>👋</span></h1><p>Pequenos avanços consistentes constroem grandes resultados.</p></div><button className="button secondary" onClick={() => onNavigate("Registrar sessão")}><Plus size={16}/> Registrar sessão</button></div>
    <div className="demo-notice"><Sparkles size={15}/><span>Prévia da interface — os números abaixo são demonstrativos e ainda não representam dados salvos.</span></div>
    <section className="metric-grid">
      <Metric icon={<Target size={18}/>} label="Domínio geral" value="72%" detail="Confiança moderada" tone="blue" progress={72}/>
      <Metric icon={<Brain size={18}/>} label="Retenção" value="Boa" detail="Desempenho preservado" tone="green"/>
      <Metric icon={<TriangleAlert size={18}/>} label="Assuntos travados" value="1" detail="Em 1 caminho de estudo" tone="amber"/>
      <Metric icon={<CalendarDays size={18}/>} label="Revisões de hoje" value="12" detail="Dentro da sua meta diária" tone="violet"/>
    </section>
    <section className="content-grid">
      <div className="panel recommendation">
        <div className="panel-heading"><div><span className="eyebrow">SUA PRÓXIMA AÇÃO</span><h2>Próximo estudo recomendado</h2></div><span className="recommend-icon"><Compass size={19}/></span></div>
        <div className="recommend-body"><span className="tag">DIREITO CONSTITUCIONAL</span><h3>Aplicabilidade das Normas Constitucionais</h3><p>Caderno 03 · Assunto 06</p><div className="recommend-reason"><div className="reason-icon"><CircleAlert size={16}/></div><div><strong>Por que estudar este assunto?</strong><p>Existe uma dificuldade em um pré-requisito deste conteúdo. Reforçá-lo ajuda a avançar com segurança.</p></div></div><div className="recommend-actions"><button className="button primary" onClick={() => onNavigate("Próximo estudo")}>Iniciar estudo <ArrowRight size={16}/></button><button className="text-button" onClick={() => setExpanded(!expanded)}>{expanded ? "Ocultar motivo" : "Por que essa recomendação?"}</button></div>{expanded && <div className="expanded-reason">A recomendação considera as travas confirmadas, o caderno em andamento, a progressão da trilha e a confiança dos dados. Nenhum cálculo é inferido quando a amostra é insuficiente.</div>}</div>
      </div>
      <div className="panel today-panel"><div className="panel-heading"><div><span className="eyebrow">ROTINA DE HOJE</span><h2>Seu ritmo</h2></div><Clock3 size={19} className="muted-icon"/></div><div className="today-stat"><div><strong>12</strong><span>revisões previstas</span></div><div className="today-progress"><div><span style={{width:"40%"}}/></div><small>5 de 12 concluídas</small></div></div><div className="divider"/><div className="today-row"><span className="mini-icon blue"><BookOpen size={16}/></span><div><strong>Questões na semana</strong><small>Seu histórico de prática</small></div><b>86</b></div><div className="today-row"><span className="mini-icon green"><Check size={16}/></span><div><strong>Sessões registradas</strong><small>Consistência de estudo</small></div><b>4</b></div><button className="button full secondary" onClick={() => onNavigate("Revisões")}>Revisar agora <ArrowRight size={15}/></button></div>
    </section>
    <section className="bottom-grid">
      <div className="panel"><div className="panel-heading"><div><span className="eyebrow">PLANEJAMENTO</span><h2>Progresso da trilha</h2></div><button className="text-button" onClick={() => onNavigate("Plano de Estudos")}>Ver plano <ArrowRight size={14}/></button></div><div className="trail-title"><div className="trail-symbol"><GraduationCap size={18}/></div><div><strong>Direito Constitucional</strong><small>8 assuntos na trilha atual</small></div><span className="trail-percent">62%</span></div><div className="trail-bar"><span style={{width:"62%"}}/></div><div className="trail-foot"><span>5 de 8 assuntos concluídos</span><span>3 restantes</span></div></div>
      <div className="panel"><div className="panel-heading"><div><span className="eyebrow">ATENÇÃO</span><h2>Diagnóstico</h2></div><TriangleAlert size={19} className="muted-icon"/></div><div className="diagnostic-row"><span className="diagnostic-dot amber-dot"/><div><strong>Constitucionalismo</strong><small>Pré-requisito com dificuldade persistente</small></div><span className="status-label warning">Atenção</span></div><div className="diagnostic-row"><span className="diagnostic-dot green-dot"/><div><strong>Direitos Fundamentais</strong><small>Desempenho consistente</small></div><span className="status-label success">Saudável</span></div><button className="text-button diagnostic-link" onClick={() => onNavigate("Diagnóstico")}>Abrir diagnóstico completo <ArrowRight size={14}/></button></div>
    </section>
    <footer className="page-footer">EstudosFlix · Menos tempo organizando, mais tempo aprendendo.</footer>
  </div>;
}

function Metric({ icon, label, value, detail, tone, progress }: { icon: ReactNode; label: string; value: string; detail: string; tone: string; progress?: number }) {
  return <div className="metric-card"><div className="metric-top"><span className={"metric-icon "+tone}>{icon}</span><span>{label}</span></div><div className="metric-value">{value}</div><div className="metric-detail">{detail}</div>{progress !== undefined && <div className="metric-progress"><span style={{width:progress+"%"}}/></div>}</div>;
}

function Placeholder({ section, onNavigate }: { section: Section; onNavigate: (s: Section) => void }) {
  const descriptions: Record<Section,string> = {
    "Próximo estudo":"A recomendação pedagógica e o caminho sugerido para sua próxima sessão.",
    "Registrar sessão":"Registre uma sessão única e distribua questões e acertos entre os assuntos estudados.",
    "Revisões":"Revise os flashcards selecionados para hoje, respeitando sua meta diária.",
    "Plano de Estudos":"Acompanhe a sequência de aprendizagem e os critérios para avançar.",
    "Disciplinas e Trilhas":"Organize disciplinas, assuntos, subassuntos e pré-requisitos.",
    "Cadernos":"Agrupe assuntos em cadernos que respeitam a sequência pedagógica.",
    "Diagnóstico":"Entenda o que está bem, o que precisa de reforço e o que está bloqueando seu avanço.",
    "Relatórios":"Acompanhe desempenho, consistência, retenção e evolução por assunto.",
    "Configurações":"Preferências locais, aparência, backup e importação de dados.",
    "Painel":""
  };
  return <div className="page-content subpage"><div className="eyebrow">ESTUDOSFLIX / {section.toUpperCase()}</div><h1>{section}</h1><p className="subpage-intro">{descriptions[section]}</p><div className="panel coming-panel"><div className="coming-icon"><PanelLeftClose size={24}/></div><h2>Esta área está sendo construída</h2><p>A estrutura funcional será implementada por etapas, mantendo os dados locais e as regras pedagógicas aprovadas.</p><button className="button primary" onClick={() => onNavigate("Painel")}>Voltar ao painel</button></div></div>;
}

export default App;