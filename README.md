# EstudosFlix

**Seu GPS pedagógico para estudar por questões.**

O EstudosFlix é um aplicativo multiplataforma, local e offline que transforma registros de questões em recomendações de estudo, diagnóstico de dificuldades e revisão ativa. A experiência principal será uma PWA instalável em computadores e iPads, com opção de versão desktop.

## Princípios
- 100% local e offline após a primeira carga/instalação.
- Compatível com iPad e computadores.
- Banco SQLite no dispositivo.
- Sem IA, APIs externas, nuvem ou telemetria.
- O aluno resolve questões em plataformas externas e registra os resultados.
- O sistema orienta o que estudar, quando avançar e quais assuntos precisam de reforço.

## Documentação
- [Especificação do produto v1.0](docs/ESPECIFICACAO-PRODUTO.md)
- [Arquitetura técnica](docs/ARQUITETURA-TECNICA.md)
- [Decisões e pontos de validação](docs/DECISOES-PENDENTES.md)

## Stack planejada
React + TypeScript + Vite + PWA + IndexedDB para web/iPad; Tauri 2 + Rust + SQLite como empacotamento desktop opcional.

## Estado do projeto
Fundação documental e esqueleto inicial criados. A arquitetura está sendo ajustada para PWA multiplataforma, IndexedDB no iPad/web e SQLite no desktop. Painel e primeiros cálculos são demonstrativos/em desenvolvimento; CRUD completo, fluxos pedagógicos, persistência web e validação de build ainda estão pendentes.

## Privacidade
Os dados de estudo ficam no dispositivo do usuário. Não há sincronização automática entre iPad e computador no MVP; a transferência será por backup/importação. O GitHub armazena apenas o código-fonte e a documentação do projeto.
