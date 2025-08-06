'use client'

import React from 'react'
import { useCursorStore, useRealtimeLocalCursor } from '../providers/CursorProvider'

// CSS 애니메이션 정의
const cursorAnimationStyles = `
  @keyframes fadeInScale {
    0% {
      opacity: 0;
      transform: scale(0.8);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes fadeOutScale {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(0.6);
    }
  }
`

interface CursorOverlayProps {
  className?: string
}

const CursorIcon: React.FC<{ color: string }> = ({ color }) => (
  <div 
    className="w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none transition-transform hover:scale-110"
    style={{ backgroundColor: color }}
  />
)

const CursorLabel: React.FC<{ userName: string; color: string }> = ({ userName, color }) => (
  <div
    className="absolute top-6 left-6 px-2 py-1 rounded text-xs text-white whitespace-nowrap pointer-events-none select-none transition-opacity"
    style={{ 
      backgroundColor: color,
      fontSize: '11px',
      fontWeight: '500',
      boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
    }}
  >
    {userName}
  </div>
)

export const CursorOverlay: React.FC<CursorOverlayProps> = ({ className = '' }) => {
  // 원격 커서들 (DataChannel로 수신)
  const remoteCursors = useCursorStore(state => state.cursors)
  const removingCursors = useCursorStore(state => state.removingCursors)
  
  // 실시간 로컬 커서 (React state로 즉시 반응)
  const { localCursor, isActive } = useRealtimeLocalCursor()
  
  // 디버깅용 로그 (하이브리드 시스템)
  console.log('🎯 CursorOverlay (Hybrid):', {
    realtimeLocalCursor: localCursor ? `${localCursor.userName} at ${localCursor.x},${localCursor.y}` : null,
    isLocalActive: isActive,
    remoteCursors: remoteCursors.size,
    remoteCursorsList: Array.from(remoteCursors.entries()).map(([id, cursor]) => ({
      id,
      user: cursor.userName,
      pos: `${cursor.x},${cursor.y}`
    }))
  })
  
  return (
    <div className={`absolute inset-0 pointer-events-none z-50 ${className}`}>
      {/* 실시간 로컬 커서 표시 (즉시 반응) */}
      {localCursor && isActive && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: localCursor.x - 8, // 중심점 조정
            top: localCursor.y - 8,  // 중심점 조정
            transform: 'translate(0, 0)',
            // 실시간이므로 transition 없음 (더 반응적)
          }}
        >
          <CursorIcon color={localCursor.color} />
          <CursorLabel userName={`${localCursor.userName} (me)`} color={localCursor.color} />
        </div>
      )}
      
      {/* 원격 사용자 커서들 (DataChannel로 수신, 부드러운 애니메이션) */}
      {Array.from(remoteCursors.values()).map((cursor) => {
        const isRemoving = removingCursors.has(cursor.userId)
        return (
          <div
            key={cursor.userId}
            className={`absolute pointer-events-none ${
              isRemoving ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
            }`}
            style={{
              left: cursor.x - 8, // 중심점 조정
              top: cursor.y - 8,  // 중심점 조정
              transform: 'translate(0, 0)',
              // 부드러운 위치 전환 (자연스러운 곡선 보간)
              transition: isRemoving 
                ? 'opacity 300ms ease-out, transform 300ms ease-out' 
                : 'left 100ms cubic-bezier(0.4, 0.0, 0.2, 1), top 100ms cubic-bezier(0.4, 0.0, 0.2, 1), opacity 300ms ease-out, transform 300ms ease-out',
            }}
          >
            <CursorIcon color={cursor.color} />
            <CursorLabel userName={cursor.userName} color={cursor.color} />
          </div>
        )
      })}
      
      {/* 디버깅용 정보 (하이브리드 시스템) */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-3 text-xs rounded max-w-xs">
        <div className="text-yellow-300 font-semibold mb-1">Hybrid Cursor System</div>
        <div>Local (Realtime): {localCursor && isActive ? '✓' : '✗'}</div>
        <div>Remote (DataChannel): {remoteCursors.size}</div>
        {remoteCursors.size > 0 && (
          <div className="mt-1 text-xs opacity-75">
            Users: {Array.from(remoteCursors.values()).map(c => c.userName).join(', ')}
          </div>
        )}
        <div className="mt-1 text-xs text-green-300">
          Local: {localCursor ? `${localCursor.x},${localCursor.y}` : 'None'}
        </div>
      </div>
    </div>
  )
}

export default CursorOverlay