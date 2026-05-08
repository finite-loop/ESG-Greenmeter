"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  frameworkSelectionSchema,
  type FrameworkSelection as FrameworkSelectionData,
  FRAMEWORKS,
} from "@/schemas/onboarding";

const FRAMEWORK_INFO: Record<
  (typeof FRAMEWORKS)[number],
  { name: string; description: string }
> = {
  BRSR: {
    name: "BRSR",
    description: "Business Responsibility and Sustainability Reporting (SEBI, India)",
  },
  ESRS: {
    name: "ESRS",
    description: "European Sustainability Reporting Standards (CSRD, EU)",
  },
  GRI: {
    name: "GRI",
    description: "Global Reporting Initiative (International)",
  },
  IFRS_S2: {
    name: "IFRS S2",
    description: "IFRS Sustainability Disclosure — Climate (ISSB)",
  },
};

interface FrameworkSelectionProps {
  defaultValues?: Partial<FrameworkSelectionData>;
  onSubmit: (data: FrameworkSelectionData) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function FrameworkSelectionStep({
  defaultValues,
  onSubmit,
  onBack,
  isSubmitting,
}: FrameworkSelectionProps) {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FrameworkSelectionData>({
    resolver: zodResolver(frameworkSelectionSchema),
    defaultValues: {
      frameworks: [],
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-xs text-[var(--tx2)] mb-3">
        Select the ESG reporting frameworks your organization follows. You can change this later in Settings.
      </p>

      <Controller
        name="frameworks"
        control={control}
        render={({ field }) => (
          <div className="space-y-2">
            {FRAMEWORKS.map((fw) => {
              const info = FRAMEWORK_INFO[fw];
              const isSelected = field.value?.includes(fw);

              return (
                <label
                  key={fw}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    isSelected
                      ? "border-[var(--t500)] bg-[var(--t50)]"
                      : "border-[var(--bdr)] hover:border-[var(--t300)]"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...(field.value || []), fw]
                        : (field.value || []).filter((f) => f !== fw);
                      field.onChange(updated);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--bdr)] accent-[var(--t700)]"
                  />
                  <div>
                    <p className="text-xs font-semibold text-[var(--tx1)]">{info.name}</p>
                    <p className="text-[10px] text-[var(--tx3)]">{info.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      />

      {errors.frameworks && (
        <p className="text-[10px] text-[var(--red)]">{errors.frameworks.message}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1 justify-center"
          onClick={onBack}
        >
          Back
        </Button>
        <Button type="submit" size="lg" className="flex-1 justify-center" loading={isSubmitting}>
          Complete Setup
        </Button>
      </div>
    </form>
  );
}
