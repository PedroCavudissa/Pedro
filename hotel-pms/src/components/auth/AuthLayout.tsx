// src/components/auth/AuthLayout.tsx
import { Outlet } from "react-router-dom";
import { useEffect } from "react";

export default function AuthLayout() {
  useEffect(() => {
    // Limpa apenas os caches de formulário ao entrar em páginas de autenticação
    localStorage.removeItem('hotel_register_cache');
    // Não remove o token de autenticação aqui, senão o logout seria duplicado
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      <Outlet />
    </div>
  );
}