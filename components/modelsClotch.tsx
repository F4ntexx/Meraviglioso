import Image from "next/image";
import models from "../styles/models.module.scss";
import { StaticImageData } from 'next/image';

interface ModelsClotchProps {
  titleSection: string;
  subtitle: string;
  imageOne: StaticImageData;
  imageTwo: StaticImageData;
  imageThree: StaticImageData;
  imageFour: StaticImageData;
}

export const ModelsСlotch = (props: ModelsClotchProps) => {
  return (
    <div>
      <div>
        <p className={models.titleSection}>{props.titleSection}</p>
      </div>
      <div className="models.containerGrid" id="containerClotchIndex">
        <Image
          src={props.imageOne}
          alt="ImageModels"
          className={models.modelsImage}
          id="imageOne"
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
