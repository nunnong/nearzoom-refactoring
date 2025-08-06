'use client'

import React from 'react'
import { useCursorStore } from '../providers/CursorProvider'

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
  const cursors = useCursorStore(state => state.cursors)
  const localCursor = useCursorStore(state => state.localCursor)
  const removingCursors = useCursorStore(state => state.removingCursors)
  
  // 디버깅용 로그 (LiveKit 기반)
  console.log('🎯 CursorOverlay (LiveKit):', {
    remoteCursors: cursors.size,
    remoteCursorsList: Array.from(cursors.entries()).map(([id, cursor]) => ({
      id,
      user: cursor.userName,
      pos: `${cursor.x},${cursor.y}`
    })),
    localCursor: localCursor ? `${localCursor.userName} at ${localCursor.x},${localCursor.y}` : null
  })
  
  return (
    <div className={`absolute inset-0 pointer-events-none z-50 ${className}`}>
      {/* 로컬 커서 표시 */}
      {localCursor && (
        <div
          className="absolute pointer-events-none transition-all duration-150 ease-out"
          style={{
            left: localCursor.x - 8, // 중심점 조정
            top: localCursor.y - 8,  // 중심점 조정
            transform: 'translate(0, 0)',
          }}
        >
          <CursorIcon color={localCursor.color} />
          <CursorLabel userName={`${localCursor.userName} (me)`} color={localCursor.color} />
        </div>
      )}
      
      {/* 다른 사용자 커서들 */}
      {Array.from(cursors.values()).map((cursor) => {
        const isRemoving = removingCursors.has(cursor.userId)
        return (
          <div
            key={cursor.userId}
            className={`absolute pointer-events-none transition-all duration-300 ease-out ${
              isRemoving ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
            }`}
            style={{
              left: cursor.x - 8, // 중심점 조정
              top: cursor.y - 8,  // 중심점 조정
              transform: 'translate(0, 0)',
              transitionProperty: 'opacity, transform',
              transitionDuration: '300ms',
              transitionTimingFunction: 'ease-out',
            }}
          >
            <CursorIcon color={cursor.color} />
            <CursorLabel userName={cursor.userName} color={cursor.color} />
          </div>
        )
      })}
      
      {/* 디버깅용 정보 */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-3 text-xs rounded max-w-xs">
        <div>Local: {localCursor ? '✓' : '✗'}</div>
        <div>Remote: {cursors.size}</div>
        {cursors.size > 0 && (
          <div className="mt-1 text-xs opacity-75">
            Users: {Array.from(cursors.values()).map(c => c.userName).join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}

export default CursorOverlay