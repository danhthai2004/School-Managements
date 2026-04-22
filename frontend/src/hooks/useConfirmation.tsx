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
    const [isLoading, setIsLoading] = useState(false);
    const [options, setOptions] = useState<ConfirmationOptions>({
        title: "",
        message: "",
        onConfirm: () => { },
    });

    const confirm = useCallback((opts: ConfirmationOptions) => {
        setOptions(opts);
        setIsOpen(true);
        setIsLoading(false);
    }, []);

    const close = useCallback(() => {
        if (!isLoading) {
            setIsOpen(false);
        }
    }, [isLoading]);

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            if (options.onConfirm) {
                await options.onConfirm();
            }
            setIsOpen(false);
        } finally {
            setIsLoading(false);
        }
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
            isLoading={isLoading}
        />
    );

    return { confirm, close, ConfirmationDialog };
};
