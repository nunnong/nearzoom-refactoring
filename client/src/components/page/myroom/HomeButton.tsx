'use client'
import { useRouter } from 'next/navigation'

export default function HomeButton() {
  const router = useRouter()

  const handleHomeClick = () => {
    router.push('/')
  }

  return (
    <button 
      onClick={handleHomeClick}
      className="inline-flex h-[32px] px-4 py-1.5 items-center gap-2 rounded-md bg-gray-700 text-sm font-semibold text-white shadow-inner shadow-white/10 hover:bg-gray-600 focus:outline-none transition-colors"
    >
      HOME
    </button>
  )
}
