/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Função auxiliar para verificar descrição normalizada de caçamba de entulho
    function isCacamba(desc) {
      if (!desc || typeof desc !== 'string') return false
      // Normalização sem acentos manual (goja compatível)
      var norm = desc
        .toLowerCase()
        .replace(/[áàâãä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôõö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[ç]/g, 'c')

      var hasCacamba = /\bcacambas?\b/.test(norm)
      var hasEntulho = /\bentulhos?\b/.test(norm)
      return hasCacamba && hasEntulho
    }

    // 1. Percorrer orcamentos.payload (stages -> services -> composition -> inputs)
    try {
      var orcamentosRecords = app.findRecordsByFilter('orcamentos', '', '-created', 500, 0)
      for (var i = 0; i < orcamentosRecords.length; i++) {
        var rec = orcamentosRecords[i]
        var rawPayload = rec.getString('payload')
        if (!rawPayload) continue

        var payload
        try {
          payload = JSON.parse(rawPayload)
        } catch (_) {
          continue
        }

        if (!payload || !Array.isArray(payload.stages)) continue

        var changed = false
        for (var s = 0; s < payload.stages.length; s++) {
          var stage = payload.stages[s]
          if (!stage || !Array.isArray(stage.services)) continue

          for (var sv = 0; sv < stage.services.length; sv++) {
            var service = stage.services[sv]
            if (!service || !service.composition || !Array.isArray(service.composition.inputs)) {
              continue
            }

            for (var inpIdx = 0; inpIdx < service.composition.inputs.length; inpIdx++) {
              var input = service.composition.inputs[inpIdx]
              if (!input) continue

              if (
                isCacamba(input.description) &&
                (input.category === 'material' || !input.category)
              ) {
                // Preservar estritamente id, code, unit, coefficient, unitCost, source, sourceStatus
                input.category = 'servico_terceiro'
                changed = true
              }
            }
          }
        }

        if (changed) {
          rec.set('payload', JSON.stringify(payload))
          app.save(rec)
        }
      }
    } catch (err) {
      console.log('Aviso ao reclassificar orcamentos:', err)
    }

    // 2. Percorrer colecao composicoes (inputs JSON)
    try {
      var composicoesRecords = app.findRecordsByFilter('composicoes', '', '-created', 500, 0)
      for (var j = 0; j < composicoesRecords.length; j++) {
        var compRec = composicoesRecords[j]
        var rawInputs = compRec.getString('inputs')
        if (!rawInputs) continue

        var inputs
        try {
          inputs = JSON.parse(rawInputs)
        } catch (_) {
          continue
        }

        if (!Array.isArray(inputs)) continue

        var compChanged = false
        for (var k = 0; k < inputs.length; k++) {
          var cInp = inputs[k]
          if (!cInp) continue

          if (isCacamba(cInp.description) && (cInp.category === 'material' || !cInp.category)) {
            cInp.category = 'servico_terceiro'
            compChanged = true
          }
        }

        if (compChanged) {
          compRec.set('inputs', JSON.stringify(inputs))
          app.save(compRec)
        }
      }
    } catch (err2) {
      console.log('Aviso ao reclassificar composicoes:', err2)
    }
  },
  (app) => {
    // Rollback não destrutivo (reclassificação de volta não necessária/idempotente)
  },
)
