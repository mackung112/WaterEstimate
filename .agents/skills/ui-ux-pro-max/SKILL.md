---
name: ui-ux-pro-max
description: Premium, state-of-the-art UI/UX design guidelines for modern web applications.
---

# UI/UX Pro Max Guidelines

When asked to design, style, or enhance user interfaces:

## 1. Premium & Rich Aesthetics
- **WOW Factor**: Designs must be visually stunning at first glance. Avoid simple or generic MVPs.
- **Color Palette**: Do not use generic, solid browser colors (plain red, plain blue). Use curated, harmonious gradients, vibrant colors, or sleek dark mode palettes. Embrace subtle glassmorphism or soft neumorphism where appropriate.
- **Typography**: Utilize modern, clean font families (e.g., Google Fonts like Inter, Roboto, Outfit, or in this case, Sarabun for Thai). Implement clear visual hierarchy using varied font weights and proper line height.

## 2. Dynamic Interactions
- **Micro-animations**: Add subtle transitions to interactive elements (e.g., `transition: all 0.3s ease;`).
- **Hover/Active States**: Buttons, links, and cards must have distinct, smooth hover elevation (`box-shadow`), color shifts, or scaling (`transform: translateY(-2px);`). 
- **Feedback**: Provide immediate visual feedback for all user actions (loading spinners, success checks, error shakes).

## 3. Layout and Spacing
- Rely heavily on CSS Flexbox and CSS Grid for layout structuring.
- Use ample whitespace (`gap`, `padding`, `margin`) to let the interface breathe. Prevent dense, cluttered data grids.
- Ensure 100% responsiveness across devices (Mobile, Tablet, Desktop).

## 4. Modern Components
- Use rounded corners (`border-radius`) instead of sharp edges for a modern, friendly feel.
- Apply soft drop shadows (`box-shadow`) to create depth and layering (e.g., floating navbars or modal cards).
- Enhance readability with appropriate contrast and blur effects (`backdrop-filter`) for overlapping content.

Apply these guidelines to inject a state-of-the-art, premium feel into the Bootstrap 5 setup or any custom CSS in the project.

---

## 5. Workflow & Documentation Standard
- **Explanation Language**: ALWAYS explain your design decisions, CSS updates, and instructions to the user in **THAI language** (ภาษาไทย).
- **Walkthrough Generation**: Whenever you complete a significant UI/UX design task or update, you MUST document the changes in `@[walkthrough.md]`. Keep the format consistent with the existing structure in `walkthrough.md`.
