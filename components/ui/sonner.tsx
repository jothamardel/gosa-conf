'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={(theme as ToasterProps['theme']) || 'dark'}
      className="toaster group"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast bg-slate-900 text-slate-100 border border-slate-800 shadow-2xl rounded-2xl p-4 text-sm font-medium',
          description: 'text-slate-400 text-xs mt-1',
          actionButton:
            'bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-xs',
          cancelButton:
            'bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs',
          title: 'text-white font-bold text-sm',
          success: '!bg-emerald-950 !text-emerald-100 !border-emerald-800',
          error: '!bg-rose-950 !text-rose-100 !border-rose-800',
          info: '!bg-sky-950 !text-sky-100 !border-sky-800',
          warning: '!bg-amber-950 !text-amber-100 !border-amber-800',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
