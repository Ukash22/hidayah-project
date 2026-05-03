import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const userRole = (user?.role || '').toUpperCase();
  const dashboardPath = user ? (
    userRole === 'ADMIN' ? '/admin' :
      userRole === 'TUTOR' ? '/tutor' :
        userRole === 'PARENT' ? '/parent' :
          '/student'
  ) : '/';

  return (
    <>
      {/* Top Header */}
      <nav className={`fixed w-full z-[100] transition-all duration-300 ${scrolled ? 'glass py-3 shadow-md' : 'bg-transparent py-5'}`}>
        <div className="container flex justify-between items-center px-6">
          <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2 group">
            <img src="/logo.png" alt="Hidayah International" className="w-12 h-12 md:w-16 md:h-16 object-contain group-hover:scale-110 transition-transform" />
            <div className="flex flex-col">
              <span className={`font-black text-lg md:text-xl leading-tight tracking-tighter text-primary`}>HIDAYAH</span>
              <span className="text-[8px] font-black tracking-widest text-secondary uppercase -mt-0.5">International Tutor Platform</span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden md:flex items-center mr-2">
                <NotificationCenter />
              </div>
            )}
            
            {/* Hamburger Button - Visible on all screens */}
            <button 
              onClick={() => setIsOpen(true)} 
              className="p-2.5 rounded-2xl bg-slate-900/5 hover:bg-slate-900/10 transition-all active:scale-90"
              aria-label="Toggle Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="18" x2="20" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] transition-all duration-500 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Drawer */}
      <aside className={`fixed top-0 right-0 h-full w-[300px] md:w-[400px] bg-white z-[201] shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.15)] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col p-8 md:p-12">
          {/* Sidebar Header */}
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-black">H</div>
              <span className="font-black tracking-tighter text-lg">MENU</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl hover:bg-slate-50 transition-colors text-slate-400 hover:text-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-6 overflow-y-auto">
            <Link to="/" onClick={() => setIsOpen(false)} className="group flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-300 group-hover:text-secondary transition-colors italic">01.</span>
              <span className="text-xl font-black text-slate-900 hover:text-secondary transition-colors tracking-tight">Home</span>
            </Link>
            <Link to="/#about" onClick={() => setIsOpen(false)} className="group flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-300 group-hover:text-secondary transition-colors italic">02.</span>
              <span className="text-xl font-black text-slate-900 hover:text-secondary transition-colors tracking-tight">About Hidayah</span>
            </Link>
            <Link to="/#tutors" onClick={() => setIsOpen(false)} className="group flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-300 group-hover:text-secondary transition-colors italic">03.</span>
              <span className="text-xl font-black text-slate-900 hover:text-secondary transition-colors tracking-tight">Our Tutors</span>
            </Link>
            
            {(userRole === 'STUDENT' || userRole === 'ADMIN' || userRole === 'TUTOR') && (
              <>
                <Link to="/exam-practice" onClick={() => setIsOpen(false)} className="group flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-300 group-hover:text-blue-600 transition-colors italic">04.</span>
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-slate-900 hover:text-blue-600 transition-colors tracking-tight">Exam Practice</span>
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">CBT Interface</span>
                  </div>
                </Link>
                <Link to="/ai-hub" onClick={() => setIsOpen(false)} className="group flex items-center gap-4">
                  <span className="text-[10px] font-black text-slate-300 group-hover:text-indigo-600 transition-colors italic">05.</span>
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-slate-900 hover:text-indigo-600 transition-colors tracking-tight">AI Learning Hub</span>
                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Powered by Gemini</span>
                  </div>
                </Link>
              </>
            )}

            <Link to="/tutor/register" onClick={() => setIsOpen(false)} className="group flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-300 group-hover:text-emerald-600 transition-colors italic">06.</span>
              <span className="text-xl font-black text-slate-900 hover:text-emerald-600 transition-colors tracking-tight">Teach with Us</span>
            </Link>
          </div>

          {/* Sidebar Footer (Auth) */}
          <div className="mt-auto pt-10 border-t border-slate-50">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-white font-black shadow-lg shadow-secondary/20">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged in as</p>
                    <p className="font-black text-slate-900 truncate">{user.username}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Link to={dashboardPath} onClick={() => setIsOpen(false)} className="py-4 bg-primary text-white rounded-xl text-center text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all active:scale-95 shadow-lg shadow-primary/20">
                    My Portal
                  </Link>
                  <button onClick={handleLogout} className="py-4 bg-red-50 text-red-600 rounded-xl text-center text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95">
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-6">Join Hidayah International</p>
                <div className="grid grid-cols-2 gap-4">
                  <Link to="/login" onClick={() => setIsOpen(false)} className="py-5 bg-slate-50 text-slate-900 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                    Login
                  </Link>
                  <Link to="/register" onClick={() => setIsOpen(false)} className="py-5 bg-secondary text-white rounded-2xl text-center text-[10px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-secondary/30 transition-all -translate-y-0.5 active:translate-y-0">
                    Free Trial
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
