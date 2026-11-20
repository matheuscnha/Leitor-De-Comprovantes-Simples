# Leitor de Comprovantes

Meu primeiro projeto de portfólio: uma aplicação web para praticar **HTML, CSS e JavaScript** criando um fluxo de leitura e organização de comprovantes com apoio de inteligência artificial.

O ponto de partida foi uma proposta simples apresentada no curso da **DevClub**. A proposta original era mais minimalista e não era este leitor de comprovantes. A partir do que aprendi no curso, desenvolvi e transformei a ideia por conta própria até chegar a este projeto, ampliando suas funcionalidades e criando uma identidade visual própria.

O app recebe uma imagem, solicita uma leitura à IA e apresenta os dados para conferência. A leitura é uma sugestão: a pessoa deve comparar os produtos e valores com o comprovante antes de salvar.

## O que o projeto faz

- Aceita imagens PNG, JPEG, WebP e GIF estático de até 5 MB.
- Solicita à IA dados como estabelecimento, data, horário, categoria, forma de pagamento, produtos, descontos e total.
- Mostra a imagem original junto da tela de revisão.
- Permite corrigir dados e conferir os produtos individualmente antes de salvar.
- Sinaliza divergências e possíveis comprovantes repetidos para a pessoa decidir o que fazer.
- Guarda os comprovantes no histórico local e permite editar ou excluir registros.
- Usa layout responsivo e estados acessíveis para mensagens e ações principais.

## Tecnologias

- HTML5
- CSS3, organizado em módulos na pasta `css/`
- JavaScript moderno com ES Modules, organizado na pasta `js/`
- [Puter.js](https://docs.puter.com/) para solicitar a leitura de imagem por IA
- `localStorage` para manter o histórico neste navegador

## Como executar localmente

O projeto não precisa de etapa de build nem de instalação de dependências. Como usa módulos JavaScript, abra-o por um servidor local, em vez de abrir o `index.html` diretamente como arquivo.

### Opção 1: Python

Na pasta do projeto, execute:

```bash
python -m http.server 8000
```

Depois, acesse [http://localhost:8000](http://localhost:8000).

### Opção 2: VS Code

Abra a pasta no VS Code e inicie o projeto com a extensão Live Server.

A leitura por IA precisa de conexão com a internet e depende da disponibilidade do SDK e do serviço externo.

## Privacidade e armazenamento

- Ao solicitar uma leitura, a imagem é enviada ao Puter AI para processamento. O projeto não controla por quanto tempo o serviço ou o provedor de IA mantém os dados processados.
- Os dados extraídos, o hash da imagem e a configuração da leitura são armazenados no `localStorage` do navegador atual.
- A imagem original não é salva no histórico do app.
- Excluir o histórico remove os registros locais deste navegador; isso não apaga dados que já tenham sido enviados ao serviço externo.
- O SDK do Puter e as fontes do Google são carregados de domínios externos. O SDK executa no contexto da página.

Consulte [SEGURANCA.md](SEGURANCA.md) para detalhes sobre o modelo de confiança e os limites de segurança do protótipo.

## Limitações conhecidas

A qualidade da leitura depende da imagem e do serviço de IA. A IA pode omitir produtos, interpretar nomes incorretamente ou associar um preço ao item errado, mesmo quando o total parece correto. Por isso, o app solicita revisão humana e não deve ser tratado como ferramenta de contabilidade ou como fonte financeira confirmada.

O histórico fica apenas no navegador em que foi criado; não há conta de usuário, sincronização entre dispositivos ou armazenamento em servidor.

O protocolo e o estado das verificações estão em [TESTES-DE-LEITURA.md](TESTES-DE-LEITURA.md). Ele registra leituras inconsistentes do comprovante de referência em tentativas anteriores e identifica cenários que ainda aguardam verificação. Os resultados pendentes não são apresentados como aprovados.

## Objetivo de aprendizado

Este projeto foi criado para praticar a construção de uma aplicação web completa com tecnologias fundamentais: estruturar a interface com HTML, desenvolver a identidade visual com CSS e organizar fluxos assíncronos, formulários, validação e armazenamento no navegador com JavaScript.
