'use client';

import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui';

interface GoalFormValues {
  name: string;
  paramId: string;
  targetValue: string;
  targetYear: string;
  unit?: string;
  direction: string;
  description?: string;
  baselineValue?: string;
  baselineYear?: string;
}

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoalFormValues) => void;
  initialValues?: Partial<GoalFormValues>;
  mode: 'create' | 'edit';
  isSubmitting?: boolean;
  parameters: Array<{ paramId: string; name: string; code: string; unit: string }>;
}

export function GoalForm({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  mode,
  isSubmitting = false,
  parameters,
}: GoalFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [paramId, setParamId] = useState(initialValues?.paramId ?? '');
  const [targetValue, setTargetValue] = useState(initialValues?.targetValue ?? '');
  const [targetYear, setTargetYear] = useState(initialValues?.targetYear ?? '');
  const [unit, setUnit] = useState(initialValues?.unit ?? '');
  const [direction, setDirection] = useState(initialValues?.direction ?? 'lower_is_better');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [baselineValue, setBaselineValue] = useState(initialValues?.baselineValue ?? '');
  const [baselineYear, setBaselineYear] = useState(initialValues?.baselineYear ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      paramId,
      targetValue,
      targetYear,
      unit: unit || undefined,
      direction,
      description: description || undefined,
      baselineValue: baselineValue || undefined,
      baselineYear: baselineYear || undefined,
    });
  };

  const isValid = name.trim() && paramId && targetValue && targetYear.length === 4;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>{mode === 'create' ? 'Create Goal' : 'Edit Goal'}</ModalTitle>
            <ModalDescription>
              {mode === 'create'
                ? 'Define a new ESG goal with target and linked parameter.'
                : 'Update the goal details.'}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 px-6 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="goal-name">
                Goal Name *
              </label>
              <Input
                id="goal-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Reduce Scope 1 Emissions by 30%"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="goal-param">
                Linked Parameter *
              </label>
              <Select value={paramId} onValueChange={setParamId}>
                <SelectTrigger id="goal-param">
                  <SelectValue placeholder="Select parameter..." />
                </SelectTrigger>
                <SelectContent>
                  {parameters.map((p) => (
                    <SelectItem key={p.paramId} value={p.paramId}>
                      {p.code} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="goal-target">
                  Target Value *
                </label>
                <Input
                  id="goal-target"
                  type="number"
                  step="any"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="100"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="goal-year">
                  Target Year *
                </label>
                <Input
                  id="goal-year"
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  placeholder="2030"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="goal-unit">
                  Unit
                </label>
                <Input
                  id="goal-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="tCO2e"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="goal-direction">
                  Direction
                </label>
                <Select value={direction} onValueChange={setDirection}>
                  <SelectTrigger id="goal-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lower_is_better">Lower is Better</SelectItem>
                    <SelectItem value="higher_is_better">Higher is Better</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="goal-baseline">
                  Baseline Value
                </label>
                <Input
                  id="goal-baseline"
                  type="number"
                  step="any"
                  value={baselineValue}
                  onChange={(e) => setBaselineValue(e.target.value)}
                  placeholder="150"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="goal-baseline-year">
                  Baseline Year
                </label>
                <Input
                  id="goal-baseline-year"
                  value={baselineYear}
                  onChange={(e) => setBaselineYear(e.target.value)}
                  placeholder="2020"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="goal-desc">
                Description
              </label>
              <textarea
                id="goal-desc"
                className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
              />
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Goal' : 'Save Changes'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
