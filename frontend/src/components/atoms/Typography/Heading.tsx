import React from 'react';

export interface HeadingProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
}

const Heading: React.FC<HeadingProps> = ({
  level = 1,
  children,
  className = '',
}) => {
  const baseClasses = 'font-medium';
  
  const sizeClasses = {
    1: 'text-3xl mb-6',
    2: 'text-2xl mb-4',
    3: 'text-xl mb-3',
    4: 'text-lg mb-2',
    5: 'text-base mb-2',
    6: 'text-sm mb-1',
  };
  
  const combinedClasses = `${baseClasses} ${sizeClasses[level]} ${className}`;
  
  switch (level) {
    case 1:
      return <h1 className={combinedClasses}>{children}</h1>;
    case 2:
      return <h2 className={combinedClasses}>{children}</h2>;
    case 3:
      return <h3 className={combinedClasses}>{children}</h3>;
    case 4:
      return <h4 className={combinedClasses}>{children}</h4>;
    case 5:
      return <h5 className={combinedClasses}>{children}</h5>;
    case 6:
      return <h6 className={combinedClasses}>{children}</h6>;
    default:
      return <h1 className={combinedClasses}>{children}</h1>;
  }
};

export default Heading;