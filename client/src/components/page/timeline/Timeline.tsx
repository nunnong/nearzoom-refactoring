// src/components/page/timeline/Timeline.tsx - 완전히 재작성

'use client'

import React from 'react'
import InfiniteScrollTimeline from './InfiniteScrollTimeline'

// ============================================================================
// 🔥 단순화된 Timeline 컴포넌트 (InfiniteScrollTimeline 사용)
// ============================================================================

export interface TimelineProps {
  className?: string
  type?: 'timeline' | 'explore'
}

export const Timeline: React.FC<TimelineProps> = ({ 
  className = '',
  type = 'timeline'
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* InfiniteScrollTimeline 컴포넌트 사용 */}
      <InfiniteScrollTimeline 
        type={type}
        className="py-6"
      />
    </div>
  )
}

export default Timeline