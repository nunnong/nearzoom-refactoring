'use client'

import Header from './Header'
import WaitingComponent from './waiting/WaitingComponent'

export default function PhotoBooth() {
  const handleStartCall = () => {
    console.log('촬영 시작!')
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#C9D76D] text-[#2D3243]">
      {/* 공통 Header */}
      <Header />

      {/* 대기실 컴포넌트 */}
      <WaitingComponent onStartCall={handleStartCall} />
    </div>
  )
}
