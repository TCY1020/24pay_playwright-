import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "semi": ["error", "never"],
      "object-shorthand": ["error", "never"],
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" }
      ],
      "object-curly-spacing": ["error", "always"],
      
      // 強制箭頭函式 => 前後都要有空格
      "arrow-spacing": ["error", { "before": true, "after": true }]
    },
  },
];