import { isFunction, isObject } from 'lodash';
export type RC<P> = React.SFC<P> | React.ComponentClass<P>;

export type HOC<O, P> = (C: RC<O>) => RC<P>;
export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export type Subtract<T, K> = Omit<T, keyof K>;

export const execIfFunc = (fn, ...args) =>
  isFunction(fn) ? (args.length > 0 ? fn(...args) : fn()) : fn;

export const maybeApply = (fn, ...args) => (isFunction(fn) ? fn(...args) : args);

export const execOrMapFn = (fn, ...args) =>
  Array.isArray(fn) ? fn.map(f => execIfFunc(f, ...args)) : execIfFunc(fn, ...args);

export const classes = (...args) => {
  return args.filter(Boolean).join(' ');
};

export const isDefined = arg => typeof arg !== 'undefined';
export const isNull = arg => arg === null;
export const findValue = (...args) => {
  for (let i = 0; i < args.length; i++) {
    if (isDefined(args[i])) {
      return args[i];
    }
  }
  return '';
};

export const filterKeysFromObj = (keys: string[], obj: { [key: string]: any }) =>
  Object.keys(obj)
    .filter(key => !keys.includes(key))
    .reduce((newObj, key) => ({ ...newObj, [key]: obj[key] }), {});

export const noop = () => {};

export const identity = (x: any): any => x;

export const hasOwnProperty = (obj: any, prop: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, prop);

export const composeHOCs = <P extends {}>(...hocs: HOC<any, any>[]) => (C: RC<P>) =>
  hocs.reduce((g, f) => f(g), C);

export const gatherValues = (set): { [key: string]: any } =>
  Object.keys(set).reduce((values, name) => ({ ...values, [name]: set[name].getValue() }), {});

export const gatherErrors = (set, updateErrors = false): React.ReactNode[] =>
  Object.keys(set)
    .reduce((errors, name) => {
      const field = set[name];
      const value = field.getValue();
      return [...errors, ...field.validate(value, updateErrors)];
    }, [])
    .filter(Boolean);

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
