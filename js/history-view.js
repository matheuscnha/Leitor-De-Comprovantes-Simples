import { estadoApp, liberarImagemEmRevisao } from "./app-state.js";
import {
  anunciarStatus,
  criarElemento,
  formatarMoeda,
} from "./helpers.js";
import {
  buscarComprovantePorId,
  lerHistorico,
} from "./storage.js";
import {
  criarCartaoComprovante,
  criarMensagemFormulario,
} from "./ui.js";
import {
  limparErroArmazenamento,
  mostrarErroArmazenamento,
} from "./app-feedback.js";
import { paraCentavos } from "./receipt-data.js";
import { protegerSaidaDoFormulario } from "./unsaved-changes.js";

export function atualizarResumo(historicoConhecido = null) {
  const resultado = Array.isArray(historicoConhecido)
    ? { ok: true, historico: historicoConhecido }
    : lerHistorico();
  if (!resultado.ok) {
    document.querySelector(".total-gasto").textContent = "—";
    document.querySelector("#quantidade-comprovantes").textContent = "Histórico indisponível";
    mostrarErroArmazenamento(resultado.mensagem);
    return false;
  }

  limparErroArmazenamento();
  const totalGastoCentavos = resultado.historico.reduce((soma, comprovante) => {
    return typeof comprovante.total === "number"
      ? soma + paraCentavos(comprovante.total)
      : soma;
  }, 0);

  document.querySelector(".total-gasto").textContent =
    formatarMoeda(totalGastoCentavos / 100);
  document.querySelector("#quantidade-comprovantes").textContent =
    `${resultado.historico.length} comprovante${resultado.historico.length === 1 ? "" : "s"} lido${resultado.historico.length === 1 ? "" : "s"}`;
  return true;
}

export function mostrarHistorico(historicoConhecido = null) {
  liberarImagemEmRevisao();
  const lista = document.querySelector("#list");
  const resultado = Array.isArray(historicoConhecido)
    ? { ok: true, historico: historicoConhecido }
    : lerHistorico();
  lista.replaceChildren();

  if (!resultado.ok) {
    lista.append(criarMensagemFormulario(resultado.mensagem, "erro-formulario"));
    mostrarErroArmazenamento(resultado.mensagem);
    return resultado;
  }

  limparErroArmazenamento();
  const cabecalho = criarElemento("div", null, "historico-cabecalho");
  const titulo = criarElemento("h2", "Histórico", "comprovante-subtitulo");
  titulo.id = "historico-heading";
  cabecalho.append(titulo);
  const limpar = criarElemento("button", "Excluir histórico inteiro", "botao-excluir");
  limpar.type = "button";
  limpar.dataset.acao = "limpar-historico";
  cabecalho.append(limpar);
  lista.append(cabecalho);

  if (resultado.historico.length === 0) {
    lista.append(criarElemento("p", "Nenhum comprovante salvo no histórico."));
    return resultado;
  }

  resultado.historico.forEach((comprovante) => {
    lista.append(criarCartaoComprovante(comprovante));
  });
  return resultado;
}

function alternarHistoricoAgora() {
  const lista = document.querySelector("#list");
  const botao = document.querySelector("#history-button");
  estadoApp.historicoVisivel = !estadoApp.historicoVisivel;
  botao.setAttribute("aria-pressed", String(estadoApp.historicoVisivel));
  botao.title = estadoApp.historicoVisivel
    ? "Ocultar histórico"
    : "Mostrar histórico";

  if (estadoApp.historicoVisivel) {
    const resultado = mostrarHistorico();
    if (resultado.ok) {
      anunciarStatus(`Histórico aberto. ${resultado.historico.length} comprovantes salvos.`);
    }
    return;
  }

  if (!estadoApp.ultimoComprovanteId) {
    lista.replaceChildren();
    anunciarStatus("Histórico fechado.");
    return;
  }

  const resultado = buscarComprovantePorId(estadoApp.ultimoComprovanteId);
  if (!resultado.ok) {
    lista.replaceChildren(criarMensagemFormulario(resultado.mensagem, "erro-formulario"));
    mostrarErroArmazenamento(resultado.mensagem);
  } else if (resultado.comprovante) {
    limparErroArmazenamento();
    lista.replaceChildren(criarCartaoComprovante(resultado.comprovante));
    anunciarStatus("Histórico fechado. Leitura atual exibida.");
  } else {
    estadoApp.ultimoComprovanteId = null;
    lista.replaceChildren();
    anunciarStatus("Histórico fechado. O comprovante exibido foi removido.");
  }
}

export function alternarHistorico() {
  const formulario = document.querySelector("#list form.form-edicao");
  protegerSaidaDoFormulario(formulario, {
    aoContinuar: alternarHistoricoAgora,
    aoDescartar: alternarHistoricoAgora,
  });
}
