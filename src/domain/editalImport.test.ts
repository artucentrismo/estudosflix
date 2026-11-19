import { describe, expect, it } from "vitest";
import { normalizeHeader } from "./editalImport";

describe("normalizeHeader", () => {
  it("remove acentos e normaliza caixa e pontuação", () => {
    expect(normalizeHeader("Código da disciplina")).toBe("codigo da disciplina");
    expect(normalizeHeader("Descrição / observações")).toBe("descricao observacoes");
    expect(normalizeHeader("  PÁGINA — Item do edital  ")).toBe("pagina item do edital");
  });
});
