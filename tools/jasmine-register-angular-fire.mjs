// Preloaded by the test:node scripts with --import, before jasmine imports any spec.
import { register } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

register('./angular-fire-resolve-hook.mjs', import.meta.url, {
  data: { packageRoot: pathToFileURL(resolve('dist/packages-dist') + '/').href },
});
