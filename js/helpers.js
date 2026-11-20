export function anunciarStatus(texto) {
  const status = document.querySelector("#app-status");
  if (!status) return;

  status.textContent = "";
  window.requestAnimationFrame(() => {
    status.textContent = texto;
  });
}

export function focarPrimeiroCampo(formulario) {
  formulario.querySelector("input")?.focus({ preventScroll: true });
}

export function focarTituloHistorico() {
  const titulo = document.querySelector(".historico-cabecalho h2");
  if (titulo) {
    titulo.tabIndex = -1;
    titulo.focus({ preventScroll: true });
  }
}

export function criarElemento(tag, texto, classe) {
  const elemento = document.createElement(tag);
  if (texto !== null && texto !== undefined) {
    elemento.textContent = texto;
  }
  if (classe) {
    elemento.className = classe;
  }
  return elemento;
}

export function formatarMoeda(valor) {
  if (typeof valor !== "number" || !Number.isFinite(valor)) {
    return "Não identificado";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function ehNumeroValido(valor) {
  return typeof valor === "number" && Number.isFinite(valor);
}

export function numeroOuNull(valor) {
  if (valor === "") {
    return null;
  }
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

export function criarSnapshotFormulario(formulario) {
  return JSON.stringify(
    Array.from(formulario.elements, (campo) => ({
      nome: campo.name,
      tipo: campo.type,
      valor: campo.value,
      marcado: campo.checked,
    })),
  );
}

export function formularioTemAlteracoes(formulario) {
  if (!formulario) return false;

  // A revisão da IA é um rascunho não salvo mesmo antes da primeira edição.
  return formulario.dataset.modo === "revisao" ||
    formulario.dataset.snapshot !== criarSnapshotFormulario(formulario);
}
