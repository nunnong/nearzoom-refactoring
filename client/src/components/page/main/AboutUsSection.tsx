"use client"

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

const steps = [
  {
    number: "01",
    title: "Upload Your Best Shot",
    description: "자신의 개성이 드러나는 최고의 사진을 업로드하여 시작하세요.",
    icon: "📤"
  },
  {
    number: "02", 
    title: "Capture the Moment",
    description: "친구들과 함께 특별한 순간을 포착하고, 추억을 만들어보세요.",
    icon: "📷"
  },
  {
    number: "03",
    title: "Create & Share", 
    description: "프리미엄 편집 도구로 완성하고, 세상과 공유해보세요.",
    icon: "✨"
  }
]

// About Us Section
export default function AboutUsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeStep, setActiveStep] = useState<number | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in-up')
          }
        })
      },
      { threshold: 0.1 }
    )

    const elements = document.querySelectorAll('.fade-in-observer')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  return (
    <section className="bg-white relative">
      {/* 스크롤 다운 인디케이터 */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 z-20">
        <div className="flex flex-col items-center animate-bounce">
          <div className="w-px h-16 bg-gray-300 mb-2"></div>
          <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse"></div>
          </div>
          <p className="text-xs text-gray-400 mt-2 tracking-wider">SCROLL</p>
        </div>
      </div>

      {/* 애니메이션 텍스트 헤더 */}
      <div className="relative pt-16 pb-12 overflow-hidden">
        <div className="flex whitespace-nowrap animate-scroll-left">
          {Array(6).fill(0).map((_, index) => (
            <h2 
              key={index} 
              className="text-[120px] md:text-[200px] font-bold text-gray-800/8 mr-32 font-serif tracking-wider"
              style={{ fontFamily: 'Playfair Display, serif' }}
            >
              ABOUT US
            </h2>
          ))}
        </div>
      </div>

      {/* 3단계 프로세스 섹션 - 화이트 배경 */}
      <div className="bg-gradient-to-b from-white to-gray-50 py-24 fade-in-observer">
        <div className="max-w-6xl mx-auto px-8">
          {/* 섹션 헤더 */}
          <div className="text-center mb-20">
            <div className="inline-block">
              <span className="text-xs font-medium tracking-[0.4em] text-gray-500 uppercase mb-4 block">
                How It Works
              </span>
              <h2 className="text-4xl md:text-5xl font-light text-gray-900 leading-tight" 
                  style={{ fontFamily: 'Playfair Display, serif' }}>
                Three Steps to
                <br />
                <span className="font-light italic">Perfection</span>
              </h2>
            </div>
          </div>

          {/* 스텝 컨테이너 */}
          <div className="relative">
            {/* 연결선 */}
            <div className="hidden lg:block absolute top-20 left-0 w-full h-px">
              <div className="relative h-full">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300/50 to-transparent"></div>
                <div className="absolute left-1/6 w-2/3 h-full bg-gradient-to-r from-gray-400/60 via-gray-300/80 to-gray-400/60"></div>
              </div>
            </div>

            {/* 스텝 그리드 */}
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-16">
              {steps.map((step, index) => (
                <div 
                  key={step.number} 
                  className="relative group cursor-pointer"
                  onMouseEnter={() => setActiveStep(index)}
                  onMouseLeave={() => setActiveStep(null)}
                >
                  {/* 카드 배경 */}
                  <div className="relative">
                    {/* 메인 카드 */}
                    <div className={`
                      relative p-8 lg:p-10 text-center transition-all duration-500 ease-out
                      ${activeStep === index 
                        ? 'transform -translate-y-3 scale-105' 
                        : 'transform translate-y-0 scale-100'
                      }
                    `}>
                      {/* 카드 배경 레이어들 - 화이트 테마 */}
                      <div className="absolute inset-0 bg-white backdrop-blur-sm rounded-3xl border border-gray-200 shadow-lg"></div>
                      <div className={`
                        absolute inset-0 bg-gradient-to-br from-gray-50/80 to-white rounded-3xl 
                        transition-opacity duration-500
                        ${activeStep === index ? 'opacity-100' : 'opacity-60'}
                      `}></div>
                      
                      {/* 내용 */}
                      <div className="relative z-10">
                        {/* 번호와 아이콘 */}
                        <div className="relative mb-8">
                          <div className="relative inline-block">
                            {/* 번호 배경 */}
                            <div className={`
                              w-16 h-16 mx-auto mb-6 rounded-full border-2 
                              flex items-center justify-center backdrop-blur-sm
                              transition-all duration-500
                              ${activeStep === index 
                                ? 'bg-black text-white border-black transform scale-110' 
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                              }
                            `}>
                              <span className="text-sm font-bold tracking-wider">
                                {step.number}
                              </span>
                            </div>
                            
                            {/* 아이콘 */}
                            <div className={`
                              text-4xl transition-all duration-500
                              ${activeStep === index 
                                ? 'transform scale-125 drop-shadow-lg' 
                                : 'transform scale-100'
                              }
                            `}>
                              {step.icon}
                            </div>
                          </div>
                        </div>
                        
                        {/* 제목 */}
                        <h3 className={`
                          text-xl lg:text-2xl font-light mb-4 transition-all duration-300
                          ${activeStep === index ? 'text-gray-900' : 'text-gray-700'}
                        `} 
                        style={{ fontFamily: 'Playfair Display, serif' }}>
                          {step.title}
                        </h3>
                        
                        {/* 설명 */}
                        <p className={`
                          text-sm lg:text-base leading-relaxed transition-all duration-300
                          ${activeStep === index ? 'text-gray-600' : 'text-gray-500'}
                        `}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        
        .fade-in-observer {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease-out;
        }
      `}</style>
    </section>
  )
}