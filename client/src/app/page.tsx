"use client"

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import LandingPage from '@/app/landing/page'
import MainPage from '@/components/page/main/MainPage'

function HomeContent() {
  const [showLanding, setShowLanding] = useState(false)
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // 로그인 리다이렉트로 왔는지 확인 (callback에서 온 경우)
    const fromCallback = searchParams.get('from') === 'callback'
    const hasToken = searchParams.get('token')
    
    // localStorage에서 랜딩 페이지 표시 여부 확인
    const hasSeenLanding = localStorage.getItem('hasSeenLanding')
    
    // 로그인 리다이렉트이거나 이미 랜딩을 본 경우 바로 메인 페이지
    if (fromCallback || hasToken || hasSeenLanding) {
      setShowLanding(false)
    } else {
      // 첫 방문인 경우 랜딩 페이지 표시
      setShowLanding(true)
      
      // 랜딩 페이지를 봤다고 표시
      localStorage.setItem('hasSeenLanding', 'true')
      
      // 6초 후 메인 페이지로 자동 전환
      const timer = setTimeout(() => {
        setShowLanding(false)
      }, 6000)
      
      return () => clearTimeout(timer)
    }
  }, [searchParams])
  
  if (showLanding) {
    return <LandingPage />
  }
  
  return <MainPage />
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}
