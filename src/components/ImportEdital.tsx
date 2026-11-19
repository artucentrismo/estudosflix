import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardList, FileText, Sparkles, Trash2, Upload } from "lucide-react";
import { disciplineRepository, notebookRepository, settingsRepository } from "../storage/repositories";
import { reconcileStudyCycle, type StudyCycleProgress } from "../domain/studyCycles";
import { parseEditalText } from "../domain/editalText";

type ExistingRow = { id: string; name: string; disciplineId?: string; cycleOrder?: number };
type Props = { reload: () => void };
const clean = (value: string) => value.trim().toLocaleLowerCase("pt-BR");
const example = `disciplina: Matemática
caderno 01: Aritmética
caderno 02: Álgebra
caderno 03: Geometria
caderno 04: Estatística
caderno 05: Probabilidade

disciplina: Português
caderno 01: Interpretação de texto
caderno 02: Gramática
caderno 03: Literatura

disciplina: História
caderno 01: História do Brasil
caderno 02: História Geral`;

export default function ImportEdital({ reload }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseEditalText(text), [text]);
  const notebookCount = parsed.disciplines.reduce((total, item) => total + item.notebooks.length, 0);
  const canImport = parsed.disciplines.length > 0 && notebookCount > 0 && parsed.errors.length === 0 && !busy;

  function updateText(value: string) {
    setText(value);
    setError("");
    setMessage("");
  }

  async function importStructure() {
    if (!canImport) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const currentDisciplines = await disciplineRepository.list() as unknown as ExistingRow[];
      const currentNotebooks = await notebookRepository.list() as unknown as ExistingRow[];
      const disciplineIds = new Map<string, string>();
      const createdDisciplines: ExistingRow[] = [];
      const createdNotebooks: ExistingRow[] = [];
      for (const item of parsed.disciplines) {
        const existing = currentDisciplines.find(row => clean(row.name) === clean(item.name));
        const saved = existing ?? await disciplineRepository.save({
          name: item.name,
          notebooksPerPass: 4,
          durationMinutes: 15,
          generalOrder: currentDisciplines.length + createdDisciplines.length
        });
        disciplineIds.set(clean(item.name), saved.id);
        if (!existing) createdDisciplines.push(saved as unknown as ExistingRow);
      }
      for (const item of parsed.disciplines) {
        const disciplineId = disciplineIds.get(clean(item.name))!;
        for (const notebookName of item.notebooks) {
          const existing = currentNotebooks.find(row => row.disciplineId === disciplineId && clean(row.name) === clean(notebookName))
            ?? createdNotebooks.find(row => row.disciplineId === disciplineId && clean(row.name) === clean(notebookName));
          if (existing) continue;
          const saved = await notebookRepository.save({
            name: notebookName,
            disciplineId,
            cycleOrder: currentNotebooks.filter(row => row.disciplineId === disciplineId).length
              + createdNotebooks.filter(row => row.disciplineId === disciplineId).length
          });
          createdNotebooks.push(saved as unknown as ExistingRow);
        }
      }
      for (const disciplineId of disciplineIds.values()) {
        const ids = [...currentNotebooks, ...createdNotebooks]
          .filter(notebook => notebook.disciplineId === disciplineId)
          .sort((a, b) => (a.cycleOrder ?? 0) - (b.cycleOrder ?? 0))
          .map(notebook => notebook.id);
        const savedCycle = await settingsRepository.get("studyCycle:" + disciplineId);
        await settingsRepository.set("studyCycle:" + disciplineId, reconcileStudyCycle(
          savedCycle && typeof savedCycle === "object" ? savedCycle as StudyCycleProgress : undefined,
          disciplineId, ids
        ));
      }
      setMessage(`Importação concluída! ${createdDisciplines.length} disciplina(s) e ${createdNotebooks.length} caderno(s) novo(s) cadastrados. Itens que já existiam foram mantidos sem duplicação.`);
      setText("");
      reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a importação. Confira o texto e tente novamente.");
    } finally { setBusy(false); }
  }

  return <section className="panel edital-import-panel">
    <div className="panel-heading">
      <div><span className="eyebrow">COMECE MAIS RÁPIDO</span><h2>Organize seu edital com texto</h2></div>
      <span className="edital-import-icon"><FileText size={21}/></span>
    </div>
    <p className="muted-copy">Cole a estrutura do seu edital abaixo. O EstudosFlix identifica as disciplinas e cria os cadernos dentro de cada uma — sem planilhas, arquivos ou cadastro de assuntos.</p>

    <div className="edital-text-instructions">
      <div className="edital-instruction-title"><Sparkles size={16}/> Como preparar o texto</div>
      <p>Se usar uma IA para organizar o edital, peça que ela devolva somente neste formato:</p>
      <div className="edital-format-example">
        <code>disciplina: Matemática</code>
        <code>caderno 01: Aritmética</code>
        <code>caderno 02: Álgebra</code>
        <code className="edital-example-gap">disciplina: Português</code>
        <code>caderno 01: Gramática</code>
      </div>
      <button type="button" className="button secondary edital-example-button" onClick={() => updateText(example)}>
        <ClipboardList size={15}/> Preencher com exemplo completo
      </button>
    </div>

    <label className="edital-text-label" htmlFor="edital-text-input">Texto do edital
      <textarea id="edital-text-input" className="edital-textarea" value={text} onChange={event => updateText(event.target.value)} rows={12} spellCheck={false} placeholder={`disciplina: Matemática
caderno 01: Aritmética
caderno 02: Álgebra

disciplina: Português
caderno 01: Interpretação de texto
caderno 02: Gramática`} />
    </label>

    {text.trim() && <div className="edital-import-preview">
      <div className="edital-preview-heading"><strong>Prévia da importação</strong><span>{parsed.disciplines.length} disciplina(s) · {notebookCount} caderno(s)</span></div>
      {parsed.errors.length > 0 && <div className="edital-import-error"><AlertCircle size={16}/><div><strong>Há itens para corrigir:</strong>{parsed.errors.map((item, index) => <p key={index}>{item}</p>)}</div></div>}
      {parsed.disciplines.map(item => <div className="diagnostic-row" key={item.name}><span className="diagnostic-dot blue-dot"/><div><strong>{item.name}</strong><small>{item.notebooks.map((name, index) => `${String(index + 1).padStart(2, "0")} · ${name}`).join("  |  ") || "Nenhum caderno informado"}</small></div><b>{item.notebooks.length}</b></div>)}
      <div className="edital-import-actions">
        <button type="button" className="button secondary" disabled={busy} onClick={() => updateText("")}><Trash2 size={15}/> Limpar texto</button>
        <button type="button" className="button primary" disabled={!canImport} onClick={() => void importStructure()}><Upload size={16}/> {busy ? "Importando…" : "Confirmar e importar"}</button>
      </div>
    </div>}
    {error && <p className="edital-import-error" role="alert"><AlertCircle size={16}/>{error}</p>}
    {message && <p className="edital-import-success" role="status"><CheckCircle2 size={16}/>{message}</p>}
    <small className="edital-import-footnote">A importação combina com sua estrutura atual, preserva o que já existe e evita duplicar disciplinas e cadernos. Os dados ficam salvos apenas neste dispositivo.</small>
  </section>;
}
