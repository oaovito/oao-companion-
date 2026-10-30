# Servidor da conversa (Qwen 3.5 2B no Ollama)

O cérebro da conversa do JoJo é o **Qwen 3.5 2B** rodando no **Ollama** em **outro computador**
(ex.: o PC do João). O notebook da Emanuele não roda o modelo: o JoJo só manda o texto e recebe a
resposta. Animações, jogos, Modo silencioso, regra de vigília e tudo o mais continuam locais e
funcionam mesmo com o servidor desligado (aí o JoJo responde com as falas programadas e mostra a
atividade "Sistema: conversa online" quando falta configurar).

## Montar o servidor (uma vez, no PC que fica ligado)

1. Copie a pasta `servidor/` deste repositório para o PC.
2. No PowerShell: `powershell -ExecutionPolicy Bypass -File .\instalar-servidor.ps1`
   - instala Ollama e Node.js (winget);
   - configura o Ollama enxuto: só em `127.0.0.1`, 1 modelo carregado, 1 conversa por vez, fila 4,
     contexto 4096, modelo carregado por 15 min depois da última mensagem, sem nuvem;
   - baixa `qwen3.5:2b-q4_K_M` (se essa variante não existir, `qwen3.5:2b`);
   - cria a chave (`jojo-chave.txt`) e deixa o **portão** (`jojo-gateway.mjs`) iniciando com o Windows
     na porta 11435.
3. Instale o **Tailscale** no PC e no notebook dela, na mesma conta (rede privada criptografada).
   Não abra a porta no roteador.
4. No JoJo do notebook: **Configurações → Servidor da conversa** = `http://<IP Tailscale do PC>:11435`
   e **Chave do servidor** = conteúdo de `jojo-chave.txt`. Depois disso não precisa mexer mais.

## O portão

- Só aceita quem manda a chave (`Authorization: Bearer …`, comparação em tempo constante).
- Só repassa `POST /api/chat` e `GET /api/tags` (não deixa baixar, apagar nem trocar modelos).
- Uma conversa por vez, fila de 4; se o JoJo cancelar, a geração para.

## O que o JoJo manda

`/api/chat` com `stream: true`, `think: false`, `format: json`, `keep_alive: 15m` e:

| Tipo de pergunta | `num_ctx` | `num_predict` | Histórico |
|---|---|---|---|
| Conversa comum | 2048 | 128 | últimas 5 mensagens |
| Técnica (ciência, medicina, MNE_Lab…) | 4096 | 512 | últimas 7 mensagens |

O prompt de sistema leva o perfil do JoJo, as regras (segurança, sono, comandos) e 6 falas de
exemplo. Antes da primeira conversa ele confere em `/api/tags` se o Qwen 3.5 2B está instalado;
outro modelo (9B, Llama…) **não** é usado no lugar.

## Medir

No servidor: `node servidor/medir.mjs` mostra carga, tempo total, tokens por segundo e memória
(RAM/VRAM) do modelo, com os números do próprio Ollama.
