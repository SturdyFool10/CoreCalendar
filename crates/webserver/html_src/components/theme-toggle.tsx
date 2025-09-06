"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDark(true)
      document.documentElement.classList.add("dark")
    } else {
      setIsDark(false)
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)

    if (newTheme) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="relative w-16 h-8 rounded-full p-0 overflow-hidden transition-all duration-300 bg-transparent"
    >
      {/* Background */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-500",
          isDark
            ? "bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-800"
            : "bg-gradient-to-r from-sky-300 via-blue-400 to-sky-300",
        )}
      >
        {/* Stars for dark mode */}
        {isDark && (
          <>
            <div className="absolute top-1 left-2 w-0.5 h-0.5 bg-white rounded-full animate-pulse" />
            <div className="absolute top-2 right-3 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-300" />
            <div className="absolute bottom-2 left-4 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-700" />
            <div className="absolute top-3 left-6 w-0.5 h-0.5 bg-white rounded-full animate-pulse delay-1000" />
          </>
        )}

        {/* Cloud for light mode */}
        {!isDark && (
          <div className="absolute top-1.5 right-2 w-3 h-1.5 bg-white rounded-full opacity-80">
            <div className="absolute -left-1 top-0.5 w-2 h-1 bg-white rounded-full" />
            <div className="absolute -right-0.5 top-0.5 w-1.5 h-1 bg-white rounded-full" />
          </div>
        )}
      </div>

      {/* Toggle circle with sun/moon */}
      <div
        className={cn(
          "absolute top-0.5 w-7 h-7 rounded-full transition-all duration-300 flex items-center justify-center",
          isDark ? "left-0.5 bg-slate-800 text-yellow-300" : "left-8 bg-yellow-400 text-orange-600",
        )}
      >
        {isDark ? (
          // Moon with craters
          <div className="relative w-4 h-4 bg-slate-300 rounded-full">
            <div className="absolute top-1 left-1 w-1 h-1 bg-slate-400 rounded-full" />
            <div className="absolute bottom-1 right-1 w-0.5 h-0.5 bg-slate-400 rounded-full" />
          </div>
        ) : (
          // Sun with rays
          <div className="relative">
            <div className="w-3 h-3 bg-orange-500 rounded-full" />
            <div className="absolute inset-0 animate-spin">
              <div className="absolute -top-1 left-1/2 w-0.5 h-1 bg-orange-500 transform -translate-x-1/2" />
              <div className="absolute -bottom-1 left-1/2 w-0.5 h-1 bg-orange-500 transform -translate-x-1/2" />
              <div className="absolute -left-1 top-1/2 w-1 h-0.5 bg-orange-500 transform -translate-y-1/2" />
              <div className="absolute -right-1 top-1/2 w-1 h-0.5 bg-orange-500 transform -translate-y-1/2" />
            </div>
          </div>
        )}
      </div>
    </Button>
  )
}
