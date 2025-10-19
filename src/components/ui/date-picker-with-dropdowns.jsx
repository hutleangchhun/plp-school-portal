"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDateKhmer } from "@/utils/formatters"

export function DatePickerWithDropdowns({
  value,
  onChange,
  placeholder = "ជ្រើសរើសកាលបរិច្ឆេទ",
  className,
  disabled = false,
  fromYear = 1960,
  toYear = new Date().getFullYear(),
  fromDate,
  toDate,
  ...props
}) {
  const [open, setOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState(
    value ? new Date(value.getFullYear(), value.getMonth()) : new Date()
  )

  const months = [
    "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
    "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
  ]

  // Generate all years for scrollable dropdown
  const years = Array.from(
    { length: toYear - fromYear + 1 },
    (_, i) => toYear - i // Reverse order (newest first)
  )

  const handleMonthChange = (monthIndex) => {
    const newMonth = new Date(currentMonth.getFullYear(), parseInt(monthIndex))
    setCurrentMonth(newMonth)
  }

  const handleYearChange = (year) => {
    const newMonth = new Date(parseInt(year), currentMonth.getMonth())
    setCurrentMonth(newMonth)
  }

  const handleDateSelect = (date) => {
    onChange?.(date)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          disabled={disabled}
          {...props}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDateKhmer(value, "short") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center justify-center gap-2 p-3 border-b">
          <Select
            value={currentMonth.getMonth().toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="ខែ" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {months.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={currentMonth.getFullYear().toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-20">
              <SelectValue placeholder="ឆ្នាំ" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          fromDate={fromDate || new Date(fromYear, 0, 1)}
          toDate={toDate || new Date(toYear, 11, 31)}
          disabled={disabled}
          hideNavigation
        />
      </PopoverContent>
    </Popover>
  )
}