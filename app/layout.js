import { Providers } from './providers';
import './globals.css';

export const metadata = {
  title: 'School Crypto App',
  description: 'Token management system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}