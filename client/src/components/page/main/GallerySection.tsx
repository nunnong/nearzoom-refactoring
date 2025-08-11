import DecorativePadlocks from "./DecorativePadlocks"
import ImageGallery from "./ImageGallery"

export default function GallerySection() {
  return (
    <div className="relative flex flex-col md:flex-row gap-4 md:gap-6 justify-center max-w-7xl mx-auto">
      <DecorativePadlocks />
      <ImageGallery />
    </div>
  )
}