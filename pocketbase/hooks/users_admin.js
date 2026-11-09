// Gerenciamento de contas de usuário da CONCE.
// Somente usuários autenticados na coleção "users" podem listar e criar novas
// contas — o cadastro público pela tela de login foi desativado a pedido do
// proprietário: novas contas só nascem aqui, criadas por quem já tem acesso.
//
// A identidade do chamador é validada a partir do header Authorization (token
// de sessão do PocketBase). A PocketBase JSVM executa os callbacks em um pool
// de VMs separado: por isso TODA a lógica (inclusive a validação do token) fica
// inline dentro de cada callback — nada de funções ou variáveis de topo.

routerAdd('GET', '/backend/v1/users', (e) => {
  // Validação do chamador: token do header Authorization, com ou sem "Bearer ".
  let token = ''
  try {
    token = String(e.request.header.get('Authorization') || '').trim()
  } catch (_) {
    token = ''
  }
  if (token.indexOf('Bearer ') === 0) {
    token = token.substring(7).trim()
  }
  let caller = null
  if (token) {
    try {
      const found = $app.findAuthRecordByToken(token, 'auth')
      if (found && found.collection().name === 'users') {
        caller = found
      }
    } catch (_) {
      caller = null
    }
  }
  if (!caller) {
    return e.json(401, { error: 'Sessão inválida ou expirada. Faça login novamente.' })
  }

  try {
    const records = $app.findRecordsByFilter('users', 'email != ""', '-created', 200, 0)
    const users = records.map((r) => ({
      id: r.id,
      name: r.getString('name') || '',
      email: r.getString('email'),
      created: r.getDateTime('created').string(),
    }))
    return e.json(200, { users })
  } catch (err) {
    return e.json(500, {
      error: 'Falha ao carregar a lista de usuários: ' + (err.message || String(err)),
    })
  }
})

routerAdd('POST', '/backend/v1/users', (e) => {
  // Validação do chamador: token do header Authorization, com ou sem "Bearer ".
  let token = ''
  try {
    token = String(e.request.header.get('Authorization') || '').trim()
  } catch (_) {
    token = ''
  }
  if (token.indexOf('Bearer ') === 0) {
    token = token.substring(7).trim()
  }
  let caller = null
  if (token) {
    try {
      const found = $app.findAuthRecordByToken(token, 'auth')
      if (found && found.collection().name === 'users') {
        caller = found
      }
    } catch (_) {
      caller = null
    }
  }
  if (!caller) {
    return e.json(401, { error: 'Sessão inválida ou expirada. Faça login novamente.' })
  }

  try {
    const body = e.requestInfo().body || {}
    const name = body.name ? String(body.name).trim() : ''
    const email = body.email ? String(body.email).trim().toLowerCase() : ''
    const password = body.password ? String(body.password) : ''

    if (!name || name.length < 3) {
      return e.badRequestError('Informe o nome completo do usuário (mínimo 3 caracteres).')
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return e.badRequestError('Informe um e-mail válido.')
    }
    if (password.length < 8) {
      return e.badRequestError('A senha deve ter no mínimo 8 caracteres.')
    }

    const users = $app.findCollectionByNameOrId('users')

    // E-mail duplicado → mensagem amigável em português
    try {
      $app.findAuthRecordByEmail('users', email)
      return e.json(400, { error: 'Este e-mail já está cadastrado no sistema CONCE.' })
    } catch (_) {
      // não existe — prossegue com a criação
    }

    const record = new Record(users)
    record.setEmail(email)
    record.setPassword(password)
    record.setVerified(true)
    record.set('name', name)
    $app.save(record)

    return e.json(200, {
      user: {
        id: record.id,
        name: record.getString('name'),
        email: record.getString('email'),
        created: record.getDateTime('created').string(),
      },
    })
  } catch (err) {
    const msg = String(err?.message || err || '')
    if (msg.indexOf('unique') !== -1 || msg.indexOf('email') !== -1) {
      return e.json(400, { error: 'Este e-mail já está cadastrado no sistema CONCE.' })
    }
    return e.json(500, { error: 'Falha ao criar a conta: ' + msg })
  }
})
