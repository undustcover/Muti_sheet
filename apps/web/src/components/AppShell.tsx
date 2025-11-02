import { useEffect, useState } from 'react';
import Login from './Login';
import App from '../App';
import { authBootstrap, getUser, getToken, logout } from '../services/auth';
import HomePage from '../pages/HomePage';
import { parseRoute, navigateTo, type Route } from '../router';
import RegisterPage from '../pages/RegisterPage';
import InviteRegisterPage from '../pages/InviteRegisterPage';
import AdminPage from '../pages/AdminPage';

export default function AppShell() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [route, setRoute] = useState<Route>(parseRoute(window.location.pathname));

  useEffect(() => {
    let mounted = true;
    (async () => {
      await authBootstrap();
      if (!mounted) return;
      const token = getToken();
      const user = getUser();
      setAuthed(!!token && !!user);
      setReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // 监听认证变化，强制刷新登录状态
  useEffect(() => {
    const onAuthChanged = () => {
      const token = getToken();
      const user = getUser();
      setAuthed(!!token && !!user);
      // 若当前在受保护页面但认证已失效，跳转到首页以显示登录
      if (!token || !user) navigateTo('/');
    };
    window.addEventListener('auth:changed', onAuthChanged);
    return () => window.removeEventListener('auth:changed', onAuthChanged);
  }, []);

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div>加载中...</div>
      </div>
    );
  }

  if (!authed) {
    if (route.name === 'register') return <RegisterPage />;
    if (route.name === 'invite') return <InviteRegisterPage token={route.token} />;
    return <Login onSuccess={() => {
      setAuthed(true);
      if (window.location.pathname === '/' || window.location.pathname === '') {
        navigateTo('/home');
      }
    }} />;
  }
  const logoutBtn = (
    <div style={{ position: 'fixed', top: 8, right: 8, zIndex: 1000 }}>
      <button
        onClick={async () => { await logout(); navigateTo('/'); }}
        style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
        title="退出登录"
      >退出登录</button>
    </div>
  );

  let page: JSX.Element;
  if (route.name === 'home') {
    page = <HomePage onOpenTable={(id) => navigateTo(id ? `/table/${id}` : '/table')} />;
  } else if (route.name === 'table') {
    if (!route.tableId) {
      navigateTo('/home');
      page = <HomePage onOpenTable={(id) => navigateTo(id ? `/table/${id}` : '/table')} />;
    } else {
      page = <App initialTableId={route.tableId} />;
    }
  } else if (route.name === 'admin') {
    page = <AdminPage />;
  } else {
    page = <HomePage onOpenTable={(id) => navigateTo(id ? `/table/${id}` : '/table')} />;
  }
  return (<>{logoutBtn}{page}</>);
}