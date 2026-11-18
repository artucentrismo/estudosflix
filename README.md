# EstudosFlix

**Seu GPS pedagógico para estudar por questões.**

O EstudosFlix é um aplicativo desktop, local e offline que transforma registros de questões em recomendações de estudo, diagnóstico de dificuldades e revisão ativa.

## Princípios
- 100% local e offline.
- Banco SQLite no dispositivo.
- Sem IA, APIs externas, nuvem ou telemetria.
- O aluno resolve questões em plataformas externas e registra os resultados.
- O sistema orienta o que estudar, quando avançar e quais assuntos precisam de reforço.

## Documentação
- [Especificação do produto v1.0](docs/ESPECIFICACAO-PRODUTO.md)
- [Arquitetura técnica](docs/ARQUITETURA-TECNICA.md)
- [Decisões e pontos de validação](docs/DECISOES-PENDENTES.md)

## Stack planejada
Tauri 2 + React + TypeScript + Rust + SQLite.

## Estado do projeto
Fundação documental criada. Próximo marco: esqueleto desktop e primeira versão navegável; depois, persistência SQLite e motores pedagógicos testados.

## Privacidade
Os dados de estudo ficam no dispositivo do usuário. O GitHub armazena apenas o código-fonte e a documentação do projeto.
