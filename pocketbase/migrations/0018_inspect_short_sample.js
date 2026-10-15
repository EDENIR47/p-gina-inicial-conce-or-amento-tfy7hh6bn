/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter('orcamentos', "code != ''", 'code', 100, 0)
      for (let r = 0; r < records.length; r++) {
        const rec = records[r]
        const code = rec.getString('code')
        const rawPayload = rec.getString('payload')
        if (!rawPayload) continue

        const payload = JSON.parse(rawPayload)
        const stages = payload.stages || []
        const report = []
        report.push(`[${code}] stages: ${stages.length}`)
        for (let s = 0; s < stages.length; s++) {
          const stg = stages[s]
          report.push(`  STAGE [${stg.code || s + 1}]: "${stg.name}"`)
          const svs = stg.services || []
          for (let sv = 0; sv < svs.length; sv++) {
            const service = svs[sv]
            report.push(`    SVC [${service.code}]: "${service.description}"`)
            if (service.composition) {
              const inps = service.composition.inputs || []
              for (let i = 0; i < inps.length; i++) {
                const inp = inps[i]
                report.push(`      INP [${inp.code}]: "${inp.description}"`)
              }
            }
          }
        }

        // Armazena no campo client_document que é texto e não é truncado no log
        rec.set('client_document', report.slice(0, 30).join(' || '))
        app.save(rec)
      }
    } catch (err) {
      console.log('Erro 0018:', err)
    }
  },
  (app) => {},
)
