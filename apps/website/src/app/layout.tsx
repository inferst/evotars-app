import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Evotars',
  description:
    'Evotars turns your Twitch chat participants into interactive avatars on your stream. Boost engagement and grow your channel with customizable, game-like characters for your viewers.',
  keywords:
    'twitch, chat, avatars, stream, streamer, interactive, channel rewards, emotes, 7tv, bttv, ffz, obs, overlay',
  openGraph: {
    title: 'Evotars — Interactive Twitch Avatars for Chat viewers',
    description:
      'Evotars brings your Twitch chat to life with interactive, customizable avatars. Easy browser integration for OBS, channel rewards, BTTV, FFZ, 7TV emotes, and raid support.',
    url: 'https://evotars.inferst.com',
    locale: 'en_US',
    type: 'website',
    siteName: 'Evotars',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Script
          data-collect-dnt="true"
          async
          src="https://scripts.simpleanalyticscdn.com/latest.js"
        ></Script>
        <noscript>
          <img
            src="https://queue.simpleanalyticscdn.com/noscript.gif?collect-dnt=true"
            alt=""
            referrerPolicy="no-referrer-when-downgrade"
          />
        </noscript>
      </body>
    </html>
  );
}
