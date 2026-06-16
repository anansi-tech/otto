import type { ReactNode } from "react";
import { BRAND } from "@/lib/config";

export const metadata = {
  title: BRAND,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
