# Relatório de Auditoria Técnica — Sistema de Orçamento CONCE Engenharia

**Data da Auditoria:** Outubro de 2026  
**Responsável Técnico do Sistema:** Eng. Edenir Souza da Rosa — CREA/RS-252397  
**Empresa:** CONCE — Serviço de Engenharia e Consultoria LTDA (CNPJ: 57.149.101/0001-46)  
**Escopo:** Auditoria técnica completa de leitura, arquitetura, conformidade de cálculos, rotas, persistência, segurança e qualidade de código (sem refatoração direta de código de produção nesta etapa).

---

## 1. Resumo Executivo & Status Geral

O sistema web da CONCE é uma aplicação moderna de Engenharia de Custos e Orçamentação de Obras Civis (React 19 + TypeScript + Vite + Tailwind CSS + Radix UI / Shadcn).

- **Estado da Interface e Funcionalidades Principais:** Todas as telas essenciais planejadas (`/dashboard`, `/orcamentos`, `/composicoes`, `/cotacoes`, `/onboarding`) estão plenamente desenvolvidas e operacionais.
- **Motor de Cálculo:** Alinhado com a metodologia do Acórdão 2.622/2013 do Plenário do TCU e com a regra de ouro tributária da CONCE no Simples Nacional (encargos trabalhistas zerados e alíquota DAS em 11,00% no BDI).
- **Principal Ponto de Atenção Arquitetural:** O sistema funciona atualmente com persistência 100% cliente em `localStorage`. Embora o backend PocketBase (Skip Cloud) esteja conectado e o gerador por IA (`/backend/v1/generate-budget`) esteja ativo, as coleções de banco de dados (`budgets`, `compositions`, `quotes`, etc.) ainda não foram criadas no banco de dados, e a autenticação no frontend é simulada (mock).

---

## 2. Inventário de Rotas e Telas

| Rota           | Componente                      | Status                  | Descrição e Funcionalidades                                                                                                                                                                                                                      |
| -------------- | ------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`            | `Index.tsx` / `LoginScreen.tsx` | ✅ Totalmente funcional | Porta de entrada: valida sessão local, redireciona para `/dashboard` ou exibe tela de login da CONCE com credenciais demonstrativas autorizadas.                                                                                                 |
| `/onboarding`  | `OnboardingScreen.tsx`          | ✅ Totalmente funcional | Apresentação institucional com os 3 pilares da CONCE (Missão, Visão, Valores), persistindo a flag de primeiro acesso e direcionando ao Dashboard.                                                                                                |
| `/dashboard`   | `DashboardScreen.tsx`           | ✅ Totalmente funcional | Painel executivo gerencial com 5 KPIs consolidados, gráficos Recharts (lucratividade por obra, mini Curva ABC, orçado vs realizado, evolução mensal, distribuição de status) e abas de gestão com edição rápida e exclusão.                      |
| `/orcamentos`  | `BudgetsScreen.tsx`             | ✅ Totalmente funcional | Núcleo do sistema: árvore orçamentária em 4 níveis (Etapa → Serviço → Composição CPU → Insumos), seletor de encargos estaduais SINAPI, editor de BDI TCU, totais em tempo real, Curva ABC analítica, revisões, auditoria e exportação PDF/Excel. |
| `/composicoes` | `CompositionsLibraryPage.tsx`   | ✅ Totalmente funcional | Catálogo próprio CONCE e referências SINAPI/SICRO. Permite busca, filtro por especialidade, criação/edição de composições, versionamento auditável e propagação automática de alterações para os orçamentos abertos.                             |
| `/cotacoes`    | `QuotesScreen.tsx`              | ✅ Totalmente funcional | Módulo de cotações com equalização de fornecedores (mínimo 3 cotações), indicador de menor preço, média de mercado, identificação de insumos Classe A pendentes e homologação de vencedores.                                                     |
| `*`            | `NotFound.tsx`                  | ✅ Totalmente funcional | Página 404 padronizada com a identidade visual da CONCE e atalho de retorno ao Dashboard.                                                                                                                                                        |
| _Orfão_        | `StubPage.tsx`                  | ⚠️ Componente legado    | Antigo componente "Em construção". Não é referenciado por nenhuma rota no `App.tsx` (todas as rotas foram substituídas pelas telas reais).                                                                                                       |

---

## 3. Avaliação do Motor de Cálculo de Orçamento (`budgetEngine.ts`)

A integridade matemática da cadeia de valor da engenharia de custos foi auditada:

1. **Insumos (`BudgetInput`):**
   - Categorias suportadas: `material`, `mao_de_obra`, `equipamento`, `servico_terceiro`, `outros`.
   - Custo unitário base e coeficiente de consumo unitário validados.

2. **Composições Unitárias (`BudgetComposition`):**
   - Função `calculateCompositionUnitCost(comp, laborMultiplier)` calcula o somatório: $\sum (\text{coeficiente} \times \text{custo unitário})$.
   - Multiplicador de mão de obra (`laborMultiplier`) é aplicado exclusivamente aos insumos de categoria `mao_de_obra`.

3. **Itens / Serviços (`BudgetService`):**
   - `getServiceCostBreakdown(service)` trata com precisão a distinção entre preços derivados da composição e preços unitários manuais (`unitPriceSource === 'Usuário'`).
   - Se o preço é manual sem insumos de mão de obra, utiliza `laborSharePercent` (padrão 40%) para decompor a base de encargos.
   - `getServiceEffectiveUnitCost` e `calculateServiceDirectCost` integram encargos proporcionais sem distorcer o custo unitário.

4. **Subtotais por Etapa (`BudgetStage`):**
   - `calculateStageDirectCost` calcula o custo direto por etapa.
   - No cálculo completo (`calculateFullBudget`), cada etapa é calculada com e sem BDI e arredondada para 2 casas decimais (`toFixed(2)`).

5. **Fórmula de BDI do TCU (Acórdão 2.622/2013 - Plenário):**
   - Implementação estrita em `calculateTcuBdi`:
     $$\text{BDI} = \left[ \frac{(1 + AC + R + S + G) \times (1 + DF) \times (1 + L)}{1 - T} - 1 \right] \times 100$$
   - Tratamento de exceção para denominador $\le 0$ ($T \ge 100\%$).

6. **Regra de Ouro da CONCE — Simples Nacional com DAS 11,00%:**
   - No regime `simples_nacional`, encargos trabalhistas SINAPI são rigorosamente zerados (`chargesRate = 0`, `laborMultiplier = 1.0`, grupos A/B/C/D = 0,00%).
   - Alíquota tributária única unificada no DAS de 11,00% (`simplesDasRate = 11.0%`).
   - O preço final de venda global corresponde exatamente à soma dos subtotais com BDI das etapas, garantindo que não ocorra divergência de centavos entre a visão global e a visão analítica.

7. **Situação dos Testes Automatizados:**
   - ❌ **Sem cobertura de testes automatizados**: Não existem arquivos de teste (`.test.ts` ou `.spec.ts`) no repositório. O comando `npm test` executa apenas um echo informativo. Os cálculos foram validados manualmente.

---

## 4. Integridade do `PdfExportModal.tsx`

- **Integridade do Código:**
  - O arquivo possui 1.935 linhas e está 100% íntegro.
  - Zero marcadores residuais de conflito git (`<<<<<<<`, `=======`, `>>>>>>>`).
- **Modos de Exportação Suportados:**
  1. `valor_final` (Apenas Valor Final): Proposta comercial de 1 página contendo cabeçalho institucional CONCE, identificação das partes, prazo de execução em destaque, condições comerciais, valor global com BDI em destaque e termos de fechamento.
  2. `simplificado` (Comercial / Simplificado): Proposta com relação resumida de etapas, quantitativos macros, condições de pagamento, validade da proposta e cláusula ART/CREA.
  3. `etapas` (Resumo por Etapas): Síntese executiva com código, descrição, valor com BDI e peso percentual de cada etapa na composição global do preço.
  4. `completo` (Técnico / Completo): Relatório de engenharia completo, contendo memória detalhada do BDI TCU, encargos sociais da UF, planilha de serviços e composições CPU, curva ABC de insumos e responsabilidade técnica nos termos do Art. 618 do Código Civil.

---

## 5. Persistência, Sincronização e Investigação do Log 404

### Mapeamento de Armazenamento Atual:

- **`localStorage` (Client-Side):**
  - `conce_full_budgets`: Todos os orçamentos completos (`FullBudget[]`).
  - `conce_compositions_library`: Catálogo de composições CPU (`BudgetComposition[]`).
  - `conce_active_budget_id`: Orçamento atualmente em edição.
  - `conce_input_quotes`: Cotações e mapas de fornecedores.
  - `conce_audit_logs`: Trilha de auditoria (até 500 registros).
  - `conce_budget_revisions`: Snapshots das versões/revisões.
  - `conce_auth_session`: Sessão do usuário logado.
  - `conce_onboarding_done`: Flag de conclusão do onboarding.
- **Backend PocketBase (Skip Cloud):**
  - Coleção existente: apenas `users`.
  - Agente de IA: `conce-budget-agent` configurado via migration.
  - Endpoint ativo: `POST /backend/v1/generate-budget` (utilizado pelo modal `AiBudgetModal.tsx`).

### Ponto Crítico: Investigação do Erro 404 nos Logs do Backend

- **Ocorrência nos logs:**
  `GET /api/collections/budgets/records?page=1&perPage=50 -> 404 (Missing collection context.)`
- **Diagnóstico:**
  1. No banco de dados ao vivo do PocketBase, **NÃO EXISTE** a coleção `budgets` (o schema contém apenas `users`).
  2. O código de produção atual opera 100% em `localStorage` via `budgetsStorage.ts` e não possui chamada direta a `pb.collection('budgets')`. O log foi fruto de uma chamada remota (tentativa via DevTools ou teste de integração com SDK do PocketBase).
  3. **Impacto no usuário final:** Zero impacto imediato na interface. O usuário não vê mensagens de erro nem perde dados em runtime porque a aplicação lê e grava exclusivamente no `localStorage`.
  4. **Riscos estruturais:** Se o usuário limpar o cache do navegador, os dados serão perdidos. Além disso, não há sincronização multiusuário nem persistência na nuvem enquanto as coleções não forem criadas via migration no PocketBase.
- **Coleções faltantes no backend:**
  - `budgets` (orçamentos da obra)
  - `compositions` (biblioteca de composições CPU)
  - `quotes` (cotações de insumos)
  - `audit_logs` (registros de auditoria)
  - `budget_revisions` (histórico de revisões)

---

## 6. Autenticação e Segurança

- **Modelo Atual:** Simulação client-side baseada em `localStorage` (`STORAGE_KEYS.AUTH`).
- **Credenciais Hardcoded:**
  - E-mail: `engedenirsouza@gmail.com`
  - Senha: `conce123`
- **Mecanismo:** A validação compara strings em memória (`trimmedPass === validPass`). A senha não é transmitida nem comparada contra o hash do PocketBase.
- **Riscos Identificados:**
  1. Qualquer pessoa com acesso ao console do navegador pode manipular a chave `conce_auth_session`.
  2. Não há tokens JWT reais, rotação de chaves ou tempo de expiração de sessão.
  3. O usuário oficial existe na coleção `users` do PocketBase (criado na migration 0001), mas o endpoint `/api/collections/users/auth-with-password` não é acionado pelo frontend.

---

## 7. Dívida Técnica e Fragilidades

1. **Monólitos de Interface:**
   - `PdfExportModal.tsx`: ~1.935 linhas.
   - `BudgetHierarchyTree.tsx`: ~1.860 linhas.
   - `AiBudgetModal.tsx`: ~1.610 linhas.
   - `BudgetsScreen.tsx`: ~1.453 linhas.
   - `BudgetHeaderForm.tsx`: ~1.306 linhas.
     _Risco:_ Dificuldade de manutenção, acoplamento excessivo de estado e risco de regressão em edições.
2. **Sanitizadores com Efeito Colateral:**
   - No `budgetsStorage.ts` (linhas 340-380), se um orçamento tiver id `budget-conce-001`, o código força a substituição de campos pelo cliente canônico "Andreia e Jader", o que pode reverter silenciosamente edições feitas pelo usuário.
3. **Limite de Capacidade do LocalStorage:**
   - `localStorage` possui cota típica de 5 MB a 10 MB. Um histórico extenso de revisões e auditorias com snapshots inteiros do orçamento pode atingir o limite de quota do navegador.
4. **Alinhamento de Versão:**
   - `package.json` declara `"version": "0.0.63"`, enquanto partes do histórico do projeto mencionavam tags anteriores. Falta exibir a versão semântica visível na interface para fins de suporte.

---

## 8. Recomendações Priorizadas de Melhoria

1. **[Alta Prioridade] Migração de Persistência para o PocketBase:**
   Criar migrações PocketBase para as coleções `budgets`, `compositions`, `quotes`, `audit_logs` e `budget_revisions`. Migrar os dados do `localStorage` para a nuvem mantendo fallback transparente.
2. **[Alta Prioridade] Autenticação Real com PocketBase:**
   Conectar a tela `LoginScreen.tsx` ao método `pb.collection('users').authWithPassword()`, descontinuando as credenciais hardcoded e habilitando controle de acesso real por usuário.
3. **[Média Prioridade] Implementação de Testes Automatizados:**
   Configurar Vitest com suíte de testes unitários para o `budgetEngine.ts`, garantindo que os cálculos de BDI TCU, encargos SINAPI e DAS 11% estejam matematicamente protegidos contra regressões.
4. **[Média Prioridade] Modularização dos Componentes Monolíticos:**
   Dividir o `PdfExportModal.tsx` em 4 componentes menores para cada modo de exportação (`PdfFinalValueView`, `PdfSimplifiedView`, `PdfStagesSummaryView`, `PdfCompleteTechnicalView`), além de modularizar a árvore hierárquica.
5. **[Média Prioridade] Remoção de Hardcodes de Clientes na Sanitização:**
   Ajustar `budgetsStorage.ts` para que orçamentos não tenham seus clientes e títulos sobrescritos arbitrariamente durante a inicialização da aplicação.
6. **[Baixa Prioridade] Exportação / Importação de Backup Completo:**
   Disponibilizar botão no Dashboard para baixar um arquivo JSON compactado com todos os dados orçamentários locais, oferecendo uma camada extra de proteção antes da migração definitiva para a nuvem.
7. **[Baixa Prioridade] Limpeza do Componente Órfão `StubPage.tsx`:**
   Remover o arquivo `src/pages/StubPage.tsx` e referências mortas, já que todas as rotas foram concluídas.
