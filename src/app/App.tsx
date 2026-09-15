import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { appRoutes } from "./router";
import "../styles/globals.css";

const router = createBrowserRouter(appRoutes);

export default function App() {
  return <RouterProvider router={router} />;
}
