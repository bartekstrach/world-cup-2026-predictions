export default function PredictionsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-9 bg-gray-200 rounded w-64 animate-pulse" />
          <div className="h-5 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
