# EduHelp interface

EduHelp is an academic workspace for students and instructors. Keep existing tasks and terminology familiar. The interface prioritizes reading, finding the next task, and completing forms.

Use indigo for primary actions, with quiet neutral surfaces and clear borders. Semantic colors live in `app/globals.css`; use `--text-primary`, `--text-secondary`, `--surface`, `--surface-muted`, and status colors instead of fixed foregrounds. `--primary-solid` is for white text on solid action backgrounds; `--primary` is for theme-aware text and focus indicators.

Light and dark modes are equally supported. System is the initial preference; an explicit selection persists locally and synchronizes across tabs. The initialization script runs before paint. Keep visible focus, native select behavior, 44px action targets, reduced-motion handling, and readable placeholders.

Authentication uses a responsive two-column introduction/form composition that collapses to the form on small screens. Dashboards use a restrained header, greeting, wrapping section navigation, and a single workspace surface. Avoid animated tab entrances, gradient text, and decorative blur. Transitions are short and limited to named properties.

Design references used for this work: [Emil Kowalski’s design engineering skill](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md) and [Impeccable](https://github.com/pbakaus/impeccable/blob/main/.omp/skills/impeccable/SKILL.md). The skill files were read remotely; they are not installed as repository automation.
