'use client'

import { useAuth } from '@/hooks/auth'

export default function LogoutButton() {
  const { handleLogout, isLoading } = useAuth()

  return (
    <button 
      onClick={handleLogout}
      disabled={isLoading}
      className="inline-flex h-[44px] px-6 py-2.5 items-center gap-2 rounded-md bg-red-600 text-base font-semibold text-white shadow-inner shadow-white/10 hover:bg-red-700 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? '로그아웃 중...' : 'LOGOUT'}
    </button>
  )
}
