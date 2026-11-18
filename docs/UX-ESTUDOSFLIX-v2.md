# UX Estruturada — EstudosFlix v3.0

## Princípio central

O EstudosFlix reduz o esforço de planejamento e sempre apresenta um próximo passo possível. Metas de tempo orientam, mas nunca criam atraso, dívida ou punição.

## Navegação principal

1. **Início** — matéria atual, próximo caderno, progresso do ciclo de cadernos, tempo já investido na matéria e revisões do dia.
2. **Disciplinas** — área de configuração: cadastrar/editar matérias, definir tempo recomendado individual e cadastrar/editar/reordenar cadernos.
3. **Ciclo** — visualização somente leitura do ciclo geral por matéria e da sequência de cadernos dentro de cada matéria.
4. **Revisões** — flashcards vinculados diretamente ao caderno, fora do ciclo.
5. **Evolução** — domínio, retenção, confiança, questões, passadas, tendência, gargalos, flashcards e histórico.

Configurações permanecem como acesso secundário.

## Modelo de dados e interface

- Disciplina agrupa cadernos e possui tempo recomendado personalizado em minutos.
- Caderno é a unidade operacional e estatística primária. Tem identificador permanente, nome, posição de exibição e indicadores de aprendizagem.
- Ciclo não é uma entidade de cadastro. É uma visualização derivada das disciplinas, dos tempos recomendados e da ordem dos cadernos.
- Flashcards pertencem ao caderno.
- Assuntos e estruturas legadas podem permanecer no armazenamento para compatibilidade, mas não devem aparecer na experiência principal nem ser exigidos para cadastrar ou estudar um caderno.

## Ciclo geral por matéria

O ciclo geral trabalha em blocos por matéria, respeitando o tempo recomendado individual de cada disciplina. Exemplo: Constitucional 60 minutos e Português 60 minutos.

- O sistema acumula somente o tempo real estudado na matéria atual.
- Ao atingir o tempo recomendado daquela matéria, avança para a próxima matéria cadastrada com cadernos.
- Se o estudante parar antes de atingir o tempo, a matéria permanece como ponto de continuidade.
- Ao concluir a última matéria, inicia uma nova volta geral.
- Alterar o tempo recomendado afeta o planejamento futuro, não apaga histórico.
- Não há obrigação diária, atraso acumulado ou compensação de tempo.

## Ciclo de cadernos e passadas

- Cada disciplina possui uma sequência ordenada de cadernos ativos.
- A posição é apenas a ordem de visitação; o identificador permanente do caderno preserva métricas e histórico.
- Uma visita válida acontece ao completar um bloco de 15 minutos ou ao encerrar manualmente a atividade daquele caderno.
- Pausar ou interromper involuntariamente preserva o bloco parcial e não registra uma visita concluída.
- A passada termina quando todos os cadernos ativos da disciplina foram visitados pelo menos uma vez desde a passada anterior.
- O tempo de 15 minutos não é requisito para concluir a passada se o estudante encerrar manualmente a atividade.
- Ao concluir a passada, registrar data inicial/final, cadernos percorridos e incrementar o contador; a próxima volta começa pelo primeiro caderno ativo.
- Reordenar ou adicionar/remover cadernos reconcilia o ciclo por IDs, sem apagar domínio, retenção, questões, flashcards ou histórico.

## Disciplinas

Cadastro simples:
- Nome da matéria.
- Tempo recomendado (minutos), personalizado por matéria.

Cadastro de caderno:
- Disciplina.
- Nome do caderno.
- Numeração automática conforme a ordem.

A área Disciplinas também permite editar nomes, reordenar as matérias do ciclo geral e reordenar cadernos por controles acessíveis de mover para cima/baixo. A aba Ciclo apenas visualiza.

## Revisões

- Todo flashcard novo deve ter um caderno de origem.
- Ao registrar questão, o estudante informa: Acertei com certeza, Acertei no chute, Acertei com dúvida ou Errei.
- Para chute, dúvida ou erro, pode registrar frente e verso do flashcard, que será criado automaticamente ao finalizar a sessão.
- Acerto com certeza não gera flashcard automaticamente.
- Cards legados sem vínculo inequívoco com um caderno continuam preservados e identificados como legados; não atribuir origem por suposição.

## Evolução e estatística

O caderno é a unidade primária para domínio, retenção, confiança, tendência, gargalos e flashcards. A disciplina consolida os resultados por média ponderada pelo número de questões respondidas.

Confiança da amostra:
- Menos de 20 questões: insuficiente.
- 20–49: baixa.
- 50–99: média.
- 100 ou mais: alta.

Limite de domínio exibido:
- Menos de 20 questões: no máximo 70%.
- 20–49: no máximo 85%.
- 50 ou mais: até 100%.

Não classificar domínio com base em amostras pequenas. Ausência de evidência não significa domínio.

## Privacidade e operação

Aplicação estática em GitHub Pages, React + TypeScript + Vite, armazenamento local IndexedDB, sem contas online, APIs pagas, nuvem, sincronização ou telemetria. Backup/importação manuais incluem ciclos geral e por disciplina.

## Responsividade

Suportar desktop, iPad em retrato/paisagem e celular. Controles acessíveis por toque, teclado e leitor de tela; nenhuma função pode depender de hover.
