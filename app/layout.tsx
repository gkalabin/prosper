import Header from "components/Header";
import { Metadata } from "next";
import "styles/global.css";

export const metadata: Metadata = {
  title: "Prosper",
  description: "Personal expense tracking",
  applicationName: "Prosper",
  authors: { name: "Gregory Kalabin" },
  robots: "noindex, nofollow",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
