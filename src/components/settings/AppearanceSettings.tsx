import React, { useState, useEffect } from 'react';
import { Check, Monitor, Sun, Moon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { applyThemeColor, applyDensity, PRESET_COLORS } from './ThemeCustomizer';

// ---- localStorage keys ----
const THEME_MODE_KEY = 'lfpro-theme-mode';
const THEME_COLOR_KEY = 'lfpro-theme-color';
const THEME_DENSITY_KEY = 'lfpro-theme-density';
const SIDEBAR_POSITION_KEY = 'lfpro-sidebar-position';
const SIDEBAR_COLLAPSE_KEY = 'lfpro-sidebar-collapse';
const ANIMATIONS_KEY = 'lfpro-animations';
const DATE_FORMAT_KEY = 'lfpro-date-format';
const WEEK_START_KEY = 'lfpro-week-start';
const NUMBER_FORMAT_KEY = 'lfpro-number-format';

// ---- Types ----
type ThemeMode = 'auto' | 'light' | 'dark';
type Density = 'compact' | 'normal' | 'spacious';
type SidebarPosition = 'left' | 'right';

// ---- Apply theme mode ----
const applyThemeMode = (mode: ThemeMode) => {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else if (mode === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }
};

// ---- Static data ----
const THEME_MODES: { key: ThemeMode; label: string; Icon: React.ElementType }[] = [
  { key: 'auto', label: 'Automático', Icon: Monitor },
  { key: 'light', label: 'Claro', Icon: Sun },
  { key: 'dark', label: 'Escuro', Icon: Moon },
];

const DENSITY_OPTIONS: { key: Density; label: string; description: string }[] = [
  { key: 'compact', label: 'Compacto', description: 'Linhas menores, mais dados na tela' },
  { key: 'normal', label: 'Normal', description: 'Equilíbrio entre espaço e informação' },
  { key: 'spacious', label: 'Espaçoso', description: 'Mais espaço, melhor leitura' },
];

// ---- Section wrapper ----
interface SectionProps {
  title: string;
  children: React.ReactNode;
}
const Section = ({ title, children }: SectionProps) => (
  <section className="space-y-4">
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </h2>
    {children}
  </section>
);

// ---- Main component ----
const AppearanceSettings = () => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    () => (localStorage.getItem(THEME_MODE_KEY) as ThemeMode) || 'auto'
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    () => localStorage.getItem(THEME_COLOR_KEY) || '29 45% 71%'
  );
  const [customHex, setCustomHex] = useState('');
  const [density, setDensityState] = useState<Density>(
    () => (localStorage.getItem(THEME_DENSITY_KEY) as Density) || 'normal'
  );
  const [sidebarPosition, setSidebarPositionState] = useState<SidebarPosition>(
    () => (localStorage.getItem(SIDEBAR_POSITION_KEY) as SidebarPosition) || 'left'
  );
  const [sidebarCollapse, setSidebarCollapseState] = useState<boolean>(
    () => localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === 'true'
  );
  const [animations, setAnimationsState] = useState<boolean>(
    () => localStorage.getItem(ANIMATIONS_KEY) !== 'false'
  );
  const [dateFormat, setDateFormatState] = useState<string>(
    () => localStorage.getItem(DATE_FORMAT_KEY) || 'DD/MM/YYYY'
  );
  const [weekStart, setWeekStartState] = useState<string>(
    () => localStorage.getItem(WEEK_START_KEY) || 'sunday'
  );
  const [numberFormat, setNumberFormatState] = useState<string>(
    () => localStorage.getItem(NUMBER_FORMAT_KEY) || 'br'
  );

  // Apply persisted values on mount
  useEffect(() => {
    applyThemeMode(themeMode);
    applyThemeColor(selectedColor);
    applyDensity(density);
    if (!animations) {
      document.documentElement.classList.add('motion-reduce');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for system color scheme changes in auto mode
  useEffect(() => {
    if (themeMode !== 'auto') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeMode('auto');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  // ---- Handlers ----
  const handleThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem(THEME_MODE_KEY, mode);
    applyThemeMode(mode);
  };

  const handleColorChange = (hsl: string) => {
    setSelectedColor(hsl);
    setCustomHex('');
    localStorage.setItem(THEME_COLOR_KEY, hsl);
    applyThemeColor(hsl);
  };

  const handleCustomHex = (hex: string) => {
    setCustomHex(hex);
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      let h = 0;
      let s = 0;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
      }
      const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      setSelectedColor(hsl);
      localStorage.setItem(THEME_COLOR_KEY, hsl);
      applyThemeColor(hsl);
    }
  };

  const handleDensity = (d: Density) => {
    setDensityState(d);
    localStorage.setItem(THEME_DENSITY_KEY, d);
    applyDensity(d);
  };

  const handleSidebarPosition = (pos: SidebarPosition) => {
    setSidebarPositionState(pos);
    localStorage.setItem(SIDEBAR_POSITION_KEY, pos);
  };

  const handleSidebarCollapse = (val: boolean) => {
    setSidebarCollapseState(val);
    localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(val));
  };

  const handleAnimations = (val: boolean) => {
    setAnimationsState(val);
    localStorage.setItem(ANIMATIONS_KEY, String(val));
    if (!val) {
      document.documentElement.classList.add('motion-reduce');
    } else {
      document.documentElement.classList.remove('motion-reduce');
    }
  };

  const handleDateFormat = (val: string) => {
    setDateFormatState(val);
    localStorage.setItem(DATE_FORMAT_KEY, val);
  };

  const handleWeekStart = (val: string) => {
    setWeekStartState(val);
    localStorage.setItem(WEEK_START_KEY, val);
  };

  const handleNumberFormat = (val: string) => {
    setNumberFormatState(val);
    localStorage.setItem(NUMBER_FORMAT_KEY, val);
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-8">

      {/* ---- Tema ---- */}
      <Section title="Tema">
        <div className="grid grid-cols-3 gap-3">
          {THEME_MODES.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleThemeMode(key)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                themeMode === key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-foreground/30 text-foreground'
              }`}
              aria-label={`Tema ${label}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
              {themeMode === key && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
          ))}
        </div>
      </Section>

      <Separator />

      {/* ---- Cor principal ---- */}
      <Section title="Cor principal">
        <div className="grid grid-cols-4 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color.hsl}
              type="button"
              onClick={() => handleColorChange(color.hsl)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all ${
                selectedColor === color.hsl && !customHex
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-foreground/30'
              }`}
              aria-label={`Selecionar cor ${color.name}`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                style={{ backgroundColor: color.preview }}
              >
                {selectedColor === color.hsl && !customHex && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">{color.name}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Label htmlFor="custom-color" className="text-sm text-muted-foreground shrink-0">
            Personalizada
          </Label>
          <Input
            id="custom-color"
            placeholder="#5F3FFF"
            value={customHex}
            onChange={(e) => handleCustomHex(e.target.value)}
            maxLength={7}
            className="w-32 font-mono text-sm"
          />
          {customHex && /^#[0-9a-fA-F]{6}$/.test(customHex) && (
            <div
              className="w-7 h-7 rounded-full border border-border shadow-sm shrink-0"
              style={{ backgroundColor: customHex }}
            />
          )}
        </div>
      </Section>

      <Separator />

      {/* ---- Densidade ---- */}
      <Section title="Densidade">
        <div className="space-y-2">
          {DENSITY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleDensity(opt.key)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                density === opt.key
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-foreground/30 text-foreground'
              }`}
              aria-label={`Densidade ${opt.label}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 flex items-center justify-center">
                  {density === opt.key && <Check className="w-4 h-4 text-primary" />}
                </div>
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{opt.description}</span>
            </button>
          ))}
        </div>
      </Section>

      <Separator />

      {/* ---- Layout ---- */}
      <Section title="Layout">
        <div className="space-y-5">
          {/* Sidebar position */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Posição da barra lateral</Label>
            <div className="flex gap-3">
              {(
                [
                  { key: 'left' as SidebarPosition, label: 'Esquerda' },
                  { key: 'right' as SidebarPosition, label: 'Direita' },
                ]
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSidebarPosition(opt.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm transition-all ${
                    sidebarPosition === opt.key
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border hover:border-foreground/30 text-foreground'
                  }`}
                >
                  {sidebarPosition === opt.key && <Check className="w-3.5 h-3.5" />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar auto-collapse */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto-recolher barra lateral</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recolhe automaticamente ao navegar
              </p>
            </div>
            <Switch
              checked={sidebarCollapse}
              onCheckedChange={handleSidebarCollapse}
              aria-label="Auto-recolher barra lateral"
            />
          </div>

          {/* Animations */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Animações</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Desative para reduzir movimento na interface
              </p>
            </div>
            <Switch
              checked={animations}
              onCheckedChange={handleAnimations}
              aria-label="Ativar animações"
            />
          </div>
        </div>
      </Section>

      <Separator />

      {/* ---- Formatos ---- */}
      <Section title="Formatos">
        <div className="space-y-4">
          {/* Date format */}
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="date-format" className="text-sm font-medium shrink-0">
              Formato de data
            </Label>
            <Select value={dateFormat} onValueChange={handleDateFormat}>
              <SelectTrigger id="date-format" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Week start */}
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="week-start" className="text-sm font-medium shrink-0">
              Início da semana
            </Label>
            <Select value={weekStart} onValueChange={handleWeekStart}>
              <SelectTrigger id="week-start" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunday">Domingo</SelectItem>
                <SelectItem value="monday">Segunda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Number format */}
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="number-format" className="text-sm font-medium shrink-0">
              Formato de números
            </Label>
            <Select value={numberFormat} onValueChange={handleNumberFormat}>
              <SelectTrigger id="number-format" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="br">1.000,00 (BR)</SelectItem>
                <SelectItem value="us">1,000.00 (US)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>
    </div>
  );
};

export default AppearanceSettings;
