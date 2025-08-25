import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth-session');
  
  if (authCookie?.value) {
    try {
      const session = JSON.parse(authCookie.value);
      const expires = new Date(session.expires);
      
      if (expires > new Date()) {
        // 用户已登录且会话有效，重定向到销售页面
        redirect('/sales');
      }
    } catch {
      // Cookie解析失败，重定向到登录页面
    }
  }
  
  // 用户未登录或会话已过期，重定向到登录页面
  redirect('/login');
}