import { clsx } from "clsx";

interface StepperProps {
  steps: string[];
  activeStep: number;
  onStepClick?: (index: number) => void;
}

export function Stepper({ steps, activeStep, onStepClick }: StepperProps) {
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {steps.map((step, idx) => {
        const isActive = idx === activeStep;
        const isCompleted = idx < activeStep;
        return (
          <li key={step}>
            <button
              type="button"
              onClick={() => onStepClick?.(idx)}
              className={clsx(
                "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
                isActive && "border-accent bg-emerald-900/20 text-emerald-200",
                isCompleted && "border-sky-500/40 bg-sky-900/20 text-sky-200",
                !isActive && !isCompleted && "border-slate-700 bg-slate-900/50 text-slate-400",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={clsx(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                  isActive && "bg-accent text-slate-900",
                  isCompleted && "bg-sky-400 text-slate-900",
                  !isActive && !isCompleted && "bg-slate-700 text-slate-200",
                )}
              >
                {idx + 1}
              </span>
              <span>{step}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

