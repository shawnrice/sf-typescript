import * as React from 'react';
import { isFunction } from 'lodash';

import {
  execIfFunc,
  execOrMapFn,
  identity,
  composeHOCs,
  isDefined,
  isNull,
  findValue,
  maybeApply,
  filterKeysFromObj,
  hasOwnProperty,
} from '../../helpers/index';

import { AsFieldContext, withForm, withSlide } from '../../helpers/contexts';

const emptyArray = [];

interface AsFieldProps {
  name: string;

  type?: string;

  autoComplete?: string;
  defaultValue?: any;
  value?: any;
  defaultChecked?: boolean;
  checked?: boolean;
  multiple?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateDebounceTimeout?: boolean;
  format?(value: any, cursor: number | null): [any, number | null];
  unformat?(value: any): any;
  onBlur?(event): void;
  onFocus?(event): void;
  onClick?(event): void;
  onChange?(event): void;
  validate?:
    | ((value: any) => React.ReactNode | React.ReactNode[])
    | ((value: any) => React.ReactNode | React.ReactNode[])[];
}

interface ContextProps {
  register?(payload): void;
  unregister?(payload): void;
  formAutoComplete?: boolean;
  onKeyDown?(event): void;
  initialFormValues: { [key: string]: any };

  registerWithSlide?(payload): void;
  unregisterFromSlide?(name): void;
}

export interface WrapperProps extends ContextProps {
  doNotRegister?: boolean;
  [key: string]: any;
}

export interface AsFieldState {
  errors: React.ReactNode[];
  value: any;
  cursor?: number;
}

const getInitialValue = <P extends AsFieldProps>(props: P & ContextProps) => {
  const { defaultValue, value, defaultChecked, checked, type, initialFormValues = {} } = props;
  const { [props.name]: initialValue } = initialFormValues;

  if (props.multiple) {
    findValue(value, initialValue, defaultValue, []);
  }

  switch (type) {
    case 'checkbox':
      return findValue(!!checked, !!initialValue, !!defaultChecked, false);
    case 'number':
      return findValue(value, initialValue, defaultValue, null);
    default:
      return findValue(value, initialValue, defaultValue, '');
  }
};

const removeProps = [
  'defaultValue',
  'register',
  'unregister',
  'format',
  'formAutoComplete',
  'unformat',
  'onFocus',
  'onBlur',
  'onChange',
  'onClick',
  'validate',
  'validateOnBlur',
  'validateOnChange',
  'validateDebounceTimeout',
  'hasFormSubmitted',
  'isFormSubmitting',
  'formErrors',
  'registerWithSlide',
  'unregisterFromSlide',
];

const typesWithSelectionStart = ['text', 'search', 'password', 'tel', 'url'];
const canAccessSelectionStart = (type: string): boolean => typesWithSelectionStart.includes(type);

interface InjectedProps {
  onBlur(event): void;
  onFocus(event): void;
  onChange(event): void;
  onClick(event): void;
  setRef(el): void;
  autoComplete: string;
  errors: React.ReactNode[];
  value: any;
}

const rando = (chars: number = 6) =>
  Math.random()
    .toString(36)
    .slice(-chars);

const asField = <P extends AsFieldProps>(
  WrappedComponent: React.ComponentType<P extends InjectedProps ? any : any>,
  options = {}
) => {
  return class AsField extends React.PureComponent<P & ContextProps, AsFieldState> {
    constructor(props: P & ContextProps) {
      super(props);

      const processed = maybeApply(this.format, getInitialValue(props), null);
      this.initialValue = Array.isArray(processed) ? processed[0] : processed;
      // this.initialErrors = this.validate(this.initialValue);
      this.autoComplete = rando();
      this.state = {
        value: this.initialValue,
        errors: [], //this.initialErrors,
      };
    }

    static defaultProps = {
      validateDebounceTimeout: 100,
      unformat: identity,
      format: (value, cursor) => [value, cursor],
    };

    componentDidMount() {
      const { register, name, registerWithSlide } = this.props;
      const { getValue, setValue, reset, validate, focus } = this;
      execIfFunc(register, { name, getValue, setValue, reset, validate, focus });
      execIfFunc(registerWithSlide, { name, getValue, setValue, reset, validate, focus });
    }

    componentDidUpdate() {
      const { cursor } = this.state;
      if (this.innerRef && canAccessSelectionStart(this.props.type)) {
        this.innerRef.selectionStart = this.innerRef.selectionEnd = cursor;
      }
    }

    componentWillUnmount() {
      const { name, unregister, unregisterFromSlide } = this.props;
      execIfFunc(unregister, name);
      execIfFunc(unregisterFromSlide, name);
    }

    fields = {};

    initialValue: any;
    initialErrors: string[];
    autoComplete: string;
    innerRef: any;

    register = payload => {
      this.fields[payload.name] = { ...payload };
    };

    unregister = name => {
      const { [name]: _, ...rest } = this.fields;
      this.fields = rest;
    };

    fieldInterface = { register: this.register, unregister: this.unregister };

    getValue = () => this.unformat(this.state.value);

    setValue = (rawValue: any) => {
      const rawCursor = rawValue && hasOwnProperty(rawValue, 'length') ? rawValue.length : null;
      const [value, cursor] = this.format(rawValue, rawCursor);
      this.setState({ value, cursor });
    };

    reset = () => this.setState({ value: this.initialValue, errors: emptyArray });

    handleOnKeyDown = event => {
      event.persist();
      maybeApply(this.props.onKeyDown, event);
    };

    handleOnChange = event => {
      event.persist();
      const { checked, value } = event.target;
      const { validateOnChange, validateDebounceTimeout, type, onChange } = this.props;

      if (type === 'checkbox') {
        this.setState({ value: checked });
        execIfFunc(onChange, event);
        return;
      }

      const cursor =
        this.innerRef && canAccessSelectionStart(type) && 'selectionStart' in this.innerRef
          ? this.innerRef.selectionStart
          : null;

      const processed = maybeApply(this.format, value, cursor);
      const newValue = Array.isArray(processed) ? processed[0] : processed;
      const newCursor = Array.isArray(processed) ? processed[1] : cursor;

      if (validateOnChange) {
        window.clearTimeout(this.validateDebounceTimer);
        this.validateDebounceTimer = setTimeout(
          () => this.validate(newValue, true),
          validateDebounceTimeout
        );
      }

      this.setState({
        value: newValue,
        cursor: newCursor,
      });

      execIfFunc(onChange, event);
    };

    validateDebounceTimer = null;

    handleOnFocus = event => {
      const { onFocus } = this.props;
      if (isFunction(onFocus)) {
        event.persist();
        onFocus(event);
      }
    };

    handleOnBlur = event => {
      const { onBlur, validateOnBlur } = this.props;
      if (validateOnBlur) {
        this.validate(event.target.value, true);
      }

      if (isFunction(onBlur)) {
        event.persist();
        onBlur(event);
      }
    };

    handleOnClick = event => {
      const { onClick } = this.props;
      if (isFunction(onClick)) {
        event.persist();
        onClick(event);
      }
    };

    focus = () => {
      if (this.innerRef && isFunction(this.innerRef.focus)) {
        this.innerRef.focus();
      }
    };

    format = (value, cursor) => maybeApply(this.props.format, value, cursor);

    unformat = value => maybeApply(this.props.unformat, value);

    validate = (value: any, updateErrors: boolean = false) => {
      const { validate } = this.props;

      const initial = execOrMapFn(validate, value);
      const errors = Array.isArray(initial) ? initial.filter(Boolean) : [initial].filter(Boolean);
      if (updateErrors) {
        this.setState({ errors });
      }
      return errors.length === 0 ? emptyArray : errors;
    };

    isValid = () => this.validate(this.getValue()).length === 0;

    setRef = el => {
      this.innerRef = el;
    };

    render() {
      const props = filterKeysFromObj(removeProps, this.props);
      const { autoComplete, formAutoComplete } = this.props;
      const { value } = this.state;

      const autoCompleteValue = findValue(
        autoComplete,
        isDefined(formAutoComplete) && !formAutoComplete ? this.autoComplete : ''
      );

      return (
        <AsFieldContext.Provider value={this.fieldInterface}>
          <WrappedComponent
            {...props}
            autoComplete={autoCompleteValue}
            errors={this.state.errors}
            onFocus={this.handleOnFocus}
            onBlur={this.handleOnBlur}
            onClick={this.handleOnClick}
            onChange={this.handleOnChange}
            value={isDefined(value) && !isNull(value) ? value : ''}
            setRef={this.setRef}
          />
        </AsFieldContext.Provider>
      );
    }
  };
};

export { asField, AsFieldContext };
const Composed = composeHOCs<AsFieldProps>(asField, withSlide, withForm);
export default Composed;
