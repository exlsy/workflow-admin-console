# Day 1 — Webpack 프로젝트 직접 구성

> WorkFlow Admin Console 2주 코스의 첫째 날입니다.  
> 이 문서 하나만 따라 하면 CRA/Vite 없이 **React 16 + Webpack 4 + Babel 7**로 직접 구성한 프로젝트에서 브라우저에 첫 화면(`WorkFlow Admin Console`)을 띄우는 것까지 완성됩니다.

---

## 0. 이 문서를 마치면

- CRA(create-react-app)나 Vite 같은 도구 없이 React 앱이 어떻게 동작하는지 설명할 수 있습니다.
- Webpack의 `entry` / `output` 개념을 이해하고 직접 설정할 수 있습니다.
- Babel이 JSX와 최신 JavaScript 문법을 어떻게 변환하는지 이해합니다.
- React 16의 진입점인 `ReactDOM.render`의 역할을 설명할 수 있습니다.
- 브라우저에서 `WorkFlow Admin Console` 첫 화면을 직접 띄웁니다.

### 최종 산출물 폴더 구조 (Day 1 기준)

```txt
workflow-admin-console/
  public/
    index.html
  src/
    styles/
      global.css
    App.jsx
    index.jsx
  .babelrc
  webpack.config.js
  package.json
  node_modules/        (설치 결과)
  dist/                (빌드 결과)
```

> Day 1은 **프로젝트 뼈대와 빌드 파이프라인**을 만드는 날입니다. antd / Redux / Router는 아직 설치하지 않습니다(각각 Day 4, Day 9, Day 8에서 다룹니다).

---

## 1. 핵심 개념 먼저 이해하기

실습에 들어가기 전에 "왜 이렇게 하는가"를 먼저 잡고 갑니다. 이 절을 이해하면 뒤의 설정 파일이 암기가 아니라 논리로 읽힙니다.

### 1.1 CRA/Vite 없이 React가 동작하는 원리

브라우저는 **JSX를 모릅니다.** 아래 코드는 그대로는 브라우저에서 실행되지 않습니다.

```jsx
const el = <h1>안녕하세요</h1>; // 브라우저: 이게 뭐지?
```

또한 브라우저는 `import` / `export`(ES Module) 문법이나 최신 JavaScript 문법 일부를 구형 환경에서 그대로 실행하지 못할 수 있습니다. 그래서 다음 두 가지 도구가 필요합니다.

- **Babel (컴파일러/트랜스파일러)**: JSX와 최신 JS 문법을 브라우저가 이해하는 옛날 JS로 "번역"합니다.
- **Webpack (번들러)**: 수십~수백 개로 나뉜 `import`된 파일들을 의존성 순서대로 추적해 하나(또는 몇 개)의 `bundle.js`로 "묶습니다".

CRA와 Vite는 이 Babel + 번들러 설정을 **자동으로 숨겨서** 제공하는 도구입니다. 우리는 그 내부를 직접 손으로 구성하면서 원리를 익힙니다. 실제 구형 엔터프라이즈 프로젝트에는 이렇게 손으로 만든 `webpack.config.js`가 그대로 존재하기 때문입니다.

### 1.2 Webpack의 entry와 output

Webpack은 딱 하나의 질문에서 시작합니다: **"어디서부터 시작하지?"**

- **entry (진입점)**: 의존성 추적을 시작하는 파일. 우리 프로젝트에서는 `src/index.jsx`입니다. Webpack은 이 파일이 `import`하는 것, 그것이 다시 `import`하는 것… 을 나무처럼(dependency graph) 따라갑니다.
- **output (출력)**: 추적·변환·병합이 끝난 결과 번들을 어디에 어떤 이름으로 저장할지. 우리는 `dist/bundle.[contenthash].js`로 내보냅니다.

한 줄 요약: **entry에서 시작해 import를 따라가며 모은 뒤, Babel로 변환해서, output 하나로 합친다.**

### 1.3 Babel은 왜 필요한가

Babel은 **preset(프리셋)** 이라는 변환 규칙 묶음으로 동작합니다. 우리는 두 개를 씁니다.

- `@babel/preset-react` — **JSX → `React.createElement(...)` 호출**로 변환합니다.
  ```jsx
  // 작성한 코드
  const el = <h1>안녕</h1>;
  // Babel 변환 후 (개념적으로)
  const el = React.createElement('h1', null, '안녕');
  ```
  그래서 JSX를 쓰는 파일 상단에 항상 `import React from 'react';`가 필요합니다(React 16 기준). `React.createElement`를 호출하려면 `React`가 스코프에 있어야 하기 때문입니다.
- `@babel/preset-env` — **최신 JS 문법을 지정한 브라우저 타깃에 맞는 옛날 JS로** 변환합니다. 화살표 함수, `const`/`let`, 구조 분해 등을 필요에 따라 낮춰줍니다.

추가로 이 프로젝트는 `@babel/plugin-proposal-class-properties`도 씁니다. class 컴포넌트에서 `handleClick = () => {...}` 같은 화살표 프로퍼티 메서드를 쓰기 위한 문법 지원입니다(구형 코드 읽기용으로 Day 13 이후 유용).

### 1.4 React 16의 진입점: ReactDOM.render

React 앱은 결국 "특정 DOM 노드 안에 React 트리를 그려 넣는" 것입니다. React 16에서는 이 일을 `ReactDOM.render`가 합니다.

```jsx
ReactDOM.render(<App />, document.getElementById('root'));
```

- 첫 번째 인자: 그릴 React 엘리먼트(`<App />`)
- 두 번째 인자: 그려 넣을 실제 DOM 컨테이너(`public/index.html`의 `<div id="root">`)

> ⚠️ React 18의 `ReactDOM.createRoot(...).render(...)`는 **쓰지 않습니다.** 이 프로젝트는 React 16이며, 구형 프로젝트 적응이 목표이므로 `ReactDOM.render`가 정석입니다.

---

## 2. 사전 준비 — Node.js 20 확인

이 코스는 **Node.js 20**을 대상으로 합니다. 먼저 버전을 확인합니다.

```bash
node -v    # v20.x.x 여야 함
npm -v
```

`v20`이 아니라면 nvm 등으로 20 계열을 설치해 맞춥니다.

### ⚠️ 반드시 알아야 할 함정: Node 20 + Webpack 4 = OpenSSL 오류

Webpack 4와 webpack-dev-server 3은 오래된 라이브러리라, **Node 17 이상에서 그냥 실행하면** 아래 오류로 빌드가 죽습니다.

```txt
Error: error:0308010C:digital envelope routines::unsupported
(ERR_OSSL_EVP_UNSUPPORTED)
```

원인은 Node 17부터 OpenSSL 3로 바뀌면서 구버전 Webpack이 쓰던 해시 방식이 기본 비활성화됐기 때문입니다. 해결책은 실행 시 **레거시 OpenSSL 공급자**를 켜주는 것입니다.

```txt
NODE_OPTIONS=--openssl-legacy-provider
```

이 옵션은 뒤의 `package.json` scripts에 미리 넣어둘 것이므로, 지금은 "Node 20에서 구형 Webpack을 돌리려면 이 옵션이 필요하다"만 기억하면 됩니다.

---

## 3. 단계별 실습 (그대로 따라 하기)

여기서부터는 순서대로 명령어를 실행하고 파일을 작성하면 됩니다.

### Step 1. 프로젝트 폴더 생성과 npm 초기화

이미 `workflow-admin-console/` 폴더 안에서 작업 중이라면 폴더 생성은 건너뛰고 초기화만 합니다.

```bash
# (새로 시작하는 경우)
mkdir workflow-admin-console
cd workflow-admin-console

# package.json 생성
npm init -y
```

`npm init -y`는 기본값으로 `package.json`을 만듭니다. 이 파일이 프로젝트의 **의존성 목록과 실행 스크립트를 담는 중심 파일**입니다.

### Step 2. React 16 설치

React는 런타임 의존성이므로 `-D`(devDependencies) 없이 설치합니다.

```bash
npm install react@16.14.0 react-dom@16.14.0
```

- `react` — 컴포넌트/엘리먼트를 만드는 핵심 라이브러리
- `react-dom` — React 트리를 실제 브라우저 DOM에 렌더링하는 라이브러리(`ReactDOM.render`가 여기 있음)

### Step 3. Webpack 4 설치

Webpack 본체, CLI, 개발 서버를 개발 의존성(`-D`)으로 설치합니다.

```bash
npm install -D webpack@4 webpack-cli@3 webpack-dev-server@3
```

- `webpack` — 번들러 본체
- `webpack-cli` — 터미널에서 webpack 명령을 실행하게 해주는 CLI
- `webpack-dev-server` — 개발용 로컬 서버(자동 새로고침, 프록시 제공)

### Step 4. Babel 설치와 설정

Babel 본체, 프리셋, webpack 연결 로더, 그리고 class properties 플러그인을 설치합니다.

```bash
npm install -D @babel/core@7 @babel/preset-env@7 @babel/preset-react@7 babel-loader@8
npm install -D @babel/plugin-proposal-class-properties@7
```

> ⚠️ **버전 `@7` 고정이 중요합니다.** 생략하면 최근 출시된 Babel 8이 설치되어 `babel-loader@8`과 `ERESOLVE` 충돌이 납니다. 이 프로젝트는 구형 스택(Webpack 4 + babel-loader 8)이라 Babel 7이 정답이며, `--force`나 `--legacy-peer-deps`로 우회하지 않습니다.
>
> zsh에서는 `@^7`의 `^`를 glob으로 해석해 `zsh: no matches found` 오류가 납니다. 위처럼 `@7`을 쓰거나, 캐럿을 쓰려면 `"@babel/core@^7"`처럼 따옴표로 감싸세요.

- `@babel/core` — Babel 엔진
- `@babel/preset-env` — 최신 JS → 구형 JS 변환 규칙
- `@babel/preset-react` — JSX 변환 규칙
- `babel-loader` — Webpack이 파일을 만날 때 Babel을 호출하도록 연결해주는 로더
- `@babel/plugin-proposal-class-properties` — class 필드/화살표 메서드 문법 지원

프로젝트 루트에 **`.babelrc`** 파일을 만들고 아래를 넣습니다.

```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "browsers": [">0.25%", "not dead"]
        }
      }
    ],
    "@babel/preset-react"
  ],
  "plugins": ["@babel/plugin-proposal-class-properties"]
}
```

- `targets.browsers` — "전 세계 점유율 0.25% 초과 & 지원 종료되지 않은 브라우저"를 대상으로 변환 수준을 정합니다. 타깃이 낮을수록 더 많이 변환합니다.

### Step 5. CSS 로더와 HTML/정리 플러그인 설치

번들에 CSS와 이미지를 포함시키고, HTML을 자동 생성하기 위한 로더/플러그인입니다.

```bash
# 스타일/이미지 로더 (Webpack 4 호환 버전으로 고정)
npm install -D css-loader@5 style-loader@2 file-loader@6 url-loader@4

# HTML 생성 + dist 정리 플러그인
npm install -D html-webpack-plugin@4 clean-webpack-plugin@3
```

> ⚠️ **로더 버전 고정이 중요합니다.** 버전을 생략하면 `style-loader@4`/`css-loader@6` 등 Webpack 5 전용 최신 버전이 설치되어 `peer webpack@^5` 충돌(`ERESOLVE`)이 납니다. 이 프로젝트는 Webpack 4이므로 위처럼 webpack 4 호환 마지막 메이저로 고정합니다.

- `css-loader` — `import './x.css'`를 JS가 이해하는 형태로 읽어들임
- `style-loader` — 읽어들인 CSS를 실행 시 `<style>` 태그로 DOM에 주입
- `url-loader` / `file-loader` — 이미지 등 정적 자산 처리(작은 파일은 data URL로 인라인)
- `html-webpack-plugin` — 우리가 만든 `public/index.html`을 기반으로, 번들 script 태그가 자동으로 삽입된 최종 `index.html`을 `dist`에 생성
- `clean-webpack-plugin` — 빌드할 때마다 이전 `dist`를 비워 오래된 번들이 남지 않게 함

### Step 6. cross-env 설치 (스크립트 환경변수용)

OS에 상관없이 환경변수를 안전하게 지정하기 위해 설치합니다(Windows에서 `NODE_ENV=...`가 그대로 동작하지 않는 문제 방지).

```bash
npm install -D cross-env
```

### Step 7. public/index.html 작성

`public/` 폴더를 만들고 그 안에 **`index.html`** 을 작성합니다. 이 파일이 앱이 올라탈 "빈 껍데기" HTML입니다.

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WorkFlow Admin Console</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

핵심은 `<div id="root"></div>` 한 줄입니다. React가 바로 이 노드 안에 앱 전체를 그립니다. 나머지 script 태그는 `html-webpack-plugin`이 빌드 시 자동으로 넣어주므로 직접 쓰지 않습니다.

### Step 8. webpack.config.js 작성

프로젝트 루트에 **`webpack.config.js`** 를 만듭니다. 이 파일이 오늘의 핵심입니다.

```js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

// production 빌드에서만 contenthash를 사용한다.
// webpack-dev-server 3 + HMR 조합은 [contenthash]/[chunkhash]를 지원하지 않으므로
// 개발 모드에서는 해시 없는 고정 파일명(bundle.js)을 쓴다.
const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  // 빌드 모드: development(빠른 빌드/디버깅) 또는 production(최적화/압축)
  mode: isProd ? 'production' : 'development',

  // 의존성 추적을 시작할 진입점
  entry: './src/index.jsx',

  // 번들 결과물 출력 설정
  output: {
    path: path.resolve(__dirname, 'dist'),   // 절대 경로로 dist 폴더 지정
    filename: isProd ? 'bundle.[contenthash].js' : 'bundle.js', // dev는 해시 없이, prod만 캐싱용 해시
    publicPath: '/',                          // 브라우저가 번들/자원을 찾을 기준 경로
  },

  // import 시 확장자 생략, 경로 별칭 설정
  resolve: {
    extensions: ['.js', '.jsx'],              // import 시 .js/.jsx 확장자 생략 허용
    alias: {
      '@': path.resolve(__dirname, 'src'),    // '@/features/...' 처럼 절대경로 import 가능
    },
  },

  // 파일 종류별로 어떤 로더를 쓸지
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,                   // .js/.jsx 파일은
        exclude: /node_modules/,               // node_modules 제외하고
        use: { loader: 'babel-loader' },       // Babel로 변환
      },
      {
        test: /\.css$/,                        // .css 파일은
        use: ['style-loader', 'css-loader'],   // css-loader로 읽고 style-loader로 주입
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,     // 이미지 파일은
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192,                      // 8KB 이하는 data URL로 인라인
              name: 'assets/[name].[hash].[ext]',
            },
          },
        ],
      },
    ],
  },

  // 플러그인: 번들 전체 단위로 동작하는 확장
  plugins: [
    new CleanWebpackPlugin(),                  // 빌드 전 dist 정리
    new HtmlWebpackPlugin({
      template: './public/index.html',         // 이 HTML을 템플릿으로 최종 index.html 생성
    }),
  ],

  // 개발 서버 설정
  devServer: {
    historyApiFallback: true,   // SPA 라우팅: 어떤 경로로 새로고침해도 index.html 반환 (Day 8에서 활용)
    port: 3000,                 // http://localhost:3000
    open: true,                 // 실행 시 브라우저 자동 열기
    hot: true,                  // 파일 변경 시 자동 갱신
    proxy: {                    // /api 요청을 json-server(:4000)로 전달 (Day 6부터 사용)
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
      },
    },
  },

  devtool: 'source-map',        // 디버깅 시 원본 소스 위치 매핑
};
```

> Day 1에서는 아직 `/api` 호출도 이미지도 없지만, **Webpack 실무 설정을 한 번에 완성**하는 것이 이 과정의 목표이므로 전체 설정을 그대로 작성합니다. `proxy`와 `historyApiFallback`은 뒤 Day에서 실제로 쓰입니다. 지금 있어도 해가 되지 않습니다.

`webpack.config.js` 주요 옵션 요약:

- **mode** — `development`는 빠르고 읽기 쉬운 번들, `production`은 압축·최적화된 번들
- **entry** — 시작 파일(`src/index.jsx`)
- **output.path** — 결과 폴더(반드시 절대 경로라 `path.resolve` 사용)
- **output.filename** — production에서만 `[contenthash]`로 내용 기반 캐싱, 개발 모드는 `bundle.js` (webpack-dev-server 3은 HMR과 `[contenthash]`를 함께 못 쓰기 때문)
- **output.publicPath: '/'** — 아래 4장에서 별도로 설명
- **resolve.alias `@`** — `import ... from '@/...'`로 `src` 기준 절대 import(상대경로 `../../..` 지옥 방지)
- **module.rules** — 확장자별 변환 담당 로더 지정
- **plugins** — HTML 자동 생성, dist 정리 등 번들 전역 작업

### Step 9. src/index.jsx 와 src/App.jsx 작성

`src/` 폴더를 만들고 아래 파일들을 작성합니다.

먼저 간단한 공통 스타일 `src/styles/global.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif;
  background: #f0f2f5;
  color: #222;
}

.app-hello {
  max-width: 640px;
  margin: 80px auto;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  text-align: center;
}
```

진입점 **`src/index.jsx`**:

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './styles/global.css';

// React 16의 진입점: #root DOM 노드 안에 <App /> 트리를 그린다.
ReactDOM.render(<App />, document.getElementById('root'));
```

> antd CSS(`import 'antd/dist/antd.css'`)는 **아직 넣지 않습니다.** antd는 Day 4에서 설치·import합니다.

최상위 컴포넌트 **`src/App.jsx`**:

```jsx
import React from 'react';

function App() {
  return (
    <div className="app-hello">
      <h1>WorkFlow Admin Console</h1>
      <p>Day 1 — Webpack + Babel + React 16 직접 구성 완료 🎉</p>
    </div>
  );
}

export default App;
```

### Step 10. package.json scripts 등록

`package.json`을 열어 `"scripts"` 항목을 아래로 교체합니다. (Node 20 + Webpack 4를 위한 `--openssl-legacy-provider`가 처음부터 들어갑니다.)

```json
{
  "scripts": {
    "start": "cross-env NODE_OPTIONS=--openssl-legacy-provider webpack-dev-server --mode development",
    "build": "cross-env NODE_OPTIONS=--openssl-legacy-provider NODE_ENV=production webpack --mode production"
  }
}
```

- `npm start` — 개발 서버를 `http://localhost:3000`에 띄우고 브라우저를 엽니다.
- `npm run build` — `dist/`에 배포용 번들을 생성합니다.

> `mock` 스크립트(json-server)는 API가 등장하는 Day 6에서 추가합니다. Day 1에서는 필요 없습니다.

---

## 4. 실행과 결과 확인

### 4.1 개발 서버 실행

```bash
npm start
```

- 잠시 후 브라우저가 자동으로 열리고 `http://localhost:3000`에서
- **"WorkFlow Admin Console"** 제목과 안내 문구가 흰 카드 안에 표시되면 성공입니다.

`App.jsx`의 문구를 바꾸고 저장하면 화면이 자동으로 갱신되는 것도 확인해 보세요(Webpack dev server의 자동 갱신).

### 4.2 프로덕션 빌드 확인

```bash
npm run build
```

- 루트에 `dist/` 폴더가 생기고, 그 안에 `index.html`과 `bundle.<해시>.js`가 만들어졌는지 확인합니다.
- `dist/index.html`을 열어 보면 우리가 직접 넣지 않은 `<script src="bundle....js">`가 `html-webpack-plugin`에 의해 자동 삽입된 것을 볼 수 있습니다. 이것이 번들 파이프라인이 동작했다는 증거입니다.

---

## 5. 자주 나는 오류와 해결

### 5.1 `ERR_OSSL_EVP_UNSUPPORTED` / `digital envelope routines::unsupported`

- **원인**: Node 17+ 에서 구형 Webpack 4 실행. 가장 흔한 Day 1 오류입니다.
- **해결**: scripts에 `cross-env NODE_OPTIONS=--openssl-legacy-provider`가 포함됐는지 확인(Step 10). `npm start`가 아니라 `webpack`을 직접 실행하면 이 옵션이 빠져 오류가 납니다.

### 5.2 `Module parse failed` / JSX 관련 구문 오류

- **원인**: Babel 설정 누락 또는 `babel-loader`가 JSX 파일에 적용되지 않음.
- **해결**: 루트에 `.babelrc`가 있는지, `webpack.config.js`의 `module.rules`에 `test: /\.(js|jsx)$/ → babel-loader`가 있는지 확인.

### 5.3 화면이 하얗고 콘솔에 `Target container is not a DOM element`

- **원인**: `public/index.html`에 `<div id="root">`가 없거나 id 오타.
- **해결**: HTML의 `id="root"`와 `index.jsx`의 `getElementById('root')` 문자열이 정확히 일치하는지 확인.

### 5.4 `command not found: webpack` 또는 실행이 안 됨

- **원인**: 전역 설치를 기대했거나 의존성 설치 누락.
- **해결**: webpack은 로컬(devDependencies)에 설치하고 **npm scripts를 통해** 실행합니다. `node_modules`가 없다면 `npm install`을 다시 실행.

### 5.5 `Entry module not found: Can't resolve './src/index.jsx'`

- **원인**: 진입점 파일(`src/index.jsx`)을 아직 만들지 않고 `npm start`를 실행함. Step 9를 건너뛰면 발생합니다.
- **해결**: `src/index.jsx`, `src/App.jsx`, `src/styles/global.css`를 모두 생성했는지 확인. 파일명·경로 오타(`index.js` vs `index.jsx`)도 점검.

### 5.6 `Cannot use [chunkhash] or [contenthash] for chunk ... (use [hash] instead)`

- **원인**: webpack-dev-server 3 + HMR(`hot: true`) 환경에서는 `output.filename`에 `[contenthash]`/`[chunkhash]`를 쓸 수 없습니다.
- **해결**: 위 설정처럼 `filename`을 개발 모드에서는 `bundle.js`(해시 없음), production에서만 `[contenthash]`가 되도록 `isProd`로 분기합니다. 설정을 바꾼 뒤에는 **dev-server를 껐다 다시 실행**해야 반영됩니다(설정 변경은 자동 반영 안 됨).

### 5.7 `mode` 관련 경고

- `webpack.config.js`의 `mode`와 CLI의 `--mode`가 함께 있어도 CLI가 우선 적용되어 정상 동작합니다. 경고가 신경 쓰이면 한쪽만 남겨도 됩니다.

---

## 6. 체크포인트 (스스로 답해 보기)

아래 네 질문에 막힘없이 답할 수 있으면 Day 1의 개념 목표를 달성한 것입니다. 정답 예시를 함께 둡니다.

### Q1. Webpack의 entry는 어디인가?

`src/index.jsx`. Webpack은 이 파일부터 `import`를 따라가며 의존성 그래프를 만들고, 그 전체를 하나의 번들로 합칩니다.

### Q2. Babel은 왜 필요한가?

브라우저는 JSX와 일부 최신 JS 문법을 그대로 실행하지 못합니다. Babel이 `@babel/preset-react`로 JSX를 `React.createElement` 호출로, `@babel/preset-env`로 최신 JS를 타깃 브라우저용 옛날 JS로 변환해 주기 때문에 필요합니다.

### Q3. ReactDOM.render는 어떤 역할인가?

첫 번째 인자인 React 엘리먼트(`<App />`)를, 두 번째 인자인 실제 DOM 노드(`#root`) 안에 그려 넣습니다. React 16의 진입점이며, React 18의 `createRoot`와 달리 이 프로젝트에서 사용하는 방식입니다.

### Q4. `publicPath: '/'`는 왜 필요한가?

브라우저가 번들 파일과 정적 자원을 **어떤 기준 경로에서 찾을지**를 정합니다. `'/'`로 두면 `/bundle.js`처럼 항상 사이트 루트를 기준으로 자원을 요청합니다. 이는 SPA에서 `/requests/123` 같은 **하위 경로로 새로고침해도** 번들 경로가 상대적으로 어긋나지 않게 해줍니다(Day 8의 `historyApiFallback`과 짝을 이뤄 클라이언트 라우팅을 안정적으로 만듭니다).

---

## 7. Day 1 완료 체크리스트

- [ ] `node -v`가 v20 계열이다.
- [ ] `npm init`으로 `package.json`을 생성했다.
- [ ] `react@16.14.0`, `react-dom@16.14.0`을 설치했다.
- [ ] `webpack@4`, `webpack-cli@3`, `webpack-dev-server@3`을 설치했다.
- [ ] Babel 프리셋/로더/플러그인과 `.babelrc`를 구성했다.
- [ ] css/이미지 로더, `html-webpack-plugin`, `clean-webpack-plugin`, `cross-env`를 설치했다.
- [ ] `public/index.html`에 `<div id="root">`를 만들었다.
- [ ] `webpack.config.js`를 작성하고 entry/output/loaders/plugins를 이해했다.
- [ ] `src/index.jsx`에서 `ReactDOM.render`로 `<App />`을 렌더링했다.
- [ ] `npm start`로 브라우저에 `WorkFlow Admin Console` 첫 화면을 띄웠다.
- [ ] `npm run build`로 `dist/`에 번들이 생성됐다.
- [ ] 6장의 체크포인트 4문항에 스스로 답할 수 있다.

---

## 8. 다음 단계 (Day 2 예고)

Day 2에서는 오늘 만든 뼈대 위에 **JSX / 컴포넌트 / Props**를 본격적으로 다룹니다. `PageTitle`, `SummaryCard`, `StatusTag` 같은 재사용 컴포넌트를 만들고, 대시보드 카드 3개를 화면에 표시하는 것이 목표입니다. Props 단방향 흐름과 컴포넌트 분리 감각을 익히게 됩니다.
