# EduHelp interface

EduHelp is an academic workspace for students and instructors. Keep existing tasks and terminology familiar. The interface prioritizes reading, finding the next task, and completing forms.

Use the supplied olive/stone palette for both themes: 50 `#fbfbf9`, 100 `#f4f4f0`, 200 `#e8e8e3`, 300 `#d8d8d0`, 400 `#abab9c`, 500 `#7c7c67`, 600 `#5b5b4b`, 700 `#474739`, 800 `#2b2b22`, 900 `#1d1d16`, and 950 `#0c0c09`. Semantic colors live in `app/globals.css`; use the theme tokens instead of fixed foregrounds. `--primary-solid` is for light text on olive action backgrounds; `--primary` is for theme-aware text and focus indicators. Status colors remain distinct for errors, success, and warnings.

Light and dark modes are equally supported. System is the initial preference; an explicit selection persists locally and synchronizes across tabs. The initialization script runs before paint. Keep visible focus, native select behavior, 44px action targets, reduced-motion handling, and readable placeholders.

Authentication uses a responsive two-column introduction/form composition that collapses to the form on small screens. Dashboards use a restrained header, greeting, wrapping section navigation, and a single workspace surface. The requested glassmorphism uses translucent olive/stone surfaces over soft ambient light, a 20px backdrop blur, fine highlight borders, and offset shadows. Apply glass to primary panels, navigation, and floating surfaces; keep inner content and controls legible. Use solid fallbacks when backdrop blur is unavailable or reduced transparency is preferred. Avoid animated tab entrances and gradient text. Transitions are short and limited to named properties.

Design references used for this work: [Emil Kowalski’s design engineering skill](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md) and [Impeccable](https://github.com/pbakaus/impeccable/blob/main/.omp/skills/impeccable/SKILL.md). The skill files were read remotely; they are not installed as repository automation.
