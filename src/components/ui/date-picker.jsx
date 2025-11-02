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
import { formatDateKhmer } from "@/utils/formatters"

export function DatePicker({
  value,
  onChange,
  placeholder = "ជ្រើសរើសកាលបរិច្ឆេទ",
  className,
  disabled = false,
  fromYear = 1960,
  toYear = new Date().getFullYear(),
  fromDate,
  toDate,
  locale = "km",
  ...props
}) {
  const formatDisplayDate = (date) => {
    if (!date) return null;
    if (locale === "km") {
      return formatDateKhmer(date, "short");
    }
    return format(date, "PPP");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
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
          {value ? formatDisplayDate(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={disabled}
          captionLayout="dropdown-buttons"
          fromDate={fromDate || new Date(fromYear, 0, 1)}
          toDate={toDate || new Date(toYear, 11, 31)}
          initialFocus
          showOutsideDays={false}
        />
      </PopoverContent>
    </Popover>
  )
}