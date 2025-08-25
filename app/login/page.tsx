"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { EmojiIcons } from '@/components/emoji-icons';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // 保存用户信息到localStorage
        localStorage.setItem('currentUser', JSON.stringify(data.data.user));
        
        toast({
          title: '登录成功',
          description: `欢迎回来，${data.data.user.name}！`,
        });
        
        // 重定向到销售页面
        router.push('/sales');
      } else {
        setError(data.message || '登录失败，请检查用户名和密码');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">{EmojiIcons.Shop}</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            店铺管理系统
          </CardTitle>
          <CardDescription className="text-gray-600">
            请登录您的店铺账户
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>
            
            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || !username || !password}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>登录中...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>{EmojiIcons.Login}</span>
                  <span>登录</span>
                </div>
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              演示账户：
            </p>
            <div className="mt-2 space-y-1 text-xs text-gray-500">
              <p>店铺A：admin / admin123</p>
              <p>店铺B：storeb / storeb123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
