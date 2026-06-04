// =============================================================
//  ui-premium — Composants UI/UX premium pour Aveho EC (0.58.0+)
//
//  Usage :
//    import { KpiCard, MetricCard, Sparkline, Skeleton, EmptyState, toast,
//             PageHero, Tabs }
//      from "../components/ui-premium";
// =============================================================

export { default as KpiCard } from "./KpiCard";
export { default as Sparkline } from "./Sparkline";
export { default as MetricCard } from "./MetricCard";
export { default as EmptyState } from "./EmptyState";
export { default as Skeleton, SkeletonText, SkeletonRow, SkeletonGrid, SkeletonCard, SkeletonAvatar, SkeletonKpi } from "./Skeleton";
export { showToast, toast } from "./Toast";
// 0.58.3 : nouveaux composants
export { default as PageHero } from "./PageHero";
export { default as Tabs, TabPanel } from "./Tabs";
// 0.58.4 : Avatar premium
export { default as Avatar, AvatarGroup } from "./Avatar";
// 0.58.10 : Select custom premium
export { default as Select } from "./Select";
// 0.58.11 : DatePicker custom premium
export { default as DatePicker } from "./DatePicker";
// 0.58.12 : TimePicker custom (complément du DatePicker)
export { default as TimePicker } from "./TimePicker";
// 0.58.12 : Dialog amélioré (confirm/prompt/alert) au-dessus de Modal
export { Dialog } from "./Dialog";
// 0.58.12 : Drawer Side (panneau latéral coulissant)
export { default as Drawer } from "./Drawer";
// 0.58.13 : RangePicker (plage de dates avec presets)
export { default as RangePicker } from "./RangePicker";
// 0.58.13 : Stepper (wizard multi-étapes)
export { default as Stepper, StepperBody, StepperFooter } from "./Stepper";
// 0.58.13 : BulkToolbar (toolbar contextuelle multi-sélection)
export { default as BulkToolbar } from "./BulkToolbar";
// 0.58.14 : ProgressBar (barre de progression linéaire)
export { default as ProgressBar } from "./ProgressBar";
// 0.58.14 : Tooltip premium (au hover avec arrow + délai)
export { default as Tooltip } from "./Tooltip";
// 0.58.11 : Combobox multi-select avec tags
export { default as Combobox } from "./Combobox";
