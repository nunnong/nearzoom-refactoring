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
        <div className="w-6 h-6 md:w-8 md:h-8 bg-black rounded-full relative overflow-hidden">
          <div className="absolute left-0 top-0 w-1/2 h-full bg-black"></div>
        </div>
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