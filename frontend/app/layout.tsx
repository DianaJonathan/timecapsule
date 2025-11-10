import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "TimeCapsule - Encrypted Time-Locked Messages",
  description: "Create encrypted time capsules that unlock at a future date using Zama FHEVM technology",
  keywords: ["FHEVM", "encryption", "time capsule", "blockchain", "Zama"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white">
        <div className="min-h-screen flex flex-col">
          {/* Header with Deep Blue Background */}
          <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 shadow-xl border-b-4 border-red-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-14 h-14 bg-red-700 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
                      <span className="text-white font-bold text-2xl">⏰</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                      TimeCapsule
                    </h1>
                    <p className="text-sm text-blue-200 font-medium mt-0.5">
                      Encrypted Time-Locked Messages
                    </p>
                  </div>
                </div>
                <div className="hidden md:flex items-center space-x-3 bg-blue-950/50 px-4 py-2 rounded-lg border border-blue-700">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-100">
                    Powered by <span className="font-bold text-white">Zama FHEVM</span>
                  </span>
                </div>
              </div>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <Providers>{children}</Providers>
            </div>
          </main>

          {/* Footer with Deep Blue Background */}
          <footer className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 border-t-4 border-red-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center space-y-3">
                <p className="text-blue-300 text-xs">
                  Privacy-preserving encrypted time capsules secured on the blockchain
                </p>
                <div className="flex items-center justify-center space-x-2 text-xs text-blue-400">
                  <span>🔒</span>
                  <span>Secure</span>
                  <span>•</span>
                  <span>🔐</span>
                  <span>Encrypted</span>
                  <span>•</span>
                  <span>⏰</span>
                  <span>Time-Locked</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
