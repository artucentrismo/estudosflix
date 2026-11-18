# UX Estruturada — EstudosFlix v2.0

## Princípio central

O aluno não deve gastar energia entendendo a estrutura interna do sistema. O EstudosFlix recomenda o próximo passo; o aluno executa o estudo.

## Navegação principal

O menu principal contém somente quatro áreas:

1. **Início** — próximo estudo, ciclo atual, revisões do dia e resumo recente.
2. **Disciplinas** — disciplinas e seus cadernos, com ordem do ciclo e associação de assuntos no cadastro do caderno.
3. **Revisões** — flashcards do dia, fora do ciclo de cadernos.
4. **Evolução** — progresso geral, evolução por disciplina, gargalos, recomendações e histórico integrado.

Configurações ficam acessíveis como ação secundária, fora da navegação principal.

## Modelo mental

O aluno segue:

Início → Próximo Caderno → Estudo de 15 minutos → Próximo Caderno → Evolução.

O sistema mantém internamente assuntos, subassuntos, dependências, pré-requisitos, fórmulas, fatores de domínio, retenção, confiança e pesos estatísticos. Essas entidades não devem criar áreas independentes no menu.

## Ciclo e passada

- Cada disciplina possui um ciclo ordenado de cadernos elegíveis.
- Cada bloco corresponde a 15 minutos líquidos em um caderno.
- Uma passada corresponde a visitar todos os cadernos elegíveis uma vez.
- O progresso e a posição do ciclo persistem entre sessões e dias.
- O ciclo não reinicia automaticamente.
- O aluno retoma um bloco parcial no mesmo caderno e na mesma posição.
- A conclusão do bloco avança para o próximo caderno; a conclusão do último caderno fecha a passada.

## Início

A tela inicial deve responder em menos de três segundos: “O que faço agora?”. O card dominante mostra disciplina, passada atual, próximo caderno, progresso do ciclo, tempo previsto e ação para iniciar ou retomar. Revisões do dia aparecem em uma área secundária claramente separada.

## Disciplinas

O aluno vê disciplinas e cadernos. O cadastro do caderno permite associar um ou mais assuntos, que permanecem como metadados internos. A ordem dos cadernos define a sequência do ciclo. O sistema usa essa ordem para recomendar o próximo caderno.

## Revisões

Flashcards ficam fora do ciclo. O sistema organiza a fila diária; a interface não exibe intervalos, algoritmos, estágios ou níveis internos.

## Evolução

Histórico, relatórios e diagnósticos formam uma única central. Ela deve responder:
- Como estou indo?
- Onde estou errando?
- O que faço agora?

A tela integra resumo, evolução por disciplina, gargalos, recomendações e histórico de sessões.

## Hierarquia visual

1. Próxima ação.
2. Progresso.
3. Problemas e recomendações.
4. Dados históricos.

Informações que não ajudam a iniciar o próximo estudo, entender a evolução ou corrigir uma dificuldade não devem ocupar a interface principal.

## Requisitos responsivos

Manter uso confortável em computador, iPad em retrato/paisagem e celular. Ações frequentes devem ser rápidas, controles devem ter áreas de toque adequadas e nenhuma função pode depender de hover.
