"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}) {
  const [progress, setProgress] = React.useState(0)
  
  // Animate the progress value
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setProgress(value || 0)
    }, 100)
    return () => clearTimeout(timeout)
  }, [value])

  return (
    (<ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/10 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}>
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 transition-transform duration-700 ease-in-out bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
        style={{ transform: `translateX(-${100 - progress}%)` }} />
    </ProgressPrimitive.Root>)
  );
}

export { Progress }
