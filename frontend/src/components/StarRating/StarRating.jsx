import starEmpty from "../../assets/icons/review_star.svg";
import starFilled from "../../assets/icons/review_star_painted_over.svg";
import s from "./StarRating.module.css";

const StarRating = ({ rating, size = 18 }) => (
  <span className={s.row}>
    {[1, 2, 3, 4, 5].map((n) => (
      <img
        key={n}
        src={n <= rating ? starFilled : starEmpty}
        alt=""
        style={{ width: size, height: size }}
      />
    ))}
  </span>
);

export default StarRating;
