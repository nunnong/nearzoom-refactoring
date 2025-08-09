import Header from "./Header"
import HeroSection from "./HeroSection"
import GallerySection from "./GallerySection"

interface CreativeSectionProps {
  isLoggedIn: boolean
  onLogin: () => void
  onLogout: () => void
  onMyPage: () => void
  onMyFeed: () => void
  onAfterLoginClick: () => void
}

export default function CreativeSection({
  isLoggedIn,
  onLogin,
  onLogout,
  onMyPage,
  onMyFeed,
  onAfterLoginClick
}: CreativeSectionProps) {
  return (
    <div className="bg-stone-100 p-4 md:p-8">
      <Header 
        isLoggedIn={isLoggedIn}
        onLogin={onLogin}
        onLogout={onLogout}
        onMyPage={onMyPage}
        onMyFeed={onMyFeed}
      />
      
      <HeroSection 
        isLoggedIn={isLoggedIn}
        onAfterLoginClick={onAfterLoginClick}
      />
      
      <GallerySection />
    </div>
  )
}