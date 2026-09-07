/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Atualizar nome do usuário responsável técnico oficial se existir no PocketBase
    try {
      const u = app.findAuthRecordByEmail('users', 'engedenirsouza@gmail.com')
      u.set('name', 'Eng. Edenir Souza da Rosa')
      app.save(u)
    } catch (_) {}
  },
  (app) => {
    try {
      const u = app.findAuthRecordByEmail('users', 'engedenirsouza@gmail.com')
      u.set('name', 'Eng. Edenir Souza')
      app.save(u)
    } catch (_) {}
  },
)
