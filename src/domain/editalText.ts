export type ParsedDiscipline = { name: string; notebooks: string[] };

const clean = (value: string) => value.trim().toLocaleLowerCase("pt-BR");

export function parseEditalText(text: string): { disciplines: ParsedDiscipline[]; errors: string[] } {
  const disciplines: ParsedDiscipline[] = [];
  const errors: string[] = [];
  let current: ParsedDiscipline | undefined;
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const discipline = line.match(/^disciplina\s*:\s*(.+)$/i);
    if (discipline) {
      const name = discipline[1].trim();
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
