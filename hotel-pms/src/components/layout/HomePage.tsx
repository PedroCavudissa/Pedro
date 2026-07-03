// src/pages/public/Home.tsx
import { Link } from "react-router-dom";
import { ShieldCheck, Wifi, Coffee, Sparkles, Users, MapPin, Ticket } from "lucide-react";
import { useState, useEffect } from "react";
import { roomsApi } from "@/api/services";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

interface Room {
  id: string;
  number: string;
  type: string;
  title: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  floor: number | null;
  imageUrl: string;
  state: string;
  maintenance: string;
  inspection: string;
  amenities: any[];
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const navigate = useNavigate();
  const [featuredRooms, setFeaturedRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
localStorage.clear() 
  useEffect(() => {
    fetchFeaturedRooms();
  }, []);

  const fetchFeaturedRooms = async () => {
    try {
      setLoading(true);
      const response = await roomsApi.list();
      
      console.log('Resposta da API:', response.data);
      
      let roomsData: Room[] = [];
      if (Array.isArray(response.data)) {
        roomsData = response.data;
     
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        roomsData = response.data.data;
      } else if (response.data?.content && Array.isArray(response.data.content)) {
        roomsData = response.data.content;
      }
      
      console.log('Todos os quartos:', roomsData);
      
      // FILTRA APENAS QUARTOS COM STATE = VACANT_CLEAN
      const availableRooms = roomsData.filter(room => room.state === 'VACANT_CLEAN');
      
    
      
      // LIMITA A APENAS 3 QUARTOS
      setFeaturedRooms(availableRooms.slice(0, 3));
    } catch (error) {
      console.error("Erro ao buscar quartos:", error);
      toast.error("Erro ao carregar quartos em destaque");
      setFeaturedRooms([]);
    } finally {
      setLoading(false);
    }
  };

  // Função para lidar com o clique em "Reservar"
  const handleReserveClick = (room: Room) => {
    localStorage.setItem('selectedRoom', JSON.stringify({
      id: room.id,
      number: room.number,
      type: room.type,
      title: room.title,
      pricePerNight: room.pricePerNight,
      capacity: room.capacity,
      imageUrl: room.imageUrl
    }));
    
    navigate('/auth/login', { 
      state: { 
        fromReservation: true,
        roomId: room.id,
        roomNumber: room.number,
        roomPrice: room.pricePerNight
      } 
    });
  };

  // Função para formatar preço
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price).replace('AOA', 'Kz');
  };

  // Função para obter imagem válida
const getValidImageUrl = (room: Room) => {
  if (room.imageUrl && room.imageUrl !== 'string') {
    if (room.imageUrl.startsWith('http')) {
      return room.imageUrl;
    }
    const API_URL = import.meta.env.VITE_API_URL || 'http://10.10.0.4:9090';
    return `${API_URL}/uploads/${room.imageUrl}`;
  }
  return `https://placehold.co/600x400/001E3D/white?text=Quarto+${room.number}`;
};

  if (loading) {
    return (
      <div className="space-y-16 pb-20">
        {/* HERO SECTION */}
        <section className="bg-[#001E3D] text-white px-6 py-24 md:py-32 border-b border-white/5 text-center md:text-left">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
            <div className="space-y-6 md:col-span-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest bg-white/5 border border-white/10 text-amber-500 uppercase">
                ✨ Estadias Inesquecíveis
              </span>
              <h1 className="text-4xl md:text-6xl font-serif font-medium tracking-tight leading-tight">
                Onde cada estadia se torna <span className="italic text-amber-500 font-normal">memorável.</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-lg leading-relaxed">
                Quartos meticulosamente desenhados, serviço impecável e uma reserva simples como deve ser. Bem-vindo ao PEDRO HOTEL.
              </p>
              <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 pt-2">
                <Link to="/quartos" className="bg-amber-500 text-slate-900 px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/10 hover:bg-amber-400 transition-all">
                  Ver quartos disponíveis →
                </Link>
                <Link to="/auth/register" className="border border-white/20 hover:bg-white/5 px-6 py-3.5 rounded-xl text-sm font-bold transition-all">
                  Criar conta
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* COMODIDADES - Skeleton */}
        <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 rounded-xl mb-3" />
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-full" />
            </div>
          ))}
        </section>

        {/* QUARTOS - Skeleton */}
        <section className="max-w-7xl mx-auto px-6 space-y-8">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-amber-600 font-bold text-[10px] uppercase tracking-widest">Selecionados</span>
              <h2 className="text-2xl md:text-3xl font-serif text-slate-900">Quartos em destaque</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-slate-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-5 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-16 pb-20">
      {/* HERO SECTION */}
      <section className="bg-[#001E3D] text-white px-6 py-24 md:py-32 border-b border-white/5 text-center md:text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
          <div className="space-y-6 md:col-span-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-widest bg-white/5 border border-white/10 text-amber-500 uppercase">
              ✨ Estadias Inesquecíveis
            </span>
            <h1 className="text-4xl md:text-6xl font-serif font-medium tracking-tight leading-tight">
              Onde cada estadia se torna <span className="italic text-amber-500 font-normal">memorável.</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-lg leading-relaxed">
              Quartos meticulosamente desenhados, serviço impecável e uma reserva simples como deve ser. Bem-vindo ao PEDRO HOTEL.
            </p>
            <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 pt-2">
              <Link to="/quartos" className="bg-amber-500 text-slate-900 px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-amber-500/10 hover:bg-amber-400 transition-all">
                Ver quartos disponíveis →
              </Link>
              <Link to="/auth/register" className="border border-white/20 hover:bg-white/5 px-6 py-3.5 rounded-xl text-sm font-bold transition-all">
                Criar conta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* COMODIDADES */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: <ShieldCheck size={20} />, title: "Atendimento 24h", text: "Equipa dedicada sempre disponível." },
          { icon: <Wifi size={20} />, title: "Wi-Fi premium", text: "Conectividade ultra-rápida em todo o hotel." },
          { icon: <Ticket size={20} />, title: "Sistema de Reporte", text: "Intereção para resolver problemas." },
          { icon: <Sparkles size={20} />, title: "Limpeza diária", text: "Padrões hoteleiros de excelência." }
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <div className="text-amber-600 bg-amber-50 w-10 h-10 rounded-xl flex items-center justify-center">
              {item.icon}
            </div>
            <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{item.text}</p>
          </div>
        ))}
      </section>

      {/* QUARTOS EM DESTAQUE - MÁXIMO 3 E APENAS VACANT_CLEAN */}
      <section className="max-w-7xl mx-auto px-6 space-y-8">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-amber-600 font-bold text-[10px] uppercase tracking-widest">Selecionados</span>
            <h2 className="text-2xl md:text-3xl font-serif text-slate-900">Quartos em destaque</h2>
          </div>
          <Link to="/quartos" className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">
            Ver todos →
          </Link>
        </div>

        {featuredRooms.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl">
            <p className="text-slate-500 font-medium">Nenhum quarto disponível no momento.</p>
            <p className="text-slate-400 text-sm mt-1">Volte mais tarde para ver novas disponibilidades.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredRooms.map((room) => (
              <div key={room.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between group hover:shadow-md transition-shadow">
                <div className="relative">
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img 
                      src={getValidImageUrl(room)} 
                      alt={room.title || room.type} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-amber-100/90 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide backdrop-blur-xs border border-amber-200/30">
                      {room.type}
                    </span>
                    <span className="bg-green-100/90 text-green-800 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide backdrop-blur-xs border border-green-200/30">
                      Disponível
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Users size={12} />
                      <span>{room.capacity} {room.capacity === 1 ? 'hóspede' : 'hóspedes'}</span>
                      <span className="mx-1">•</span>
                      <span>Nº {room.number}</span>
                    </div>
                  </div>
                  <h3 className="font-serif font-semibold text-slate-800 text-lg">{room.title || room.type}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{room.description}</p>
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-serif font-bold text-[#001E3D]">{formatPrice(room.pricePerNight)}</span>
                      <span className="text-[10px] text-slate-400">/noite</span>
                    </div>
                    <div className="flex gap-2">
                      <Link 
                        to={`/quartos`} 
                        className="text-amber-600 hover:text-amber-700 text-xs font-medium transition-colors"
                      >
                        Ver mais →
                      </Link>

                      <button 
                        onClick={() => handleReserveClick(room)}
                        className="bg-[#001E3D] hover:bg-[#002d5c] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Reservar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}