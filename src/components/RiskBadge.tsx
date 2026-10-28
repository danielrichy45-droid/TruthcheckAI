import React from 'react';
import { RiskLevel, Severity } from '../types';

interface Props {
  level: RiskLevel | Severity;
  type?: 'risk' | 'severity';
  size?: 'sm' | 'md';
}

export const RiskBadge: React.FC<Props> = ({ level, type = 'risk', size = 'sm' }) => {
  const configs = {
    CRITICAL: {
      label: 'Critical',
      className: 'bg-red-100 text-red-900 border-red-300 font-semibold',
    },
    HIGH: {
      label: 'High',
      className: 'bg-orange-100 text-orange-900 border-orange-300 font-medium',
    },
    MEDIUM: {
      label: 'Medium',
      className: 'bg-yellow-100 text-yellow-900 border-yellow-300 font-medium',
    },
    LOW: {
      label: 'Low',
      className: 'bg-stone-100 text-stone-700 border-stone-300 font-normal',
    },
  };

  const config = configs[level] || configs.LOW;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded border ${padding} ${config.className}`}
      title={`${type === 'risk' ? 'Risk Level' : 'Discrepancy Severity'}: ${config.label}`}
    >
      {type === 'risk' ? `${config.label} Risk` : `${config.label} Severity`}
    </span>
  );
};
