# EstudosFlix — Arquitetura Técnica

## Decisão arquitetural

Aplicativo desktop offline:
- Tauri 2 para empacotamento desktop e acesso nativo.
- React + TypeScript + Vite para interface.
- Rust para serviços locais e regras críticas.
- SQLite como banco de dados local.
- Migrações SQL versionadas.
- Testes unitários para cálculos e regras de domínio.

Nenhum servidor é necessário para executar o aplicativo.

## Camadas

1. **Interface:** componentes React, navegação, formulários e acessibilidade.
2. **Aplicação:** casos de uso (registrar sessão, recomendar estudo, revisar card, exportar backup).
3. **Domínio:** entidades, validações e motores estatísticos/pedagógicos puros.
4. **Persistência:** repositórios SQLite e migrações.
5. **Desktop:** comandos Tauri para operações locais e diálogos de arquivo.

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

1. Especificação e arquitetura.
2. Esqueleto Tauri + React + SQLite e migrações.
3. Cadastros de disciplinas, assuntos, dependências e cadernos.
4. Registro de sessões e segmentos.
5. Motor de domínio, retenção, confiança e travas.
6. Motor REE e fila diária.
7. Painel, diagnóstico e relatórios.
8. Backup/importação, configurações e polimento.
9. Testes de integração, build desktop e documentação de distribuição.
