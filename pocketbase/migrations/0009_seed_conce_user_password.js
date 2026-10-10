/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Idempotente: se já existir a senha para o usuário inicial, ok; senão define/garante
    try {
      const user = app.findAuthRecordByEmail('users', 'engedenirsouza@gmail.com')
      user.setPassword('conce123')
      user.setVerified(true)
      user.set('name', 'Eng. Edenir Souza da Rosa')
      app.save(user)
    } catch (_) {
      // Se o usuário não existir, cria-o
      try {
        const usersCol = app.findCollectionByNameOrId('users')
        const record = new Record(usersCol)
        record.setEmail('engedenirsouza@gmail.com')
        record.setPassword('conce123')
        record.setVerified(true)
        record.set('name', 'Eng. Edenir Souza da Rosa')
        app.save(record)
      } catch (_) {}
    }
  },
  (app) => {
    // down migration
  },
)
