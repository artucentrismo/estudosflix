import { describe, expect, it } from "vitest";
import { parseEditalText } from "./editalText";

describe("importador de edital por texto", () => {
  it("organiza várias disciplinas e quantidades diferentes de cadernos", () => {
    const result = parseEditalText(`disciplina: Matemática
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
caderno 02: História Geral`);
    expect(result.errors).toEqual([]);
    expect(result.disciplines).toHaveLength(3);
    expect(result.disciplines.map(item => item.notebooks.length)).toEqual([5, 3, 2]);
  });

  it("aceita espaços e numeração opcional no rótulo do caderno", () => {
    const result = parseEditalText(" disciplina : Física \n\n Caderno: Mecânica \n caderno 12: Óptica ");
    expect(result.errors).toEqual([]);
    expect(result.disciplines[0].notebooks).toEqual(["Mecânica", "Óptica"]);
  });

  it("aponta caderno sem disciplina e linhas fora do padrão", () => {
    const result = parseEditalText("caderno 01: Álgebra\nlinha inválida");
    expect(result.errors).toHaveLength(2);
  });

  it("impede disciplinas e cadernos duplicados", () => {
    const result = parseEditalText("disciplina: Matemática\ncaderno 01: Álgebra\ncaderno 02: Álgebra");
    expect(result.errors.some(error => error.includes("repetido"))).toBe(true);
  });
});
