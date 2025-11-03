import Image from "next/image";
import cardsStyle from "../styles/cardsStyle.module.scss";
import gsap from "gsap";
import { useLayoutEffect } from "react";
interface IntefaceProps {
  image: any;
  brand: string;
  title: string;
  price: string;
}

export const Cards = (props: IntefaceProps) => {
  useLayoutEffect(() => {
    gsap.fromTo(
      ".animate",
      { opacity: 0, y: 100 },
      { opacity: 1, y: 0, duration: 1 }
    );
  });
  return (
    <>
      <div className={cardsStyle.containerCards}>
        <div className="animate">
          <div>
            <Image
              src={props.image}
              alt="Clotch Cards"
              className={cardsStyle.image}
            ></Image>
          </div>
          <div className={cardsStyle.containerInfo}>
            <span>
              <p className={cardsStyle.brand}>{props.brand}</p>
            </span>
            <span>
              <p className={cardsStyle.title}>{props.title}</p>
            </span>
            <span>
              <p className={cardsStyle.price}>{props.price}</p>
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
