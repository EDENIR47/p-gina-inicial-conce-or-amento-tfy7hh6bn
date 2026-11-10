// Coleção budget_edit_presence: presença de edição de orçamentos ("quem está editando agora").
//
// - qualquer usuário autenticado da CONCE pode list/ver (aviso visual "{Nome} está editando")
// - create/update/delete: apenas o PRÓPRIO dono do registro de presença (user = @request.auth.id)
//   — um editor só atualiza (heartbeat) o SEU registro de presença.
// - TTL: o campo last_heartbeat é autodate (onUpdate) e o aviso expira sozinho no cliente
//   (60s sem heartbeat = presença encerrada). Nenhum hook de limpeza é necessário.
migrate(
  (app) => {
    // Idempotente: se a coleção já existe, apenas garante as regras atuais
    let col
    try {
      col = app.findCollectionByNameOrId('budget_edit_presence')
    } catch (_) {
      col = null
    }

    if (!col) {
      col = new Collection({
        name: 'budget_edit_presence',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && user = @request.auth.id",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'budget_local_id', type: 'text', required: false },
          { name: 'budget_code', type: 'text', required: false },
          { name: 'user_name', type: 'text', required: false },
          {
            name: 'last_heartbeat',
            type: 'autodate',
            onCreate: true,
            onUpdate: true,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_bep_budget_local ON budget_edit_presence (budget_local_id)',
          'CREATE INDEX idx_bep_budget_code ON budget_edit_presence (budget_code)',
          'CREATE INDEX idx_bep_user ON budget_edit_presence (user)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('budget_edit_presence')
      app.delete(col)
    } catch (_) {
      /* nada a reverter */
    }
  },
)
