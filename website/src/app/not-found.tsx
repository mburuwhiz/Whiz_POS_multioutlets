import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-white px-4 text-center">
      <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-6xl font-black text-slate-900 mb-4 tracking-tight">404</h1>
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Page not found</h2>
      <p className="text-slate-600 max-w-md mx-auto mb-8 text-lg">
        Sorry, we could not find the page you are looking for. It might have been moved or does not exist.
      </p>
      <div className="flex gap-4">
        <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors shadow-sm">
          Go back home
        </Link>
        <Link href="/contact" className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-medium py-3 px-6 rounded-lg transition-colors border border-slate-200">
          Contact support
        </Link>
      </div>
    </div>
  );
}
