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
      behavior: 'smooth'
    })
  }

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-8 right-8 z-50 w-12 h-12 
        bg-black/80 hover:bg-black text-white
        backdrop-blur-sm border border-white/10 hover:border-white/20
        rounded-full shadow-lg hover:shadow-xl
        transition-all duration-300 ease-out
        flex items-center justify-center group
        ${isVisible 
          ? 'opacity-100 translate-y-0 pointer-events-auto' 
          : 'opacity-0 translate-y-4 pointer-events-none'
        }
      `}
      aria-label="맨 위로 가기"
    >
      {/* TOP 텍스트 */}
      <span className="text-xs font-medium tracking-wide group-hover:scale-110 transition-transform duration-200">
        TOP
      </span>
      
      {/* 호버 시 배경 효과 */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 to-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </button>
  )
}

// 이미지 데이터
const images = [
  { src: '/friends.png', alt: 'Friends with colorful sunglasses' },
  { src: '/family.png', alt: 'Family walking on beach' },
  { src: '/couple.png', alt: 'Couple silhouette making heart shape' },
  { src: '/friends.png', alt: 'Friends with colorful sunglasses' },
  { src: '/family.png', alt: 'Family walking on beach' },
  { src: '/couple.png', alt: 'Couple silhouette making heart shape' },
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
  onAccount,
  user,
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
}) {
  return (
    <div className="mb-12 flex items-center justify-center gap-12">
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
            className="didot-font bg-black px-8 py-3 text-xl font-medium text-white transition-colors hover:bg-gray-800"
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

// GSAP 애니메이션 갤러리 컴포넌트
function GallerySection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // GSAP 라이브러리 동적 로드
    const script = document.createElement('script')
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'
    script.onload = () => {
      const { gsap } = window as any

      if (galleryRef.current && containerRef.current) {
        const gallery = galleryRef.current
        const galleryWidth = gallery.scrollWidth
        const containerWidth = containerRef.current.offsetWidth

        // 무한 반복 애니메이션 (오른쪽에서 왼쪽으로)
        gsap.set(gallery, { x: containerWidth })

        gsap.to(gallery, {
          x: -galleryWidth,
          duration: 25,
          ease: 'none',
          repeat: -1,
          repeatDelay: 0,
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
    <div className="w-full relative">
      {/* 갤러리 컨테이너 - 보그처럼 화면을 꽉 채우고 약간 넘치게 */}
      <div
        ref={containerRef}
        className="w-full overflow-hidden"
        style={{ 
          height: '85vh', // 화면 높이의 85%로 설정해서 아래가 약간 잘리게
          minHeight: '600px' // 최소 높이 보장
        }}
      >
        <div
          ref={galleryRef}
          className="flex h-full items-center gap-0"
          style={{ width: 'max-content' }}
        >
          {images.map((image, index) => (
            <div
              key={index}
              className="h-full flex-shrink-0"
              style={{ width: '33.333vw' }}
            >
              <div className="relative h-full w-full">
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  priority={index < 3}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 하단 그라데이션 오버레이 - 스크롤 힌트 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 via-black/10 to-transparent pointer-events-none"></div>
      
      {/* 스크롤 힌트 애니메이션 */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex flex-col items-center animate-bounce text-white">
          <div className="w-6 h-10 border-2 border-white/70 rounded-full flex justify-center mb-2">
            <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse"></div>
          </div>
          <p className="text-xs font-medium tracking-wider opacity-80">SCROLL</p>
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

  // START 버튼 핸들러 (방 생성 등의 기능)
  const handleStart = () => {
    // 여기에 START 버튼 클릭 시 실행할 로직 추가
    handleAfterLoginClick() // 기존 방 생성 로직 사용
  }

  // MyRoom으로 이동 (셀피 업로드/AI 보정)
  const handleUploadSelfie = () => {
    router.push('/myroom');
  };

  // 프로필 설정 페이지로 이동
  const handleAccount = () => {
    router.push('/profile');
  };

  // 프로필 이미지 직접 업로드 (추후 구현)
  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // 추후 구현 예정
    console.log('프로필 이미지 업로드:', event.target.files?.[0]);
  };

  useEffect(() => {
    initializeAuth()
  }, [])

  useEffect(() => {
    console.log('MainPage - isLoggedIn:', isLoggedIn)
  }, [isLoggedIn])

  // URL 파라미터 처리 (로그인 후 방 생성)
  useEffect(() => {
    if (isLoggedIn) {
      const action = searchParams.get('action')
      if (action === 'createRoom') {
        console.log('✅ 로그인 완료 - URL 파라미터로 방 생성 실행')
        // URL 파라미터 제거
        router.replace('/', { scroll: false })
        // 방 생성 실행
        handleAfterLoginClick()
      }
    }
  }, [isLoggedIn, searchParams, router, handleAfterLoginClick])

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 영역 */}
      <div className="pt-6 pb-8">
        {/* NEARZOOM 타이틀과 프로필 영역 */}
        <div className="relative w-full h-32 md:h-40 lg:h-48 flex items-center justify-center">
          {/* 각 글자별 이미지로 구성된 로고 - 훨씬 크게 */}
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
            {/* O 글자 크기 조정 - 다른 글자보다 약간 크게 */}
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
            {/* M 글자 크기 조정 - 다른 글자보다 약간 크게 */}
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
          
          {/* 로그인 상태일 때 로고 옆에 프로필과 햄버거 메뉴 */}
          {isLoggedIn && (
            <div className="absolute right-8 top-1/2 transform -translate-y-1/2 flex items-center gap-4">
              {/* 프로필 원형 아바타 - 소셜 계정 프로필 사진과 연결 */}
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 shadow-md">
                {user?.profileImage ? (
                  <Image
                    src={user.profileImage}
                    alt="프로필 사진"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    onError={(e) => {
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
                  className={`w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center ${
                    user?.profileImage ? 'hidden' : 'flex'
                  }`}
                >
                  <span className="text-white text-lg font-bold">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 
                     user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>
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
          onAccount={handleAccount}
          user={user}
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
