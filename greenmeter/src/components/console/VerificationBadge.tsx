'use client';

import {
  Badge,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui';

interface VerificationBadgeProps {
  verified: boolean;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function VerificationBadge({ verified, verifiedBy, verifiedAt }: VerificationBadgeProps) {
  if (!verified) return null;

  const tooltipText = [
    verifiedAt && `Verified on ${formatDate(verifiedAt)}`,
    verifiedBy && `by ${verifiedBy}`,
  ]
    .filter(Boolean)
    .join(' ');

  if (!tooltipText) {
    return <Badge variant="success">Verified</Badge>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="success" className="cursor-default">
          Verified
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
