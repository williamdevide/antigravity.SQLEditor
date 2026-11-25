/**
 * Bateria automatizada de testes de recursos e qualidade do SQLEditor SENAI.
 * Executa os módulos reais TypeScript (Node 24+ strip-types com hook ESM para imports relativos .ts)
 * e audita invariantes críticos de segurança e UI antes da semana de avaliações.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import module from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(FRONTEND_DIR, '..');

// Registra hook ESM leve para resolver imports TypeScript sem extensão (ex.: '../types') em Node.js
const tsResolverSource = `
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    context.parentURL &&
    !specifier.endsWith('.js') &&
    !specifier.endsWith('.ts') &&
    !specifier.endsWith('.mjs')
  ) {
    const parentPath = fileURLToPath(context.parentURL);
    const parentDir = parentPath.slice(0, parentPath.lastIndexOf(process.platform === 'win32' ? '\\\\' : '/') + 1);
    const candidateTs = parentDir + specifier + '.ts';
    const candidateIndexTs = parentDir + specifier + '/index.ts';
    if (fs.existsSync(candidateTs)) {
      return nextResolve(pathToFileURL(candidateTs).href, context);
    }
    if (fs.existsSync(candidateIndexTs)) {
      return nextResolve(pathToFileURL(candidateIndexTs).href, context);
    }
  }
  return nextResolve(specifier, context);
}
`;
module.register(
  `data:text/javascript;base64,${Buffer.from(tsResolverSource).toString('base64')}`,
  import.meta.url
);

const helpers = await import(
  pathToFileURL(path.join(FRONTEND_DIR, 'src/utils/classroomHelpers.ts')).href
);
const spellchecker = await import(
  pathToFileURL(path.join(FRONTEND_DIR, 'src/services/sqlSpellchecker.ts')).href
);
const clipboardGuard = await import(
  pathToFileURL(path.join(FRONTEND_DIR, 'src/services/examClipboardGuard.ts')).href
);

let passedCount = 0;
let failedCount = 0;

async function runTest(name, fn) {
  try {
    await fn();
    passedCount += 1;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    failedCount += 1;
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err?.stack || err?.message || err}`);
  }
}

console.log('=== SQLEditor SENAI • Bateria de Testes de Qualidade e Avaliação ===\n');

// ---------------------------------------------------------------------------
// 1. Filtro de Scripts Pessoais (Carregar Scripts Salvos)
// ---------------------------------------------------------------------------
await runTest('1.1 filterPersonalSavedScripts exibe apenas category==="student_saved" e !isTemporary', () => {
  const input = [
    { id: '1', title: 'meu_script.sql', category: 'student_saved', isTemporary: false },
    { id: '2', title: 'backup_prova.sql', category: 'student_saved', isTemporary: true },
    { id: '3', title: 'exemplo_prof.sql', category: 'example', isTemporary: false },
    { id: '4', title: 'prova_p1.sql', category: 'exam', isTemporary: false },
    { id: '5', title: 'bd_aula.sql', category: 'class_database', isTemporary: false },
    { id: '6', title: 'solucao.sql', category: 'solution', isTemporary: false },
    { id: '7', title: 'entrega.sql', category: 'exam_submission', isTemporary: false },
  ];
  const filtered = helpers.filterPersonalSavedScripts(input);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '1');
});

// ---------------------------------------------------------------------------
// 2. Presença Online no Chat (Clock Skew + TTL)
// ---------------------------------------------------------------------------
await runTest('2.1 computePresenceOnlineStatus mantém usuário online com skew de relógio (+5 min)', () => {
  const localNowMs = 1_700_000_000_000;
  // Cliente com offset calibrado de +300s frente ao relógio do servidor
  const res = helpers.computePresenceOnlineStatus(
    { isOnline: true },
    localNowMs - 300_000,
    localNowMs,
    300_000
  );
  assert.equal(res.isOnline, true);
});

await runTest('2.2 computePresenceOnlineStatus marca offline quando TTL (180s) expira ou isOnline=false', () => {
  const nowMs = 1_700_000_000_000;
  assert.equal(
    helpers.computePresenceOnlineStatus({ isOnline: true }, nowMs - 200_000, nowMs).isOnline,
    false
  );
  assert.equal(
    helpers.computePresenceOnlineStatus({ isOnline: false }, nowMs - 1_000, nowMs).isOnline,
    false
  );
});

await runTest('2.3 extractTimestampMs suporta number, Timestamp.toMillis, seconds, Date e null', () => {
  assert.equal(helpers.extractTimestampMs(12345), 12345);
  assert.equal(helpers.extractTimestampMs({ toMillis: () => 54321 }), 54321);
  assert.equal(helpers.extractTimestampMs({ seconds: 100 }), 100000);
  assert.equal(helpers.extractTimestampMs(new Date(999)), 999);
  assert.equal(helpers.extractTimestampMs(null), null);
});

// ---------------------------------------------------------------------------
// 3. Fingerprint de BDs de Aula (Recarregamento condicional)
// ---------------------------------------------------------------------------
await runTest('3.1 computeDatabasesFingerprint permanece idêntico para mesmo conteúdo (independente da ordem)', () => {
  const fpA = helpers.computeDatabasesFingerprint([
    { title: 'universidade.sql', content: 'CREATE TABLE alunos (id INT);' },
    { title: 'loja.sql', content: 'CREATE TABLE pedidos (id INT);' },
  ]);
  const fpB = helpers.computeDatabasesFingerprint([
    { title: 'loja.sql', content: 'CREATE TABLE pedidos (id INT);' },
    { title: 'universidade.sql', content: 'CREATE TABLE alunos (id INT);' },
  ]);
  assert.equal(fpA, fpB);
});

await runTest('3.2 computeDatabasesFingerprint detecta alteração de script DDL nos BDs de aula', () => {
  const fpBefore = helpers.computeDatabasesFingerprint([
    { title: 'loja.sql', content: 'CREATE TABLE pedidos (id INT);' },
  ]);
  const fpAfter = helpers.computeDatabasesFingerprint([
    { title: 'loja.sql', content: 'CREATE TABLE pedidos (id INT, total DECIMAL(10,2));' },
  ]);
  assert.notEqual(fpBefore, fpAfter);
});

// ---------------------------------------------------------------------------
// 4. Encapsulamento de Alertas por Sessão de Avaliação
// ---------------------------------------------------------------------------
await runTest('4.1 groupExamAlertsBySession encapsula ocorrências separadas por examSessionId', () => {
  const groups = helpers.groupExamAlertsBySession([
    { id: 'a1', examSessionId: 'p1', examSessionLabel: 'Prova P1', createdAt: '2026-11-25T10:00:00Z', acknowledged: false },
    { id: 'a2', examSessionId: 'p1', examSessionLabel: 'Prova P1', createdAt: '2026-11-25T10:05:00Z', acknowledged: true },
    { id: 'a3', examSessionId: 'p2', examSessionLabel: 'Prova P2', createdAt: '2026-11-25T12:00:00Z', acknowledged: false },
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].sessionId, 'p2');
  assert.equal(groups[0].unackCount, 1);
  assert.equal(groups[1].sessionId, 'p1');
  assert.equal(groups[1].alerts.length, 2);
  assert.equal(groups[1].unackCount, 1);
});

// ---------------------------------------------------------------------------
// 5. Corretor Ortográfico SQL (Modo Normal/Sala vs Modo Avaliação)
// ---------------------------------------------------------------------------
const sampleSchemas = [
  {
    name: 'escola',
    tables: [
      {
        name: 'alunos',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'nome', type: 'TEXT' },
          { name: 'email', type: 'TEXT' },
        ],
      },
      {
        name: 'cursos',
        columns: [
          { name: 'id', type: 'INTEGER' },
          { name: 'titulo', type: 'TEXT' },
        ],
      },
    ],
  },
];

await runTest('5.1 analyzeSqlDiagnostics não gera falsos positivos em SQL válido (SELECT/JOIN/alias)', () => {
  const sql = `
    USE escola;
    SELECT a.id, a.nome, c.titulo
    FROM alunos a
    INNER JOIN cursos c ON c.id = a.id
    WHERE a.email LIKE '%@senai.br%';
  `;
  const diags = spellchecker.analyzeSqlDiagnostics(sql, 'escola', sampleSchemas);
  assert.equal(diags.length, 0, `Diagnósticos inesperados: ${JSON.stringify(diags)}`);
});

await runTest('5.2 analyzeSqlDiagnostics detecta erro de digitação em palavra-chave (SELEC -> SELECT)', () => {
  const diags = spellchecker.analyzeSqlDiagnostics('SELEC nome FROM alunos;', 'escola', sampleSchemas);
  assert.ok(diags.some((d) => d.message.includes('SELECT')));
});

await runTest('5.3 analyzeSqlDiagnostics detecta tabela e coluna inexistentes no banco ativo', () => {
  const diagsTable = spellchecker.analyzeSqlDiagnostics(
    'SELECT * FROM matriculas;',
    'escola',
    sampleSchemas
  );
  assert.ok(diagsTable.some((d) => d.message.includes('matriculas')));

  const diagsCol = spellchecker.analyzeSqlDiagnostics(
    'SELECT a.cpf_invalido FROM alunos a;',
    'escola',
    sampleSchemas
  );
  assert.ok(diagsCol.some((d) => d.message.includes('cpf_invalido')));
});

await runTest('5.4 analyzeSqlDiagnostics detecta string não fechada e parêntese desbalanceado', () => {
  const diagsQuote = spellchecker.analyzeSqlDiagnostics(
    "SELECT * FROM alunos WHERE nome = 'Ana;",
    'escola',
    sampleSchemas
  );
  assert.ok(diagsQuote.some((d) => d.message.toLowerCase().includes('aspas')));

  const diagsParen = spellchecker.analyzeSqlDiagnostics(
    'SELECT COUNT(* FROM alunos;',
    'escola',
    sampleSchemas
  );
  assert.ok(diagsParen.some((d) => d.message.includes('(') || d.message.includes('Parêntese')));
});

// ---------------------------------------------------------------------------
// 6. Cópia e Cola entre Abas no Modo Avaliação (examClipboardGuard)
// ---------------------------------------------------------------------------
await runTest('6.1 examClipboardGuard libera colagem interna entre abas e bloqueia origem externa', () => {
  clipboardGuard.clearInternalClipboard();
  clipboardGuard.recordInternalClipboard('SELECT nome FROM alunos WHERE id = 1;', 'tab-exemplo');

  assert.equal(
    clipboardGuard.isAllowedInternalPaste('SELECT nome FROM alunos WHERE id = 1;'),
    true
  );
  assert.equal(
    clipboardGuard.isAllowedInternalPaste('Prompt copiado do ChatGPT externo'),
    false
  );

  clipboardGuard.clearInternalClipboard();
  assert.equal(
    clipboardGuard.isAllowedInternalPaste('SELECT nome FROM alunos WHERE id = 1;'),
    false
  );
});

// ---------------------------------------------------------------------------
// 7. Auditoria Estática de Segurança, UI e Proteções de Avaliação
// ---------------------------------------------------------------------------
await runTest('7.1 firestore.rules permite content vazio em savedScripts e examAutoOpenScriptIds em classes', () => {
  const rules = fs.readFileSync(path.join(ROOT_DIR, 'firestore.rules'), 'utf8');
  assert.ok(rules.includes('data.content.size() <= 1000000'), 'savedScripts deve aceitar content vazio');
  assert.ok(rules.includes('examAutoOpenScriptIds'), 'classes deve aceitar examAutoOpenScriptIds');
  assert.ok(rules.includes('clientUpdatedAtMs'), 'class_presence deve aceitar clientUpdatedAtMs');
});

await runTest('7.2 SaveScriptModal usa "Script Pessoal" (sem "Rascunho Pessoal") e NewTabDropdown filtra só student_saved', () => {
  const saveModal = fs.readFileSync(
    path.join(FRONTEND_DIR, 'src/components/SaveScriptModal.tsx'),
    'utf8'
  );
  const newTabMenu = fs.readFileSync(
    path.join(FRONTEND_DIR, 'src/components/NewTabDropdown.tsx'),
    'utf8'
  );
  assert.ok(saveModal.includes('Script Pessoal'));
  assert.equal(saveModal.includes('Rascunho Pessoal'), false);
  assert.ok(newTabMenu.includes("category === 'student_saved'"));
});

await runTest('7.3 Corretor ortográfico é estritamente desligado em Modo Avaliação e colagem interna + IA em guia monitorada estão ativas', () => {
  const editorWs = fs.readFileSync(
    path.join(FRONTEND_DIR, 'src/components/EditorWorkspace.tsx'),
    'utf8'
  );
  const antiCheat = fs.readFileSync(
    path.join(FRONTEND_DIR, 'src/hooks/useExamAntiCheat.ts'),
    'utf8'
  );
  assert.ok(editorWs.includes('if (isExamModeActive)') && editorWs.includes('setModelMarkers'));
  assert.ok(editorWs.includes('isProtectedExamTab'));
  assert.ok(antiCheat.includes('isAllowedInternalPaste'));
  assert.ok(antiCheat.includes('extension_detected'));
});

console.log(`\nResumo da Bateria: ${passedCount} passou(aram), ${failedCount} falhou(aram).`);
if (failedCount > 0) {
  process.exit(1);
}
