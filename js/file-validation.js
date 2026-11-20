const TAMANHO_MAXIMO_IMAGEM = 5_000_000;

function lerTexto(bytes, inicio, tamanho) {
  return String.fromCharCode(...bytes.slice(inicio, inicio + tamanho));
}

function pularSubBlocos(bytes, posicao) {
  while (posicao < bytes.length) {
    const tamanho = bytes[posicao++];
    if (tamanho === 0) return posicao;
    if (posicao + tamanho > bytes.length) return -1;
    posicao += tamanho;
  }
  return -1;
}

function gifEstaticoValido(bytes) {
  if (bytes.length < 14) return false;
  const cabecalho = lerTexto(bytes, 0, 6);
  if (cabecalho !== "GIF87a" && cabecalho !== "GIF89a") return false;

  let posicao = 13;
  const tela = bytes[10];
  if (tela & 0x80) posicao += 3 * (2 ** ((tela & 0x07) + 1));
  let quadros = 0;

  while (posicao < bytes.length) {
    const marcador = bytes[posicao++];
    if (marcador === 0x3b) return quadros === 1;

    if (marcador === 0x21) {
      if (posicao >= bytes.length) return false;
      posicao += 1; // Rótulo da extensão.
      posicao = pularSubBlocos(bytes, posicao);
      if (posicao < 0) return false;
      continue;
    }

    if (marcador !== 0x2c) return false;
    quadros += 1;
    if (quadros > 1 || posicao + 9 > bytes.length) return false;

    const descritor = bytes[posicao + 8];
    posicao += 9;
    if (descritor & 0x80) posicao += 3 * (2 ** ((descritor & 0x07) + 1));
    if (posicao >= bytes.length) return false;
    posicao += 1; // Tamanho mínimo do código LZW.
    posicao = pularSubBlocos(bytes, posicao);
    if (posicao < 0) return false;
  }

  return false;
}

async function resultadoImagemVerificada(arquivo, tipo) {
  const blob = new Blob([arquivo], { type: tipo });
  try {
    const imagem = await createImageBitmap(blob);
    imagem.close();
    return { valido: true, tipo };
  } catch {
    const urlTemporaria = URL.createObjectURL(blob);
    try {
      const imagem = new Image();
      await new Promise((resolver, rejeitar) => {
        imagem.onload = resolver;
        imagem.onerror = rejeitar;
        imagem.src = urlTemporaria;
      });

      if (imagem.naturalWidth > 0 && imagem.naturalHeight > 0) {
        return { valido: true, tipo };
      }
    } catch {
      // Os dois decodificadores falharam; abaixo é retornada a mensagem ao usuário.
    } finally {
      URL.revokeObjectURL(urlTemporaria);
    }

    return {
      valido: false,
      mensagem: "O arquivo parece estar danificado ou não pode ser aberto como imagem neste navegador.",
    };
  }
}

export async function validarArquivoImagem(arquivo) {
  if (!arquivo || arquivo.size === 0) {
    return { valido: false, mensagem: "O arquivo está vazio. Selecione uma imagem válida." };
  }
  if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) {
    return { valido: false, mensagem: "A imagem excede o limite de 5 MB. Reduza o tamanho do arquivo e tente novamente." };
  }

  const inicio = new Uint8Array(await arquivo.slice(0, 16).arrayBuffer());
  const assinaturaPng = [137, 80, 78, 71, 13, 10, 26, 10];
  const ehPng = assinaturaPng.every((byte, indice) => inicio[indice] === byte);
  const ehJpeg = inicio[0] === 0xff && inicio[1] === 0xd8 && inicio[2] === 0xff;
  const ehWebp = lerTexto(inicio, 0, 4) === "RIFF" && lerTexto(inicio, 8, 4) === "WEBP";

  if (ehPng) return resultadoImagemVerificada(arquivo, "image/png");
  if (ehJpeg) return resultadoImagemVerificada(arquivo, "image/jpeg");
  if (ehWebp) return resultadoImagemVerificada(arquivo, "image/webp");

  const cabecalhoGif = lerTexto(inicio, 0, 6);
  if (cabecalhoGif === "GIF87a" || cabecalhoGif === "GIF89a") {
    const conteudo = new Uint8Array(await arquivo.arrayBuffer());
    if (gifEstaticoValido(conteudo)) return resultadoImagemVerificada(arquivo, "image/gif");
    return {
      valido: false,
      mensagem: "O GIF está animado ou inválido. Envie uma imagem estática em PNG, JPG ou WebP.",
    };
  }

  return {
    valido: false,
    mensagem: "Formato não aceito. Envie uma imagem PNG, JPG, WebP ou GIF estático.",
  };
}
