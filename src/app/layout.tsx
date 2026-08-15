import "./globals.css";

export const metadata = {
  title: "Wireforge by ArmoredTurtle",
  description: "Wire harness documentation designer",
  icons: { icon: "/at-logo-mark.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
