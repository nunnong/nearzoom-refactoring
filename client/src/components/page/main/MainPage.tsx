'use client'

import { useAuth } from '@/hooks/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import AboutUsSection from './AboutUsSection'
import Footer from './Footer'

// Scroll to Top 버튼 컴포넌트
function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  // 스크롤 위치 감지
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  // 맨 위로 스크롤
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <button
      onClick={scrollToTop}
      className={`group fixed right-8 bottom-8 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/80 text-white shadow-lg backdrop-blur-sm transition-all duration-300 ease-out hover:border-white/20 hover:bg-black hover:shadow-xl ${
        isVisible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0'
      } `}
      aria-label="맨 위로 가기"
    >
      {/* TOP 텍스트 */}
      <span className="text-xs font-medium tracking-wide transition-transform duration-200 group-hover:scale-110">
        TOP
      </span>

      {/* 호버 시 배경 효과 */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-600/20 to-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
    </button>
  )
}

// 이미지 데이터
const images: { src: string; alt: string }[] = [
  { src: '/friends.png', alt: 'Friends with colorful sunglasses' },
  { src: '/family.png', alt: 'Family walking on beach' },
  { src: '/celebrate.png', alt: 'Celebration group' },
  { src: '/parents.png', alt: 'Parents with kids' },
]

// 햄버거 메뉴만 담당하는 컴포넌트
function HamburgerMenuComponent({
  isLoggedIn,
  onUploadSelfie,
  onLogout,
  onAccount,
}: {
  isLoggedIn: boolean
  onUploadSelfie: () => void
  onLogout: () => void
  onAccount: () => void
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

  const handleAccount = () => {
    setIsMenuOpen(false)
    onAccount()
  }

  if (!isLoggedIn) return null

  return (
    <div className="relative">
      {/* 햄버거 버튼 */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex h-8 w-8 flex-col items-center justify-center space-y-1"
      >
        <span
          className={`block h-0.5 w-6 bg-black transition-all duration-300 ${isMenuOpen ? 'translate-y-1.5 rotate-45' : ''}`}
        ></span>
        <span
          className={`block h-0.5 w-6 bg-black transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}
        ></span>
        <span
          className={`block h-0.5 w-6 bg-black transition-all duration-300 ${isMenuOpen ? '-translate-y-1.5 -rotate-45' : ''}`}
        ></span>
      </button>

      {/* 드롭다운 메뉴 */}
      {isMenuOpen && (
        <div className="absolute top-12 right-0 z-50 min-w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
          <button
            onClick={handleUploadSelfie}
            className="jaso-sans-font block w-full px-4 py-2 text-left text-black transition-colors hover:bg-gray-100"
          >
            UPLOAD SELFIE
          </button>
          <button
            onClick={handleAccount}
            className="jaso-sans-font block w-full px-4 py-2 text-left text-black transition-colors hover:bg-gray-100"
          >
            ACCOUNT
          </button>
          <button
            onClick={handleLogout}
            className="jaso-sans-font block w-full px-4 py-2 text-left text-red-600 transition-colors hover:bg-gray-100"
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
  onAccount,
  user,
  isCreatingRoom,
}: {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onMyPage: () => void
  onMyFeed: () => void
  onStart: () => void
  onUploadSelfie: () => void
  onAccount: () => void
  user?: { name?: string; email?: string; profileImage?: string } | null
  isCreatingRoom?: boolean
}) {
  const startButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isLoggedIn || !startButtonRef.current) return

    const loadAndAnimate = async () => {
      const w = window as any
      if (!w.gsap) {
        await new Promise<void>(resolve => {
          const script = document.createElement('script')
          script.src =
            'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'
          script.onload = () => resolve()
          document.head.appendChild(script)
        })
      }

      const { gsap } = window as any
      if (!gsap) return
      gsap.to(startButtonRef.current, {
        scale: 1.1,
        duration: 0.7,
        yoyo: true,
        repeat: -1,
        ease: 'power1.inOut',
      })
    }

    loadAndAnimate()

    return () => {
      const { gsap } = window as any
      if (gsap && startButtonRef.current) {
        gsap.killTweensOf(startButtonRef.current)
        startButtonRef.current.style.transform = ''
      }
    }
  }, [isLoggedIn])

  return (
    <div className="mb-1 flex items-center justify-center gap-12">
      {isLoggedIn ? (
        <>
          <button
            onClick={onMyPage}
            className="text-xl font-medium text-black transition-colors hover:text-gray-600"
          >
            ALBUM
          </button>
          <button
            ref={startButtonRef}
            onClick={isCreatingRoom ? undefined : onStart}
            disabled={isCreatingRoom}
            className={`didot-font relative rounded-xl px-8 py-3 text-xl font-medium transition-colors ${
              isCreatingRoom
                ? 'cursor-not-allowed bg-gray-600 opacity-75'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {isCreatingRoom && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              </div>
            )}
            <span className={isCreatingRoom ? 'opacity-30' : ''}>START</span>
          </button>
          <button
            onClick={onMyFeed}
            className="text-xl font-medium text-black transition-colors hover:text-gray-600"
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
            className="didot-font rounded-xl bg-black px-5 py-2 text-xl font-medium text-white transition-colors hover:bg-gray-800"
          >
            LOGIN
          </button>
          <button
            className="cursor-not-allowed text-xl font-semibold text-black opacity-50 transition-colors hover:text-gray-600"
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
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'
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
            x: gsap.utils.unitize((x: number) =>
              -x >= galleryWidth / 2 ? -initialOffset : x
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
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: '66vh', marginTop: '1vh', userSelect: 'none' }}
    >
      <div
        ref={containerRef}
        className="flex h-full w-full items-center overflow-hidden"
      >
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
              className="flex-shrink-0 overflow-hidden rounded-none"
              style={{
                width: '42vw',
                minWidth: '320px',
                maxWidth: '830px',
                aspectRatio: '3/2', // <-- 이 부분
                minHeight: '38vh',
                maxHeight: '68vh',
                background: '#eaeaea',
              }}
            >
              <div className="relative h-full w-full">
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

        {/* 하단 그라데이션 오버레이 - 스크롤 힌트 (조금 위로) */}
        <div className="pointer-events-none absolute right-0 bottom-6 left-0 h-32 bg-gradient-to-t from-black/30 via-black/10 to-transparent"></div>

        {/* 스크롤 힌트 애니메이션 (그라데이션과 함께 위로) */}
        <div className="absolute bottom-12 left-1/2 z-10 -translate-x-1/2 transform">
          <div className="flex animate-bounce flex-col items-center text-white">
            <div className="mb-2 flex h-10 w-6 justify-center rounded-full border-2 border-white/70">
              <div className="mt-2 h-3 w-1 animate-pulse rounded-full bg-white/70"></div>
            </div>
            <p className="text-xs font-medium tracking-wider opacity-80">
              SCROLL
            </p>
          </div>
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

  // START 버튼 핸들러: 방 생성 후 이동
  const handleStart = () => {
    if (isLoggedIn) {
      handleAfterLoginClick()
    } else {
      handleLogin()
    }
  }

  // 셀피 업로드 페이지로 이동
  const handleUploadSelfie = () => {
    router.push('/upload-photo')
  }

  // 프로필 설정 페이지로 이동
  const handleAccount = () => {
    router.push('/profile')
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
        <div className="relative flex h-32 w-full items-center justify-center md:h-40 lg:h-48">
          <div className="flex items-center gap-1 md:gap-2 lg:gap-3">
            <div className="relative h-16 w-12 md:h-20 md:w-16 lg:h-28 lg:w-24">
              <Image
                src="/letter-nn.png"
                alt="N"
                fill
                sizes="(max-width: 640px) 32px, (max-width: 1024px) 48px, 64px"
                className="object-contain"
                priority
              />
            </div>
            <div className="relative h-16 w-12 md:h-20 md:w-16 lg:h-28 lg:w-24">
              <Image
                src="/letter-ee.png"
                alt="E"
                fill
                sizes="(max-width: 640px) 32px, (max-width: 1024px) 48px, 64px"
                className="object-contain"
                priority
              />
            </div>
            <div className="relative h-18 w-14 md:h-22 md:w-18 lg:h-30 lg:w-26">
              <Image
                src="/letter-aa.png"
                alt="A"
                fill
                sizes="(max-width: 640px) 36px, (max-width: 1024px) 52px, 68px"
                className="object-contain"
                priority
              />
            </div>
            <div className="relative h-16 w-12 md:h-20 md:w-16 lg:h-28 lg:w-24">
              <Image
                src="/letter-rr.png"
                alt="R"
                fill
                sizes="(max-width: 640px) 32px, (max-width: 1024px) 48px, 64px"
                className="object-contain"
                priority
              />
            </div>
            {/* 공백 */}
            <div className="w-3 md:w-4 lg:w-6"></div>
            <div className="relative h-16 w-12 md:h-20 md:w-16 lg:h-28 lg:w-24">
              <Image
                src="/letter-zz.png"
                alt="Z"
                fill
                sizes="(max-width: 640px) 32px, (max-width: 1024px) 48px, 64px"
                className="object-contain"
                priority
              />
            </div>
            {/* O 글자 크기 조정 */}
            <div className="relative h-18 w-14 md:h-22 md:w-18 lg:h-30 lg:w-26">
              <Image
                src="/letter-oo.png"
                alt="O"
                fill
                sizes="(max-width: 640px) 36px, (max-width: 1024px) 52px, 68px"
                className="object-contain"
                priority
              />
            </div>
            <div className="relative h-18 w-14 md:h-22 md:w-18 lg:h-30 lg:w-26">
              <Image
                src="/letter-oo.png"
                alt="O"
                fill
                sizes="(max-width: 640px) 36px, (max-width: 1024px) 52px, 68px"
                className="object-contain"
                priority
              />
            </div>
            {/* M 글자 크기 조정 */}
            <div className="relative h-20 w-16 md:h-23 md:w-19 lg:h-34 lg:w-30">
              <Image
                src="/letter-mm.png"
                alt="M"
                fill
                sizes="(max-width: 640px) 40px, (max-width: 1024px) 56px, 72px"
                className="object-contain"
                priority
              />
            </div>
          </div>
          {isLoggedIn && (
            <div className="absolute top-4 right-4 flex items-center gap-4 md:top-6 md:right-6 lg:top-8 lg:right-8">
              {/* 프로필 원형 아바타 - 소셜 계정 프로필 사진과 연결 */}
              <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-gray-200 shadow-md">
                {user?.profileImage ? (
                  <Image
                    src={user.profileImage}
                    alt="프로필 사진"
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    onError={e => {
                      // 프로필 이미지 로드 실패 시 fallback
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const fallback = target.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                ) : null}
                {/* Fallback: 프로필 이미지가 없을 때 이니셜 표시 */}
                <div
                  className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 ${
                    user?.profileImage ? 'hidden' : 'flex'
                  }`}
                >
                  <span className="text-lg font-bold text-white">
                    {user?.name
                      ? user.name.charAt(0).toUpperCase()
                      : user?.email
                        ? user.email.charAt(0).toUpperCase()
                        : 'U'}
                  </span>
                </div>
              </div>
              {/* 햄버거 메뉴 */}
              <HamburgerMenuComponent
                isLoggedIn={isLoggedIn}
                onUploadSelfie={handleUploadSelfie}
                onLogout={handleLogout}
                onAccount={handleAccount}
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
          onAccount={handleAccount}
          user={user}
          isCreatingRoom={isCreatingRoom}
        />
      </div>

      {/* 이미지 갤러리 */}
      <GallerySection />
      <div>
        <AboutUsSection />
      </div>
      <Footer />
      <ScrollToTopButton />
    </div>
  )
}
