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
      {/* <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"> */}
      <Link
        href="/room-test/test"
        className="ml-20 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-semibold text-white shadow-md transition-transform duration-200 hover:scale-105"
      >
        테스트
      </Link>
      {/* </div> */}

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
