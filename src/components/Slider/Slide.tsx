import * as React from 'react';
import { classes, gatherErrors, gatherValues, execIfFunc, toKey } from '../../helpers/index';
import { isFunction, memoize } from 'lodash';
import { SlideContext, withForm } from '../../helpers/contexts';

export interface SlideProps {
  render(props: SlideProps): React.ReactNode;
}

const emptyArray = [];
const alwaysTrue = () => true;

class Frame extends React.PureComponent<any, any> {
  constructor(props) {
    super(props);
    this.fields = {};
    this.getSlideInterface = memoize(this.getSlideInterface.bind(this));
    props.setRef(this);

    this.state = { errors: emptyArray };
  }

  static defaultProps = {
    validate: values => [],
    className: '',
    autoFocus: true,
    shouldShowIf: alwaysTrue,
  };

  fields: any;

  componentDidMount() {
    const name = Object.keys(this.fields)[0];
    const field = this.fields[name];
    if (field) {
      field.focus();
    }
  }

  register = payload => {
    this.fields[payload.name] = { ...payload };
  };

  unregister = (name: string) => {
    const { [name]: removed, ...rest } = this.fields;
    this.fields = rest;
  };

  getSlideInterface() {
    return {
      registerWithSlide: this.register,
      unregisterFromSlide: this.unregister,
    };
  }

  isSlideValid = () => {
    const fieldErrors = gatherErrors(this.fields, true);
    const slideErrors = this.validateSlide();
    return slideErrors.length === 0 && fieldErrors.length === 0;
  };

  validateSlide = () => {
    const initial = execIfFunc(this.props.validate, gatherValues(this.fields));
    const errors = Array.isArray(initial) ? initial : [initial];
    this.setState({ errors: errors.length === 0 ? emptyArray : errors });
    return errors;
  };

  render() {
    const { className, children, render = children } = this.props;
    const { errors } = this.state;

    return (
      <div className={classes('sf--slide', className)}>
        <SlideContext.Provider value={this.getSlideInterface()}>
          {isFunction(render) ? render(this.props) : render}
        </SlideContext.Provider>
        <div className="sf--slide-errors">
          {errors.map(error => (
            <div className="sf--slide-error" key={toKey(error)}>
              {error}
            </div>
          ))}
        </div>
      </div>
    );
  }
}

const Slide = withForm(Frame);
export { Slide, SlideContext };
export default Slide;
