export function construirEstadoRevisao({
  avisosAtuais,
  avisosIniciais,
  indicesResolvidos,
  historicoAvisosResolvidos = [],
  dataResolucao = new Date().toISOString(),
}) {
  const pendentesDaLeitura = [];
  const historico = [...historicoAvisosResolvidos];

  avisosIniciais.forEach((mensagem, indice) => {
    if (indicesResolvidos.has(indice) && !avisosAtuais.includes(mensagem)) {
      historico.push({ mensagem, resolvidoEm: dataResolucao });
    } else if (!indicesResolvidos.has(indice)) {
      pendentesDaLeitura.push(mensagem);
    }
  });

  const avisosRevisao = [...new Set([...avisosAtuais, ...pendentesDaLeitura])];
  return {
    statusRevisao: avisosRevisao.length > 0
      ? "pendente"
      : historico.length > 0
        ? "revisado-com-divergencia"
        : null,
    avisosRevisao,
    historicoAvisosRevisao: historico,
  };
}
