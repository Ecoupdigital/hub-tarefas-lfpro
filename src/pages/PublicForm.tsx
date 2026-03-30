import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicForm } from '@/hooks/useBoardForms';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const PublicForm: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: form, isLoading, error } = usePublicForm(slug);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [itemName, setItemName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Formulario nao encontrado</h2>
          <p className="text-sm text-muted-foreground">
            O formulario que voce esta procurando nao existe ou foi removido.
          </p>
        </div>
      </div>
    );
  }

  if (!form.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Formulario indisponivel</h2>
          <p className="text-sm text-muted-foreground">
            Este formulario nao esta aceitando respostas no momento.
          </p>
        </div>
      </div>
    );
  }

  const orderedColumns = (form.column_ids || [])
    .map((id: string) => (form.columns || []).find((c: { id: string }) => c.id === id))
    .filter(Boolean) as { id: string; title: string; column_type: string; settings?: Record<string, unknown> }[];

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!itemName.trim()) {
      errors['__item_name__'] = 'Este campo e obrigatorio';
    }
    for (const col of orderedColumns) {
      const isRequired = (col.settings as Record<string, unknown>)?.required === true;
      if (isRequired) {
        const val = values[col.id];
        const isEmpty = val === undefined || val === null || val === '';
        if (isEmpty) {
          errors[col.id] = 'Este campo e obrigatorio';
        }
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Chamar Edge Function como proxy — service role key fica apenas server-side
      const { data, error: fnError } = await supabase.functions.invoke('submit-form', {
        body: { slug, itemName: itemName.trim(), values },
      });

      if (fnError || !data?.success) {
        setSubmitError(data?.error || 'Erro ao enviar resposta. Tente novamente.');
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError('Erro ao enviar resposta. Verifique sua conexao e tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateValue = (columnId: string, value: unknown) => {
    setValues(prev => ({ ...prev, [columnId]: value }));
    // Limpar erro do campo ao editar
    if (fieldErrors[columnId]) {
      setFieldErrors(prev => { const next = { ...prev }; delete next[columnId]; return next; });
    }
  };

  const renderField = (column: { id: string; title: string; column_type: string; settings?: Record<string, unknown> }) => {
    const colType = column.column_type;
    const settings = column.settings || {};

    switch (colType) {
      case 'text':
        return (
          <Input
            value={(values[column.id] as string) || ''}
            onChange={e => updateValue(column.id, e.target.value)}
            placeholder={`Digite ${column.title.toLowerCase()}...`}
          />
        );

      case 'long_text':
        return (
          <Textarea
            value={(values[column.id] as string) || ''}
            onChange={e => updateValue(column.id, e.target.value)}
            placeholder={`Digite ${column.title.toLowerCase()}...`}
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(values[column.id] as string) || ''}
            onChange={e => updateValue(column.id, e.target.value ? Number(e.target.value) : '')}
            placeholder="0"
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={(values[column.id] as string) || ''}
            onChange={e => updateValue(column.id, e.target.value)}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={(values[column.id] as string) || ''}
            onChange={e => updateValue(column.id, e.target.value)}
            placeholder="email@exemplo.com"
          />
        );

      case 'phone':
        return (
          <Input
            type="tel"
            value={(values[column.id] as string) || ''}
            onChange={e => updateValue(column.id, e.target.value)}
            placeholder="(00) 00000-0000"
          />
        );

      case 'link':
        return (
          <Input
            type="url"
            value={(values[column.id] as string) || ''}
            onChange={e => updateValue(column.id, e.target.value)}
            placeholder="https://..."
          />
        );

      case 'status': {
        const labels = (settings.labels as Record<string, { name: string; color: string }>) || {};
        return (
          <Select value={(values[column.id] as string) || ''} onValueChange={v => updateValue(column.id, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(labels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                    {label.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case 'dropdown': {
        const options = (settings.options as string[]) || [];
        return (
          <Select value={(values[column.id] as string) || ''} onValueChange={v => updateValue(column.id, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!(values[column.id])}
              onChange={e => updateValue(column.id, e.target.checked)}
              className="w-5 h-5 rounded-[3px]"
            />
            <span className="text-sm text-muted-foreground">Sim</span>
          </label>
        );

      case 'rating':
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => updateValue(column.id, star)}
                className={`text-2xl transition-colors ${
                  ((values[column.id] as number) || 0) >= star ? 'text-yellow-500' : 'text-muted-foreground/30'
                }`}
              >
                &#9733;
              </button>
            ))}
          </div>
        );

      default:
        return (
          <Input
            value={(values[column.id] as string) || ''}
            onChange={e => updateValue(column.id, e.target.value)}
            placeholder={`Digite ${column.title.toLowerCase()}...`}
          />
        );
    }
  };

  if (submitted) {
    const successMessage = (form.settings as Record<string, unknown>)?.success_message as string
      || 'Sua resposta foi registrada. Obrigado por preencher o formulario.';
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Resposta enviada com sucesso!</h2>
          <p className="text-muted-foreground">{successMessage}</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setValues({});
              setItemName('');
              setSubmitError(null);
              setFieldErrors({});
            }}
            className="px-6 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
          >
            Enviar outra resposta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="bg-card rounded-t-xl border border-border p-6">
          <div className="h-2 bg-primary rounded-full mb-4" />
          <h1 className="text-2xl font-bold text-foreground">{form.title}</h1>
          {form.description && (
            <p className="text-muted-foreground mt-2">{form.description}</p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-0" noValidate>
          {/* Item name field */}
          <div className="bg-card border-x border-b border-border p-6">
            <Label className="text-sm font-medium">
              Nome do item <span className="text-destructive">*</span>
            </Label>
            <Input
              value={itemName}
              onChange={e => {
                setItemName(e.target.value);
                if (fieldErrors['__item_name__']) {
                  setFieldErrors(prev => { const next = { ...prev }; delete next['__item_name__']; return next; });
                }
              }}
              placeholder="Digite o nome..."
              className={`mt-2 ${fieldErrors['__item_name__'] ? 'border-destructive' : ''}`}
            />
            {fieldErrors['__item_name__'] && (
              <p className="text-xs text-destructive mt-1">{fieldErrors['__item_name__']}</p>
            )}
          </div>

          {/* Dynamic fields */}
          {orderedColumns.map(col => {
            const isRequired = (col.settings as Record<string, unknown>)?.required === true;
            return (
              <div key={col.id} className="bg-card border-x border-b border-border p-6">
                <Label className="text-sm font-medium">
                  {col.title}
                  {isRequired && <span className="text-destructive ml-1">*</span>}
                </Label>
                <div className="mt-2">
                  {renderField(col)}
                </div>
                {fieldErrors[col.id] && (
                  <p className="text-xs text-destructive mt-1">{fieldErrors[col.id]}</p>
                )}
              </div>
            );
          })}

          {/* Submit */}
          <div className="bg-card rounded-b-xl border-x border-b border-border p-6 space-y-3">
            {submitError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {submitError}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-2.5 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          Formulario do board <span className="font-medium">{form.board_name}</span> &mdash; LFPro Tasks
        </div>
      </div>
    </div>
  );
};

export default PublicForm;
