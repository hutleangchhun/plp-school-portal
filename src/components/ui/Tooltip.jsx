import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cva } from "class-variance-authority"
import { cn } from "@/utils/cn"

export function TooltipProvider({ children, ...props }) {
  return <TooltipPrimitive.Provider {...props}>{children}</TooltipPrimitive.Provider>;
}

const tooltipVariants = cva(
  "z-50 overflow-hidden rounded-md border bg-white p-4 text-sm text-gray-900 shadow-md animate-in fade-in-0 zoom-in-95",
  {
    variants: {},
    defaultVariants: {},
  }
)

const Tooltip = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger asChild>{props.children}</TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(tooltipVariants(), className)}
        {...props}
      >
        {props.content}
        <TooltipPrimitive.Arrow className="fill-white" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>
))
Tooltip.displayName = "Tooltip"

export { Tooltip }
