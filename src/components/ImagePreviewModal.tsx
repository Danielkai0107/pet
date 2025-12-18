import { X } from "lucide-react";
import { useEffect } from "react";

interface ImagePreviewModalProps {
  imageUrl: string;
  altText?: string;
  onClose: () => void;
}

export const ImagePreviewModal = ({
  imageUrl,
  altText = "圖片預覽",
  onClose,
}: ImagePreviewModalProps) => {
  // 鎖定背景滾動
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // ESC 鍵關閉
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      className="image-preview-modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "1rem",
      }}
    >
      <button
        onClick={onClose}
        className="image-preview-close-btn"
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          background: "rgba(255, 255, 255, 0.9)",
          border: "none",
          borderRadius: "50%",
          width: "2.5rem",
          height: "2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 10001,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 1)";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <X size={24} color="#333" />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90%",
          maxHeight: "90%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={imageUrl}
          alt={altText}
          style={{
            maxWidth: "100%",
            maxHeight: "90vh",
            objectFit: "contain",
            borderRadius: "0.5rem",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
          }}
        />
      </div>
    </div>
  );
};
