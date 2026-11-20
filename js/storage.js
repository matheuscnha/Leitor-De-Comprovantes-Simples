const CHAVE_HISTORICO = "leitorDeComprovantes.historico";

function erroArmazenamento(mensagem) {
  return { ok: false, mensagem };
}

function gravarHistorico(historico, mensagemErro) {
  try {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
    return { ok: true, historico };
  } catch (error) {
    console.error("Não foi possível gravar o histórico:", error);
    return erroArmazenamento(mensagemErro);
  }
}

export function lerHistorico() {
  try {
    const salvo = localStorage.getItem(CHAVE_HISTORICO);
    const historico = salvo ? JSON.parse(salvo) : [];
    if (!Array.isArray(historico)) {
      return erroArmazenamento(
        "Os dados do histórico estão em formato inválido. O app não os alterou.",
      );
    }
    if (historico.some((comprovante) =>
      !comprovante ||
      typeof comprovante !== "object" ||
      Array.isArray(comprovante) ||
      (comprovante.id && typeof comprovante.id !== "string") ||
      (comprovante.produtos !== undefined &&
        (!Array.isArray(comprovante.produtos) ||
          comprovante.produtos.some((produto) =>
            !produto || typeof produto !== "object" || Array.isArray(produto),
          ))) ||
      (comprovante.descontos !== undefined &&
        (!Array.isArray(comprovante.descontos) ||
          comprovante.descontos.some((desconto) =>
            !desconto || typeof desconto !== "object" || Array.isArray(desconto),
          )))
    )) {
      return erroArmazenamento(
        "Há um registro inválido no histórico. O app não o alterou para evitar perder dados.",
      );
    }

    let recebeuIds = false;
    const historicoComIds = historico.map((comprovante) => {
      if (comprovante.id) {
        return comprovante;
      }

      recebeuIds = true;
      return { ...comprovante, id: crypto.randomUUID() };
    });

    if (recebeuIds) {
      const resultadoMigracao = gravarHistorico(
        historicoComIds,
        "Não foi possível atualizar os identificadores do histórico. Seus comprovantes foram mantidos.",
      );
      if (!resultadoMigracao.ok) return resultadoMigracao;
    }

    return { ok: true, historico: historicoComIds };
  } catch (error) {
    console.error("Não foi possível ler o histórico:", error);
    return erroArmazenamento(
      "Não foi possível acessar o histórico neste navegador. Os dados não foram alterados.",
    );
  }
}

export function buscarComprovantePorId(id) {
  const resultado = lerHistorico();
  if (!resultado.ok) return resultado;
  return {
    ok: true,
    historico: resultado.historico,
    comprovante: resultado.historico.find((item) => item.id === id) || null,
  };
}

export function atualizarComprovante(id, alteracoes) {
  const resultado = lerHistorico();
  if (!resultado.ok) return resultado;

  const historico = [...resultado.historico];
  const indice = historico.findIndex((comprovante) => comprovante.id === id);
  if (indice === -1) {
    return erroArmazenamento("O comprovante não foi encontrado no histórico; nenhuma alteração foi salva.");
  }

  historico[indice] = { ...historico[indice], ...alteracoes };
  const gravacao = gravarHistorico(
    historico,
    "Não foi possível salvar as alterações. O histórico anterior foi mantido.",
  );
  return gravacao.ok
    ? { ...gravacao, comprovante: historico[indice] }
    : gravacao;
}

export function marcarComprovanteRevisado(id) {
  const resultado = buscarComprovantePorId(id);
  if (!resultado.ok) return resultado;
  if (!resultado.comprovante) {
    return erroArmazenamento("O comprovante não foi encontrado; nenhum aviso foi alterado.");
  }

  const avisosAtuais = Array.isArray(resultado.comprovante.avisosRevisao)
    ? resultado.comprovante.avisosRevisao
    : [];
  const historicoAvisosRevisao = [
    ...(Array.isArray(resultado.comprovante.historicoAvisosRevisao)
      ? resultado.comprovante.historicoAvisosRevisao
      : []),
    ...avisosAtuais.map((mensagem) => ({
      mensagem,
      resolvidoEm: new Date().toISOString(),
    })),
  ];

  return atualizarComprovante(id, {
    statusRevisao: "revisado-com-divergencia",
    avisosRevisao: [],
    historicoAvisosRevisao,
  });
}

export function excluirComprovante(id) {
  const resultado = lerHistorico();
  if (!resultado.ok) return resultado;

  const existe = resultado.historico.some((comprovante) => comprovante.id === id);
  if (!existe) {
    return erroArmazenamento("O comprovante não foi encontrado; o histórico não foi alterado.");
  }

  const historico = resultado.historico.filter((comprovante) => comprovante.id !== id);
  return gravarHistorico(
    historico,
    "Não foi possível excluir o comprovante. O histórico anterior foi mantido.",
  );
}

export function excluirHistoricoInteiro() {
  try {
    localStorage.removeItem(CHAVE_HISTORICO);
    return { ok: true, historico: [] };
  } catch (error) {
    console.error("Não foi possível limpar o histórico:", error);
    return erroArmazenamento(
      "Não foi possível excluir o histórico. Os comprovantes foram mantidos.",
    );
  }
}

export function salvarComprovante(dados, hashImagem) {
  const resultado = lerHistorico();
  if (!resultado.ok) return resultado;

  try {
    const comprovante = {
      ...dados,
      id: crypto.randomUUID(),
      hashImagem,
    };
    const historico = [comprovante, ...resultado.historico];
    const gravacao = gravarHistorico(
      historico,
      "Não foi possível salvar o comprovante. O histórico anterior foi mantido.",
    );
    return gravacao.ok ? { ...gravacao, comprovante } : gravacao;
  } catch (error) {
    console.error("Não foi possível salvar o comprovante:", error);
    return erroArmazenamento(
      "Não foi possível criar o registro. O histórico anterior foi mantido.",
    );
  }
}
