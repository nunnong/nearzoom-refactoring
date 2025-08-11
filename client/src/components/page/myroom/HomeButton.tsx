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
      className="inline-flex h-[44px] px-6 py-2.5 items-center gap-2 rounded-md bg-gray-700 text-base font-semibold text-white shadow-inner shadow-white/10 hover:bg-gray-600 focus:outline-none transition-colors"
    >
      HOME
    </button>
  )
}
