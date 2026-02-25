---
name: modern-javascript-patterns
description: Guidelines for writing clean, modern, and maintainable Vanilla JavaScript.
---

# Modern JavaScript Patterns & Best Practices

When asked to write or refactor JavaScript code, specifically for Vanilla JS / SPA projects like Water Supply AppV4:

## 1. Modularity and Structure
- Prefer ES6 modules (`import`/`export`) or structured classes/objects if working in a traditional browser environment without a bundler.
- Keep the separation of concerns: State/Data (Models), UI interaction (Views), and Logic (Controllers).
- Ensure global variables are minimized. Use IIFEs or Module Scope where appropriate.

## 2. Variables and Scope
- Always use `const` by default. Use `let` only when you know the variable's value will change. NEVER use `var`.
- Use descriptive naming formats:
  - `camelCase` for variables and functions (e.g., `calculateTotal`).
  - `PascalCase` for classes and constructor functions (e.g., `DBManager`).
  - `UPPER_SNAKE_CASE` for global constant variables (e.g., `API_BASE_URL`).

## 3. Arrow Functions and Callbacks
- Use Arrow Functions (`() => {}`) for callbacks, array methods (`map`, `filter`, `reduce`), and functional programming paradigms.
- Pre-bind `this` context issues using arrow functions within class methods.

## 4. Object and Array Manipulation
- Use Destructuring assignment to extract properties (`const { name, age } = user;`).
- Use the Spread (`...`) and Rest operators for manipulating arrays and objects instead of older methods like `Object.assign()` or `push()` where immutability is preferred.
- Leverage Template Literals (`` `string ${var}` ``) for string concatenation.

## 5. Async/Await & Networking
- Prefer `async/await` over raw `.then().catch()` chains for Promises to improve readability.
- Always include `try/catch` blocks inside `async` functions to handle network/API errors gracefully.

## 6. DOM Elements and Events
- Cache DOM selections into variables if used repeatedly.
- Rely on Event Delegation for dynamically created elements (attach listener to a parent container).

Follow these patterns strictly to ensure the project remains robust and easily maintainable.

---

## 7. Workflow & Documentation Standard
- **Explanation Language**: ALWAYS explain your code changes, decisions, and instructions to the user in **THAI language** (ภาษาไทย).
- **Walkthrough Generation**: Whenever you complete a significant task or refactoring, you MUST document the changes in `@[walkthrough.md]`. Keep the format consistent with the existing structure in `walkthrough.md` (e.g., specifying sections like "Changes Made", "Refactored Files", etc., if applicable).
