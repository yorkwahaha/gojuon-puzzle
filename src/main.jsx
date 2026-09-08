import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const params = new URLSearchParams(window.location.search);
if (params.get('watch') === '1' && !/teacher\.html$/i.test(window.location.pathname)) {
  const next = new URL('./teacher.html', window.location.href);
  next.search = '';
  const room = params.get('room');
  if (room) next.searchParams.set('room', room);
  window.location.replace(next);
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
