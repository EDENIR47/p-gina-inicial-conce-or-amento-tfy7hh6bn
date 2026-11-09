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

// Rota de EXCLUSÃO de conta — DELETE /backend/v1/users/{id}.
// A regra delete da coleção "users" é restrita ao próprio registro, então a
// exclusão de terceiros passa por aqui: a rota valida a SESSÃO do chamador
// (header Authorization) e só então apaga com poderes de superuser. O chamador
// NUNCA pode excluir a própria conta por esta rota. Nenhum relaxamento da
// regra delete padrão da coleção.
routerAdd('DELETE', '/backend/v1/users/{id}', (e) => {
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
    const targetId = e.request.pathValue('id') || ''
    let target = null
    try {
      const rec = $app.findRecordById('users', targetId)
      if (rec && rec.collection().name === 'users') {
        target = rec
      }
    } catch (_) {
      target = null
    }
    if (!target) {
      return e.json(404, { error: 'Usuário não encontrado no sistema CONCE.' })
    }

    if (target.id === caller.id) {
      return e.json(400, {
        error: 'Você não pode excluir a própria conta por aqui. Use outro usuário para isso.',
      })
    }

    $app.delete(target)
    return e.json(200, { ok: true })
  } catch (err) {
    return e.json(500, {
      error: 'Falha ao excluir a conta: ' + String(err?.message || err || ''),
    })
  }
})

// Rota de EDIÇÃO de conta (nome, e-mail e/ou troca de senha) — PATCH /backend/v1/users/{id}.
// A regra update da coleção "users" é restrita ao próprio registro, então a
// edição de terceiros passa por aqui: a rota valida a SESSÃO do chamador
// (header Authorization) e só então grava com poderes de superuser. Nenhum
// relaxamento da regra update padrão da coleção.
routerAdd('PATCH', '/backend/v1/users/{id}', (e) => {
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
    const targetId = e.request.pathValue('id') || ''
    let target = null
    try {
      const rec = $app.findRecordById('users', targetId)
      if (rec && rec.collection().name === 'users') {
        target = rec
      }
    } catch (_) {
      target = null
    }
    if (!target) {
      return e.json(404, { error: 'Usuário não encontrado no sistema CONCE.' })
    }

    const body = e.requestInfo().body || {}
    const newName = body.name !== undefined ? String(body.name).trim() : undefined
    const newEmail = body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined
    const newPassword = body.password !== undefined ? String(body.password) : undefined

    const hasName = newName !== undefined
    const hasEmail = newEmail !== undefined
    const hasPassword = newPassword !== undefined && newPassword !== ''
    if (!hasName && !hasEmail && !hasPassword) {
      return e.badRequestError('Nada a atualizar: informe nome, e-mail e/ou nova senha.')
    }

    if (hasName && newName.length < 3) {
      return e.badRequestError('Informe o nome completo do usuário (mínimo 3 caracteres).')
    }
    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return e.badRequestError('Informe um e-mail válido.')
    }
    if (hasPassword && newPassword.length < 8) {
      return e.badRequestError('A senha deve ter no mínimo 8 caracteres.')
    }

    // E-mail duplicado: verifica antes de gravar, para mensagem amigável em português.
    if (hasEmail && newEmail !== target.getString('email')) {
      try {
        $app.findAuthRecordByEmail('users', newEmail)
        return e.json(400, { error: 'Este e-mail já está cadastrado no sistema CONCE.' })
      } catch (_) {
        // não existe — pode usar
      }
    }

    if (hasName) {
      target.set('name', newName)
    }
    if (hasEmail) {
      target.setEmail(newEmail)
    }
    if (hasPassword) {
      target.setPassword(newPassword)
      // Ao trocar a senha o tokenKey do registro muda: os tokens de sessão
      // antigos do colaborador deixam de valer e ele precisará logar com a
      // senha nova. A senha atual NUNCA sai do servidor.
    }
    $app.save(target)

    return e.json(200, {
      user: {
        id: target.id,
        name: target.getString('name'),
        email: target.getString('email'),
        created: target.getDateTime('created').string(),
      },
    })
  } catch (err) {
    const msg = String(err?.message || err || '')
    if (msg.indexOf('unique') !== -1) {
      return e.json(400, { error: 'Este e-mail já está cadastrado no sistema CONCE.' })
    }
    if (msg.indexOf('email') !== -1 && msg.indexOf('valid') !== -1) {
      return e.json(400, { error: 'Informe um e-mail válido.' })
    }
    if (msg.indexOf('password') !== -1 && msg.indexOf('8') !== -1) {
      return e.json(400, { error: 'A senha deve ter no mínimo 8 caracteres.' })
    }
    return e.json(500, { error: 'Falha ao salvar as alterações da conta: ' + msg })
  }
})
