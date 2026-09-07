routerAdd('POST', '/backend/v1/generate-budget', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const prompt = body.prompt ? String(body.prompt).trim() : ''
    if (!prompt || prompt.length < 5) {
      return e.badRequestError('O prompt deve conter pelo menos 5 caracteres descrevendo a obra.')
    }

    const uf = body.uf ? String(body.uf).trim().toUpperCase() : 'SP'
    const taxRegime = body.taxRegime ? String(body.taxRegime).trim() : ''
    const isRelieved = taxRegime === 'com_desoneracao' || Boolean(body.isRelieved)
    const reference = body.reference ? String(body.reference).trim() : 'SINAPI'
    const simplesDasRate = Number(body.simplesDasRate) || 0

    const regimeLabel =
      taxRegime === 'simples_nacional'
        ? 'Simples Nacional (Regime operacional CONCE - encargos base sem desoneração / tributos unificados no DAS' +
          (simplesDasRate > 0 ? ` com alíquota de ${simplesDasRate}%` : '') +
          ')'
        : isRelieved
          ? 'Com desoneração (CPRB Lei 12.546/2011)'
          : 'Sem desoneração (CLT)'

    // Resolver ID de usuário para a persistência da conversa do agente
    let userId = e.auth?.id
    if (!userId) {
      try {
        const u = $app.findAuthRecordByEmail('users', 'engedenirsouza@gmail.com')
        userId = u.id
      } catch (err) {
        return e.json(500, { error: 'Usuário padrão de atendimento não localizado.' })
      }
    }

    const userMessage =
      'Elabore a planilha orçamentária detalhada para a seguinte solicitação de obra civil:\n' +
      'PROMPT DO ENGENHEIRO: ' +
      prompt +
      '\n' +
      'PARÂMETROS ADICIONAIS:\n' +
      '- UF da obra (para encargos sociais): ' +
      uf +
      '\n' +
      '- Regime tributário da empresa executora: ' +
      regimeLabel +
      '\n' +
      '- Base de composições de referência principal: ' +
      reference +
      '\n\n' +
      'DIRETRIZ INEGOCIÁVEL SOBRE FONTES DE PREÇOS:\n' +
      '- NUNCA invente ou chute valores de custos unitários.\n' +
      '- Todo insumo deve conter o campo "source" explicitando sua fonte ("SINAPI", "SICRO", "Biblioteca CONCE").\n' +
      '- Quando um insumo não constar em fonte oficial comprovada, atribua unitCost: 0, source: "sem fonte — preencher manualmente" e sourceStatus: "sem_fonte".\n' +
      '- Retorne APENAS o JSON válido estruturado de acordo com as especificações exigidas, contendo as etapas, serviços, composições e insumos.'
    const result = $ai.agent('conce-budget-agent').chat({
      user_id: userId,
      conversation_id: body.conversation_id || null,
      message: userMessage,
    })

    return e.json(200, {
      conversation_id: result.conversation_id,
      content: result.content,
      citations: result.citations,
      message_id: result.message_id,
    })
  } catch (err) {
    if (err instanceof SkipAiConfigError) {
      return e.json(503, { error: 'Serviço de IA temporariamente indisponível no Skip Cloud.' })
    }
    if (err instanceof SkipAiAgentsError) {
      const status = err.status || 500
      return e.json(status, {
        error: status >= 500 ? 'Falha na execução do agente de IA.' : err.message,
      })
    }
    if (err instanceof SkipAiError) {
      const status = err.status || 502
      return e.json(status, {
        error: status >= 500 ? 'Serviço de IA em manutenção temporária.' : err.message,
      })
    }
    return e.json(500, {
      error: 'Erro interno ao processar a geração com IA: ' + (err.message || String(err)),
    })
  }
})
