import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../api/apiClient';
import { Cloud, Lock, User, ArrowRight, Server } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Dynamic Version State
  const [serverVersion, setServerVersion] = useState('Connecting...');

  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;

  useEffect(() => {
    // Check if already logged in
    if (localStorage.getItem('access_token')) {
      navigate('/');
    }
    
    // Fetch Server Version dynamically
    api.get('/server-info')
      .then(res => setServerVersion(`v${res.data.version}`))
      .catch(() => setServerVersion('Older than V1.5.0 [Please Update to latest virsion]'));
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', null, {
        params: {
          username,
          password,
          device_uid: 'web-browser',
          device_name: 'Web Portal'
        }
      });
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to login. Check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-50">
      
      {/* 💥 LEFT SIDE - FEATURING YOUR LOGO 💥 */}
      <div className="hidden lg:flex w-1/2 bg-blue-600 items-center justify-center relative overflow-hidden">
        {/* Soft glowing background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-800 opacity-90"></div>
        
        {/* Animated ambient blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        
        <div className="z-10 flex flex-col items-center">
          {/* Your custom uploaded logo */}
          <img src="/logo.png" alt="PhotoSync Logo" className="w-64 h-64 object-contain drop-shadow-2xl mb-8" />
          
          <h1 className="text-5xl font-bold text-white tracking-tight">PhotoSync</h1>
          <p className="text-blue-100 mt-4 text-lg font-medium">Your private media ecosystem.</p>
        </div>
      </div>

      {/* RIGHT SIDE - LOGIN FORM */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-12 lg:p-24 relative">
        <div className="max-w-md w-full space-y-8">
          
          <div className="text-center lg:text-left">
            <div className="lg:hidden w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/30">
              <Cloud size={32} className="text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="mt-2 text-sm text-slate-500">Sign in to access your media library</p>
          </div>

          {successMessage && (
            <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
              {successMessage}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={20} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={20} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-blue-600/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={18} /></>
              )}
            </button>

            <p className="text-center text-sm text-slate-500 font-medium mt-6">
              Need an account?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-500 hover:underline transition-colors">
                Create one now
              </Link>
            </p>
          </form>
        </div>
        
        <div className="absolute bottom-8 text-center text-xs text-slate-400 font-medium flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <Server size={12} className={serverVersion === 'Offline' ? 'text-red-500' : 'text-emerald-500'} />
          Running PhotoSync {serverVersion}
        </div>

      </div>
    </div>
  );
}