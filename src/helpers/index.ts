import { isFunction, isObject } from 'lodash';

/**
 * Generic Types
 */

/**
 * Generic typing for component wrapped in an HoC
 */
export type RC<P> = React.SFC<P> | React.ComponentClass<P>;

/**
 * Generic typing for an HOC
 */
export type HOC<O, P> = (C: RC<O>) => RC<P>;

/**
 * Omits keys from an existing type
 */
export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

/**
 * Subtracts keys from an existing type
 */
export type Subtract<T, K> = Omit<T, keyof K>;
/**
 * Arguments for the classes function
 */
export type ClassesArgs =
  | (string | false | null | 0 | undefined)[]
  | { [key: string]: boolean }
  | string;

/**
 * Executes a the first arg as a function if it is a function with supplied arguments
 * Returns the first arg if not a function
 */
export const execIfFunc = (fn, ...args) =>
  isFunction(fn) ? (args.length > 0 ? fn(...args) : fn()) : fn;

/**
 * Executes the first arg if a function with remaining args; else, returns an array of remaining args
 */
export const maybeApply = (fn, ...args) => (isFunction(fn) ? fn(...args) : args);

/**
 * Executes first arg if function, if first arg is array, runs execIfFunc across them
 */
export const execOrMapFn = (fn, ...args) =>
  Array.isArray(fn) ? fn.map(f => execIfFunc(f, ...args)) : execIfFunc(fn, ...args);

/**
 * Provide this to be classNames
 */
export function classes(...args: ClassesArgs[]) {
  const arr = args.reduce((c: any[], obj) => {
    if (Array.isArray(obj)) {
      return [...c, ...obj.filter(Boolean)];
    }
    if (isObject(obj)) {
      return [
        ...c,
        ...Object.keys(obj)
          // @ts-ignore: this is an object
          .map(k => Boolean(obj[k]) && k)
          .filter(Boolean),
      ];
    }

    return [...c, typeof obj === 'string' ? obj : ''];
  }, []);
  return arr.filter(Boolean).join(' ');
}

/**
 * Checks if the argument is defined
 */
export const isDefined = arg => typeof arg !== 'undefined';

/**
 * Checks if the arg is null
 */
export const isNull = arg => arg === null;
/**
 * Returns first defined value, defaults to empty string
 */
export const findValue = (...args) => {
  for (let i = 0; i < args.length; i++) {
    if (isDefined(args[i])) {
      return args[i];
    }
  }
  return '';
};
/**
 * Returns an object sans keys
 */
export const filterKeysFromObj = (keys: string[], obj: { [key: string]: any }) =>
  Object.keys(obj)
    .filter(key => !keys.includes(key))
    .reduce((newObj, key) => ({ ...newObj, [key]: obj[key] }), {});

/**
 * Does nothing
 */
export const noop = () => {};

/**
 * Returns the argument
 */
export const identity = (x: any): any => x;

/**
 * An easier way to call Object.prototype.hasOwnProperty.call
 */
export const hasOwnProperty = (obj: any, prop: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, prop);

/**
 * Composes HOCs with some type safety. Composed as (inner, middle, outer)
 */
export const composeHOCs = <P extends {}>(...hocs: HOC<any, any>[]) => (Component: RC<P>) =>
  hocs.reduce((g, f) => f(g), Component);

/**
 * Runs `getValue` on every item in an object
 */
export const gatherValues = (set: { [key: string]: { getValue(): any } }): { [key: string]: any } =>
  Object.keys(set).reduce((values, name) => ({ ...values, [name]: set[name].getValue() }), {});

/**
 * Calls validate on every item in an object and combines the results into a single array
 */
export const gatherErrors = (
  set: {
    [key: string]: {
      validate(value: any, updateErrors: boolean): React.ReactNode[];
      getValue(): any;
    };
  },
  updateErrors = false
): React.ReactNode[] =>
  Object.keys(set)
    .reduce((errors, name) => {
      const field = set[name];
      const value = field.getValue();
      return [...errors, ...field.validate(value, updateErrors)];
    }, [])
    .filter(Boolean);

/**
 * Attempts to transform a ReactNode into a uniqueish key
 */
export const toKey = (arg: React.ReactNode): string | number => {
  if (typeof arg === 'string' || typeof arg === 'number') {
    return arg;
  }

  if (hasOwnProperty(arg, 'toString')) {
    return arg.toString();
  }

  if (isObject(arg)) {
    return JSON.stringify(arg);
  }

  return String(arg);
};

const typesWithSelectionStart = ['text', 'search', 'password', 'tel', 'url'];
/**
 * Checks a whitelist of input types to see if you can access selectionStart on the input node
 * (otherwise, Safari errors)
 */
export const canAccessSelectionStart = (type: string): boolean =>
  typesWithSelectionStart.includes(type);

/**
 * Moves the cursor on fields
 *
 * Works on text based inputs
 *
 */
export function moveCursor(el: any, position = -1) {
  /* eslint-disable no-param-reassign */
  const types = /text|password|search|tel|url/;
  // @ts-ignore
  if (canAccessSelectionStart(el.type)) {
    const pos = position > -1 ? position : el.value.length;
    el.selectionStart = el.selectionEnd = pos;
  } else if ('createTextRange' in el && isFunction(el.createTextRange)) {
    const range = el.createTextRange();
    range.collapse(false);
    range.select();
  } else {
    // Hack fix for <input type="number" />
    const tmpValue = el.value;
    el.value = '';
    el.value = tmpValue;
  }
  /* eslint-enable no-param-reassign */
}

/**
 *  functionally equivalent to String.repeat(int);
 */
function repeat(str: string, count: number) {
  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = str;
  }
  return out.join('');
}

/**
 * functionally equivalent to String.padStart(length, str);
 */
function padStart(str: string, targetLength: number, padStr: string) {
  if (str.length > targetLength) {
    return str;
  }
  const targetLen = targetLength - str.length;
  if (targetLen > padStr.length) {
    // eslint-disable-next-line
    padStr += repeat(padStr, Math.floor(targetLen / padStr.length));
  }
  return padStr.slice(0, targetLen) + str;
}

/**
 * Creates a reusable transformer function
 */
function createTransformer(transformer: (value: string) => string) {
  return function transform(value: string, cursor: number): { value: string; cursor: number } {
    const leftValue = value.slice(0, cursor);
    const leftTransform = transformer(leftValue);
    const delta = leftTransform.length - leftValue.length;
    return {
      value: transformer(value),
      cursor: cursor + delta,
    };
  };
}

/**
 * Gets a patterns for an unbounded mask
 */
function getPattern(pattern: string, wildcard: string, valueRawLen: number): string {
  const patternRawLen = pattern.match(new RegExp(wildcard, 'g'))!.length || 0;
  const pFormattingChars = pattern.length - patternRawLen;
  const targetLength = valueRawLen + (Math.ceil(valueRawLen / patternRawLen) - pFormattingChars);
  return padStart('', targetLength, pattern)
    .split('')
    .reverse()
    .join('');
}

/**
 * Creates a reusable masking function
 */
function createMask(pattern: string, wildcard: string, unbound: boolean) {
  return function mask({ value, cursor }: { value: string; cursor: number }): [string, number] {
    // Unmasked value
    const v = value.split('');
    // The mask i.e. (___) ___, or, if unbound, the mask partial
    const p = unbound ? getPattern(pattern, wildcard, value.length).split('') : pattern.split('');
    let delta = 0;
    let pi = 0;
    for (let vi = 0, plen = p.length, vlen = v.length; pi < plen && vi < vlen; pi++) {
      if (p[pi] === wildcard) {
        p[pi] = v[vi++];
      } else if (vi < cursor) {
        delta += 1;
      }
    }
    return [p.slice(0, pi).join(''), cursor + delta];
  };
}

/**
 * Creates a simple formatter.
 *
 * Note, if you are going to create a formatter that is "unbound," then take special note that you
 * restrict yourself to a charset that does not include anything in the mask. E.g. if the mask looks
 * like "___," — (to put commas every three characters) — then the transformer function should strip
 * these out. E.g. `const transformer = (value) => value.replace(/[_-]{1,}/g, '');`
 *
 * @param transformer
 * @param pattern
 * @param unbound
 * @param wildcard
 */
export default function createFormatter(
  transformer: (value: any) => string,
  pattern: string,
  unbound = false,
  wildcard = '_'
) {
  const transform = createTransformer(transformer);
  const mask = createMask(pattern, wildcard, unbound);
  return (value: string, cursor: number) => mask(transform(value, cursor));
}
