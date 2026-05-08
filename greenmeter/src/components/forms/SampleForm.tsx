'use client';

/**
 * Sample Form — Developer Reference
 *
 * This component demonstrates the project's form pattern:
 * - React Hook Form for form state management
 * - Zod resolver for client-side validation
 * - Shared schema from /src/schemas/ (single source of truth for API + form)
 *
 * Copy this pattern when creating new forms.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { kpiValueCreateSchema, type KpiValueCreate } from '@/schemas/kpi';

export function SampleKpiForm({ onSubmit }: { onSubmit: (data: KpiValueCreate) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<KpiValueCreate>({
    resolver: zodResolver(kpiValueCreateSchema),
    defaultValues: {
      sourceType: 'manual',
      notApplicable: false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="value" className="block text-sm font-medium">
          Value
        </label>
        <input
          id="value"
          {...register('value')}
          className="mt-1 block w-full rounded border px-3 py-2"
        />
        {errors.value && (
          <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="unit" className="block text-sm font-medium">
          Unit
        </label>
        <input
          id="unit"
          {...register('unit')}
          className="mt-1 block w-full rounded border px-3 py-2"
        />
      </div>

      <input type="hidden" {...register('paramId')} />
      <input type="hidden" {...register('nodeId')} />
      <input type="hidden" {...register('periodId')} />
      <input type="hidden" {...register('sourceType')} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
