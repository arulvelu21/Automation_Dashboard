import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "Automation Dashboard",
  description: "Internal reporting for automation use cases",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="bg-brand-600 text-white">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/tesco-logo.png" alt="Tesco" className="h-7 w-auto object-contain" />
                <h1 className="text-xl font-semibold tracking-wide">Automation Dashboard</h1>
              </div>
              <nav className="flex items-center gap-6 text-sm">
                <a href="/" className="hover:underline underline-offset-4">Overview</a>
                <a href="/use-cases" className="hover:underline underline-offset-4">Use Cases</a>
                <a href="/use-cases/savings" className="hover:underline underline-offset-4">Savings</a>
                <a href="/reporting" className="hover:underline underline-offset-4">Reporting</a>
              </nav>
            </header>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 py-6">
          {children}
        </div>
      </body>
    </html>
  );
}
