import { HeaderComponent } from "../components/header";
import Head from "next/head";
import Link from "next/link";
import catalogs from "../styles/catalogs.module.scss";
import logotypeForHead from "../assets/logotypeForHead.svg";
import { Cards } from "../components/Cards";
import SummerWhiteMen from "../assets/summerTime/menCollection/SummerWhiteMen.webp";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

const Catalogs = () => {
  useGSAP(() => {
    gsap.fromTo(
      "#men, #women , #kids",
      {
        y: -20,
        scrollTrigger: {
          trigger: "#men",
          trigger: "#women",
          trigger: "#kid",
          start: "top center",
        },
      },
      {
        ease: "back.out(1.7)",
        y: 0,
      }
    );
  });
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width" />
        <link rel="icon" href={logotypeForHead.src} type="image/x-icon" />
        <title>Meraviglioso</title>
      </Head>
      <div>
        <HeaderComponent />
      </div>
      <div className={catalogs.navigateSectionClotch}>
        <Link href="#menClotch" id="men" className={catalogs.linkNavigate}>
          Men
        </Link>
        <Link href="#womenClotch" className={catalogs.linkNavigate}>
          Women
        </Link>
        <Link href="#kidsClotch" className={catalogs.linkNavigate}>
          Kids
        </Link>
      </div>
      <div id="menClotch">
        <p className={catalogs.titleSection}>Men collection</p>
        <div className={catalogs.menClotch}>
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
        </div>
      </div>
      <div id="womenClotch">
        <p className={catalogs.titleSection}>Women collection</p>
        <div className={catalogs.menClotch}>
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
        </div>
      </div>
      <div id="kidsClotch">
        <p className={catalogs.titleSection}>Kids collection</p>
        <div className={catalogs.menClotch}>
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
          <Cards
            image={SummerWhiteMen}
            brand="Polo"
            title="Tshort"
            price="$2.200"
          />
        </div>
      </div>
    </>
  );
};

export default Catalogs;
