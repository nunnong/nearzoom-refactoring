import Link from 'next/link'
import IsLogin from './IsLogin'
import Image from 'next/image'

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

export default function Header({
  isLoggedIn,
  onLogin,
  onLogout,
  onMyPage,
  onMyFeed,
  user,
}: HeaderProps) {
  return (
    <div className="mb-8 flex items-center justify-between md:mb-16">
      <div className="flex items-center gap-3">
        <Image
          src="/link-icon.png"
          alt="Link Icon"
          width={40}
          height={40}
          className="h-8 w-8 md:h-10 md:w-10"
        />
      </div>

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
