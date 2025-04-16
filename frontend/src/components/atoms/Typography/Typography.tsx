import React from 'react';
import Heading, { HeadingProps } from './Heading';
import Text, { TextProps } from './Text';

export interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'caption' | 'small';
  children: React.ReactNode;
  className?: string;
}

const Typography: React.FC<TypographyProps> = ({
  variant = 'p',
  children,
  className = '',
}) => {
  // Heading variants
  if (variant.startsWith('h')) {
    const level = parseInt(variant.substring(1)) as HeadingProps['level'];
    return <Heading level={level} className={className}>{children}</Heading>;
  }
  
  // Text variants
  if (variant === 'p') {
    return <Text variant="body" className={className}>{children}</Text>;
  }
  
  if (variant === 'caption' || variant === 'small') {
    return <Text variant={variant} className={className}>{children}</Text>;
  }
  
  // Default fallback
  return <Text variant="body" className={className}>{children}</Text>;
};

export default Typography;