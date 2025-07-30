export default function HoverCard() {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="relative w-80 h-48 rounded-lg overflow-hidden group transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105">
          {/* 背景层 */}
          <div className="absolute inset-0 bg-gray-300 transition-all duration-300 group-hover:bg-black/80"></div>
          
          {/* 文字层 */}
          <div className="absolute inset-0 flex items-center justify-center text-white text-lg font-semibold opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            这里是悬浮文字
          </div>
        </div>
      </div>
    );
  }