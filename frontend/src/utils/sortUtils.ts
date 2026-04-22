export function vietnameseNameSort(a: string, b: string): number {
    return a.localeCompare(b, "vi", { sensitivity: "base" });
}