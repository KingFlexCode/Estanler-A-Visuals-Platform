import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import "./index.css";
import "./gallery-workspace-icons.css";
import App from "./App.jsx";

const originalQrCodeToDataUrl = QRCode.toDataURL.bind(QRCode);
let nextQrMaskPattern = 0;

QRCode.toDataURL = (text, options = {}) => {
  const maskPattern = nextQrMaskPattern;
  nextQrMaskPattern = (nextQrMaskPattern + 1) % 8;
  return originalQrCodeToDataUrl(text, { ...options, maskPattern });
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
