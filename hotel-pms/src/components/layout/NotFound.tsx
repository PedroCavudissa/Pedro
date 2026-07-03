import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Moon, HelpCircle } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  const [baterNaPorta, setBaterNaPorta] = useState(false);
  const [feedback, setFeedback] = useState("O corredor está completamente silencioso...");

  const handleBater = () => {
    setBaterNaPorta(true);
    setFeedback("*Toc Toc*... Nada acontece. Apenas o eco dos seus passos se ouve.");
    setTimeout(() => setBaterNaPorta(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#001326] text-slate-300 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Estrelas sutis ou luzes de emergência de corredor */}
      <div className="absolute top-10 right-10 text-slate-700/40"><Moon size={40} /></div>

      <div className="w-full max-w-md text-center space-y-8 z-10">
        {/* Placa de Número do Quarto Antiga/Sofisticada */}
        <div className="inline-block bg-neutral-900 border-2 border-amber-500/40 rounded-xl px-6 py-4 shadow-2xl">
          <span className="block font-serif text-5xl font-bold text-amber-500 tracking-widest animate-pulse">404</span>
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-slate-400 block mt-1">Quarto Inexistente</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-serif text-white">Perdeu-se nos corredores?</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
             Você jurava que o seu quarto era aqui, mas esta ala do hotel simplesmente não existe no mapa do PEDRO Hotel.
          </p>
        </div>

        {/* CAIXA INTERATIVA INTERNA */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs italic text-slate-400 min-h-[50px] flex items-center justify-center transition-all">
          {feedback}
        </div>

        {/* OPÇÕES DO CORREDOR */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={handleBater}
            disabled={baterNaPorta}
            className="w-full sm:w-auto bg-transparent border border-amber-500/30 hover:border-amber-500 text-amber-500 text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition-all disabled:opacity-40"
          >
            {baterNaPorta ? "A aguardar resposta..." : "Bater à porta"}
          </button>
          
          <button 
            onClick={() => navigate("/")}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/10 inline-flex items-center justify-center gap-2"
          >
            <KeyRound size={14} /> Voltar à Receção
          </button>
        </div>
      </div>

      {/* DETALHE CRIATIVO DE FUNDO */}
      <div className="absolute -bottom-10 opacity-5 flex items-center gap-2 text-white pointer-events-none select-none">
        <HelpCircle size={300} />
      </div>
    </div>
  );
}