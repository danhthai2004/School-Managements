import { useState, useCallback, type ReactNode } from 'react';
import ConfirmationModal from '../components/common/ConfirmationModal';

interface ConfirmationOptions {
    title: string;
    message: ReactNode;
    variant?: 'primary' | 'danger' | 'success' | 'warning';
    confirmText?: string;
    onConfirm: () => Promise<void> | void;
}

export const useConfirmation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmationOptions>({
        title: "",
        message: "",
        onConfirm: () => { },
    });

    const confirm = useCallback((opts: ConfirmationOptions) => {
        setOptions(opts);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleConfirm = async () => {
        if (options.onConfirm) {
            await options.onConfirm();
        }
        close();
    };

    const ConfirmationDialog = () => (
        <ConfirmationModal
            isOpen={isOpen}
            onClose={close}
            onConfirm={handleConfirm}
            title={options.title}
            message={options.message}
            variant={options.variant}
            confirmText={options.confirmText}
        />
    );

    return { confirm, close, ConfirmationDialog };
};
