import type { RouteObject } from "react-router-dom";
import { HomePage, PlaceholderPage } from "../pages/home/HomePage";

export const appRoutes: RouteObject[] = [
  { path: "/", element: <HomePage /> },
  { path: "/work", element: <PlaceholderPage title="WORK" /> },
  { path: "/notes", element: <PlaceholderPage title="NOTES" /> },
  { path: "/about", element: <PlaceholderPage title="ABOUT" /> },
];
