"use client"

import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-black text-white mt-20">
      <div className="max-w-6xl mx-auto px-6 py-12 border-t border-gray-800 text-center">
        {/* 개별 PNG로 구성된 NEARZOOM 로고 */}
        <div className="flex items-center justify-center gap-1 mb-5">
          <div className="relative w-6 h-8">
            <Image
              src="/letter-nn.png"
              alt="N"
              fill
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          <div className="relative w-6 h-8">
            <Image
              src="/letter-ee.png"
              alt="E"
              fill
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          <div className="relative w-7 h-9">
            <Image
              src="/letter-aa.png"
              alt="A"
              fill
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          <div className="relative w-6 h-8">
            <Image
              src="/letter-rr.png"
              alt="R"
              fill
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          {/* 공백 */}
          <div className="w-2"></div>
          <div className="relative w-6 h-8">
            <Image
              src="/letter-zz.png"
              alt="Z"
              fill
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          <div className="relative w-7 h-9">
            <Image
              src="/letter-oo.png"
              alt="O"
              fill
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          <div className="relative w-7 h-9">
            <Image
              src="/letter-oo.png"
              alt="O"
              fill
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          <div className="relative w-8 h-12">
            <Image
              src="/letter-mm.png"
              alt="M"
              fill
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
        </div>
        
        <p className="text-gray-400 italic mb-6 max-w-md mx-auto text-base sm:text-lg">
          따로 또 같이, 어디서든 즐기는 네컷 사진
        </p>
        <p className="text-gray-500 text-sm sm:text-base tracking-wide">
          © 2025 NEAR ZOOM. All rights reserved.
        </p>
      </div>
    </footer>
  )
}