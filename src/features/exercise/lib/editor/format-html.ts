interface FormatterModules {
  prettier: typeof import("prettier/standalone");
  html: typeof import("prettier/plugins/html");
}

export interface FormattedHtml {
  formatted: string;
  cursorOffset: number;
}

let formatterModulesPromise: Promise<FormatterModules> | null = null;

async function loadFormatterModules(): Promise<FormatterModules> {
  if (!formatterModulesPromise) {
    formatterModulesPromise = Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/html"),
    ])
      .then(([prettier, html]) => ({
        prettier,
        html,
      }))
      .catch((error: unknown) => {
        formatterModulesPromise = null;
        throw error;
      });
  }

  return formatterModulesPromise;
}

export async function formatHtml(
  source: string,
  cursorOffset: number,
): Promise<FormattedHtml> {
  const { prettier, html } = await loadFormatterModules();

  return prettier.formatWithCursor(source, {
    parser: "html",
    plugins: [html],
    cursorOffset,
    embeddedLanguageFormatting: "off",
    tabWidth: 2,
    useTabs: false,
  });
}
