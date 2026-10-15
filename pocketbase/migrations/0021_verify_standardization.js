/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter('orcamentos', "code != ''", 'code', 100, 0)
      const results = []
      for (let r = 0; r < records.length; r++) {
        const rec = records[r]
        const code = rec.getString('code')
        const rawPayload = rec.getString('payload')
        if (!rawPayload) continue
        const payload = JSON.parse(rawPayload)
        const stages = payload.stages || []
        let upperCount = 0
        let nonUpperCount = 0
        let hasCalicao = false
        let hasAucatex = false
        let hasCalica = false

        for (let s = 0; s < stages.length; s++) {
          const stg = stages[s]
          const checkText = (t) => {
            if (!t || typeof t !== 'string') return
            if (t === t.toUpperCase()) upperCount++
            else nonUpperCount++
            if (/CALI[ÇC][ÃA]O/i.test(t)) hasCalicao = true
            if (/CALI[ÇC]A/i.test(t)) hasCalica = true
            if (/AUCATEX/i.test(t)) hasAucatex = true
          }

          checkText(stg.name)
          const svs = stg.services || []
          for (let sv = 0; sv < svs.length; sv++) {
            const service = svs[sv]
            checkText(service.description)
            if (service.composition) {
              checkText(service.composition.description)
              checkText(service.composition.name)
              const inps = service.composition.inputs || []
              for (let i = 0; i < inps.length; i++) {
                checkText(inps[i].description)
              }
            }
          }
        }

        results.push(
          `${code}: U=${upperCount}, NonU=${nonUpperCount}, Caliçao=${hasCalicao}, Caliço=${hasCalica}, Aucatex=${hasAucatex}`,
        )
      }

      // Gravamos esse relatório no primeiro registro para ler se necessário
      const first = records[0]
      if (first) {
        // Apenas como log interno
        console.log('VERIFICATION RESULTS:', results.join(' | '))
      }
    } catch (err) {
      console.log('Erro 0021:', err)
    }
  },
  (app) => {},
)
