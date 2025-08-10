import GallerySection from "./GallerySection"
import Header from "./Header"
import HeroSection from "./HeroSection"


interface CreativeSectionProps {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onMyPage: () => void
  onMyFeed: () => void
  onAfterLoginClick: () => void
  user?: {
    name?: string
    email?: string
    profileImage?: string
  } | null
  isCreatingRoom?: boolean // 방 생성 중 여부
}

export default function CreativeSection({
  isLoggedIn,
  onLogin,
  onLogout,
  onMyPage,
  onMyFeed,
  onAfterLoginClick,
  user
}: CreativeSectionProps) {
  return (
    <div className="bg-stone-100 p-4 md:p-8">
      <Header 
        isLoggedIn={isLoggedIn}
        onLogin={onLogin}
        onLogout={onLogout}
        onMyPage={onMyPage}
        onMyFeed={onMyFeed}
        user={user}
      />
      
      <HeroSection 
        isLoggedIn={isLoggedIn}
        onAfterLoginClick={onAfterLoginClick}
      />
      
      <GallerySection />
    </div>
  )
}