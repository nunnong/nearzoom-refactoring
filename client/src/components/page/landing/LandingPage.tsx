'use client'

import gsap from 'gsap'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const lettersRef = useRef<HTMLImageElement[]>([])
  const linkIconRef = useRef<HTMLImageElement>(null)
  const router = useRouter()

  useEffect(() => {
    const letters = lettersRef.current
    const container = containerRef.current
    const linkIcon = linkIconRef.current
    const radius = 160

    // STEP 1: 원형 배치
    letters.forEach((el, i) => {
      const angle = (i / letters.length) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      gsap.set(el, { x, y })
    })

    // STEP 2: 회전 애니메이션
    const rotateAnim = gsap.to(container, {
      rotate: 360,
      duration: 20,
      repeat: -1,
      ease: 'none',
      transformOrigin: '50% 50%',
    })

    const linkRotateAnim = gsap.to(linkIcon, {
      rotationZ: 360,
      duration: 4,
      repeat: -1,
      ease: 'none',
      transformStyle: 'preserve-3d',
    })

    // STEP 3: 회전 멈추고 최종 위치로 이동
    const tl = gsap.timeline({ delay: 2 })

    // 회전 멈춤
    tl.to(container, {
      rotate: 0,
      duration: 1,
      ease: 'power2.out',
      onComplete: () => {
        rotateAnim.kill()
        // 3초 후 페이드아웃과 메인으로 이동
        setTimeout(() => {
          gsap.to(containerRef.current, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
              router.push('/')
            },
          })
        }, 3000)
      },
    })

    // near 글자들을 위쪽 일자로 배치 (멀리서 모이게)
    tl.to(
      [letters[0], letters[1], letters[2], letters[3]],
      {
        x: (i: number) => [-200, -100, 100, 200][i],
        y: -40,
        duration: 0.8,
        ease: 'power2.out',
      },
      '<'
    )

    // z와 m을 아래쪽으로 배치
    tl.to(
      [letters[4], letters[5]],
      {
        x: (i: number) => [-70, 80][i],
        y: 40,
        duration: 0.8,
        ease: 'power2.out',
      },
      '<'
    )

    // near 글자들이 모이기
    tl.to(
      [letters[0], letters[1], letters[2], letters[3]],
      {
        x: (i: number) => [-90, -30, 30, 90][i],
        y: -40,
        duration: 1,
        scale: 1.2,
        ease: 'back.out(1.7)',
        stagger: 0.1,
      },
      '+=0.3'
    )

    // 링크 아이콘을 zoom의 oo 위치로 이동
    tl.to(
      linkIcon,
      {
        x: 5,
        y: 40,
        rotation: 20,
        scale: 1.2,
        duration: 1,
        ease: 'back.out(1.7)',
      },
      '<'
    )

    return () => {
      rotateAnim.kill()
      linkRotateAnim.kill()
      tl.kill()
    }
  }, [])

  // 각 글자에 해당하는 PNG 파일 경로
  const letterImages = [
    { src: '/letter-n.png', alt: 'n' },
    { src: '/letter-e.png', alt: 'e' },
    { src: '/letter-a.png', alt: 'a' },
    { src: '/letter-r.png', alt: 'r' },
    { src: '/letter-z.png', alt: 'z' },
    { src: '/letter-m.png', alt: 'm' },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="relative h-[400px] w-[400px]" ref={containerRef}>
        {letterImages.map((letter, i) => (
          <Image
            key={i}
            ref={el => {
              if (el) lettersRef.current[i] = el
            }}
            src={letter.src}
            alt={letter.alt}
            width={48}
            height={48}
            className="absolute select-none"
            style={{
              left: '50%',
              top: '50%',
              transformOrigin: 'center',
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}

        <Image
          ref={linkIconRef}
          src="/link-icon.png"
          alt="link"
          width={70}
          height={70}
          className="absolute select-none"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>
    </div>
  )
}