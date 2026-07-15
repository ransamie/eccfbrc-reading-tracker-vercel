import "./globals.css";
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

export const metadata = {
  title: "ECCFBRC Tracker",
  description: "ECCF Bible Reading Challenge Tracker",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#238636",
};

import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.deferredPWA = null;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPWA = e;
              });
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
