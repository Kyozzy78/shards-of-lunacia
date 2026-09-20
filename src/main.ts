import './styles/main.css';
import { App } from './app';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Application root not found.');

window.addEventListener('error', (event) => console.error('Shards runtime error', event.error));
new App(root);
