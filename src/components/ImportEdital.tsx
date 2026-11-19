import { useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileUp, LoaderCircle, Upload } from "lucide-react";
import { parseEditalWorkbook, type EditalStructure } from "../domain/editalImport";
import { disciplineRepository, notebookRepository, notebookSubjectRepository, settingsRepository, subjectRepository } from "../storage/repositories";
import { reconcileStudyCycle, type StudyCycleProgress } from "../domain/studyCycles";

type ExistingRow = { id: string; name: string; disciplineId?: string; cycleOrder?: number };
type Props = { reload: () => void };
const clean = (value: string) => value.trim().toLocaleLowerCase("pt-BR");

export default function ImportEdital({ reload }: Props) {
  const [fileName, setFileName] = useState("");
  const [data, setData] = useState<EditalStructure | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function selectFile(file?: File) {
    setError(""); setMessage(""); setData(null);
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Envie a planilha Excel (.xlsx) preenchida com o modelo oficial do EstudosFlix.");
      return;
    }
    setBusy(true);
    try {
      const parsed = await parseEditalWorkbook(file);
      setData(parsed);
      if (!parsed.disciplines.length) setError("A aba Disciplinas está vazia. Preencha a planilha antes de importar.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível ler a planilha.");
    } finally { setBusy(false); }
  }

  async function importStructure() {
    if (!data || data.warnings.length || !data.disciplines.length) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const disciplineIds = new Map<string, string>();
      const notebookIds = new Map<string, string>();
      const currentDisciplines = await disciplineRepository.list() as ExistingRow[];
      const currentNotebooks = await notebookRepository.list() as ExistingRow[];
      const sortedDisciplines = [...data.disciplines].sort((a,b)=>a.order-b.order);
      for (const item of sortedDisciplines) {
        const existing = currentDisciplines.find(row => clean(row.name) === clean(item.name));
        const saved = existing ?? await disciplineRepository.save({
          name: item.name,
          notebooksPerPass: 4,
          durationMinutes: item.durationMinutes && item.durationMinutes >= 5 ? Math.round(item.durationMinutes / 5) * 5 : 15,
          generalOrder: currentDisciplines.length,
          editalReference: item.reference,
          description: item.description
        });
        disciplineIds.set(item.code, saved.id);
        if (!existing) currentDisciplines.push(saved as ExistingRow);
      }
      for (const item of data.notebooks) {
        const disciplineId = disciplineIds.get(item.disciplineCode)!;
        const existing = currentNotebooks.find(row => row.disciplineId === disciplineId && clean(row.name) === clean(item.name));
        const saved = existing ?? await notebookRepository.save({
          name: item.name, disciplineId,
          cycleOrder: currentNotebooks.filter(row => row.disciplineId === disciplineId).length,
          editalReference: item.reference, editalNotes: item.notes
        });
        notebookIds.set(item.code, saved.id);
        if (!existing) currentNotebooks.push(saved as ExistingRow);
      }
      for (const item of data.notebooks) {
        if (!item.parentCode) continue;
        const childId = notebookIds.get(item.code);
        const parentId = notebookIds.get(item.parentCode);
        if (childId && parentId && childId !== parentId) {
          const child = await notebookRepository.get(childId);
          if (child && !(child as ExistingRow & { parentId?: string }).parentId) {
            await notebookRepository.save({ ...child, parentId });
          }
        }
      }
      const existingSubjects = await subjectRepository.list() as ExistingRow[];
      const existingMappings = await notebookSubjectRepository.list() as Array<{id:string; notebookId:string; subjectId:string}>;
      let subjectsCreated = 0;
      for (const item of data.subjects) {
        const disciplineId = disciplineIds.get(item.disciplineCode)!;
        const notebookId = notebookIds.get(item.notebookCode)!;
        const duplicate = existingSubjects.find(subject => subject.disciplineId === disciplineId && clean(subject.name) === clean(item.name)
          && existingMappings.some(mapping => mapping.subjectId === subject.id && mapping.notebookId === notebookId));
        if (duplicate) continue;
        const description = [
          item.editalText ? "Texto do edital: " + item.editalText : "",
          item.details ? "Detalhamento: " + item.details : "",
          item.priority ? "Prioridade sugerida: " + item.priority : "",
          item.type ? "Tipo: " + item.type : "",
          item.reference ? "Referência: " + item.reference : "",
          item.notes ? "Observações: " + item.notes : ""
        ].filter(Boolean).join("\n");
        const subject = await subjectRepository.save({ name: item.name, description, disciplineId, editalCode: item.code, editalOrder: item.order });
        await notebookSubjectRepository.save({ notebookId, subjectId: subject.id });
        existingSubjects.push(subject as ExistingRow);
        existingMappings.push({ id: "", notebookId, subjectId: subject.id });
        subjectsCreated++;
      }
      for (const [code, disciplineId] of disciplineIds) {
        const ids = currentNotebooks.filter(notebook => notebook.disciplineId === disciplineId).sort((a,b)=>(a.cycleOrder??0)-(b.cycleOrder??0)).map(notebook => notebook.id);
        const savedCycle = await settingsRepository.get("studyCycle:" + disciplineId);
        await settingsRepository.set("studyCycle:" + disciplineId, reconcileStudyCycle(
          savedCycle && typeof savedCycle === "object" ? savedCycle as StudyCycleProgress : undefined,
          disciplineId, ids
        ));
      }
      setMessage("Importação concluída: " + disciplineIds.size + " disciplina(s), " + data.notebooks.length + " caderno(s) e " + subjectsCreated + " assunto(s) novo(s). Os dados foram salvos neste dispositivo.");
      setData(null); setFileName(""); reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A importação não foi concluída. Confira seus dados e tente novamente.");
    } finally { setBusy(false); }
  }

  return <section className="panel edital-import-panel">
    <div className="panel-heading">
      <div><span className="eyebrow">COMECE MAIS RÁPIDO</span><h2>Importar edital com ajuda da IA</h2></div>
      <span className="edital-import-icon"><FileSpreadsheet size={21}/></span>
    </div>
    <p className="muted-copy">Já usou o prompt EstudosFlix em uma IA e recebeu a planilha preenchida? Envie o arquivo Excel para cadastrar disciplinas, cadernos e assuntos de uma só vez.</p>
    <label className="button secondary file-button edital-upload-button"><FileUp size={16}/> {fileName || "Selecionar planilha preenchida"}<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={event=>void selectFile(event.target.files?.[0])}/></label>
    {busy&&<p className="muted-copy" role="status"><LoaderCircle size={15}/> Lendo e organizando os dados…</p>}
    {error&&<p className="edital-import-error" role="alert"><AlertCircle size={16}/>{error}</p>}
    {data&&<div className="edital-import-preview">
      <div className="edital-import-counts"><div><strong>{data.disciplines.length}</strong><small>Disciplinas</small></div><div><strong>{data.notebooks.length}</strong><small>Cadernos</small></div><div><strong>{data.subjects.length}</strong><small>Assuntos</small></div></div>
      {data.warnings.length>0&&<div className="edital-import-error"><AlertCircle size={16}/><div><strong>Corrija a planilha antes de importar:</strong>{data.warnings.map((warning,index)=><p key={index}>{warning}</p>)}</div></div>}
      {data.notebooks.some(item=>item.parentCode)&&<p className="muted-copy small-copy">A relação de subcadernos será preservada nos registros; o ciclo atual continuará exibindo todos os cadernos na sequência.</p>}
      <button type="button" className="button primary" disabled={busy||data.warnings.length>0||!data.disciplines.length} onClick={()=>void importStructure()}><Upload size={16}/> Importar estrutura para o EstudosFlix</button>
    </div>}
    {message&&<p className="edital-import-success" role="status"><CheckCircle2 size={16}/>{message}</p>}
    <small className="edital-import-footnote">A planilha é lida no próprio navegador. Os dados são gravados apenas neste dispositivo; a importação combina com sua estrutura atual e evita duplicar disciplinas/cadernos com o mesmo nome.</small>
  </section>;
}
