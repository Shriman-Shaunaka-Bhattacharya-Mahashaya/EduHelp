# EduHelp interface

EduHelp is an academic workspace for students and instructors. Keep existing tasks and terminology familiar. The interface prioritizes reading, finding the next task, and completing forms.

Use the supplied cyan palette for both themes: 50 `#ecfeff`, 100 `#cefafe`, 200 `#a2f4fd`, 300 `#53eafd`, 400 `#00d3f3`, 500 `#00b8db`, 600 `#0092b8`, 700 `#007595`, 800 `#005f78`, 900 `#104e64`, and 950 `#053345`. Semantic colors live in `app/globals.css`; use the theme tokens instead of fixed foregrounds. `--primary-solid` is for light text on deep cyan action backgrounds; `--primary` is for theme-aware text and focus indicators. Status colors remain distinct for errors, success, and warnings.

Light and dark modes are equally supported. System is the initial preference; an explicit selection persists locally and synchronizes across tabs. The initialization script runs before paint. Keep visible focus, native select behavior, 44px action targets, reduced-motion handling, and readable placeholders.

Authentication uses a responsive two-column introduction/form composition that collapses to the form on small screens. Dashboards use a restrained header, greeting, wrapping section navigation, and a single workspace surface. The requested glassmorphism uses translucent cyan surfaces over soft cyan ambient light, a 20px backdrop blur, fine highlight borders, and offset shadows. Apply glass to primary panels, navigation, and floating surfaces; keep inner content and controls legible. Use solid fallbacks when backdrop blur is unavailable or reduced transparency is preferred. Avoid animated tab entrances and gradient text. Transitions are short and limited to named properties.

Design references used for this work: [Emil Kowalski’s design engineering skill](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md) and [Impeccable](https://github.com/pbakaus/impeccable/blob/main/.omp/skills/impeccable/SKILL.md). The skill files were read remotely; they are not installed as repository automation.

Keep vendor-prefixed backdrop-filter declarations before the standard property so the production CSS optimizer retains both. Render viewport-fixed dialogs and assistants through `ViewportOverlay`; a blurred ancestor otherwise changes their containing block.
