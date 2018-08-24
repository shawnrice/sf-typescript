import * as React from 'react';

const AsFieldContext = React.createContext({
  registerWithField: payload => {},
  unregisterFromField: name => {},
});
AsFieldContext.Consumer.displayName = 'AsFieldConsumer';
AsFieldContext.Provider.displayName = 'AsFieldProvider';

const FormContext = React.createContext({
  registerWithForm: payload => {},
  unregisterFromForm: name => {},
  formAutoComplete: true,
  isFormSubmitting: false,
  hasFormSubmitted: false,
  defaultFormValues: {},
  formErrors: [],
});

export function withAsField(Component) {
  return function AsFieldComponent(props: { [key: string]: any }) {
    return (
      <AsFieldContext.Consumer>
        {asFieldProps => <Component {...props} {...asFieldProps} />}
      </AsFieldContext.Consumer>
    );
  };
}

FormContext.Consumer.displayName = 'FormConsumer';
FormContext.Provider.displayName = 'FormProvider';

export function withFormErrors(Component) {
  return function FormErrorComponent(props: { [key: string]: any }) {
    return (
      <FormContext.Consumer>
        {({ formErrors }) => <Component {...props} formErrors={formErrors} />}
      </FormContext.Consumer>
    );
  };
}

export function withForm(Component) {
  return function FormComponent(props: { [key: string]: any }) {
    return (
      <FormContext.Consumer>
        {({ registerWithForm, unregisterFromForm, formAutoComplete, defaultFormValues }) => (
          <Component
            {...props}
            registerWithForm={registerWithForm}
            unregisterFromForm={unregisterFromForm}
            formAutoComplete={formAutoComplete}
            defaultFormValues={defaultFormValues}
          />
        )}
      </FormContext.Consumer>
    );
  };
}

const SlideContext = React.createContext({
  registerWithSlide: payload => {},
  unregisterFromSlide: name => {},
});

SlideContext.Consumer.displayName = 'SlideConsumer';
SlideContext.Provider.displayName = 'SlideProvider';

export function withSlide(Component) {
  return function SlideComponent(props: { [key: string]: any }) {
    return (
      <SlideContext.Consumer>
        {slideInterface => <Component {...props} {...slideInterface} />}
      </SlideContext.Consumer>
    );
  };
}

export { AsFieldContext, SlideContext, FormContext };
