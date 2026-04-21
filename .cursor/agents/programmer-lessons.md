# 🧠 Lições Aprendidas — Programmer

Erros que geraram BLOCKER em reviews anteriores. **Nunca repita esses padrões.**

> Este arquivo é atualizado automaticamente pelo programmer ao receber um BLOCKER do reviewer.
> Formato: `- [PR #XX] Descrição concisa do erro e como evitar`

---

<!-- Novas lições devem ser adicionadas abaixo desta linha -->

- [PR #42] A análise da PR passou a **abrir uma Issue nova no GitHub** (integração SonarCloud/GitHub ou regra de qualidade que materializa achados como issue). Antes de considerar a PR “fechada”, alinhar com o time: findings devem permanecer **só na PR** (comentários/checks) salvo política explícita. No SonarCloud/organização, revisar opções do tipo **Pull Request decoration** / **Create GitHub issues** para não duplicar trabalho.
- [Processo] **Não** deve haver criação automática de **novas Issues do GitHub** a partir de PRs para o mesmo problema já visível na revisão da PR (Sonar, code scanning, etc.). O fluxo esperado é comentário inline + Quality Gate na PR; issues separadas só quando o time decidir rastrear fora da PR.
- [PR #15] Iniciais no avatar com `font-weight: 600` — o guia Kurtto restringe Inter a pesos 400 e 500; usar `500` para destaque em monogramas/avatar.
- [PR #18] Quality Gate SonarCloud indisponível para PR (`component ... not found`) — validar chave do projeto e análise da PR antes de concluir revisão, e documentar bloqueio externo com evidências quando não depender do código.
- [Sonar] **Project key** no SonarCloud pode divergir do nome “esperado” do repo: já foi usado `LF-Calegari_lfc-kurrto-admin-gui` (**kurrto** com *rr*) em vez de `...kurtto...`. Se a API repetir *not found* em loop, confira a chave em **SonarCloud → Administration → projeto** e use `scripts/wait-sonar-pr-quality-gate.sh` (tenta candidatas e só então faz polling).
- [PR #18] Corpo da PR sem checklist visual explícito — sempre incluir seção de checklist visual validável na descrição da PR.
- [PR #18] Cor hardcoded em CSS Module (`rgba(...)`) — usar sempre design tokens via CSS custom properties do `variables.css`.
- [PR #50] Hex hardcoded em `Links.module.css` (`#ffffff`) — nunca usar valor literal em CSS Module; sempre usar tokens/variáveis (`var(--bs-*)` ou `var(--color-*)`) para manter consistência visual e dark mode ready.