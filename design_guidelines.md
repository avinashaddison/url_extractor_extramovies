# Link Finder Utility Tool - Design Guidelines

## Design Approach

**Selected Approach:** Reference-Based (Developer Tools Category)

**Primary References:** Linear, GitHub Dark, VS Code
- Linear's crisp typography and focused layouts
- GitHub's code-friendly interface patterns
- VS Code's syntax-aware color usage and hierarchy

**Design Principles:**
- Ruthless simplicity: Every element serves the function
- Developer ergonomics: Scannable, keyboard-friendly
- Visual clarity: High contrast, clear states, obvious interactions

## Typography

**Font Stack:**
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for URLs and code patterns)

**Scale:**
- Display: 2.5rem (40px) - tool title
- Heading: 1.5rem (24px) - section labels
- Body: 1rem (16px) - instructions, labels
- Monospace: 0.875rem (14px) - inputs, results
- Caption: 0.75rem (12px) - metadata, timestamps

**Weights:** Regular (400), Medium (500), Semibold (600)

## Layout System

**Spacing Primitives:** Tailwind units 2, 4, 6, 8, 12, 16
- Micro spacing: 2, 4 (component internals)
- Standard gaps: 6, 8 (between elements)
- Section spacing: 12, 16 (major separations)

**Container Strategy:**
- Max-width: 900px (optimal for utility tools)
- Centered layout with py-12 vertical spacing
- Single-column flow (no multi-column - reduces cognitive load)

## Component Library

**Input Section:**
- URL Input: Full-width textarea with monospace font, min 3 rows, border focus ring
- Pattern Input: Single-line input with regex hint text
- Submit Button: Primary CTA with keyboard shortcut indicator (Enter or Cmd+Enter)
- Clear/Reset: Secondary ghost button aligned right

**Results Display:**
- Results Container: Full-width bordered section with subtle inner glow
- Link Cards: Stack layout with monospace URLs, copy-to-clipboard icon, link preview on hover
- Metadata Bar: Match count, processing time, domain grouping toggle
- Export Actions: Download as JSON, CSV, or plain text options

**States & Feedback:**
- Loading: Subtle pulse animation on submit button
- Empty State: Centered icon + helpful example prompt
- Error State: Inline validation with specific error messages
- Success State: Fade-in animation for results with count badge

**Navigation:**
- Minimal header: Tool name (left), GitHub link icon (right)
- Footer: Single line with attribution and version number

**Utility Elements:**
- Toast notifications for copy actions (bottom-right position)
- Keyboard shortcut hints (subtle gray text near inputs)
- Link to documentation (small info icon with tooltip)

**Visual Enhancements:**
- Subtle grid pattern background (very low opacity)
- Glow effect on active input fields
- Micro-interactions: smooth transitions on all state changes (150-200ms)
- Syntax highlighting for regex patterns in input

**Accessibility:**
- All inputs have visible labels with for/id attributes
- Focus indicators use 2px offset ring
- ARIA labels for icon-only buttons
- Keyboard navigation follows natural tab order

**No Images:** This utility tool requires no hero image or decorative imagery. The interface itself is the focal point, with emphasis on functional clarity and immediate usability.