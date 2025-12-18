import { useState, useEffect } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: React.ReactNode;
  wrapperClassName?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = "",
  placeholder,
  wrapperClassName = "",
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string>("");

  useEffect(() => {
    setIsLoading(true);
    setImageSrc("");

    const img = new Image();
    img.src = src;

    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };

    img.onerror = () => {
      setIsLoading(false);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return (
    <div
      className={`lazy-image-wrapper ${
        isLoading ? "loading" : ""
      } ${wrapperClassName}`}
    >
      {isLoading &&
        !imageSrc &&
        (placeholder || (
          <div
            className="image-skeleton"
            style={{ width: "100%", height: "100%" }}
          />
        ))}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} ${!isLoading ? "loaded" : ""}`}
        />
      )}
    </div>
  );
};
