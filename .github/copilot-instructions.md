# GitHub Copilot Agent Instructions

This document provides detailed guidelines and expectations for using GitHub Copilot in agent mode within this TypeScript project. Following these instructions ensures high-quality code and consistency across the project.

---

## Core Principles

1. **Respect the Single Responsibility Principle (SRP)**  
   Ensure that each module, class, and function has a single, well-defined responsibility. Avoid combining unrelated functionalities.

2. **Update the README Consistently**  
   - Reflect all changes, including newly added functionalities, updates, and refactors.
   - **Break Work into Logical Chunks**: Divide work into independently functional pieces.
   - **Maintain Functionality**: Ensure each intermediate state in the development process is functional.
   - **Temporary Duplication**: Allow temporary duplication if necessary during refactoring.
   - **Indicate Refactoring Patterns**: Clearly document the refactoring patterns applied.

3. **Avoid Code Duplication**  
   - Reuse existing utilities, methods, or components whenever possible.
   - Extract shared logic into reusable functions or classes.

4. **Comment When Necessary**  
   - Add comments for:
     - Complex logic
     - Non-intuitive decisions or workarounds
     - Public APIs or exported modules
   - Avoid redundant or obvious comments.

5. **Sanitize All User Inputs Thoroughly**  
   - Validate and sanitize all user inputs to prevent injection attacks, data corruption, or unexpected behavior.
   - Use libraries or frameworks for input validation where applicable.

---

## General TypeScript Best Practices

1. **Strict Typing**
   - Use TypeScript's strict mode (`"strict": true` in `tsconfig.json`).
   - Avoid using `any`; prefer specific types or `unknown` with proper type guards.

2. **Consistent Code Style**
   - Follow the [Airbnb TypeScript Style Guide](https://github.com/airbnb/javascript).
   - Use a linter (e.g., ESLint) and formatter (e.g., Prettier) to enforce code style.

3. **Functional Programming**
   - Prefer pure functions and immutability where possible.
   - Avoid side effects in functions unless explicitly required.

4. **Error Handling**
   - Gracefully handle all errors using `try/catch` blocks.
   - Provide meaningful error messages and avoid exposing sensitive information.

5. **Testing**
   - Write comprehensive unit tests for all modules using a testing framework like Jest.
   - Include edge cases and invalid inputs in test cases.

6. **Modular Design**
   - Organize code into small, focused modules.
   - Use clear and descriptive file and folder names.

7. **Asynchronous Programming**
   - Use `async/await` for asynchronous operations.
   - Handle promises with proper error handling (`.catch()`).

8. **Dependency Management**
   - Keep dependencies up to date and avoid unnecessary ones.
   - Use `npm audit` or similar tools to check for vulnerabilities.

9. **Security**
   - Avoid exposing sensitive information (e.g., API keys, database credentials) in the codebase.
   - Use environment variables and `.env` files for configuration.

10. **Performance**
    - Optimize loops, recursive functions, and frequently executed logic.
    - Minimize DOM manipulations in frontend code.

11. **Documentation**
    - Include JSDoc annotations for all public functions and classes.
    - Ensure the documentation is current and reflects the latest changes.

---

## Examples of Queries

- "Write a TypeScript function to sanitize email inputs."
- "Refactor the `UserService` class to follow SRP."
- "Generate a unit test for the `calculateSum` function."
- "Explain the purpose of the `validateUser` function in `auth.ts`."
- "Identify and remove duplicate code in `utils.ts`."

---

## Feedback and Improvements

If you notice areas for improvement in these instructions or encounter issues while using Copilot in agent mode, please:
- Open an issue in this repository with the details.
- Contact the repository maintainer directly.

---

Happy coding with GitHub Copilot in agent mode!