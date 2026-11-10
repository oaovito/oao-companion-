# JoJo Companion — correções críticas 0.45.1 publicadas em 10/11/2026

**Concluída:** v0.45.1 publicada após os 16 gates do run 42895990176 (fonte
`eedac8f`). Evidência e limites em [VALIDACAO_0.45.1.md](VALIDACAO_0.45.1.md).
Sem missão ativa nova; o texto abaixo é o registro do pedido atendido.

Requisitos vigentes e cumulativos: [REQUISITOS_CORRECOES_0.45.1.md](REQUISITOS_CORRECOES_0.45.1.md).
Fonte efetiva: `codex/living-companion`. Base pública 0.45.0 permanece imutável.

- Restaurar o personagem histórico com pernas e remover a cauda rejeitada.
- Corrigir fullscreen falso/persistente, janelas próprias, amostras e recuperação.
- Distinguir pedidos explícitos de cenas espontâneas, causas, fila e falhas do renderer.
- Descobrir Steam/bibliotecas/manifestos locais e distinguir instalação/execução/foreground.
- Reconhecer DD original por instalação válida, sem estrutura de pastas rígida.
- Preservar catálogo, dados, agenda somente por link e todas as funcionalidades.
- Medir/auditar novamente arte no Windows oficial, inspecionar imagens e executar
  todos os gates unitários, integração, E2E, conversa real, build/instalador/atualizador.

Implementação e testes estão em andamento. Não declarar publicação/validação
concluída antes de recuperar evidências do commit correto. Fixtures não comprovam
Steam/jogo comercial no computador de Emanuele nem dois monitores/DPI físicos.
Nenhum serviço/plano adicional, MNE_Lab ou release histórica deve ser alterado.
