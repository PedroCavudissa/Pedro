// src/components/layout/MainLayout.tsx
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, Home as HomeIcon, Bed, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import useAuthStore from "@/store/authStore";

export default function MainLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // FECHAR MENU AO MUDAR DE ROTA
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsMenuOpen(false);
  };

  const navLinks = [
    { to: "/", label: "Início", icon: <HomeIcon size={16} /> },
    { to: "/quartos", label: "Quartos", icon: <Bed size={16} /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased">
      {/* Header / Navbar */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled 
            ? "bg-white/80 backdrop-blur-lg shadow-sm border-b border-slate-100 py-3" 
            : "bg-white py-5"
        }`}
      >

<div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
  {/* Logo */}
  <Link to="/" className="flex items-center gap-1.5">
    <span className="text-2xl font-serif font-black text-[#001E3D]">PEDRO</span>
    <span className="text-2xl font-serif font-light text-amber-500">HOTEL</span>
  </Link>

 
  <div className="hidden md:flex items-center bg-slate-100 p-1.5 rounded-full border border-slate-200/60 gap-2">
    {navLinks.map((link) => {
      const isActive = location.pathname === link.to;
      return (
        <Link
          key={link.to}
          to={link.to}
          className={`text-xs font-semibold px-4 py-2 rounded-full uppercase tracking-wider transition-all ${
            isActive ? "bg-white text-amber-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {link.label}
        </Link>
      );
    })}
    
    <div className="h-4 w-[1px] bg-slate-300 mx-1" />

    {user ? (
      <button onClick={handleLogout} className="text-xs font-bold text-red-600 px-4 py-2 uppercase">
        Sair
      </button>
    ) : (
      <Link to="/auth/login" className="text-xs font-bold bg-[#001E3D] text-white px-4 py-2 rounded-full uppercase">
        Entrar
      </Link>
    )}
  </div>
</div>
      </header>

      {/* Mobile Navigation Drawer (Slide-Over Elegante) */}
      <div 
        className={`md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMenuOpen(false)}
      >
        <nav 
          className={`fixed top-0 right-0 bottom-0 w-[280px] bg-white z-50 p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-8 pt-16">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Navegação</p>
            </div>
            
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between p-3 text-base font-medium text-slate-700 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 group-hover:text-amber-500 transition-colors">{link.icon}</span>
                    {link.label}
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-4">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                  <User size={18} className="text-amber-500" />
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                >
                  <LogOut size={16} />
                  Terminar Sessão
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/auth/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center py-3 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  to="/auth/register"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center py-3 text-sm font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 shadow-sm transition-colors"
                >
                  Registar
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 pt-24">
        <Outlet />
      </main>

      {/* Footer Minimalista e Premium */}
      <footer id="footer" className="bg-[#001E3D] text-white py-16 mt-24 border-t-4 border-amber-500">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
            <div className="space-y-4">
              <div className="flex items-center gap-1">
                <span className="text-xl font-serif font-black tracking-wide">PEDRO</span>
                <span className="text-xl font-serif font-light tracking-widest text-amber-500">HOTEL</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Refúgio de luxo requintado, onde o conforto moderno encontra a hospitalidade tradicional angolana.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-amber-500 mb-4">Links Rápidos</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link to="/" className="hover:text-white transition-colors">Início</Link></li>
                <li><Link to="/quartos" className="hover:text-white transition-colors">Nossos Quartos</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-amber-500 mb-4">Contactos</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li className="flex items-center gap-2">📍 Luanda, Angola</li>
                <li className="flex items-center gap-2">📞 +244 946 462 925</li>
                <li className="flex items-center gap-2">✉️ reservas@pedrohotel.com</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-amber-500 mb-4">Políticas</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li>🕒 Check-in: Apartir das 14:00</li>
                <li>🕒 Check-out: 12:00</li>
                <li>🛎️ Recepção disponível 24h</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-xs text-slate-500 tracking-wider">
            &copy; {new Date().getFullYear()} PEDRO HOTEL. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}