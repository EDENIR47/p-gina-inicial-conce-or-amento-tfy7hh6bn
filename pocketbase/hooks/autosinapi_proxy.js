routerAdd('POST', '/backend/v1/autosinapi-proxy', (e) => {
  try {
    const body = e.requestInfo().body || {}
    const rawEndpoint = body.endpoint ? String(body.endpoint).trim().replace(/^\/+/, '') : ''

    // Lista de endpoints permitidos da autoSINAPI API (FastAPI / docs)
    // Permite consulta raiz (status), insumos, composições, precos, custos, series, bom, etc.
    const allowedPrefixes = [
      '',
      'docs',
      'openapi.json',
      'health',
      'status',
      'insumos',
      'composicoes',
      'composicao',
      'precos',
      'custos',
      'bom',
      'curva-abc',
      'otimizador',
      'regional',
      'historico',
      'manutencoes',
      'encargos',
      'uf',
      'estados',
      'api/v1/insumos',
      'api/v1/composicoes',
      'api/v1/precos',
      'api/v1/custos',
      'api/v1/status',
    ]

    // Sanitização de endpoint
    const cleanEndpoint = rawEndpoint.split('?')[0].split('#')[0]
    const baseSegment = cleanEndpoint.split('/')[0]

    const isAllowed =
      allowedPrefixes.includes(cleanEndpoint) ||
      allowedPrefixes.includes(baseSegment) ||
      cleanEndpoint.startsWith('insumos') ||
      cleanEndpoint.startsWith('composicoes') ||
      cleanEndpoint.startsWith('composicao') ||
      cleanEndpoint.startsWith('precos') ||
      cleanEndpoint.startsWith('custos') ||
      cleanEndpoint.startsWith('api/v1/')

    if (!isAllowed) {
      return e.json(400, {
        error:
          'Endpoint autoSINAPI não permitido (' +
          cleanEndpoint +
          '). Permitidos: insumos, composicoes, precos, custos, bom, status, etc.',
        code: 'DISALLOWED_ENDPOINT',
      })
    }

    // Obter URL base do autoSINAPI (informada pelo usuário ou secret de backend)
    let baseUrl = body.baseUrl ? String(body.baseUrl).trim() : ''
    if (!baseUrl) {
      baseUrl =
        $secrets.get('AUTOSINAPI_BASE_URL') ||
        $os.getenv('AUTOSINAPI_BASE_URL') ||
        'http://localhost:8000'
    }

    // Remove barra final
    baseUrl = baseUrl.replace(/\/+$/, '')

    // Validação estrita de protocolo para mitigar SSRF
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      return e.json(400, {
        error: 'URL base inválida: deve iniciar com http:// ou https://',
        code: 'INVALID_BASE_URL',
      })
    }

    // Obter X-API-KEY: body -> header x-autosinapi-api-key -> secrets/env
    let apiKey = body.apiKey ? String(body.apiKey).trim() : ''
    if (!apiKey) {
      apiKey = e.requestInfo().headers['x-autosinapi-api-key'] || ''
    }
    if (!apiKey) {
      apiKey =
        $secrets.get('AUTOSINAPI_API_KEY') ||
        $secrets.get('AUTOSINAPI_KEY') ||
        $os.getenv('AUTOSINAPI_API_KEY') ||
        ''
    }

    // Montar parâmetros de query
    const params = body.params || {}
    const queryParts = []
    for (const key of Object.keys(params)) {
      const val = params[key]
      if (val !== undefined && val !== null && val !== '') {
        queryParts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(val)))
      }
    }

    let targetUrl = baseUrl + (cleanEndpoint ? '/' + cleanEndpoint : '')
    if (queryParts.length > 0) {
      targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryParts.join('&')
    }

    const headers = {
      Accept: 'application/json',
      'User-Agent': 'CONCE-Engenharia/1.0 (autoSINAPI Client)',
    }
    if (apiKey) {
      headers['X-API-KEY'] = apiKey
      headers['x-api-key'] = apiKey
    }

    const res = $http.send({
      url: targetUrl,
      method: body.method === 'POST' ? 'POST' : 'GET',
      headers: headers,
      body: body.payload ? JSON.stringify(body.payload) : '',
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
          'Chave X-API-KEY da autoSINAPI inválida ou ausente. Verifique a chave configurada no gateway da sua instância autoSINAPI.',
        code: 'INVALID_API_KEY',
        details: parsedData,
      })
    }

    if (status === 404) {
      return e.json(404, {
        error:
          'Endpoint não encontrado na instância autoSINAPI (' +
          cleanEndpoint +
          '). Verifique a URL e a versão da API.',
        code: 'ENDPOINT_NOT_FOUND',
        details: parsedData,
      })
    }

    if (status === 429) {
      return e.json(429, {
        error:
          'Limite de requisições da autoSINAPI atingido. Aguarde alguns instantes antes de tentar novamente.',
        code: 'RATE_LIMIT_EXCEEDED',
        details: parsedData,
      })
    }

    if (status >= 400) {
      const errMsg =
        (parsedData &&
          (parsedData.detail ||
            parsedData.erro ||
            parsedData.message ||
            parsedData.mensagem ||
            (Array.isArray(parsedData) ? JSON.stringify(parsedData) : null))) ||
        'Erro retornado pela instância autoSINAPI (HTTP ' + status + ')'
      return e.json(status, {
        error: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg),
        code: 'AUTOSINAPI_ERROR',
        details: parsedData,
      })
    }

    return e.json(200, {
      success: true,
      data: parsedData !== null ? parsedData : rawText,
    })
  } catch (err) {
    return e.json(500, {
      error:
        'Falha na comunicação com a instância autoSINAPI: ' +
        (err.message || String(err)) +
        '. Certifique-se de que a instância está online e acessível.',
      code: 'PROXY_INTERNAL_ERROR',
    })
  }
})
