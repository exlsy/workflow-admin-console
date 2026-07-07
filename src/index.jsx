import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './styles/global.css';

// React 16의 진입점: #root DOM 노드 안에 <App /> 트리를 그린다.
ReactDOM.render(<App />, document.getElementById('root'));