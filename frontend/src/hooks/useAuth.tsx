import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { LoginResult, MeResult } from '../types/api'

interface AuthContextValue {
  user: MeResult['user'] | null
  role: MeResult['role'] | null
  businessId: string | null
  branchId: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  refetch: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<MeResult>('/auth/me'),
    retry: false,
    staleTime: 60_000,
  })

  const loginMutation = useMutation({
    mutationFn: (creds: { email: string; password: string }) => api.post<LoginResult>('/auth/login', creds),
    onSuccess: (result) => {
      queryClient.setQueryData(['me'], {
        user: result.user,
        businessId: result.businessId,
        role: result.role,
        branchId: result.branchId,
      } satisfies MeResult)
      queryClient.invalidateQueries()
    },
  })

  const login = useCallback(
    async (email: string, password: string) => {
      return loginMutation.mutateAsync({ email, password })
    },
    [loginMutation],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      queryClient.clear()
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(() => {
    const data = meQuery.data ?? null
    return {
      user: data?.user ?? null,
      role: data?.role ?? null,
      businessId: data?.businessId ?? null,
      branchId: data?.branchId ?? null,
      isLoading: meQuery.isLoading,
      isAuthenticated: Boolean(data),
      login,
      logout,
      refetch: () => {
        void meQuery.refetch()
      },
    }
  }, [meQuery.data, meQuery.isLoading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
