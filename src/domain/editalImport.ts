export type SheetRow = Record<string, string>;
export type EditalStructure = {
  disciplines: Array<{ code: string; name: string; order: number; durationMinutes?: number; description: string; reference: string }>;
  notebooks: Array<{ code: string; disciplineCode: string; name: string; order: number; parentCode: string; notes: string; reference: string }>;
  subjects: Array<{ code: string; disciplineCode: string; notebookCode: string; order: number; name: string; editalText: string; details: string; priority: string; type: string; reference: string; notes: string }>;
  warnings: string[];
};
const decoder = new TextDecoder();
function normalizePath(path: string) {
  const parts: string[] = [];
  for (const part of path.replace(/^\//, "").split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}
async function unzipXlsx(file: File): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("O arquivo não parece ser uma planilha .xlsx válida.");
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const files = new Map<string, Uint8Array>();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("Estrutura interna do Excel inválida.");
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    let content: Uint8Array;
    if (method === 0) content = compressed;
    else if (method === 8) {
      if (typeof DecompressionStream === "undefined") throw new Error("Seu navegador não oferece suporte à leitura de arquivos Excel. Tente exportar as abas como CSV.");
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat));
      content = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error("A planilha usa um tipo de compactação não compatível.");
    files.set(normalizePath(name), content);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}
function parseXml(bytes: Uint8Array, name: string): Document {
  const xml = new DOMParser().parseFromString(decoder.decode(bytes), "application/xml");
  if (xml.querySelector("parsererror")) throw new Error("Não foi possível ler a estrutura XML da planilha (" + name + ").");
  return xml;
}
function colIndex(reference: string): number {
  const letters = reference.replace(/[0-9]/g, "");
  let result = 0;
  for (const char of letters) result = result * 26 + char.charCodeAt(0) - 64;
  return result - 1;
}
function textContent(node: Element | null): string {
  return node?.textContent?.trim() ?? "";
}
function readSheet(xml: Document, shared: string[]): string[][] {
  const rows: string[][] = [];
  for (const row of Array.from(xml.getElementsByTagName("row"))) {
    const rowIndex = Math.max(0, Number(row.getAttribute("r") ?? "1") - 1);
    const cells: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName("c"))) {
      const index = colIndex(cell.getAttribute("r") ?? "A1");
      const type = cell.getAttribute("t");
      let value = textContent(cell.getElementsByTagName("v")[0] ?? null);
      if (type === "s") value = shared[Number(value)] ?? "";
      else if (type === "inlineStr") value = Array.from(cell.getElementsByTagName("t")).map(t => t.textContent ?? "").join("");
      cells[index] = value;
    }
    rows[rowIndex] = cells;
  }
  return rows;
}
function rowsAsObjects(rows: string[][]): SheetRow[] {
  const headers = (rows[3] ?? []).map(value => value.trim());
  return rows.slice(4).map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))).filter(row => Object.values(row).some(value => value.trim()));
}
function num(value: string, fallback: number): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}
export async function parseEditalWorkbook(file: File): Promise<EditalStructure> {
  const zip = await unzipXlsx(file);
  const workbookBytes = zip.get("xl/workbook.xml");
  const relBytes = zip.get("xl/_rels/workbook.xml.rels");
  if (!workbookBytes || !relBytes) throw new Error("Não encontrei as abas da planilha. Use o modelo oficial do EstudosFlix.");
  const workbook = parseXml(workbookBytes, "workbook");
  const rels = parseXml(relBytes, "relationships");
  const relationTargets = new Map<string, string>();
  for (const rel of Array.from(rels.getElementsByTagName("Relationship"))) {
    relationTargets.set(rel.getAttribute("Id") ?? "", normalizePath("xl/" + (rel.getAttribute("Target") ?? "")));
  }
  const sharedBytes = zip.get("xl/sharedStrings.xml");
  const shared = sharedBytes ? Array.from(parseXml(sharedBytes, "sharedStrings").getElementsByTagName("si")).map(si => Array.from(si.getElementsByTagName("t")).map(t => t.textContent ?? "").join("")) : [];
  const sheets = new Map<string, string[][]>();
  for (const sheet of Array.from(workbook.getElementsByTagName("sheet"))) {
    const name = sheet.getAttribute("name") ?? "";
    const relationId = sheet.getAttribute("r:id") ?? sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") ?? "";
    const target = relationTargets.get(relationId);
    const content = target ? zip.get(target) : undefined;
    if (content) sheets.set(name, readSheet(parseXml(content, name), shared));
  }
  const required = ["Disciplinas", "Cadernos", "Assuntos"];
  const missing = required.filter(name => !sheets.has(name));
  if (missing.length) throw new Error("A planilha está sem estas abas obrigatórias: " + missing.join(", ") + ". Use o modelo oficial.");
  const dRows = rowsAsObjects(sheets.get("Disciplinas")!);
  const nRows = rowsAsObjects(sheets.get("Cadernos")!);
  const aRows = rowsAsObjects(sheets.get("Assuntos")!);
  const disciplines = dRows.map(row => ({
    code: row["Código da disciplina"].trim(), name: row["Nome da disciplina"].trim(), order: num(row["Ordem"], 9999),
    durationMinutes: num(row["Tempo recomendado (min)"], 0) || undefined,
    description: row["Descrição / observações"].trim(), reference: row["Referência no edital"].trim()
  })).filter(row => row.code && row.name);
  const notebooks = nRows.map(row => ({
    code: row["Código do caderno"].trim(), disciplineCode: row["Código da disciplina"].trim(), name: row["Nome do caderno"].trim(),
    order: num(row["Ordem"], 9999), parentCode: row["Código do caderno pai (opcional)"].trim(),
    notes: row["Observações"].trim(), reference: row["Referência no edital"].trim()
  })).filter(row => row.code && row.disciplineCode && row.name);
  const subjects = aRows.map(row => ({
    code: row["Código do assunto"].trim(), disciplineCode: row["Código da disciplina"].trim(), notebookCode: row["Código do caderno"].trim(),
    order: num(row["Ordem"], 9999), name: row["Assunto organizado"].trim(), editalText: row["Texto do edital (fiel)"].trim(),
    details: row["Detalhamento / subtópicos"].trim(), priority: row["Prioridade sugerida"].trim(), type: row["Tipo"].trim(),
    reference: row["Página / item do edital"].trim(), notes: row["Observações"].trim()
  })).filter(row => row.code && row.disciplineCode && row.notebookCode && row.name);
  const warnings: string[] = [];
  if (!disciplines.length) warnings.push("Nenhuma disciplina preenchida.");
  const disciplineCodes = new Set(disciplines.map(row => row.code));
  const notebookCodes = new Set(notebooks.map(row => row.code));
  if (disciplineCodes.size !== disciplines.length) warnings.push("Há códigos de disciplina repetidos.");
  if (notebookCodes.size !== notebooks.length) warnings.push("Há códigos de caderno repetidos.");
  if (new Set(subjects.map(row => row.code)).size !== subjects.length) warnings.push("Há códigos de assunto repetidos.");
  const unknownDiscipline = notebooks.filter(row => !disciplineCodes.has(row.disciplineCode));
  if (unknownDiscipline.length) warnings.push(unknownDiscipline.length + " caderno(s) apontam para códigos de disciplina inexistentes.");
  const invalidSubjects = subjects.filter(row => !disciplineCodes.has(row.disciplineCode) || !notebookCodes.has(row.notebookCode));
  if (invalidSubjects.length) warnings.push(invalidSubjects.length + " assunto(s) apontam para códigos de disciplina/caderno inexistentes.");
  const invalidParent = notebooks.filter(row => row.parentCode && !notebookCodes.has(row.parentCode));
  if (invalidParent.length) warnings.push(invalidParent.length + " subcaderno(s) apontam para cadernos-pai inexistentes.");
  return { disciplines: disciplines.sort((a,b)=>a.order-b.order), notebooks: notebooks.sort((a,b)=>a.order-b.order), subjects: subjects.sort((a,b)=>a.order-b.order), warnings };
}
