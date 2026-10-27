// Minha Rota — recebe e devolve os dados do app.
// Troque a senha abaixo e coloque a mesma senha no app.
const SENHA = "TROQUE-ESTA-SENHA";

const ABAS = {
  enderecos: ["key", "rua", "numero", "bairro", "cep", "ref", "lat", "lng", "precisao", "fonte", "atualizado"],
  historico: ["id", "dia", "pacote", "bairro", "status", "em", "atualizado"],
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.senha !== SENHA) return json({ ok: false, erro: "senha" });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (req.acao === "salvar") {
      gravar(ss, "enderecos", req.enderecos || []);
      gravar(ss, "historico", req.historico || []);
    }
    return json({ ok: true, enderecos: ler(ss, "enderecos"), historico: ler(ss, "historico") });
  } catch (err) {
    return json({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("Minha Rota: planilha ligada.");
}

function aba(ss, nome) {
  let sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.getRange(1, 1, sh.getMaxRows(), ABAS[nome].length).setNumberFormat("@");
    sh.getRange(1, 1, 1, ABAS[nome].length).setValues([ABAS[nome]]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function ler(ss, nome) {
  const cols = ABAS[nome];
  const valores = aba(ss, nome).getDataRange().getValues().slice(1);
  return valores
    .filter(r => r[0] !== "")
    .map(r => Object.fromEntries(cols.map((c, i) => [c, r[i] === "" || r[i] === undefined ? null : String(r[i])])));
}

// Uma linha por key/id. A versão com "atualizado" mais novo vence.
function gravar(ss, nome, itens) {
  if (!itens.length) return;
  const cols = ABAS[nome], ult = cols.length - 1;
  const sh = aba(ss, nome);
  const linhas = sh.getDataRange().getValues().map(r => cols.map((_, i) => r[i] === undefined ? "" : String(r[i])));
  const pos = {};
  for (let i = 1; i < linhas.length; i++) pos[linhas[i][0]] = i;
  itens.forEach(it => {
    const nova = cols.map(c => it[c] === null || it[c] === undefined ? "" : String(it[c]));
    const i = pos[nova[0]];
    if (i === undefined) { pos[nova[0]] = linhas.length; linhas.push(nova); return; }
    if (linhas[i][ult] > nova[ult]) return;
    // Nunca troca um local salvo pelo entregador por um vazio ou do Google.
    if (nome === "enderecos") {
      const f = cols.indexOf("fonte");
      if (linhas[i][f] === "voce" && nova[f] !== "voce") ["lat", "lng", "precisao", "fonte"].forEach(c => { nova[cols.indexOf(c)] = linhas[i][cols.indexOf(c)]; });
    }
    linhas[i] = nova;
  });
  sh.getRange(1, 1, linhas.length, cols.length).setNumberFormat("@").setValues(linhas);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
