/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter('orcamentos', "code != ''", 'code', 100, 0)
      console.log('=== INSPECTION OF ALL ORCAMENTOS === total: ' + records.length)
      for (let r = 0; r < records.length; r++) {
        const rec = records[r]
        const code = rec.getString('code')
        const rawPayload = rec.getString('payload')
        if (!rawPayload) {
          console.log(`[${code}] NO PAYLOAD`)
          continue
        }
        const payload = JSON.parse(rawPayload)
        const stages = payload.stages || []
        console.log(`\n================== [${code}] stages: ${stages.length} ==================`)
        for (let s = 0; s < stages.length; s++) {
          const stg = stages[s]
          console.log(`  STAGE ${stg.code || s + 1}: "${stg.name}"`)
          const svs = stg.services || []
          for (let sv = 0; sv < svs.length; sv++) {
            const service = svs[sv]
            console.log(`    SVC ${service.code}: "${service.description}"`)
            if (service.composition) {
              if (
                service.composition.description &&
                service.composition.description !== service.description
              ) {
                console.log(`      COMP DESC: "${service.composition.description}"`)
              }
              const inps = service.composition.inputs || []
              for (let i = 0; i < inps.length; i++) {
                const inp = inps[i]
                console.log(`        INP ${inp.code}: "${inp.description}"`)
              }
            }
          }
        }
      }
    } catch (err) {
      console.log('Erro na inspeção 0016:', err)
    }
  },
  (app) => {},
)
