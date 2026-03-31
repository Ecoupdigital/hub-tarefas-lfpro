import React, { useState, useEffect } from 'react';
import { Paintbrush, Check } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

const THEME_COLOR_KEY = 'lfpro-theme-color';
const THEME_DENSITY_KEY = 'lfpro-theme-density';

interface ThemeColor {
  name: string;
  hsl: string;
  preview: string;
}

export const PRESET_COLORS: ThemeColor[] = [
  { name: 'Gold (LFPro)', hsl: '29 45% 71%', preview: '#C4A472' },
  { name: 'Azul', hsl: '211 100% 46%', preview: '#0073EA' },
  { name: 'Roxo', hsl: '270 55% 62%', preview: '#9b59b6' },
  { name: 'Verde', hsl: '160 100% 39%', preview: '#00c896' },
  { name: 'Laranja', hsl: '33 98% 55%', preview: '#f59e0b' },
  { name: 'Rosa', hsl: '340 82% 62%', preview: '#ec4899' },
  { name: 'Vermelho', hsl: '0 72% 57%', preview: '#e74c3c' },
  { name: 'Ciano', hsl: '190 90% 50%', preview: '#06b6d4' },
];

type Density = 'compact' | 'normal' | 'spacious';

const DENSITY_OPTIONS: { key: Density; label: string; description: string }[] = [
  { key: 'compact', label: 'Compacto', description: 'Linhas menores, mais dados na tela' },
  { key: 'normal', label: 'Normal', description: 'Equilibrio entre espaco e informacao' },
  { key: 'spacious', label: 'Espacoso', description: 'Mais espaco, melhor leitura' },
];

export const applyThemeColor = (hsl: string) => {
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
  document.documentElement.style.setProperty('--sidebar-primary', hsl);
  document.documentElement.style.setProperty('--sidebar-ring', hsl);
};

export const applyDensity = (density: Density) => {
  document.documentElement.classList.remove('density-compact', 'density-normal', 'density-spacious');
  document.documentElement.classList.add(`density-${density}`);
};

const DEFAULT_THEME_COLOR = '29 45% 71%'; // LFPro gold

export const initThemeCustomization = () => {
  const savedColor = localStorage.getItem(THEME_COLOR_KEY);
  applyThemeColor(savedColor || DEFAULT_THEME_COLOR);
  const savedDensity = (localStorage.getItem(THEME_DENSITY_KEY) as Density | null) || 'normal';
  applyDensity(savedDensity);

  // Apply dark/light mode. Default to 'light' when no preference is saved.
  const savedMode = localStorage.getItem('lfpro-theme-mode') || localStorage.getItem('theme') || 'light';
  if (savedMode === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (savedMode === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    // 'auto': respect OS preference, fallback dark
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }
};

interface ThemeCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ open, onOpenChange }) => {
  const [selectedColor, setSelectedColor] = useState<string>(() => {
    return localStorage.getItem(THEME_COLOR_KEY) || '29 45% 71%';
  });
  const [selectedDensity, setSelectedDensity] = useState<Density>(() => {
    return (localStorage.getItem(THEME_DENSITY_KEY) as Density) || 'normal';
  });

  useEffect(() => {
    initThemeCustomization();
  }, []);

  const handleColorChange = (hsl: string) => {
    setSelectedColor(hsl);
    localStorage.setItem(THEME_COLOR_KEY, hsl);
    applyThemeColor(hsl);
  };

  const handleDensityChange = (density: Density) => {
    setSelectedDensity(density);
    localStorage.setItem(THEME_DENSITY_KEY, density);
    applyDensity(density);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paintbrush className="w-4 h-4" />
            Personalizar aparencia
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Color picker */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Cor principal</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.hsl}
                  onClick={() => handleColorChange(color.hsl)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-lg border border-border hover:border-foreground/30 transition-colors"
                  aria-label={`Selecionar cor ${color.name}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: color.preview }}
                  >
                    {selectedColor === color.hsl && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="font-density-tiny text-muted-foreground">{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Density selector */}
          <div>
            <p className="text-sm font-medium text-foreground mb-3">Densidade da interface</p>
            <div className="space-y-1.5">
              {DENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleDensityChange(opt.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedDensity === opt.key
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted'
                  }`}
                  aria-label={`Selecionar densidade ${opt.label}`}
                >
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeCustomizer;
