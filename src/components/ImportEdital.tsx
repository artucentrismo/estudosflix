import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Upload } from "lucide-react";
import { disciplineRepository, notebookRepository, settingsRepository } from "../storage/repositories";
import { reconcileStudyCycle, type StudyCycleProgress } from "../domain/studyCycles";

type ExistingRow = { id: string; name: string; disciplineId?: string; cycleOrder?: number };
type Props = { reload: () => void };
type ParsedDiscipline = { name: string; notebooks: string[] };
const clean = (value: string) => value.trim().toLocaleLowerCase("pt-BR");

export function parseEditalText(text: string): { disciplines: ParsedDiscipline[]; errors: string[] } {
  const disciplines: ParsedDiscipline[] = [];
  const errors: string[] = [];
  let current: ParsedDiscipline | undefined;
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const discipline = line.match(/^disciplina\s*:\s*(.+)$/i);
    if (discipline) {
      const name = discipline[1].trim();
      if (!name) { errors.push(`Linha ${index + 1}: informe o nome da disciplina.`); current = undefined; return; }
      if (disciplines.some(item => clean(item.name) === clean(name))) {
        errors.push(`Linha ${index + 1}: a disciplina "${name}" está repetida.`);
        current = disciplines.find(item => clean(item.name) === clean(name));
        return;
      }
      current = { name, notebooks: [] };
      disciplines.push(current);
      return;
    }
    const notebook = line.match(/^caderno(?:\s*\d+)?\s*:\s*(.+)$/i);
    if (notebook) {
      if (!current) { errors.push(`Linha ${index + 1}: crie uma disciplina antes de listar cadernos.`); return; }
      const name = notebook[1].trim();
      if (!name) { errors.push(`Linha ${index + 1}: informe o nome do caderno.`); return; }
      if (current.notebooks.some(item => clean(item) === clean(name))) {
        errors.push(`Linha ${index + 1}: o caderno "${name}" está repetido na disciplina "${current.name}".`);
        return;
      }
      current.notebooks.push(name);
      return;
    }
    errors.push(`Linha ${index + 1}: formato não reconhecido. Use "disciplina: Nome" ou "caderno 01: Nome".`);
  });
  disciplines.forEach(item => {
    if (!item.notebooks.length) errors.push(`A disciplina "${item.name}" não possui nenhum caderno.`);
  });
  if (!disciplines.length && !errors.length) errors.push("Cole o edital organizado no formato indicado.");
  return { disciplines, errors };
}

export default function ImportEdital({ reload }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseEditalText(text), [text]);
  const notebookCount = parsed.disciplines.reduce((total, item) => total + item.notebooks.length, 0);

  async function importStructure() {
    if (!parsed.disciplines.length || parsed.errors.length) return;
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
        if (!existing) createdDisciplines.push(saved as ExistingRow);
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
          createdNotebooks.push(saved as ExistingRow);
        }
      }
      for (const [disciplineName, disciplineId] of disciplineIds) {
        const ids = [...currentNotebooks, ...createdNotebooks]
          .filter(notebook => notebook.disciplineId === disciplineId)
          .sort((a, b) => (a.cycleOrder ?? 0) - (b.cycleOrder ?? 0))
          .map(notebook => notebook.id);
        const savedCycle = await settingsRepository.get("studyCycle:" + disciplineId);
        await settingsRepository.set("studyCycle:" + disciplineId, reconcileStudyCycle(
          savedCycle && typeof savedCycle === "object" ? savedCycle as StudyCycleProgress : undefined,
          disciplineId, ids
        ));
        void disciplineName;
      }
      setMessage(`Importação concluída: ${parsed.disciplines.length} disciplina(s) e ${notebookCount} caderno(s) identificados. ${createdDisciplines.length} disciplina(s) e ${createdNotebooks.length} caderno(s) novo(s) foram cadastrados neste dispositivo.`);
      setText("");
      reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A importação não foi concluída. Confira o texto e tente novamente.");
    } finally { setBusy(false); }
  }

  return <section className="panel edital-import-panel">
    <div className="panel-heading">
      <div><span className="eyebrow">COMECE MAIS RÁPIDO</span><h2>Organizar edital por texto</h2></div>
      <span className="edital-import-icon"><FileText size={21}/></span>
    </div>
    <p className="muted-copy">Cole o texto com as disciplinas e seus cadernos. Não precisa baixar modelos, preencher planilhas ou separar assuntos.</p>
    <label className="edital-text-label">Texto do edital organizado
      <textarea className="edital-textarea" value={text} onChange={event => { setText(event.target.value); setError(""); setMessage(""); }} rows={12} spellCheck={false} placeholder={`disciplina: Matemática
caderno 01: Aritmética
caderno 02: Álgebra
caderno 03: Geometria

disciplina: Português
caderno 01: Interpretação de texto
caderno 02: Gramática
caderno 03: Literatura`} />
    </label>
    {text.trim() && <div className="edital-import-preview">
      <div className="edital-import-counts"><div><strong>{parsed.disciplines.length}</strong><small>Disciplinas</small></div><div><strong>{notebookCount}</strong><small>Cadernos</small></div></div>
      {parsed.errors.length > 0 && <div className="edital-import-error"><AlertCircle size={16}/><div><strong>Revise o texto:</strong>{parsed.errors.map((item, index) => <p key={index}>{item}</p>)}</div></div>}
      {parsed.disciplines.map(item => <div className="diagnostic-row" key={item.name}><span className="diagnostic-dot blue-dot"/><div><strong>{item.name}</strong><small>{item.notebooks.join(" · ") || "Nenhum caderno informado"}</small></div><b>{item.notebooks.length}</b></div>)}
      <button type="button" className="button primary" disabled={busy || parsed.errors.length > 0 || !parsed.disciplines.length} onClick={() => void importStructure()}><Upload size={16}/> {busy ? "Importando…" : "Importar disciplinas e cadernos"}</button>
    </div>}
    {error && <p className="edital-import-error" role="alert"><AlertCircle size={16}/>{error}</p>}
    {message && <p className="edital-import-success" role="status"><CheckCircle2 size={16}/>{message}</p>}
    <small className="edital-import-footnote">A importação combina com sua estrutura atual e evita duplicar disciplinas e cadernos com o mesmo nome. Os dados ficam salvos apenas neste dispositivo.</small>
  </section>;
}
