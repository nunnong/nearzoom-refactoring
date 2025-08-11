const steps = [
  {
    number: "01",
    title: "인생샷 업로드",
    description: "자신의 얼굴이 잘 드러난 사진 한 장을 업로드해 주세요."
  },
  {
    number: "02", 
    title: "사진 촬영",
    description: "친구들과 함께 사진을 찍고, 특별한 순간을 포착해 보세요."
  },
  {
    number: "03",
    title: "편집 및 공유", 
    description: "다양한 도구로 사진을 꾸미고, SNS에 공유해 보세요."
  }
]

export default function Footer() {
  return (
    <footer className="bg-black text-white py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="text-4xl font-bold mb-4 text-white font-serif">
                {step.number}
              </div>
              <h3 className="text-xl font-bold mb-4 text-white">
                {step.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center border-t border-gray-800 pt-8">
          <h3 className="text-2xl font-bold mb-4">NearZoom</h3>
          <p className="text-gray-400 mb-8">따로 또 같이, 어디서든 즐기는 네컷 사진</p>
          <p className="text-sm text-gray-500">© 2025 NearZoom. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}