import { zodResolver } from '@hookform/resolvers/zod';
import {
  UpdateSettingsDto,
  UpdateSettingsForm,
  defaultSettingsValues,
  updateSettingsDtoSchema,
} from '@repo/types';
import { useForm } from 'react-hook-form';
import { Form, FormField } from '../../ui/form';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Separator } from '../../ui/separator';
import { useTranslation } from 'react-i18next';
import { Input } from '../../ui/input';
import { ErrorMessage } from '@hookform/error-message';

type FormInput = UpdateSettingsDto;

export type SettingsFormProps = {
  data: UpdateSettingsForm;
  onUpdate: (data: UpdateSettingsForm) => void;
};

export function SettingsForm(props: SettingsFormProps) {
  const form = useForm<FormInput>({
    resolver: zodResolver(updateSettingsDtoSchema),
    values: props.data,
    defaultValues: defaultSettingsValues,
    mode: 'onChange',
  });

  const { t } = useTranslation();

  const handleSubmit = form.handleSubmit(
    (data) => {
      props.onUpdate(data);
    },
    (error) => {
      console.log('invalid: ', error);
    },
  );

  return (
    <Form {...form}>
      <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
        {t('SettingsForm.globalTitle', { defaultValue: 'Global' })}
      </h4>
      <Separator className="my-4" />
      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="lg:col-span-1 col-span-2">
          <Label htmlFor="maxEvotars" className="text-xl">
            {t('SettingsForm.maxEvotarsText', {
              defaultValue: 'Max Evotars',
            })}
          </Label>
        </div>
        <div className="lg:col-span-3 col-span-2">
          <FormField
            control={form.control}
            name={'maxEvotars'}
            render={() => {
              return (
                <Input
                  id="maxEvotars"
                  type="number"
                  min={1}
                  {...form.register('maxEvotars', {
                    setValueAs: (value) => {
                      const prev = form.getValues('maxEvotars');
                      const newValue =
                        value === '' ? prev : parseInt(value, 10);
                      return isNaN(newValue ?? 1) ? prev : newValue;
                    },
                  })}
                  onBlur={handleSubmit}
                  className="max-w-36"
                />
              );
            }}
          ></FormField>
          <ErrorMessage
            errors={form.formState.errors}
            name="maxEvotars"
            render={({ message }) => (
              <p className="col-start-2 col-span-3 text-sm mt-2 text-destructive">
                {message}
              </p>
            )}
          />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="lg:col-span-1 col-span-2">
          <Label htmlFor="fallingEvotars" className="text-xl">
            {t('SettingsForm.fallingEvotarsText', {
              defaultValue: 'Falling evotars',
            })}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t('SettingsForm.fallingEvotarsDescription', {
              defaultValue: 'Drop dude in the top of screen',
            })}
          </p>
        </div>
        <div className="lg:col-span-3 col-span-2">
          <FormField
            control={form.control}
            name={'fallingEvotars'}
            render={({ field }) => {
              return (
                <Switch
                  {...field}
                  id="fallingEvotars"
                  onCheckedChange={(value) => {
                    field.onChange(value);
                    handleSubmit();
                  }}
                  checked={field.value}
                  value={`${field.value}`}
                ></Switch>
              );
            }}
          ></FormField>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="lg:col-span-1 col-span-2">
          <Label htmlFor="showAnonymousEvotars" className="text-xl">
            {t('SettingsForm.spawnAnonymousViewersText', {
              defaultValue: 'Spawn anonymous viewers',
            })}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t('SettingsForm.spawnAnonymousViewersDescription', {
              defaultValue:
                "Viewers who don't chat will be spawned without names",
            })}
          </p>
        </div>
        <div className="lg:col-span-3 col-span-2">
          <FormField
            control={form.control}
            name={'showAnonymousEvotars'}
            render={({ field }) => {
              return (
                <Switch
                  {...field}
                  id="showAnonymousEvotars"
                  onCheckedChange={(value) => {
                    field.onChange(value);
                    handleSubmit();
                  }}
                  checked={field.value}
                  value={`${field.value}`}
                ></Switch>
              );
            }}
          ></FormField>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="lg:col-span-1 col-span-2">
          <Label htmlFor="showEmotes" className="text-xl">
            {t('SettingsForm.showEmotesText', {
              defaultValue: 'Show emotes',
            })}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t('SettingsForm.showEmotesDescription', {
              defaultValue: 'Evotars spit out emotes from chat messages',
            })}
          </p>
        </div>
        <div className="lg:col-span-3 col-span-2">
          <FormField
            control={form.control}
            name={'showEmotes'}
            render={({ field }) => {
              return (
                <Switch
                  {...field}
                  id="showEmotes"
                  onCheckedChange={(value) => {
                    field.onChange(value);
                    handleSubmit();
                  }}
                  checked={field.value ?? true}
                  value={`${field.value ?? true}`}
                ></Switch>
              );
            }}
          ></FormField>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="lg:col-span-1 col-span-2">
          <Label htmlFor="showMessages" className="text-xl">
            {t('SettingsForm.showMessagesText', {
              defaultValue: 'Show messages',
            })}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t('SettingsForm.showMessagesDescription', {
              defaultValue: 'Evotars show the text of chat messages',
            })}
          </p>
        </div>
        <div className="lg:col-span-3 col-span-2">
          <FormField
            control={form.control}
            name={'showMessages'}
            render={({ field }) => {
              return (
                <Switch
                  {...field}
                  id="showMessages"
                  onCheckedChange={(value) => {
                    field.onChange(value);
                    handleSubmit();
                  }}
                  checked={field.value ?? true}
                  value={`${field.value ?? true}`}
                ></Switch>
              );
            }}
          ></FormField>
        </div>
      </div>
      <Separator className="mt-4 mb-8" />
      <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
        {t('SettingsForm.raidTitle', {
          defaultValue: 'Raid',
        })}
      </h4>
      <Separator className="my-4" />
      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="lg:col-span-1 col-span-2">
          <Label htmlFor="fallingRaiders" className="text-xl">
            {t('SettingsForm.fallingRaidersText', {
              defaultValue: 'Falling raiders',
            })}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t('SettingsForm.fallingRaidersDescription', {
              defaultValue: 'Drop raiders in the top of screen',
            })}
          </p>
        </div>
        <div className="lg:col-span-3 col-span-2">
          <FormField
            control={form.control}
            name={'fallingRaiders'}
            render={({ field }) => {
              return (
                <Switch
                  {...field}
                  id="fallingRaiders"
                  onCheckedChange={(value) => {
                    field.onChange(value);
                    handleSubmit();
                  }}
                  checked={field.value}
                  value={`${field.value}`}
                ></Switch>
              );
            }}
          ></FormField>
        </div>
      </div>
      <Separator className="mt-4 mb-8" />
      <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
        {t('SettingsForm.usersTitle', {
          defaultValue: 'Users',
        })}
      </h4>
      <Separator className="my-4" />
      <div className="grid grid-cols-4 gap-4 mt-4">
        <div className="lg:col-span-1 col-span-2">
          <Label htmlFor="hiddenUsers" className="text-xl">
            {t('SettingsForm.hiddenUsersText', {
              defaultValue: 'Hidden Users',
            })}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t('SettingsForm.hiddenUsersDescription', {
              defaultValue: 'Hidden Users',
            })}
          </p>
        </div>
        <div className="lg:col-span-3 col-span-2">
          <FormField
            control={form.control}
            name={'hiddenUsers'}
            render={() => {
              return (
                <Input
                  id="hiddenUsers"
                  {...form.register('hiddenUsers')}
                  onBlur={handleSubmit}
                />
              );
            }}
          ></FormField>
        </div>
      </div>
      <Separator className="mt-4 mb-8" />
    </Form>
  );
}
