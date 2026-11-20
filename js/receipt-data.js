import { ehNumeroValido, formatarMoeda } from "./helpers.js";

const CATEGORIAS_PERMITIDAS = new Map([
  ["Alimentação", "🍔"],
  ["Transporte", "🚗"],
  ["Moradia", "🏠"],
  ["Saúde", "💊"],
  ["Lazer", "🎮"],
  ["Educação", "📚"],
  ["Compras", "🛍️"],
  ["Contas e serviços", "💡"],
  ["Pets", "🐾"],
  ["Outros", "📦"],
]);

const PAGAMENTOS_PERMITIDOS = new Map([
  ["Dinheiro", "💵"],
  ["Pix", "📱"],
  ["Cartão de crédito", "💳"],
  ["Cartão de débito", "💳"],
  ["Não identificado", "❓"],
]);

function normalizarOpcao(dado, opcoes, campo, avisos) {
  if (dado === null || dado === undefined || dado === "") return null;

  const nome = typeof dado === "string" ? dado : dado?.nome;
  if (typeof nome === "string" && opcoes.has(nome)) {
    return { nome, emoji: opcoes.get(nome) };
  }

  avisos.push(`A ${campo} recebida não é uma opção reconhecida; confira no formulário.`);
  return null;
}

function ehDataValida(data) {
  const correspondencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data || "");
  if (!correspondencia) return false;

  const ano = Number(correspondencia[1]);
  const mes = Number(correspondencia[2]);
  const dia = Number(correspondencia[3]);
  const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
  const diasNoMes = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes[mes - 1];
}

function normalizarValorNumerico(valor) {
  return ehNumeroValido(valor) && valor >= 0 ? valor : null;
}

export function pareceLinhaDePreco(nome) {
  return /(?:\bR\$\s*\d|=>|^\s*\d+(?:[.,]\d+)?\s*[x×]\s*(?:R\$\s*)?\d)/i.test(nome);
}

export function paraCentavos(valor) {
  return Math.round((valor + Number.EPSILON) * 100);
}

export function calcularAvisosDeValores(dados) {
  const avisos = [];
  const produtos = Array.isArray(dados.produtos) ? dados.produtos : [];
  const descontos = Array.isArray(dados.descontos) ? dados.descontos : [];

  produtos.forEach((produto, indice) => {
    if (
      !produto ||
      !ehNumeroValido(produto.quantidade) ||
      produto.quantidade <= 0 ||
      !ehNumeroValido(produto.valorUnitario) ||
      produto.valorUnitario < 0 ||
      !ehNumeroValido(produto.valorTotal) ||
      produto.valorTotal < 0
    ) {
      return;
    }

    const calculadoCentavos = paraCentavos(produto.quantidade * produto.valorUnitario);
    const informadoCentavos = paraCentavos(produto.valorTotal);
    const diferencaCentavos = Math.abs(calculadoCentavos - informadoCentavos);
    if (diferencaCentavos > 0) {
      const regraCentavo = diferencaCentavos === 1
        ? " Só aceite essa diferença se o comprovante explicar o arredondamento."
        : " Confira os valores no comprovante.";
      avisos.push(
        `Quantidade × valor unitário do produto ${indice + 1} difere em ${formatarMoeda(diferencaCentavos / 100)} do total do item.${regraCentavo}`,
      );
    }
  });

  const produtosCompletos = produtos.length > 0 && produtos.every((produto) =>
    produto && ehNumeroValido(produto.valorTotal),
  );
  const descontosCompletos = descontos.every((desconto) =>
    desconto && ehNumeroValido(desconto.valor) && desconto.valor >= 0,
  );
  if (ehNumeroValido(dados.total) && dados.total >= 0 && produtosCompletos && descontosCompletos) {
    const somaItensCentavos = produtos.reduce(
      (soma, produto) => soma + paraCentavos(produto.valorTotal),
      0,
    );
    const somaDescontosCentavos = descontos.reduce(
      (soma, desconto) => soma + paraCentavos(desconto.valor),
      0,
    );
    const totalCentavos = paraCentavos(dados.total);
    const somaLiquidaCentavos = somaItensCentavos - somaDescontosCentavos;
    const diferencaCentavos = Math.abs(somaLiquidaCentavos - totalCentavos);
    if (diferencaCentavos > 0) {
      const regraCentavo = diferencaCentavos === 1
        ? " Só aceite essa diferença se o comprovante explicar o arredondamento."
        : " Confira os valores no comprovante.";
      avisos.push(
        `Itens menos descontos somam ${formatarMoeda(somaLiquidaCentavos / 100)}, mas o comprovante informa ${formatarMoeda(totalCentavos / 100)} (diferença de ${formatarMoeda(diferencaCentavos / 100)}).${regraCentavo}`,
      );
    }
  }

  return avisos;
}

export function normalizarNomeProduto(nome) {
  return String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function encontrarGruposDeProdutosRepetidos(produtos) {
  const gruposPorChave = new Map();

  produtos.forEach((produto, indice) => {
    const nomeNormalizado = normalizarNomeProduto(produto.nome);
    if (!nomeNormalizado) return;

    const indices = gruposPorChave.get(nomeNormalizado) || [];
    indices.push(indice);
    gruposPorChave.set(nomeNormalizado, indices);
  });

  return [...gruposPorChave.values()].filter((indices) => indices.length > 1);
}

export function encontrarPossivelDuplicataDeComprovante(
  comprovante,
  historico,
  hashImagem,
) {
  const nomeAtual = normalizarNomeProduto(comprovante.estabelecimento);
  if (
    !nomeAtual ||
    !comprovante.data ||
    !comprovante.hora ||
    !ehNumeroValido(comprovante.total)
  ) {
    return null;
  }

  const totalAtualCentavos = Math.round(comprovante.total * 100);
  return historico.find((salvo) => {
    if (hashImagem && salvo.hashImagem === hashImagem) {
      return false;
    }

    return (
      normalizarNomeProduto(salvo.estabelecimento) === nomeAtual &&
      salvo.data === comprovante.data &&
      salvo.hora === comprovante.hora &&
      ehNumeroValido(salvo.total) &&
      Math.round(salvo.total * 100) === totalAtualCentavos
    );
  }) || null;
}

export function prepararComprovante(dadosBrutos) {
  if (!dadosBrutos || typeof dadosBrutos !== "object" || Array.isArray(dadosBrutos)) {
    throw new Error("A resposta da IA não contém um objeto de comprovante.");
  }

  const avisos = [];
  if (!Array.isArray(dadosBrutos.produtos)) {
    avisos.push("A lista de produtos veio em formato inválido. Confira e adicione os produtos manualmente.");
  }
  const produtosRecebidos = Array.isArray(dadosBrutos.produtos)
    ? dadosBrutos.produtos
    : [];
  const produtosSemLinhasDePreco = produtosRecebidos.filter((produtoRecebido, indice) => {
    const produto = produtoRecebido && typeof produtoRecebido === "object" && !Array.isArray(produtoRecebido)
      ? produtoRecebido
      : null;
    const nome = typeof produto?.nome === "string" ? produto.nome.trim() : "";
    if (!nome || !pareceLinhaDePreco(nome)) return true;

    avisos.push(
      `A linha ${indice + 1} parece ser quantidade/preço, não um produto, e foi removida da lista. Confira a imagem e adicione a descrição correspondente se estiver faltando.`,
    );
    return false;
  });
  const produtos = produtosSemLinhasDePreco.map((produtoRecebido, indice) => {
    const numero = indice + 1;
    const produto = produtoRecebido && typeof produtoRecebido === "object" && !Array.isArray(produtoRecebido)
      ? produtoRecebido
      : {};
    if (produto !== produtoRecebido) {
      avisos.push(`O produto ${numero} veio em formato inválido. A linha foi mantida para você corrigir ou remover.`);
    }

    const nome = typeof produto.nome === "string" ? produto.nome.trim() : "";
    if (!nome) avisos.push(`O produto ${numero} está sem nome; confira a imagem.`);

    const camposNumericos = ["quantidade", "valorUnitario", "valorTotal"];
    camposNumericos.forEach((campo) => {
      if (normalizarValorNumerico(produto[campo]) === null) {
        avisos.push(`O produto ${numero} está sem um valor válido em ${campo}; confira a imagem.`);
      }
    });

    return {
      nome: nome || null,
      quantidade: normalizarValorNumerico(produto.quantidade),
      valorUnitario: normalizarValorNumerico(produto.valorUnitario),
      valorTotal: normalizarValorNumerico(produto.valorTotal),
    };
  });

  if (!Array.isArray(dadosBrutos.descontos)) {
    avisos.push("A lista de descontos veio em formato inválido. Confira os descontos manualmente.");
  }
  const descontosRecebidos = Array.isArray(dadosBrutos.descontos)
    ? dadosBrutos.descontos
    : [];
  const descontos = descontosRecebidos.map((descontoRecebido, indice) => {
    const numero = indice + 1;
    const desconto = descontoRecebido && typeof descontoRecebido === "object" && !Array.isArray(descontoRecebido)
      ? descontoRecebido
      : {};
    if (desconto !== descontoRecebido) {
      avisos.push(`O desconto ${numero} veio em formato inválido. A linha foi mantida para você corrigir ou remover.`);
    }
    const descricao = typeof desconto.descricao === "string" ? desconto.descricao.trim() : "";
    const valor = normalizarValorNumerico(desconto.valor);
    if (!descricao) avisos.push(`O desconto ${numero} está sem descrição; confira a imagem.`);
    if (valor === null) avisos.push(`O desconto ${numero} está sem um valor válido; confira a imagem.`);
    if (valor === 0) {
      avisos.push(`O desconto ${numero} está com valor R$ 0,00; confirme se deve permanecer na lista.`);
    }
    return { descricao: descricao || null, valor };
  });

  const total = normalizarValorNumerico(dadosBrutos.total);
  if (total === null) {
    avisos.push("A IA não identificou um total válido. Confira ou preencha antes de salvar.");
  }

  const hora =
    typeof dadosBrutos.hora === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(dadosBrutos.hora)
      ? dadosBrutos.hora
      : null;
  if (dadosBrutos.hora !== undefined && dadosBrutos.hora !== null && hora === null) {
    avisos.push("O horário não está no formato HH:MM. Confira ou corrija antes de salvar.");
  }

  const data = typeof dadosBrutos.data === "string" && ehDataValida(dadosBrutos.data)
    ? dadosBrutos.data
    : null;
  if (dadosBrutos.data !== undefined && dadosBrutos.data !== null && data === null) {
    avisos.push("A data não é uma data válida no formato AAAA-MM-DD. Confira na imagem.");
  }
  if (dadosBrutos.data === undefined || dadosBrutos.data === null || dadosBrutos.data === "") {
    avisos.push("A IA não identificou a data. Confira na imagem.");
  }

  const estabelecimento = typeof dadosBrutos.estabelecimento === "string"
    ? dadosBrutos.estabelecimento.trim() || null
    : null;
  if (!estabelecimento) avisos.push("O estabelecimento não foi identificado; confira na imagem.");

  return {
    dados: {
      estabelecimento,
      data,
      hora,
      categoria: normalizarOpcao(dadosBrutos.categoria, CATEGORIAS_PERMITIDAS, "categoria", avisos),
      pagamento: normalizarOpcao(dadosBrutos.pagamento, PAGAMENTOS_PERMITIDOS, "forma de pagamento", avisos),
      produtos,
      descontos,
      total,
    },
    avisos,
  };
}

export function validarComprovante(dados) {
  const erros = [];
  const avisos = [];

  if (!Array.isArray(dados.produtos)) {
    erros.push("A lista de produtos está inválida. Refaça a leitura do comprovante.");
    return { erros, avisos };
  }
  if (!Array.isArray(dados.descontos)) {
    erros.push("A lista de descontos está inválida. Refaça a leitura do comprovante.");
    return { erros, avisos };
  }

  if (dados.data && !ehDataValida(dados.data)) {
    erros.push("A data precisa ser uma data real no formato AAAA-MM-DD.");
  }
  if (dados.hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dados.hora)) {
    erros.push("O horário precisa estar no formato HH:MM.");
  }
  if (dados.categoria && !CATEGORIAS_PERMITIDAS.has(dados.categoria.nome)) {
    erros.push("Selecione uma categoria válida.");
  }
  if (dados.pagamento && !PAGAMENTOS_PERMITIDOS.has(dados.pagamento.nome)) {
    erros.push("Selecione uma forma de pagamento válida.");
  }

  dados.produtos.forEach((produto, indice) => {
    const numeroItem = indice + 1;
    if (!produto || typeof produto !== "object" || Array.isArray(produto)) {
      erros.push(`O produto ${numeroItem} está inválido. Corrija ou remova essa linha.`);
      return;
    }
    if (typeof produto.nome !== "string" || !produto.nome.trim()) {
      erros.push(`Informe o nome do produto ${numeroItem} ou remova essa linha.`);
    } else if (pareceLinhaDePreco(produto.nome)) {
      erros.push(
        `O nome do produto ${numeroItem} parece conter uma linha de quantidade ou preço. Corrija o nome comparando com a imagem.`,
      );
    }

    const camposNumericos = [
      produto.quantidade,
      produto.valorUnitario,
      produto.valorTotal,
    ];
    if (camposNumericos.some((valor) => valor === null)) {
      erros.push(`Preencha quantidade, valor unitário e total do produto ${numeroItem}, ou remova essa linha.`);
      return;
    }

    if (camposNumericos.some((valor) => !ehNumeroValido(valor) || valor < 0) || produto.quantidade <= 0) {
      erros.push(`Revise quantidade e valores do produto ${numeroItem}.`);
      return;
    }

  });

  dados.descontos.forEach((desconto, indice) => {
    if (!desconto || typeof desconto !== "object" || Array.isArray(desconto)) {
      erros.push(`O desconto ${indice + 1} está inválido. Corrija ou remova essa linha.`);
      return;
    }
    if (!desconto.descricao) {
      erros.push(`Informe a descrição do desconto ${indice + 1} ou remova essa linha.`);
    }
    if (desconto.valor === null) {
      erros.push(`Preencha o valor do desconto ${indice + 1} ou remova essa linha.`);
    } else if (!ehNumeroValido(desconto.valor) || desconto.valor < 0) {
      erros.push(`O valor do desconto ${indice + 1} precisa ser igual ou maior que zero.`);
    }
  });

  if (dados.total === null) {
    erros.push("Preencha o total do comprovante antes de salvar.");
  } else if (!ehNumeroValido(dados.total) || dados.total < 0) {
    erros.push("O total precisa ser um valor válido e não negativo.");
  }

  if (dados.produtos.length === 0) {
    avisos.push("Não há produtos para conferir a soma; revise o total manualmente.");
  }

  avisos.push(...calcularAvisosDeValores(dados));

  return { erros, avisos };
}

export async function calcularHashImagem(arquivo) {
  const conteudo = await arquivo.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", conteudo);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
