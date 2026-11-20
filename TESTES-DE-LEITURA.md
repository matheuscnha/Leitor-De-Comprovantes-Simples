# Testes de leitura de comprovantes

Este documento separa duas avaliações:

1. **Leitura da IA:** se os dados extraídos da imagem correspondem ao cupom.
2. **Validações do app:** se produtos possivelmente repetidos são destacados e
   preservados, divergências são mostradas e a leitura só é salva depois da revisão.

Não considerar uma leitura aprovada só porque o total final está certo. Os itens
e os valores também precisam ser conferidos.

## Critérios de avaliação

- **Correto:** estabelecimento/data/horário legíveis, itens sem omissão ou invenção,
  valores por item corretos, descontos identificados e total final compatível.
- **Errado:** produto inventado/omitido/duplicado, valor atribuído ao item errado,
  pagamento/data incorretos ou total sem suporte no comprovante.
- **Ambíguo:** imagem não permite decidir com confiança. O app deve deixar o
  campo para revisão, em vez de afirmar um valor ou nome incerto.
- **Validação do app:** divergência matemática precisa gerar aviso e confirmação;
  dados não devem entrar no histórico antes da confirmação da pessoa.

Para valores, converter para centavos inteiros antes de comparar. Toda diferença
de pelo menos R$ 0,01 deve gerar o mesmo aviso durante a revisão e no cartão salvo.
Uma diferença de R$ 0,01 só pode ser considerada correta se o próprio comprovante
explicar o arredondamento; o app não deve tratá-la silenciosamente como igualdade.

## Caso R01 — Cupom térmico de referência

**Imagem:** comprovante enviado na conversa em 19/11/2026, emitido em 28/03/2018.

**Leitura de referência visível:**

- Estabelecimento: EMPRESA TESTE.
- Data: 2018-03-28.
- Pagamento: dinheiro.
- Total e líquido: R$ 43,00.
- Desconto: nenhum; o cupom mostra descontos de R$ 0,00.
- Horário: 16:31.
- Itens impressos: seis linhas de produto, cada uma seguida por uma linha de
  quantidade/preço. A linha de preço pertence ao produto acima e não é outro
  produto.

| Produto conforme impresso | Quantidade | Unitário | Total |
|---|---:|---:|---:|
| CERVEJA LONGNECK UN | 1 | R$ 6,00 | R$ 6,00 |
| GAROTADE UN* | 1 | R$ 4,50 | R$ 4,50 |
| MONSTER UN | 1 | R$ 8,00 | R$ 8,00 |
| REDBULL UN | 1 | R$ 10,00 | R$ 10,00 |
| SUINDALE UN* | 1 | R$ 6,50 | R$ 6,50 |
| CACHORRO SALSICHA UN | 1 | R$ 8,00 | R$ 8,00 |
| **Soma** |  |  | **R$ 43,00** |

\* Preservar a grafia visível no cupom ou marcar como ambígua; não corrigir
automaticamente para uma marca presumida.

**Resultado observado antes da tela de revisão:** leituras repetidas do mesmo
arquivo variaram. As capturas foram feitas durante revisões diferentes do
prompt, portanto não formam um experimento controlado da versão atual.

**Configuração da próxima avaliação controlada:** modelo `gpt-5.4-nano`,
provedor `openai`, temperatura `0`, prompt `comprovante-v2`. As leituras salvas
agora incluem esses valores em `metadadosLeitura`; os registros antigos não têm
essa informação e não devem ser comparados como se viessem da mesma configuração.

| Observação histórica | Resultado exibido | Classificação |
|---|---:|---|
| Fragmentos "COCO XBF" interpretados como produtos | Soma R$ 51,00; total impresso R$ 43,00 | Errado; aviso de soma necessário |
| Cerveja e Gatorade duplicados | Soma R$ 53,50; total impresso R$ 43,00 | Errado; deduplicação e revisão necessárias |
| Preços/nome associados incorretamente a itens | Soma R$ 44,50; total impresso R$ 43,00 | Errado; revisão necessária |
| Itens próximos do esperado, mas desconto de R$ 0,00 criado | Total R$ 43,00 | Parcialmente correto; desconto zero deve ser removido |
| Fragmentos de OCR e quantidades/preços lidos como novos produtos | Soma R$ 59,50; total impresso R$ 43,00 | Errado; aviso de soma necessário |

Essas observações demonstram que uma soma correta, sozinha, não basta: nomes e
valores por item também precisam de revisão.

**Comportamento esperado do app após a revisão implementada:**

- Mostrar rascunho editável antes de salvar.
- Preservar produtos que parecem repetidos, destacá-los e pedir conferência;
  nenhum item deve ser removido automaticamente.
- Se a imagem tiver outro hash, comparar estabelecimento, data, horário e total
  com o histórico. A coincidência deve gerar uma pergunta, nunca bloquear o envio
  automaticamente.
- Marcar nomes de produtos repetidos mesmo quando quantidade ou valores diferirem;
  manter todas as linhas e pedir conferência da descrição e dos preços.
- Manter descontos de R$ 0,00 visíveis e pedir que a pessoa confirme ou remova.
- Não criar desconto para a linha “Descontos R$ 0,00”.
- Criar um produto por linha de descrição e parear apenas com a linha numérica
  correspondente; nunca criar produto a partir de uma linha de preços.
- Se o nome for ilegível, manter o campo sem nome para correção manual; não usar
  fragmentos de OCR como nome válido.
- Comparar quantidade × unitário e total do item em centavos; avisar a partir de R$ 0,01.
- Comparar soma dos itens menos descontos e total em centavos; avisar a partir de R$ 0,01.
- Exibir a mesma divergência na revisão e no cartão salvo; diferença de R$ 0,01
  exige explicação visível no comprovante.
- Validar data real, hora, categoria, pagamento e tipos/valores dos itens.
- Manter linhas inválidas para correção ou remoção; não descartar silenciosamente.
- Bloquear o salvamento enquanto produto, desconto ou total obrigatório estiver incompleto.
- Exibir campos inválidos e lembrar que a soma não confirma a associação entre produto e preço.
- Apresentar campos extraídos como sugestões da IA e manter a imagem original ao lado da revisão em telas amplas.
- Exigir confirmação visual individual de cada produto antes do primeiro salvamento e registrar por item a sugestão original da IA, o resultado (confirmado/corrigido/adicionado manualmente) e a data.
- Se um produto conferido for editado depois, retirar o selo de conferido e mostrar que não houve nova comparação com a imagem.
- Salvar os problemas ainda presentes como “Revisão pendente” no histórico.
- Recalcular divergências com os dados atuais; permitir confirmar individualmente avisos antigos após conferi-los com a imagem.
- Preservar avisos resolvidos em um histórico separado, com a mensagem original e a data da resolução.
- Ao marcar avisos pendentes como revisados, movê-los para o histórico de revisão em vez de apagá-los.
- Recusar arquivos vazios, maiores que 5 MB, de formato não permitido ou que o navegador não consiga decodificar.
- Aceitar somente PNG, JPEG, WebP e GIF estático, conferindo assinatura do conteúdo, não apenas extensão ou MIME declarado.
- Permitir apenas uma leitura por vez e restaurar o seletor após sucesso, erro ou cancelamento.
- Diferenciar histórico vazio de erro de leitura; nunca tratar armazenamento inacessível como lista vazia.
- Proteger gravação, edição e exclusão; em caso de falha, explicar o erro e preservar o histórico anterior.
- Ao fechar o histórico, buscar o comprovante atual pelo ID; se foi apagado, não exibir uma cópia antiga.
- Não salvar ao descartar a leitura; exigir confirmação para salvar com avisos.

**Checks anteriores à validação de estrutura:** os registros abaixo descrevem
comportamento de versões anteriores. A validação nova e a preservação de linhas
malformadas ainda precisam ser verificadas manualmente no app.

**Limite da comparação de comprovantes:** hash igual identifica o mesmo arquivo.
Para imagens diferentes, estabelecimento, data, horário e total iguais só indicam
uma possível duplicata. Duas compras distintas podem compartilhar esses dados;
por isso, o app pergunta e deixa a decisão com a pessoa.

**Status:** uma imagem real documentada; leituras históricas da IA inconsistentes
em diferentes versões do prompt. A interface já foi conferida visualmente, mas a
regra nova de preservação de itens repetidos e a comparação por estabelecimento,
data, horário e total ainda precisam ser verificadas com imagens reais.

**Evidência da versão atual (20/11/2026):** o caso R01 continua sendo uma
referência visual, não uma aprovação da leitura atual. As tentativas antigas
foram feitas com versões diferentes e não formam um teste repetível. Nesta
atualização não foi enviada uma nova imagem ao serviço de IA; portanto, não há
resultado novo para classificar como correto. Os caminhos de erro da IA também
foram separados no código, mas seguem aguardando reprodução real ou simulada.
Não apresentar os cenários marcados como pendentes abaixo como aprovados.

## Casos que faltam

| ID | Cenário | O que conferir | Status |
|---|---|---|---|
| R02 | Comprovante com desconto explícito | Descrição/valor do desconto e total líquido | Aguardando imagem |
| R03 | Mesmo nome de produto em duas linhas legítimas, com valores iguais ou diferentes | Manter ambas e destacar o nome repetido para conferência | Aguardando verificação |
| R04 | Outro layout, com Pix ou cartão | Data, pagamento, separadores e produtos | Aguardando imagem |
| R05 | Imagem borrada ou parcialmente cortada | Marcar campos incertos e não inventar valores | Aguardando imagem |
| R06 | Mesmo comprovante em imagem reprocessada | Comparar estabelecimento, data, horário e total; pedir confirmação | Aguardando imagem |
| R07 | Compras distintas com estabelecimento, data, horário e total iguais | Mostrar possível duplicata e permitir continuar | Aguardando imagem |
| R08 | Produto ou desconto com estrutura/tipo inválido na resposta JSON | Preservar linha, marcar campos incompletos e bloquear até corrigir ou remover | Aguardando verificação |
| R09 | Data impossível, categoria/pagamento desconhecidos ou número negativo | Normalizar com aviso; exigir correção dos campos obrigatórios antes de salvar | Aguardando verificação |
| R10 | Soma correta com preço associado ao produto errado | A imagem permanece visível e a revisão orienta comparar cada associação | Aguardando verificação |
| R11 | Salvar comprovante com avisos | Cartão fica como “Revisão pendente”, mostra os avisos e permite marcá-los como revisados | Aguardando verificação |
| R12 | Salvar comprovante sem avisos | Histórico não mostra selo de pendência | Aguardando verificação |
| R13 | Arquivo maior que 5 MB ou vazio | Recusar antes do hash e do envio à IA; explicar o motivo | Aguardando verificação |
| R14 | Extensão/MIME diverge dos bytes, mas o conteúdo é PNG/JPEG/WebP válido | Detectar pelo conteúdo, decodificar e aceitar com o MIME correto | Aguardando verificação |
| R15 | Imagem corrompida ou GIF animado | Recusar com mensagem clara antes do envio | Aguardando verificação |
| R16 | Selecionar/acionar outra leitura enquanto há uma requisição ativa | Bloquear segunda leitura; resposta antiga não pode substituir a revisão atual | Aguardando verificação |
| R17 | Histórico ausente, JSON inválido ou armazenamento bloqueado para leitura | Distinguir “vazio” de “indisponível”; não sobrescrever registros | Aguardando verificação |
| R18 | Armazenamento bloqueado/cheio durante salvar, editar ou excluir | Mostrar falha e manter os dados anteriores | Aguardando verificação |
| R19 | Excluir o comprovante atual ou limpar o histórico e fechar a lista | Não ressuscitar cartão antigo | Aguardando verificação |
| R20 | Conteúdo real não aceito, como HEIC | Recusar antes do envio à IA e informar os formatos aceitos | Aguardando verificação |
| R21 | Divergências de R$ 0,01 e R$ 0,02 em item e soma final | Avisar nos dois contextos com a mesma regra; nenhuma diferença deve ser arredondada silenciosamente | Aguardando verificação |
| R22 | Linha de preço ou fragmento com `R$`/`=>` reconhecido como nome de produto | Retirar somente a linha com formato inequívoco de quantidade/preço, avisar e pedir conferência da descrição; não descartar em silêncio | Aguardando verificação |
| R23 | Mesmo nome de produto retornado duas vezes com preços diferentes | Destacar ambas as linhas; nunca eliminar automaticamente nenhuma delas | Aguardando verificação |
| R24 | Corrigir dado que gerou aviso na leitura e registrar sua resolução | Remover a pendência atual, manter o aviso original no histórico de resoluções e não reabrir o aviso ao editar novamente | Lógica unitária aprovada; interface pendente |
| R25 | Revisar comprovante com produtos associados incorretamente, apesar da soma correta | Comparar imagem e linhas lado a lado; bloquear salvar até conferir cada item; registrar sugestão e resultado por item; invalidar estado quando item for editado depois | Lógica unitária aprovada; interface pendente |
| R26 | SDK do Puter bloqueado ou indisponível | Explicar que o módulo não carregou e orientar recarregar a página | Aguardando verificação |
| R27 | Falha de rede durante a chamada à IA | Informar que não foi possível conectar e orientar conferir a conexão | Aguardando verificação |
| R28 | Resposta vazia ou JSON inválido da IA | Explicar que o formato da resposta não pôde ser interpretado e orientar uma nova tentativa com imagem legível | Aguardando verificação |
| R29 | Limite, recusa ou indisponibilidade temporária do serviço de IA | Distinguir limite de solicitações, recusa da sessão e falha temporária do serviço; orientar a próxima ação | Aguardando verificação |

## Registro de cada execução

Para cada imagem, anotar:

- ID do caso e número da tentativa;
- modelo, provedor e versão do prompt em `metadadosLeitura`;
- resultado da IA antes de editar;
- grupos de produtos repetidos destacados e decisão da pessoa;
- avisos de valores e soma;
- correções manuais feitas;
- decisão de salvar ou descartar;
- resultado final: correto, errado ou ambíguo.

Não incluir número de cartão, CPF, endereço, QR code ou outros dados pessoais nas
capturas/documentação do portfólio.
