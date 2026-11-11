// Extensão do JoJo Companion para Chrome, Edge e Brave.
// Só enxerga abas com endereço do Discord (é a única permissão de site pedida).
// Quando encontra uma, pergunta ao JoJo, por um canal local deste PC, se o
// bloqueio está ligado. Só com a resposta "fechar" a aba do Discord é fechada,
// pela API de abas do navegador. Nenhum endereço, título ou conteúdo sai daqui:
// o JoJo recebe apenas a quantidade de abas e o nome do navegador.
// Com o JoJo fechado ou a chave desligada, a resposta é "desligado" e nada acontece.
const PONTE = 'com.jojo.companion.discord';
const ENDERECOS = ['*://discord.com/*', '*://*.discord.com/*', '*://discordapp.com/*', '*://*.discordapp.com/*'];

function navegador() {
  if (typeof navigator !== 'undefined' && navigator.brave) return 'brave';
  return /Edg\//.test(navigator.userAgent) ? 'edge' : 'chrome';
}

function perguntar(mensagem) {
  return chrome.runtime.sendNativeMessage(PONTE, mensagem).catch(() => null);
}

let conferindo = false;

async function conferir() {
  if (conferindo) return;
  conferindo = true;
  try {
    const abas = await chrome.tabs.query({ url: ENDERECOS });
    if (!abas.length) return;
    const resposta = await perguntar({ t: 'abas', n: abas.length, nav: navegador() });
    if (!resposta || resposta.t !== 'fechar') return;
    let fechadas = 0, falhas = 0;
    for (const aba of abas) {
      try { await chrome.tabs.remove(aba.id); fechadas++; } catch { falhas++; }
    }
    await perguntar({ t: 'fechadas', n: fechadas, falhas, nav: navegador() });
  } catch {
    // Sem o que fazer: a próxima conferência tenta de novo.
  } finally {
    conferindo = false;
  }
}

// O navegador só informa o endereço de abas do Discord (permissão de site).
chrome.tabs.onUpdated.addListener((id, mudanca) => { if (mudanca.url) conferir(); });
chrome.runtime.onStartup.addListener(conferir);
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('conferir', { periodInMinutes: 1 });
  conferir();
});
chrome.alarms.onAlarm.addListener((alarme) => { if (alarme.name === 'conferir') conferir(); });
