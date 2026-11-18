# Requisito pedagógico: blocos de estudo de 15 minutos

## Regra estrutural

A unidade operacional do método Kyrla/Tata no EstudosFlix é o bloco de 15 minutos em um caderno. A quantidade de questões e a conclusão do caderno não determinam a duração da passada.

- 1 passada concluída = 15 minutos líquidos acumulados no mesmo caderno.
- Uma sessão pode conter várias passadas.
- Uma passada incompleta permanece como bloco em andamento/pausado e não conta como passada concluída.
- O aluno pode interromper e retornar quando puder; o tempo acumulado e a posição são preservados.
- O próximo caderno só é liberado após a conclusão dos 15 minutos do bloco atual.
- O sistema não deve pressionar o aluno a concluir um caderno em uma única sessão.

## Retomada

Exemplo: o aluno estudou 9 minutos no Caderno 03 e precisou sair. O sistema salva 9 minutos e a última questão/posição. Na próxima visita, retoma o mesmo bloco e o mesmo caderno, com 6 minutos restantes. Ao completar 15 minutos, registra a passada e permite avançar.

## Planejamento e rotação

A quantidade planejada de blocos é floor(tempo disponível em minutos / 15). Isso representa blocos, não quantidade de cadernos cadastrados.

A rotação percorre os cadernos elegíveis da disciplina em sequência circular. Ao chegar ao último, a próxima sessão pode retornar ao primeiro caderno elegível, respeitando as regras de progressão e eventuais bloqueios pedagógicos.

## Persistência mínima do bloco

Cada bloco precisa preservar identificador, disciplina, caderno, segundos acumulados, estado (in_progress, paused ou completed), data de início, última atualização, posição/última questão e data de conclusão quando concluído.

## Indicadores

Indicadores primários: blocos concluídos, tempo líquido, cadernos visitados e passadas realizadas. Questões, acertos e erros permanecem como indicadores complementares de desempenho por assunto.

## Separação estatística

Passadas, exposições válidas e questões são entidades distintas. O número de passadas não substitui o número de exposições nas fórmulas de domínio, consistência ou retenção. A avaliação de desempenho continua baseada em questões e exposições válidas.

## Implementação inicial

- src/domain/studyBlocks.ts: regras puras de tempo, pausa, retomada, conclusão e rotação.
- src/storage/database.ts: store persistente studyBlocks (schema v2).
- src/storage/repositories.ts: studyBlockRepository.
- src/domain/studyBlocks.test.ts: testes das regras de 9 + 6 minutos, conclusão, limites e rotação.

A interface e o fluxo completo de cronômetro/registro ainda precisam consumir essas regras e persistir o bloco durante o uso real.
