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

interface MilestoneFormValues {
  name: string;
  description?: string;
  targetValue?: string;
  targetDate?: string;
  sortOrder?: number;
  status?: string;
}

interface MilestoneFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MilestoneFormValues) => void;
  initialValues?: Partial<MilestoneFormValues>;
  mode: 'create' | 'edit';
  isSubmitting?: boolean;
}

function formatDateForInput(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function MilestoneForm({
  open,
  onOpenChange,
  onSubmit,
  initialValues,
  mode,
  isSubmitting = false,
}: MilestoneFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [targetValue, setTargetValue] = useState(initialValues?.targetValue ?? '');
  const [targetDate, setTargetDate] = useState(formatDateForInput(initialValues?.targetDate));
  const [sortOrder, setSortOrder] = useState(String(initialValues?.sortOrder ?? 0));
  const [status, setStatus] = useState(initialValues?.status ?? 'pending');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const values: MilestoneFormValues = {
      name,
      description: description || undefined,
      targetValue: targetValue || undefined,
      targetDate: targetDate || undefined,
      sortOrder: sortOrder ? Number(sortOrder) : undefined,
    };
    if (mode === 'edit') {
      values.status = status;
    }
    onSubmit(values);
  };

  const isValid = name.trim().length > 0;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>{mode === 'create' ? 'Add Milestone' : 'Edit Milestone'}</ModalTitle>
            <ModalDescription>
              {mode === 'create'
                ? 'Define an intermediate checkpoint for this goal.'
                : 'Update the milestone details.'}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 px-6 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="milestone-name">
                Name *
              </label>
              <Input
                id="milestone-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 10% reduction by Q2"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="milestone-desc">
                Description
              </label>
              <textarea
                id="milestone-desc"
                className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="milestone-target">
                  Target Value
                </label>
                <Input
                  id="milestone-target"
                  type="number"
                  step="any"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="120"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="milestone-date">
                  Target Date
                </label>
                <Input
                  id="milestone-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>

            {mode === 'edit' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="milestone-status">
                  Status
                </label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="milestone-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="achieved">Achieved</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="milestone-order">
                Sort Order
              </label>
              <Input
                id="milestone-order"
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Add Milestone' : 'Save Changes'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
