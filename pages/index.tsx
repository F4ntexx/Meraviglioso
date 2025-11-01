import styles from "../styles/styles.module.scss";
import { HeaderComponent } from "../components/header";
import { ModelsСlotch } from "../components/modelsClotch";
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

const Index = () => {
  return (
    <body>
      <div className={styles.body}>
        <HeaderComponent />
        <h1 className={styles.title}>Meraviglioso</h1>
        <p className={styles.subtitle}>
          La vostra magnificenza, incarnata nello stile
        </p>
      </div>
      <div>
        <ModelsСlotch
          titleSection="Winter clotch for men"
          imageThree={WinterBrownMen}
          imageOne={WinterBlueMen}
          imageFour={WinterGreenMen}
          imageTwo={WinterWhiteMen}
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
    </body>
  );
};

export default Index;
