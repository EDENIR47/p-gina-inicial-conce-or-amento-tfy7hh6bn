routerAdd('POST', '/backend/v1/orcamentador-proxy', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const endpoint = body.endpoint ? String(body.endpoint).trim().replace(/^\/+/, '') : 'insumos'
    const allowedEndpoints = [
      'insumos',
      'composicoes',
      'composicao',
      'composicao_explode',
      'encargos',
      'atualizacao',
      'status',
      'usage',
      'estados',
    ]
    if (!allowedEndpoints.includes(endpoint)) {
      return e.json(400, {
        error: 'Endpoint não permitido. Permitidos: ' + allowedEndpoints.join(', '),
      })
    }

    // Obter API Key: primeiro do body/header enviado pelo cliente, depois das variáveis de ambiente/secrets
    let apiKey = body.apiKey ? String(body.apiKey).trim() : ''
    if (!apiKey) {
      apiKey = e.requestInfo().headers['x-orcamentador-api-key'] || ''
    }
    if (!apiKey) {
      apiKey =
        $secrets.get('ORCAMENTADOR_API_KEY') ||
        $secrets.get('SINAPI_API_KEY') ||
        $os.getenv('ORCAMENTADOR_API_KEY') ||
        ''
    }

    if (!apiKey) {
      return e.json(400, {
        error:
          'Chave de API do Orçamentador não configurada. Informe sua API Key nas configurações ou na tela de sincronização.',
        code: 'MISSING_API_KEY',
      })
    }

    const params = body.params || {}
    const queryParts = []
    queryParts.push('apikey=' + encodeURIComponent(apiKey))

    for (const key of Object.keys(params)) {
      const val = params[key]
      if (val !== undefined && val !== null && val !== '') {
        queryParts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(val)))
      }
    }

    const targetUrl = 'https://orcamentador.com.br/api/' + endpoint + '/?' + queryParts.join('&')

    const res = $http.send({
      url: targetUrl,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-API-Key': apiKey,
        'User-Agent': 'CONCE-Engenharia/1.0',
      },
      timeout: 30,
    })

    const status = res.statusCode || 200
    const rawText = res.rawText || ''
    let parsedData = res.json

    if (!parsedData && rawText) {
      try {
        parsedData = JSON.parse(rawText)
      } catch (_) {
        parsedData = null
      }
    }

    if (status === 401 || status === 403) {
      return e.json(status, {
        error:
          'Chave de API do Orçamentador inválida ou expirada. Verifique sua chave no painel do Orçamentador.',
        code: 'INVALID_API_KEY',
        details: parsedData,
      })
    }

    if (status === 429) {
      return e.json(429, {
        error:
          'Limite de requisições da API Orçamentador atingido para esta chave. Aguarde alguns instantes antes de tentar novamente.',
        code: 'RATE_LIMIT_EXCEEDED',
        details: parsedData,
      })
    }

    if (status >= 400) {
      const errMsg =
        (parsedData && (parsedData.erro || parsedData.message || parsedData.mensagem)) ||
        'Erro retornado pela API Orçamentador (HTTP ' + status + ')'
      return e.json(status, {
        error: errMsg,
        code: 'API_ERROR',
        details: parsedData,
      })
    }

    return e.json(200, {
      success: true,
      data: parsedData || rawText,
    })
  } catch (err) {
    return e.json(500, {
      error: 'Falha na comunicação com o serviço Orçamentador: ' + (err.message || String(err)),
      code: 'PROXY_INTERNAL_ERROR',
    })
  }
})
