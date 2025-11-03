import styles from "../styles/styles.module.scss";
import { HeaderComponent } from "../components/header";
import { ModelsСlotch } from "../components/modelsClotch";
import logotypeForHead from "../assets/logotypeForHead.svg";
import Head from "next/head";
import Image from "next/image";
import menModel from "../assets/menModel.webp";
import womenModel from "../assets/womenModel.webp";
import WinterBlueMen from "../assets/winterTime/menCollection/WinterBlueMen.webp";
import WinterWhiteMen from "../assets/winterTime/menCollection/WinterWhiteMen.webp";
import WinterBrownMen from "../assets/winterTime/menCollection/WinterBrownMen.webp";
import WinterGreenMen from "../assets/winterTime/menCollection/WinterGreenMen.webp";
import WinterBrownWomen from "../assets/winterTime/womenCollection/WinterBrownWomen.webp";
import WinterBlueWomen from "../assets/winterTime/womenCollection/WinterBlueWomen.webp";
import WinterGreenWomen from "../assets/winterTime/womenCollection/WinterGreenWomen.webp";
import WinterWhiteWomen from "../assets/winterTime/womenCollection/WinterWhiteWomen.webp";
import SummerBlueMen from "../assets/summerTime/menCollection/SummerBlueMen.webp";
import SummerWhiteMen from "../assets/summerTime/menCollection/SummerWhiteMen.webp";
import SummerBrownMen from "../assets/summerTime/menCollection/SummerBrownMen.webp";
import SummerGreenMen from "../assets/summerTime/menCollection/SummerGreenMen.webp";
import SummerBlueWomen from "../assets/summerTime/womenCollection/SummerBlueWomen.webp";
import SummerWhiteWomen from "../assets/summerTime/womenCollection/SummerWhiteWomen.webp";
import SummerBrownWomen from "../assets/summerTime/womenCollection/SummerBrownWomen.webp";
import SummerGreenWomen from "../assets/summerTime/womenCollection/SummerGreenWomen.webp";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

const Index = () => {
  useGSAP(() => {
    gsap.from("#title , #subtitle", {
      y: 100,
      opacity: 0,
      scrollTrigger: {
        trigger: "#rootInfoPage",
        start: "top center",
      },
    });

    gsap.fromTo(
      "#modelMen, #modelWomen",
      {
        y: 50,
        opacity: 0,
        scrollTrigger: {
          trigger: "#modelMen",
          start: "top center",
        },
      },
      {
        y: 0,
        opacity: 1,
        duration: 1,
      }
    );

    gsap.fromTo(
      ".sectionWinterClotchMen",
      {
        y: 0,
        opacity: 0,
        scrollTrigger: {
          trigger: ".sectionWinterClotchMen",
          start: "bottom center",
        },
      },
      { y: 400, opacity: 1, duration: 2 }
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
        <div>
          <HeaderComponent />
          <div className={styles.rootInfoPage} id="rootInfoPage">
            <div>
              <h1 id="title" className={styles.title}>
                Meraviglioso
              </h1>
              <p id="subtitle" className={styles.subtitle}>
                La vostra magnificenza, incarnata nello stile
              </p>
            </div>
            <div className={styles.modelImage}>
              <Image
                src={menModel}
                alt="Model men"
                className={styles.modelMenImage}
                id="modelMen"
              ></Image>
              <Image
                src={womenModel}
                alt="Model women"
                className={styles.modelWomenImage}
                id="modelWomen"
              ></Image>
            </div>
          </div>
        </div>
        <div>
          <ModelsСlotch
            titleSection="Winter clotch for men"
            imageOne={WinterBrownMen}
            imageTwo={WinterBlueMen}
            imageThree={WinterGreenMen}
            imageFour={WinterWhiteMen}
            subtitle="Model number One"
          />

          <ModelsСlotch
            titleSection="Winter clotch for woomen"
            imageOne={WinterBrownWomen}
            imageTwo={WinterBlueWomen}
            imageThree={WinterGreenWomen}
            imageFour={WinterWhiteWomen}
            subtitle="Model number One"
          />

          <ModelsСlotch
            titleSection="Summer clotch for men"
            imageOne={SummerBrownMen}
            imageTwo={SummerBlueMen}
            imageThree={SummerGreenMen}
            imageFour={SummerWhiteMen}
            subtitle="Model number One"
          />

          <ModelsСlotch
            titleSection="Summer clotch for woomen"
            imageOne={SummerBrownWomen}
            imageTwo={SummerBlueWomen}
            imageThree={SummerGreenWomen}
            imageFour={SummerWhiteWomen}
            subtitle="Model number One"
          />
        </div>
      </div>
    </>
  );
};

export default Index;
