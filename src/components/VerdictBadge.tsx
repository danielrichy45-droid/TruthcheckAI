import React from 'react';
import { Verdict } from '../types';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';

interface Props {
  verdict: Verdict;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const VerdictBadge: React.FC<Props> = ({ verdict, size = 'md', showIcon = true }) => {
  const configs = {
    PASS: {
      label: 'Pass',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
      dot: 'bg-emerald-600',
    },
    POTENTIAL_FAILURE: {
      label: 'Potential Failure',
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: AlertOctagon,
      dot: 'bg-rose-600',
    },
    NEEDS_REVIEW: {
      label: 'Needs Review',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: AlertTriangle,
      dot: 'bg-amber-600',
    },
    INSUFFICIENT_EVIDENCE: {
      label: 'Insufficient Evidence',
      bg: 'bg-sky-50 text-sky-800 border-sky-200',
      icon: HelpCircle,
      dot: 'bg-sky-600',
    },
  };

  const config = configs[verdict] || configs.NEEDS_REVIEW;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  }[size];

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-wide shadow-xs ${config.bg} ${sizeClasses}`}
    >
      {showIcon && <Icon size={iconSizes} className="shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};
