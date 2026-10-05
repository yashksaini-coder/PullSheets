import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/tokens/fonts.css';
import '@/styles/tokens/colors.css';
import '@/styles/tokens/typography.css';
import '@/styles/tokens/spacing.css';
import '@/styles/tokens/radius.css';
import '@/styles/tokens/shadows.css';
import '@/styles/tokens/motion.css';
import '@/styles/tokens/base.css';
import './globals.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource-variable/manrope';
import '@fontsource-variable/instrument-sans';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource-variable/newsreader';
import '@/components/cards/cards.css';

export const metadata: Metadata = {
  title: 'Pullsheets — Pull requests, ready to post',
  description: 'Turn any GitHub pull request into a share-ready image or clip for X, LinkedIn and Instagram.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
