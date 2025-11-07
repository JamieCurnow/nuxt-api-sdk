// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
// import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

// Run `npx @eslint/config-inspector` to inspect the resolved config interactively
export default createConfigForNuxt({
  features: {
    // Rules for module authors
    tooling: true,
    // Rules for formatting
    stylistic: false,
  },
  dirs: {
    src: [
      './playground',
    ],
  },
})
  .append({
    rules: {
      // Allow self-closing on HTML void elements like <input/>
      'vue/html-self-closing': [
        'warn',
        {
          html: {
            void: 'always', // Allow self-closing on void elements like input, img, br
            normal: 'never', // Don't allow self-closing on normal elements like div
            component: 'always' // Allow self-closing on components
          },
          svg: 'always',
          math: 'always'
        }
      ]
    }
  })
