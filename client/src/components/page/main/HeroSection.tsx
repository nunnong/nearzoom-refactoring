import Image from "next/image"

interface HeroSectionProps {
  isLoggedIn: boolean
  onAfterLoginClick: () => void
  isCreatingRoom?: boolean // 방 생성 중 여부
}

export default function HeroSection({ isLoggedIn, onAfterLoginClick, isCreatingRoom = false }: HeroSectionProps) {
  return (
    <>
      <div className="mb-4 md:mb-8 text-center">
        <Image
          src="/creative.png"
          alt="Creative"
          width={1400}
          height={179}
          className="mx-auto max-w-full h-auto"
        />
      </div>

      <div className="flex justify-center mb-8 md:mb-12">
        {isLoggedIn ? (
          <div
            onClick={isCreatingRoom ? undefined : onAfterLoginClick} // 로딩 중엔 클릭 비활성화
            className={`cursor-pointer hover:scale-110 transition-all duration-300 relative group ${
              isCreatingRoom ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg blur-md opacity-40 animate-pulse group-hover:opacity-60 transition-opacity"></div>
            <div className="absolute inset-0 bg-white rounded-lg blur-sm opacity-20 animate-ping"></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg opacity-30 blur-lg animate-pulse group-hover:animate-bounce"></div>
            <Image
              src="/afterLogin.svg"
              alt="After Login"
              width={200}
              height={100}
              className="max-w-full h-auto relative z-10 drop-shadow-2xl animate-pulse group-hover:animate-none"
            />
          </div>
        ) : (
          <Image
            src="/beforeLogin.svg"
            alt="Before Login"
            width={724}
            height={158}
            className="max-w-full h-auto"
          />
        )}
      </div>
    </>
  )
}