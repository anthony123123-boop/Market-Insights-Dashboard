

export function LoadingState() {
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400 text-lg">Loading market data...</p>
        <p className="text-gray-500 text-sm mt-2">This may take a moment on first load</p>
      </div>
    </div>
  );
}

export default LoadingState;
