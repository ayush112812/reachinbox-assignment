import React from 'react';
import { EmailCategory } from '../../types/email';

interface BadgeProps {
  category: EmailCategory;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ category, className = '', size = 'md' }) => {
  const styles: Record<EmailCategory, string> = {
    Interested: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    'Meeting Booked': 'bg-purple-50 text-purple-700 border-purple-200/80',
    'Not Interested': 'bg-slate-100 text-slate-700 border-slate-200',
    Spam: 'bg-rose-50 text-rose-700 border-rose-200/80',
    'Out of Office': 'bg-amber-50 text-amber-700 border-amber-200/80',
    Uncategorized: 'bg-gray-100 text-gray-500 border-gray-200'
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${styles[category] || styles.Uncategorized} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {category}
    </span>
  );
};
