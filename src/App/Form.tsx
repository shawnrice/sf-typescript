import * as React from 'react';

import Form from '../components/Form/index';
import Field from '../components/Field/index';
import Radios from '../components/Field/Radios';
import { withFormErrors } from '../helpers/contexts';
import { Slider } from '../components/Slider/Slider';
import { Slide } from '../components/Slider/Slide';

const toUpperCase = str => str.toUpperCase();
const toLowerCase = str => str.toLowerCase();

const format = (value, cursor) => {
  return [toUpperCase(value), cursor];
};

const required = value =>
  value === '' ? (
    <span>
      This <strong>is</strong> required
    </span>
  ) : (
    false
  );

const onSubmit = values => {
  console.log(values);
  return Promise.resolve(values);
};

const onError = err => Promise.resolve(err);

class FormErrorMessages extends React.PureComponent<any, any> {
  render() {
    if (!this.props.formErrors || this.props.formErrors.length === 0) {
      return null;
    }
    return (
      <>
        {this.props.formErrors.map(err => (
          <span key={err}>{err}</span>
        ))}
      </>
    );
  }
}

const ErrorDisplay = withFormErrors(FormErrorMessages);

class MyForm extends React.PureComponent<any, any> {
  constructor(props) {
    super(props);
    this.state = {
      errors: null,
    };
  }

  handleError = err => {
    this.setState({ errors: err });
    return Promise.resolve(err);
  };

  render() {
    const { errors } = this.state;

    return (
      <>
        <Form autoComplete={false} onError={this.handleError} onSubmit={onSubmit} name="general">
          <Field
            name="test"
            autoFocus
            format={format}
            unformat={toLowerCase}
            // defaultValue="aaa"
            validateOnBlur
            validateOnChange
            label="Testing"
            validate={required}
            onBlur={event => console.log(event.target.name)}
            onFocus={event => console.log(event.target.name)}
            type="text"
          />
          <Field name="test-required2" label="Testing Required" validate={required} type="text" />
          <Radios name="testa" options={[{ label: 'a', value: 'a' }, { label: 'b', value: 'b' }]} />
          <Field name="numberField" type="number" />
          <Field name="file" type="file" />
          <Field name="submit-button" type="submit">
            Submit
          </Field>
          <Field name="reset-button" type="reset" value="Reset" />
          <Field name="textarea-field" type="textarea" label="textarea" value="Testing" />
          <ErrorDisplay />
        </Form>
        <Slider onSubmit={onSubmit}>
          <Slide>Hi</Slide>
          <Slide
            render={() => {
              return <Field type="text" name="slide2" label="test" defaultValue="testing" />;
            }}
          />
          <Slide>
            <Field type="text" name="slide3" label="test2" validate={required} />
          </Slide>
          <Slide
            validate={values => {
              if (!values.slide3A && !values.slide3B) {
                return ['You must choose either check1 or check2'];
              }
              return [];
            }}
          >
            <Field type="checkbox" name="slide3A" label="check1" />
            <Field type="checkbox" name="slide3B" label="check2" />
          </Slide>
          <Slide
            render={props => {
              return <pre>{JSON.stringify(props.getFormValues(), null, 2)}</pre>;
            }}
          />
        </Slider>
      </>
    );
  }
}

export default MyForm;
