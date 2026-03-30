// ── CSS Keyframes (injected once) ──────────────────────────────────────
export const KANBAN_STYLES_ID = 'kanban-advanced-styles';
export const KANBAN_CSS = `
@keyframes kanban-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes kanban-card-enter {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.kanban-card-animate {
  animation: kanban-card-enter 0.25s ease-out;
}
.kanban-card-hover {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.kanban-card-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.10);
}
.kanban-col-wip-exceeded {
  box-shadow: 0 0 0 2px hsl(0 72% 51%), 0 0 12px 0 rgba(239,68,68,0.25);
}
.kanban-swimlane-enter {
  animation: kanban-fade-in 0.2s ease-out;
}
`;

export function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KANBAN_STYLES_ID)) return;
  const style = document.createElement('style');
  style.id = KANBAN_STYLES_ID;
  style.textContent = KANBAN_CSS;
  document.head.appendChild(style);
}
