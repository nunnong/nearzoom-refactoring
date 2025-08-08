import Image from "next/image"

const images = [
  {
    src: "/friends.png",
    alt: "Friends with colorful sunglasses"
  },
  {
    src: "/family.png",
    alt: "Family walking on beach"
  },
  {
    src: "/couple.png",
    alt: "Couple silhouette making heart shape"
  }
]

export default function ImageGallery() {
  return (
    <>
      {images.map((image, index) => (
        <div key={index} className="flex-1 max-w-md mx-auto md:mx-0">
          <div className="relative aspect-[4/3] rounded-2xl md:rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>
      ))}
    </>
  )
}