const iTwinPlugin = require("@itwin/eslint-plugin");

const customLanguageOptions = {
  sourceType: "module",
  parser: require("@typescript-eslint/parser"),
  parserOptions: {
    project: ["./tsconfig.backend.json", "./tsconfig.json"],
    ecmaVersion: "latest",
    ecmaFeatures: {
      jsx: true,
      modules: true,
    },
  },
};

module.exports = [
  {
    files: ["**/*.{ts,tsx}"],
    ...iTwinPlugin.configs.uiConfig,
    languageOptions: customLanguageOptions,
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-console": "off",
      "@itwin/no-internal-barrel-imports": "off",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-static-element-interactions": "off"
    },
  },
];