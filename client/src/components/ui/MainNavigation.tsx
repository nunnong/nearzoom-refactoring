'use client'

import { 
  HomeIcon,
  RectangleStackIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  UserIcon, // 🔥 UsersIcon → UserIcon으로 변경 (프로필용)
  PencilSquareIcon
} from '@heroicons/react/24/outline'
import { useRouter, usePathname } from 'next/navigation'
import React from 'react'

interface NavigationItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  badge?: string
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

  const navigationItems: NavigationItem[] = [
    {
      id: 'timeline',
      label: 'Timeline',
      href: '/timeline',
      icon: HomeIcon,
    },
    {
      id: 'my-feed',
      label: 'My Feed',
      href: '/feed',
      icon: DocumentTextIcon,
    },
    {
      id: 'feed-edit', // 🔥 새로 추가: 피드 편집
      label: 'Edit Feed',
      href: '/feed/edit',
      icon: PencilSquareIcon,
    },
    {
      id: 'myroom',
      label: 'My Room',
      href: '/myroom',
      icon: RectangleStackIcon,
    },
    {
      id: 'explore',
      label: 'Explore',
      href: '/explore',
      icon: MagnifyingGlassIcon,
    },
    {
      id: 'profile', // 🔥 Follow → Profile로 변경
      label: 'Profile',
      href: '/profile',
      icon: UserIcon,
    },
  ]

  const handleNavigate = (href: string) => {
    router.push(href)
  }

  const isActive = (href: string) => {
    if (href === '/myroom') {
      return pathname === '/' || pathname === '/myroom'
    }
    // 🔥 피드 편집 페이지도 My Feed로 인식하지 않도록 수정
    if (href === '/feed') {
      return pathname === '/feed' // 정확히 /feed 경로만
    }
    return pathname.startsWith(href)
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
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:block">{item.label}</span>
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

  // sidebar variant
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