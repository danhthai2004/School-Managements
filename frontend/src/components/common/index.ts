// Skeleton Components
export {
    Skeleton,
    SkeletonCard,
    SkeletonTable,
    SkeletonTableRow,
    SkeletonChart,
    SkeletonAvatar,
    SkeletonListItem,
} from "./Skeleton";

// Toast System
export { ToastProvider, useToast } from "./Toast";

// Empty States
export {
    EmptyState,
    NoDataState,
    NoSearchResultState,
    ErrorState,
    NoStudentsState,
    NoTeachersState,
    NoClassesState,
} from "./EmptyState";

// Status Badges
export {
    StatusBadge,
    TeacherStatusBadge,
    getStatusLabel,
} from "./StatusBadge";
export type { StudentStatus, TeacherStatus } from "./StatusBadge";

export { default as BatchDeleteModal } from "./BatchDeleteModal";

