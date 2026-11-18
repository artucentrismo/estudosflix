# EstudosFlix — Arquitetura Técnica

## Decisão arquitetural

Aplicação multiplataforma offline-first:
- React + TypeScript + Vite como interface compartilhada.
- PWA instalável para iPadOS/Safari e navegadores desktop.
- Service worker para cache dos recursos da aplicação e abertura offline após a primeira carga.
- IndexedDB como persistência local no navegador/iPad.
- Tauri 2 + Rust + SQLite como opção de empacotamento desktop, usando a mesma camada de domínio.
- Adaptadores de persistência por plataforma, com contratos comuns.
- Migrações versionadas em cada adaptador.
- Testes unitários para cálculos e regras de domínio.

Nenhum servidor de aplicação é necessário. GitHub Pages pode hospedar os arquivos estáticos da PWA; os dados dos alunos não são enviados ao Pages.

## Camadas

1. **Interface:** componentes React, navegação, formulários e acessibilidade.
2. **Aplicação:** casos de uso (registrar sessão, recomendar estudo, revisar card, exportar backup).
3. **Domínio:** entidades, validações e motores estatísticos/pedagógicos puros.
4. **Persistência:** interface de repositórios e adaptadores IndexedDB (web/iPad) e SQLite (desktop), com migrações.
5. **Plataforma:** service worker e manifest PWA no navegador; comandos Tauri e diálogos nativos no desktop.

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

## Persistência multiplataforma

Definir contratos de repositório independentes da tecnologia: DisciplineRepository, SubjectRepository, NotebookRepository, SessionRepository, FlashcardRepository e SettingsRepository. A camada de aplicação não pode importar diretamente APIs do IndexedDB, rusqlite ou comandos Tauri.

No navegador/iPad, usar IndexedDB com transações e versionamento de schema. Não depender de localStorage para dados de estudo; localStorage fica restrito a preferências simples como tema. No desktop, SQLite continua sendo o armazenamento primário.

O backup deve usar um formato portátil versionado (JSON estruturado ou pacote equivalente), validado antes da importação e independente do banco de origem. A importação deve oferecer prévia e confirmação, com opção de backup preventivo.

## Modelo relacional inicial

### disciplines
id, name, description, position, created_at, updated_at.

### subjects
id, discipline_id, parent_subject_id nullable, name, description, position, active.

### subject_dependencies
id, prerequisite_subject_id, dependent_subject_id, strength, created_at.
UNIQUE(prerequisite_subject_id, dependent_subject_id); impedir dependência circular.

### notebooks
id, discipline_id, name, description, status, position.

### notebook_subjects
id, notebook_id, subject_id, position.

### study_sessions
id, started_at, duration_minutes, discipline_id, notebook_id nullable, source_label nullable, notes nullable.

### session_segments
id, session_id, subject_id, questions, correct_answers, difficulty_flags_json.
CHECK questions > 0; CHECK correct_answers BETWEEN 0 AND questions.

### exposures
id, subject_id, session_segment_id, exposure_number, questions, correct_answers, exposed_at.
Uma exposição válida deriva de um segmento de sessão; não duplicar contagem.

### flashcard_concepts
id, subject_id, concept_key, name, catalog_question, catalog_answer, catalog_version, active.
O catálogo é conteúdo editorial local, nunca gerado automaticamente.

### flashcards
id, concept_id nullable, subject_id, front, back, origin, status, consecutive_correct, created_at, archived_at nullable.

### flashcard_reviews
id, flashcard_id, reviewed_at, result, response_time_ms.

### app_settings
key, value_json.

Histórico de cálculo deve ser reproduzível a partir das sessões/exposições. Evitar armazenar métricas derivadas como fonte de verdade.

## Integridade e segurança

- Foreign keys habilitadas.
- Transações para registrar sessão e segmentos atomicamente.
- Validação de limites no Rust e no banco.
- Datas armazenadas em UTC ISO-8601; interface apresenta horário local.
- Backup por SQLite online backup ou cópia consistente, com validação antes da importação.
- Importação nunca sobrescreve o banco atual sem confirmação e backup preventivo.

## Regras de engenharia

- Cálculos puros, determinísticos e testáveis.
- Sem dependência de rede em runtime.
- Sem telemetria.
- Sem sincronização.
- Migrações reversíveis quando possível.
- Dados de demonstração separados dos dados reais.
- Acessibilidade por teclado, contraste e foco visível.

## Etapas de implementação

1. Especificação e arquitetura multiplataforma.
2. Núcleo React + TypeScript, PWA responsiva, manifest e service worker.
3. Persistência IndexedDB e migrações para web/iPad.
4. Adaptador SQLite/Tauri para desktop, preservando o mesmo domínio.
5. Cadastros de disciplinas, assuntos, dependências e cadernos.
6. Registro de sessões e segmentos.
7. Motor de domínio, retenção, confiança e travas.
8. Motor REE e fila diária.
9. Painel, diagnóstico e relatórios.
10. Backup/importação entre plataformas, configurações e polimento.
11. Testes em Safari no iPad, navegadores desktop, modo offline, build desktop e documentação de distribuição.
