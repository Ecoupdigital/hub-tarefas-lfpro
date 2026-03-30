import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Globe, Lock, Camera, Briefcase } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Timezone options (common Brazilian / US / EU)
// ---------------------------------------------------------------------------
const TIMEZONE_OPTIONS = [
  // Brasil
  { value: 'America/Sao_Paulo',   label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus',      label: 'Manaus (GMT-4)' },
  { value: 'America/Fortaleza',   label: 'Fortaleza (GMT-3)' },
  { value: 'America/Recife',      label: 'Recife (GMT-3)' },
  { value: 'America/Belem',       label: 'Belém (GMT-3)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (GMT-4)' },
  { value: 'America/Boa_Vista',   label: 'Boa Vista (GMT-4)' },
  { value: 'America/Rio_Branco',  label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha',     label: 'Fernando de Noronha (GMT-2)' },
  // EUA
  { value: 'America/New_York',    label: 'Nova York — Leste (GMT-5)' },
  { value: 'America/Chicago',     label: 'Chicago — Central (GMT-6)' },
  { value: 'America/Denver',      label: 'Denver — Montanha (GMT-7)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles — Pacífico (GMT-8)' },
  { value: 'America/Anchorage',   label: 'Anchorage — Alaska (GMT-9)' },
  { value: 'Pacific/Honolulu',    label: 'Honolulu — Havaí (GMT-10)' },
  // Europa
  { value: 'Europe/London',       label: 'Londres (GMT+0)' },
  { value: 'Europe/Lisbon',       label: 'Lisboa (GMT+0)' },
  { value: 'Europe/Paris',        label: 'Paris (GMT+1)' },
  { value: 'Europe/Berlin',       label: 'Berlim (GMT+1)' },
  { value: 'Europe/Madrid',       label: 'Madri (GMT+1)' },
  { value: 'Europe/Rome',         label: 'Roma (GMT+1)' },
  { value: 'Europe/Amsterdam',    label: 'Amsterdã (GMT+1)' },
  { value: 'Europe/Zurich',       label: 'Zurique (GMT+1)' },
  { value: 'Europe/Warsaw',       label: 'Varsóvia (GMT+1)' },
  { value: 'Europe/Stockholm',    label: 'Estocolmo (GMT+1)' },
  { value: 'Europe/Helsinki',     label: 'Helsinque (GMT+2)' },
  { value: 'Europe/Athens',       label: 'Atenas (GMT+2)' },
  { value: 'Europe/Bucharest',    label: 'Bucareste (GMT+2)' },
  { value: 'Europe/Moscow',       label: 'Moscou (GMT+3)' },
];

// ---------------------------------------------------------------------------
// Helper: derive initials from a name string
// ---------------------------------------------------------------------------
function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div className="space-y-4">
    <h3 className="font-density-cell font-semibold text-muted-foreground uppercase tracking-wider text-xs">
      {title}
    </h3>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Field wrapper: Label + children + optional hint
// ---------------------------------------------------------------------------
interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ id, label, hint, children }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="font-density-cell text-foreground/80">
      {label}
    </Label>
    {children}
    {hint && (
      <p className="font-density-tiny text-muted-foreground">{hint}</p>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile(user?.id);

  // --- Profile fields ---
  const [name, setName]         = useState('');
  const [title, setTitle]       = useState('');
  const [phone, setPhone]       = useState('');
  const [location, setLocation] = useState('');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [isSaving, setIsSaving] = useState(false);

  // --- Password fields ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPwd, setIsChangingPwd]     = useState(false);

  // Populate form when profile data arrives
  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? '');
    // Gracefully handle columns that may not exist yet in the DB schema
    const p = profile as Record<string, unknown>;
    setTitle(typeof p.title === 'string' ? p.title : '');
    setPhone(typeof p.phone === 'string' ? p.phone : '');
    setLocation(typeof p.location === 'string' ? p.location : '');
    setTimezone(typeof p.timezone === 'string' ? p.timezone : 'America/Sao_Paulo');
  }, [profile]);

  // -----------------------------------------------------------------------
  // Save profile info
  // -----------------------------------------------------------------------
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!name.trim()) {
      toast.error('O nome completo é obrigatório.');
      return;
    }

    setIsSaving(true);
    try {
      // Cast to any so TypeScript doesn't complain about columns that are not
      // yet in the generated types but will be added via migration.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, string> = {
        name:     name.trim(),
        title:    title.trim(),
        phone:    phone.trim(),
        location: location.trim(),
        timezone,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('profiles') as any)
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });

      toast.success('Perfil atualizado com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao salvar perfil: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  // -----------------------------------------------------------------------
  // Change password
  // -----------------------------------------------------------------------
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword) {
      toast.error('Informe a nova senha.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setIsChangingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Senha alterada com sucesso!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao alterar senha: ${msg}`);
    } finally {
      setIsChangingPwd(false);
    }
  };

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground font-density-cell">
        Carregando perfil...
      </div>
    );
  }

  const initials = getInitials(name || profile?.name);

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-10">

      {/* ------------------------------------------------------------------ */}
      {/* Avatar section                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          {/* Avatar circle with initials */}
          <div
            className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-2xl select-none shadow"
            aria-label="Avatar do usuário"
          >
            {initials}
          </div>
          {/* Camera button — placeholder, disabled for now */}
          <button
            type="button"
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border border-border shadow flex items-center justify-center hover:bg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Alterar foto"
            title="Alterar foto (em breve)"
            disabled
          >
            <Camera className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        <div>
          <p className="font-medium text-foreground text-base leading-tight">
            {name || profile?.name || 'Usuário'}
          </p>
          <p className="font-density-cell text-muted-foreground mt-0.5">
            {user?.email ?? ''}
          </p>
          {/* Placeholder button for future photo upload */}
          <button
            type="button"
            className="mt-2 font-density-cell text-primary opacity-50 cursor-not-allowed"
            disabled
            title="Disponível em breve"
          >
            Alterar foto
          </button>
        </div>
      </div>

      <Separator />

      {/* ------------------------------------------------------------------ */}
      {/* Informações pessoais                                                 */}
      {/* ------------------------------------------------------------------ */}
      <form onSubmit={handleSaveProfile} className="space-y-6" noValidate>
        <Section title="Informações pessoais">

          <Field id="profile-name" label="Nome completo">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="profile-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome completo"
                className="pl-9"
                autoComplete="name"
              />
            </div>
          </Field>

          <Field
            id="profile-email"
            label="E-mail"
            hint="O e-mail não pode ser alterado por aqui. Entre em contato com o suporte."
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="profile-email"
                value={user?.email ?? ''}
                readOnly
                disabled
                className="pl-9 bg-muted/50 cursor-not-allowed text-muted-foreground"
              />
            </div>
          </Field>

          <Field id="profile-title" label="Título / Cargo">
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="profile-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Gerente de Projetos"
                className="pl-9"
                autoComplete="organization-title"
              />
            </div>
          </Field>

          <Field id="profile-phone" label="Telefone">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+55 (11) 99999-9999"
                className="pl-9"
                autoComplete="tel"
              />
            </div>
          </Field>

          <Field id="profile-location" label="Localização">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="profile-location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Ex: São Paulo, SP"
                className="pl-9"
                autoComplete="address-level2"
              />
            </div>
          </Field>

          <Field id="profile-timezone" label="Fuso horário">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="profile-timezone" className="pl-9">
                  <SelectValue placeholder="Selecione o fuso horário" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {TIMEZONE_OPTIONS.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Field>

        </Section>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSaving} className="min-w-[160px]">
            {isSaving ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </form>

      <Separator />

      {/* ------------------------------------------------------------------ */}
      {/* Alterar senha                                                        */}
      {/* ------------------------------------------------------------------ */}
      <form onSubmit={handleChangePassword} className="space-y-6" noValidate>
        <Section title="Alterar senha">

          <Field
            id="pwd-current"
            label="Senha atual"
            hint="Necessária para confirmar sua identidade antes de definir a nova senha."
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="pwd-current"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                autoComplete="current-password"
              />
            </div>
          </Field>

          <Field id="pwd-new" label="Nova senha" hint="Mínimo de 6 caracteres.">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="pwd-new"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                autoComplete="new-password"
              />
            </div>
          </Field>

          <Field id="pwd-confirm" label="Confirmar nova senha">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="pwd-confirm"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                autoComplete="new-password"
              />
            </div>
          </Field>

        </Section>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="outline"
            disabled={isChangingPwd}
            className="min-w-[160px]"
          >
            {isChangingPwd ? 'Alterando...' : 'Alterar senha'}
          </Button>
        </div>
      </form>

    </div>
  );
};

export default ProfileSettings;
