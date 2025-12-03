'use client';

export default function MarketingPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Marketing Studio</h1>
      <p className="text-gray-600 mb-8">Generate marketing content with AI</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {['Email Campaign', 'Social Media Post', 'Blog Article', 'Ad Copy', 'Twitter Thread', 'LinkedIn Post'].map((type) => (
          <div key={type} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{type}</h3>
            <p className="text-sm text-gray-600">Create engaging {type.toLowerCase()} with AI assistance</p>
          </div>
        ))}
      </div>
    </div>
  );
}
