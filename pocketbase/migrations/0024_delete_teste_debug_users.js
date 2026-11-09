// Limpeza pontual (a pedido do proprietário): remove as duas contas de teste
// criadas durante o diagnóstico de criação de usuários (e-mails contendo
// "teste-debug" no domínio conce.test). Idempotente: em qualquer cópia do
// banco em que não existam contas com esse padrão de e-mail, não faz nada.
// As contas reais (engedenirsouza@gmail.com e financeiro@conce.net.br) não são
// tocadas — o filtro casa apenas com "teste-debug".
migrate(
  (app) => {
    const targets = app.findRecordsByFilter('users', "email ~ 'teste-debug'", '', 200, 0)
    if (targets.length === 0) {
      console.log('[0024] nenhuma conta teste-debug encontrada — nada a remover')
      return
    }
    targets.forEach((record) => {
      const email = record.getString('email')
      app.delete(record)
      console.log('[0024] conta teste removida: ' + email)
    })
  },
  (app) => {
    // down: não recria contas de teste — a limpeza é intencional.
  },
)
