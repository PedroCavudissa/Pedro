// src/pages/public/Contacto.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function Contacto() {
  const location = useLocation();

  useEffect(() => {
    // Verifica se veio com hash #footer
    if (location.hash === '#footer') {
      const footer = document.getElementById('footer');
      if (footer) {
        footer.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Rolar para o topo da página
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Contacto</h1>
      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-semibold mb-4">Informações de Contacto</h2>
          <p className="text-slate-600 mb-2">📍 Luanda, Angola</p>
          <p className="text-slate-600 mb-2">📞 +244 900 000 000</p>
          <p className="text-slate-600 mb-2">✉️ reservas@pedrohotel.com</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Horário de Funcionamento</h2>
          <p className="text-slate-600 mb-2">Recepção: 24 horas</p>
          <p className="text-slate-600 mb-2">Check-in: 14:00</p>
          <p className="text-slate-600 mb-2">Check-out: 12:00</p>
        </div>
      </div>
    </div>
  );
}