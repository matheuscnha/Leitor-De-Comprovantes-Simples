import {
  criarElemento,
  criarSnapshotFormulario,
  formatarMoeda,
  numeroOuNull,
} from "./helpers.js";
import {
  calcularAvisosDeValores,
  encontrarGruposDeProdutosRepetidos,
} from "./receipt-data.js";

export function criarCartaoComprovante(dados) {
  const card = criarElemento("section", null, "comprovante-card");
  card.tabIndex = -1;
  const estabelecimento =
    dados.estabelecimento || "Estabelecimento não identificado";
  card.append(criarElemento("h2", estabelecimento, "comprovante-titulo"));

  const categoria = dados.categoria;
  const categoriaTexto = categoria
    ? `${categoria.emoji || ""} ${categoria.nome || "Não identificada"}`.trim()
    : "Não identificada";
  const pagamento = dados.pagamento;
  const pagamentoTexto = pagamento
    ? `${pagamento.emoji || ""} ${pagamento.nome || "Não identificado"}`.trim()
    : "Não identificado";

  card.append(
    criarElemento(
      "p",
      `📅 Data: ${dados.data || "Não identificada"}${dados.hora ? ` · ${dados.hora}` : ""}`,
    ),
  );
  card.append(criarElemento("p", `🏷️ Categoria: ${categoriaTexto}`));
  card.append(criarElemento("p", `💳 Pagamento: ${pagamentoTexto}`));
  card.append(criarElemento("h3", "🛒 Produtos", "comprovante-subtitulo"));

  const produtos = criarElemento("ul", null, "comprovante-produtos");
  if (Array.isArray(dados.produtos) && dados.produtos.length > 0) {
    dados.produtos.forEach((produto) => {
      const nome = produto.nome || "Produto não identificado";
      const quantidade = produto.quantidade ?? "?";
      const unitario = formatarMoeda(produto.valorUnitario);
      const total = formatarMoeda(produto.valorTotal);
      const item = criarElemento("li", `${nome} — ${quantidade} × ${unitario} — ${total}`);
      const conferencia = produto.conferencia;
      let textoConferencia = "";
      let classeConferencia = "";
      if (conferencia?.status === "conferido") {
        const data = conferencia.conferidoEm
          ? ` · ${new Date(conferencia.conferidoEm).toLocaleString("pt-BR")}`
          : "";
        const resultado = conferencia.resultado === "corrigido"
          ? "Corrigido após comparar com a imagem"
          : conferencia.resultado === "adicionado-manualmente"
            ? "Adicionado manualmente e conferido com a imagem"
            : "Sugestão da IA confirmada com a imagem";
        textoConferencia = `${resultado}${data}`;
        classeConferencia = "produto-conferido";
      } else if (conferencia?.status === "alterado-apos-conferencia") {
        textoConferencia = "Alterado depois da conferência; sem nova comparação";
        classeConferencia = "produto-alterado";
      } else if (produto.origemDado === "alterado-manualmente") {
        textoConferencia = "Alterado manualmente · sem nova conferência visual";
        classeConferencia = "produto-alterado";
      } else if (produto.origemDado === "manual") {
        textoConferencia = "Adicionado manualmente · sem conferência visual";
        classeConferencia = "produto-sem-conferencia";
      } else if (dados.metadadosLeitura) {
        textoConferencia = "Sugestão da IA · sem conferência visual";
        classeConferencia = "produto-sem-conferencia";
      }
      if (textoConferencia) {
        item.append(criarElemento("span", textoConferencia, `status-conferencia-item ${classeConferencia}`));
      }
      if (conferencia?.sugestaoIA && conferencia.resultado !== "confirmado") {
        const detalhes = criarElemento("details", null, "sugestao-original-item");
        detalhes.append(criarElemento("summary", "Ver sugestão original da IA"));
        const sugestao = conferencia.sugestaoIA;
        detalhes.append(criarElemento(
          "span",
          `${sugestao.nome || "Nome não identificado"} · ${sugestao.quantidade ?? "?"} × ${formatarMoeda(sugestao.valorUnitario)} · item ${formatarMoeda(sugestao.valorTotal)}`,
        ));
        item.append(detalhes);
      }
      produtos.append(item);
    });
  } else {
    produtos.append(criarElemento("li", "Nenhum produto identificado"));
  }

  if (Array.isArray(dados.descontos) && dados.descontos.length > 0) {
    dados.descontos.forEach((desconto) => {
      const descricao = desconto.descricao || "Desconto";
      produtos.append(
        criarElemento(
          "li",
          `🏷️ ${descricao} — −${formatarMoeda(desconto.valor)}`,
          "comprovante-desconto",
        ),
      );
    });
  }
  card.append(produtos);

  calcularAvisosDeValores(dados).forEach((aviso) => {
    card.append(criarElemento("p", aviso, "comprovante-aviso"));
  });

  card.append(
    criarElemento(
      "p",
      `Total: ${formatarMoeda(dados.total)}`,
      "comprovante-total",
    ),
  );

  const avisosPendentes = Array.isArray(dados.avisosRevisao)
    ? dados.avisosRevisao
    : [];
  const avisosResolvidos = Array.isArray(dados.historicoAvisosRevisao)
    ? dados.historicoAvisosRevisao
    : dados.statusRevisao === "revisado-com-divergencia"
      ? avisosPendentes.map((mensagem) => ({ mensagem, resolvidoEm: null }))
      : [];
  if (
    dados.statusRevisao === "pendente" ||
    dados.statusRevisao === "revisado-com-divergencia" ||
    avisosResolvidos.length > 0
  ) {
    const estado = avisosPendentes.length > 0 ? "pendente" : "revisado-com-divergencia";
    const revisao = criarElemento("section", null, `estado-revisao estado-${estado}`);
    const tituloRevisao = avisosPendentes.length > 0
      ? "Revisão pendente"
      : "Avisos resolvidos pela pessoa";
    revisao.append(criarElemento("h3", tituloRevisao));

    if (avisosPendentes.length > 0) {
      const listaAvisos = criarElemento("ul", null, "lista-avisos-revisao");
      avisosPendentes.forEach((aviso) => listaAvisos.append(criarElemento("li", aviso)));
      revisao.append(listaAvisos);
    }

    if (avisosResolvidos.length > 0) {
      const detalhes = criarElemento("details", null, "historico-avisos-resolvidos");
      detalhes.append(
        criarElemento("summary", `Histórico de avisos resolvidos (${avisosResolvidos.length})`),
      );
      const listaResolvidos = criarElemento("ul", null, "lista-avisos-revisao");
      avisosResolvidos.forEach((aviso) => {
        const registro = typeof aviso === "string"
          ? { mensagem: aviso, resolvidoEm: null }
          : aviso;
        const dataResolucao = registro.resolvidoEm
          ? new Date(registro.resolvidoEm).toLocaleString("pt-BR")
          : "resolução registrada anteriormente";
        listaResolvidos.append(
          criarElemento("li", `${registro.mensagem} — ${dataResolucao}`),
        );
      });
      detalhes.append(listaResolvidos);
      revisao.append(detalhes);
    }

    if (avisosPendentes.length > 0 && dados.statusRevisao === "pendente" && dados.id) {
      const marcarRevisado = criarElemento("button", "Marcar avisos como revisados", "botao-marcar-revisado");
      marcarRevisado.type = "button";
      marcarRevisado.dataset.acao = "marcar-revisado";
      marcarRevisado.dataset.id = dados.id;
      revisao.append(marcarRevisado);
    }
    card.append(revisao);
  }

  if (dados.id) {
    const acoes = criarElemento("div", null, "comprovante-acoes");
    const editar = criarElemento("button", "Editar", "botao-editar");
    editar.type = "button";
    editar.dataset.acao = "editar";
    editar.dataset.id = dados.id;

    const excluir = criarElemento("button", "Excluir", "botao-excluir");
    excluir.type = "button";
    excluir.dataset.acao = "excluir";
    excluir.dataset.id = dados.id;

    acoes.append(editar, excluir);
    card.append(acoes);
  }

  return card;
}

function criarCampoEdicao(rotulo, nome, valor, tipo = "text") {
  const label = criarElemento("label", rotulo, "campo-edicao");
  const input = criarElemento("input");
  input.name = nome;
  input.type = tipo;
  input.value = valor ?? "";
  if (tipo === "number") {
    input.step = "0.01";
  }
  label.append(input);
  return label;
}

function criarCampoSelecao(rotulo, nome, valorAtual, opcoes) {
  const label = criarElemento("label", rotulo, "campo-edicao");
  const select = criarElemento("select");
  select.name = nome;

  const vazio = criarElemento("option", "Não identificado");
  vazio.value = "";
  select.append(vazio);

  opcoes.forEach(({ nome: nomeOpcao, emoji }) => {
    const option = criarElemento("option", `${emoji} ${nomeOpcao}`);
    option.value = nomeOpcao;
    option.dataset.emoji = emoji;
    select.append(option);
  });

  const valor = typeof valorAtual === "string" ? valorAtual : valorAtual?.nome;
  if (valor && !opcoes.some((opcao) => opcao.nome === valor)) {
    const option = criarElemento("option", valor);
    option.value = valor;
    option.dataset.emoji = typeof valorAtual === "object" ? valorAtual.emoji || "" : "";
    select.append(option);
  }
  select.value = valor || "";
  label.append(select);
  return label;
}

const CATEGORIAS = [
  { nome: "Alimentação", emoji: "🍔" },
  { nome: "Transporte", emoji: "🚗" },
  { nome: "Moradia", emoji: "🏠" },
  { nome: "Saúde", emoji: "💊" },
  { nome: "Lazer", emoji: "🎮" },
  { nome: "Educação", emoji: "📚" },
  { nome: "Compras", emoji: "🛍️" },
  { nome: "Contas e serviços", emoji: "💡" },
  { nome: "Pets", emoji: "🐾" },
  { nome: "Outros", emoji: "📦" },
];

const FORMAS_PAGAMENTO = [
  { nome: "Dinheiro", emoji: "💵" },
  { nome: "Pix", emoji: "📱" },
  { nome: "Cartão de crédito", emoji: "💳" },
  { nome: "Cartão de débito", emoji: "💳" },
  { nome: "Não identificado", emoji: "❓" },
];

function criarStatusConferenciaProduto(produto) {
  if (produto.conferencia?.status === "conferido") {
    if (produto.conferencia.resultado === "corrigido") return "Corrigido após comparar com a imagem";
    if (produto.conferencia.resultado === "adicionado-manualmente") return "Adicionado manualmente e conferido";
    return "Sugestão da IA confirmada com a imagem";
  }
  if (produto.conferencia?.status === "alterado-apos-conferencia") {
    return "Alterado depois da conferência; confira a imagem novamente";
  }
  return "Sem conferência visual";
}

export function criarLinhaProdutoEdicao(produto = {}, opcoes = {}) {
  const linha = criarElemento("div", null, "linha-edicao linha-produto");
  linha.setAttribute("role", "group");
  linha.conferenciaOriginal = produto.conferencia || null;
  linha.sugestaoIAOriginal = produto.conferencia?.sugestaoIA || (
    produto.origemDado === "manual"
      ? null
      : {
          nome: produto.nome ?? null,
          quantidade: produto.quantidade ?? null,
          valorUnitario: produto.valorUnitario ?? null,
          valorTotal: produto.valorTotal ?? null,
        }
  );
  linha.origemDadoOriginal = produto.origemDado || null;
  linha.dataset.origemManual = String(opcoes.origemManual === true);
  linha.append(criarElemento("span", null, "numero-produto"));
  linha.append(
    criarCampoEdicao("Produto", "nome", produto.nome),
    criarCampoEdicao("Quantidade", "quantidade", produto.quantidade, "number"),
    criarCampoEdicao("Valor unitário (R$)", "valorUnitario", produto.valorUnitario, "number"),
    criarCampoEdicao("Total do item (R$)", "valorTotal", produto.valorTotal, "number"),
  );
  if (opcoes.exigirConferencia) {
    const confirmacao = criarElemento("label", null, "confirmacao-produto");
    const checkbox = criarElemento("input");
    checkbox.type = "checkbox";
    checkbox.name = "produtoConferido";
    confirmacao.append(
      checkbox,
      criarElemento("span", "Conferi nome, quantidade e valores deste produto com a imagem"),
    );
    linha.append(confirmacao);
  } else if (opcoes.mostrarStatusConferencia) {
    linha.append(
      criarElemento("span", criarStatusConferenciaProduto(produto), "status-conferencia-edicao"),
    );
  }
  const remover = criarElemento("button", "Remover produto", "botao-cancelar");
  remover.type = "button";
  remover.dataset.acao = "remover-produto";
  linha.append(remover);
  return linha;
}

export function criarLinhaDescontoEdicao(desconto = {}) {
  const linha = criarElemento("div", null, "linha-edicao linha-desconto");
  linha.append(
    criarCampoEdicao("Descrição do desconto", "descricao", desconto.descricao),
    criarCampoEdicao("Valor do desconto (R$)", "valor", desconto.valor, "number"),
  );
  const remover = criarElemento("button", "Remover desconto", "botao-cancelar");
  remover.type = "button";
  remover.dataset.acao = "remover-desconto";
  linha.append(remover);
  return linha;
}

export function atualizarIndicadoresProdutosRepetidos(form) {
  const linhas = Array.from(form.querySelectorAll(".linha-produto"));
  const produtos = linhas.map((linha) => ({
    nome: linha.querySelector('[name="nome"]').value.trim() || null,
    quantidade: numeroOuNull(linha.querySelector('[name="quantidade"]').value),
    valorUnitario: numeroOuNull(linha.querySelector('[name="valorUnitario"]').value),
    valorTotal: numeroOuNull(linha.querySelector('[name="valorTotal"]').value),
  }));
  const indicesSuspeitos = new Set(
    encontrarGruposDeProdutosRepetidos(produtos).flat(),
  );

  linhas.forEach((linha, indice) => {
    const numero = linha.querySelector(".numero-produto");
    if (numero) {
      numero.textContent = `Produto ${indice + 1}`;
      linha.setAttribute("aria-label", `Produto ${indice + 1}`);
    }
    const checkboxConferencia = linha.querySelector('[name="produtoConferido"]');
    if (checkboxConferencia) {
      checkboxConferencia.setAttribute(
        "aria-label",
        `Conferi nome, quantidade e valores do produto ${indice + 1} com a imagem`,
      );
    }

    const repetido = indicesSuspeitos.has(indice);
    linha.classList.toggle("produto-suspeito", repetido);
    let marcador = linha.querySelector(".marcador-repeticao");
    if (repetido && !marcador) {
      marcador = criarElemento(
        "span",
        "Nome repetido — confira descrição e valores; linha mantida",
        "marcador-repeticao",
      );
      marcador.setAttribute("role", "note");
      linha.append(marcador);
    } else if (!repetido && marcador) {
      marcador.remove();
    }
  });
}

export function criarMensagemFormulario(texto, classe) {
  const mensagem = criarElemento("p", texto, classe);
  mensagem.setAttribute("role", classe === "erro-formulario" ? "alert" : "status");
  if (classe === "erro-formulario") mensagem.tabIndex = -1;
  return mensagem;
}

function normalizarHistoricoAvisos(avisos) {
  if (!Array.isArray(avisos)) return [];
  return avisos
    .map((aviso) => typeof aviso === "string"
      ? { mensagem: aviso, resolvidoEm: null }
      : aviso && typeof aviso.mensagem === "string"
        ? { mensagem: aviso.mensagem, resolvidoEm: aviso.resolvidoEm || null }
        : null)
    .filter(Boolean);
}

function criarAvisosParaConferencia(avisos) {
  if (avisos.length === 0) return null;

  const secao = criarElemento("section", null, "avisos-origem");
  secao.append(
    criarElemento("h4", "Avisos da leitura anterior"),
    criarElemento(
      "p",
      "Confira cada aviso com a imagem e marque os que já foram corrigidos ou esclarecidos.",
    ),
  );

  avisos.forEach((aviso, indice) => {
    const linha = criarElemento("label", null, "aviso-origem");
    const checkbox = criarElemento("input");
    checkbox.type = "checkbox";
    checkbox.name = "avisosResolvidos";
    checkbox.value = String(indice);
    linha.append(checkbox, criarElemento("span", aviso));
    secao.append(linha);
  });

  return secao;
}

function criarHistoricoDeAvisos(avisos) {
  if (avisos.length === 0) return null;

  const detalhes = criarElemento("details", null, "historico-avisos-resolvidos");
  detalhes.append(
    criarElemento("summary", `Avisos resolvidos anteriormente (${avisos.length})`),
  );
  const lista = criarElemento("ul", null, "lista-avisos-revisao");
  avisos.forEach(({ mensagem, resolvidoEm }) => {
    const dataResolucao = resolvidoEm
      ? new Date(resolvidoEm).toLocaleString("pt-BR")
      : "resolução registrada anteriormente";
    lista.append(criarElemento("li", `${mensagem} — ${dataResolucao}`));
  });
  detalhes.append(lista);
  return detalhes;
}

export function criarFormularioEdicao(comprovante, opcoes = {}) {
  const form = criarElemento("form", null, "form-edicao");
  const modoRevisao = opcoes.modo === "revisao";
  form.dataset.id = comprovante.id;
  form.dataset.modo = modoRevisao ? "revisao" : "edicao";
  form.dataset.hashImagem = opcoes.hashImagem || "";
  form.dataset.imagemOriginalDisponivel = String(modoRevisao && Boolean(opcoes.imagemUrl));
  form.dadosBase = JSON.parse(JSON.stringify(comprovante));
  form.avisosIniciais = [...(opcoes.avisos || [])];
  form.historicoAvisosResolvidos = normalizarHistoricoAvisos(
    opcoes.avisosResolvidos || comprovante.historicoAvisosRevisao,
  );
  const painelCampos = modoRevisao
    ? criarElemento("div", null, "revisao-campos")
    : form;

  form.append(criarElemento(
    "h3",
    modoRevisao ? "Sugestões da IA — confira com a imagem" : "Corrigir comprovante",
  ));
  if (modoRevisao) {
    const grade = criarElemento("div", null, "revisao-comparacao");
    const figura = criarElemento("figure", null, "imagem-comprovante-revisao");
    figura.append(criarElemento("figcaption", "Comprovante original"));
    if (opcoes.imagemUrl) {
      const imagem = criarElemento("img");
      imagem.src = opcoes.imagemUrl;
      imagem.alt = "Comprovante original para comparar nome, quantidade e preço de cada produto";
      figura.append(imagem);
    } else {
      figura.append(criarElemento("p", "A imagem original não está disponível nesta revisão."));
    }
    grade.append(figura, painelCampos);
    form.append(grade);
    painelCampos.append(
      criarMensagemFormulario(
        "Os dados abaixo são sugestões da IA. Confira cada produto na imagem; o total correto não prova que os preços foram associados aos produtos certos.",
        "aviso-formulario",
      ),
    );
  }
  const avisosParaConferencia = criarAvisosParaConferencia(form.avisosIniciais);
  if (avisosParaConferencia) painelCampos.append(avisosParaConferencia);
  const avisosResolvidos = criarHistoricoDeAvisos(form.historicoAvisosResolvidos);
  if (avisosResolvidos) painelCampos.append(avisosResolvidos);
  painelCampos.append(
    criarCampoEdicao(
      "Estabelecimento",
      "estabelecimento",
      comprovante.estabelecimento,
    ),
    criarCampoEdicao("Data", "data", comprovante.data, "date"),
    criarCampoEdicao("Horário", "hora", comprovante.hora, "time"),
    criarCampoEdicao("Total (R$)", "total", comprovante.total, "number"),
    criarCampoSelecao("Categoria", "categoria", comprovante.categoria, CATEGORIAS),
    criarCampoSelecao("Forma de pagamento", "pagamento", comprovante.pagamento, FORMAS_PAGAMENTO),
  );

  painelCampos.append(criarElemento("h4", "Produtos"));
  const listaProdutos = criarElemento("div", null, "lista-edicao-produtos");
  (Array.isArray(comprovante.produtos) ? comprovante.produtos : []).forEach(
    (produto) => listaProdutos.append(criarLinhaProdutoEdicao(produto, {
      exigirConferencia: modoRevisao,
      mostrarStatusConferencia: !modoRevisao && Boolean(comprovante.metadadosLeitura || produto.conferencia),
    })),
  );
  painelCampos.append(listaProdutos);
  const adicionarProduto = criarElemento("button", "Adicionar produto", "botao-cancelar");
  adicionarProduto.type = "button";
  adicionarProduto.dataset.acao = "adicionar-produto";
  painelCampos.append(adicionarProduto);

  painelCampos.append(criarElemento("h4", "Descontos"));
  const listaDescontos = criarElemento("div", null, "lista-edicao-descontos");
  (Array.isArray(comprovante.descontos) ? comprovante.descontos : []).forEach(
    (desconto) => listaDescontos.append(criarLinhaDescontoEdicao(desconto)),
  );
  painelCampos.append(listaDescontos);
  const adicionarDesconto = criarElemento("button", "Adicionar desconto", "botao-cancelar");
  adicionarDesconto.type = "button";
  adicionarDesconto.dataset.acao = "adicionar-desconto";
  painelCampos.append(adicionarDesconto);
  painelCampos.append(criarElemento("div", null, "mensagens-validacao"));

  const acoes = criarElemento("div", null, "comprovante-acoes");
  const textoSalvar = modoRevisao
    ? "Confirmar e salvar"
    : "Salvar alterações";
  const salvar = criarElemento("button", textoSalvar, "botao-editar");
  salvar.type = "submit";
  const textoCancelar = modoRevisao
    ? "Descartar leitura"
    : "Cancelar";
  const cancelar = criarElemento("button", textoCancelar, "botao-cancelar");
  cancelar.type = "button";
  cancelar.dataset.acao = modoRevisao
    ? "cancelar-revisao"
    : "cancelar-edicao";
  acoes.append(salvar, cancelar);
  painelCampos.append(acoes);
  form.addEventListener("input", (event) => {
    atualizarIndicadoresProdutosRepetidos(form);
    const linha = event.target.closest?.(".linha-produto");
    if (!linha) return;

    const checkbox = linha.querySelector('[name="produtoConferido"]');
    if (modoRevisao && checkbox && event.target !== checkbox) {
      checkbox.checked = false;
    }

    if (!modoRevisao) {
      linha.dataset.dadosAlterados = "true";
      const status = linha.querySelector(".status-conferencia-edicao");
      if (linha.conferenciaOriginal?.status === "conferido") {
        linha.dataset.conferenciaInvalidada = "true";
        if (status) {
          status.textContent = "Alterado após conferência; imagem original não está salva";
          status.className = "status-conferencia-edicao produto-alterado";
        }
      } else if (status) {
        status.textContent = "Alterado manualmente; sem conferência visual";
        status.className = "status-conferencia-edicao produto-alterado";
      }
    }
  });
  atualizarIndicadoresProdutosRepetidos(form);
  form.dataset.snapshot = criarSnapshotFormulario(form);
  return form;
}
