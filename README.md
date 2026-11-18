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

## Stack
React + TypeScript + Vite + PWA + IndexedDB. GitHub Pages pode hospedar os arquivos estáticos do WebApp; não hospeda dados pessoais.

## Estado do projeto
A fundação documental e o esqueleto inicial estão em desenvolvimento. A arquitetura foi simplificada para uma única aplicação web responsiva, com IndexedDB em todos os dispositivos. Manifest, service worker, persistência web completa, fluxos pedagógicos e validação em navegadores reais ainda precisam ser implementados/testados.

## Privacidade
Os dados de estudo ficam no armazenamento local do navegador/dispositivo. Não existe sincronização automática: cada dispositivo mantém seus próprios dados. A transferência é feita manualmente por backup e importação. O GitHub armazena apenas o código-fonte e a documentação do projeto.
