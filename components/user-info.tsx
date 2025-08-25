"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { EmojiIcons } from '@/components/emoji-icons';
import { AuthUser } from '@/lib/types';

export default function UserInfo() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // 从localStorage获取用户信息（登录时保存的）
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('解析用户数据失败:', error);
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        // 清除本地存储的用户信息
        localStorage.removeItem('currentUser');
        setUser(null);
        
        toast({
          title: '登出成功',
          description: '您已成功登出系统',
        });
        
        // 重定向到登录页面
        router.push('/login');
      } else {
        throw new Error('登出失败');
      }
    } catch (error) {
      toast({
        title: '登出失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
        <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium">{user.name}</p>
            <p className="w-[200px] truncate text-sm text-muted-foreground">
              {user.email || '无邮箱'}
            </p>
            <p className="text-xs text-muted-foreground">
              {user.store.displayName} - {user.role === 'ADMIN' ? '管理员' : user.role === 'USER' ? '用户' : '只读用户'}
            </p>
          </div>
        </div>
        
        <div className="border-t border-border p-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>{EmojiIcons.shop}</span>
            <span>店铺：{user.store.displayName}</span>
          </div>
        </div>
        
        <div className="border-t border-border">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleLogout}
          >
            <span className="mr-2">{EmojiIcons.logout}</span>
            登出
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
