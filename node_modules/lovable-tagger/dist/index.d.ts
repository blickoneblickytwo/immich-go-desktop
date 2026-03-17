import { Plugin } from 'vite';

interface LovableTaggerOptions {
    jsxSource?: boolean;
    tailwindConfig?: boolean;
    virtualOverrides?: boolean;
    debug?: boolean;
}
declare function lovableTagger({ jsxSource, tailwindConfig, virtualOverrides, debug, }?: LovableTaggerOptions): Plugin;

export { type LovableTaggerOptions, lovableTagger as componentTagger };
