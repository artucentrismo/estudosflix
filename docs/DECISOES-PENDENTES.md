# EstudosFlix — Registro de decisões e limitações

## Aprovado pela equipe

- WebApp responsivo acessível por navegador em computadores, iPads e celulares.
- PWA instalável opcionalmente; abrir pelo link não exige instalação.
- IndexedDB local em todos os dispositivos.
- Sem IA, APIs, nuvem, contas online, sincronização ou banco de questões.
- Sessão única com vários segmentos por assunto.
- Domínio baseado em desempenho atual, consistência e experiência, com teto implícito no desempenho atual.
- Retenção por exposições sucessivas.
- Trava apenas com evidência persistente.
- Bloqueio localizado aos dependentes.
- Flashcards via catálogo pedagógico e cadastro manual.
- Arquivamento após cinco acertos consecutivos e média inferior a cinco segundos.
- Reativação por novo erro associado ao conceito.
- Revisões limitadas e redistribuídas.
- UX progressiva e recomendação explicável.

## Decisões técnicas adotadas para o MVP

1. O segmento por assunto registra quantidade de questões e acertos reais; percentuais aproximados não serão usados para cálculo estatístico.
2. O domínio não pode superar o desempenho atual suavizado.
3. Retenção é proporção preservada entre exposições, não diferença aditiva.
4. Se o desempenho anterior for zero, não há percentual de retenção válido; mostrar evolução em pontos percentuais.
5. Confiança é exibida separadamente do indicador.
6. Dados insuficientes nunca equivalem a ausência de dificuldade.
7. A fila de revisão redistribui vagas críticas não utilizadas para moderadas e depois leves.
8. O índice de confiabilidade global proposto não será usado como bloqueio universal no MVP, pois misturaria sinais diferentes e poderia ocultar a causa da incerteza. Cada decisão usa sua própria confiança.

## Pontos para validação empírica futura

- Calibrar prior 5/5 e janela de 50 questões com dados reais.
- Avaliar se 30 questões e duas exposições são limiares adequados para trava.
- Validar o peso das dependências com avaliação pedagógica.
- Avaliar se as faixas de confiança de retenção precisam ser ajustadas.
- Revisar o limite diário de flashcards com dados de adesão.
- Validar se a fórmula de consistência (1 - DP/50) é adequada para exposições muito heterogêneas.

Os limiares são regras iniciais versionadas, não verdades universais. Não devem ser alterados sem registrar a justificativa e atualizar os testes.
\n\n## Decisão de produto: WebApp universal\n\nA experiência principal será uma única aplicação web responsiva. Não será mantida uma versão desktop nativa separada no MVP. A instalação PWA é opcional e serve apenas para facilitar o acesso; o endereço web continua sendo a porta principal de entrada. Cada navegador/dispositivo armazena seus próprios dados localmente no IndexedDB. A transferência entre aparelhos será feita por backup/importação manual.\n