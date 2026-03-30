import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, X, Lightbulb, Keyboard } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const ONBOARDING_KEY = 'lfpro-onboarding';
const ONBOARDING_DISMISSED_KEY = 'lfpro-onboarding-dismissed';

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  { id: 'create_board', label: 'Criar seu primeiro board', description: 'Crie um board para organizar seu projeto.' },
  { id: 'add_item', label: 'Adicionar um item', description: 'Adicione itens ao seu board para rastrear tarefas.' },
  { id: 'invite_member', label: 'Convidar um membro', description: 'Convide colegas para colaborar no workspace.' },
  { id: 'customize_view', label: 'Personalizar uma view', description: 'Experimente diferentes visualizacoes: Kanban, Calendar, etc.' },
  { id: 'keyboard_shortcuts', label: 'Explorar atalhos de teclado', description: 'Use Ctrl+K para abrir a paleta de comandos.' },
];

const getCompletedSteps = (): string[] => {
  try {
    const stored = localStorage.getItem(ONBOARDING_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const setCompletedSteps = (steps: string[]) => {
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify(steps));
};

const isDismissed = (): boolean => {
  return localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true';
};

export const markOnboardingStep = (stepId: string) => {
  const completed = getCompletedSteps();
  if (!completed.includes(stepId)) {
    setCompletedSteps([...completed, stepId]);
    window.dispatchEvent(new CustomEvent('onboarding-updated'));
  }
};

const OnboardingChecklist: React.FC = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [completed, setCompleted] = useState<string[]>(getCompletedSteps);
  const [dismissed, setDismissed] = useState(isDismissed);

  useEffect(() => {
    const handler = () => {
      setCompleted(getCompletedSteps());
    };
    window.addEventListener('onboarding-updated', handler);
    return () => window.removeEventListener('onboarding-updated', handler);
  }, []);

  if (dismissed) return null;

  const completedCount = completed.length;
  const totalSteps = STEPS.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  if (completedCount === totalSteps) return null;

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  const toggleStep = (stepId: string) => {
    let newCompleted: string[];
    if (completed.includes(stepId)) {
      newCompleted = completed.filter(s => s !== stepId);
    } else {
      newCompleted = [...completed, stepId];
    }
    setCompleted(newCompleted);
    setCompletedSteps(newCompleted);
  };

  const handleStepAction = (stepId: string) => {
    switch (stepId) {
      case 'create_board':
        window.dispatchEvent(new CustomEvent('lfpro-create-board'));
        break;
      case 'add_item':
        // Navigate to board if exists
        break;
      case 'invite_member':
        break;
      case 'customize_view':
        break;
      case 'keyboard_shortcuts':
        // Open command palette
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
        break;
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">Primeiros passos</h3>
          <span className="font-density-tiny text-muted-foreground">{completedCount}/{totalSteps}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dispensar checklist de onboarding"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-2">
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-1">
          {STEPS.map((step) => {
            const isCompleted = completed.includes(step.id);
            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isCompleted ? 'opacity-60' : 'hover:bg-muted/50 cursor-pointer'
                }`}
              >
                <button
                  onClick={() => toggleStep(step.id)}
                  className="mt-0.5 flex-shrink-0"
                  aria-label={isCompleted ? `Desmarcar "${step.label}"` : `Marcar "${step.label}" como concluido`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <div
                  className="flex-1 min-w-0"
                  onClick={() => { if (!isCompleted) handleStepAction(step.id); }}
                >
                  <p className={`font-density-cell font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {step.label}
                  </p>
                  <p className="font-density-tiny text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </div>
            );
          })}

          <button
            onClick={handleDismiss}
            className="w-full mt-2 text-center font-density-tiny text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Dispensar
          </button>
        </div>
      )}
    </div>
  );
};

export default OnboardingChecklist;
