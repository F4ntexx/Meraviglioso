import layout from "../styles/layout.module.scss";
import logotype from "../assets/logotype.svg";
import Image from "next/image";
import Link from "next/link";

export const HeaderComponent = () => {
  return (
    <header className={layout.header}>
      <Image src={logotype} alt="logotypeSword" className={layout.image} />
      <nav className={layout.nav}>
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
