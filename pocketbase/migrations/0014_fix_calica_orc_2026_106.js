/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      const rec = app.findFirstRecordByData('orcamentos', 'id', '6lbdkz0fdd0b26y')
      const rawPayload = rec.getString('payload')
      if (!rawPayload) return

      let payload = JSON.parse(rawPayload)
      let changed = false

      // Percorrer etapas e serviços do payload
      if (Array.isArray(payload.stages)) {
        for (let s = 0; s < payload.stages.length; s++) {
          const stage = payload.stages[s]
          if (!stage) continue

          // Substituir se estiver no nome da etapa
          if (typeof stage.name === 'string' && /CALIÇÃO/i.test(stage.name)) {
            stage.name = stage.name
              .replace(/CALIÇÃO/g, 'CALIÇA')
              .replace(/Calição/g, 'Caliça')
              .replace(/calição/g, 'caliça')
            changed = true
          }

          if (Array.isArray(stage.services)) {
            for (let sv = 0; sv < stage.services.length; sv++) {
              const service = stage.services[sv]
              if (!service) continue

              // Substituir na descrição do serviço
              if (typeof service.description === 'string' && /CALIÇÃO/i.test(service.description)) {
                service.description = service.description
                  .replace(/CALIÇÃO/g, 'CALIÇA')
                  .replace(/Calição/g, 'Caliça')
                  .replace(/calição/g, 'caliça')
                changed = true
              }

              // Substituir em notas se houver
              if (typeof service.notes === 'string' && /CALIÇÃO/i.test(service.notes)) {
                service.notes = service.notes
                  .replace(/CALIÇÃO/g, 'CALIÇA')
                  .replace(/Calição/g, 'Caliça')
                  .replace(/calição/g, 'caliça')
                changed = true
              }

              // Substituir em insumos da composição se houver
              if (service.composition && Array.isArray(service.composition.inputs)) {
                for (let inp = 0; inp < service.composition.inputs.length; inp++) {
                  const input = service.composition.inputs[inp]
                  if (
                    input &&
                    typeof input.description === 'string' &&
                    /CALIÇÃO/i.test(input.description)
                  ) {
                    input.description = input.description
                      .replace(/CALIÇÃO/g, 'CALIÇA')
                      .replace(/Calição/g, 'Caliça')
                      .replace(/calição/g, 'caliça')
                    changed = true
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
      console.log('Erro na migração 0014_fix_calica_orc_2026_106:', err)
    }
  },
  (app) => {
    // Reversão não necessária / idempotente
  },
)
