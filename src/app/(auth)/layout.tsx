import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { Sparkles, ImageIcon, Zap, Target } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
       <div className="flex min-h-screen bg-white">
      {/* Left Side - Branding */}
      <div className="relative hidden overflow-hidden bg-black lg:flex lg:w-1/2">
        {/* White Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        {/* Content Container */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 w-fit">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              Air One Studio
            </span>
          </Link>

            {/* Hero Content */}
          <div className="max-w-md">
            <h1 className="text-5xl leading-[1.1] font-bold text-white xl:text-6xl tracking-tight">
              Sign in to Air One studio
            </h1>
          </div>
          
          {/* Empty div for spacing (pushes content to middle) */}
          <div />
        </div>
      </div>

           
        {/* Right Side - Auth Form */}
        <div className="flex flex-1 flex-col justify-center bg-gradient-to-br from-slate-50 to-blue-50/30 px-6 py-12 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
           {/* Mobile Logo */}
          <div className="mb-8 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black shadow-sm">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-black tracking-tight">
                Air One Studio
              </span>
            </Link>
          </div>

            {/* Auth Form Container */}
            <div>{children}</div>

            {/* Footer Link */}
            <p className="mt-6 text-center text-sm text-slate-600">
              Back to{" "}
              <Link
                href="/"
                className="font-medium text-blue-600 transition-colors hover:text-blue-500"
              >
                homepage
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Providers>
  );
}