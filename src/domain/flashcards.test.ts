import { describe, expect, it } from "vitest";
import { calculateFlashcardPriority, reviewFlashcard, selectDailyReviewQueue, type Flashcard } from "./flashcards";

const card: Flashcard = {
  id: "card-1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  subjectId: "subject-1", front: "Pergunta", back: "Resposta", level: 0,
  consecutiveCorrect: 0, reviewCount: 0, responseTimeTotalMs: 0, responseTimeCount: 0,
  nextReviewAt: "2026-01-01T00:00:00.000Z", archived: false,
};

describe("flashcards REE", () => {
  it("avança o nível e agenda a próxima revisão quando lembrado", () => {
    const result = reviewFlashcard(card, true, 3000, "2026-01-01T00:00:00.000Z");
    expect(result.card.level).toBe(1);
    expect(result.card.consecutiveCorrect).toBe(1);
    expect(result.card.nextReviewAt).toBe("2026-01-04T00:00:00.000Z");
  });
  it("reinicia a sequência quando esquecido", () => {
    const result = reviewFlashcard({...card, level: 4, consecutiveCorrect: 3}, false, 9000, "2026-01-01T00:00:00.000Z");
    expect(result.card.level).toBe(0);
    expect(result.card.consecutiveCorrect).toBe(0);
  });
  it("arquiva após cinco acertos consecutivos com média abaixo de cinco segundos", () => {
    let current = card;
    for (let i=0;i<5;i++) current = reviewFlashcard(current, true, 1000, `2026-01-0${i+1}T00:00:00.000Z`).card;
    expect(current.archived).toBe(true);
  });
  it("seleciona apenas cards vencidos e respeita limite diário", () => {
    const due = {...card, id:"due"};
    const future = {...card, id:"future", nextReviewAt:"2027-01-01T00:00:00.000Z"};
    expect(selectDailyReviewQueue([due,future], new Date("2026-01-02T00:00:00.000Z"), 1).map(x=>x.id)).toEqual(["due"]);
  });
});
