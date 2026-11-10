# Charon — criação guiada de canais de entrada

Status: desenho aprovado pelo usuário; plano de implementação pendente de revisão. Não autoriza nova migration remota.

## 1. Intenção e decisões do usuário

O setup atual exige escolher um canal de voz já existente. No teste real isso se
mostrou confuso: o administrador espera que o Charon crie o canal de entrada.
O objetivo é oferecer essa criação dentro do `/setup init`, usando o PartyBeast
como referência de funcionamento, sem substituir o painel de sala do Charon.

O usuário confirmou:

- O administrador escolhe uma categoria existente e informa o nome do canal de entrada.
- Esse nome pertence **somente ao canal de entrada**, não às calls temporárias.
- O administrador define o limite inicial das calls geradas; o canal de entrada permanece sem limite.
- As calls continuam com nome automático baseado no jogo/nome de exibição.
- O dono altera a própria call pelo painel, sem alterar o modelo das próximas.
- A criação será guiada, com resumo e confirmação antes de criar o canal.

## 2. Abordagens consideradas

**Escolhida pelo usuário: criação guiada.** O administrador escolhe categoria,
preenche nome/limite, confere o resumo e confirma. Evita criar canais enquanto a
configuração ainda está incompleta; exige mais passos antes da primeira criação.

**Alternativa não escolhida: criar com padrões e editar depois.** É semelhante ao
primeiro setup documentado do PartyBeast. Reduz passos iniciais, mas cria recursos
antes de o administrador decidir nome, destino e limite, contrariando o objetivo
de tornar a configuração explícita.

## 3. Escopo e limites

Manter TypeScript, Discord.js, Prisma/PostgreSQL e os componentes nativos do
Discord. Não criar interface web, novos comandos globais, dependências novas,
novo sistema de painéis ou um mecanismo genérico de workflows.

Ficam fora: criar categorias automaticamente, templates novos para nomes,
numeração de calls, listas aleatórias, migração automática de canais existentes,
reorganização de salas ativas, moderação/reputação, múltiplas instâncias,
reparo global de órfãos, hospedagem e deploy automático.

Esta é uma extensão de setup/criação de calls; as regras de posse, prioridade,
transferência, privacidade, allowlist e limpeza da v0.3.0 não mudam.

## 4. Fluxo administrativo

O `/setup init` continua abrindo o dashboard privado. Substituir o seletor
"Adicionar Voice Creator" por uma ação clara: **Criar canal de entrada**.
A seleção de criadores já configurados continua existindo para edição.

1. O administrador inicia a criação e escolhe uma categoria existente.
2. Um formulário pede **Nome do canal de entrada** e **Limite inicial das calls**.
3. A submissão valida os dados e mostra um resumo privado: categoria de entrada,
   nome do canal, limite das novas calls, entrada sem limite e nome automático.
4. **Confirmar criação** executa o preflight novamente, cria o canal de entrada
   e salva sua configuração. **Voltar** permite revisar; **Cancelar** descarta
   o rascunho sem criar canais ou configuração persistida.
5. Após sucesso, o dashboard seleciona o criador salvo e informa que entrar
   naquele canal gera uma call temporária. Falha ao redesenhar o dashboard após
   salvar não transforma o sucesso em uma oferta de criar novamente.

**Decisões propostas pelo agente:**

- O canal de entrada e as calls inicialmente usam a mesma categoria escolhida.
  A ação existente de mudar a categoria das salas permanece e afeta somente
  o destino de calls futuras; não move o canal de entrada ou calls existentes.
- Nome: remover espaços externos e manter o contrato atual de 1–100 caracteres
  dos canais de entrada. Não aplicar o limite de 11 grafemas das calls ao criador.
- Limite: inteiro de 0 a 99; **0 significa sem limite**. Explicar isso no campo e
  no resumo. Não aceitar negativos, decimais, campos vazios ou texto não numérico.
- No dashboard, mostrar e permitir editar **Limite padrão das novas calls**.
  O valor inicial sugerido é 0. Renomear continua alterando só o canal de entrada.
- Excluir configuração mantém o comportamento atual: preserva o canal e as salas
  existentes. Não introduzir exclusão automática do criador por essa ação.
- Não alterar a flag existente de habilitação do painel. Novos criadores seguem
  seu padrão atual habilitado; configurações anteriores mantêm sua preferência.

## 5. Rascunhos, autorização e interações antigas

Um rascunho é estado transitório, não um VoiceCreator incompleto no banco.
Proposta técnica: armazenamento em memória pertencente à aplicação, com TTL de
10 minutos e limpeza limitada ao próprio rascunho. Reinício invalida rascunhos;
o administrador reabre `/setup init`, sem retomada automática de mutações.

Associar cada rascunho ao servidor, administrador e mensagem privada original,
com identificador opaco e revisão. Nome e limite ficam no estado validado do
servidor, não confiados a texto da mensagem ou a valores embutidos em botões.
Não registrar os valores do formulário nos logs.

Todas as etapas revalidam o servidor e as permissões do administrador:
Administrador ou Gerenciar Servidor + Gerenciar Canais. Componentes não concedem
autorização; outra pessoa, outro servidor, outra mensagem, revisão antiga ou
rascunho expirado não pode confirmar. A confirmação exige contexto privado.

Usar o padrão atual de mostrar modais como resposta inicial, sem defer prévio;
nenhuma consulta externa lenta deve anteceder a abertura do formulário.
Na submissão/confirmação, reconhecer a interação antes de banco/Discord e validar
categoria, contexto e permissões efetivas imediatamente antes da mutação.

Interações antigas de **adicionar canal existente** não podem continuar usando
silenciosamente o fluxo antigo: respondem que o setup deve ser reaberto. Os
controles de edição existentes devem continuar funcionando, ou expirar de forma
explícita e segura caso a versão do contrato precise mudar.

## 6. Criação do canal e falhas parciais

Somente a confirmação pode iniciar mutações externas. O serviço coordena gateway
Discord e repositório; os handlers cuidam de interação e apresentação.

- Revalidar categoria existente no mesmo servidor, tipo categoria e permissões
  necessárias do bot no contexto e no destino; não exigir Administrador do bot.
- Criar um **canal de voz** com o nome confirmado, pai selecionado e `userLimit=0`.
  Preservar restrições de acesso da categoria; não reutilizar a projeção pública
  explícita das calls temporárias para tornar o canal de entrada público sem pedido.
  Validar permissões efetivas do bot após a criação. Não modificar cargos.
- Salvar guild, ID do canal criado, categoria das calls e limite padrão. Registrar
  o sucesso do rascunho antes de apresentar o resultado. Cliques simultâneos na
  mesma confirmação compartilham uma operação, não duas criações.
- O nome não é identificador único. Dois fluxos independentes podem criar canais
  de mesmo nome; não adotar ou excluir canais apenas por correspondência de nome.
- Não manter transação SQL aberta durante chamadas ao Discord. Em falha do banco
  após criação, consultar pelo ID do canal para distinguir commit confirmado de
  resultado incerto antes de tentar compensação.

Se o canal foi criado, mas a configuração comprovadamente não foi salva, remover
somente esse canal, com identidade confirmada e após revalidar que está vazio.
Se estiver ocupado, não puder ser removido ou o estado do banco for incerto,
preservar o recurso, informar resultado parcial e registrar operação/IDs e tipo
do erro, sem credenciais ou valores do formulário. Uma falha de pós-validação
deve carregar o ID conhecido do canal para essa mesma decisão de compensação.

Falha de rede no create sem ID retornado é **resultado incerto**, não prova de
ausência do canal. Bloquear nova confirmação automática desse rascunho e orientar
inspeção manual; não fazer retry cego da criação. Crash pode deixar um canal sem
configuração: assumir essa limitação explicitamente, sem prometer exactly-once
entre reinícios ou introduzir agora uma tabela/saga de operações duráveis.

## 7. Dados e compatibilidade

Adicionar a VoiceCreator um `defaultUserLimit`: inteiro não nulo, padrão 0, com
restrição de faixa 0–99 no PostgreSQL e validação equivalente na aplicação.
Não é necessário um índice para esse campo, que não é chave de consulta.

A migration será nova e aditiva; não editar migrations publicadas nem executar
DDL neste estágio de desenho. Configurações antigas recebem 0, preservando o
comportamento anterior. RLS e ausência de políticas públicas continuam intactas.
Não são necessárias tabelas novas para os rascunhos em memória.

TemporaryRoom já possui `userLimit`; reutilizá-lo. Na criação de uma call, ler a
configuração e usar o mesmo valor tanto na chamada Discord de criação quanto na
persistência inicial da sala. Eliminar os zeros fixos dessas duas fronteiras para
esse fluxo; não criar a call ilimitada para só depois ajustar seu limite.

O nome do canal de entrada permanece no Discord, como hoje. Não criar um campo
de nome-base das calls: o comportamento de jogo/nome de exibição, fallback e
limite de 11 grafemas permanece.

## 8. Efeito sobre calls e painel

Entrar no criador segue o fluxo atual de uma sala acompanhada por dono/servidor.
Se o membro já possui uma sala reutilizável, mover para ela sem reaplicar nome,
limite ou outros padrões. Somente uma **nova** call usa `defaultUserLimit`.

Na criação, persistir o limite inicial junto ao estado CREATING; ativar a sala e
sincronizar o painel com o mesmo valor. Falhas de criação, movimento, persistência
e compensação seguem as garantias já existentes, sem apagar salas ocupadas.

O painel público B e o menu privado do dono permanecem. Alterar o limite no menu
afeta apenas TemporaryRoom e seu canal Discord, nunca VoiceCreator nem o canal
de entrada. O dono pode aumentar ou reduzir o valor dentro de 0–99: o padrão do
administrador é um valor inicial, não um teto. Não expulsar participantes quando
o limite for reduzido. Renomear, acesso, transferência e claim não mudam.

Editar o limite padrão no setup afeta apenas calls iniciadas depois da leitura
da nova configuração. Não reconfigurar salas ativas, mudanças feitas pelo dono
ou limite de ocupação dos canais de entrada anteriores.

## 9. Validação e critérios de aceite

Cobrir em testes:

- Criação guiada completa, cancelamento, retorno, inputs inválidos, limites 0/1/99,
  nome vazio/maior que 100, expiração, autoria, servidor, mensagem e revisão.
- Nenhuma criação/persistência de configuração antes de confirmar; reconhecimento
  correto das interações; categoria removida e permissões revogadas entre etapas.
- Confirmações duplicadas, criação negada, create incerto sem ID, falha de
  pós-validação com ID, falha SQL certa/incerta e falha ao renderizar após sucesso;
  compensação não remove canal ocupado, preexistente ou configuração confirmada.
- Migration preserva dados anteriores, padrão 0, faixa no banco e RLS; PostgreSQL
  local valida persistência consistente do limite e edição somente do modelo.
- Nova call nasce com limite correto no Discord e banco; nome independente;
  sala reutilizada e salas anteriores preservam ajustes; alterações do dono não
  atingem modelo/entrada; painel, privacidade, posse e transferências não regridem.

Na validação real, confirmar o resumo/cancelamento sem criar canais; criar uma
entrada pelo bot; entrar e verificar nome automático, limite e painel; editar a
call e confirmar que a próxima nasce com o padrão do administrador. Separar
resultados observados de casos pendentes que exigem mais participantes.

## 10. Operação e aprovação

A validação da v0.3.0 já tem banco migrado e comandos registrados somente no
servidor de teste autorizado. O bot local pode ainda estar executando a versão
anterior: verificar processo e encerrar de forma limpa antes de trocar o código
ou executar a próxima migration, sem iniciar uma segunda instância.

O usuário escolheu a abordagem e **aprovou este desenho**.
Preparar plano com TDD, testes locais, revisão e nova
validação manual. Nenhuma autorização anterior de migration/registro de comandos
é autorização genérica para aplicar a próxima migration no Supabase. A aplicação
remota exige confirmação do novo destino/backup e nova autorização explícita.
Não executar suítes destrutivas, grants de testes ou prepare-database no Supabase.
Hospedagem continua fora desta entrega; não alterar comandos globais.

## 11. Referências e liberdade do implementador

Referência de produto: [setup inicial](https://krankey.gitbook.io/partybeast/helptopics/initial-setup),
[novos criadores](https://krankey.gitbook.io/partybeast/helptopics/additional-categories-and-voice-creators),
[categoria de destino](https://krankey.gitbook.io/partybeast/helptopics/setting-a-different-category-for-created-rooms),
[nomes independentes](https://krankey.gitbook.io/partybeast/helptopics/changing-the-name-of-created-channels)
e [limite por dono](https://krankey.gitbook.io/partybeast/user-commands/limit).
São observações de documentação, não testes atuais do PartyBeast. A herança de
limite no Charon é requisito confirmado pelo usuário, não fato inferido da referência.

Pontos atuais localizados: `setup.views.ts`, `setup.interactions.ts`,
`setup.schemas.ts`, `setup.service.ts`, `setup.discord.ts`, `setup.repository.ts`,
`call.service.ts`, `call.discord.ts`, `call.repository.ts` e `prisma/schema.prisma`.

O implementador decide nomes internos de métodos, classes, ações e divisão de
testes mantendo a estrutura atual. Não deve introduzir bibliotecas, workflow
genérico, promessas de recuperação global ou novos recursos da referência sem
nova necessidade aprovada.
