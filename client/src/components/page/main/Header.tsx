import IsLogin from "./IsLogin"
import Image from "next/image"

interface HeaderProps {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onMyPage: () => void
  onMyFeed: () => void
  user?: {
    name?: string
    email?: string
    profileImage?: string
  } | null
}

export default function Header({ isLoggedIn, onLogin, onLogout, onMyPage, onMyFeed, user }: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 md:mb-16">
      {/* 로고 영역 */}
      <div className="flex items-center gap-3">
        <Image
          src="/link-icon.png"
          alt="Link Icon"
          width={40}
          height={40}
          className="w-8 h-8 md:w-10 md:h-10"
        />
        {/* NEARZOOM 로고 텍스트 - Didot 폰트 */}
        <h1 className="text-xl md:text-2xl font-bold text-black didot-font">
          NEARZOOM
        </h1>
      </div>

      {/* 로그인 영역 */}
      <IsLogin 
        isLoggedIn={isLoggedIn} 
        onLogin={onLogin} 
        onLogout={onLogout} 
        onMyPage={onMyPage} 
        onMyFeed={onMyFeed}
        user={user}
      />
    </div>
  )
}