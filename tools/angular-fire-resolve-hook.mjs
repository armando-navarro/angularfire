// Node resolve hook for the jasmine run: maps @angular/fire imports to the built library under
// dist/packages-dist through its exports map, since nothing installs the package into node_modules.
import { readFileSync } from 'node:fs';

const packageName = '@angular/fire';

let packageRoot;
let exportsMap;

export function initialize(data) {
  packageRoot = data.packageRoot;
  exportsMap = JSON.parse(readFileSync(new URL('package.json', packageRoot), 'utf8')).exports;
}

export function resolve(specifier, context, nextResolve) {
  if (specifier !== packageName && !specifier.startsWith(`${packageName}/`)) {
    return nextResolve(specifier, context);
  }
  const subpath = specifier === packageName ? '.' : `./${specifier.slice(packageName.length + 1)}`;
  const entry = exportsMap[subpath]?.default;
  if (typeof entry !== 'string') {
    throw new Error(`The built ${packageName} has no "${subpath}" entry in its exports map, so "${specifier}" cannot be resolved for the Node specs.`);
  }
  return { url: new URL(entry, packageRoot).href, shortCircuit: true, format: 'module' };
}
