# Segurança e modelo de confiança

## Como os dados circulam hoje

1. O navegador abre os arquivos HTML, CSS e JavaScript do próprio projeto.
2. A aplicação carrega o SDK `https://js.puter.com/v2/` e chama `puter.ai.chat()` com a imagem e as instruções de leitura. A imagem sai do navegador e é processada pelo serviço do Puter e pelo provedor de IA escolhido pelo serviço. O projeto não controla retenção, acesso interno ou exclusão nesses serviços; consulte as políticas deles antes de enviar comprovantes reais.
3. Os dados extraídos, a configuração de leitura e o hash do arquivo ficam em `localStorage` no perfil atual do navegador. O arquivo da imagem não é salvo no histórico pela aplicação.
4. A folha de estilos solicita as fontes DM Sans, Fraunces e IBM Plex Mono ao Google Fonts. Essa solicitação revela ao provedor de fontes dados técnicos da conexão, como o endereço IP. Ela não executa JavaScript no contexto da aplicação.

## Dependências e controles neste repositório

- Os ícones são SVGs inline; não há mais folha de estilos ou arquivos de fonte do Font Awesome/CDNJS.
- O SDK do Puter é a única dependência JavaScript de terceiros carregada diretamente pela página. Ele executa no contexto da aplicação e pode acessar o DOM e os dados acessíveis à página, inclusive o histórico local. O uso da IA depende dessa confiança.
- A política CSP no `index.html` aplica `object-src 'none'`, `base-uri 'self'` e `form-action 'self'`. Ela é uma proteção parcial; não restringe scripts, conexões de rede ou estilos.
- Não foi definida uma diretiva `script-src`/`connect-src` para o SDK. O domínio do arquivo do SDK é conhecido, mas os destinos de rede e recursos auxiliares usados pela versão atual não foram confirmados em uma execução instrumentada. Uma lista incompleta pode bloquear a leitura; uma lista ampla como `https:` não seria um controle efetivo. A URL `/v2/` também não fixa uma versão imutável para SRI.

## Limites do protótipo

Este projeto é um protótipo estático executado no navegador. `localStorage` não é um cofre: qualquer script executado na origem pode ler ou alterar os registros, e os dados ficam disponíveis a outros usuários do mesmo perfil do navegador. O aviso de privacidade informa o fluxo, mas não reduz esse risco técnico. Evite usar comprovantes com dados pessoais ou financeiros reais até avaliar o serviço de IA e seu tratamento de dados.

## Antes de aceitar dados reais de usuários

1. Mover a chamada da IA para um backend controlado pelo projeto. O backend deve validar tipo e tamanho, limitar frequência, evitar registrar imagens ou conteúdo sensível em logs e manter credenciais fora do navegador.
2. Definir autenticação e autorização por usuário, política de retenção, exclusão e cópias de segurança. Usar armazenamento do servidor com controles de acesso; não compartilhar o histórico de usuários em `localStorage`.
3. Servir o site por HTTPS e enviar uma CSP como cabeçalho HTTP, começando em `Content-Security-Policy-Report-Only`. Monitorar violações no fluxo real e então aplicar uma política restritiva. Definir `script-src`, `connect-src`, `style-src` e `font-src` com origens exatas observadas e necessárias; evitar curingas e `https:`. `frame-ancestors 'none'` também deve ser enviado como cabeçalho, pois não funciona em uma CSP via `<meta>`.
4. Preferir servir localmente os recursos estáticos de terceiros ou fixar versões verificáveis. Se uma dependência executável continuar no frontend, revisar atualizações e restringir sua origem; SRI só ajuda quando o arquivo é imutável e o provedor mantém o conteúdo correspondente ao hash.
5. Documentar a política de privacidade e retenção do provedor de IA efetivamente usado e permitir que a pessoa escolha se deseja enviar cada comprovante.

As diretivas CSP e origens do backend devem ser ajustadas ao provedor e ao ambiente de hospedagem escolhidos; este documento não afirma que a política de produção já esteja implantada.
