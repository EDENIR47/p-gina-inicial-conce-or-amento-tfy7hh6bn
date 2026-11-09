/**
 * Conteúdo estático do Tutorial da Plataforma CONCE (/tutorial).
 * Somente texto de apoio ao colaborador — não contém lógica de negócio.
 * Os nomes de telas, botões e campos descritos aqui são os mesmos usados no app
 * (BudgetsScreen, BudgetHierarchyTree, ServiceEditModal, BudgetTotalsBar, SyncStatusIndicator etc.).
 */

export interface TutorialStepContent {
  number: number
  title: string
  intro: string
  bullets: string[]
  tip?: string
  warn?: string
}

/** Seção "Primeiros passos" — como entrar na plataforma */
export const FIRST_STEPS_BULLETS: string[] = [
  'Abra o endereço da plataforma: a capa institucional da CONCE aparece sempre que alguém visita o site.',
  'Clique no botão "Acessar o Sistema". Com a sessão válida você vai direto para o Dashboard; sem sessão (ou com a sessão expirada), a tela de login abre.',
  'Na tela de login, informe o E-mail e a Senha e clique em "Entrar no Sistema".',
  'Sua conta é criada pelo administrador na tela "Usuários" — não existe cadastro público na plataforma.',
]

/** Passo a passo principal — criação de orçamentos */
export const TUTORIAL_STEPS: TutorialStepContent[] = [
  {
    number: 1,
    title: 'Abra a área de Orçamentos',
    intro:
      'No menu principal (topo da tela), clique em "Orçamentos". É ali que todas as propostas ficam guardadas.',
    bullets: [
      'A lista tem dois modos de visualização: "Relação de Propostas" (cards) e "Aba Gerenciar" (tabela com edição e exclusão).',
      'Use a busca por código, nome da obra ou cliente, e o filtro de status (Em Andamento, Aprovado, Em Análise, Vencido).',
    ],
  },
  {
    number: 2,
    title: 'Crie o novo orçamento',
    intro: 'Clique no botão azul "＋ Novo Orçamento" (ou em "Criar Orçamento" na tela vazia).',
    bullets: [
      'O código é gerado automaticamente no formato ORC-AAAA-XXX (ano + número sequencial) — não é preciso inventar código.',
      'O orçamento recém-criado já abre pronto para receber as etapas e os dados do cliente.',
    ],
    tip: 'Existe também o botão "✨ Gerar com IA", que monta uma proposta inicial a partir de um texto seu. Sempre revise todo o conteúdo gerado antes de usar.',
  },
  {
    number: 3,
    title: 'Preencha os dados do cliente e da obra',
    intro:
      'Abra o modal "Editar Orçamento" (no card do orçamento ou na "Aba Gerenciar") e preencha os cadastros.',
    bullets: [
      '"Dados do Cliente": Nome do Cliente / Razão Social (obrigatório), documento (CPF/CNPJ), Telefone, E-mail e Cidade/UF.',
      '"Dados da Obra & Local": Nome da Obra (obrigatório), Endereço, Cidade/UF, descrição do trabalho e prazo.',
      'Ajuste o Status do orçamento (Em Andamento, Aprovado, Em Análise, Vencido) e finalize em "Salvar Alterações".',
    ],
  },
  {
    number: 4,
    title: 'Monte a estrutura em etapas (EAP de 4 níveis)',
    intro:
      'Abrindo o orçamento você vê a "Estrutura Analítica do Orçamento (EAP de 4 Níveis)": Etapa (N1) → Serviço (N2) → Composição (N3) → Insumos (N4), com recálculo em tempo real.',
    bullets: [
      'Clique em "Adicionar Etapa" (ou "Criar Primeira Etapa", quando a árvore estiver vazia).',
      'No modal da etapa, informe o Nome da Etapa (ex.: Serviços Preliminares, Fundações, Estrutura) e clique em "Salvar Etapa".',
      'Use as setas ao lado da etapa para reordenar, e os ícones de duplicar/copiar para reaproveitar uma etapa em outro orçamento.',
    ],
  },
  {
    number: 5,
    title: 'Adicione os serviços de cada etapa',
    intro:
      'Dentro da etapa, clique em "＋ Adicionar Serviço" (o mesmo botão existe na barra superior da árvore).',
    bullets: [
      'Escreva a descrição técnica do serviço, escolha a unidade e informe a quantidade.',
      'O custo unitário vem da composição vinculada; se preferir, digite um preço manual — o sistema indica "Preço manual definido pelo usuário".',
      'Ao concluir, clique em "Salvar Serviço". A etapa passa a mostrar o "Custo Direto" e a "Venda c/ BDI".',
    ],
    tip: 'O botão "Melhorar com IA" sugere uma redação técnica para a descrição. A sugestão aparece como pré-visualização e só é gravada se você clicar em "Aplicar na Descrição".',
  },
  {
    number: 6,
    title: 'Vincule a Composição Unitária (CPU) e os insumos',
    intro:
      'No modal do serviço, o bloco "Composição Unitária CPU (Nível 3)" traz o preço unitário calculado a partir dos insumos.',
    bullets: [
      'Clique em "Importar da Biblioteca" (ou "Trocar Composição") para abrir a "Biblioteca de Composições CONCE / SINAPI", com busca por código, descrição ou especialidade — e clique em "Selecionar".',
      'Também é possível montar uma composição própria: use "Adicionar Insumo à CPU" informando descrição, unidade, quantidade e preço.',
      'No insumo, escolha o tipo: Material (Padrão), Mão de Obra (aplica encargos sociais automaticamente) ou Equipamento.',
      'Use "Esvaziar Insumos" se quiser recomeçar a composição do zero.',
    ],
  },
  {
    number: 7,
    title: 'Marque produto terceirizado, quando houver',
    intro:
      'Ainda no modal do serviço, há a marcação "Produto terceirizado — faturado direto com o cliente final".',
    bullets: [
      'Marque essa opção somente quando a CONCE apenas intermediar o produto, sem faturá-lo.',
      'O item continua no valor total de venda da obra (o cliente paga o produto), mas sai da base de cálculo do DAS.',
    ],
    warn: 'Regra do DAS: produto terceirizado faturado direto com o cliente final NÃO entra na base de cálculo do DAS (Simples Nacional), pois não passa pelo faturamento da CONCE. A barra de resumo confirma na linha "Base de cálculo do DAS (produto terceirizado faturado direto excluído)".',
  },
  {
    number: 8,
    title: 'Confira o Resumo Financeiro',
    intro:
      'A barra lateral escura consolida todos os indicadores do orçamento enquanto você trabalha.',
    bullets: [
      'Indicadores: Custo Direto Base, Encargos Sociais, Custo Direto Total, BDI (TCU 2.622), Tributos DAS e o valor final "Venda c/ BDI".',
      'A "Conferência de Integridade" avisa se o somatório das etapas coincide com o Total Geral e quantos campos ainda estão pendentes no cadastro.',
      'No regime Simples Nacional o DAS padrão da CONCE é 11% — ele já é aplicado automaticamente aos orçamentos.',
    ],
  },
  {
    number: 9,
    title: 'Gere a Proposta Técnica e Comercial',
    intro:
      'Com o orçamento pronto, clique no botão laranja "Proposta" na barra de resumo para gerar o documento A4 com 7 seções para o cliente.',
    bullets: [
      'A proposta é montada exclusivamente a partir das etapas do orçamento aberto — cliente, obra, serviços e prazos.',
      'O texto das seções técnicas é qualitativo (sem quantitativos de volume e área); os valores permanecem no orçamento e no PDF comercial.',
    ],
    warn: 'Nunca baseie a proposta em dados de outra proposta, anexo ou orçamento: use somente as etapas do orçamento que está aberto. O BDI não aparece na Proposta Técnica e Comercial — ele é restrito ao orçamento e ao PDF comercial.',
  },
  {
    number: 10,
    title: 'Gere o Memorial, o PDF e a planilha',
    intro: 'Na mesma barra de resumo ficam as exportações do orçamento aprovado internamente.',
    bullets: [
      '"Memorial Descritivo": memorial técnico automático da obra, salvo no próprio orçamento.',
      '"Exportar PDF": formatos Valor Final, Simplificado, Etapas ou Completo.',
      '"Excel": exporta a planilha do orçamento; "Revisões" guarda o histórico de versões; "Auditoria" registra as ações realizadas.',
    ],
  },
  {
    number: 11,
    title: 'Salve e sincronize com a nuvem',
    intro:
      'O botão laranja "Salvar" grava o orçamento (a mensagem "Orçamento ... salvo com sucesso!" confirma).',
    bullets: [
      'O indicador no topo do sistema mostra o status da nuvem Skip Cloud: "Sincronizado", "Falha no sync" ou "Sessão expirada".',
      'Se aparecer erro, clique no ícone de atualização ao lado (Sincronizar agora) para reenviar os dados.',
      'Se o indicador mostrar "Sessão expirada", faça login novamente e sincronize.',
    ],
    tip: 'Salve com frequência: o botão "Salvar" garante que a versão mais recente do orçamento esteja na nuvem.',
  },
]

/** Seção "Assinatura do responsável técnico" */
export const SIGNATURE_BULLETS: string[] = [
  'Na tela "Usuários", cada usuário tem o card "Minha assinatura".',
  'Desenhe sua assinatura com o mouse ou com o dedo e clique em "Salvar assinatura" (use "Limpar" para recomeçar).',
  '"Remover assinatura" apaga a imagem salva: os documentos voltam a exibir apenas o nome e o CREA.',
  'A assinatura fica salva na sua conta e aparece sozinha nos documentos onde você é o Responsável Técnico.',
]
