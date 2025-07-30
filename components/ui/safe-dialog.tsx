"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SafeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  trigger?: React.ReactNode;
}

export function SafeDialog({ open, onOpenChange, children, trigger }: SafeDialogProps) {
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    onOpenChange(newOpen);
    
    // 当Dialog关闭时，确保清理body的pointer-events
    if (!newOpen) {
      // 立即清理
      document.body.style.pointerEvents = 'auto';
      
      // 延迟再次清理，确保Radix UI的清理完成
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 50);
      
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 100);
    }
  }, [onOpenChange]);

  // 监听body的pointer-events变化
  React.useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target as HTMLElement;
          if (target === document.body && target.style.pointerEvents === 'none') {
            // 如果body被设置为pointer-events: none，立即恢复
            setTimeout(() => {
              document.body.style.pointerEvents = 'auto';
            }, 0);
          }
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style']
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {children}
    </Dialog>
  );
}

export { DialogContent, DialogHeader, DialogTitle }; 