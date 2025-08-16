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

// 네비게이션 메뉴 컴포넌트
function NavigationMenu({
  isLoggedIn,
  onLogin,
  onLogout,
  onMyPage,
  onMyFeed,
  user,
}: {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onMyPage: () => void
  onMyFeed: () => void
  user?: { name?: string; email?: string; profileImage?: string } | null
}) {
  return (
    <div className="mb-8 flex items-center justify-center gap-12">
      {isLoggedIn ? (
        <>
          <button
            onClick={onMyPage}
            className="jaso-sans-font text-xl font-medium text-black transition-colors hover:text-gray-600"
          >
            ALBUM
          </button>

          <button
            onClick={onLogout}
            className="didot-font bg-black px-8 py-3 text-xl font-medium text-white transition-colors hover:bg-gray-800 rounded-xl"
          >
            LOGOUT
          </button>

          <button
            onClick={onMyFeed}
            className="jaso-sans-font text-xl font-medium text-black transition-colors hover:text-gray-600"
          >
            FEED
          </button>
        </>
      ) : (
        <>
          <button
            className="jaso-sans-font cursor-not-allowed text-xl font-medium text-black opacity-50 transition-colors hover:text-gray-600"
            disabled
          >
            ALBUM
          </button>

          <button
            onClick={onLogin}
            className="didot-font bg-black rounded-xl px-8 py-3 text-xl font-medium text-white transition-colors hover:bg-gray-800"
          >
            LOGIN
          </button>

          <button
            className="jaso-sans-font cursor-not-allowed text-xl font-medium text-black opacity-50 transition-colors hover:text-gray-600"
            disabled
          >
            FEED
          </button>
        </>
      )}
    </div>
  )
}

// GSAP 애니메이션 갤러리 컴포넌트 (스크롤 힌트 포함)
function GallerySection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // GSAP 라이브러리 동적 로드
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'
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
    <div className="min-h-screen bg-white relative">
      {/* 헤더 영역 */}
      <div className="pt-6 pb-4 relative z-10">
        {/* NEARZOOM 타이틀 */}
        <div className="relative w-full h-28 md:h-30 lg:h-38 mb-6">
          <Image
            src="/NZ.png"
            alt="NEARZOOM"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* 네비게이션 메뉴 */}
        <NavigationMenu
          isLoggedIn={isLoggedIn}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onMyPage={handleMyPage}
          onMyFeed={handleMyFeed}
          user={user}
        />
      </div>

      {/* 이미지 갤러리 - 스크롤 힌트 포함 */}
      <GallerySection />
      
      {/* About Us (3단계 프로세스 포함) */}
      <AboutUsSection />
      
      {/* Footer */}
      <Footer />
      
      {/* TOP 버튼 */}
      <ScrollToTopButton />
    </div>
  )
}