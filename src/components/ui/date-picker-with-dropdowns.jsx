"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
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
  date,
  onChange,
  placeholder = "ជ្រើសរើសកាលបរិច្ឆេទ",
  className,
  disabled = false,
  fromYear = 1960,
  toYear = new Date().getFullYear(),
  fromDate,
  toDate,
  closeOnOutsideClick = true,
  ...props
}) {
  // Accept both 'value' and 'date' props for flexibility
  const dateValue = value || date
  const [open, setOpen] = React.useState(false)

  const handleOpenChange = (isOpen) => {
    if (!isOpen && !closeOnOutsideClick) {
      return;
    }
    setOpen(isOpen);
  }
  const [currentMonth, setCurrentMonth] = React.useState(
    dateValue ? new Date(dateValue.getFullYear(), dateValue.getMonth()) : new Date()
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
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal text-sm px-4 py-2 h-auto min-h-[38px]",
            !dateValue && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50",
            className
          )}
          disabled={disabled}
          {...props}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? <span className="text-sm">{formatDateKhmer(dateValue, "short")}</span> : <span className="text-sm">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center justify-center gap-2 p-2 border-b">
          <Select
            value={currentMonth.getMonth().toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-28 h-8 text-xs py-1">
              <SelectValue placeholder="ខែ" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] text-xs">
              {months.map((month, index) => (
                <SelectItem key={index} value={index.toString()} className="text-xs">
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={currentMonth.getFullYear().toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-20 h-8 text-xs py-1">
              <SelectValue placeholder="ឆ្នាំ" />
            </SelectTrigger>
            <SelectContent className="max-h-[200px] text-xs">
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()} className="text-xs">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Calendar
          mode="single"
          selected={dateValue}
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