import * as React from "react";

type LogoProps = React.ComponentPropsWithoutRef<"svg">;

function Logo({ className, ...props }: LogoProps) {
  return (
    <svg
      aria-hidden="true"
      className={["size-5 shrink-0", className].filter(Boolean).join(" ")}
      data-slot="logo"
      fill="currentColor"
      focusable="false"
      viewBox="123 123 833 833"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Boostle's two-dot logomark. */}
      <circle cx="329" cy="540" r="206" />
      <circle cx="750" cy="540" r="206" />
    </svg>
  );
}

export { Logo };
export type { LogoProps };
