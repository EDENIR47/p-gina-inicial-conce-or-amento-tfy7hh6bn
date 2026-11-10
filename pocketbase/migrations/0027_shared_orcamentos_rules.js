// Regras de compartilhamento total para a coleção orcamentos:
// "TODOS VEEM TUDO E TODOS EDITAM TUDO" na CONCE
// - list/view: qualquer usuário autenticado pode ver todos os orçamentos da empresa
// - create: qualquer usuário autenticado pode criar orçamentos
// - update: qualquer usuário autenticado pode editar qualquer orçamento (last-write-wins)
// - delete: restrito EXCLUSIVAMENTE ao criador/dono do orçamento (user = @request.auth.id)
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.createRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.id != ''"
    col.deleteRule = "@request.auth.id != '' && user = @request.auth.id"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('orcamentos')
    col.listRule =
      "@request.auth.id != '' && (user = @request.auth.id || shared_with ~ @request.auth.id)"
    col.viewRule =
      "@request.auth.id != '' && (user = @request.auth.id || shared_with ~ @request.auth.id)"
    col.createRule = "@request.auth.id != ''"
    col.updateRule =
      "@request.auth.id != '' && (user = @request.auth.id || shared_with ~ @request.auth.id)"
    col.deleteRule = "@request.auth.id != '' && user = @request.auth.id"
    app.save(col)
  },
)
