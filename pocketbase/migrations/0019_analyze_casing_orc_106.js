/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      const rec = app.findFirstRecordByData('orcamentos', 'code', 'ORC-2026-106')
      const rawPayload = rec.getString('payload')
      if (!rawPayload) return

      const payload = JSON.parse(rawPayload)
      const stages = payload.stages || []

      const allItems = []
      for (let s = 0; s < stages.length; s++) {
        const stg = stages[s]
        allItems.push({ type: 'STAGE', code: stg.code, text: stg.name })
        const svs = stg.services || []
        for (let sv = 0; sv < svs.length; sv++) {
          const service = svs[sv]
          allItems.push({ type: 'SVC', code: service.code, text: service.description })
          if (service.composition) {
            if (service.composition.description) {
              allItems.push({
                type: 'COMP',
                code: service.composition.code,
                text: service.composition.description,
              })
            }
            const inps = service.composition.inputs || []
            for (let i = 0; i < inps.length; i++) {
              allItems.push({ type: 'INP', code: inps[i].code, text: inps[i].description })
            }
          }
        }
      }

      // Vamos contar estatísticas de caixa:
      // total UPPERCASE, total LOWERCASE, total Title/Mixed Case
      let upperCount = 0
      let lowerCount = 0
      let mixedCount = 0

      for (let i = 0; i < allItems.length; i++) {
        const t = (allItems[i].text || '').trim()
        if (!t) continue
        if (t === t.toUpperCase() && /[A-Z]/.test(t)) {
          upperCount++
        } else if (t === t.toLowerCase() && /[a-z]/.test(t)) {
          lowerCount++
        } else {
          mixedCount++
        }
      }

      // Amostra de mixed e upper
      const mixedSample = allItems
        .filter((x) => {
          const t = (x.text || '').trim()
          return t !== t.toUpperCase() && t !== t.toLowerCase()
        })
        .slice(0, 10)
        .map((x) => `[${x.type} ${x.code}] ${x.text}`)

      const upperSample = allItems
        .filter((x) => {
          const t = (x.text || '').trim()
          return t === t.toUpperCase() && /[A-Z]/.test(t)
        })
        .slice(0, 5)
        .map((x) => `[${x.type} ${x.code}] ${x.text}`)

      const summary = `TOTAL: ${allItems.length} | UPPER: ${upperCount} | LOWER: ${lowerCount} | MIXED: ${mixedCount} || MIXED_EX: ${mixedSample.join(' ;; ')} || UPPER_EX: ${upperSample.join(' ;; ')}`
      rec.set('client_document', summary.slice(0, 450))
      app.save(rec)
    } catch (err) {
      console.log('Erro 0019:', err)
    }
  },
  (app) => {},
)
