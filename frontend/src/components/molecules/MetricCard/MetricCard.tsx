import React from 'react';
import Card from '../../atoms/Card/Card';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  iconColor = 'text-blue-600',
  trend,
  className = '',
}) => {
  return (
    <Card className={`${className}`}>
      <div className="flex items-center">
        {icon && (
          <div className={`p-2 rounded-md ${iconColor} bg-opacity-10 mr-3`}>
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="flex items-center mt-1">
            <div className="text-2xl font-semibold">{value}</div>
            {trend && (
              <div className={`ml-2 text-sm flex items-center ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  {trend.isPositive ? (
                    <polyline points="18 15 12 9 6 15"></polyline>
                  ) : (
                    <polyline points="6 9 12 15 18 9"></polyline>
                  )}
                </svg>
                {trend.value}%
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MetricCard;