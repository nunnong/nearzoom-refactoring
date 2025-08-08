"use client"

interface AuthButtonsProps {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onMyPage: () => void
}

export default function AuthButtons({ isLoggedIn, onLogin, onLogout, onMyPage }: AuthButtonsProps) {
  return (
    <div className="flex items-center gap-3">
      {isLoggedIn ? (
        <>
          {/* MYPAGE Button */}
          <button
            onClick={onMyPage}
            className="inline-flex h-[40px] items-center gap-2 rounded-md bg-gray-700 px-6 py-2 text-base font-semibold text-white shadow-inner shadow-white/10 transition-colors hover:bg-gray-600 focus:outline-none"
          >
            MY ROOM
          </button>

          {/* LOGOUT Button */}
          <button
            onClick={onLogout}
            className="inline-flex h-[40px] items-center gap-2 rounded-md bg-gray-700 px-6 py-2 text-base font-semibold text-white shadow-inner shadow-white/10 transition-colors hover:bg-gray-600 focus:outline-none"
          >
            LOGOUT
          </button>
        </>
      ) : (
        <>
          {/* LOGIN Button */}
          <button
            onClick={onLogin}
            className="inline-flex h-[40px] items-center gap-2 rounded-md bg-gray-700 px-6 py-2 text-base font-semibold text-white shadow-inner shadow-white/10 transition-colors hover:bg-gray-600 focus:outline-none"
          >
            LOGIN
          </button>
        </>
      )}
    </div>
  )
}
