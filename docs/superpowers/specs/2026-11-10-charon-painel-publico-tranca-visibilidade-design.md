# Charon — painel público, tranca e visibilidade independentes

**Estado:** visual v2, desenho e plano aprovados pelo usuário em 2026-11-10. Implementação e revisão final concluídas; gates registrados de 1.259 testes comuns, 45 integrações locais, typecheck/build aprovados. PR #5 mesclado em `main` (`b67f475`), CI antes/depois verde. Com autorizações posteriores específicas, novo backup privado, migration no `charon-dev` e início de uma instância local foram verificados. Usuário aprovou visual/todos os botões sem erros ou mensagens repetidas; isso não certifica toda a matriz multiusuário/mobile ou latência medida. Reputação adiada e hospedagem para o final. Evidência em `docs/validation/2026-11-10-painel-publico-tranca-visibilidade.md`. As restrições abaixo preservam o escopo da aprovação original, não anulam as autorizações posteriores nem autorizam novas operações.

## 1. Objetivo e origem

Corrigir os problemas observados no teste real da v0.3.0: mensagens privadas acumuladas, “pensando” e “Ação concluída” em ações rotineiras, nome de sala duplicado, organização diferente da prévia original e demora percebida. Preservar segurança, ciclo de vida, setup guiado e regras de posse existentes.

Este desenho substitui **somente a escolha de interface e a associação entre entrada/visibilidade** do desenho `2026-11-08-charon-v0.3.0-posse-controles-design.md`. As demais regras continuam válidas. O painel B original era compacto com menu privado; o usuário agora escolheu explicitamente os controles no painel público, utilizáveis somente pelo dono.

### Decisões explícitas do usuário

- Controles públicos; somente o dono pode alterar a sala. Atualizar a interface existente, sem uma mensagem de sucesso por ação.
- Separar **trancar/destrancar** de **ocultar/mostrar**. Trancar sozinho não oculta.
- Autorizados podem entrar mesmo trancada e visualizar a sala oculta. Ocultar preserva os participantes já presentes.
- Ao sair o dono, uma sala ocupada conserva tranca/visibilidade até o próximo dono alterá-las; uma sala vazia é encerrada.
- Manter o embed atual reorganizado, em vez de migrar aos componentes novos. A prévia v2 com botões lado a lado e quebra de linha foi aprovada.

As escolhas de implementação e compatibilidade nas seções seguintes são propostas técnicas do assistente, não novos pedidos atribuídos ao usuário.

## 2. Abordagens consideradas

### A. Embed nativo reorganizado com botões públicos — escolhida

Reutilizar o painel rastreado, corrigir seus campos e distribuir botões em linhas explícitas. Preserva a organização por campos da v0.3.0 e limita a mudança visual. O cadeado fica nos botões abaixo do embed; não existe alinhamento central arbitrário nem botão dentro do título.

### B. Componentes novos do Discord — não escolhida

Permitem associar texto a um botão acessório ao lado do cabeçalho, mas não reproduzem as mesmas colunas do embed e exigem uma reformulação maior. Também não garantem o posicionamento por CSS solicitado inicialmente.

### Alternativa anterior: menu privado completo — substituída

Não manter **Abrir controles** como caminho principal: o usuário preferiu acesso direto e relatou confusão com as mensagens privadas repetidas.

## 3. Interface aprovada e limites nativos

Referência visual local: `.superpowers/brainstorm/1020-1794293240/content/painel-publico-v2.html`. É uma simulação descartável, não um dashboard do produto. O Figma atingiu o limite de chamadas do plano e a prévia foi fornecida localmente, sem upgrade/custo. Não depender do Figma nem do servidor da prévia em produção.

### Quadro público

- Título **Central da Call**, alinhamento nativo à esquerda. A aprovação da abordagem A substitui a expectativa inicial de centralização exata.
- Primeira linha: **Sala** à esquerda, com o nome escapado uma única vez; **Proprietário** ao lado, ou **Sem proprietário**. Não concatenar menção do canal e nome.
- Segunda linha: **Participantes** à esquerda, contagem atual e limite; **Acesso e visibilidade** ao lado, com os dois estados reais, por exemplo **Trancada · Visível**. Limite 0 deve ser legível como ilimitado.
- Preservar informações de prioridade para assumir quando aplicáveis. Evitar notificações de menção ao editar o painel.
- Usar campos inline e separação de linhas compatíveis com embeds, sem prometer posições fixas: o cliente Discord pode empilhar campos e reorganizar botões, especialmente no celular.

### Botões

Linhas explícitas, sem enfileirar todas as ações em uma só:

| Linha | Botões |
| --- | --- |
| 1 | Trancar/Destrancar · Ocultar/Mostrar · Renomear |
| 2 | Alterar limite · Autorizados · Transferir posse |
| 3 | Assumir sala |

O texto dos dois primeiros botões representa a **ação disponível**, enquanto o quadro mostra o **estado atual**. Usar emojis/estilos nativos equivalentes à prévia, sem prometer cores, larguras, espaçamento ou fonte HTML exatos.

Os seis controles de alteração são visíveis, mas a autorização é sempre no servidor. Enquanto não houver dono, ficam desabilitados; isso não impede a validação de componentes antigos. **Assumir sala** é a exceção deliberada: mantém a elegibilidade existente e fica desabilitado enquanto existe dono. Não alterar a regra para administradores do servidor ou para autorizados: autorização de entrada não concede gestão.

### Fluxos secundários

- **Renomear** e **Alterar limite** abrem modais; salvar atualiza canal, banco e o painel existente. Preservar limite de 11 grafemas no nome e 0–99 para participantes. O campo HTML simplificado da prévia não autoriza expandir o limite de nome.
- **Autorizados** usa seleção privada para adicionar/remover membros da lista daquela sala. Não publicar lista ou escolhas no painel público.
- **Transferir posse** usa seleção e confirmação privadas, mantendo os cinco segundos e as regras já existentes.
- Estes dois fluxos reutilizam uma única área privada ativa por sala/dono/versão de controle. Abrir outro fluxo substitui seu conteúdo; não criar um menu privado geral nem outra mensagem a cada etapa. Transferência pendente não pode ser escondida por outra escolha: ao reabrir, mostrar a pendência existente ou exigir seu encerramento antes de trocar de fluxo.
- A área privada é uma conveniência de sessão, nunca prova de autorização. Revalidar a cada interação. Ao expirar o webhook/sessão ou reiniciar o bot, poderá ser necessário criar uma nova área somente quando solicitada; não prometer reutilização eterna de mensagens efêmeras.
- Manter somente handles de edição necessários em memória, com expiração e limpeza em troca de dono, desativação, fechamento e shutdown. Não salvar tokens de interação no banco, arquivos ou logs. Criação concorrente não pode produzir múltiplas áreas ativas.

## 4. Respostas sem poluição de chat

- Ações de componentes reconhecem a interação sem abrir resposta “pensando”, usando atualização da mensagem de origem quando suportado. O serviço continua editando o painel rastreado; não editar o painel público com texto privado de erro.
- Remover a resposta genérica **Ação concluída**. Estado/valores do painel e dos controles são a confirmação de sucesso.
- Abertura de modal precisa ser a resposta inicial; não adiar a interação antes de tentar abrir um modal. A submissão deve usar o contexto de mensagem quando disponível; se um caminho exigir resposta própria, encerrar/remover essa resposta sem deixá-la acumulada e documentar a limitação nativa observada no teste.
- Erros continuam privados e acionáveis. Em uma área privada existente, editar a própria área quando possível; em interação pública, responder privadamente, sem revelar dados ou substituir o painel compartilhado. Não silenciar falhas como se a ação tivesse funcionado.
- Contagem e resultado de transferência são informações úteis do fluxo privado, não mensagens genéricas de sucesso. Atualizar essa mesma área e remover controles vencidos. Preservar confirmação de entrega antes de armar a contagem.
- Não apagar mensagens históricas privadas ou públicas em massa. A mudança impede novo acúmulo; eventual limpeza antiga é ação separada.

## 5. Matriz de acesso

Tranca e visibilidade são propriedades independentes da sala:

| Tranca | Visibilidade | Membro comum fora da call | Dono atual / autorizado |
| --- | --- | --- | --- |
| Aberta | Visível | Vê e pode entrar, conforme limite nativo | Vê e pode entrar, conforme limite nativo |
| Trancada | Visível | Vê, mas não pode entrar | Vê e pode entrar, conforme limite nativo |
| Aberta | Oculta | Não vê nem pode entrar | Vê e pode entrar, conforme limite nativo |
| Trancada | Oculta | Não vê nem pode entrar | Vê e pode entrar, conforme limite nativo |

**Quem já está na call** conserva acesso enquanto permanecer. Não expulsar ao trancar/ocultar nem ao remover autorização de alguém ainda presente. Depois que sair, somente autorização explícita ou a condição de dono atual permite a exceção; a presença anterior não vira autorização permanente.

O dono que sai perde a posse pelas regras existentes. Não ganha reentrada especial por ter sido dono e não recupera automaticamente a posse; uma autorização explícita remanescente pode permitir a reentrada.

Mostrar conserva o bit de tranca; destrancar conserva a visibilidade. A lista pertence à sala e permanece ao mostrar, destrancar ou trocar dono; outra sala não herda esses dados. Autorizado não ignora automaticamente o limite de participantes nem ganha permissão de administrar a sala.

### Projeção das permissões

Generalizar a projeção existente para derivar as permissões dos dois estados e da união de dono, autorizados, participantes atuais e bot. Restringir **Connect** para tranca, **View Channel** e acesso ao chat para ocultação; uma sala oculta também não deve aceitar conexão de um membro comum por IDs conhecidos. A projeção efetiva pode restringir Connect ao ocultar sem modificar o bit de tranca salvo.

Preservar acesso operacional do bot e bits não geridos pelo recurso. Reconciliar sobrescritas por presença, autorização e posse em qualquer combinação restrita, não apenas em salas ocultas. Rejeitar grants externos incompatíveis e extrapolação do limite de 100 sobrescritas; não truncar autorizados nem informar privacidade/tranca enquanto houver acesso indevido.

**Administrator** do Discord continua acima das sobrescritas: não prometer bloqueio/ocultação contra administradores. Isso não cria um bypass para os botões de gestão do bot. Não conceder Administrator, mudar cargos ou aplicar denies globais automaticamente.

## 6. Estado persistido e compatibilidade

Proposta mínima: conservar `RoomVisibility.PUBLIC/PRIVATE` como representação interna de **visível/oculta** e adicionar um booleano de tranca em `TemporaryRoom` (`isLocked` como nome proposto), NOT NULL e default false. Não acrescentar índices apenas para um booleano sem consulta que os justifique. Não criar nova tabela de sessão ou alterar RLS/políticas públicas.

Adicionar uma migration nova; nunca editar as quatro migrations já publicadas. Na migração dos dados existentes, inicializar a tranca de salas `PRIVATE` como true para preservar a restrição histórica de entrada; `PUBLIC` fica false. Nenhum backfill deve tornar sala privada visível ou aberta. Validar a correspondência em banco local antes de qualquer rollout.

Novas salas começam abertas e visíveis, preservando a política anterior; limites continuam vindo do setup guiado. Reuso da mesma sala, reinício, troca de dono, transferência, reivindicação e setup on/off preservam seus estados salvos. Fechamento não deve deixar a lista ativa nem criar uma sala nova com os estados anteriores.

Renomear mensagens/IDs de componentes não concede autoridade. Compatibilizar/inutilizar os componentes antigos com segurança e atualizar o painel rastreado sem duplicá-lo. Um componente legado cujo botão tinha o significado combinado de pública/privada não deve passar a executar silenciosamente outra semântica: rejeitá-lo ou encaminhar somente à atualização dos controles atuais, sem alterar acesso por esse clique.

## 7. Consistência, posse e ciclo de vida

- Reutilizar coordenador, ordem de bloqueios e validação de sala/servidor/canal/versão/dono/presença/setup. Não adicionar um mutex paralelo que deixe eventos de voz e botões concorrerem sem proteção.
- Ler o estado vigente dentro da operação serializada. Toggling usa esse estado, não o rótulo do botão ou snapshot capturado antes da espera; impedir lost updates entre tranca, visibilidade e troca de dono.
- Alteração de acesso deve capturar o estado necessário para compensação, aplicar Discord, revalidar autoridade/presença, persistir via controle de concorrência e sincronizar o painel. Não deixar transação SQL aberta enquanto espera Discord. Se houver falha, restaurar o estado anterior quando seguro; nunca abrir/mostrar como compensação genérica. Se o resultado for incerto, rejeitar novas mutações até uma reconciliação segura, sem anunciar sucesso.
- Uma sala com participantes fica sem dono após sua saída e conserva tranca/visibilidade/lista. Preservar prioridade de cinco minutos e transferência de cinco segundos, sem transferência automática pela saída. Fechar quando ficar vazia, independentemente do painel ou de falha de resposta.
- Desativar controles pelo setup remove o painel inteiro, invalida ações antigas e cancela pendências; não abre nem revela a sala. Reativar restaura um painel único com estado atual. Manter comportamento de exclusão lógica de Voice Creator do desenho anterior.

## 8. Desempenho: medir antes de otimizar

A investigação identificou leituras de estado repetidas, fetches forçados de canal/membros/bot e busca de mensagem antes de editar. Isso identifica candidatos, **não comprova o gargalo**; os logs existentes não medem ações.

Separar tempo até reconhecimento/abertura do modal, espera pelo coordenador, leituras de banco, chamadas Discord, persistência e atualização do painel. Usar logs estruturados seguros com ação, resultado, durações e correlação; nunca incluir tokens, URLs de conexão, texto de modal ou lista de membros. Registrar contagem de chamadas por ação em testes instrumentados.

Comparar antes/depois para a mesma operação e condições; relatar tamanho da amostra e erros/rate limits. O requisito de reconhecimento do Discord é o prazo nativo de três segundos; não prometer latência total fixa sem medir. A prévia HTML instantânea não comprova o desempenho real.

Otimizar somente redundâncias demonstradas: reuso limitado ao contexto seguro da mesma operação, edições diretas por ID e supressão de atualizações realmente idênticas quando não prejudicarem invalidação, dono, contagem ou prazos. Não usar cache de autorização entre ações, eliminar revalidações no commit ou mover mutação para background sem confirmação. Não adicionar Redis, fila, novo provedor ou infraestrutura.

## 9. Verificação necessária

### Interface e interações

- Nome uma vez, campos organizados, três linhas de botões conforme a referência; rótulos dinâmicos e estados independentes. Nome com 11 grafemas e limite 0–99 preservados.
- Trancar, mostrar, ocultar, destrancar, salvar nome/limite e assumir não criam confirmação genérica; somente uma mensagem pública rastreada. Modais, erros e fluxos privados usam respostas compatíveis com a origem, sem sobrescrever o painel por acidente.
- Reabrir/alternar a área privada não a duplica enquanto válida; expiração, cliques simultâneos, mudança de dono, reinício e falha de edição são tratados sem reutilizar autoridade obsoleta. Não esconder transferência ainda armada.
- Não dono, autorizado sem posse, usuário fora da call, IDs forjados, versão antiga e controles desativados não alteram a sala. Revalidar a submissão mesmo se o usuário podia abrir o modal antes.

### Permissões e vida da sala

- Cobrir as quatro combinações e cada transição. Autorizado vê/entra nas combinações restritas; membro comum não entra trancada e não vê/entra oculta, inclusive com ID conhecido.
- Participante atual permanece; após sair perde exceção temporária. Adição/remoção, dono que sai, nova posse, transferência, reinício e reuso mantêm somente as exceções corretas.
- Sobrescritas externas, falta de permissão, limites de capacidade, falhas/resultado incerto entre Discord e banco e concorrência falham com segurança. Não remover proteção para ganhar velocidade.
- Sala vazia fecha mesmo trancada/oculta e mesmo com falha de painel. Setup on/off preserva restrições, invalida pendências e não duplica mensagens.

### Banco, desempenho e aceitação real

- Migration local com dados anteriores PUBLIC/PRIVATE, default/NOT NULL/backfill corretos, dados de negócio preservados e RLS inalterada. Testes que escrevem dados apenas em PostgreSQL local descartável, nunca no Supabase.
- Testes unitários/integração existentes, typecheck, build e whitespace; evidência de antes/depois para as redundâncias removidas e ausência de regressões de autorização/concorrência.
- Aceitação real no servidor de teste precisa conferir desktop/celular, mensagens pós-ação, quatro estados, autorizados, perda/sucessão de dono e tempo das ações. Não declarar validado por testes de simulação.

## 10. Limites operacionais e fora de escopo

Esta aprovação de desenho não autoriza migration remota, restart automático do bot real, registro global, mudança de cargos, limpeza de mensagens históricas, push, merge, deploy/hospedagem ou cobrança. Cada operação remota nova precisa da autorização correspondente e de verificação do processo já existente; não iniciar duas instâncias.

Preservar `.env` ignorado no checkout original, TLS verificado, backups privados e os dados do servidor. Não executar fixtures, grants locais ou suítes destrutivas no Supabase. Antes de futura migration remota: nova autorização, backup, inspeção/checksums e verificação independente. Não executar uma versão dependente da nova coluna contra banco ainda não migrado.

Fora do escopo: mudar setup guiado, nomenclatura inicial por jogo/nome, regras de elegibilidade e temporização, expulsão/moderação, pedidos externos de entrada, múltiplas instâncias, dashboard web e migração a Components V2.

O implementador pode decidir assinaturas e divisão cirúrgica dos arquivos, representação exata da área privada e instrumentação de baixo custo, desde que preserve este contrato e documente limitações nativas encontradas. O plano detalhado só começa após a aprovação final deste desenho.

## Referências

- `docs/superpowers/specs/2026-11-08-charon-v0.3.0-posse-controles-design.md` e `2026-11-10-charon-setup-guiado-design.md`.
- `src/modules/calls/call-panel.view.ts`, `call.interactions.ts`, `call-controls.view.ts`, `room-context.ts`, `room-access.service.ts`, `room-controls.service.ts`, `room-panel.service.ts`, `room.discord.ts` e `room-state.repository.ts`.
- `prisma/schema.prisma` e as migrations existentes, somente como referência nesta etapa.
- [Discord: componentes](https://docs.discord.com/developers/components/reference), [interações](https://docs.discord.com/developers/interactions/receiving-and-responding), [permissões](https://docs.discord.com/developers/topics/permissions).
