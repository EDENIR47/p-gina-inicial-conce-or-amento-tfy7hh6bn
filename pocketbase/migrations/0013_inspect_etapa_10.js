/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      const rec = app.findFirstRecordByData('orcamentos', 'id', '6lbdkz0fdd0b26y')
      const rawPayload = rec.getString('payload')
      if (!rawPayload) return

      let payload = JSON.parse(rawPayload)
      const stages = payload.stages || []
      for (let s = 0; s < stages.length; s++) {
        const stg = stages[s]
        if (!stg) continue
        console.log(`[STAGE_${s + 1}] order=${stg.order} code=${stg.code} name=${stg.name}`)
        const svs = stg.services || []
        for (let sv = 0; sv < svs.length; sv++) {
          const service = svs[sv]
          if (!service) continue
          console.log(`  [SVC_${sv + 1}] code=${service.code} desc=${service.description}`)
          if (
            service.description &&
            (service.description.includes('CALI') || service.description.includes('cali'))
          ) {
            console.log(`    >>> MATCHED CALI in service: ${service.description}`)
          }
        }
      }
    } catch (err) {
      console.log('Erro na migracao 0013_inspect_etapa_10:', err)
    }
  },
  (app) => {},
)
