// Biblioteca de Composições torna-se recurso COMPARTILHADO da empresa:
// - list/view: qualquer usuário autenticado vê TODAS as composições
//   (criadas por qualquer colaborador), para consultar e importar em orçamentos;
// - create: usuário autenticado, gravando a si mesmo como dono (user);
// - update/delete: continua restrito ao dono do registro — colaboradores
//   usam as composições dos outros, mas não editam nem apagam as dos outros.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('composicoes')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.createRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.id != '' && user = @request.auth.id"
    col.deleteRule = "@request.auth.id != '' && user = @request.auth.id"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('composicoes')
    col.listRule = "@request.auth.id != '' && user = @request.auth.id"
    col.viewRule = "@request.auth.id != '' && user = @request.auth.id"
    col.createRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.id != '' && user = @request.auth.id"
    col.deleteRule = "@request.auth.id != '' && user = @request.auth.id"
    app.save(col)
  },
)
