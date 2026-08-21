import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base button styles with elevate system for hover/active states.
  // All buttons use pill shape per DESIGN_BI.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-elevate active-elevate-2",
  {
    variants: {
      variant: {
        default:
          // Solid cyan primary button — the only chromatic filled element
          "bg-primary text-primary-foreground border border-primary-border",
        destructive:
          // Destructive action button with matching border
          "bg-destructive text-destructive-foreground border border-destructive-border",
        outline:
          // Ghost-style secondary action with hairline border
          "bg-transparent text-[#0c0a09] border border-[#e8e6e5] shadow-xs active:shadow-none",
        secondary:
          // Subtle stone filled button for secondary actions
          "bg-[#f5f5f4] text-[#0c0a09] border border-[#e8e6e5]",
        ghost:
          // Transparent quiet button for low-priority actions
          "border border-transparent text-[#0c0a09]",
      },
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-full px-3 text-xs",
        lg: "min-h-10 rounded-full px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
