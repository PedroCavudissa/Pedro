// src/pages/auth/ResetPasswordPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Hotel, Eye, EyeOff, Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { authApi } from "@/api/services";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Extrair token da URL
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get("token");

    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast.error("Token inválido ou expirado");
      navigate("/forgot-password");
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!password || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword({ token, password });

      setSuccess(true);
      toast.success("Senha alterada com sucesso!");

      // Redirecionar para o login após 3 segundos
      setTimeout(() => {
        navigate("/auth/login");
      }, 3000);

    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      const message = error.response?.data?.message || "Token inválido ou expirado. Solicite um novo link.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Impedir copiar, cortar e colar nos campos de senha
  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && (e.key === 'c' || e.key === 'x' || e.key === 'v')) {
      e.preventDefault();
      toast.error('Não é permitido copiar a senha', { icon: '🔒' });
    }
  };

  const handlePasswordPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast.error('Não é permitido colar a senha', { icon: '🔒' });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#001E3D] mb-2">Senha Alterada!</h2>
          <p className="text-gray-600 mb-6">
            Sua senha foi redefinida com sucesso. Agora pode fazer login com a nova senha.
          </p>
          <Link
            to="/auth/login"
            className="block w-full bg-[#001E3D] hover:bg-[#002d5c] text-white py-3 rounded-xl font-medium transition-colors"
          >
            Ir para o Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-6">
      <div className="w-full max-w-md">
        {/* Botão Voltar */}
        <button
          onClick={() => navigate("/forgot-password")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#001E3D] transition-colors mb-6 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Voltar
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#001E3D] rounded-xl flex items-center justify-center shadow-md">
              <Hotel size={20} className="text-white" />
            </div>
            <div>
              <span className="font-serif text-xl font-bold text-[#001E3D]">Redefinir Senha</span>
              <p className="text-xs text-gray-500">Digite sua nova senha</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nova Senha */}
            <div>
              <label className="block text-xs font-bold text-[#001E3D] uppercase tracking-wider mb-2">
                Nova senha *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-[#001E3D] focus:outline-none focus:ring-4 focus:ring-[#001E3D]/10 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handlePasswordKeyDown}
                  onCopy={handlePasswordPaste}
                  onCut={handlePasswordPaste}
                  onPaste={handlePasswordPaste}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mínimo de 8 caracteres
              </p>
            </div>

            {/* Confirmar Senha */}
            <div>
              <label className="block text-xs font-bold text-[#001E3D] uppercase tracking-wider mb-2">
                Confirmar nova senha *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-[#001E3D] focus:outline-none focus:ring-4 focus:ring-[#001E3D]/10 transition-all"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={handlePasswordKeyDown}
                  onCopy={handlePasswordPaste}
                  onCut={handlePasswordPaste}
                  onPaste={handlePasswordPaste}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botão Submit */}
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-[#001E3D] hover:bg-[#002d5c] text-white py-3 rounded-xl font-medium transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  A redefinir...
                </span>
              ) : (
                "Redefinir senha"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            ⚠️ Este link expira em 15 minutos por segurança.
          </p>
        </div>
      </div>
    </div>
  );
}