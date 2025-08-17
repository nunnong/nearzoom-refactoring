'use client'

import Image from 'next/image'

interface MyRoomHeaderProps {
	user?: { name?: string | null; email?: string | null; profileImage?: string | null } | null
	onUploadSelfie: () => void
	onAccount: () => void
	onLogout: () => void
}

export default function MyRoomHeader({ user, onUploadSelfie, onAccount, onLogout }: MyRoomHeaderProps) {
	const initial = (user?.name || user?.email || 'U')?.charAt(0).toUpperCase()

	return (
		<header className="sticky top-0 z-40 border-b bg-white">
			<div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
				<h1 className="text-lg font-semibold text-gray-900">My Room</h1>
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
						{user?.profileImage ? (
							<Image src={user.profileImage} alt="프로필" width={40} height={40} className="object-cover w-full h-full" />
						) : (
							<span className="text-sm font-bold text-gray-600">{initial}</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						<button onClick={onUploadSelfie} className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">UPLOAD SELFIE</button>
						<button onClick={onAccount} className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-900 hover:bg-gray-200">ACCOUNT</button>
						<button onClick={onLogout} className="px-3 py-1.5 text-sm rounded-md bg-red-50 text-red-600 hover:bg-red-100">LOGOUT</button>
					</div>
				</div>
			</div>
		</header>
	)
}


