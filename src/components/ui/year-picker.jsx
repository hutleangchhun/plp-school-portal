"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function YearPicker({
  value,
  onChange,
  placeholder = "ជ្រើសរើសឆ្នាំ",
  className,
  disabled = false,
  fromYear = 1960,
  toYear = new Date().getFullYear() + 5,
  ...props
}) {
  const [open, setOpen] = React.useState(false)
  const [startYear, setStartYear] = React.useState(() => {
    const currentYear = value ? parseInt(value) : toYear
    // Round down to nearest decade
    let decade = Math.floor(currentYear / 10) * 10
    // Ensure it's within valid range: can't start before fromYear, and must leave room for 12 years
    const minStart = fromYear
    const maxStart = Math.max(fromYear, toYear - 11)
    decade = Math.max(minStart, Math.min(decade, maxStart))
    return decade
  })

  // Get 12 years for the calendar view (current decade)
  const yearsInView = Array.from({ length: 12 }, (_, i) => startYear + i)

  const handleYearChange = (year) => {
    onChange?.(year.toString())
    setOpen(false)
  }

  const handlePrevDecade = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const minStart = fromYear
    const maxStart = Math.max(fromYear, toYear - 11)
    const newStartYear = startYear - 10
    setStartYear(Math.max(newStartYear, minStart))
  }

  const handleNextDecade = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const minStart = fromYear
    const maxStart = Math.max(fromYear, toYear - 11)
    const newStartYear = startYear + 10
    setStartYear(Math.min(newStartYear, maxStart))
  }

  const displayValue = value ? `${value}` : placeholder
  const selectedYear = value ? parseInt(value) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between text-left font-normal py-2 h-auto min-h-[36px]",
            !value && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          disabled={disabled}
          {...props}
        >
          <span className="text-sm">{displayValue}</span>
          <ChevronRight className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="w-[280px]">
          {/* Header with decade navigation */}
          <div className="flex items-center justify-between mb-2 gap-2">
            <button
              type="button"
              onClick={handlePrevDecade}
              className="h-7 w-7 p-0 flex items-center justify-center rounded border border-gray-300 cursor-pointer hover:bg-blue-100 hover:border-blue-400 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-xs font-semibold text-center flex-1">
              {startYear} - {startYear + 11}
            </div>

            <button
              type="button"
              onClick={handleNextDecade}
              className="h-7 w-7 p-0 flex items-center justify-center rounded border border-gray-300 cursor-pointer hover:bg-blue-100 hover:border-blue-400 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Calendar-like grid with 3 columns × 4 rows */}
          <div className="grid grid-cols-3 gap-1">
            {yearsInView.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => handleYearChange(year)}
                className={cn(
                  "h-9 text-xs font-medium rounded transition-colors cursor-pointer",
                  selectedYear === year
                    ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
