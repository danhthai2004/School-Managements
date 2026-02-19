import React from 'react';
import { PlusIcon } from '../../SchoolAdminIcons';

interface AccountCreationTableProps<T> {
    title: string;
    subtitle: string;
    data: T[];
    columns: {
        header: string;
        accessor: (item: T) => React.ReactNode;
        className?: string;
    }[];
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onCreate: () => void;
    creating: boolean;
    emptyMessage: React.ReactNode;
    createButtonLabel?: string;
}

function AccountCreationTable<T extends { id: string }>({
    title,
    subtitle,
    data,
    columns,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onCreate,
    creating,
    emptyMessage,
    createButtonLabel
}: AccountCreationTableProps<T>) {
    const isAllSelected = data.length > 0 && selectedIds.size === data.length;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <p className="text-sm text-gray-500">{subtitle}</p>
                </div>
                <button
                    onClick={onCreate}
                    disabled={selectedIds.size === 0 || creating}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <PlusIcon />
                    <span>{creating ? 'Đang xử lý...' : (createButtonLabel || `Tạo tài khoản (${selectedIds.size})`)}</span>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left w-10">
                                <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={onToggleSelectAll}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 pointer-events-auto cursor-pointer"
                                />
                            </th>
                            {columns.map((col, idx) => (
                                <th key={idx} className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase ${col.className || ''}`}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((item) => (
                            <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                                <td className="px-6 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(item.id)}
                                        onChange={() => onToggleSelect(item.id)}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 pointer-events-auto cursor-pointer"
                                    />
                                </td>
                                {columns.map((col, idx) => (
                                    <td key={idx} className={`px-6 py-4 ${col.className || ''}`}>
                                        {col.accessor(item)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + 1} className="px-6 py-8 text-center text-gray-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AccountCreationTable;
