import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = React.PropsWithChildren<{
  width?: number | string;
  height?: number | string;
  open?: boolean;
  onClose?: () => void;
  canClose?: boolean;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  zIndex?: number;
}>;

export type ModalAPI = ReturnType<typeof useModal>[0];


function PromptModalChildren({ children, type, onConfirm, onCancel }: React.PropsWithChildren<{ type: React.HTMLInputTypeAttribute, onConfirm?: (v: string) => void, onCancel?: () => void }>) {
  const [value, setValue] = useState("");
  return <div className="flex flex-col h-full">
    <div className="p-4 grow overflow-auto">
      {children}
      <input type={type} className="league-input w-full" value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
    <div className="flex justify-center py-4 gap-4">
      <button className="league-btn" onClick={() => { onConfirm?.(value) }}>确定</button>
      <button className="league-btn" onClick={() => { onCancel?.() }}>取消</button>
    </div>
  </div>
}


export function useModal() {
  const [modals, setModals] = useState<Props[]>([]);

  const handlers = {
    alert: (opt: string | Props) => new Promise<void>((resolve) => {
      const opts = typeof opt === "string" ? { children: <div className="text-center my-4">{opt}</div> } as Props : opt;
      let p: Props;
      p = {
        open: true,
        width: opts?.width || 400,
        height: opts?.height || 160,
        closeOnBackdropClick: opts?.closeOnBackdropClick || true,
        canClose: true,
        zIndex: 100 + modals.length,
        showCloseButton: opts?.showCloseButton || false,
        onClose: () => {
          setModals(modals => modals.filter(x => x !== p));
          resolve();
        },
        children: <div className="flex flex-col h-full">
          <div className="p-4 grow overflow-auto">{opts.children}</div>
          <div className="flex justify-center py-4">
            <button className="league-btn" onClick={() => { p.onClose?.() }}>确定</button>
          </div>
        </div>
      };
      setModals(modals => ([
        ...modals, p
      ]));
    }),
    confirm: (opt: string | Props) => new Promise<boolean>((resolve) => {
      const opts = typeof opt === "string" ? { children: <div className="text-center my-4">{opt}</div> } as Props : opt;
      let p: Props;
      p = {
        open: true,
        width: opts?.width || 400,
        height: opts?.height || 160,
        closeOnBackdropClick: opts?.closeOnBackdropClick || true,
        canClose: true,
        zIndex: 100 + modals.length,
        showCloseButton: opts?.showCloseButton || false,
        onClose: () => {
          opts.onClose?.();
          setModals(modals => modals.filter(x => x !== p));
          resolve(false);
        },
        children: <div className="flex flex-col h-full">
          <div className="p-4 grow overflow-auto">{opts.children}</div>
          <div className="flex justify-center py-4 gap-4">
            <button className="league-btn" onClick={() => {
              opts.onClose?.();
              setModals(modals => modals.filter(x => x !== p));
              resolve(true);
            }}>确定</button>
            <button className="league-btn" onClick={() => { p.onClose?.(); }}>取消</button>
          </div>
        </div>
      };
      setModals(modals => ([
        ...modals, p
      ]));
    }),
    prompt: (opt: string | Props, type: React.HTMLInputTypeAttribute = "text") => new Promise<{ success: boolean, value?: string }>((resolve) => {
      const opts = typeof opt === "string" ? { children: <div className="my-4">{opt}</div> } as Props : opt;
      let p: Props;
      p = {
        open: true,
        width: opts?.width || 400,
        height: opts?.height || 200,
        closeOnBackdropClick: opts?.closeOnBackdropClick || true,
        canClose: true,
        zIndex: 100 + modals.length,
        showCloseButton: opts?.showCloseButton || false,
        onClose: () => {
          opts.onClose?.();
          setModals(modals => modals.filter(x => x !== p));
          resolve({ success: false });
        },
        children: <PromptModalChildren type={type} onConfirm={(v) => {
          opts.onClose?.();
          setModals(modals => modals.filter(x => x !== p));
          resolve({ success: true, value: v });
        }} onCancel={() => { p.onClose?.() }}>{opts.children}</PromptModalChildren>
      };
      setModals(modals => ([
        ...modals, p
      ]));
    }),


  };

  const modalsHolder = <>
    {modals.map((m, i) => <LeagueModal key={i} {...m} />)}
  </>

  return [handlers, modalsHolder] as [typeof handlers, typeof modalsHolder];
}


export default function LeagueModal({ width = "50%", height = "67%", open = false, onClose, canClose = true, closeOnBackdropClick = true, zIndex = 100, showCloseButton = true, children }: React.PropsWithChildren<Props>) {
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
          {showCloseButton && <button onClick={onClose} className="league-btn league-btn-icon">
            <img src="/images/icon-x.png" className="w-5" />
          </button>}
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