import React, { useState, useEffect, useRef } from 'react';
import { Palette, Upload, Save, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

interface BrandingConfig {
  logoUrl: string | null;
  primaryColor: string;
  instanceName: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: null,
  primaryColor: '#5F3FFF',
  instanceName: 'LFPro Tasks',
};

const PRESET_COLORS = [
  '#5F3FFF', '#00C875', '#FF5AC4', '#FF642E', '#579BFC',
  '#FDAB3D', '#E44258', '#A25DDC', '#037F4C', '#0073EA',
];

const BrandingSettings: React.FC = () => {
  const { activeWorkspace } = useApp();
  const workspaceId = activeWorkspace?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [branding, setBranding] = useState<BrandingConfig>({ ...DEFAULT_BRANDING });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);

  // Load branding from Supabase workspaces.settings.branding
  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('workspaces')
          .select('settings')
          .eq('id', workspaceId)
          .single();
        const settings = (data as any)?.settings || {};
        if (settings.branding) {
          setBranding({ ...DEFAULT_BRANDING, ...settings.branding });
          setPreviewLogo(settings.branding.logoUrl || null);
        }
      } catch {
        // ignore
      }
    })();
  }, [workspaceId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('O arquivo deve ter no maximo 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `branding/${workspaceId}/logo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // If storage bucket doesn't exist, use a data URL as fallback
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setPreviewLogo(dataUrl);
          setBranding((prev) => ({ ...prev, logoUrl: dataUrl }));
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setPreviewLogo(urlData.publicUrl);
      setBranding((prev) => ({ ...prev, logoUrl: urlData.publicUrl }));
      toast.success('Logo enviado');
    } catch {
      toast.error('Erro ao enviar logo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setPreviewLogo(null);
    setBranding((prev) => ({ ...prev, logoUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      // Read current settings to merge
      const { data: ws } = await supabase
        .from('workspaces')
        .select('settings')
        .eq('id', workspaceId)
        .single();
      const currentSettings = (ws as any)?.settings || {};
      const { error } = await supabase
        .from('workspaces')
        .update({ settings: { ...currentSettings, branding } } as any)
        .eq('id', workspaceId);
      if (error) throw error;

      // Apply primary color as CSS variable
      document.documentElement.style.setProperty('--brand-primary', branding.primaryColor);

      toast.success('Configuracoes de marca salvas');
    } catch {
      toast.error('Erro ao salvar configuracoes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-density-cell font-semibold text-foreground">
          Personalizacao de Marca
        </h3>
      </div>

      {/* Logo Upload */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <label className="font-density-tiny text-muted-foreground block">Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-background overflow-hidden">
            {previewLogo ? (
              <img
                src={previewLogo}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground/40" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Enviar logo
              </button>
              {previewLogo && (
                <button
                  onClick={handleRemoveLogo}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Remover
                </button>
              )}
            </div>
            <p className="font-density-tiny text-muted-foreground">
              PNG, JPG ou SVG. Maximo 2MB.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Primary Color */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <label className="font-density-tiny text-muted-foreground block">
          Cor primaria
        </label>
        <div className="flex items-center gap-3 flex-wrap">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setBranding((prev) => ({ ...prev, primaryColor: color }))}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                branding.primaryColor === color
                  ? 'border-foreground scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <div className="flex items-center gap-2 ml-2">
            <input
              type="color"
              value={branding.primaryColor}
              onChange={(e) =>
                setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))
              }
              className="w-8 h-8 rounded-md border border-border cursor-pointer"
            />
            <span className="font-density-tiny text-muted-foreground font-mono">
              {branding.primaryColor}
            </span>
          </div>
        </div>
      </div>

      {/* Instance Name */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <label className="font-density-tiny text-muted-foreground block">
          Nome da instancia
        </label>
        <input
          type="text"
          value={branding.instanceName}
          onChange={(e) =>
            setBranding((prev) => ({ ...prev, instanceName: e.target.value }))
          }
          placeholder="LFPro Tasks"
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
        />
        <p className="font-density-tiny text-muted-foreground">
          Aparece no cabecalho da sidebar
        </p>
      </div>

      {/* Preview */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border space-y-3">
        <label className="font-density-tiny text-muted-foreground block">
          Pre-visualizacao
        </label>
        <div className="flex items-center gap-3 px-4 py-3 bg-sidebar rounded-lg border border-sidebar-border">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {previewLogo ? (
              <img
                src={previewLogo}
                alt="Logo"
                className="w-5 h-5 object-contain"
              />
            ) : (
              <span className="text-white text-xs font-bold">
                {branding.instanceName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="font-bold text-sm text-sidebar-foreground">
            {branding.instanceName || 'LFPro Tasks'}
          </span>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        Salvar configuracoes
      </button>
    </div>
  );
};

export default BrandingSettings;
