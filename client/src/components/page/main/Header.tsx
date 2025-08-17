import Link from 'next/link'
import IsLogin from './IsLogin'
import Image from 'next/image'

interface HeaderProps {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onMyPage: () => void
  onMyFeed: () => void
  onUploadSelfie: () => void  // UPLOAD SELFIE 핸들러 추가
  onAccount: () => void       // ACCOUNT 핸들러 추가
  user?: {
    name?: string
    email?: string
    profileImage?: string
  } | null
}

export default function Header({
  isLoggedIn,
  onLogin,
  onLogout,
  onMyPage,
  onMyFeed,
  onUploadSelfie,  // UPLOAD SELFIE 핸들러
  onAccount,       // ACCOUNT 핸들러
  user,
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 md:mb-16">
      {/* 로고 영역 */}
      <div className="flex items-center gap-3">
        <Image
          src="/link-icon.png"
          alt="Link Icon"
          width={40}
          height={40}
          className="h-8 w-8 md:h-10 md:w-10"
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
        onUploadSelfie={onUploadSelfie}  // UPLOAD SELFIE 핸들러 전달
        onAccount={onAccount}             // ACCOUNT 핸들러 전달
        user={user}
      />
    </div>
  )
}
