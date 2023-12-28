import { DisplaySettings as DBDisplaySettings } from "@prisma/client";
import { DisplaySettings } from "lib/displaySettings";
import { Currency } from "lib/model/Currency";
import { Setter } from "lib/stateHelpers";
import { createContext, useContext, useState } from "react";

type SettableDisplaySettings = {
  displaySettings: DisplaySettings;
  setDbDisplaySettings: Setter<DBDisplaySettings>;
};

const DisplaySettingsContext = createContext<SettableDisplaySettings>(
  null as unknown as SettableDisplaySettings,
);

export const DisplaySettingsContextProvider = (props: {
  initialDbSettings: DBDisplaySettings;
  children: JSX.Element | JSX.Element[];
}) => {
  const [dbDisplaySettings, setDbDisplaySettings] = useState(
    props.initialDbSettings,
  );
  const displaySettings = new DisplaySettings(dbDisplaySettings);
  return (
    <DisplaySettingsContext.Provider
      value={{ displaySettings, setDbDisplaySettings }}
    >
      {props.children}
    </DisplaySettingsContext.Provider>
  );
};

export const useDisplaySettingsContext = () => {
  return useContext(DisplaySettingsContext);
};

export const useDisplayCurrency = (): Currency => {
  const { displaySettings } = useDisplaySettingsContext();
  return displaySettings.displayCurrency();
};
