// Hook para deduplicar orçamentos na coleção orcamentos.
// Permite que qualquer usuário autenticado dispare a deduplicação
// ou via token POCKETBASE_ADMIN_TOKEN.
// Mantém o registro com 'updated' mais recente para cada código/local_id
// e exclui com privilégio de admin as duplicatas mais antigas.

routerAdd('POST', '/backend/v1/dedupe-orcamentos', (e) => {
  const adminSecret = $os.getenv('POCKETBASE_ADMIN_TOKEN')
  const authHeader = e.request.header.get('Authorization') || ''
  const isSecretMatch = adminSecret && authHeader === `Bearer ${adminSecret}`
  const isAuthUser = Boolean(e.auth)

  if (!isSecretMatch && !isAuthUser) {
    return e.json(401, { error: 'Não autorizado. Autenticação requerida.' })
  }

  try {
    const app = e.app
    const records = app.findRecordsByFilter('orcamentos', '1 = 1', '-updated', 500, 0)

    const seenKeys = new Map()
    const duplicatesToDelete = []

    for (let i = 0; i < records.length; i++) {
      const rec = records[i]
      const key = (rec.getString('local_id') || '').trim() || (rec.getString('code') || '').trim()
      if (!key) continue

      if (!seenKeys.has(key)) {
        seenKeys.set(key, rec)
      } else {
        duplicatesToDelete.push(rec)
      }
    }

    const keptByCode = new Map()
    const extraDuplicates = []

    seenKeys.forEach((rec) => {
      const code = (rec.getString('code') || '').trim()
      if (!code) return
      if (!keptByCode.has(code)) {
        keptByCode.set(code, rec)
      } else {
        const existing = keptByCode.get(code)
        const existingUpdated = existing.getDateTime('updated').time()
        const currentUpdated = rec.getDateTime('updated').time()
        if (currentUpdated > existingUpdated) {
          extraDuplicates.push(existing)
          keptByCode.set(code, rec)
        } else {
          extraDuplicates.push(rec)
        }
      }
    })

    const allToDelete = duplicatesToDelete.concat(extraDuplicates)
    const deletedIds = []
    const errors = []

    for (let j = 0; j < allToDelete.length; j++) {
      const rec = allToDelete[j]
      const recId = rec.id
      if (deletedIds.indexOf(recId) !== -1) continue
      try {
        app.delete(rec)
        deletedIds.push(recId)
      } catch (err) {
        errors.push({ id: recId, error: String(err) })
      }
    }

    return e.json(200, {
      success: true,
      totalRecords: records.length,
      deletedDuplicatesCount: deletedIds.length,
      deletedIds: deletedIds,
      errors: errors,
    })
  } catch (err) {
    return e.json(500, {
      success: false,
      error: String(err),
    })
  }
})

// Também roda na inicialização do app (onBootstrap) para limpar imediatamente
onBootstrap((e) => {
  e.next()
  try {
    const app = e.app
    const records = app.findRecordsByFilter('orcamentos', '1 = 1', '-updated', 500, 0)

    const seenKeys = new Map()
    const duplicatesToDelete = []

    for (let i = 0; i < records.length; i++) {
      const rec = records[i]
      const key = (rec.getString('local_id') || '').trim() || (rec.getString('code') || '').trim()
      if (!key) continue

      if (!seenKeys.has(key)) {
        seenKeys.set(key, rec)
      } else {
        duplicatesToDelete.push(rec)
      }
    }

    const keptByCode = new Map()
    const extraDuplicates = []

    seenKeys.forEach((rec) => {
      const code = (rec.getString('code') || '').trim()
      if (!code) return
      if (!keptByCode.has(code)) {
        keptByCode.set(code, rec)
      } else {
        const existing = keptByCode.get(code)
        const existingUpdated = existing.getDateTime('updated').time()
        const currentUpdated = rec.getDateTime('updated').time()
        if (currentUpdated > existingUpdated) {
          extraDuplicates.push(existing)
          keptByCode.set(code, rec)
        } else {
          extraDuplicates.push(rec)
        }
      }
    })

    const allToDelete = duplicatesToDelete.concat(extraDuplicates)
    const deletedIds = []

    for (let j = 0; j < allToDelete.length; j++) {
      const rec = allToDelete[j]
      const recId = rec.id
      if (deletedIds.indexOf(recId) !== -1) continue
      try {
        app.delete(rec)
        deletedIds.push(recId)
      } catch (err) {
        // ignore
      }
    }

    if (deletedIds.length > 0) {
      console.log(
        `[dedupe-orcamentos onBootstrap] Removidos ${deletedIds.length} registros duplicados de orcamentos.`,
      )
    }
  } catch (err) {
    console.error('[dedupe-orcamentos onBootstrap] Erro:', err)
  }
})
