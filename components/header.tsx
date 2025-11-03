import layout from "../styles/layout.module.scss";
import logotype from "../assets/logotype.svg";
import Image from "next/image";
import Link from "next/link";

export const HeaderComponent = () => {
  return (
    <header className={layout.header}>
      <nav className={layout.nav}>
        <Image src={logotype} alt="logotype"></Image>
        <Link href="/" className={layout.Link}>
          casa
        </Link>
        <Link href="/catalogs" className={layout.Link}>
          catalogare
        </Link>
      </nav>
    </header>
  );
};
