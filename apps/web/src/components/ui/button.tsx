import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// shadcn's button variants, mapped onto the site's own button styles (globals.css) instead of
// shadcn's theme tokens, which this site does not define. Kokonut UI's ParticleButton uses these.
const buttonVariants = cva(
  "gap-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "af-button-primary",
        secondary: "af-button-secondary",
        outline: "af-button-secondary",
        accent: "af-button bg-accent text-surface hover:bg-ink",
      },
      // af-button already sets a 44px touch target and padding.
      size: { default: "" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
