import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  variant?: 'underline' | 'filled' | 'outline';
}

const Tabs: React.FC<TabsProps> = ({
  items,
  activeTab,
  onChange,
  className = '',
  variant = 'underline',
}) => {
  const baseClasses = 'flex space-x-4';
  
  const variantStyles = {
    underline: {
      container: 'border-b border-gray-200',
      tab: 'pb-2 px-1',
      active: 'text-blue-600 border-b-2 border-blue-600 font-medium',
      inactive: 'text-gray-500 hover:text-gray-700',
    },
    filled: {
      container: 'bg-gray-100 p-1 rounded-lg',
      tab: 'py-2 px-4 rounded-md',
      active: 'bg-white text-blue-600 shadow-sm font-medium',
      inactive: 'text-gray-500 hover:text-gray-700',
    },
    outline: {
      container: 'border border-gray-200 rounded-lg overflow-hidden',
      tab: 'py-2 px-4',
      active: 'bg-blue-50 text-blue-600 font-medium',
      inactive: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
    },
  };
  
  const styles = variantStyles[variant];
  
  return (
    <div className={`${baseClasses} ${styles.container} ${className}`}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => !item.disabled && onChange(item.id)}
          className={`
            ${styles.tab}
            ${activeTab === item.id ? styles.active : styles.inactive}
            ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          disabled={item.disabled}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;