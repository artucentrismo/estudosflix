# EstudosFlix — Especificação do Produto v1.0

## 1. Visão do produto

O EstudosFlix é um WebApp responsivo, gratuito e multiplataforma para gerenciamento de estudos por questões, acessível pelo navegador em computadores, iPads e celulares. A instalação como PWA é opcional; o usuário pode abrir o link normalmente ou adicionar o sistema à tela inicial. O estudante resolve questões em plataformas externas e registra os resultados no aplicativo. O sistema organiza o conhecimento, acompanha o desempenho, identifica dificuldades e recomenda a próxima ação de estudo.

**Promessa:** responder com clareza “o que devo estudar agora?” sem transformar o gerenciamento do estudo em mais uma tarefa pesada.

### Fora do escopo
- Banco de questões próprio.
- Videoaulas, cursos ou explicações geradas.
- Inteligência artificial ou modelos de linguagem.
- APIs, integrações, sincronização ou serviços em nuvem.
- Contas online ou armazenamento remoto.

GitHub serve apenas para versionamento e distribuição do código. Dados pessoais e acadêmicos permanecem no dispositivo.

## 2. Princípios inegociáveis
1. Offline por padrão: todas as funções essenciais operam sem internet.
2. Privacidade local: dados do aluno ficam no IndexedDB do navegador/dispositivo.
3. Sem IA: nenhuma pergunta, resposta ou explicação pode ser inventada pelo sistema.
4. Evidência antes de conclusão: dados insuficientes nunca viram domínio, retenção ou trava confirmados.
5. Recomendação explicável: toda recomendação apresenta um motivo em linguagem simples.
6. Questões no centro: flashcards corrigem lacunas, mas não substituem a prática.
7. Baixa carga cognitiva: interface mostra decisões e progresso, não fórmulas internas.

## 3. Arquitetura de conhecimento

Hierarquia:
- Disciplina
- Assunto
- Subassunto

As dependências são relações direcionadas entre assuntos, com intensidade:
- Crítica: 1,0
- Forte: 0,7
- Moderada: 0,4
- Fraca: 0,2

Trilhas seguem uma sequência pedagógica cadastrada, não apenas frequência de cobrança em provas.

## 4. Sessões de estudo

Uma sessão representa um período de estudo do aluno e pode conter vários assuntos.

Dados da sessão:
- data/hora;
- disciplina;
- caderno opcional;
- duração em minutos;
- plataforma de origem opcional (registro informativo, sem integração);
- observações opcionais.

Cada segmento da sessão registra:
- assunto;
- quantidade de questões;
- quantidade de acertos;
- erros derivados automaticamente.

A soma das questões dos segmentos deve corresponder ao total da sessão. O formulário é único e progressivo. Para não sacrificar a qualidade estatística, cada assunto precisa ter sua própria quantidade de questões e acertos; a interface deve usar cartões compactos expansíveis, não uma planilha.

Dificuldades sinalizadas:
- errei conceitos;
- acertei no chute;
- acertei sem segurança.

## 5. Domínio

### 5.1 Desempenho atual (DA)

Usar as últimas 50 questões do assunto; se houver menos, usar todas.

Estimativa suavizada de Laplace/Bayes com prior neutro 5/5:

DA = (A + 5) / (Q + 10)

A = acertos na janela; Q = questões na janela.

### 5.2 Consistência (C)

Calcular o desvio-padrão populacional dos percentuais de acerto por exposição válida.

Consistência bruta:
C_bruta = clamp(1 - DP/50, 0, 1)

Confiabilidade por número de exposições:
FC = min(1, (n - 1)/4)

Consistência ajustada:
C = C_bruta × FC + 0,5 × (1 - FC)

Assim, com apenas duas exposições, a consistência é parcialmente aproximada do neutro (50%).

### 5.3 Experiência por exposições (P)

P = 1 - exp(-n/5), onde n é o número de exposições válidas.

### 5.4 Domínio final

F = 0,6 × C + 0,4 × P

Domínio = DA × (0,7 + 0,3 × F)

Todos os componentes são normalizados entre 0 e 1. A fórmula garante que consistência e experiência não elevem o domínio acima do desempenho atual.

### 5.5 Confiança do domínio

Faixas iniciais:
- Menos de 20 questões: dados insuficientes; não exibir percentual como conclusão.
- 20–49: baixa confiança.
- 50–99: confiança moderada.
- 100 ou mais: confiança alta.

A amostra recente (até 50 questões) e o histórico acumulado devem ser apresentados separadamente internamente. O percentual suavizado não elimina a necessidade de mostrar a confiança.

### 5.6 Progressão
Avançar quando domínio ≥75%, não houver trava confirmada no caminho e houver evidência suficiente para a decisão.

Assunto dominado: domínio ≥80%, retenção ≥80% e ausência de erro recente.

## 6. Retenção

Retenção mede a proporção do desempenho preservado entre exposições sucessivas válidas. Não usa janelas fixas de 30/60/90 dias.

Para exposições consecutivas:
- desempenho anterior = R_ant;
- desempenho atual = R_atual;
- retenção do par = (R_atual / R_ant) × 100, limitada a 0–100 para o indicador de preservação.

Se R_ant = 0, não calcular percentual: apresentar evolução em pontos percentuais e “base anterior insuficiente para calcular retenção”.

Peso do par = mínimo entre a quantidade de questões das duas exposições.

Retenção final = média ponderada dos pares válidos. Exposições com menos de 10 questões não entram no cálculo. Confiança:
- soma dos pesos <10: insuficiente;
- 10–20: baixa;
- 20–50: média;
- acima de 50: alta.

A primeira exposição não possui retenção. A interface apresenta “Ainda não há comparação possível”. A retenção deve ser exibida com linguagem simples (Excelente, Boa, Atenção, Em queda) e pode oferecer percentual com indicação de confiança.

## 7. Travas e pré-requisitos

Uma dificuldade persistente só pode ser confirmada quando todos os critérios forem atendidos:
- pelo menos 30 questões recentes;
- desempenho recente inferior a 60%;
- evidência em pelo menos duas exposições distintas.

Uma trava afeta apenas os caminhos dependentes, nunca a disciplina inteira.

Índice de bloqueio:
IB = (100 - domínio_do_pré_requisito) × fator_da_dependência

Faixas:
- abaixo de 20: sem ação;
- 20–39: alerta;
- 40–59: atenção forte;
- 60 ou mais: candidato a bloqueio.

O bloqueio efetivo exige também confiança suficiente (30 questões e duas exposições). Sem evidência, o estado é “dados insuficientes”, não “liberado por domínio”. O diagnóstico deve explicar qual pré-requisito precisa ser reforçado.

Erro recente: erro em uma das últimas 20 questões do assunto OU erro na última exposição.

## 8. Flashcards e revisão REE

A nomenclatura visível é sempre **Flashcards**.

### Origens
1. Catálogo pedagógico local, criado e revisado por especialista.
2. Cadastro manual pelo estudante.

Quando um erro é associado a um conceito, procurar primeiro o card do catálogo. Se existir, associá-lo ao baralho do estudante. Não duplicar o mesmo conceito. Se não existir, permitir criação manual.

Cada card contém pergunta, resposta, conceito/assunto de origem, origem, estado, acertos consecutivos, histórico de revisões e próxima revisão.

### Arquivamento
Arquivar quando:
- pelo menos cinco acertos consecutivos;
- tempo médio de resposta inferior a cinco segundos.

Não exigir período adicional de 15 dias. Arquivar, nunca excluir automaticamente.

Se uma questão posterior gerar novo erro associado ao conceito, reativar o card automaticamente.

### Prioridade
Todos os componentes ficam na escala 0–100:
- recorrência de erros: erros/tentativas nas últimas 30 ocorrências × 100;
- atraso: min(100, dias_atrasados/prazo × 100);
- esquecimento: 100 × (1 - exp(-dias_desde_último_acerto/15));
- prioridade = 0,5 × recorrência + 0,3 × atraso + 0,2 × esquecimento.

### Limite e redistribuição
Limites de perfil: iniciante 20, intermediário 30, avançado 50 cards/dia. A fila diária nunca ultrapassa o limite. Meta inicial de distribuição: 50% críticos, 30% moderados, 20% leves. Vagas ociosas passam sucessivamente para a faixa imediatamente inferior. Pendências permanecem na fila e são reavaliadas diariamente; nunca são apagadas.

Flashcards são auxiliares. O painel deve incentivar retorno às questões quando o volume de revisões superar o de questões na semana.

## 9. Próximo estudo

Ordem operacional:
1. Trava pedagógica confirmada no caminho atual.
2. Revisões prioritárias do dia, respeitando o limite.
3. Continuar caderno aberto.
4. Próximo assunto liberado quando domínio ≥75%.
5. Reforçar assunto mais fraco quando não houver progressão possível.

Se a amostra for insuficiente, recomendar coleta de dados por meio de questões, sem afirmar domínio.

O card principal mostra uma única recomendação e um motivo expansível (“Por que essa recomendação?”).

## 10. Navegação

- Painel
- Estudar
  - Próximo estudo
  - Registrar sessão
  - Revisões
- Planejamento
  - Plano de Estudos
  - Disciplinas e Trilhas
  - Cadernos
- Análise
  - Diagnóstico
  - Relatórios
- Sistema
  - Configurações

## 11. Painel

Exibir apenas:
- domínio;
- retenção;
- travas;
- revisões do dia;
- próxima ação recomendada;
- progresso da trilha;
- atividade recente.

A ação principal é “Iniciar estudo”. O motivo da recomendação fica disponível sem expor fórmulas.

## 12. Design system

Identidade: educacional premium, limpa, focada e não gamer.

Tema claro:
- background #F8FAFC;
- surface #FFFFFF;
- surface secundária #F1F5F9;
- borda #E2E8F0;
- primary #12355B;
- primary hover #0D2B47;
- success #2E8B57;
- warning #D97706;
- danger #DC2626;
- texto #0F172A / #1E293B / #475569 / #64748B.

Tema escuro:
- background #0B1220;
- surface #111827;
- surface elevada #1E293B;
- borda #334155;
- primary #4F8CFF;
- success #4ADE80;
- warning #FBBF24;
- danger #F87171;
- texto #F8FAFC / #E2E8F0 / #CBD5E1 / #94A3B8.

Estados obrigatórios: vazio, carregamento, sucesso, erro, confirmação, baixa confiança e dados insuficientes. Tema claro/escuro deve ser totalmente funcional.

## 13. Compatibilidade multiplataforma

A aplicação é um WebApp responsivo, acessível pelo navegador em computadores, iPads e celulares. A instalação como PWA é opcional. Deve suportar orientação retrato e paisagem, toque, áreas seguras do iPad, teclado externo e layouts sem hover obrigatório. O service worker disponibiliza os arquivos da aplicação offline após a primeira carga completa.

Todos os dispositivos usam a mesma aplicação web e IndexedDB como armazenamento local. As regras de domínio e cálculos são independentes do dispositivo. O armazenamento é local à origem e ao perfil do navegador: cada aparelho mantém seus próprios dados, sem conta online e sem sincronização automática. A transferência ocorre manualmente por exportação e importação de backup.

## 14. Privacidade, backup e dados

- Dados armazenados localmente no IndexedDB do navegador/dispositivo.
- Backup exportado pelo usuário para arquivo local.
- Importação com validação de versão e integridade antes de substituir/restaurar dados.
- Nenhum dado pessoal é enviado ao GitHub.
- Sem telemetria remota.

## 15. Critérios de aceite do MVP

1. Criar disciplinas, assuntos, subassuntos e dependências.
2. Criar cadernos e organizar assuntos em sequência.
3. Registrar uma sessão com vários assuntos e desempenho separado.
4. Calcular domínio, retenção e confiança com testes automatizados.
5. Detectar travas sem falso positivo por sessão isolada.
6. Bloquear apenas dependentes de pré-requisitos afetados.
7. Criar e revisar flashcards do catálogo ou manuais.
8. Arquivar e reativar cards pelas regras aprovadas.
9. Respeitar limite e redistribuição de revisões.
10. Gerar recomendação explicável de próximo estudo.
11. Exibir diagnóstico e relatórios locais.
12. Exportar/importar backup local.
13. Funcionar sem conexão com a internet após o primeiro carregamento completo.
14. Ser utilizável em iPad, em retrato e paisagem, com interação por toque.
15. Permitir instalação como PWA e manter os dados locais após fechar/reabrir.
16. Não incluir IA, APIs externas, contas online, sincronização ou serviços em nuvem.
