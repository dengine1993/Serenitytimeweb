import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "interactive-breath inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg hover:shadow-xl glow-primary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg hover:shadow-xl",
        outline: "glass-button text-foreground",
        secondary: "bg-gradient-to-br from-secondary to-accent text-secondary-foreground shadow-lg hover:shadow-xl glow-secondary",
        ghost: "hover:bg-white/10 hover:backdrop-blur-xl",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-glow",
        glass: "glass-card text-foreground hover:bg-white/10",
        accent: "bg-yellow-50 border-2 border-yellow-400 text-amber-600 hover:bg-yellow-100 hover:border-yellow-500 shadow-sm dark:bg-yellow-500/10 dark:border-yellow-500/50 dark:text-amber-400 dark:hover:bg-yellow-500/20 dark:hover:border-yellow-500",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
