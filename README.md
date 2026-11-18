# EstudosFlix

**Seu GPS pedagógico para estudar por questões.**

O EstudosFlix é um **WebApp responsivo, gratuito e multiplataforma** para gerenciamento de estudos por questões. Funciona pelo navegador em computadores, iPads e celulares, sem exigir a instalação de um aplicativo específico. Pode ser adicionado à tela inicial como PWA para uma experiência semelhante à de um app.

O estudante resolve questões em plataformas externas e registra os resultados no EstudosFlix. O sistema organiza o conhecimento, acompanha o desempenho, identifica dificuldades e recomenda a próxima ação de estudo.

## Princípios
- Acessibilidade: abrir por um link em diferentes dispositivos e tamanhos de tela.
- Uma única aplicação web para computadores, iPads e celulares.
- Offline após o primeiro carregamento completo, por meio de cache da aplicação.
- Dados de estudo armazenados localmente no navegador, usando IndexedDB.
- Sem IA, APIs externas, nuvem, contas online ou telemetria.
- Sem sincronização automática entre dispositivos.
- Backup e importação manuais para quem desejar transferir os próprios dados.
- O aluno resolve questões em plataformas externas; o EstudosFlix não integra nem coleta dados dessas plataformas.

## Como funciona em cada dispositivo
O sistema é acessado pelo navegador. A pessoa pode usar o endereço diretamente ou, se preferir, adicionar o WebApp à tela inicial do iPad/celular ou criar um atalho no computador. A instalação é opcional.

Cada navegador/dispositivo mantém sua própria base local. Para levar os dados de um aparelho a outro, o usuário exporta um backup e importa o arquivo no outro dispositivo.

## Documentação
- [Especificação do produto v1.0](docs/ESPECIFICACAO-PRODUTO.md)
- [Arquitetura técnica](docs/ARQUITETURA-TECNICA.md)
- [Decisões e pontos de validação](docs/DECISOES-PENDENTES.md)
- [Requisitos pedagógicos do ciclo e dos blocos de 15 minutos](docs/requisitos-blocos-15-minutos.md)
- [UX estruturada v2.0](docs/UX-ESTUDOSFLIX-v2.md)

## Stack
React + TypeScript + Vite + PWA + IndexedDB. GitHub Pages pode hospedar os arquivos estáticos do WebApp; não hospeda dados pessoais.

## Estado do projeto

A versão publicada está na branch `main`. A evolução da experiência v2 está em desenvolvimento na branch `feature/cycle-first-ux` e será integrada somente após revisão e validação automatizada.

A proposta v2 reorganiza a experiência em quatro áreas principais: Início, Disciplinas, Revisões e Evolução. O ciclo contínuo de cadernos passa a ser o motor da recomendação: cada bloco tem 15 minutos em um caderno, enquanto uma passada só é concluída após percorrer todos os cadernos elegíveis da disciplina.

A branch v2 inclui o início da nova navegação, associação de assuntos dentro do cadastro de cadernos, ordenação dos cadernos, progresso persistente do ciclo, painel do próximo estudo, revisões fora do ciclo e centralização de evolução/histórico/diagnóstico.

Ainda precisam ser concluídos e validados os testes automatizados da branch, revisão dos fluxos de dados existentes e testes manuais em Safari/iPadOS e dispositivos móveis. A versão publicada não muda até a integração da nova branch.
