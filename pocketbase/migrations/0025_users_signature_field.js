// Adiciona o campo "signatureData" à coleção "users" — a assinatura manuscrita
// do Responsável Técnico, desenhada na tela Usuários (/usuarios).
//
// Formato: texto (data-URL PNG em base64, ex.: "data:image/png;base64,..." ),
// opcional (a conta pode não ter assinatura) — o valor vazio remove a assinatura.
//
// Regras de acesso: a coleção "users" já restringe update a "id = @request.auth.id"
// (migração 0023) e list/view a usuários autenticados, portanto cada usuário só
// lê e grava a PRÓPRIA assinatura. Esta migração apenas acrescenta o campo, sem
// alterar nenhuma regra nem o schema restante.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (col.fields.getByName('signatureData')) {
      return // já aplicado — idempotente
    }
    col.fields.add(
      new TextField({
        name: 'signatureData',
        max: 200000,
        required: false,
        presentable: false,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    const field = col.fields.getByName('signatureData')
    if (field) {
      col.fields.removeByName('signatureData')
      app.save(col)
    }
  },
)
