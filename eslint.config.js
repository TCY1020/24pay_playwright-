import js from "@eslint/js"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import globals from "globals"

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // 箭頭函式前後要有空白：a=>b -> a => b
      "arrow-spacing": ["error", { before: true, after: true }],
      // 多行最後一個項目要加尾逗號：{ a: 1 }(多行) -> { a: 1, }
      "comma-dangle": ["error", "always-multiline"],
      // 逗號前不能有空白、逗號後要有空白：a,b -> a, b
      "comma-spacing": ["error", { before: false, after: true }],
      // 強制 2 空白縮排，switch case 內容往內 1 層
      indent: ["error", 2, { SwitchCase: 1 }],
      // 物件 key 的冒號後要有空白：{ a:1 } -> { a: 1 }
      "key-spacing": ["error", { afterColon: true }],
      // 多行物件/解構要換行且保持一致：
      // { a, b }(單行) OK；若拆成多行，左右大括號也要在新行
      "object-curly-newline": ["error", { consistent: true, multiline: true }],
      // 物件大括號內要有空白：{a: 1} -> { a: 1 }
      "object-curly-spacing": ["error", "always"],
      // 物件可簡寫時必須簡寫：{ name: name } -> { name }
      "object-shorthand": ["error", "always"],
      // return 前面要留一個空白行，提升可讀性
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
      ],
      // 不允許句尾分號：const a = 1; -> const a = 1
      semi: ["error", "never"],
      // export 排序（例如 named exports 依規則整理）
      "simple-import-sort/exports": "error",
      // import 自動分組與排序，讓 import 區塊整齊
      "simple-import-sort/imports": "error",
    },
  },
]