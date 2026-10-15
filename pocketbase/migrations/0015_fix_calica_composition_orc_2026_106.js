/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      const rec = app.findFirstRecordByData('orcamentos', 'id', '6lbdkz0fdd0b26y')
      const rawPayload = rec.getString('payload')
      if (!rawPayload) return

      let payload = JSON.parse(rawPayload)
      let changed = false

      // Função auxiliar recursiva para substituir CALIÇÃO por CALIÇA em strings
      function replaceCalicao(val) {
        if (typeof val === 'string' && /CALIÇÃO/i.test(val)) {
          return val
            .replace(/CALIÇÃO/g, 'CALIÇA')
            .replace(/Calição/g, 'Caliça')
            .replace(/calição/g, 'caliça')
        }
        return val
      }

      // Percorrer etapas e serviços do payload
      if (Array.isArray(payload.stages)) {
        for (let s = 0; s < payload.stages.length; s++) {
          const stage = payload.stages[s]
          if (!stage) continue

          const oldStageName = stage.name
          stage.name = replaceCalicao(stage.name)
          if (stage.name !== oldStageName) changed = true

          if (Array.isArray(stage.services)) {
            for (let sv = 0; sv < stage.services.length; sv++) {
              const service = stage.services[sv]
              if (!service) continue

              const oldDesc = service.description
              service.description = replaceCalicao(service.description)
              if (service.description !== oldDesc) changed = true

              const oldNotes = service.notes
              service.notes = replaceCalicao(service.notes)
              if (service.notes !== oldNotes) changed = true

              if (service.composition) {
                const oldCompDesc = service.composition.description
                service.composition.description = replaceCalicao(service.composition.description)
                if (service.composition.description !== oldCompDesc) changed = true

                const oldCompName = service.composition.name
                service.composition.name = replaceCalicao(service.composition.name)
                if (service.composition.name !== oldCompName) changed = true

                if (Array.isArray(service.composition.inputs)) {
                  for (let inp = 0; inp < service.composition.inputs.length; inp++) {
                    const input = service.composition.inputs[inp]
                    if (!input) continue
                    const oldInpDesc = input.description
                    input.description = replaceCalicao(input.description)
                    if (input.description !== oldInpDesc) changed = true
                  }
                }
              }
            }
          }
        }
      }

      if (changed) {
        rec.set('payload', JSON.stringify(payload))
        app.save(rec)
      }
    } catch (err) {
      console.log('Erro na migração 0015_fix_calica_composition_orc_2026_106:', err)
    }
  },
  (app) => {
    // Reversão não necessária / idempotente
  },
)
