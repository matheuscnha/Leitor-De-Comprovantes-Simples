import { estadoApp, liberarImagemEmRevisao } from "./app-state.js";
import { anunciarStatus, criarElemento, focarTituloHistorico } from "./helpers.js";
import {
  buscarComprovantePorId,
  excluirComprovante,
  excluirHistoricoInteiro,
  marcarComprovanteRevisado,
} from "./storage.js";
import {
  atualizarIndicadoresProdutosRepetidos,
  criarCartaoComprovante,
  criarFormularioEdicao,
  criarLinhaDescontoEdicao,
  criarLinhaProdutoEdicao,
} from "./ui.js";
import { mostrarErroArmazenamento } from "./app-feedback.js";
import {
  alternarHistorico,
  atualizarResumo,
  mostrarHistorico,
} from "./history-view.js";

function limparHistorico() {
  const confirmou = window.confirm(
    "Deseja excluir todos os comprovantes salvos? Esta ação não pode ser desfeita.",
  );
  if (!confirmou) return;

  const resultado = excluirHistoricoInteiro();
  if (!resultado.ok) {
    mostrarErroArmazenamento(resultado.mensagem);
    return;
  }

  estadoApp.ultimoComprovanteId = null;
  atualizarResumo(resultado.historico);
  mostrarHistorico(resultado.historico);
  anunciarStatus("Histórico excluído. Nenhum comprovante está salvo.");
  focarTituloHistorico();
}

function adicionarProduto(botao) {
  const modoRevisao = botao.form.dataset.modo === "revisao";
  const linha = criarLinhaProdutoEdicao({}, {
    exigirConferencia: modoRevisao,
    origemManual: true,
  });
  botao.form.querySelector(".lista-edicao-produtos").append(linha);
  atualizarIndicadoresProdutosRepetidos(botao.form);
  linha.querySelector("input")?.focus();
}

function adicionarDesconto(botao) {
  const linha = criarLinhaDescontoEdicao();
  botao.form.querySelector(".lista-edicao-descontos").append(linha);
  linha.querySelector("input")?.focus();
}

function editarComprovante(botao, id) {
  const resultado = buscarComprovantePorId(id);
  if (!resultado.ok) {
    mostrarErroArmazenamento(resultado.mensagem);
    return;
  }

  if (!resultado.comprovante) {
    mostrarHistorico(resultado.historico);
    anunciarStatus("Esse comprovante não está mais no histórico. A lista foi atualizada.");
    return;
  }

  const comprovante = resultado.comprovante;
  const avisosPendentes = comprovante.statusRevisao === "pendente"
    ? comprovante.avisosRevisao || []
    : [];
  const avisosResolvidos = comprovante.historicoAvisosRevisao || (
    comprovante.statusRevisao === "revisado-com-divergencia"
      ? comprovante.avisosRevisao || []
      : []
  );
  const formulario = criarFormularioEdicao(comprovante, {
    avisos: avisosPendentes,
    avisosResolvidos,
  });
  botao.closest(".comprovante-card").replaceWith(formulario);
  formulario.querySelector("input")?.focus({ preventScroll: true });
  anunciarStatus("Edição aberta. Altere os campos e salve ou cancele.");
}

function excluirComprovanteDoHistorico(id) {
  const confirmou = window.confirm("Deseja excluir este comprovante do histórico?");
  if (!confirmou) return;

  const resultado = excluirComprovante(id);
  if (!resultado.ok) {
    mostrarErroArmazenamento(resultado.mensagem);
    return;
  }

  if (estadoApp.ultimoComprovanteId === id) estadoApp.ultimoComprovanteId = null;
  atualizarResumo(resultado.historico);
  mostrarHistorico(resultado.historico);
  anunciarStatus("Comprovante excluído do histórico.");
  focarTituloHistorico();
}

function tratarAcao(botao) {
  const id = botao.dataset.id;
  switch (botao.dataset.acao) {
    case "limpar-historico":
      limparHistorico();
      break;
    case "adicionar-produto":
      adicionarProduto(botao);
      break;
    case "adicionar-desconto":
      adicionarDesconto(botao);
      break;
    case "remover-produto": {
      const formulario = botao.form;
      botao.closest(".linha-produto").remove();
      atualizarIndicadoresProdutosRepetidos(formulario);
      break;
    }
    case "remover-desconto":
      botao.closest(".linha-desconto").remove();
      break;
    case "editar":
      editarComprovante(botao, id);
      break;
    case "marcar-revisado": {
      const resultado = marcarComprovanteRevisado(id);
      if (!resultado.ok) {
        mostrarErroArmazenamento(resultado.mensagem);
        break;
      }

      const card = criarCartaoComprovante(resultado.comprovante);
      botao.closest(".comprovante-card").replaceWith(card);
      card.focus({ preventScroll: true });
      atualizarResumo(resultado.historico);
      anunciarStatus("Avisos movidos para o histórico de revisão do comprovante.");
      break;
    }
    case "excluir":
      excluirComprovanteDoHistorico(id);
      break;
    case "cancelar-edicao":
      mostrarHistorico();
      anunciarStatus("Edição cancelada.");
      focarTituloHistorico();
      break;
    case "cancelar-revisao":
      liberarImagemEmRevisao();
      estadoApp.historicoVisivel = false;
      document.querySelector("#list").replaceChildren(
        criarElemento("p", "Leitura descartada; nada foi salvo."),
      );
      anunciarStatus("Leitura descartada. Nada foi salvo.");
      document.querySelector("#file").focus();
      break;
    default:
      break;
  }
}

export function iniciarAcoesDoHistorico() {
  document.querySelector("#history-button").addEventListener("click", alternarHistorico);
  document.querySelector("#list").addEventListener("click", (event) => {
    const botao = event.target.closest("button[data-acao]");
    if (botao) tratarAcao(botao);
  });
}
