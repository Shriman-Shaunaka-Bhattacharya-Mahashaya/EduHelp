import Link from 'next/link';
import { ThemeSwitcher } from './ThemeProvider';
import styles from '@/app/auth.module.css';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/" className="brand" aria-label="EduHelp home"><span className="brand-mark" aria-hidden="true">e</span>EduHelp</Link>
        <ThemeSwitcher />
      </header>
      <main id="main-content" className={styles.container}>
        <section className={styles.intro} aria-label="About EduHelp">
          <h2>A little clarity.<br />A lot of possibility.</h2>
          <p>Your classes, learning materials, and exams. Together in one focused workspace.</p>
          <div className={styles.subjects}><span>Learn at your pace</span><span>Stay connected</span><span>See your progress</span></div>
          <div className={styles.notebook} aria-hidden="true"><div className={styles.notebookTitle}>Room to focus.</div><div className={styles.notebookLine} /><div className={styles.notebookLine} /><div className={styles.notebookLine} /><div className={styles.notebookNote}>One step further, every day.</div></div>
        </section>
        <div className={styles.authCard}>{children}</div>
      </main>
      <footer className={styles.pageFooter}>EduHelp · Your academic workspace</footer>
    </div>
  );
}
