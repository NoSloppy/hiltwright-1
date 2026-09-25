import { isAbsolute, relative, resolve } from 'node:path';

/** True when `target` is `root` itself or somewhere inside it, judged by resolved paths, not by how the names begin. */
export function insideFolder(root: string, target: string): boolean {
  const rel = relative(resolve(root), resolve(target));
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}
