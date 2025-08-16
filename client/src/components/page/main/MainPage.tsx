'use client'

import { useAuth } from '@/hooks/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import AboutUsSection from './AboutUsSection'
import Footer from './Footer'

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
    <div className="mb-16 flex items-center justify-center gap-12">
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
            className="didot-font bg-black px-8 py-3 text-xl font-medium text-white transition-colors hover:bg-gray-800"
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
            className="jaso-sans-font font-extrabold cursor-not-allowed text-xl font-medium text-black opacity-50 transition-colors hover:text-gray-600"
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
    <div className="w-full">
      <div
        ref={containerRef}
        className="w-full overflow-hidden"
        style={{ height: '60vh' }}
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
    <div className="min-h-screen bg-white">
      {/* 헤더 영역 */}
      <div className="pt-6 pb-8">
        {/* NEARZOOM 타이틀 */}
     <div className="relative w-full h-28 md:h-30 lg:h-38">
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

      {/* 이미지 갤러리 */}
      <GallerySection />
      <div>
        <AboutUsSection />
      </div>
      <Footer />
    </div>
  )
}
