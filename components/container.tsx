"use client";

import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
}

export function Container({ children }: ContainerProps) {
  return (
    <div className="@container max-w-7xl mx-auto flex items-start justify-center min-h-screen py-8">
      <div className="w-full bg-pink-100 @sm:bg-blue-100 @md:bg-green-100 @lg:bg-yellow-100 p-8 rounded-lg transition-colors duration-300">
        {children}
      </div>
    </div>
  );
}
