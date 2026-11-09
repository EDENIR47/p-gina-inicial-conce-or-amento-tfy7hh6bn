// DIAGNÓSTICO TEMPORÁRIO (v0.0.160) — intercepta POST /api/collections/users/records
// para provar por que a requisição do navegador recebe 400 "Failed to create
// record." sem field errors, enquanto a mesma chamada server-side funciona.
// REMOVER ao final do diagnóstico (critério de aceitação nº 5).

onRecordCreateRequest((e) => {
  const isUsers = e.record && e.record.collection().name === 'users'
  if (!isUsers) {
    e.next()
    return
  }

  let hasAuthHeader = false
  let tokenPreview = ''
  try {
    const raw = String(e.request.header.get('Authorization') || '').trim()
    if (raw) {
      hasAuthHeader = true
      tokenPreview = raw.substring(0, 12) + '...(' + String(raw.length) + ' chars)'
    }
  } catch (_) {
    hasAuthHeader = false
  }

  let authState = 'guest'
  let authId = ''
  try {
    if (e.auth && e.auth.id) {
      authState = 'authenticated'
      authId = e.auth.id
    }
  } catch (_) {
    authState = 'unknown'
  }

  let bodyDump = ''
  try {
    const info = e.requestInfo()
    const body = (info && info.body) || {}
    const safe = {}
    for (const k in body) {
      if (k === 'password' || k === 'passwordConfirm' || k === 'oldPassword') {
        safe[k] = '[redacted len=' + String(String(body[k]).length) + ']'
      } else {
        safe[k] = body[k]
      }
    }
    bodyDump = JSON.stringify(safe)
  } catch (err) {
    bodyDump = 'body-unavailable: ' + (err.message || String(err))
  }

  console.log(
    '[debug-user-create] POST users/records | hasAuthHeader=' +
      hasAuthHeader +
      ' | token=' +
      (tokenPreview || 'none') +
      ' | authState=' +
      authState +
      (authId ? ' | authId=' + authId : '') +
      ' | body=' +
      bodyDump,
  )

  if (authState !== 'authenticated') {
    console.log(
      "[debug-user-create] REGRAS: create exige @request.auth.id != '', mas o request chegou SEM usuario autenticado — este e o 400 generico 'Failed to create record.' sem field data.",
    )
  }

  e.next()
}, 'users')
