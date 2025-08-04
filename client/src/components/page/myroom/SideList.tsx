'use client'

import React from 'react'
import { CameraIcon, UserIcon } from '@heroicons/react/24/outline'

interface MenuItem {
  id: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  onClick?: () => void
}

interface UserProfile {
  profileImage?: string
  email?: string
  name?: string
}

interface SideListProps {
  className?: string
  isOpen?: boolean
  userProfile?: UserProfile
  onUploadSelfie?: () => void
  onAccount?: () => void
  onClose?: () => void
}

const SideList: React.FC<SideListProps> = ({
  className = '',
  isOpen = true,
  userProfile,
  onUploadSelfie,
  onAccount,
  onClose,
}) => {
  const menuItems: MenuItem[] = [
    {
      id: 'upload-selfie',
      label: 'Upload Selfie',
      icon: CameraIcon,
      onClick: onUploadSelfie,
    },
    {
      id: 'account',
      label: 'Account',
      icon: UserIcon,
      onClick: onAccount,
    },
  ]

  const handleMenuClick = (item: MenuItem): void => {
    item.onClick?.()
    onClose?.()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 transform border-r border-slate-700/50 bg-slate-900/95 shadow-2xl shadow-black/25 backdrop-blur-md transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${className} `}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-slate-700/50 p-6">
            <h2 className="text-xl font-bold tracking-tight text-white">
              Menu
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 transition-colors hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </header>

          {/* Profile Section */}
          <div className="border-b border-slate-700/50 p-6">
            <div className="flex flex-col items-center space-y-3">
              {/* Profile Image */}
              <div className="relative">
                <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-700 ring-2 ring-slate-600">
                  {userProfile?.profileImage ? (
                    <img
                      src={userProfile.profileImage}
                      alt={userProfile.name || 'Profile'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      {userProfile ? (
                        <UserIcon className="h-8 w-8" />
                      ) : (
                        <div className="h-8 w-8 animate-pulse rounded-full bg-slate-600"></div>
                      )}
                    </div>
                  )}
                </div>
                <div
                  className={`absolute -right-1 -bottom-1 h-5 w-5 rounded-full ring-2 ring-slate-900 ${
                    userProfile ? 'bg-green-500' : 'animate-pulse bg-slate-600'
                  }`}
                ></div>
              </div>

              {/* User Info */}
              <div className="text-center">
                {userProfile?.name ? (
                  <p className="text-sm font-medium text-white">
                    {userProfile.name}
                  </p>
                ) : (
                  <div className="h-5 w-24 animate-pulse rounded bg-slate-600"></div>
                )}
                {userProfile?.email ? (
                  <p className="max-w-[200px] truncate text-xs text-slate-400">
                    {userProfile.email}
                  </p>
                ) : (
                  <div className="mt-1 h-4 w-32 animate-pulse rounded bg-slate-700"></div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1" role="list">
              {menuItems.map(item => {
                const IconComponent = item.icon
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleMenuClick(item)}
                      className="group flex w-full items-center rounded-lg px-4 py-3 text-left text-slate-300 transition-all duration-200 ease-in-out hover:bg-slate-800/50 hover:text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none active:scale-95"
                      type="button"
                      aria-label={`Navigate to ${item.label}`}
                    >
                      <IconComponent className="mr-3 h-5 w-5 text-slate-400 transition-colors group-hover:text-blue-400" />
                      <span className="font-medium transition-transform group-hover:translate-x-0.5">
                        {item.label}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer */}
          <footer className="border-t border-slate-700/50 p-4">
            <div className="text-center text-xs text-slate-500">
              © 2024 NearZoom
            </div>
          </footer>
        </div>
      </aside>
    </>
  )
}

export default SideList
