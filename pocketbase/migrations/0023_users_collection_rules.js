// Alinha as regras da coleção "users" com o fluxo da tela Usuários:
// - list/view: qualquer usuário autenticado lista todas as contas (a tela
//   Usuários consulta a API padrão do PocketBase);
// - create: somente usuários autenticados (cadastro público permanece
//   desativado — novas contas só nascem na tela Usuários);
// - update/delete: cada usuário continua limitado ao próprio registro.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.createRule = "@request.auth.id != ''"
    col.updateRule = 'id = @request.auth.id'
    col.deleteRule = 'id = @request.auth.id'
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.listRule = 'id = @request.auth.id'
    col.viewRule = 'id = @request.auth.id'
    col.createRule = ''
    col.updateRule = 'id = @request.auth.id'
    col.deleteRule = 'id = @request.auth.id'
    app.save(col)
  },
)
