import { getT } from '@/lib/i18n';
import Image from 'next/image';

export const HowTo = async () => {
  const { t } = await getT('common');

  return (
    <div className="flex flex-col items-center max-w-[800px]">
      <h2 className="text-5xl font-medium mt-16 mb-10">{t('setup.title')}</h2>
      <div className="text-2xl text-center m-4">{t('setup.step1')}</div>
      <Image
        src={'/assets/admin.png'}
        width={560}
        height={507}
        alt="Login and copy url from admin panel"
        className="mb-10"
      />
      <div className="text-2xl text-center m-4 mb-2">{t('setup.step2')}</div>
      <Image
        src={'/assets/setup1.png'}
        width={560}
        height={507}
        alt="Add new browser source"
        className="mb-10"
      />
      <div className="text-2xl text-center m-4 mb-0">{t('setup.step3')}</div>
      <Image
        src={'/assets/setup2.png'}
        width={720}
        height={681}
        alt="Put url from admin panel"
        className="mb-4"
      />
    </div>
  );
};
