/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      const rec = app.findFirstRecordByData('orcamentos', 'id', '6lbdkz0fdd0b26y')
      const rawPayload = rec.getString('payload')
      if (!rawPayload) return

      let payload = JSON.parse(rawPayload)
      let changed = false

      // 1. Correção na descrição geral da obra: "nomas" -> "normas"
      if (payload.work && typeof payload.work.description === 'string') {
        const originalWorkDesc = payload.work.description
        const correctedWorkDesc = originalWorkDesc.replace(/\bnomas\b/g, 'normas')
        if (correctedWorkDesc !== originalWorkDesc) {
          payload.work.description = correctedWorkDesc
          changed = true
        }
      }

      // Também no campo work_data do registro se existir
      const rawWorkData = rec.getString('work_data')
      if (rawWorkData) {
        try {
          const wd = JSON.parse(rawWorkData)
          if (wd && typeof wd.description === 'string' && wd.description.includes('nomas')) {
            wd.description = wd.description.replace(/\bnomas\b/g, 'normas')
            rec.set('work_data', JSON.stringify(wd))
            changed = true
          }
        } catch (_) {}
      }

      // 2. Percorrer etapas e serviços do payload
      if (Array.isArray(payload.stages)) {
        for (let s = 0; s < payload.stages.length; s++) {
          const stage = payload.stages[s]
          if (!stage) continue

          // Correção no nome da etapa 08: "INFRAESTRUTURA" -> "infraestrutura"
          if (typeof stage.name === 'string' && stage.name.includes('INFRAESTRUTURA')) {
            stage.name = stage.name.replace(/INFRAESTRUTURA/g, 'infraestrutura')
            changed = true
          }

          if (Array.isArray(stage.services)) {
            for (let sv = 0; sv < stage.services.length; sv++) {
              const service = stage.services[sv]
              if (!service || typeof service.description !== 'string') continue

              // Correção na descrição do serviço: "QUEBRA MANUALMENTE DE PISO" -> "QUEBRA MANUAL DE PISO"
              if (service.description.includes('QUEBRA MANUALMENTE DE PISO')) {
                service.description = service.description.replace(
                  /QUEBRA MANUALMENTE DE PISO/g,
                  'QUEBRA MANUAL DE PISO',
                )
                changed = true
              }

              // Correção caso haja INFRAESTRUTURA em descrições de serviço
              if (service.description.includes('INFRAESTRUTURA')) {
                service.description = service.description.replace(
                  /INFRAESTRUTURA/g,
                  'infraestrutura',
                )
                changed = true
              }

              // Correção caso haja "nomas" em descrições ou notas de serviço
              if (/\bnomas\b/.test(service.description)) {
                service.description = service.description.replace(/\bnomas\b/g, 'normas')
                changed = true
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
      console.log('Erro na migração 0012_fix_typos_orc_2026_106:', err)
    }
  },
  (app) => {
    // Reversão não necessária / idempotente
  },
)
