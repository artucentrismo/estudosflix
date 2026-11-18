# EstudosFlix — Arquitetura Técnica

## Decisão arquitetural

O EstudosFlix será uma **única aplicação WebApp responsiva**, acessível por navegador em computadores, iPads e celulares. A instalação como PWA é opcional: o usuário pode abrir o endereço normalmente ou adicionar o sistema à tela inicial.

- React + TypeScript + Vite como aplicação compartilhada.
- PWA com manifest e service worker para instalação opcional e cache dos recursos.
- IndexedDB como persistência local em todos os navegadores/dispositivos.
- GitHub Pages como hospedagem estática gratuita, sem armazenar dados dos alunos.
- Nenhum backend, servidor de aplicação, banco remoto ou serviço de sincronização.
- Nenhuma versão nativa/desktop separada no MVP.

A primeira abertura exige internet para carregar o WebApp. Depois que os recursos forem armazenados pelo service worker, a aplicação poderá abrir offline. Dados e recursos essenciais devem ser testados em Safari/iPadOS, Chrome, Edge e navegadores móveis.

## Camadas

1. **Interface:** componentes React, navegação, formulários, responsividade e acessibilidade.
2. **Aplicação:** casos de uso (registrar sessão, recomendar estudo, revisar card, exportar/importar backup).
3. **Domínio:** entidades, validações e motores estatísticos/pedagógicos puros.
4. **Persistência:** repositórios sobre IndexedDB, com transações e migrações versionadas.
5. **PWA/plataforma web:** manifest, service worker, cache de arquivos e estratégia de atualização.

A interface não deve implementar fórmulas estatísticas. Ela solicita resultados ao domínio/camada de aplicação.

## Entidades principais

- Discipline
- Subject
- SubjectDependency
- StudyPlan / StudyPlanItem
- Notebook / NotebookSubject
- StudySession
- SessionSegment
- Exposure
- FlashcardConcept
- Flashcard
- FlashcardReview
- ReviewQueue
- AppSettings

## Persistência local

Definir contratos de repositório independentes da interface visual: DisciplineRepository, SubjectRepository, NotebookRepository, SessionRepository, FlashcardRepository e SettingsRepository. A camada de aplicação não deve acessar diretamente componentes da interface nem espalhar chamadas IndexedDB pelos componentes React.

No MVP, IndexedDB é a única persistência de dados de estudo em todos os dispositivos. Usar transações e versionamento de schema. Não depender de localStorage para dados de estudo; ele fica restrito a preferências simples quando necessário, como tema.

**Importante:** IndexedDB é local à origem e ao perfil do navegador. Portanto, iPad, celular e computador não compartilham dados automaticamente. Isso é intencional: não haverá conta online nem sincronização. A transferência entre dispositivos será manual por exportação e importação de backup.

O armazenamento do navegador pode estar sujeito a cotas e políticas do sistema operacional. A interface deve incentivar backups periódicos e nunca prometer que os dados locais são um arquivo permanente invulnerável.

## Backup e importação

O backup deve usar formato portátil e versionado (JSON estruturado ou pacote equivalente), independente do navegador. A exportação gera um arquivo local escolhido pelo usuário. A importação deve validar versão, estrutura e integridade, mostrar prévia e pedir confirmação; oferecer backup preventivo antes de substituir dados existentes.

Não enviar backups automaticamente a qualquer servidor. O usuário escolhe onde guardar e como transferir o arquivo.

## Regras de engenharia

- Cálculos puros, determinísticos e testáveis.
- Sem dependência de rede em runtime para funções já carregadas.
- Sem telemetria.
- Sem contas, nuvem ou sincronização automática.
- Migrações versionadas e seguras.
- Dados de demonstração separados dos dados reais.
- Acessibilidade por teclado, contraste, foco visível e leitores de tela.
- Layout adaptável a toque, retrato/paisagem, áreas seguras do iPad e teclado externo.
- Não depender de hover para revelar ações essenciais.

## Etapas de implementação

1. Especificação e arquitetura WebApp universal.
2. Núcleo React + TypeScript, layout responsivo, manifest e service worker.
3. Persistência IndexedDB e migrações.
4. Cadastros de disciplinas, assuntos, dependências e cadernos.
5. Registro de sessões e segmentos por assunto.
6. Motor de domínio, retenção, confiança e travas.
7. Motor REE e fila diária.
8. Painel, diagnóstico e relatórios.
9. Backup/importação manual entre dispositivos, configurações e polimento.
10. Testes em Safari no iPad, navegadores desktop e móveis, modo offline, acessibilidade e documentação de distribuição.

## Publicação

O repositório será publicado como site estático no GitHub Pages. Como o projeto usa o caminho `/estudosflix/`, a configuração de produção do Vite deve usar `base: "/estudosflix/"` e todos os caminhos do manifest/service worker precisam respeitar esse prefixo. GitHub Pages distribui apenas os arquivos da aplicação; os dados pessoais permanecem no navegador do usuário.
