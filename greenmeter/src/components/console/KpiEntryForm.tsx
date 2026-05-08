'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui';

const kpiEntryFormSchema = z.object({
  value: z.string().optional(),
  valueText: z.string().optional(),
  unit: z.string().optional(),
  notApplicable: z.boolean().optional().default(false),
});

type KpiEntryFormValues = z.input<typeof kpiEntryFormSchema>;

interface KpiEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paramName: string;
  paramCode: string;
  paramUnit: string;
  dataType: string;
  initialValues?: {
    value?: string | null;
    valueText?: string | null;
    unit?: string | null;
    notApplicable?: boolean | null;
  };
  onSubmit: (values: KpiEntryFormValues) => void;
  isSubmitting?: boolean;
  mode: 'create' | 'edit';
}

export function KpiEntryForm({
  open,
  onOpenChange,
  paramName,
  paramCode,
  paramUnit,
  dataType,
  initialValues,
  onSubmit,
  isSubmitting,
  mode,
}: KpiEntryFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<KpiEntryFormValues>({
    resolver: zodResolver(kpiEntryFormSchema),
    defaultValues: {
      value: initialValues?.value ?? '',
      valueText: initialValues?.valueText ?? '',
      unit: initialValues?.unit ?? paramUnit,
      notApplicable: initialValues?.notApplicable ?? false,
    },
  });

  useEffect(() => {
    reset({
      value: initialValues?.value ?? '',
      valueText: initialValues?.valueText ?? '',
      unit: initialValues?.unit ?? paramUnit,
      notApplicable: initialValues?.notApplicable ?? false,
    });
  }, [initialValues, paramUnit, reset]);

  const notApplicable = watch('notApplicable');
  const isNumeric = dataType === 'numeric' || dataType === 'number' || dataType === 'decimal';

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {mode === 'create' ? 'Enter KPI Value' : 'Edit KPI Value'}
          </ModalTitle>
          <ModalDescription>
            {paramCode} — {paramName}
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="notApplicable"
              {...register('notApplicable')}
              className="rounded border-[var(--bdr)] text-[var(--t700)] focus:ring-[var(--t500)]"
            />
            <label htmlFor="notApplicable" className="text-xs text-[var(--tx2)]">
              Not Applicable
            </label>
          </div>

          {!notApplicable && (
            <>
              {isNumeric ? (
                <Input
                  id="value"
                  label="Value"
                  type="number"
                  step="any"
                  placeholder={`Enter numeric value (${paramUnit})`}
                  error={errors.value?.message}
                  {...register('value')}
                />
              ) : (
                <div className="mb-[13px]">
                  <label
                    htmlFor="valueText"
                    className="block text-[11px] font-semibold text-[var(--tx2)] mb-[5px]"
                  >
                    Value
                  </label>
                  <textarea
                    id="valueText"
                    rows={3}
                    placeholder="Enter text value"
                    className="w-full px-[11px] py-2 border border-[var(--bdr)] rounded-[7px] text-xs outline-none transition-[border-color] bg-[var(--surf)] focus:border-[var(--t500)] focus:shadow-[0_0_0_3px_rgba(20,184,166,0.1)] resize-none"
                    {...register('valueText')}
                  />
                  {errors.valueText && (
                    <p className="text-[10px] text-[var(--red)] mt-1">
                      {errors.valueText.message}
                    </p>
                  )}
                </div>
              )}

              <Input
                id="unit"
                label="Unit"
                placeholder="e.g., tCO2e, MWh, %"
                error={errors.unit?.message}
                {...register('unit')}
              />
            </>
          )}

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {mode === 'create' ? 'Save' : 'Update'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
