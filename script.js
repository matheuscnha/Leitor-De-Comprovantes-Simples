import { iniciarAcoesDoHistorico } from "./js/history-actions.js";
import { atualizarResumo } from "./js/history-view.js";
import { iniciarLeitorDeComprovantes } from "./js/receipt-reader.js";
import { iniciarFormularioDeRevisao } from "./js/review-form.js";
import { iniciarProtecaoDeSaida } from "./js/unsaved-changes.js";

iniciarProtecaoDeSaida();
iniciarLeitorDeComprovantes();
iniciarAcoesDoHistorico();
iniciarFormularioDeRevisao();
atualizarResumo();
