/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      const rec = app.findFirstRecordByData('orcamentos', 'code', 'ORC-2026-106')
      const rawPayload = rec.getString('payload')
      if (!rawPayload) return

      const payload = JSON.parse(rawPayload)
      const stages = payload.stages || []

      const report = []
      report.push('=== ORC-2026-106 REPORT ===')
      for (let s = 0; s < stages.length; s++) {
        const stg = stages[s]
        report.push(`STAGE [${stg.code || s + 1}]: "${stg.name}"`)
        const svs = stg.services || []
        for (let sv = 0; sv < svs.length; sv++) {
          const service = svs[sv]
          report.push(
            `  SVC [${service.code}]: "${service.description}" (unit: ${service.unit}, qty: ${service.quantity}, price: ${service.unitPrice})`,
          )
          if (service.composition) {
            if (
              service.composition.description &&
              service.composition.description !== service.description
            ) {
              report.push(`    COMP_DESC: "${service.composition.description}"`)
            }
            const inps = service.composition.inputs || []
            for (let i = 0; i < inps.length; i++) {
              const inp = inps[i]
              report.push(
                `    INP [${inp.code}]: "${inp.description}" (unit: ${inp.unit}, coef: ${inp.coefficient}, cost: ${inp.unitCost})`,
              )
            }
          }
        }
      }

      // Gravamos temporariamente no campo notes de um registro de teste ou no próprio payload.descriptionInspection
      // Ou melhor: no work_data.inspection_log
      const rawWorkData = rec.getString('work_data')
      const workData = rawWorkData ? JSON.parse(rawWorkData) : {}
      workData._inspection_log = report.join('\n')
      rec.set('work_data', JSON.stringify(workData))
      app.save(rec)
    } catch (err) {
      console.log('Erro 0017:', err)
    }
  },
  (app) => {},
)
