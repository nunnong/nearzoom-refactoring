'use client'

import { useAuth } from '@/hooks/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import AboutUsSection from './AboutUsSection'
import Footer from './Footer'

// 이미지 데이터
const images = [
  { src: '/friends.png', alt: 'Friends with colorful sunglasses' },
  { src: '/family.png', alt: 'Family walking on beach' },
  { src: '/couple.png', alt: 'Couple silhouette making heart shape' },
  { src: '/celebrate.png', alt: 'Celebration group' },
  { src: '/parents.png', alt: 'Parents with kids' },
]

// 햄버거 메뉴만 담당하는 컴포넌트
function HamburgerMenuComponent({
  isLoggedIn,
  onUploadSelfie,
  onLogout,
}: {
  isLoggedIn: boolean
  onUploadSelfie: () => void
  onLogout: () => void
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleUploadSelfie = () => {
    setIsMenuOpen(false)
    onUploadSelfie()
  }

  const handleLogout = () => {
    setIsMenuOpen(false)
    onLogout()
  }

  if (!isLoggedIn) return null

  return (
    <div className="relative">
      {/* 햄버거 버튼 */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex flex-col justify-center items-center w-8 h-8 space-y-1"
      >
        <span className={`block h-0.5 w-6 bg-black transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
        <span className={`block h-0.5 w-6 bg-black transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
        <span className={`block h-0.5 w-6 bg-black transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
      </button>

      {/* 드롭다운 메뉴 */}
      {isMenuOpen && (
        <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48 z-50">
          <button
            onClick={handleUploadSelfie}
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 transition-colors jaso-sans-font"
          >
            UPLOAD SELFIE
          </button>
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-black hover:bg-gray-100 transition-colors jaso-sans-font"
          >
            LOGOUT
          </button>
        </div>
      )}
    </div>
  )
}

// 네비게이션 메뉴 컴포넌트
function NavigationMenu({
  isLoggedIn,
  onLogin,
  onLogout,
  onMyPage,
  onMyFeed,
  onStart,
  onUploadSelfie,
  user,
}: {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onMyPage: () => void
  onMyFeed: () => void
  onStart: () => void
  onUploadSelfie: () => void
  user?: { name?: string; email?: string; profileImage?: string } | null
}) {
  return (
    <div className=" mb-1 flex items-center justify-center gap-12">
      {isLoggedIn ? (
        <>
          <button
            onClick={onMyPage}
            className=" text-xl font-medium text-black transition-colors hover:text-gray-600"
          >
            ALBUM
          </button>
          <button
            onClick={onStart}
            className="didot-font bg-black px-8 py-3 text-xl rounded-xl font-medium text-white transition-colors hover:bg-gray-800"
          >
            START
          </button>
          <button
            onClick={onMyFeed}
            className=" text-xl font-medium text-black transition-colors hover:text-gray-600"
          >
            FEED
          </button>
        </>
      ) : (
        <>
          <button
            className="cursor-not-allowed text-xl font-medium text-black opacity-50 transition-colors hover:text-gray-600"
            disabled
          >
            ALBUM
          </button>
          <button
            onClick={onLogin}
            className="didot-font bg-black rounded-xl px-5 py-2 text-xl font-medium text-white transition-colors hover:bg-gray-800"
          >
            LOGIN
          </button>
          <button
            className="font-semibold cursor-not-allowed text-xl text-black opacity-50 transition-colors hover:text-gray-600"
            disabled
          >
            FEED
          </button>
        </>
      )}
    </div>
  )
}

// GSAP 애니메이션 갤러리 컴포넌트 (디자인/애니메이션 개선)
function GallerySection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const extendedImages = [...images, ...images]

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'
    script.onload = () => {
      const { gsap } = window as any
      if (galleryRef.current && containerRef.current) {
        const gallery = galleryRef.current
        const container = containerRef.current
        const galleryWidth = gallery.scrollWidth
        const containerWidth = container.offsetWidth

        // 화면의 38%만큼 땡겨서 2.5장 정도 보이게
        const initialOffset = containerWidth * 0.38
        // 살짝 위로 올림 (y), 오른쪽에서 왼쪽으로
        gsap.set(gallery, { x: -initialOffset, y: '-2vh' })
        gsap.to(gallery, {
          x: -galleryWidth + initialOffset,
          duration: 46, // 천천히
          ease: 'none',
          repeat: -1,
          modifiers: {
            x: gsap.utils.unitize(x =>
              (-x >= galleryWidth / 2) ? -initialOffset : x
            ),
          },
        })
      }
    }
    document.head.appendChild(script)
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  return (
  <div className="relative w-full overflow-hidden select-none"
    style={{ height: '66vh', marginTop: '2.5vh', userSelect: 'none' }}>
    <div ref={containerRef} className="w-full h-full flex items-center overflow-hidden">
      <div
        ref={galleryRef}
        className="flex items-center"
        style={{
          gap: '0.25vw',
          width: 'max-content',
          willChange: 'transform',
        }}
      >
        {extendedImages.map((image, index) => (
          <div
            key={index}
            className="overflow-hidden flex-shrink-0 rounded-none"
            style={{
              width: '42vw',
              minWidth: '320px',
              maxWidth: '830px',
              aspectRatio: '3/2',        // <-- 이 부분
              minHeight: '38vh',
              maxHeight: '68vh',
              background: '#eaeaea'
            }}
          >
            <div className="relative w-full h-full">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                style={{ objectFit: 'cover' }}
                priority={index < 3}
                sizes="(max-width: 900px) 100vw, 42vw"
                draggable={false}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)
}

// 메인 컴포넌트
export default function CreativePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    isLoggedIn,
    handleLogin,
    handleLogout,
    handleMyPage,
    handleMyFeed,
    handleAfterLoginClick,
    initializeAuth,
    user,
    isCreatingRoom,
  } = useAuth()

  // START 버튼 핸들러
  const handleStart = () => {
    handleAfterLoginClick()
  }
  // UPLOAD SELFIE 버튼 핸들러
  const handleUploadSelfie = () => {
    // 구현 예정
    // router.push('/upload')
  }

  useEffect(() => {
    initializeAuth()
  }, [])

  useEffect(() => {
    // 로그인 상태 체크
  }, [isLoggedIn])

  useEffect(() => {
    if (isLoggedIn) {
      const action = searchParams.get('action')
      if (action === 'createRoom') {
        router.replace('/', { scroll: false })
        handleAfterLoginClick()
      }
    }
  }, [isLoggedIn, searchParams, router, handleAfterLoginClick])

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 영역 */}
      <div className="pt-6 pb-8">
        {/* 로고 + 프로필 */}
        <div className="relative w-full h-32 md:h-40 lg:h-48 flex items-center justify-center">
          <div className="flex items-center gap-1 md:gap-2 lg:gap-3">
            <div className="relative w-12 h-16 md:w-16 md:h-20 lg:w-24 lg:h-28">
              <Image
                src="/letter-nn.png"
                alt="N"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="relative w-12 h-16 md:w-16 md:h-20 lg:w-24 lg:h-28">
              <Image
                src="/letter-ee.png"
                alt="E"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="relative w-14 h-18 md:w-18 md:h-22 lg:w-26 lg:h-30">
              <Image
                src="/letter-aa.png"
                alt="A"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="relative w-12 h-16 md:w-16 md:h-20 lg:w-24 lg:h-28">
              <Image
                src="/letter-rr.png"
                alt="R"
                fill
                className="object-contain"
                priority
              />
            </div>
            {/* 공백 */}
            <div className="w-3 md:w-4 lg:w-6"></div>
            <div className="relative w-12 h-16 md:w-16 md:h-20 lg:w-24 lg:h-28">
              <Image
                src="/letter-zz.png"
                alt="Z"
                fill
                className="object-contain"
                priority
              />
            </div>
            {/* O 글자 크기 조정 */}
            <div className="relative w-14 h-18 md:w-18 md:h-22 lg:w-26 lg:h-30">
              <Image
                src="/letter-oo.png"
                alt="O"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="relative w-14 h-18 md:w-18 md:h-22 lg:w-26 lg:h-30">
              <Image
                src="/letter-oo.png"
                alt="O"
                fill
                className="object-contain"
                priority
              />
            </div>
            {/* M 글자 크기 조정 */}
            <div className="relative w-16 h-20 md:w-19 md:h-23 lg:w-30 lg:h-34">
              <Image
                src="/letter-mm.png"
                alt="M"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          {isLoggedIn && (
            <div className="absolute right-8 top-1/2 transform -translate-y-1/2 flex items-center gap-4">
              {/* 프로필 원형 아바타 */}
              <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 text-base font-medium">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              {/* 햄버거 메뉴 */}
              <HamburgerMenuComponent
                isLoggedIn={isLoggedIn}
                onUploadSelfie={handleUploadSelfie}
                onLogout={handleLogout}
              />
            </div>
          )}
        </div>
        {/* 네비게이션 메뉴 */}
        <NavigationMenu
          isLoggedIn={isLoggedIn}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onMyPage={handleMyPage}
          onMyFeed={handleMyFeed}
          onStart={handleStart}
          onUploadSelfie={handleUploadSelfie}
          user={user}
        />
      </div>
      {/* 이미지 갤러리 */}
      <GallerySection />
      <div>
        <AboutUsSection />
      </div>
      <Footer />
    </div>
  )
}
