# Day 7 — 1주차 통합

> WorkFlow Admin Console 2주 코스의 일곱째 날, 1주차의 마지막입니다.  
> 새로운 기능을 추가하는 날이 아니라, **지금까지 만든 것을 하나의 동작하는 앱으로 정리하고 점검**하는 날입니다.  
> 이 문서 하나만 따라 하면 중복 코드를 공통 모듈로 정리하고, 앱 전체를 end-to-end로 검증하며, 1주차 핵심 개념을 총정리합니다.

---

## 0. 이 문서를 마치면

- 1주차에 흩어진 중복(우선순위 라벨, 로딩/에러 처리)을 **공통 모듈**로 정리합니다.
- `constants.js`로 상수를 한 곳에 모으고, `LoadingBox`/`ErrorBox` 공통 컴포넌트를 만들어 재사용합니다.
- 앱의 모든 기능(대시보드·목록·검색·필터·상세·등록·mock 연동)을 **직접 눌러 보며 검증**합니다.
- 내 프로젝트의 폴더 구조·`package.json`·`webpack.config.js`를 스스로 읽고 점검합니다.
- 1주차 핵심 개념을 Day별로 되짚어 **왜 그렇게 했는지** 설명할 수 있게 됩니다.

### 1주차 전체 지도 (Day 1~6 요약)

- **Day 1** — Webpack 4 + Babel 7로 React 16 프로젝트를 직접 구성(진입점 `ReactDOM.render`, `/api` 프록시).
- **Day 2** — JSX·함수형 컴포넌트·Props로 `PageTitle`·`StatusTag`·`SummaryCard`와 대시보드.
- **Day 3** — `useState`·이벤트·불변성으로 검색/필터 가능한 요청 목록.
- **Day 4** — antd 도입: `Layout`/`Menu`/`Table`/`Modal`/`Card`로 관리자 골격.
- **Day 5** — antd v4 `Form`으로 신규 요청 등록 + 검증.
- **Day 6** — `axios` + `json-server` + `useEffect`로 API 연동(loading/error/success).

### Day 7에서 하지 않는 것

- **새 기능 추가**(라우팅·Redux 등) → 2주차(Day 8~). 오늘은 **정리와 점검**만.
- **프로덕션 배포** → Day 14. 오늘은 빌드가 깨지지 않는지 **가볍게만** 확인합니다.

### 최종 산출물 폴더 구조 (Day 7 기준, 정리 후)

```txt
workflow-admin-console/
  src/
    components/
      common/
        PageTitle.jsx
        StatusTag.jsx
        LoadingBox.jsx     (신규 - 공통 로딩)
        ErrorBox.jsx       (신규 - 공통 에러)
      layout/
        AppLayout.jsx
        Sidebar.jsx
        HeaderBar.jsx
    features/
      dashboard/
        DashboardPage.jsx
        SummaryCard.jsx
      requests/
        constants.js       (신규 - 우선순위/상태 상수)
        RequestListPage.jsx     (상수·공통 컴포넌트 사용으로 정리)
        RequestDetailModal.jsx  (상수·공통 컴포넌트 사용으로 정리)
        RequestForm.jsx         (상수 사용으로 정리)
        RequestSearchBar.jsx    (상수 사용으로 정리)
    api/
      client.js
      requestApi.js
```

---

## 1. 핵심 개념 — 왜 "통합/정리"가 필요한가

기능을 빠르게 붙이다 보면 같은 코드가 여러 곳에 생깁니다. 1주차 코드에도 실제로 중복이 있습니다.

- **우선순위 라벨** `{ HIGH: '높음', ... }`이 `RequestListPage`와 `RequestDetailModal`에 **각각** 존재합니다.
- **우선순위 옵션** 배열이 `RequestForm`에, **상태 필터 옵션** 배열이 `RequestSearchBar`에 흩어져 있습니다.
- **로딩 스피너**와 **에러 표시** JSX가 목록·상세에 비슷하게 반복됩니다.

이대로 두면 "높음"을 "긴급"으로 바꾸는 사소한 요구에도 여러 파일을 고쳐야 하고, 한 곳을 빠뜨리면 화면마다 값이 달라집니다. 그래서 정리합니다.

- **DRY(Don't Repeat Yourself)** — 같은 지식은 한 곳에만. 상수는 `constants.js`로 모읍니다.
- **공통 컴포넌트 추출** — 반복되는 UI(로딩/에러)는 `components/common`으로 올려 재사용합니다.

> 이 작업은 Day 11(feature 기반 구조로 리팩터링)과 Day 9(Redux의 `actions.js`/`reducer.js`/`selectors.js`/`constants.js` 패턴)의 준비 운동이기도 합니다. 상수를 파일로 분리하는 습관이 그때 그대로 쓰입니다.

---

## 2. 사전 준비

Day 6까지 완료되어 있어야 합니다. **두 터미널**을 켭니다.

```bash
# 터미널 A — mock API
npm run mock

# 터미널 B — 개발 서버
npm start
```

정리 전에 현재 앱이 정상 동작하는지 한 번 확인하고 시작하면, 리팩터링 후 "무엇이 달라졌는지"를 명확히 비교할 수 있습니다.

---

## 3. 정리(리팩터링) 실습

> 리팩터링의 원칙: **겉보기 동작은 그대로 두고 내부만 정리**합니다. 각 단계 후 화면이 이전과 똑같이 동작하는지 확인하세요.

### Step 1. 요청 도메인 상수 모으기 — constants.js

우선순위/상태 관련 상수를 한 파일로 모읍니다.

**`src/features/requests/constants.js`** (신규)

```js
// 우선순위: 값(영문 상수) + 화면 라벨(한글)
export const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
];

// 옵션 배열에서 { HIGH: '높음', ... } 라벨 맵을 자동 생성 (중복 정의 방지)
export const PRIORITY_LABEL = PRIORITY_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = opt.label;
  return acc;
}, {});

// 상태 필터 옵션 (전체 포함) — 검색바에서 사용
export const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'REQUESTED', label: '요청됨' },
  { value: 'IN_PROGRESS', label: '처리중' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: 'DONE', label: '완료' },
];
```

- `PRIORITY_LABEL`을 옵션 배열에서 **파생**시켜, 라벨을 두 번 적지 않습니다(값 하나만 바꾸면 옵션·라벨이 함께 바뀜).

### Step 2. 흩어진 상수를 constants.js로 교체

각 파일에서 **로컬 상수를 지우고 import로 바꿉니다.** 겉보기 동작은 동일합니다.

**`RequestForm.jsx`** — 상단의 로컬 `PRIORITY_OPTIONS`를 삭제하고 import.

변경 전:
```jsx
import { Form, Input, Select, Button } from 'antd';

const { TextArea } = Input;

const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
];
```

변경 후:
```jsx
import { Form, Input, Select, Button } from 'antd';
import { PRIORITY_OPTIONS } from './constants';

const { TextArea } = Input;
```

**`RequestSearchBar.jsx`** — 로컬 `STATUS_OPTIONS`를 삭제하고 import한 뒤, `Select`의 `options`를 교체.

변경 전:
```jsx
import { Input, Select } from 'antd';

const STATUS_OPTIONS = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'REQUESTED', label: '요청됨' },
  { value: 'IN_PROGRESS', label: '처리중' },
  { value: 'APPROVED', label: '승인' },
  { value: 'REJECTED', label: '반려' },
  { value: 'DONE', label: '완료' },
];
```

변경 후:
```jsx
import { Input, Select } from 'antd';
import { STATUS_FILTER_OPTIONS } from './constants';
```

그리고 `<Select ... options={STATUS_OPTIONS} />`를 `options={STATUS_FILTER_OPTIONS}`로 바꿉니다.

**`RequestListPage.jsx`** — 로컬 `PRIORITY_LABEL`을 삭제하고 import.

변경 전:
```jsx
import * as requestApi from '@/api/requestApi';

const PRIORITY_LABEL = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };
```

변경 후:
```jsx
import * as requestApi from '@/api/requestApi';
import { PRIORITY_LABEL } from './constants';
```

**`RequestDetailModal.jsx`** — 로컬 `PRIORITY_LABEL`을 삭제하고 import(위와 동일한 방식).

> 저장 후 화면을 확인하세요. 목록의 우선순위, 상세의 우선순위, 등록 폼의 우선순위 옵션, 검색바의 상태 옵션이 **이전과 똑같이** 나오면 성공입니다. 이제 이 값들의 출처는 `constants.js` 한 곳뿐입니다.

### Step 3. 공통 컴포넌트 만들기 — LoadingBox / ErrorBox

Day 6에서 목록·상세에 반복되던 로딩/에러 UI를 공통 컴포넌트로 추출합니다(스펙 폴더 구조에 있던 `LoadingBox`/`ErrorBox`를 이제 실제로 만듭니다).

**`src/components/common/LoadingBox.jsx`** (신규)

```jsx
import React from 'react';
import { Spin } from 'antd';

function LoadingBox({ tip = '불러오는 중...' }) {
  return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <Spin tip={tip} />
    </div>
  );
}

export default LoadingBox;
```

**`src/components/common/ErrorBox.jsx`** (신규)

```jsx
import React from 'react';
import { Alert, Button } from 'antd';

function ErrorBox({ message = '오류가 발생했습니다.', description, onRetry }) {
  return (
    <Alert
      type="error"
      showIcon
      message={message}
      description={description}
      action={onRetry ? <Button onClick={onRetry}>다시 시도</Button> : null}
    />
  );
}

export default ErrorBox;
```

- `onRetry`가 있으면 "다시 시도" 버튼을 보여주고, 없으면 생략합니다(재사용성).

### Step 4. 목록·상세에서 공통 컴포넌트 사용

**`RequestListPage.jsx`** — 에러 분기를 `ErrorBox`로 교체하고, 안 쓰게 된 `Alert` import를 정리.

antd import에서 `Alert`를 제거(목록 페이지에서는 이제 `Alert`를 직접 쓰지 않음):
```jsx
import { Table, Button, Modal, Space, message, Spin } from 'antd';
import ErrorBox from '@/components/common/ErrorBox';
```

에러 분기 변경 전:
```jsx
if (error) {
  return (
    <Alert
      type="error"
      showIcon
      message="불러오기 실패"
      description={error}
      action={<Button onClick={loadRequests}>다시 시도</Button>}
    />
  );
}
```

변경 후:
```jsx
if (error) {
  return <ErrorBox message="불러오기 실패" description={error} onRetry={loadRequests} />;
}
```

**`RequestDetailModal.jsx`** — 로딩/에러 블록을 공통 컴포넌트로 교체하고 import 정리.

antd import에서 `Spin`, `Alert` 제거:
```jsx
import { Modal, Button, Descriptions, Timeline } from 'antd';
import StatusTag from '@/components/common/StatusTag';
import LoadingBox from '@/components/common/LoadingBox';
import ErrorBox from '@/components/common/ErrorBox';
import * as requestApi from '@/api/requestApi';
import { PRIORITY_LABEL } from './constants';
```

렌더 부분 변경 전:
```jsx
{loading && (
  <div style={{ textAlign: 'center', padding: 24 }}>
    <Spin />
  </div>
)}

{error && <Alert type="error" showIcon message={error} />}
```

변경 후:
```jsx
{loading && <LoadingBox />}

{error && <ErrorBox message={error} />}
```

> 다시 화면을 확인하세요. 목록 조회 실패 시 에러 박스와 다시 시도 버튼, 상세 조회 시 로딩 박스가 이전과 동일하게 동작하면 리팩터링 성공입니다. 중복이 사라지고 파일도 짧아졌습니다.

---

## 4. 전체 동작 점검 (end-to-end 스모크 테스트)

정리가 끝났으니 1주차 결과물 **전체를 눌러 보며** 확인합니다. 각 항목의 기대 결과가 나오는지 체크하세요.

### 4.1 앱 기동 / 레이아웃 (Day 1, 4)

- `http://localhost:3000` 접속 → 좌측 어두운 사이드바 + 상단 헤더 + 흰 본문(antd `Layout`).
- 사이드바 접기 버튼 동작.
- 브라우저 콘솔에 빨간 에러가 없음.

### 4.2 메뉴 전환 (Day 4)

- 사이드바에서 **대시보드 ↔ 업무 요청** 클릭 시 본문이 바뀌고 선택 항목이 하이라이트.

### 4.3 대시보드 (Day 2, 4)

- 요약 카드 3개(신규/처리중/완료)가 `Row`/`Col`로 가로 배치.
- "최근 요청" 리스트에 상태 뱃지(`StatusTag`) 표시.

### 4.4 요청 목록 조회 (Day 6)

- 업무 요청 진입 시 잠깐 스피너 → mock의 5건이 `Table`에 표시.
- 우선순위가 한글(높음/보통/낮음), 상태가 색 뱃지로 표시.

### 4.5 검색 / 필터 (Day 3)

- 검색창에 "권한" 입력 → 제목에 포함된 항목만 남음.
- 상태 필터 "요청됨" 선택 → 해당 상태만 남고, 검색어와 함께 적용.

### 4.6 상세 조회 (Day 6)

- 행의 **상세** 클릭 → 모달에 로딩 박스 → 서버 상세 + **처리 이력(Timeline)** 표시.
- 다른 행 상세를 연속으로 열어도 올바른 데이터가 뜸(경쟁 상태 방지).

### 4.7 신규 등록 (Day 5, 6)

- **신규 요청** → 폼 모달(우선순위 기본 "보통").
- 빈 채로 등록 → 필수 필드 에러 메시지, 제출 안 됨.
- 정상 입력 후 등록 → 성공 메시지 + 목록 재조회로 새 항목 반영.
- `db.json`을 열어 새 항목이 실제로 기록됐는지 확인.

### 4.8 삭제 (Day 6)

- 행의 **삭제** → 확인창 → 확인 시 목록에서 제거 + `db.json` 반영.

### 4.9 에러/복구 (Day 6, 7)

- 터미널 A의 mock 서버를 잠깐 끄고 새로고침 → **ErrorBox**("불러오기 실패") + 다시 시도 버튼.
- 서버를 다시 켜고 "다시 시도" → 정상 복구.

하나라도 기대와 다르면 해당 Day 문서의 "자주 나는 오류" 절을 참고해 바로잡습니다.

---

## 5. 내 프로젝트 구조·설정 점검

실제 프로젝트에 투입되면 가장 먼저 하는 일이 "코드 읽기"입니다. 내 프로젝트로 그 습관을 들입니다.

### 5.1 폴더 구조 확인

```bash
# 트리 도구가 있으면
find src -type f | sort
```

0장의 "정리 후 폴더 구조"와 비교해, `components/common`·`components/layout`·`features/*`·`api`가 제 자리에 있는지 확인합니다.

### 5.2 package.json 점검

`package.json`을 열어 아래를 확인합니다.

- **scripts**: `start`(dev-server + `--openssl-legacy-provider`), `build`, `mock` 세 개.
- **dependencies**: `react@16`, `react-dom@16`, `antd@4`, `@ant-design/icons@4`, `axios`.
- **devDependencies**: `webpack@4`/`webpack-cli@3`/`webpack-dev-server@3`, `@babel/*@7`, `babel-loader@8`, 로더들(css/style/file/url), `html-webpack-plugin@4`, `clean-webpack-plugin@3`, `cross-env`, `json-server`.
- **버전 확인 감각**: antd가 4인지, React가 16인지 — 이 코스에서 반복 강조한 "버전 먼저 확인"을 내 프로젝트로 실습.

### 5.3 webpack.config.js 점검

- `entry: './src/index.jsx'`
- `resolve.alias`의 `@` → `src`
- `module.rules`의 babel/css/이미지 로더
- `devServer.proxy`의 `/api` + `pathRewrite`(Day 6 통신의 핵심)
- `output.filename`이 dev는 `bundle.js`, prod는 `[contenthash]`(Day 1의 dev-server 이슈 대응)

각 설정이 "어느 Day에 왜 넣었는지" 설명할 수 있으면 Webpack을 이해한 것입니다.

---

## 6. 프로덕션 빌드 가볍게 확인

빌드가 깨지지 않는지만 확인합니다(깊은 배포는 Day 14).

```bash
npm run build
```

- 에러 없이 끝나고 `dist/`에 `index.html`과 `bundle.[contenthash].js`가 생기면 OK.
- `dist/index.html`에 번들 script 태그가 자동 삽입됐는지 확인.

> ⚠️ **주의**: `dist`의 산출물을 그냥 열면 **API 호출은 동작하지 않습니다.** `/api` 프록시는 **개발 서버(webpack-dev-server)에만** 있기 때문입니다. 프로덕션에서 API를 붙이는 방법(정적 서버 + 백엔드/프록시)은 Day 14에서 다룹니다. 오늘은 "빌드 자체가 성공하는지"만 봅니다.

---

## 7. 1주차 개념 총정리

스펙의 복습 체크리스트를, 배운 Day와 함께 정리합니다. 각 문장을 스스로 설명할 수 있어야 합니다.

### ✔ React 16의 진입점은 `ReactDOM.render`다 (Day 1)

`src/index.jsx`에서 `ReactDOM.render(<App />, #root)`로 앱을 DOM에 그립니다. React 18의 `createRoot`는 이 코스에서 쓰지 않습니다.

### ✔ Webpack은 `src/index.jsx`부터 의존성을 추적한다 (Day 1)

`entry`에서 시작해 `import`를 따라가며 그래프를 만들고, Babel로 변환해 하나의 번들로 합칩니다.

### ✔ Babel은 JSX와 최신 JS 문법을 변환한다 (Day 1, 2)

`@babel/preset-react`가 JSX를 `React.createElement`로, `@babel/preset-env`가 최신 JS를 타깃 브라우저용으로 변환합니다.

### ✔ Props는 위→아래 단방향, State는 컴포넌트가 소유하고 바뀌면 리렌더 (Day 2, 3)

`StatusTag`는 `status` prop만으로 동작(재사용), 목록은 `useState`로 검색어·필터·데이터를 관리했습니다. 갱신은 항상 불변으로.

### ✔ antd `Table`은 관리자 화면의 핵심 컴포넌트다 (Day 4)

`columns`/`dataSource`/`rowKey`/`render`로 목록을 구성했고, `Modal`/`Form`/`Input`/`Select`로 상세·등록·검색을 만들었습니다. 버전(v4)에 따라 API가 다름을 유의.

### ✔ `useEffect`는 API 호출 같은 부수 효과에 쓴다 (Day 6)

마운트 시(`[]`) 목록을, id 변경 시(`[id]`) 상세를 조회하고 loading/error/success로 상태를 관리했습니다. 정리 함수로 경쟁 상태를 막았습니다.

---

## 8. 자주 나는 통합 이슈

### 8.1 상수 옮긴 뒤 `X is not defined`

- **원인**: 로컬 상수를 지웠는데 import를 안 넣음(또는 경로 오타).
- **해결**: `import { PRIORITY_LABEL } from './constants';` 등 import 확인.

### 8.2 `Alert`/`Spin` 관련 `is defined but never used` 경고

- **원인**: 공통 컴포넌트로 바꾼 뒤 antd import에 안 쓰는 것이 남음.
- **해결**: 안 쓰는 import 제거(목록: `Alert` 제거, 상세: `Spin`/`Alert` 제거).

### 8.3 리팩터링 후 화면이 미묘하게 달라짐

- **원인**: 옮긴 상수의 값/순서가 원본과 다름.
- **해결**: `constants.js`의 옵션 배열이 기존과 동일한지 대조. 리팩터링은 "동작 불변"이 원칙.

### 8.4 `@/components/common/...` 경로를 못 찾음

- **원인**: `@` 별칭 미설정 또는 파일 위치 오타.
- **해결**: `webpack.config.js`의 `resolve.alias` 확인, 파일이 `components/common`에 있는지 확인.

---

## 9. 체크포인트 (스스로 답해 보기)

### Q1. 우선순위 라벨을 `constants.js`로 모으면 무엇이 좋아지나?

값이 한 곳에만 존재해, 라벨을 바꿔도 목록·상세·폼이 자동으로 함께 바뀌고 불일치가 사라집니다(DRY).

### Q2. `LoadingBox`/`ErrorBox`를 공통으로 뺀 이유는?

로딩/에러 UI가 여러 화면에서 반복되기 때문입니다. 공통화하면 표시 방식을 한 곳에서 바꾸고, 화면 코드가 짧고 일관돼집니다.

### Q3. 리팩터링의 대원칙은?

겉보기 동작은 그대로 두고 내부 구조만 개선합니다. 각 단계 후 동작이 이전과 같은지 확인합니다.

### Q4. 프로덕션 빌드 산출물에서 API가 안 되는 이유는?

`/api` 프록시는 개발 서버에만 존재하기 때문입니다. 프로덕션에서는 별도의 정적 서버 + 백엔드/프록시 구성이 필요합니다(Day 14).

### Q5. 새 프로젝트에 투입되면 가장 먼저 확인할 것은?

폴더 구조, `package.json`(스크립트·의존성·버전), 빌드 설정(webpack), 그리고 라이브러리 버전(antd/React)입니다.

---

## 10. Day 7 완료 체크리스트

- [ ] `features/requests/constants.js`로 우선순위/상태 상수를 모았다.
- [ ] `RequestForm`/`RequestSearchBar`/`RequestListPage`/`RequestDetailModal`이 상수를 import해 쓴다(로컬 중복 제거).
- [ ] `LoadingBox`/`ErrorBox` 공통 컴포넌트를 만들었다.
- [ ] 목록·상세가 공통 로딩/에러 컴포넌트를 사용한다.
- [ ] 4장 스모크 테스트의 모든 기능이 정상 동작한다.
- [ ] 폴더 구조·`package.json`·`webpack.config.js`를 읽고 각 설정의 이유를 설명할 수 있다.
- [ ] `npm run build`가 에러 없이 `dist`를 생성한다.
- [ ] 7장 복습 체크리스트의 각 문장을 스스로 설명할 수 있다.

---

## 11. 다음 단계 (2주차 · Day 8 예고)

2주차부터는 앱의 뼈대를 실무 구조로 끌어올립니다.

- **Day 8 (React Router v5)** — 지금은 메뉴를 `state`로 전환하지만(URL이 안 바뀜), `BrowserRouter`/`Switch`/`Route`로 `/dashboard`·`/requests`·`/requests/:id` 같은 **URL 기반 화면**으로 바꿉니다. 오늘 정리한 상세 모달은 상세 **페이지/라우트**로 확장될 수 있고, Day 1에 넣어 둔 `historyApiFallback`이 이때 필요해집니다.
- **Day 9~10 (Redux + redux-thunk)** — 컴포넌트에 흩어진 상태를 전역으로 올리고, 오늘 만든 `api/requestApi.js`를 thunk 액션이 호출하도록 재배치합니다. 오늘 익힌 `constants.js` 분리 습관이 Redux 모듈 구조로 이어집니다.

1주차는 "React와 도구를 손에 익히는" 단계였습니다. 2주차는 "실무 프로젝트 구조로 재조립하는" 단계입니다.
