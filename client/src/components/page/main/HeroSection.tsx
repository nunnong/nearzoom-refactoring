import Image from "next/image"

interface HeroSectionProps {
  isLoggedIn: boolean
  onAfterLoginClick: () => void
}

export default function HeroSection({ isLoggedIn, onAfterLoginClick }: HeroSectionProps) {
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
            onClick={onAfterLoginClick}
            className="cursor-pointer hover:scale-110 transition-all duration-300 relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r rounded-lg blur-md opacity-30 animate-pulse group-hover:opacity-50 transition-opacity"></div>
            <Image
              src="/afterLogin.svg"
              alt="After Login"
              width={200}
              height={100}
              className="max-w-full h-auto relative z-10 drop-shadow-lg"
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