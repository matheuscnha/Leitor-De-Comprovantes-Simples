import { anunciarStatus, formularioTemAlteracoes } from "./helpers.js";

let saidaPendente = null;
const continuacoesAposSalvar = new WeakMap();

export function protegerSaidaDoFormulario(formulario, opcoes) {
  if (!formularioTemAlteracoes(formulario)) {
    opcoes.aoContinuar();
    return;
  }

  const dialogo = document.querySelector("#unsaved-changes-dialog");
  if (!dialogo || dialogo.open) return;

  saidaPendente = { formulario, ...opcoes };
  dialogo.showModal();
}

export function limparContinuacaoAposSalvar(formulario) {
  continuacoesAposSalvar.delete(formulario);
}

export function executarContinuacaoAposSalvar(formulario) {
  const continuar = continuacoesAposSalvar.get(formulario);
  continuacoesAposSalvar.delete(formulario);
  continuar?.();
}

function restaurarFoco(formulario) {
  formulario.querySelector("input, select, button")?.focus({ preventScroll: true });
}

function escolherAcao(event) {
  const botao = event.target.closest("button[data-escolha-saida]");
  if (!botao || !saidaPendente) return;

  const dialogo = document.querySelector("#unsaved-changes-dialog");
  const pendencia = saidaPendente;
  saidaPendente = null;
  dialogo.close();

  if (botao.dataset.escolhaSaida === "continuar") {
    restaurarFoco(pendencia.formulario);
    anunciarStatus("Você continua editando. Nenhum dado foi descartado.");
    return;
  }

  if (botao.dataset.escolhaSaida === "descartar") {
    pendencia.aoDescartar();
    return;
  }

  continuacoesAposSalvar.set(
    pendencia.formulario,
    pendencia.aoContinuar,
  );
  pendencia.formulario.requestSubmit();
}

export function iniciarProtecaoDeSaida() {
  const dialogo = document.querySelector("#unsaved-changes-dialog");
  dialogo.addEventListener("click", escolherAcao);
  dialogo.addEventListener("cancel", () => {
    if (!saidaPendente) return;
    const formulario = saidaPendente.formulario;
    saidaPendente = null;
    restaurarFoco(formulario);
  });
}
