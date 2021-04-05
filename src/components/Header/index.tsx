import Link from 'next/link';

import styles from './header.module.scss';

export default function Header() {
  // TODO
  return (
    <header className={styles.container}>
      <Link href="/">
        <a>
          <img src="/images/logo.svg" alt="logo" />
        </a>
      </Link>
    </header>
  );
}
