import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 px-6 py-12">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="h-16 w-16 rounded-[18px] bg-[#007aff] shadow-[0_4px_12px_rgba(0,122,255,0.3)] flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <div>
          <h1 className="text-[34px] font-bold tracking-tight text-black">Autonomous Commerce</h1>
          <p className="mt-3 text-[17px] leading-relaxed text-[#8e8e93] max-w-md mx-auto">
            YouTube is the storefront. Nokon turns a reel screenshot into a secure Razorpay order via AI agents.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <Link
          href="/store/sareedidi"
          className="ios-card p-5 flex items-center gap-4 transition-transform active:scale-[0.98]"
        >
          <div className="h-12 w-12 rounded-full bg-[#007aff]/10 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-[#007aff]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          </div>
          <div className="flex-1">
            <h2 className="text-[17px] font-semibold text-black">Buyer Portal</h2>
            <p className="text-[15px] text-[#8e8e93] mt-1 leading-snug">Upload a screenshot. Watch AI negotiate in real-time.</p>
          </div>
          <svg className="w-5 h-5 text-[#c6c6c8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </Link>
        
        <Link
          href="/dashboard"
          className="ios-card p-5 flex items-center gap-4 transition-transform active:scale-[0.98]"
        >
          <div className="h-12 w-12 rounded-full bg-[#34c759]/10 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-[#34c759]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <div className="flex-1">
            <h2 className="text-[17px] font-semibold text-black">Seller Dashboard</h2>
            <p className="text-[15px] text-[#8e8e93] mt-1 leading-snug">Manage catalog. Orders are verified via webhook.</p>
          </div>
          <svg className="w-5 h-5 text-[#c6c6c8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </Link>
      </div>
    </main>
  );
}
