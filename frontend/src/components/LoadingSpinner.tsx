/**
 * Loading spinner component for lazy-loaded routes
 */
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">Đang tải...</p>
      </div>
    </div>
  );
}
