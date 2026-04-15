# 🧠 Lições Aprendidas — Programmer

Erros que geraram BLOCKER em reviews anteriores. **Nunca repita esses padrões.**

> Este arquivo é atualizado automaticamente pelo programmer ao receber um BLOCKER do reviewer.
> Formato: `- [PR #XX] Descrição concisa do erro e como evitar`

---

<!-- Novas lições devem ser adicionadas abaixo desta linha -->

- [PR #15] Iniciais no avatar com `font-weight: 600` — o guia Kurtto restringe Inter a pesos 400 e 500; usar `500` para destaque em monogramas/avatar.
- [PR #18] Quality Gate SonarCloud indisponível para PR (`component ... not found`) — validar chave do projeto e análise da PR antes de concluir revisão, e documentar bloqueio externo com evidências quando não depender do código.
- [PR #18] Corpo da PR sem checklist visual explícito — sempre incluir seção de checklist visual validável na descrição da PR.
- [PR #18] Cor hardcoded em CSS Module (`rgba(...)`) — usar sempre design tokens via CSS custom properties do `variables.css`.