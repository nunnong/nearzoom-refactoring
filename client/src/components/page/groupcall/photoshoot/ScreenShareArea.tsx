'use client'

import { useRef, useEffect } from 'react'

interface ParticipantWebcam {
  id: string
  name: string
  stream?: MediaStream
  nukiUrl?: string
}

interface ScreenShareAreaProps {
  screenStream?: MediaStream
  participantWebcams: ParticipantWebcam[]
  className?: string
}

export default function ScreenShareArea({
  screenStream,
  className = '',
}: ScreenShareAreaProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // 화면 공유 스트림 설정
  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream
    }
  }, [screenStream])

  return (
    <div className={`relative w-full h-[480px] bg-black rounded-xl overflow-hidden shadow-lg ${className}`}>
      {/* 공유화면 */}
      {screenStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-white bg-gradient-to-br from-gray-700 to-gray-900">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">화면 공유 대기 중</h3>
              <p className="text-gray-300">방장이 화면을 공유하면 촬영이 시작됩니다</p>
            </div>
          </div>
        </div>
      )}


      {/* 촬영 준비 상태 표시 */}
      {screenStream && (
        <div className="absolute top-4 right-4">
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            촬영 준비 완료
          </div>
        </div>
      )}
    </div>
  )
}

// 웹캠 비디오 컴포넌트 (별도 분리)
// function VideoComponent({ stream}: { stream: MediaStream; userName: string }) {
//   const videoRef = useRef<HTMLVideoElement>(null)

//   useEffect(() => {
//     if (videoRef.current && stream) {
//       videoRef.current.srcObject = stream
//     }
//   }, [stream])

//   return (
//     <video
//       ref={videoRef}
//       autoPlay
//       playsInline
//       muted
//       className="w-28 h-36 object-cover rounded-lg border-2 border-white shadow-md bg-white/30 backdrop-blur-sm"
//     />
//   )
