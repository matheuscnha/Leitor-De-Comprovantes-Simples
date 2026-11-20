export const estadoApp = {
  ultimoComprovanteId: null,
  historicoVisivel: false,
  urlImagemEmRevisao: null,
  leituraEmAndamento: false,
  idLeituraAtual: 0,
};

export function liberarImagemEmRevisao() {
  if (estadoApp.urlImagemEmRevisao) {
    URL.revokeObjectURL(estadoApp.urlImagemEmRevisao);
    estadoApp.urlImagemEmRevisao = null;
  }
}
