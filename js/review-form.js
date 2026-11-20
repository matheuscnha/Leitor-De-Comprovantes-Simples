import {
  anunciarStatus,
  focarTituloHistorico,
  numeroOuNull,
} from "./helpers.js";
import {
  encontrarGruposDeProdutosRepetidos,
  pareceLinhaDePreco,
  validarComprovante,
} from "./receipt-data.js";
import {
  atualizarComprovante,
  salvarComprovante,
} from "./storage.js";
import {
  criarCartaoComprovante,
  criarMensagemFormulario,
} from "./ui.js";
import { estadoApp, liberarImagemEmRevisao } from "./app-state.js";
import { mostrarErroArmazenamento } from "./app-feedback.js";
import { atualizarResumo, mostrarHistorico } from "./history-view.js";
import {
  executarContinuacaoAposSalvar,
  limparContinuacaoAposSalvar,
} from "./unsaved-changes.js";
import { construirEstadoRevisao } from "./review-status.js";
import {
  criarRegistroConferenciaProduto,
  validarConferenciaVisual,
} from "./product-review.js";

function destacarCamposInvalidos(form) {
  form.querySelectorAll('[aria-invalid="true"]').forEach((campo) => {
    campo.removeAttribute("aria-invalid");
  });

  const marcar = (campo, invalido) => {
    if (campo && invalido) campo.setAttribute("aria-invalid", "true");
  };
  const total = form.querySelector('[name="total"]');
  const valorTotal = numeroOuNull(total?.value ?? "");
  marcar(total, valorTotal === null || valorTotal < 0);
  ["categoria", "pagamento"].forEach((nome) => {
    const campo = form.querySelector(`[name="${nome}"]`);
    marcar(campo, Boolean(campo?.value) && !campo.selectedOptions[0]?.dataset.emoji);
  });

  form.querySelectorAll(".linha-produto").forEach((linha) => {
    const nome = linha.querySelector('[name="nome"]');
    marcar(nome, !nome?.value.trim() || pareceLinhaDePreco(nome.value));
    ["quantidade", "valorUnitario", "valorTotal"].forEach((campoNome) => {
      const campo = linha.querySelector(`[name="${campoNome}"]`);
      const valor = numeroOuNull(campo?.value ?? "");
      marcar(campo, valor === null || valor < 0 || (campoNome === "quantidade" && valor === 0));
    });
    const checkboxConferencia = linha.querySelector('[name="produtoConferido"]');
    marcar(checkboxConferencia, form.dataset.modo === "revisao" && !checkboxConferencia?.checked);
  });

  form.querySelectorAll(".linha-desconto").forEach((linha) => {
    const descricao = linha.querySelector('[name="descricao"]');
    const valorCampo = linha.querySelector('[name="valor"]');
    const valor = numeroOuNull(valorCampo?.value ?? "");
    marcar(descricao, !descricao?.value.trim());
    marcar(valorCampo, valor === null || valor < 0);
  });
}

function lerProdutosDoFormulario(form) {
  return Array.from(form.querySelectorAll(".linha-produto"))
    .map((linha) => {
      const produto = {
        nome: linha.querySelector('[name="nome"]').value.trim() || null,
        quantidade: numeroOuNull(linha.querySelector('[name="quantidade"]').value),
        valorUnitario: numeroOuNull(linha.querySelector('[name="valorUnitario"]').value),
        valorTotal: numeroOuNull(linha.querySelector('[name="valorTotal"]').value),
      };
      const conferencia = criarRegistroConferenciaProduto({
        modo: form.dataset.modo,
        conferido: linha.querySelector('[name="produtoConferido"]')?.checked,
        conferidoEm: new Date().toISOString(),
        conferenciaOriginal: linha.conferenciaOriginal,
        conferenciaInvalidada: linha.dataset.conferenciaInvalidada === "true",
        sugestaoIA: linha.sugestaoIAOriginal,
        valoresConferidos: produto,
        origemManual: linha.dataset.origemManual === "true",
      });
      if (conferencia) produto.conferencia = conferencia;
      if (linha.dataset.origemManual === "true") {
        produto.origemDado = "manual";
      } else if (linha.dataset.dadosAlterados === "true" && !conferencia) {
        produto.origemDado = "alterado-manualmente";
      } else if (linha.origemDadoOriginal) {
        produto.origemDado = linha.origemDadoOriginal;
      }
      return produto;
    })
    .filter((produto) => form.dataset.modo === "revisao" ||
      produto.nome || produto.quantidade !== null || produto.valorUnitario !== null || produto.valorTotal !== null);
}

function lerDescontosDoFormulario(form) {
  return Array.from(form.querySelectorAll(".linha-desconto"))
    .map((linha) => ({
      descricao: linha.querySelector('[name="descricao"]').value.trim() || null,
      valor: numeroOuNull(linha.querySelector('[name="valor"]').value),
    }))
    .filter((desconto) =>
      desconto.valor !== 0 && (desconto.descricao || desconto.valor !== null),
    );
}

function lerIndicesDeAvisosResolvidos(form) {
  return new Set(
    Array.from(
      form.querySelectorAll('[name="avisosResolvidos"]:checked'),
      (checkbox) => Number(checkbox.value),
    ),
  );
}

function criarAlteracoesDoFormulario(form, dadosDoFormulario) {
  return {
    estabelecimento: dadosDoFormulario.get("estabelecimento").trim() || null,
    data: dadosDoFormulario.get("data") || null,
    hora: dadosDoFormulario.get("hora") || null,
    categoria: dadosDoFormulario.get("categoria")
      ? {
          nome: dadosDoFormulario.get("categoria"),
          emoji: form.querySelector('[name="categoria"]')?.selectedOptions[0]?.dataset.emoji || "",
        }
      : null,
    pagamento: dadosDoFormulario.get("pagamento")
      ? {
          nome: dadosDoFormulario.get("pagamento"),
          emoji: form.querySelector('[name="pagamento"]')?.selectedOptions[0]?.dataset.emoji || "",
        }
      : null,
    total: dadosDoFormulario.get("total") === ""
      ? null
      : Number(dadosDoFormulario.get("total")),
    produtos: lerProdutosDoFormulario(form),
    descontos: lerDescontosDoFormulario(form),
  };
}

function validarEExibir(form, dadosConferidos) {
  const gruposRepetidos = encontrarGruposDeProdutosRepetidos(dadosConferidos.produtos);
  const validacao = validarComprovante(dadosConferidos);
  const linhasConferidas = Array.from(form.querySelectorAll(".linha-produto"), (linha) =>
    Boolean(linha.querySelector('[name="produtoConferido"]')?.checked),
  );
  validacao.erros.push(...validarConferenciaVisual({
    modo: form.dataset.modo,
    imagemOriginalDisponivel: form.dataset.imagemOriginalDisponivel === "true",
    linhasProduto: linhasConferidas,
  }));
  const avisosAtuais = [...new Set([
    ...validacao.avisos,
    ...gruposRepetidos.map(() =>
      "Há nomes de produtos repetidos. Compare descrição e valores com a imagem; todas as linhas foram mantidas.",
    ),
  ])];
  form.querySelectorAll('[name="avisosResolvidos"]').forEach((checkbox) => {
    const avisoOriginal = form.avisosIniciais[Number(checkbox.value)];
    if (avisosAtuais.includes(avisoOriginal)) checkbox.checked = false;
  });
  const indicesResolvidos = lerIndicesDeAvisosResolvidos(form);
  const avisosOriginaisPendentes = (form.avisosIniciais || [])
    .filter((aviso, indice) => !indicesResolvidos.has(indice));
  const avisos = [...new Set([...avisosAtuais, ...avisosOriginaisPendentes])];

  const mensagens = form.querySelector(".mensagens-validacao");
  mensagens.replaceChildren();
  destacarCamposInvalidos(form);
  validacao.erros.forEach((erro) => {
    mensagens.append(criarMensagemFormulario(erro, "erro-formulario"));
  });
  avisos.forEach((aviso) => {
    mensagens.append(criarMensagemFormulario(aviso, "aviso-formulario"));
  });

  return { validacao, avisos, avisosAtuais, mensagens };
}

function salvarFormulario(event) {
  if (!event.target.matches("form.form-edicao")) return;

  event.preventDefault();
  const form = event.target;
  const dadosDoFormulario = new FormData(form);
  const alteracoes = criarAlteracoesDoFormulario(form, dadosDoFormulario);
  const dadosConferidos = { ...(form.dadosBase || {}), ...alteracoes };
  const { validacao, avisos, avisosAtuais, mensagens } = validarEExibir(form, dadosConferidos);

  if (validacao.erros.length > 0) {
    limparContinuacaoAposSalvar(form);
    mensagens.querySelector(".erro-formulario")?.focus();
    return;
  }

  if (
    avisos.length > 0 &&
    !window.confirm(
      `Há avisos neste comprovante:\n\n${avisos.join("\n")}\n\nSe salvar, ele ficará marcado como “Revisão pendente” até você marcar os avisos como revisados. Deseja continuar?`,
    )
  ) {
    limparContinuacaoAposSalvar(form);
    anunciarStatus("Salvamento cancelado para revisar os avisos.");
    return;
  }

  const estadoRevisao = construirEstadoRevisao({
    avisosAtuais,
    avisosIniciais: form.avisosIniciais || [],
    indicesResolvidos: lerIndicesDeAvisosResolvidos(form),
    historicoAvisosResolvidos: form.historicoAvisosResolvidos || [],
  });
  const resultadoSalvamento = form.dataset.modo === "revisao"
    ? salvarComprovante(
        { ...dadosConferidos, ...estadoRevisao },
        form.dataset.hashImagem,
      )
    : atualizarComprovante(form.dataset.id, { ...alteracoes, ...estadoRevisao });

  if (!resultadoSalvamento.ok) {
    limparContinuacaoAposSalvar(form);
    mensagens.append(criarMensagemFormulario(resultadoSalvamento.mensagem, "erro-formulario"));
    mostrarErroArmazenamento(resultadoSalvamento.mensagem);
    return;
  }

  if (form.dataset.modo === "revisao") {
    liberarImagemEmRevisao();
    estadoApp.ultimoComprovanteId = resultadoSalvamento.comprovante.id;
    estadoApp.historicoVisivel = false;
    const botaoHistorico = document.querySelector("#history-button");
    botaoHistorico.setAttribute("aria-pressed", "false");
    botaoHistorico.title = "Mostrar histórico";
    const lista = form.closest("#list");
    lista.replaceChildren(criarCartaoComprovante(resultadoSalvamento.comprovante));
    lista.querySelector(".comprovante-card")?.focus({ preventScroll: true });
    anunciarStatus("Comprovante revisado e salvo no histórico deste navegador.");
  } else {
    anunciarStatus("Alterações salvas.");
  }

  atualizarResumo(resultadoSalvamento.historico);
  if (estadoApp.historicoVisivel) {
    mostrarHistorico(resultadoSalvamento.historico);
    focarTituloHistorico();
  }
  executarContinuacaoAposSalvar(form);
}

export function iniciarFormularioDeRevisao() {
  document.querySelector("#list").addEventListener("submit", salvarFormulario);
}
