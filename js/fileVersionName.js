const numberedSuffix = /(?:\s*\(\d+\)| \d+|-\d+)$/;

export function unnumberedFileName(name) {
    const dot = name.lastIndexOf(".");
    const stem = dot < 0 ? name : name.slice(0, dot);
    return stem.replace(numberedSuffix, "") + (dot < 0 ? "" : name.slice(dot));
}
