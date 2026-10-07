routerAdd('POST', '/backend/v1/improve-service-description', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const description = body.description ? String(body.description).trim() : ''

    if (!description || description.length < 2) {
      return e.badRequestError('A descrição atual do serviço deve conter pelo menos 2 caracteres.')
    }

    // Contexto auxiliar opcional (ex: unidade, etapa)
    const contextUnit = body.unit ? String(body.unit).trim() : ''
    const contextStage = body.stageName ? String(body.stageName).trim() : ''

    // Resolver usuário para a conversa do agente
    let userId = e.auth?.id
    if (!userId) {
      try {
        const u = $app.findAuthRecordByEmail('users', 'engedenirsouza@gmail.com')
        userId = u.id
      } catch (err) {
        return e.json(500, { error: 'Usuário técnico de atendimento não localizado.' })
      }
    }

    let userPrompt =
      'Aprimore tecnicamente a descrição do seguinte serviço para inclusão em orçamento de engenharia civil:\n\n' +
      'DESCRIÇÃO ATUAL: "' +
      description +
      '"'

    if (contextUnit) {
      userPrompt += '\nUNIDADE DE MEDIDA PREVISTA: ' + contextUnit
    }
    if (contextStage) {
      userPrompt += '\nETAPA DO ORÇAMENTO: ' + contextStage
    }

    userPrompt +=
      '\n\nRetorne EXCLUSIVAMENTE o texto final aprimorado em português do Brasil, sem aspas adicionais, sem preâmbulos, sem markdown explicativo e sem comentários.'

    const result = $ai.agent('service-description-improver').chat({
      user_id: userId,
      conversation_id: null,
      message: userPrompt,
    })

    const rawContent = result.content ? String(result.content).trim() : ''
    // Limpeza defensiva de aspas ou markdown delimitador
    let cleaned = rawContent
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1).trim()
    }

    return e.json(200, {
      improvedDescription: cleaned || description,
      conversation_id: result.conversation_id,
      message_id: result.message_id,
    })
  } catch (err) {
    if (err instanceof SkipAiConfigError) {
      return e.json(503, {
        error: 'Serviço de IA temporariamente indisponível no Skip Cloud.',
      })
    }
    if (err instanceof SkipAiAgentsError) {
      const status = err.status || 500
      return e.json(status, {
        error: status >= 500 ? 'Falha ao processar descrição com o agente de IA.' : err.message,
      })
    }
    if (err instanceof SkipAiError) {
      const status = err.status || 502
      return e.json(status, {
        error: status >= 500 ? 'Serviço de IA em manutenção temporária.' : err.message,
      })
    }
    return e.json(500, {
      error: 'Erro interno ao processar a melhoria com IA: ' + (err.message || String(err)),
    })
  }
})
