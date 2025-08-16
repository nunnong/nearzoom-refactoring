"use client"

export default function Footer() {
  return (
    <footer className="bg-black text-white relative">
      {/* 간단한 하단 정보 */}
      <div className="relative py-16">
        <div className="max-w-6xl mx-auto px-8 text-center">
          {/* 로고 */}
          <div className="mb-8">
            <h3 className="text-4xl font-light tracking-wide text-white" 
                style={{ fontFamily: 'Playfair Display, serif' }}>
              NEARZOOM
            </h3>
          </div>
          
          {/* 링크들 */}
          <div className="flex justify-center items-center space-x-8 mb-8 text-sm text-gray-400">
            <button className="hover:text-white transition-colors">정기구독</button>
            <span>|</span>
            <button className="hover:text-white transition-colors">회사소개</button>
            <span>|</span>
            <button className="hover:text-white transition-colors">광고/제휴</button>
            <span>|</span>
            <button className="hover:text-white transition-colors">개인정보 처리방침</button>
            <span>|</span>
            <button className="hover:text-white transition-colors">공지사항</button>
          </div>
          
          {/* 운영사 정보 */}
          <p className="text-xs text-gray-500 tracking-wider uppercase">
            NEARZOOM.CO.KR IS OPERATED BY NEARZOOM COMPANY
          </p>
        </div>
      </div>
    </footer>
  )
}