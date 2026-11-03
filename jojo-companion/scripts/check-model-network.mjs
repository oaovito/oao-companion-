// Diagnóstico curto no Windows oficial: metadados e 1 MiB, sem inferência.
import { requireWindows } from '../src/main/windows-only.js';
import { LOCAL_MODEL } from '../src/core/dialogue/local-model.js';
import { performance } from 'node:perf_hooks';
requireWindows();
const [name, tag] = LOCAL_MODEL.split(':');
if (![name, tag].every(v => /^[a-zA-Z0-9_.-]+$/.test(v))) throw new Error('Modelo oficial invalido');
const base = `https://registry.ollama.ai/v2/library/${name}`;
const start = performance.now();
let phase = 'manifest';
try {
  const response = await fetch(`${base}/manifests/${tag}`, { signal: AbortSignal.timeout(15000) });
  console.log(JSON.stringify({ phase, status: response.status, host: new URL(response.url).hostname }));
  if (!response.ok) throw new Error('manifest_http');
  const manifest = await response.json();
  const layer = manifest.layers?.find(x => x.mediaType === 'application/vnd.ollama.image.model');
  if (!/^sha256:[a-f0-9]{64}$/.test(layer?.digest || '')) throw new Error('manifest_invalid');
  phase = 'blob_range';
  const size = 1024 * 1024;
  const blob = await fetch(`${base}/blobs/${layer.digest}`, { headers: { Range: `bytes=0-${size - 1}` }, signal: AbortSignal.timeout(30000) });
  const proof = { phase, status: blob.status, host: new URL(blob.url).hostname, range: blob.headers.get('content-range'), model: LOCAL_MODEL, blobBytes: layer.size };
  if (blob.status !== 206 || !blob.body) { await blob.body?.cancel(); console.log(JSON.stringify(proof)); throw new Error('range_http'); }
  let bytes = 0; const reader = blob.body.getReader();
  try { for (;;) { const next = await reader.read(); if (next.done) break; bytes += next.value.length; if (bytes > size) throw new Error('range_oversize'); } }
  finally { await reader.cancel(); }
  console.log(`JOJO_MODEL_NETWORK:${JSON.stringify({ ...proof, receivedBytes: bytes, elapsedMs: Math.round(performance.now() - start), complete: bytes === size })}`);
  if (bytes !== size) throw new Error('range_incomplete');
} catch (error) {
  // Uma URL assinada de armazenamento nunca vai para o log.
  console.error(JSON.stringify({ phase, error: ['manifest_http', 'manifest_invalid', 'range_http', 'range_oversize', 'range_incomplete'].includes(error.message) ? error.message : error.name === 'TimeoutError' ? 'network_timeout' : 'network_failed', elapsedMs: Math.round(performance.now() - start) }));
  process.exitCode = 1;
}
