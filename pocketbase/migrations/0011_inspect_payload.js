/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const rec = app.findFirstRecordByData('orcamentos', 'id', '6lbdkz0fdd0b26y')
    const payloadStr = rec.getString('payload')
    const payload = JSON.parse(payloadStr)
    const stages = payload.stages || []
    for (let s = 0; s < stages.length; s++) {
      const stg = stages[s]
      console.log('STAGE:', stg.code, stg.name)
      const svs = stg.services || []
      for (let i = 0; i < svs.length; i++) {
        console.log('  SVC:', svs[i].code, svs[i].description)
      }
    }
  },
  (app) => {},
)
