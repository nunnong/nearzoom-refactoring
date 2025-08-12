import Image from 'next/image'

const images = [
  {
    src: '/friends.png',
    alt: 'Friends with colorful sunglasses',
  },
  {
    src: '/family.png',
    alt: 'Family walking on beach',
  },
  {
    src: '/couple.png',
    alt: 'Couple silhouette making heart shape',
  },
]

export default function ImageGallery() {
  return (
    <>
      {images.map((image, index) => (
        <div key={index} className="mx-auto max-w-md flex-1 md:mx-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg transition-shadow duration-300 hover:shadow-xl md:rounded-3xl">
            <Image
              src={image.src}
              alt={image.alt}
              width={400}
              height={300}
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>
      ))}
    </>
  )
}
