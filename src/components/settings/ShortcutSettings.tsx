import React from 'react';

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: Shortcut[];
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Navegacao',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Paleta de comandos' },
      { keys: ['Ctrl', '/'], description: 'Buscar' },
    ],
  },
  {
    title: 'Edicao',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Desfazer' },
      { keys: ['Ctrl', 'Y'], description: 'Refazer' },
      { keys: ['Delete'], description: 'Deletar item selecionado' },
    ],
  },
  {
    title: 'Visualizacao',
    shortcuts: [
      { keys: ['Ctrl', '1'], description: 'Tabela' },
      { keys: ['Ctrl', '2'], description: 'Kanban' },
      { keys: ['Ctrl', '3'], description: 'Timeline' },
      { keys: ['Ctrl', '4'], description: 'Dashboard' },
      { keys: ['F11'], description: 'Modo zen' },
    ],
  },
  {
    title: 'Board',
    shortcuts: [
      { keys: ['Ctrl', 'N'], description: 'Novo item' },
      { keys: ['Ctrl', 'G'], description: 'Novo grupo' },
    ],
  },
];

interface KeyBadgeProps {
  label: string;
}

const KeyBadge: React.FC<KeyBadgeProps> = ({ label }) => (
  <span className="bg-muted px-2 py-1 rounded font-mono font-density-tiny text-foreground border border-border">
    {label}
  </span>
);

interface ShortcutRowProps {
  shortcut: Shortcut;
}

const ShortcutRow: React.FC<ShortcutRowProps> = ({ shortcut }) => (
  <div className="flex items-center justify-between py-2.5">
    <span className="font-density-cell text-foreground">{shortcut.description}</span>
    <div className="flex items-center gap-1 flex-shrink-0 ml-4">
      {shortcut.keys.map((key, index) => (
        <React.Fragment key={key}>
          <KeyBadge label={key} />
          {index < shortcut.keys.length - 1 && (
            <span className="font-density-tiny text-muted-foreground">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

const ShortcutSettings: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Atalhos de teclado</h1>
        <p className="font-density-tiny text-muted-foreground mt-1">
          Referencia rapida de todos os atalhos disponíveis.
        </p>
      </div>

      {SHORTCUT_SECTIONS.map((section) => (
        <div key={section.title}>
          <h2 className="font-medium text-sm text-foreground mb-1">{section.title}</h2>
          <div className="divide-y divide-border rounded-lg border border-border bg-card px-4">
            {section.shortcuts.map((shortcut) => (
              <ShortcutRow key={shortcut.description} shortcut={shortcut} />
            ))}
          </div>
        </div>
      ))}

      <p className="font-density-tiny text-muted-foreground">
        Os atalhos podem variar conforme o sistema operacional. Em Mac, use Cmd no lugar de Ctrl.
      </p>
    </div>
  );
};

export default ShortcutSettings;
