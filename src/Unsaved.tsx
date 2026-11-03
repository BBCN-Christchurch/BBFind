import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useBlocker } from "react-router-dom";

type Editor = { dirty: boolean; save: () => Promise<boolean> };
const Context = createContext({
  register: (_editor: Editor | null) => {},
  request: (action: () => void) => action(),
  clean: () => {},
});
export const useUnsaved = () => useContext(Context);
export function UnsavedProvider({ children }: { children: ReactNode }) {
  const editor = useRef<Editor | null>(null),
    pending = useRef<(() => void) | null>(null),
    bypass = useRef(false);
  const [dirty, setDirty] = useState(false),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const register = useCallback((value: Editor | null) => {
    editor.current = value;
    setDirty(Boolean(value?.dirty));
  }, []);
  const clean = useCallback(() => {
    if (editor.current) editor.current.dirty = false;
    setDirty(false);
  }, []);
  const request = useCallback((action: () => void) => {
    if (!editor.current?.dirty) {
      action();
      return;
    }
    pending.current = action;
    setOpen(true);
  }, []);
  const blocker = useBlocker(() =>
    Boolean(editor.current?.dirty && !bypass.current),
  );
  useEffect(() => {
    if (blocker.state === "blocked") setOpen(true);
  }, [blocker.state]);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function stay() {
    if (busy) return;
    pending.current = null;
    if (blocker.state === "blocked") blocker.reset();
    setOpen(false);
    setError("");
  }
  function leave() {
    bypass.current = true;
    clean();
    setOpen(false);
    if (blocker.state === "blocked") blocker.proceed();
    else pending.current?.();
    pending.current = null;
    setTimeout(() => {
      bypass.current = false;
    }, 0);
  }
  return (
    <Context.Provider value={{ register, request, clean }}>
      {children}
      <dialog
        ref={dialog}
        className="workflow-dialog"
        aria-labelledby="unsaved-heading"
        onCancel={(event) => {
          event.preventDefault();
          stay();
        }}
      >
        <h2 id="unsaved-heading">Save your changes before leaving?</h2>
        <p>
          Your listing has unsaved changes. Save a private draft, leave without
          saving, or continue editing.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="button-row">
          <button
            className="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setError("");
                if (await editor.current?.save()) leave();
                else
                  setError(
                    "The draft could not be saved. Continue editing to check the highlighted fields, then try again.",
                  );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Save draft and leave"}
          </button>
          <button className="button secondary" disabled={busy} onClick={leave}>
            Leave without saving
          </button>
          <button className="text-button" disabled={busy} onClick={stay}>
            Continue editing
          </button>
        </div>
      </dialog>
    </Context.Provider>
  );
}
