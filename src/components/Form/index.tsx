import * as React from 'react';
import { classes, gatherErrors, maybePromisify, isDefined } from '../../helpers/index';
import { memoize, isFunction } from 'lodash';
import { FormContext } from '../../helpers/contexts';

/**
 * Note, since the submit hooks rely on promises, and since promises are not cancelable,
 * we're wrapping handling them in checks to see if the component is mounted.
 * Facebook considers this an antipattern.
 *   (see https://reactjs.org/blog/2015/12/16/ismounted-antipattern.html)
 *
 * But, since this is a library, we don't want to change how promises work.
 */

export interface FormProps {
  name: string;
  onSubmit(values: { [key: string]: any }): Promise<{ [key: string]: any }>;

  beforeSubmit(values: { [key: string]: any }): Promise<{ [key: string]: any }>;
  afterSubmit(values: { [key: string]: any }): Promise<{ [key: string]: any }>;
  onError?(error: string | Error | React.ReactNode | React.ReactNode[]): void;
  autoComplete?: boolean;
  persist?: boolean;
  style?: React.CSSProperties;
  className?: string;
  noValidate?: boolean;
  defaultValues?: { [key: string]: any };
}

interface FormState {
  isSubmitting: boolean;
  hasSubmitted: boolean;
  formErrors: React.ReactNode[];
}

const emptyObject = {};
const emptyArray: any[] = [];

class Form extends React.PureComponent<FormProps, FormState> {
  static defaultProps = {
    beforeSubmit: values => Promise.resolve(values),
    afterSubmit: values => Promise.resolve(values),
    onError: err => Promise.resolve(err),
    noValidate: false,
    persist: false,
    autoComplete: true,
    style: emptyObject,
    defaultValues: {},
  };

  constructor(props) {
    super(props);
    this.initialState = {
      isSubmitting: false,
      hasSubmitted: false,
      formErrors: emptyArray,
    };
    this.state = { ...this.initialState };

    this.getFormInterface = memoize(this.getFormInterface.bind(this));
    this.getSpreadProps = memoize(this.getSpreadProps.bind(this));
    this.formInterface = this.getFormInterface(this.state);
    this.mounted = false;
  }

  fields = {};
  persistedValues: { [key: string]: any } = {};
  mounted: boolean;
  initialState: FormState;
  formInterface: {
    defaultFormValues: { [key: string]: any };
    formAutoComplete: boolean;
    formErrors: any[];
    hasFormSubmitted: boolean;
    isFormSubmitting: boolean;
    registerWithForm(payload: any): void; // FIXME
    unregisterFromForm(name: string): void; // FIXME
  };

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  getSpreadProps(noValidate: boolean) {
    return isDefined(noValidate) ? { noValidate } : emptyObject;
  }

  registerWithForm = payload => {
    // Save the field to the internal registry
    this.fields[payload.name] = payload;
    // If we are to persist the values, then we'll restore them if we see the field appear again
    if (this.props.persist) {
      const previousValue = this.persistedValues[payload.name];
      if (isDefined(previousValue)) {
        payload.setValue(previousValue);
      }
    }
  };

  // This is a function that we bind and memoize for renders. We feed `this.state` into it so that
  // the Context.Consumer will rerender.
  getFormInterface(state) {
    return {
      registerWithForm: this.registerWithForm,
      unregisterFromForm: this.unregisterFromForm,
      formAutoComplete: this.props.autoComplete,
      hasFormSubmitted: state.hasSubmitted,
      isFormSubmitting: state.isSubmitting,
      formErrors: state.formErrors,
      defaultFormValues: this.props.defaultValues,
    };
  }

  unregisterFromForm = name => {
    const { [name]: fieldInterface, ...rest } = this.fields;
    this.fields = rest;
    // Save the value if we have the persist prop
    if (this.props.persist) {
      this.persistedValues[name] = fieldInterface.getValue();
    }
  };

  getValues = () => {
    const values = Object.keys(this.fields).reduce(
      (values: { [key: string]: any }, key: string) => ({
        ...values,
        [key]: this.fields[key].getValue(),
      }),
      {}
    );

    return { ...this.persistedValues, ...values };
  };

  handleErrors = (errors: Error | React.ReactNode | React.ReactNode[]) => {
    const { onError } = this.props;
    // Force formErrors to be an array
    const formErrors = Array.isArray(errors) ? errors : [errors];
    // Persist the errors
    if (this.mounted) {
      this.setState({ formErrors });
    }
    // Call the supplied error handler
    onError(formErrors);
  };

  onReset = event => {
    event.preventDefault();
    // Reset the state
    this.setState({ ...this.initialState });
    // Remove persisted values
    this.persistedValues = {};
    // Call the reset method on each field
    Object.keys(this.fields).forEach((key: string) => this.fields[key].reset());
  };

  onSubmit = event => {
    event.preventDefault();
    this.doSubmit();
  };

  handleBeforeSubmit = (values: object | Promise<{ [key: string]: any }>) => {
    const { beforeSubmit } = this.props;

    if (this.mounted) {
      this.setState({ isSubmitting: true });
    }

    return isFunction(beforeSubmit)
      ? maybePromisify(beforeSubmit(values))
      : Promise.resolve(values);
  };

  handleOnSubmit = (values: object | Promise<{ [key: string]: any }>) => {
    const { onSubmit } = this.props;
    return isFunction(onSubmit) ? maybePromisify(onSubmit(values)) : Promise.resolve(values);
  };

  handleAfterSubmit = (values: object | Promise<{ [key: string]: any }>) => {
    const { afterSubmit } = this.props;
    if (this.mounted) {
      this.setState({ isSubmitting: false, hasSubmitted: true });
    }
    return isFunction(afterSubmit) ? maybePromisify(afterSubmit(values)) : Promise.resolve(values);
  };

  doSubmit = (): Promise<{ [key: string]: any } | string | Error> | void => {
    if (!this.validate()) {
      return this.handleErrors(['Form is not valid']);
    }

    this.setState({ isSubmitting: true, formErrors: [] });

    const values = this.getValues();

    return this.handleBeforeSubmit(values)
      .then(this.handleOnSubmit)
      .then(this.handleAfterSubmit)
      .catch(this.handleErrors);
  };

  getFormValues = () =>
    Object.keys(this.fields).reduce(
      (values: { [key: string]: any }, name: string) => ({
        ...values,
        [name]: this.fields[name].getValue(),
      }),
      {}
    );

  validate = () => gatherErrors(this.fields, true).length === 0;

  render() {
    const { autoComplete, className, children, name, style = emptyObject } = this.props;
    return (
      <form
        {...this.getSpreadProps(this.props.noValidate)}
        name={name}
        autoComplete={autoComplete ? 'on' : 'off'}
        onReset={this.onReset}
        onSubmit={this.onSubmit}
        className={classes('sf--form', className)}
        style={style}
      >
        <FormContext.Provider value={this.getFormInterface(this.state)}>
          {children}
        </FormContext.Provider>
      </form>
    );
  }
}

export default Form;
