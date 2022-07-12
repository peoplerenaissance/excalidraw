import ReactDOM from "react-dom";
import ExcalidrawApp from "./excalidraw-app";
import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";
import "./excalidraw-app/pwa";

Sentry.init({
  dsn: "https://4b3b5af234584bf4ad5adb2e30266844@o1112051.ingest.sentry.io/6567524",
  integrations: [new BrowserTracing()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
});

ReactDOM.render(<ExcalidrawApp />, document.getElementById("root"));
