"use client";

import { LanguageProvider } from "../lib/i18n";

export default function Providers({ children }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
