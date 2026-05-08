"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  label: string;
  description: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function WizardStepper({ steps, currentStep, onStepClick }: WizardStepperProps) {
  return (
    <nav aria-label="Onboarding progress" className="mb-8">
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = isCompleted && onStepClick;

          return (
            <li key={step.label} className="flex items-center gap-2 flex-1">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(index)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors w-full",
                  isCompleted && "cursor-pointer hover:bg-[var(--t50)]",
                  isCurrent && "bg-[var(--t50)]",
                  !isCompleted && !isCurrent && "opacity-50 cursor-default"
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    isCompleted && "bg-[var(--t700)] text-white",
                    isCurrent && "bg-[var(--t700)] text-white",
                    !isCompleted && !isCurrent && "bg-[var(--bg)] text-[var(--tx3)] border border-[var(--bdr)]"
                  )}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                </div>
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-[11px] font-semibold truncate",
                      (isCompleted || isCurrent) ? "text-[var(--tx1)]" : "text-[var(--tx3)]"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-[var(--tx3)] truncate">{step.description}</p>
                </div>
              </button>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px w-4 shrink-0",
                    isCompleted ? "bg-[var(--t500)]" : "bg-[var(--bdr)]"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
