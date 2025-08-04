'use client'

export default function LogoutButton() {
  const handleLogout = () => {
    // TODO: 로그아웃 로직 구현
    console.log('Logout clicked')
    // 예: localStorage 클리어, 세션 종료, 로그인 페이지로 리다이렉트 등
  }

  return (
    <button 
      onClick={handleLogout}
      className="inline-flex h-[32px] px-4 py-1.5 items-center gap-2 rounded-md bg-red-600 text-sm font-semibold text-white shadow-inner shadow-white/10 hover:bg-red-700 focus:outline-none transition-colors"
    >
      LOGOUT
    </button>
  )
}
