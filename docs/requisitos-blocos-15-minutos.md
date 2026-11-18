# Requisitos pedagógicos: ciclo de cadernos e blocos de 15 minutos

## Conceitos oficiais

- **Caderno:** unidade operacional do estudo dentro de uma disciplina. Pode conter um ou vários assuntos.
- **Bloco:** período de 15 minutos líquidos dedicado a um caderno.
- **Ciclo:** sequência ordenada dos cadernos elegíveis de uma disciplina.
- **Passada:** visita completa a todos os cadernos elegíveis do ciclo, uma vez.
- **Sessão:** período contínuo de estudo que pode conter vários blocos e até mais de uma passada.
- **Exposição válida:** evento de desempenho com questões; não deve ser confundido com bloco, ciclo ou passada.

## RF-CICLO-001 — Ciclo como motor da experiência

O aluno navega por Disciplina → Ciclo → Próximo Caderno → Estudo. O sistema determina o próximo caderno elegível e preserva a posição atual. A ordem do ciclo é configurável na organização dos cadernos e deve permanecer estável entre sessões.

## RF-BLOCO-015 — Bloco de 15 minutos

Cada caderno é estudado em blocos de 15 minutos líquidos. Ao concluir um bloco, o sistema salva o tempo e a posição e avança para o próximo caderno elegível do ciclo.

Um bloco concluído **não** significa que uma passada inteira foi concluída, exceto quando o ciclo possui apenas um caderno elegível.

## RF-CICLO-002 — Conclusão de passada

Uma passada só é contabilizada quando todos os cadernos elegíveis da disciplina tiverem recebido um bloco concluído naquela volta do ciclo. Ao completar o último caderno:
1. incrementar o contador de passadas concluídas;
2. registrar o ciclo completo;
3. reiniciar a posição no primeiro caderno elegível para a próxima passada.

Exemplo com quatro cadernos: 01 → 02 → 03 → 04 = uma passada completa. Estudar apenas 01, 02 e 03 representa 75% do ciclo, não uma passada concluída.

## RF-BLOCO-016 — Pausa e retomada

Se o aluno estudar 9 minutos no Caderno 03 e interromper:
- salvar os 9 minutos e a posição/última questão;
- manter o bloco parcial vinculado ao Caderno 03;
- ao retornar, oferecer os 6 minutos restantes;
- não avançar para o Caderno 04 antes de completar os 15 minutos do Caderno 03.

O bloco parcial não conta como bloco concluído e não avança o ciclo. A interrupção não descarta tempo nem posição.

## RF-CICLO-003 — Continuidade entre sessões

O ciclo nunca zera automaticamente por mudança de dia, fechamento do navegador ou encerramento de sessão. O aluno continua no próximo caderno pendente. A posição da questão é retomada no ponto salvo.

## RF-CICLO-004 — Cadernos elegíveis e pré-requisitos

A rotação percorre somente cadernos elegíveis. Bloqueios pedagógicos afetam os cadernos dependentes, nunca a disciplina inteira. Ausência de evidência não equivale a domínio saudável e não deve gerar bloqueio automático.

## RF-UX-001 — Interface centrada no aluno

O menu principal contém quatro áreas:
1. Início — próximo estudo, ciclo atual e revisões do dia.
2. Disciplinas — disciplinas e seus cadernos; assuntos são metadados internos associados aos cadernos.
3. Revisões — flashcards do dia, fora do ciclo.
4. Evolução — progresso, gargalos, recomendações e histórico integrado.

Assuntos, subassuntos, pré-requisitos, fórmulas, níveis de retenção e pontuações internas não devem virar áreas principais de navegação.

## RF-UX-002 — Central de Evolução

Histórico, relatórios e diagnósticos são unificados em uma única área chamada Evolução. Ela deve responder:
- Como estou indo?
- Onde estou errando?
- O que devo fazer agora?

## RF-UX-003 — Próxima ação

O painel inicial deve responder em poucos segundos qual disciplina, passada e caderno vêm a seguir, com tempo previsto de 15 minutos e uma ação clara para iniciar ou retomar.

## Métricas sem confusão

- Blocos concluídos: quantidade de cadernos que receberam 15 minutos líquidos.
- Passadas concluídas: voltas completas em todos os cadernos elegíveis de uma disciplina.
- Progresso do ciclo: proporção de cadernos concluídos na volta atual.
- Tempo líquido: tempo efetivamente investido em estudo.
- Questões/acertos/erros: indicadores complementares de desempenho.
- Exposições válidas: unidade usada nos cálculos estatísticos que dependem de evidência.

Passadas nunca substituem exposições válidas nas fórmulas de domínio, consistência ou retenção.

## Persistência

O sistema deve persistir:
- bloco atual, tempo acumulado, estado e posição/última questão;
- ordem dos cadernos por disciplina;
- posição atual do ciclo;
- contador de passadas completas;
- data da última atualização;
- progresso do ciclo e bloco parcial dentro do backup/exportação.

## Testes essenciais

- 9 + 6 minutos completam um bloco, sem perder posição.
- Um bloco de 15 minutos não completa uma passada quando há mais de um caderno elegível.
- Com quatro cadernos, o quarto bloco concluído fecha a primeira passada.
- A próxima passada começa no primeiro caderno elegível.
- Reordenar cadernos mantém a posição atual sempre que possível.
- Remover ou bloquear um caderno reconcilia o ciclo sem apagar o histórico.
- Fechar e reabrir o navegador preserva o bloco e a posição do ciclo.
