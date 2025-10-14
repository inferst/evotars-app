import { Card } from '@/components/Card';
import { getT } from '@/lib/i18n';
import { MessageSquareText, Shirt, Smile, Terminal } from 'lucide-react';
import Image from 'next/image';

export const Features = async () => {
  const { t } = await getT('common');

  return (
    <>
      <h2 className="text-5xl font-medium mb-8 mt-8">{t('features.title')}</h2>
      <div className="text-center grid md:grid-cols-2 grid-cols-1 gap-6 mx-4 my-4 max-w-[1200px]">
        <Card
          icon={<Terminal />}
          title={t('features.commands.title')}
          description={t('features.commands.description')}
        />
        <Card
          icon={
            <Image
              src="/assets/twitch.svg"
              alt="Github logo"
              width={24}
              height={24}
              priority
              className="dark:invert"
            />
          }
          title={t('features.rewards.title')}
          description={t('features.rewards.description')}
        />
        <Card
          icon={<MessageSquareText />}
          title={t('features.emotes.title')}
          description={t('features.emotes.description')}
        />
        <Card
          icon={<Shirt />}
          title={t('features.customization.title')}
          description={t('features.customization.description')}
        />
        <Card
          icon={
            <Image
              src="/assets/twitch.svg"
              alt="Github logo"
              width={24}
              height={24}
              priority
              className="dark:invert"
            />
          }
          title={t('features.raids.title')}
          description={t('features.raids.description')}
        />
        <Card
          icon={<Smile />}
          title={t('features.web.title')}
          description={t('features.web.description')}
        />
      </div>
    </>
  );
};
