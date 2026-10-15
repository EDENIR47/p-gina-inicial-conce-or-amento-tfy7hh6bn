/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      // 1. Função de padronização para CAIXA ALTA preservando grafias específicas
      function standardizeItemDescription(desc) {
        if (!desc || typeof desc !== 'string') return ''
        var trimmed = desc.trim().replace(/\s+/g, ' ')
        if (!trimmed) return ''

        // Converter para CAIXA ALTA
        var upper = trimmed.toUpperCase()

        // Regras específicas de vocabulário e grafias protegidas:
        // a. "CALIÇÃO" -> "CALIÇA" (regra de ouro)
        upper = upper.replace(/CALI[ÇC][ÃA]O/g, 'CALIÇA')

        // b. Preservar marca real "AUCATEX" (mesmo se vier com variações)
        upper = upper.replace(/\bAUCATEX\b/g, 'AUCATEX')

        // c. "ENCARREGADO DE OBRA" -> "ENCARREGADO DA OBRA"
        upper = upper.replace(/\bENCARREGAD[OA]S?\s+(?:DE\s+)?OBRA\b/g, 'ENCARREGADO DA OBRA')

        // d. "CAÇAMBA(S) DE ENTULHO" -> "CAÇAMBA(S) DE ENTULHOS"
        upper = upper.replace(/\bCA[ÇC]AMBAS\s+(?:DE\s+)?ENTULHOS?\b/g, 'CAÇAMBAS DE ENTULHOS')
        upper = upper.replace(/\bCA[ÇC]AMBA\s+(?:DE\s+)?ENTULHOS?\b/g, 'CAÇAMBA DE ENTULHOS')

        // e. "SACOS DE RÁFIA" -> "SACO DE RÁFIA"
        upper = upper.replace(/\bSACOS\s+DE\s+R[AÁ]FIAS?\b/g, 'SACO DE RÁFIA')
        upper = upper.replace(/\bSACO\s+DE\s+RAFIA\b/g, 'SACO DE RÁFIA')

        // f. "CAROINTEIRO" -> "CARPINTEIRO"
        upper = upper.replace(/\bCAROIN+TEIR([OA]S?)\b/g, function (_, s) {
          return 'CARPINTEIR' + s
        })

        return upper
      }

      // 2. Restaurar client_document nos orçamentos que foram temporariamente preenchidos com log de inspeção
      // Mapeamento de documentos reais conhecidos por código:
      var realDocuments = {
        'ORC-2026-104': '0365580056',
        'ORC-2026-107': '03027907484',
      }

      var records = app.findRecordsByFilter('orcamentos', "code != ''", 'code', 100, 0)
      var totalNormalizedCount = 0
      var orcamentosModified = []

      for (var r = 0; r < records.length; r++) {
        var rec = records[r]
        var code = rec.getString('code')
        var rawPayload = rec.getString('payload')
        if (!rawPayload) continue

        var payload = JSON.parse(rawPayload)
        var changed = false
        var budgetChangeCount = 0

        // Restaurar client_document se estiver com string de inspeção
        var currentDoc = rec.getString('client_document') || ''
        if (
          currentDoc.indexOf('TOTAL:') !== -1 ||
          currentDoc.indexOf('||') !== -1 ||
          currentDoc.indexOf('stages:') !== -1
        ) {
          var restoredDoc = realDocuments[code] || ''
          rec.set('client_document', restoredDoc)
          changed = true
        }

        // Limpar work_data._inspection_log se existir
        var rawWorkData = rec.getString('work_data')
        if (rawWorkData) {
          try {
            var wd = JSON.parse(rawWorkData)
            if (wd && wd._inspection_log) {
              delete wd._inspection_log
              rec.set('work_data', JSON.stringify(wd))
              changed = true
            }
          } catch (_) {}
        }

        // Percorrer stages -> services -> composition -> inputs
        if (Array.isArray(payload.stages)) {
          for (var s = 0; s < payload.stages.length; s++) {
            var stage = payload.stages[s]
            if (!stage) continue

            // Padronizar nome da etapa
            if (typeof stage.name === 'string' && stage.name.trim()) {
              var oldStageName = stage.name
              var newStageName = standardizeItemDescription(stage.name)
              if (newStageName !== oldStageName) {
                stage.name = newStageName
                changed = true
                budgetChangeCount++
              }
            }

            if (Array.isArray(stage.services)) {
              for (var sv = 0; sv < stage.services.length; sv++) {
                var service = stage.services[sv]
                if (!service) continue

                // Padronizar descrição do serviço
                if (typeof service.description === 'string' && service.description.trim()) {
                  var oldServiceDesc = service.description
                  var newServiceDesc = standardizeItemDescription(service.description)
                  if (newServiceDesc !== oldServiceDesc) {
                    service.description = newServiceDesc
                    changed = true
                    budgetChangeCount++
                  }
                }

                // Padronizar composição associada se houver
                if (service.composition) {
                  if (
                    typeof service.composition.description === 'string' &&
                    service.composition.description.trim()
                  ) {
                    var oldCompDesc = service.composition.description
                    var newCompDesc = standardizeItemDescription(service.composition.description)
                    if (newCompDesc !== oldCompDesc) {
                      service.composition.description = newCompDesc
                      changed = true
                      budgetChangeCount++
                    }
                  }

                  if (
                    typeof service.composition.name === 'string' &&
                    service.composition.name.trim()
                  ) {
                    var oldCompName = service.composition.name
                    var newCompName = standardizeItemDescription(service.composition.name)
                    if (newCompName !== oldCompName) {
                      service.composition.name = newCompName
                      changed = true
                      budgetChangeCount++
                    }
                  }

                  // Insumos da composição
                  if (Array.isArray(service.composition.inputs)) {
                    for (var inp = 0; inp < service.composition.inputs.length; inp++) {
                      var input = service.composition.inputs[inp]
                      if (!input) continue

                      if (typeof input.description === 'string' && input.description.trim()) {
                        var oldInpDesc = input.description
                        var newInpDesc = standardizeItemDescription(input.description)
                        if (newInpDesc !== oldInpDesc) {
                          input.description = newInpDesc
                          changed = true
                          budgetChangeCount++
                        }
                      }
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
          orcamentosModified.push(code + ' (' + budgetChangeCount + ' itens)')
          totalNormalizedCount += budgetChangeCount
        }
      }

      console.log(
        'Migração 0020 concluída. Total de descrições normalizadas:',
        totalNormalizedCount,
        'Orçamentos:',
        orcamentosModified.join(', '),
      )
    } catch (err) {
      console.log('Erro na migração 0020_standardize_item_descriptions:', err)
    }
  },
  (app) => {},
)
