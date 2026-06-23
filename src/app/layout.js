import "./globals.css";

export const metadata = {
  title: "ECCFBRC Tracker",
  description: "ECCF Bible Reading Challenge Tracker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
