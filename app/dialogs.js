"use client";
// =============================================================
//  app/dialogs.js — Modales + singleton dialogs.confirm() / alert()
//  Alpha 0.46.0 (consolidé pour éviter le crossover lib/↔app/)
//
//  Tout en un fichier client pour ne pas créer de boucle d'import
//  avec lib/ (qui parfois plante webpack en server-component layout).
//
//  Exports :
//    - <ConfirmModal />, <AlertModal />  (composants)
//    - useConfirm(), useAlert()          (hooks)
//    - dialogs.confirm(), dialogs.alert()  (singleton global)
//    - <DialogsHost />                   (à mettre une seule fois dans le layout)
// =============================================================
import { useEffect, useState} from "react";
import { Modal, Btn } from "./ui";

// =============================================================
//  ConfirmModal — Confirmation accessible alternative à confirm()
// =============================================================
export function ConfirmModal({ 
  open, 
  title = "Confirmer", 
  message, 
  confirmLabel = "Confirmer", 
  cancelLabel = "Annuler",
  variant = "primary",
  icon = "ti-help-circle",
  onConfirm, 
  onCancel 
}) {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      icon={icon}
      color={variant === "danger" ? "#c0392b" : "#185FA5"}
      size="sm"
      footer={<>
        <Btn variant="ghost" onClick={onCancel}>{cancelLabel}</Btn>
        <Btn variant={variant} onClick={onConfirm}>{confirmLabel}</Btn>
      </>}
    >
      <p style={{ margin: 0, fontSize: 14, color: "#2a3a48", whiteSpace: "pre-line" }}>
        {message}
      </p>
    </Modal>
  );
}

// =============================================================
//  AlertModal — équivalent accessible de alert()
// =============================================================
export function AlertModal({ open, title = "Information", message, onClose, variant = "primary", icon = "ti-info-circle" }) {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={icon}
      color={variant === "danger" ? "#c0392b" : variant === "success" ? "#5aa05a" : "#185FA5"}
      size="sm"
      footer={<Btn variant="primary" onClick={onClose}>OK</Btn>}
    >
      <p style={{ margin: 0, fontSize: 14, color: "#2a3a48", whiteSpace: "pre-line" }}>
        {message}
      </p>
    </Modal>
  );
}

// =============================================================
//  Hooks programmatiques useConfirm() / useAlert()
// =============================================================
export function useConfirm() {
  const [state, setState] = useState(null);

  function confirm(options) {
    return new Promise((resolve) => {
      setState({
        ...options,
        onConfirm: () => { setState(null); resolve(true); },
        onCancel: () => { setState(null); resolve(false); },
      });
    });
  }

  const ConfirmModalElement = state ? (
    <ConfirmModal
      open={true}
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      icon={state.icon}
      onConfirm={state.onConfirm}
      onCancel={state.onCancel}
    />
  ) : null;

  return { confirm, ConfirmModalElement };
}

export function useAlert() {
  const [state, setState] = useState(null);

  function alert(options) {
    return new Promise((resolve) => {
      setState({
        ...(typeof options === "string" ? { message: options } : options),
        onClose: () => { setState(null); resolve(); },
      });
    });
  }

  const AlertModalElement = state ? (
    <AlertModal
      open={true}
      title={state.title}
      message={state.message}
      variant={state.variant}
      icon={state.icon}
      onClose={state.onClose}
    />
  ) : null;

  return { alert, AlertModalElement };
}

// =============================================================
//  Singleton global dialogs.confirm() / dialogs.alert()
// =============================================================
let resolveConfirm = null;
let resolveAlert = null;
let listenersConfirm = [];
let listenersAlert = [];

function setConfirmGlobal(opts) {
  listenersConfirm.forEach(l => l(opts));
}
function setAlertGlobal(opts) {
  listenersAlert.forEach(l => l(opts));
}

// 0.58.13 : Migration progressive vers <Dialog /> premium
//   - dialogs.alert(string) ou dialogs.alert({ title, message, variant })
//     délègue maintenant à Dialog.alert() du nouveau composant ui-premium.
//   - dialogs.confirm({ title, message, variant }) délègue à Dialog.confirm().
//   - Rétrocompatible 100% : tous les appels existants fonctionnent à l'identique
//     mais bénéficient automatiquement du nouveau design premium
//     (backdrop blur, animations, header coloré avec icon adapté).
//   - Le fallback singleton (setConfirmGlobal / setAlertGlobal) est conservé
//     en cas d'erreur d'import dynamique (SSR ou contexte particulier).
function tryNewDialog(method, options) {
  if (typeof window === "undefined") return null;
  try {
    // Dynamic import pour éviter les soucis SSR + cycle
    return import("./components/ui-premium/Dialog").then((mod) => {
      const D = mod.Dialog || mod.default;
      return D[method](options);
    });
  } catch (e) {
    return null;
  }
}

export const dialogs = {
  confirm(options) {
    // Premium : Dialog.confirm() avec mêmes propriétés
    const newAttempt = tryNewDialog("confirm", {
      title: options?.title || "Confirmation",
      message: options?.message,
      danger: options?.variant === "danger",
      confirmLabel: options?.confirmLabel,
      cancelLabel: options?.cancelLabel,
    });
    if (newAttempt) return newAttempt;
    // Fallback legacy
    return new Promise((resolve) => {
      resolveConfirm = resolve;
      setConfirmGlobal(options || {});
    });
  },
  alert(options) {
    // Normaliser : si string passé, l'utiliser comme message
    const opts = typeof options === "string" ? { message: options } : (options || {});
    // Mapping variant legacy → variant Dialog premium
    const variantMap = { primary: "info", danger: "danger", warning: "warning", success: "success" };
    const newAttempt = tryNewDialog("alert", {
      title: opts.title || "Information",
      message: opts.message,
      variant: variantMap[opts.variant] || "info",
    });
    if (newAttempt) return newAttempt;
    // Fallback legacy
    return new Promise((resolve) => {
      resolveAlert = resolve;
      setAlertGlobal(opts);
    });
  },
};

// =============================================================
//  <DialogsHost /> — à mettre dans le layout root, une seule fois
// =============================================================
export function DialogsHost() {
  const [confirmState, setConfirmState] = useState(null);
  const [alertState, setAlertState] = useState(null);

  useEffect(() => {
    const lc = (opts) => setConfirmState(opts);
    const la = (opts) => setAlertState(opts);
    listenersConfirm.push(lc);
    listenersAlert.push(la);
    return () => {
      listenersConfirm = listenersConfirm.filter(x => x !== lc);
      listenersAlert = listenersAlert.filter(x => x !== la);
    };
  }, []);

  function handleConfirm() {
    setConfirmState(null);
    if (resolveConfirm) { resolveConfirm(true); resolveConfirm = null; }
  }
  function handleCancel() {
    setConfirmState(null);
    if (resolveConfirm) { resolveConfirm(false); resolveConfirm = null; }
  }
  function handleAlertClose() {
    setAlertState(null);
    if (resolveAlert) { resolveAlert(); resolveAlert = null; }
  }

  return (
    <>
      {confirmState && (
        <ConfirmModal
          open={true}
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
          variant={confirmState.variant}
          icon={confirmState.icon}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      {alertState && (
        <AlertModal
          open={true}
          title={alertState.title}
          message={alertState.message}
          variant={alertState.variant}
          icon={alertState.icon}
          onClose={handleAlertClose}
        />
      )}
    </>
  );
}
