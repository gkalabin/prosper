import { AppProps } from "next/app";
import { SWRConfig } from "swr";
import "../styles/global.css";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <SWRConfig
      value={{
        refreshInterval: 500,
        fetcher: (resource, init) =>
          fetch(resource, init).then((res) => res.json()),
      }}
    >
      <Component {...pageProps} />
    </SWRConfig>
  );
};

export default App;
