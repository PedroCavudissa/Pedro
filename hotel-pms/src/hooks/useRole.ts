import useAuthStore from "@/store/authStore"

type Role = 'ADMIN' | 'RECEPTION' | 'CLIENT'

export function useRole() {
  const { user } = useAuthStore()
  const role = user?.role as Role | undefined

  return {
    role,
    isAdmin:        role === 'ADMIN',
    isReceptionist: role === 'RECEPTION',
    isGuest:        role === 'CLIENT',
    isStaff:        role === 'ADMIN' || role === 'RECEPTION',
    can: (roles: Role[]) => !!role && roles.includes(role),
  }
}
