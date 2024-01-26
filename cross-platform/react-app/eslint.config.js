const iTwinPlugin = require("@itwin/eslint-plugin");

module.exports = [
  {
    files: ["**/*.{ts,tsx}"],
    ...iTwinPlugin.configs.iTwinjsRecommendedConfig,
  },
  {
    files: ["**/*.{ts,tsx}"],
    ...iTwinPlugin.configs.jsdocConfig,
  },
  {
    files: ["**/*.tsx"],
    ...iTwinPlugin.configs.uiConfig,
  },
  {
    languageOptions: {
      parserOptions: {
        project: [
          "./tsconfig.json",
          "./tsconfig.backend.json"
        ]
      }
    },
    rules: {
      "no-console": "off",
      "nonblock-statement-body-position": "off",
      "@itwin/no-internal-barrel-imports": "off",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-static-element-interactions": "off"
    }
  }
];
