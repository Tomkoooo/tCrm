import { cn } from '@crm/lib';

interface ContainerProps {
  children?: React.ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return <div className={cn('w-full p-4 md:container md:mx-auto', className)}>{children}</div>;
}
