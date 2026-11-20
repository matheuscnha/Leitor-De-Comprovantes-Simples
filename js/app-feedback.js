import { anunciarStatus } from "./helpers.js";
import { criarMensagemFormulario } from "./ui.js";

export function mostrarErroLeitura(mensagem) {
  const lista = document.querySelector("#list");
  const alerta = criarMensagemFormulario(mensagem, "erro-formulario");
  lista.replaceChildren(alerta);
  alerta.focus();
  anunciarStatus(mensagem);
}

export function mostrarErroArmazenamento(mensagem) {
  const status = document.querySelector("#storage-status");
  status.textContent = mensagem;
  status.hidden = false;
  anunciarStatus(mensagem);
}

export function limparErroArmazenamento() {
  const status = document.querySelector("#storage-status");
  status.textContent = "";
  status.hidden = true;
}

