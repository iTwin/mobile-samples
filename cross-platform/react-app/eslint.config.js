const iTwinPlugin = require("@itwin/eslint-plugin");

module.exports = [
  {
    ignores: [
      "src/mobile-ui-react/images-tsx/**"
    ],
    files: ["**/*.{ts,tsx}"],
    ...iTwinPlugin.configs.iTwinjsRecommendedConfig,
  },
  {
    ignores: [
      "src/mobile-ui-react/images-tsx/**"
    ],
    files: ["**/*.{ts,tsx}"],
    ...iTwinPlugin.configs.jsdocConfig,
  },
  {
    ignores: [
      "src/mobile-ui-react/images-tsx/**"
    ],
    files: ["**/*.tsx"],
    ...iTwinPlugin.configs.uiConfig,
  },
  {
    rules: {
      "no-console": "off",
      "@itwin/no-internal": "warn",
      "@itwin/no-internal-barrel-imports": "off",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-static-element-interactions": "off"
    }
  },
  {
    languageOptions: {
      parserOptions: {
        project: [
          "./tsconfig.json",
          "./tsconfig.backend.json"
        ]
      },
    }
  },
  // {
  //   extends: [
  //     "plugin:@itwin/ui",
  //     "plugin:@itwin/eslint-plugin/recommended",
  //     "plugin:@itwin/eslint-plugin/jsdoc",
  //     "plugin:@itwin/eslint-plugin/ui"
  //   ],
  // }
];
