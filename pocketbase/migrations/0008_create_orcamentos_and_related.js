/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Coleção orcamentos
    const orcamentosCol = new Collection({
      name: 'orcamentos',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || shared_with ~ @request.auth.id)",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || shared_with ~ @request.auth.id)",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (user = @request.auth.id || shared_with ~ @request.auth.id)",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'code', type: 'text', required: true },
        { name: 'title', type: 'text' },
        { name: 'client_name', type: 'text' },
        { name: 'client_document', type: 'text' },
        { name: 'work_name', type: 'text' },
        { name: 'work_address', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['em_andamento', 'aprovado', 'vencido', 'em_analise'],
          maxSelect: 1,
        },
        { name: 'sale_value', type: 'number' },
        { name: 'direct_cost', type: 'number' },
        { name: 'bdi_rate', type: 'number' },
        { name: 'tax_regime', type: 'text' },
        { name: 'simples_das_rate', type: 'number' },
        { name: 'client_data', type: 'json' },
        { name: 'work_data', type: 'json' },
        { name: 'bdi_config', type: 'json' },
        { name: 'charges_config', type: 'json' },
        { name: 'payload', type: 'json' },
        { name: 'local_id', type: 'text' },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'shared_with',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 50,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_orcamentos_user ON orcamentos (user)',
        'CREATE INDEX idx_orcamentos_code ON orcamentos (code)',
        'CREATE INDEX idx_orcamentos_status ON orcamentos (status)',
        'CREATE INDEX idx_orcamentos_local_id ON orcamentos (local_id)',
      ],
    })
    app.save(orcamentosCol)

    const orcamentosId = orcamentosCol.id

    // 2. Coleção fotos_etapa (anexos reais do PocketBase para fotos de etapas da obra)
    const fotosEtapaCol = new Collection({
      name: 'fotos_etapa',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'orcamento',
          type: 'relation',
          collectionId: orcamentosId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'orcamento_local_id', type: 'text' },
        { name: 'stage_id', type: 'text', required: true },
        {
          name: 'file',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_fotos_user ON fotos_etapa (user)',
        'CREATE INDEX idx_fotos_orcamento ON fotos_etapa (orcamento)',
        'CREATE INDEX idx_fotos_stage ON fotos_etapa (stage_id)',
      ],
    })
    app.save(fotosEtapaCol)

    // 3. Coleção cotacoes (cotações de fornecedores personalizadas do usuário)
    const cotacoesCol = new Collection({
      name: 'cotacoes',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'orcamento',
          type: 'relation',
          collectionId: orcamentosId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'budgetId', type: 'text' },
        { name: 'inputCode', type: 'text' },
        { name: 'inputDescription', type: 'text' },
        { name: 'quotes', type: 'json' },
        { name: 'chosenSupplierId', type: 'text' },
        { name: 'local_id', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_cotacoes_user ON cotacoes (user)',
        'CREATE INDEX idx_cotacoes_budget ON cotacoes (budgetId)',
      ],
    })
    app.save(cotacoesCol)

    // 4. Coleção composicoes (composições personalizadas da biblioteca do usuário)
    const composicoesCol = new Collection({
      name: 'composicoes',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'code', type: 'text', required: true },
        { name: 'description', type: 'text', required: true },
        { name: 'specialty', type: 'text' },
        { name: 'unit', type: 'text' },
        { name: 'source', type: 'text' },
        { name: 'version', type: 'text' },
        { name: 'inputs', type: 'json' },
        { name: 'local_id', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_composicoes_user ON composicoes (user)',
        'CREATE INDEX idx_composicoes_code ON composicoes (code)',
      ],
    })
    app.save(composicoesCol)
  },
  (app) => {
    try {
      const col4 = app.findCollectionByNameOrId('composicoes')
      app.delete(col4)
    } catch (_) {}
    try {
      const col3 = app.findCollectionByNameOrId('cotacoes')
      app.delete(col3)
    } catch (_) {}
    try {
      const col2 = app.findCollectionByNameOrId('fotos_etapa')
      app.delete(col2)
    } catch (_) {}
    try {
      const col1 = app.findCollectionByNameOrId('orcamentos')
      app.delete(col1)
    } catch (_) {}
  },
)
