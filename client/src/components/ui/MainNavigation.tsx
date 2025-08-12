'use client'

import { 
  HomeIcon,
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import { useRouter, usePathname } from 'next/navigation'
import React from 'react'

interface NavigationItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  badge?: string
  showLabel?: boolean // 라벨 표시 여부 제어
}

interface MainNavigationProps {
  className?: string
  variant?: 'header' | 'sidebar'
}

const MainNavigation: React.FC<MainNavigationProps> = ({
  className = '',
  variant = 'header'
}) => {
  const router = useRouter()
  const pathname = usePathname()

  // 🔥 요구사항대로 수정된 네비게이션 아이템
  const navigationItems: NavigationItem[] = [
    {
      id: 'timeline',
      label: 'Timeline', 
      href: '/timeline',
      icon: HomeIcon, // 홈 아이콘으로 변경
      showLabel: true, // 라벨 표시
    },
    {
      id: 'explore',
      label: 'Explore',
      href: '/explore',
      icon: MagnifyingGlassIcon,
      showLabel: false, // 라벨 숨김 (아이콘만)
    },
    {
      id: 'my',
      label: 'My Profile',
      href: '/my',
      icon: UserIcon,
      showLabel: false, // 라벨 숨김 (아이콘만)
    },
    {
      id: 'myroom',
      label: 'My Room',
      href: '/myroom',
      icon: CalendarIcon,
      showLabel: true, // 라벨 표시
    },
  ]

  const handleNavigate = (href: string) => {
    router.push(href)
  }

  const isActive = (href: string) => {
    return pathname.startsWith(href) || (href === '/my' && pathname === '/')
  }

  if (variant === 'header') {
    return (
      <nav className={`flex items-center space-x-1 ${className}`}>
        {navigationItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.href)}
              className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              aria-label={`Navigate to ${item.label}`}
              title={item.label} // 툴팁으로 라벨 표시
            >
              <Icon className="h-4 w-4" />
              {/* showLabel이 true인 경우만 라벨 표시 */}
              {item.showLabel && (
                <span className="hidden md:block">{item.label}</span>
              )}
              {item.badge && (
                <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    )
  }

  // sidebar variant - 사이드바에서는 모든 라벨 표시
  return (
    <nav className={`space-y-1 ${className}`}>
      {navigationItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        
        return (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.href)}
            className={`group flex w-full items-center rounded-lg px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            aria-label={`Navigate to ${item.label}`}
          >
            <Icon className={`mr-3 h-5 w-5 ${active ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'}`} />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                {item.badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

export default MainNavigation