import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageSpinner } from '@/components/ui'
import { Save, AlertCircle, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/api/client'
import useAuthStore from '@/store/authStore' // Importação do seu store de autenticação

interface Settings {
  id: string
  paymentHoldMinutes: number
  cancellationFeePercent: number
  minCancellationFee: number
  lateCheckoutGraceMinutes: number
  lateCheckoutHourlyFee: number
  earlyCheckoutRefundPercent: number
  updatedAt: string
}

export default function PaymentSettingsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore() // Obtendo o usuário logado

  // Regra de permissão: Apenas ADMIN pode alterar. RECEPTION (Recepcionista) apenas visualiza.
  const isAdmin = user?.role === 'ADMIN'

  const [form, setForm] = useState<Partial<Settings>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: settings, isLoading } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const response = await api.get('/policies')
      return response.data as Settings
    }
  })

  // Sincroniza o estado do formulário quando os dados chegam da API
  useEffect(() => {
    if (settings) {
      setForm(settings)
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      // Ajustado de PUT para PATCH conforme especificado na sua documentação da API
      const response = await api.patch('/policies', data)
      return response.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-settings'] })
      toast.success('Configurações atualizadas com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message ?? 'Erro ao atualizar configurações')
    },
  })

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (form.paymentHoldMinutes && form.paymentHoldMinutes < 0) {
      newErrors.paymentHoldMinutes = 'Valor não pode ser negativo'
    }
    if (form.cancellationFeePercent && (form.cancellationFeePercent < 0 || form.cancellationFeePercent > 100)) {
      newErrors.cancellationFeePercent = 'Percentual deve estar entre 0 e 100'
    }
    if (form.minCancellationFee && form.minCancellationFee < 0) {
      newErrors.minCancellationFee = 'Valor não pode ser negativo'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem alterar as configurações.')
      return
    }
    if (validateForm()) {
      updateMutation.mutate(form)
    }
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-6 p-6">


      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Configurações de Pagamento</h1>
          <p className="text-sm text-stone-500 mt-1">Gerencie as regras de cancelamento e check-out</p>
        </div>

        {/* O botão só renderiza ou fica ativo se for Admin */}
        {isAdmin && (
          <button
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Save size={18} />
            {updateMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Minutos para retenção de pagamento
              </label>
              <input
                type="number"
                readOnly={!isAdmin}
                className={`w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${!isAdmin ? 'bg-stone-50 text-stone-500 cursor-not-allowed select-none' : ''}`}
                value={form.paymentHoldMinutes ?? ''}
                onChange={e => setForm({ ...form, paymentHoldMinutes: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-stone-400 mt-1">Tempo de espera antes de reter o pagamento</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Percentual de taxa de cancelamento (%)
              </label>
              <input
                type="number"
                step="0.1"
                readOnly={!isAdmin}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.cancellationFeePercent ? 'border-red-500' : 'border-stone-300'} ${!isAdmin ? 'bg-stone-50 text-stone-500 cursor-not-allowed select-none' : ''}`}
                value={form.cancellationFeePercent ?? ''}
                onChange={e => setForm({ ...form, cancellationFeePercent: parseFloat(e.target.value) || 0 })}
              />
              {errors.cancellationFeePercent && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.cancellationFeePercent}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Taxa mínima de cancelamento (KZS)
              </label>
              <input
                type="number"
                readOnly={!isAdmin}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.minCancellationFee ? 'border-red-500' : 'border-stone-300'} ${!isAdmin ? 'bg-stone-50 text-stone-500 cursor-not-allowed select-none' : ''}`}
                value={form.minCancellationFee ?? ''}
                onChange={e => setForm({ ...form, minCancellationFee: parseInt(e.target.value) || 0 })}
              />
              {errors.minCancellationFee && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.minCancellationFee}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Minutos de tolerância para late check-out
              </label>
              <input
                type="number"
                readOnly={!isAdmin}
                className={`w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${!isAdmin ? 'bg-stone-50 text-stone-500 cursor-not-allowed select-none' : ''}`}
                value={form.lateCheckoutGraceMinutes ?? ''}
                onChange={e => setForm({ ...form, lateCheckoutGraceMinutes: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Taxa horária para late check-out (KZS)
              </label>
              <input
                type="number"
                readOnly={!isAdmin}
                className={`w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${!isAdmin ? 'bg-stone-50 text-stone-500 cursor-not-allowed select-none' : ''}`}
                value={form.lateCheckoutHourlyFee ?? ''}
                onChange={e => setForm({ ...form, lateCheckoutHourlyFee: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Percentual de reembolso para early check-out (%)
              </label>
              <input
                type="number"
                step="0.1"
                readOnly={!isAdmin}
                className={`w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${!isAdmin ? 'bg-stone-50 text-stone-500 cursor-not-allowed select-none' : ''}`}
                value={form.earlyCheckoutRefundPercent ?? ''}
                onChange={e => setForm({ ...form, earlyCheckoutRefundPercent: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-stone-400">
              Última atualização: {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleDateString('pt-BR') : 'Nunca'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}