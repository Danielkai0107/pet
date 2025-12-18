export const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-orange-200 rounded-full animate-ping opacity-75"></div>
          <div className="absolute top-0 left-0 w-full h-full border-4 border-t-[#f86f03] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600 text-sm font-medium">載入中...</p>
      </div>
    </div>
  );
};
