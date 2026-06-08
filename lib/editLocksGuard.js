// =============================================================
//  lib/editLocksGuard.js (0.65.1 hotfix4)
//
//  Guard GLOBAL pour la table edit_locks.
//  Si la table n'existe pas en DB, on le découvre 1 fois et on désactive
//  TOUS les hooks/composants liés (useEditLock + EditingIndicator).
//
//  Évite le spam de 404 dans la console.
// =============================================================

let _tableMissing = false;
let _checkPromise = null;

export function isEditLocksDisabled() {
  return _tableMissing;
}

export function markEditLocksMissing() {
  _tableMissing = true;
}

export async function probeEditLocksTable(supabase) {
  if (_tableMissing) return false;
  if (_checkPromise) return _checkPromise;

  _checkPromise = (async () => {
    try {
      const { error } = await supabase
        .from("edit_locks")
        .select("id", { count: "exact", head: true })
        .limit(1);
      if (error && (
        error.code === "42P01" ||
        error.code === "PGRST116" ||
        error.message?.includes("does not exist") ||
        error.message?.includes("schema cache") ||
        error.message?.includes("Could not find")
      )) {
        _tableMissing = true;
        return false;
      }
      return true;
    } catch (e) {
      _tableMissing = true;
      return false;
    } finally {
      // Garde le résultat en cache via _tableMissing
    }
  })();

  return _checkPromise;
}
