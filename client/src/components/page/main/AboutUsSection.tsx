export default function AboutUsSection() {
  return (
    <div className="bg-white pt-4 pb-4 px-8 overflow-hidden">
      <div className="relative mb-8">
        <div className="flex whitespace-nowrap animate-scroll-left">
          {Array(5).fill(0).map((_, index) => (
            <h2 key={index} className="text-[120px] md:text-[175px] font-bold text-gray-800/10 mr-24 font-serif">
              ABOUT US
            </h2>
          ))}
        </div>
      </div>
    </div>
  )
}