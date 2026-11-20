import { instruction } from "./ai-prompt.js";
import {
  MODELO_LEITURA,
  PROVEDOR_LEITURA,
  TEMPERATURA_LEITURA,
  VERSAO_PROMPT_LEITURA,
} from "./ai-config.js";
import { validarArquivoImagem } from "./file-validation.js";
import {
  anunciarStatus,
  criarElemento,
  focarPrimeiroCampo,
  formatarMoeda,
} from "./helpers.js";
import {
  calcularHashImagem,
  encontrarPossivelDuplicataDeComprovante,
  prepararComprovante,
} from "./receipt-data.js";
import { lerHistorico } from "./storage.js";
import { criarFormularioEdicao } from "./ui.js";
import { estadoApp, liberarImagemEmRevisao } from "./app-state.js";
import { protegerSaidaDoFormulario } from "./unsaved-changes.js";
import {
  mostrarErroArmazenamento,
  mostrarErroLeitura,
} from "./app-feedback.js";

function criarErroDeLeitura(codigo, mensagem) {
  const error = new Error(mensagem);
  error.codigoLeitura = codigo;
  return error;
}

function obterStatusDoErro(error) {
  const status = Number(error?.status ?? error?.statusCode ?? error?.response?.status);
  return Number.isInteger(status) ? status : null;
}

function mensagemDaFalhaDeLeitura(error) {
  if (error?.codigoLeitura === "sdk-indisponivel") {
    return "O módulo de leitura com IA não carregou. Verifique a conexão e recarregue a página antes de tentar novamente.";
  }

  if (error?.codigoLeitura === "resposta-invalida") {
    return "O serviço respondeu em um formato que o app não conseguiu interpretar. Tente novamente com a imagem completa e mais nítida.";
  }

  if (error?.codigoLeitura === "limite-servico") {
    return "O serviço de IA está limitando solicitações no momento. Aguarde um pouco e tente novamente.";
  }

  if (error?.codigoLeitura === "falha-de-rede") {
    return "Não foi possível conectar ao serviço de IA. Verifique sua conexão e tente novamente.";
  }

  const status = obterStatusDoErro(error);
  if (status === 429) {
    return "O serviço de IA está limitando solicitações no momento. Aguarde um pouco e tente novamente.";
  }

  const mensagemTecnica = String(error?.message ?? "");
  if (
    error?.name === "NetworkError" ||
    /failed to fetch|networkerror|network request failed|fetch failed|offline/i.test(mensagemTecnica)
  ) {
    return "Não foi possível conectar ao serviço de IA. Verifique sua conexão e tente novamente.";
  }

  if (status === 401 || status === 403) {
    return "O serviço de IA recusou a solicitação. Verifique se o serviço está disponível para esta sessão e tente novamente.";
  }

  if (status !== null && status >= 500) {
    return "O serviço de IA está com uma falha temporária. Aguarde alguns instantes e tente novamente.";
  }

  return "O serviço de IA não conseguiu concluir a leitura. Tente novamente mais tarde; se o problema persistir, confira a disponibilidade do serviço.";
}

async function solicitarLeituraDaIA(imagem) {
  if (typeof globalThis.puter?.ai?.chat !== "function") {
    throw criarErroDeLeitura("sdk-indisponivel", "SDK do Puter indisponível.");
  }

  try {
    return await globalThis.puter.ai.chat(instruction, imagem, false, {
      model: MODELO_LEITURA,
      provider: PROVEDOR_LEITURA,
      temperature: TEMPERATURA_LEITURA,
    });
  } catch (error) {
    const status = obterStatusDoErro(error);
    if (status === 429) {
      const erroDeLimite = criarErroDeLeitura("limite-servico", "Limite do serviço atingido.");
      erroDeLimite.status = status;
      throw erroDeLimite;
    }

    const mensagemTecnica = String(error?.message ?? "");
    if (
      error?.name === "NetworkError" ||
      /failed to fetch|networkerror|network request failed|fetch failed|offline/i.test(mensagemTecnica)
    ) {
      const erroDeRede = criarErroDeLeitura("falha-de-rede", mensagemTecnica);
      if (status !== null) erroDeRede.status = status;
      throw erroDeRede;
    }

    const erroDoServico = criarErroDeLeitura(
      "falha-do-servico",
      mensagemTecnica || "Falha do serviço de IA.",
    );
    if (status !== null) erroDoServico.status = status;
    throw erroDoServico;
  }
}

function definirLeituraEmAndamento(ativa) {
  const input = document.querySelector("#file");
  const areaEnvio = document.querySelector("#file-container");
  input.disabled = ativa;
  areaEnvio.setAttribute("aria-busy", String(ativa));
  areaEnvio.classList.toggle("leitura-em-andamento", ativa);
  areaEnvio.querySelector(".upload-cta").textContent = ativa
    ? "Lendo comprovante…"
    : "Selecionar imagem";
  areaEnvio.querySelector(".upload-footnote").textContent = ativa
    ? "Aguarde o término desta leitura para enviar outra imagem."
    : "PNG, JPG, WebP ou GIF estático · até 5 MB · análise com IA";
}

async function processarFoto(picture) {
  const input = document.querySelector("#file");
  const lista = document.querySelector("#list");

  if (!picture) return;

  if (estadoApp.leituraEmAndamento) {
    input.value = "";
    anunciarStatus("Uma leitura já está em andamento. Aguarde antes de enviar outra imagem.");
    return;
  }

  estadoApp.leituraEmAndamento = true;
  const idLeitura = ++estadoApp.idLeituraAtual;
  definirLeituraEmAndamento(true);
  liberarImagemEmRevisao();
  let formularioMantemImagem = false;
  let confirmouArquivoRepetido = false;

  try {
    const validacaoArquivo = await validarArquivoImagem(picture);
    if (idLeitura !== estadoApp.idLeituraAtual) return;
    if (!validacaoArquivo.valido) {
      mostrarErroLeitura(validacaoArquivo.mensagem);
      return;
    }

    const imagemParaIA = new File([picture], picture.name, {
      type: validacaoArquivo.tipo,
      lastModified: picture.lastModified,
    });
    const hashImagem = await calcularHashImagem(imagemParaIA);
    if (idLeitura !== estadoApp.idLeituraAtual) return;

    const leituraHistorico = lerHistorico();
    if (!leituraHistorico.ok) {
      mostrarErroArmazenamento(leituraHistorico.mensagem);
      return;
    }

    const duplicado = leituraHistorico.historico.find(
      (comprovante) => comprovante.hashImagem === hashImagem,
    );
    if (duplicado) {
      const continuar = window.confirm(
        "Este mesmo arquivo já foi enviado. Deseja continuar e analisar novamente?",
      );
      if (!continuar) {
        input.value = "";
        anunciarStatus("Envio cancelado. O arquivo já consta no histórico.");
        return;
      }
      confirmouArquivoRepetido = true;
    }

    estadoApp.urlImagemEmRevisao = URL.createObjectURL(imagemParaIA);
    lista.textContent = "Lendo comprovante...";
    anunciarStatus("Lendo comprovante. Aguarde.");
    const response = await solicitarLeituraDaIA(imagemParaIA);
    if (idLeitura !== estadoApp.idLeituraAtual) return;
    const reply = response?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      throw criarErroDeLeitura("resposta-invalida", "Resposta vazia ou em formato inesperado.");
    }

    let dadosBrutos;
    try {
      dadosBrutos = JSON.parse(reply);
    } catch {
      throw criarErroDeLeitura("resposta-invalida", "A resposta do serviço não continha JSON válido.");
    }

    const preparado = prepararComprovante(dadosBrutos);
    preparado.dados.metadadosLeitura = {
      modelo: MODELO_LEITURA,
      provedor: PROVEDOR_LEITURA,
      versaoPrompt: VERSAO_PROMPT_LEITURA,
    };
    const avisos = [...preparado.avisos];
    if (!confirmouArquivoRepetido) {
      const historicoAtual = lerHistorico();
      if (!historicoAtual.ok) {
        mostrarErroArmazenamento(historicoAtual.mensagem);
        return;
      }

      const possivelDuplicata = encontrarPossivelDuplicataDeComprovante(
        preparado.dados,
        historicoAtual.historico,
        hashImagem,
      );
      if (possivelDuplicata) {
        const continuar = window.confirm(
          `A imagem já foi enviada à IA para leitura. Possível repetição: ${possivelDuplicata.estabelecimento}, ${possivelDuplicata.data} às ${possivelDuplicata.hora}, total ${formatarMoeda(possivelDuplicata.total)}. A imagem é diferente, então pode ser outra compra. Deseja continuar para revisar e decidir se salva?`,
        );
        if (!continuar) {
          lista.replaceChildren(criarElemento("p", "Leitura cancelada; nada foi salvo."));
          anunciarStatus("Leitura cancelada após identificar um comprovante possivelmente repetido.");
          return;
        }
        avisos.unshift(
          "A IA encontrou um comprovante no histórico com estabelecimento, data, horário e total iguais. Confira se esta é uma compra diferente antes de salvar.",
        );
      }
    }

    estadoApp.historicoVisivel = false;
    const botaoHistorico = document.querySelector("#history-button");
    botaoHistorico.setAttribute("aria-pressed", "false");
    botaoHistorico.title = "Mostrar histórico";
    const formulario = criarFormularioEdicao(preparado.dados, {
      modo: "revisao",
      hashImagem,
      avisos,
      imagemUrl: estadoApp.urlImagemEmRevisao,
    });
    lista.replaceChildren(formulario);
    formularioMantemImagem = true;
    anunciarStatus("Leitura concluída. Revise os dados antes de salvar.");
    focarPrimeiroCampo(formulario);
  } catch (error) {
    console.error("Não foi possível ler o comprovante:", error);
    if (idLeitura === estadoApp.idLeituraAtual) {
      mostrarErroLeitura(mensagemDaFalhaDeLeitura(error));
    }
  } finally {
    if (idLeitura === estadoApp.idLeituraAtual) {
      input.value = "";
      if (!formularioMantemImagem) liberarImagemEmRevisao();
      estadoApp.leituraEmAndamento = false;
      definirLeituraEmAndamento(false);
    }
  }
}

function lerFoto() {
  const input = document.querySelector("#file");
  const picture = input.files?.[0];
  if (!picture) return;

  const formulario = document.querySelector("#list form.form-edicao");
  if (formulario) {
    input.value = "";
    protegerSaidaDoFormulario(formulario, {
      aoContinuar: () => processarFoto(picture),
      aoDescartar: () => processarFoto(picture),
    });
    return;
  }

  processarFoto(picture);
}

export function iniciarLeitorDeComprovantes() {
  document.querySelector("#file").addEventListener("change", lerFoto);
}
