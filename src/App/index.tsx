import * as React from 'react';
import * as ReactDom from 'react-dom';
import Form from './Form';

const existing = document.getElementById('container');
if (existing) {
  ReactDom.render(<Form />, existing);
} else {
  const container = document.createElement('div');
  container.setAttribute('id', 'container');
  document.body.appendChild(container);
  ReactDom.render(<Form />, container);
}
