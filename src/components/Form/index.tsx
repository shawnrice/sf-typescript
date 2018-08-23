import * as React from 'react';
import { classes, gatherErrors } from '../../helpers/index';
import { memoize, isObject, isFunction } from 'lodash';
import { FormContext } from '../../helpers/contexts';
const isDefined = arg => arg !== undefined;

export interface FormProps {
  beforeSubmit(values: { [key: string]: any }): Promise<{ [key: string]: any }>;
  onSubmit(values: { [key: string]: any }): Promise<{ [key: string]: any }>;
  afterSubmit(values: { [key: string]: any }): Promise<{ [key: string]: any }>;
  onError?(error: any): Promise<string | Error>;
  autoComplete?: boolean;
  persist?: boolean;
  style?: React.CSSProperties;
  className?: string;
  name: string;
}

const emptyObject = {};

// const isThennable = obj => Object.prototype.hasOwnProperty.call(obj, 'then') && isFunction();
// const maybePromisify =
class Form extends React.PureComponent<FormProps, any> {
  static defaultProps = {
    beforeSubmit: values => Promise.resolve(values),
    afterSubmit: values => Promise.resolve(values),
    onError: err => Promise.resolve(err),
    autoComplete: true,
    style: emptyObject,
  };

  constructor(props) {
    super(props);
    this.state = {
      isSubmitting: false,
      hasSubmitted: false,
      formErrors: [],
    };

    this.getFormInterface = memoize(this.getFormInterface.bind(this));
    this.formInterface = this.getFormInterface(this.state);
  }

  fields = {};
  formInterface: {
    register(payload: any): void; // FIXME
    unregister(name: string): void; // FIXME
    formAutoComplete: boolean;
    hasFormSubmitted: boolean;
    isFormSubmitting: boolean;
    formErrors: any[];
  };
  persistedValues: { [key: string]: any } = {};

  registerField = payload => {
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
      register: this.registerField,
      unregister: this.unregisterField,
      formAutoComplete: this.props.autoComplete,
      hasFormSubmitted: state.hasSubmitted,
      isFormSubmitting: state.isSubmitting,
      formErrors: state.formErrors,
    };
  }

  unregisterField = name => {
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

  handleErrors = (errors: any) => {
    // Force formErrors to be an array
    const formErrors = Array.isArray(errors) ? errors : [errors];
    // Persist the errors
    this.setState({ formErrors });
    // Call the supplied error handler
    return this.props.onError(formErrors);
  };

  handleOnReset = event => {
    event.preventDefault();
    // Remove persisted values
    this.persistedValues = {};
    // Call the reset method on each field
    Object.keys(this.fields).forEach((key: string) => this.fields[key].reset());
  };

  handleOnSubmit = event => {
    event.preventDefault();
    this.doSubmit();
  };

  doSubmit = () => {
    const { afterSubmit, beforeSubmit, onSubmit } = this.props;

    if (!this.validate()) {
      return this.handleErrors(['Form is not valid']);
    }

    this.setState({ isSubmitting: true, formErrors: [] });

    return beforeSubmit(this.getValues())
      .then(onSubmit)
      .then(afterSubmit)
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
        autoComplete={autoComplete ? 'on' : 'off'}
        className={classes('sf--form', className)}
        name={name}
        onReset={this.handleOnReset}
        onSubmit={this.handleOnSubmit}
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
