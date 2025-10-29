export const metadata = {
  title: "Naturalization Quiz",
  description: "Randomized quiz with persistent stats"
};

import "./globals.css";
import React from "react";
import { inlineThemeInitScript } from "@/lib/theme";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: inlineThemeInitScript }} />
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  );
}


