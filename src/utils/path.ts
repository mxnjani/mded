export function getDirname(path: string): string {
    const match = path.match(/^(.*)[/\\]/);
    return match ? match[1] : '';
}

export function relativePath(fromDir: string, toPath: string): string {
    const fromParts = fromDir.replace(/\\/g, '/').split('/').filter(Boolean);
    const toParts = toPath.replace(/\\/g, '/').split('/').filter(Boolean);

    if (fromParts.length > 0 && toParts.length > 0) {
        if (fromParts[0].toLowerCase() === toParts[0].toLowerCase()) {
            fromParts[0] = fromParts[0].toLowerCase();
            toParts[0] = toParts[0].toLowerCase();
        } else if (fromParts[0].match(/^[a-zA-Z]:$/) && toParts[0].match(/^[a-zA-Z]:$/)) {
            return toPath;
        }
    }

    let commonCount = 0;
    while (commonCount < fromParts.length && commonCount < toParts.length && fromParts[commonCount] === toParts[commonCount]) {
        commonCount++;
    }

    const upString = '../'.repeat(fromParts.length - commonCount);
    const remaining = toParts.slice(commonCount).join('/');

    if (upString === '' && remaining === '') {
        return '.';
    }

    const result = upString + remaining;
    return encodeURI(result);
}

export function resolvePath(baseDir: string, relPath: string): string {
    if (relPath.startsWith('http://') || relPath.startsWith('https://') || relPath.startsWith('data:') || relPath.startsWith('asset://') || relPath.startsWith('file://')) {
        return relPath;
    }

    if (relPath.match(/^[a-zA-Z]:[/\\]/) || relPath.startsWith('/')) {
        return relPath;
    }

    try {
        relPath = decodeURI(relPath);
    } catch (e) { }

    const sep = baseDir.includes('\\') ? '\\' : '/';

    const baseParts = baseDir.replace(/\\/g, '/').split('/').filter(Boolean);
    const relParts = relPath.replace(/\\/g, '/').split('/').filter(Boolean);

    for (const part of relParts) {
        if (part === '.') continue;
        if (part === '..') {
            baseParts.pop();
        } else {
            baseParts.push(part);
        }
    }

    let resolved = baseParts.join(sep);

    if (sep === '\\' && baseDir.match(/^[a-zA-Z]:[/\\]/)) {
        if (baseParts.length === 1 && baseParts[0].match(/^[a-zA-Z]:$/)) {
            resolved = baseParts[0] + '\\';
        }
        if (!resolved.match(/^[a-zA-Z]:\\/)) {
            resolved = resolved.replace(/^([a-zA-Z]:)/, '$1\\');
        }
    } else if (sep === '/' && baseDir.startsWith('/')) {
        resolved = '/' + resolved;
    }

    return resolved;
}
