import IsLogin from "./IsLogin"

interface HeaderProps {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onMyPage: () => void
}

export default function Header({ isLoggedIn, onLogin, onLogout, onMyPage }: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 md:mb-16">
      <div className="flex items-center gap-3">
        <img 
          src="/link-icon.png" 
          alt="로고" 
          className="w-12 h-12 md:w-12 md:h-12 rounded-full object-cover rotate-12"
        />
      </div>

      <IsLogin 
        isLoggedIn={isLoggedIn} 
        onLogin={onLogin} 
        onLogout={onLogout} 
        onMyPage={onMyPage} 
      />
    </div>
  )
}