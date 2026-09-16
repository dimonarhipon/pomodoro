import './index.css';
import { App } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  if (root) {
    App.init(root);
  }
});
