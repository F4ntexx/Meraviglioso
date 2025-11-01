import Image from "next/image";
import models from "../styles/models.module.scss";
import { subtle } from "crypto";

interface ModelsClotchProps {
  titleSection: string;
  subtitle: string;
  imageOne: any;
  imageTwo: any;
  imageThree: any;
  imageFour: any;
}

export const ModelsСlotch = (props: ModelsClotchProps) => {
  return (
    <div>
      <div>
        <p className={models.titleSection}>{props.titleSection}</p>
      </div>
      <div className="models.containerGrid">
        <Image
          src={props.imageOne}
          alt="ImageModels"
          className={models.modelsImage}
        />

        <Image
          src={props.imageTwo}
          alt="ImageModels"
          className={models.modelsImage}
        />
        <Image
          src={props.imageThree}
          alt="ImageModels"
          className={models.modelsImage}
        />
        <Image
          src={props.imageFour}
          alt="ImageModels"
          className={models.modelsImage}
        />
      </div>
    </div>
  );
};
