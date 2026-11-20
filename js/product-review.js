export function validarConferenciaVisual({
  modo,
  imagemOriginalDisponivel,
  linhasProduto,
}) {
  if (modo !== "revisao") return [];

  const erros = [];
  if (!imagemOriginalDisponivel) {
    erros.push("A imagem original não está disponível. Não é possível confirmar os produtos visualmente.");
  }
  if (linhasProduto.length === 0) {
    erros.push("Adicione pelo menos um produto para conferir os dados item a item.");
  }
  linhasProduto.forEach((conferido, indice) => {
    if (!conferido) {
      erros.push(`Compare o produto ${indice + 1} com a imagem e marque a confirmação antes de salvar.`);
    }
  });
  return erros;
}

export function criarRegistroConferenciaProduto({
  modo,
  conferido,
  conferidoEm,
  conferenciaOriginal,
  conferenciaInvalidada,
  sugestaoIA,
  valoresConferidos,
  origemManual,
}) {
  if (modo === "revisao") {
    if (!conferido) return null;
    const resultado = origemManual
      ? "adicionado-manualmente"
      : sugestaoIA && ["nome", "quantidade", "valorUnitario", "valorTotal"].every(
          (campo) => sugestaoIA[campo] === valoresConferidos[campo],
        )
        ? "confirmado"
        : "corrigido";
    return {
      status: "conferido",
      resultado,
      conferidoEm,
      sugestaoIA: origemManual ? null : sugestaoIA,
    };
  }

  if (conferenciaInvalidada) {
    return {
      status: "alterado-apos-conferencia",
      conferidoEm: conferenciaOriginal?.conferidoEm || null,
      resultadoAnterior: conferenciaOriginal?.resultado || null,
      sugestaoIA: conferenciaOriginal?.sugestaoIA || sugestaoIA || null,
    };
  }

  return conferenciaOriginal || null;
}
