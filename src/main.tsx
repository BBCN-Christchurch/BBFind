import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import { UnsavedProvider } from "./Unsaved";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/manrope/latin-800.css";
import "./styles.css";
// GitHub Pages' 404 fallback stores a route in ?route=; restore it before routing.
const route = new URLSearchParams(location.search).get("route");
if (route?.startsWith("/") && !route.startsWith("//"))
  history.replaceState(
    null,
    "",
    `${import.meta.env.BASE_URL.replace(/\/$/, "")}${route}`,
  );
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider
      router={createBrowserRouter(
        [
          {
            path: "*",
            element: (
              <UnsavedProvider>
                <App />
              </UnsavedProvider>
            ),
          },
        ],
        { basename: import.meta.env.BASE_URL },
      )}
    />
  </React.StrictMode>,
);
