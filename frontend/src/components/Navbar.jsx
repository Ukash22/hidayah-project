import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading, logout } = useAuth();
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

  const NavLinks = ({ mobile = false }) => (
    <>
      <Link to="/#about" onClick={() => setIsOpen(false)} className={`font-medium hover:text-secondary transition-colors ${mobile ? 'text-lg py-2' : ''}`}>About</Link>
      <Link to="/#features" onClick={() => setIsOpen(false)} className={`font-medium hover:text-secondary transition-colors flex items-center gap-1 ${mobile ? 'text-lg py-2' : ''}`}>
        Exam Prep
        <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-black rounded-full uppercase">New</span>
      </Link>
      <Link to="/#curriculum" onClick={() => setIsOpen(false)} className={`font-medium hover:text-secondary transition-colors ${mobile ? 'text-lg py-2' : ''}`}>Curriculum</Link>
      {(userRole === 'STUDENT' || userRole === 'ADMIN' || userRole === 'TUTOR') && (
        <>
          <Link to="/exam-practice" onClick={() => setIsOpen(false)} className={`font-medium hover:text-amber-600 transition-colors ${mobile ? 'text-lg py-2' : ''}`}>Exam Practice</Link>
          <Link to="/ai-hub" onClick={() => setIsOpen(false)} className={`font-medium hover:text-amber-600 transition-colors ${mobile ? 'text-lg py-2' : ''}`}>AI Hub</Link>
        </>
      )}
      <Link to="/#tutors" onClick={() => setIsOpen(false)} className={`font-medium hover:text-secondary transition-colors ${mobile ? 'text-lg py-2' : ''}`}>Tutors</Link>
    </>
  );

  return (
    <nav className={`fixed w-full z-[100] transition-all duration-300 ${scrolled || isOpen ? 'glass py-3 shadow-md' : 'bg-transparent py-5'}`}>
      <div className="container flex justify-between items-center px-6">
        <Link to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2 group">
          <img src="/logo.png" alt="Hidayah International" className="w-16 h-16 object-contain group-hover:scale-110 transition-transform" />
          <div className="flex flex-col -gap-1">
            <span className={`font-black text-lg leading-tight tracking-tighter hover:text-secondary transition-colors ${scrolled ? 'text-primary' : 'text-primary'}`}>HIDAYAH</span>
            <span className="text-[8px] font-black tracking-widest text-secondary uppercase -mt-0.5">International Tutor Platform</span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex gap-8 items-center">
          <NavLinks />
          <Link to="/tutor/register" className="font-medium hover:text-secondary transition-colors text-primary border-l pl-4">Teach with Us</Link>

          {user ? (
            <div className="flex items-center gap-4 border-l pl-4 border-slate-200">
              <NotificationCenter />
              <Link to={dashboardPath} className="text-primary font-black uppercase text-[10px] tracking-widest hover:text-secondary transition-colors">Portal</Link>
              <button onClick={handleLogout} className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-red-500 transition-colors">Logout</button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link to="/login" className="font-black uppercase text-[10px] tracking-widest text-primary hover:text-secondary px-4 py-2">Login</Link>
              <Link to="/register" className="btn btn-secondary text-sm">Free Trial</Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-primary p-2">
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-xl shadow-2xl py-10 px-6 animate-fade-in border-t border-slate-100 flex flex-col items-center text-center gap-6 overflow-y-auto max-h-[90vh]">
          <NavLinks mobile />
          <Link to="/tutor/register" onClick={() => setIsOpen(false)} className="font-bold text-primary py-2 text-lg">Teach with Us</Link>
          
          <div className="w-full h-px bg-slate-100 my-4"></div>
          
          {user ? (
            <div className="flex flex-col gap-6 w-full items-center">
              <Link to={dashboardPath} onClick={() => setIsOpen(false)} className="btn btn-primary w-full max-w-xs text-center">My Portal</Link>
              <button onClick={handleLogout} className="text-red-500 font-bold uppercase text-xs tracking-widest">Logout</button>
            </div>
          ) : (
            <div className="flex flex-col gap-6 w-full items-center">
              <Link to="/login" onClick={() => setIsOpen(false)} className="font-bold text-primary text-xl">Login</Link>
              <Link to="/register" onClick={() => setIsOpen(false)} className="btn btn-secondary w-full max-w-xs text-center">Get Free Trial</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
