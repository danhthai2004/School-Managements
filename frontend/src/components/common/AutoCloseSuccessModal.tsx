import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
    duration?: number;
}

export default function AutoCloseSuccessModal({ isOpen, onClose, message, duration = 2500 }: SuccessModalProps) {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose, duration]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none p-4">
            {/* Subtle backdrop */}
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] transition-opacity duration-300" />

            <div className="relative bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 rounded-2xl p-0 min-w-[320px] overflow-hidden transform transition-all animate-in fade-in slide-in-from-bottom-8 zoom-in-95 duration-500 pointer-events-auto">
                <div className="p-8 pb-10 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-tr from-green-100 to-emerald-50 rounded-full flex items-center justify-center mb-4 shadow-sm ring-4 ring-white">
                        <CheckCircle2 size={32} className="text-emerald-500" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Thành công!</h3>
                    <p className="text-slate-500 font-medium px-2">{message}</p>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-slate-100 w-full">
                    <div
                        className="h-full bg-emerald-500 rounded-full transition-all ease-linear"
                        style={{
                            width: '0%',
                            animation: `progress ${duration}ms linear forwards`
                        }}
                    />
                </div>

                <style>{`
                    @keyframes progress {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                `}</style>
            </div>
        </div>
    );
}
