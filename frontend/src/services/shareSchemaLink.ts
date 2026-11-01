// ============================================================================
// COMPARTILHAMENTO ZERO-BACKEND VIA URL HASH (#z.<deflate-base64url>)
// Adaptado do LiveSchema Studio e enriquecido com metadados seguros de aba
// ============================================================================

const COMPRESSED_PREFIX = 'z.';
const PLAIN_PREFIX = 'u.';

export interface SharedSchemaEnvelope {
  v: 1;
  title: string;
  dbName?: string;
  sql: string;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipeStream(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream
): Promise<Uint8Array> {
  const piped = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

/**
 * Codifica um esquema SQL (com título opcional) em um fragmento hash compacto `#z.<base64url>`.
 */
export async function encodeSharedSchemaHash(
  payload: SharedSchemaEnvelope
): Promise<string> {
  const serialized = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(serialized);

  if (typeof CompressionStream === 'undefined') {
    return `${PLAIN_PREFIX}${bytesToBase64Url(bytes)}`;
  }

  const compressed = await pipeStream(bytes, new CompressionStream('deflate-raw'));
  return `${COMPRESSED_PREFIX}${bytesToBase64Url(compressed)}`;
}

/**
 * Gera a URL completa pronta para compartilhar com alunos/colegas sem servidor externo.
 */
export async function buildShareableSchemaUrl(
  payload: SharedSchemaEnvelope
): Promise<string> {
  const hash = await encodeSharedSchemaHash(payload);
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}${window.location.search}`
      : 'https://sqleditor.local/';
  return `${base}#${hash}`;
}

/**
 * Decodifica um hash `#z.` ou `#u.` caso a URL recebida seja um link compartilhado.
 * Retorna `null` para hashes normais de navegação (`#editor`, `#der`, `#galeria`, etc.).
 */
export async function decodeSharedSchemaHash(
  rawHash: string
): Promise<SharedSchemaEnvelope | null> {
  const clean = (rawHash || '').replace(/^#\/?/, '');
  if (!clean.startsWith(COMPRESSED_PREFIX) && !clean.startsWith(PLAIN_PREFIX)) {
    return null;
  }

  try {
    let decodedText: string;
    if (clean.startsWith(COMPRESSED_PREFIX)) {
      if (typeof DecompressionStream === 'undefined') return null;
      const compressedBytes = base64UrlToBytes(clean.slice(COMPRESSED_PREFIX.length));
      const rawBytes = await pipeStream(
        compressedBytes,
        new DecompressionStream('deflate-raw')
      );
      decodedText = new TextDecoder().decode(rawBytes);
    } else {
      const rawBytes = base64UrlToBytes(clean.slice(PLAIN_PREFIX.length));
      decodedText = new TextDecoder().decode(rawBytes);
    }

    try {
      const parsed = JSON.parse(decodedText);
      if (parsed && typeof parsed === 'object' && typeof parsed.sql === 'string') {
        return {
          v: 1,
          title: parsed.title || 'esquema_compartilhado.sql',
          dbName: parsed.dbName,
          sql: parsed.sql,
        };
      }
    } catch {
      // Compatibilidade caso o conteúdo seja SQL puro (formato LiveSchema original)
      if (decodedText.trim()) {
        return {
          v: 1,
          title: 'esquema_compartilhado.sql',
          sql: decodedText,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

