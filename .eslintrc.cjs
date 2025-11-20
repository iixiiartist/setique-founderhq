module.exports = {
    root: true,
    env: {
        browser: true,
        es2023: true,
        node: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    settings: {
        react: {
            version: 'detect',
        },
    },
    plugins: ['@typescript-eslint', 'react', 'react-hooks'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
    ],
    rules: {
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react/no-unescaped-entities': 'off',
    'react-hooks/exhaustive-deps': 'off',
        'no-extra-semi': 'off',
        'no-useless-catch': 'off',
        'prefer-rest-params': 'off',
    'prefer-const': 'off',
    'no-case-declarations': 'off',
        'no-control-regex': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
    },
    ignorePatterns: [
        'dist',
        'build',
        'release',
        'coverage',
        'node_modules',
        'supabase/functions/**/*',
    ],
};
