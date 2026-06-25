# Code Formatting, Linting & Git Hooks Strategy (FORMATTING_LINT_STRATEGY.md)

## 🎯 Objectives
The primary objective of the **Formatting & Linting Strategy** is to establish static analysis mechanisms to verify and format both backend (Java) and frontend (React JS) code before it is committed to repository streams. This eliminates styling arguments, ensures consistent quality, and prevents syntax regressions.

## 🔍 Scope
- **In-Scope**:
  - ESLint and Prettier for the frontend React/Vite code.
  - Maven Checkstyle Plugin for the backend Java code.
  - Husky and `lint-staged` pre-commit Git hooks.
- **Out-of-Scope**:
  - Production deployment static analysis servers (e.g., SonarQube dashboards).

---

## 🎨 Frontend Formatting & Linting (ESLint + Prettier)

To enforce React/Javascript guidelines, we configure the frontend to combine linting (code quality) with formatting (code style):

### 1. Prettier Config (`frontend/.prettierrc`)
Specifies indentation, quote symbols, and semi-colons:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### 2. ESLint Config (`frontend/.eslintrc.cjs`)
Extends standard React and Vite plugins, disabling style conflicts:
```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh'],
  rules: {
    'react/prop-types': 'off',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
};
```

---

## ☕ Backend Code Quality (Maven Checkstyle)

To enforce Java standards (camelCase methods, class comments, indentation):

### 1. Checkstyle Definition
We integrate the **Maven Checkstyle Plugin** inside `backend/pom.xml` using a Google-styled ruleset:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-checkstyle-plugin</artifactId>
    <version>3.3.1</version>
    <configuration>
        <configLocation>google_checks.xml</configLocation>
        <consoleOutput>true</consoleOutput>
        <failsOnError>true</failsOnError>
        <linkXRef>false</linkXRef>
    </configuration>
    <executions>
        <execution>
            <id>validate</id>
            <phase>validate</phase>
            <goals>
                <goal>check</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

---

## ⚓ Pre-Commit Git Hooks (Husky + lint-staged)

To prevent unformatted or invalid code from entering the Git stream, we configure pre-commit hooks using **Husky** and **lint-staged**:

### 1. Mechanism
Before Git accepts a `git commit` command, Husky intercepts the action and executes local script targets.

### 2. Implementation Script (`.husky/pre-commit`)
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

### 3. lint-staged Configuration (`frontend/package.json`)
Allows static checks to run only on modified files:
```json
"lint-staged": {
  "src/**/*.{js,jsx}": [
    "eslint --fix",
    "prettier --write"
  ]
}
```
If linting or formatting checks fail, the commit is rejected, forcing developers to resolve errors locally before publishing.
