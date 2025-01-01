import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  width?: number | string;
  height?: number | string;
  open?: boolean;
  onClose?: () => void;
  canClose?: boolean;
  closeOnBackdropClick?: boolean;
  zIndex?: number;
}

export default function LeagueModal({ width = "50%", height = "67%", open = false, onClose, canClose = true, closeOnBackdropClick = true, zIndex = 100, children }: React.PropsWithChildren<Props>) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const portal = createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center" style={{
      zIndex
    }} onMouseDown={() => {
      if (closeOnBackdropClick && canClose) onClose?.();
    }}>
      <div className="w-1/2 h-2/3 bg-[#010a13] border-[#463714] border-2 border-solid relative shadow-xl shadow-black" style={{ width, height }}>
        {canClose && <div className="absolute top-0 right-0 p-8" onMouseDown={(e) => e.stopPropagation()}>
          <button onClick={onClose} className="league-btn league-btn-icon">
            <img src="/images/icon-x.png" className="w-5" />
          </button>
        </div>}
        <div onMouseDown={(e) => e.stopPropagation()} className="h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    global?.document?.body
  );
  return open ? portal : null;
}