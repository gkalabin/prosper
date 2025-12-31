import {DisplaySettings} from '@/lib/displaySettings';
import {Currency} from '@/lib/model/Currency';
import {DisplaySettings as DBDisplaySettings} from '@prisma/client';
import {createContext, useContext} from 'react';

type SettableDisplaySettings = {
  displaySettings: DisplaySettings;
};

const DisplaySettingsContext = createContext<SettableDisplaySettings>(
  null as unknown as SettableDisplaySettings
);

export const DisplaySettingsContextProvider = (props: {
  dbSettings: DBDisplaySettings;
  children: React.ReactNode;
}) => {
  const displaySettings = new DisplaySettings(props.dbSettings);
  return (
    <DisplaySettingsContext.Provider value={{displaySettings}}>
      {props.children}
    </DisplaySettingsContext.Provider>
  );
};

export const useDisplaySettingsContext = () => {
  return useContext(DisplaySettingsContext);
};

export const useDisplayCurrency = (): Currency => {
  const {displaySettings} = useDisplaySettingsContext();
  return displaySettings.displayCurrency();
};
