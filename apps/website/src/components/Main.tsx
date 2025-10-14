import { Features } from '@/components/Features';
import { Login } from '@/components/Login';
import { getT } from '@/lib/i18n';
import Image from 'next/image';
import Link from 'next/link';
import { CSSProperties } from 'react';
import { EvotarsWrapper } from './EvotarsWrapper';

export const Main = async () => {
  const { t } = await getT('common');

  return (
    <div className="container mx-auto">
      <main className="items-center flex flex-col text-shadow-gray-400 text-shadow-xs font-light">
        <div className="m-6">
          <Link href="/" className="flex items-center p-2 text-6xl font-medium">
            <span className="block">E</span>
            <span className="block text-5xl">V</span>
            <span className="block">O</span>
            <span className="block text-5xl">T</span>
            <span className="block">A</span>
            <span className="block text-5xl">R</span>
            <span className="block">S</span>
          </Link>
        </div>
        <div className="text-2xl text-center m-4 max-w-[800px]">
          {t('intro.target')}
        </div>
        <div className="m-6">
          <Login />
        </div>
        <div
          className="flex justify-center bg-[url('/assets/obs.png')] bg-no-repeat bg-contain bg-top w-full max-w-[1200px] aspect-[var(--aspect)]"
          style={
            {
              '--aspect': '1.15/1',
            } as CSSProperties
          }
        >
          <EvotarsWrapper />
        </div>
        <div className="text-2xl text-center m-4 mb-10 font-light text-shadow-2xs text-shadow-gray-400 max-w-[800px]">
          {t('intro.description')}
        </div>
        <Features />
        {/* <HowTo /> */}
        {/* <div className="mb-24"> */}
        {/*   <Login /> */}
        {/* </div> */}
      </main>
      <footer className="text-sm border-t-1 border-[#3c3c3c] py-6 px-10 flex items-center mt-24">
        <a
          href="/terms"
          className="font-medium text-purple-600 dark:text-purple-500 hover:underline mr-4"
        >
          Terms of Use
        </a>
        <a
          href="/privacy"
          className="font-medium text-purple-600 dark:text-purple-500 hover:underline mr-4"
        >
          Privacy Policy
        </a>
        <div className="flex flex-1 justify-end items-center">
          <a href="https://github.com/inferst/evotars" target="_blank">
            <Image
              src="/assets/github.svg"
              alt="Github logo"
              width={40}
              height={40}
              priority
            />
          </a>
        </div>
      </footer>
    </div>
  );
};
