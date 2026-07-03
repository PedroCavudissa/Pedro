import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import { RequireAuth, RequireRole, RequireGuest } from '@/components/auth/ProtectedRoute'
import { PageSpinner } from '@/components/ui'
import MainLayout from './components/layout/MainLayout'
import AuthLayout from './components/auth/AuthLayout'

const LoginPage          = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage       = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const DashboardPage      = lazy(() => import('@/pages/dashboard/DashboardPage'))
const RoomsPage          = lazy(() => import('@/pages/rooms/RoomsPage'))
const ReservationsPage   = lazy(() => import('@/pages/reservations/ReservationsPage'))
const TicketsPage        = lazy(() => import('@/pages/tickets/TicketsPage'))
const PoliciesPage       = lazy(() => import('@/pages/policies/PoliciesPage'))
const ReportsPage        = lazy(() => import('@/pages/reports/ReportsPage'))
const UsersPage          = lazy(() => import('@/pages/users/UsersPage'))
const ProfilePage        = lazy(() => import('@/pages/profile/ProfilePage'))
const HomePage           = lazy(() => import('@/components/layout/HomePage'))
const Quartos            = lazy(() => import('@/components/layout/Catalog'))
const Contacto           = lazy(() => import('@/components/layout/Contacto'))
const VerifyEmailPage    = lazy(() => import('@/pages/auth/VerifyEmailPage'))
const ForgotPassword   = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const NotFound            = lazy(() => import('@/components/layout/NotFound'))
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-stone-50"><PageSpinner /></div>}>
          <Routes>
            {/* Rotas públicas COM menu (header + footer) - Acessíveis sem login */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/quartos" element={<Quartos />} />
              <Route path="/contacto" element={<Contacto />} />
            
            </Route>

            {/* Rotas de autenticação SEM menu - Acessíveis sem login */}
            <Route element={<AuthLayout />}>
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
              <Route path="/reset-password" element={<ForgotPassword />} />
            </Route>

            {/* Rotas protegidas (requerem autenticação) */}
            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                 <Route element={<RequireRole roles={['ADMIN']} />}>
                        <Route path="/dashboard"    element={<DashboardPage />} />
                 </Route>
        
                <Route element={<RequireRole roles={['ADMIN', 'RECEPTION', 'CLIENT']} />}>
                 
                  <Route path="/reservations" element={<ReservationsPage />} />
                  <Route path="/tickets"      element={<TicketsPage />} />
                  <Route path="/policies"     element={<PoliciesPage />} />
                  <Route path="/profile"      element={<ProfilePage />} />
                      <Route path="/cliente/quartos" element={<Quartos />} />
                </Route>
                <Route element={<RequireRole roles={['ADMIN', 'RECEPTION']} />}>
                  <Route path="/rooms" element={<RoomsPage />} />
                </Route>
                <Route element={<RequireRole roles={['ADMIN']} />}>
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/users"   element={<UsersPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '12px', boxShadow: '0 4px 24px -2px rgba(0,0,0,0.12)' },
        }}
      />
    </QueryClientProvider>
  )
}