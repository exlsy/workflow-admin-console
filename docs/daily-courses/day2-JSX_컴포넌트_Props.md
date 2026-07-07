# Day 2 — JSX / 컴포넌트 / Props

> WorkFlow Admin Console 2주 코스의 둘째 날입니다.  
> Day 1에서 만든 Webpack + React 16 뼈대 위에, **순수 JSX와 함수형 컴포넌트, Props**만으로 재사용 가능한 컴포넌트를 만들고 대시보드 화면을 구성합니다.  
> 이 문서 하나만 따라 하면 `PageTitle`, `StatusTag`, `SummaryCard`를 만들고 대시보드에 카드 3개를 표시하는 것까지 완성됩니다.

---

## 0. 이 문서를 마치면

- JSX의 문법 규칙(하나의 부모, `className`, `{}` 표현식, 조건부/리스트 렌더링)을 정확히 쓸 수 있습니다.
- 함수형 컴포넌트의 기본 구조를 이해하고 직접 작성할 수 있습니다.
- Props의 **단방향 데이터 흐름**을 이해하고, 부모 → 자식으로 값을 내려보낼 수 있습니다.
- `children` prop과 props 구조 분해(destructuring)를 활용할 수 있습니다.
- 공통 컴포넌트와 기능(feature) 컴포넌트를 분리하는 기준을 잡을 수 있습니다.
- 대시보드 화면에 요약 카드 3개와 최근 요청 목록을 표시합니다.

### Day 2에서 다루지 않는 것 (혼동 방지)

- **state / 이벤트 / 리렌더링** → Day 3
- **antd 컴포넌트(Card, Table 등)** → Day 4. 오늘은 순수 HTML + CSS로만 만듭니다.
- **API 호출** → Day 6. 오늘 화면의 데이터는 파일에 **하드코딩된 정적 값**입니다.
- **라우팅** → Day 8. 오늘은 `App`이 대시보드 하나만 직접 렌더링합니다.

### 최종 산출물 폴더 구조 (Day 2 기준)

```txt
workflow-admin-console/
  src/
    components/
      common/
        PageTitle.jsx      (신규)
        StatusTag.jsx      (신규)
    features/
      dashboard/
        DashboardPage.jsx  (신규)
        SummaryCard.jsx    (신규)
    styles/
      global.css           (스타일 추가)
    App.jsx                (대시보드 렌더링으로 교체)
    index.jsx              (변경 없음)
```

---

## 1. 핵심 개념 먼저 이해하기

### 1.1 JSX 문법 규칙 7가지

JSX는 "JavaScript 안에 HTML처럼 생긴 문법을 쓰는 것"이지만, HTML과 미묘하게 다릅니다. Babel이 이걸 `React.createElement(...)` 호출로 바꾼다는 것(Day 1 참고)을 기억하면 규칙이 이해됩니다.

1. **반드시 하나의 부모 요소로 감싼다.** 컴포넌트는 하나의 엘리먼트만 반환할 수 있습니다.
   ```jsx
   // 잘못됨: 형제 요소 2개를 그냥 반환
   return (
     <h1>제목</h1>
     <p>내용</p>
   );

   // 올바름: 하나의 부모로 감싸기
   return (
     <div>
       <h1>제목</h1>
       <p>내용</p>
     </div>
   );
   ```
   불필요한 `<div>`를 만들기 싫으면 **Fragment**(`<>...</>` 또는 `<React.Fragment>`)를 씁니다.
   ```jsx
   return (
     <>
       <h1>제목</h1>
       <p>내용</p>
     </>
   );
   ```

2. **`class`가 아니라 `className`.** `class`는 JavaScript 예약어라서 JSX에서는 `className`을 씁니다.
   ```jsx
   <div className="summary-card">...</div>
   ```

3. **속성은 camelCase.** `onclick` → `onClick`, `tabindex` → `tabIndex`, `for` → `htmlFor`.

4. **`{}` 안에는 JavaScript 표현식**을 넣는다. 변수, 계산, 함수 호출 등 "값이 되는 것"만 가능합니다. `if`문 같은 "문(statement)"은 못 넣습니다.
   ```jsx
   const name = '관리자';
   return <p>안녕하세요, {name}님 ({1 + 2}건 처리)</p>;
   ```

5. **자체 닫기(self-closing) 태그.** 자식이 없는 태그는 반드시 닫아야 합니다.
   ```jsx
   <input />   // O
   <br />      // O
   <input>     // X (오류)
   ```

6. **조건부 렌더링**은 삼항 연산자나 `&&`로.
   ```jsx
   {isLoading ? <Spinner /> : <Content />}   // 둘 중 하나
   {subtitle && <p>{subtitle}</p>}           // 있을 때만 렌더링
   ```

7. **리스트 렌더링은 `.map()` + `key`.** 배열을 엘리먼트 배열로 변환하고, 각 항목에 고유한 `key`를 줍니다.
   ```jsx
   <ul>
     {items.map(item => (
       <li key={item.id}>{item.title}</li>
     ))}
   </ul>
   ```
   `key`는 React가 목록의 각 항목을 구별해 효율적으로 갱신하기 위한 힌트입니다. **배열 인덱스보다 고유 id를 쓰는 것이 안전합니다.**

### 1.2 함수형 컴포넌트란

컴포넌트는 **props(입력)를 받아 JSX(화면)를 반환하는 함수**입니다. 이름은 반드시 **대문자로 시작**해야 합니다(소문자로 시작하면 React가 일반 HTML 태그로 인식합니다).

```jsx
import React from 'react';

function PageTitle(props) {
  return <h1>{props.title}</h1>;
}

export default PageTitle;
```

- `import React from 'react';` — JSX는 `React.createElement`로 변환되므로 React 16에서는 파일마다 이 import가 필요합니다.
- `export default` — 이 컴포넌트를 다른 파일에서 `import PageTitle from './PageTitle'`로 가져다 쓰게 합니다.

### 1.3 Props와 단방향 데이터 흐름

**Props**는 부모 컴포넌트가 자식 컴포넌트에게 내려주는 "입력값"입니다. HTML 속성처럼 전달합니다.

```jsx
// 부모: PageTitle에게 title이라는 prop을 내려준다
<PageTitle title="대시보드" />

// 자식: props.title 로 받는다
function PageTitle(props) {
  return <h1>{props.title}</h1>;
}
```

React의 가장 중요한 원칙 중 하나가 **단방향 데이터 흐름(one-way data flow)** 입니다.

- 데이터는 **항상 위(부모) → 아래(자식)** 로만 흐릅니다.
- 자식은 받은 props를 **읽기 전용**으로 사용합니다. **props를 직접 수정하면 안 됩니다.**
  ```jsx
  function Bad(props) {
    props.title = '바꿈'; // 절대 금지! props는 읽기 전용
    return <h1>{props.title}</h1>;
  }
  ```
- 자식이 부모의 데이터를 바꾸고 싶으면, 부모가 내려준 **함수(콜백)를 호출**합니다(이 방식은 Day 3에서 이벤트와 함께 다룹니다).

이 규칙 덕분에 데이터가 어디서 와서 어디로 가는지 추적하기 쉬워집니다.

### 1.4 props 구조 분해 (destructuring)

`props.title`, `props.count`처럼 매번 `props.`를 붙이는 대신, 함수 매개변수에서 바로 꺼내 쓰면 코드가 깔끔합니다. 실무 코드에서 훨씬 자주 보이는 형태입니다.

```jsx
// props.xxx 방식
function SummaryCard(props) {
  return <h3>{props.title}: {props.count}</h3>;
}

// 구조 분해 방식 (권장)
function SummaryCard({ title, count }) {
  return <h3>{title}: {count}</h3>;
}
```

**기본값**도 지정할 수 있습니다.

```jsx
function SummaryCard({ title, count, unit = '건' }) {
  return <h3>{title}: {count}{unit}</h3>; // unit을 안 넘기면 '건'
}
```

### 1.5 children prop

컴포넌트 태그 **사이에 넣은 내용**은 `children`이라는 특별한 prop으로 전달됩니다. 카드, 박스, 레이아웃처럼 "안에 무엇이든 담는 그릇" 컴포넌트를 만들 때 유용합니다.

```jsx
function Box({ children }) {
  return <div className="box">{children}</div>;
}

// 사용
<Box>
  <p>이 내용이 children으로 전달됩니다.</p>
</Box>
```

### 1.6 컴포넌트 분리 기준 — common vs feature

이 프로젝트는 컴포넌트를 두 갈래로 나눕니다(Day 11에서 본격적으로 다루지만 지금부터 습관을 들입니다).

- **`components/common/`** — 특정 기능에 종속되지 않고 어디서든 재사용되는 순수 표시용 컴포넌트. 예: `PageTitle`, `StatusTag`. 자기 도메인 지식이 없고 props만으로 동작합니다.
- **`features/<도메인>/`** — 특정 화면/기능에 속한 컴포넌트. 예: `dashboard/SummaryCard`, `dashboard/DashboardPage`. 해당 기능의 데이터·조립을 담당합니다.

판단 기준: **"이 컴포넌트를 다른 화면에서도 그대로 쓸까?"** → 그렇다면 common, 특정 화면 전용이면 feature.

---

## 2. 사전 준비 — Day 1 완료 상태 확인

Day 1이 끝난 상태여야 합니다. 아래가 정상인지 확인하세요.

```bash
npm start
```

- `http://localhost:3000`이 에러 없이 뜨고, Day 1의 첫 화면이 보이면 준비 완료입니다.
- Day 1에서 설정한 `@` → `src` 별칭(webpack `resolve.alias`)을 이번 Day에서 import에 활용합니다.

> 개발 서버는 켜 둔 채로 진행하세요. 파일을 저장할 때마다 브라우저가 자동으로 갱신되어 결과를 바로 확인할 수 있습니다.

---

## 3. 단계별 실습 (그대로 따라 하기)

### Step 1. 폴더 만들기

```bash
mkdir -p src/components/common
mkdir -p src/features/dashboard
```

- `mkdir -p`는 중간 폴더까지 한 번에 만듭니다.

### Step 2. 공통 컴포넌트 — PageTitle

모든 페이지 상단에서 재사용할 제목 컴포넌트입니다. `title`(필수)과 `subtitle`(선택)을 받고, subtitle이 있을 때만 렌더링합니다(조건부 렌더링).

**`src/components/common/PageTitle.jsx`**

```jsx
import React from 'react';

function PageTitle({ title, subtitle }) {
  return (
    <div className="page-title">
      <h1 className="page-title__text">{title}</h1>
      {subtitle && <p className="page-title__subtitle">{subtitle}</p>}
    </div>
  );
}

export default PageTitle;
```

핵심 포인트:
- props를 `{ title, subtitle }`로 **구조 분해**해서 받습니다.
- `{subtitle && <p>...</p>}` — subtitle이 전달됐을 때만 `<p>`를 그립니다.

### Step 3. 공통 컴포넌트 — StatusTag

업무 요청의 상태(`REQUESTED`, `IN_PROGRESS`, `APPROVED`, `REJECTED`, `DONE`)를 색깔 있는 뱃지로 표시합니다. 이 컴포넌트는 **상태값(영문 상수)을 받아 한글 라벨과 색으로 변환**하는 대표적인 재사용 컴포넌트입니다.

**`src/components/common/StatusTag.jsx`**

```jsx
import React from 'react';

// 요청 상태별 표시 정보 (라벨 + 색)
// status 상수값은 영문으로 두고, 화면 표시 라벨만 한글로 매핑한다.
const STATUS_MAP = {
  REQUESTED:   { label: '요청됨', color: '#1890ff' },
  IN_PROGRESS: { label: '처리중', color: '#faad14' },
  APPROVED:    { label: '승인',   color: '#52c41a' },
  REJECTED:    { label: '반려',   color: '#f5222d' },
  DONE:        { label: '완료',   color: '#8c8c8c' },
};

function StatusTag({ status }) {
  // 알 수 없는 상태가 들어와도 깨지지 않도록 기본값 처리
  const info = STATUS_MAP[status] || { label: status, color: '#d9d9d9' };

  return (
    <span className="status-tag" style={{ backgroundColor: info.color }}>
      {info.label}
    </span>
  );
}

export default StatusTag;
```

핵심 포인트:
- **매핑 객체(`STATUS_MAP`)를 컴포넌트 바깥에** 둡니다. 렌더링할 때마다 새로 만들 필요가 없기 때문입니다.
- `style={{ backgroundColor: info.color }}` — JSX에서 인라인 스타일은 **객체**로 주고, CSS 속성명은 camelCase(`background-color` → `backgroundColor`)입니다. 바깥 `{}`는 "JS 표현식", 안쪽 `{}`는 "객체 리터럴"입니다.
- 존재하지 않는 상태값이 와도 앱이 깨지지 않도록 **폴백(fallback)** 을 뒀습니다(정석적인 방어 코드).

### Step 4. 기능 컴포넌트 — SummaryCard

대시보드 상단의 요약 숫자 카드입니다. 스펙의 예시를 조금 확장해 단위(`unit`)에 기본값을 줍니다.

**`src/features/dashboard/SummaryCard.jsx`**

```jsx
import React from 'react';

function SummaryCard({ title, count, unit = '건' }) {
  return (
    <div className="summary-card">
      <h3 className="summary-card__title">{title}</h3>
      <strong className="summary-card__count">
        {count}
        <span className="summary-card__unit">{unit}</span>
      </strong>
    </div>
  );
}

export default SummaryCard;
```

핵심 포인트:
- `unit = '건'` — prop을 안 넘기면 기본값이 쓰입니다.
- 이 컴포넌트는 대시보드 전용이므로 `features/dashboard/`에 둡니다.

### Step 5. 페이지 조립 — DashboardPage

지금까지 만든 조각들을 조립해 하나의 화면을 만듭니다. Day 2에는 state가 없으므로 데이터는 **정적 배열**로 선언하고 `.map()`으로 렌더링합니다.

**`src/features/dashboard/DashboardPage.jsx`**

```jsx
import React from 'react';
import PageTitle from '@/components/common/PageTitle';
import StatusTag from '@/components/common/StatusTag';
import SummaryCard from './SummaryCard';

// Day 2에서는 아직 state와 API가 없으므로 정적 데이터를 사용한다.
// Day 3에서 state/이벤트, Day 6에서 API 연동으로 대체된다.
const summary = [
  { key: 'requested', title: '신규 요청', count: 8 },
  { key: 'inProgress', title: '처리중', count: 5 },
  { key: 'done', title: '완료', count: 23 },
];

const recentRequests = [
  { id: 1, title: '계정 권한 신청', status: 'REQUESTED' },
  { id: 2, title: '장비 교체 요청', status: 'IN_PROGRESS' },
  { id: 3, title: '휴가 시스템 오류 접수', status: 'DONE' },
];

function DashboardPage() {
  return (
    <div className="dashboard">
      <PageTitle title="대시보드" subtitle="업무 요청 현황을 한눈에 확인합니다." />

      {/* 요약 카드 3개: 배열을 .map()으로 렌더링 */}
      <div className="summary-cards">
        {summary.map(item => (
          <SummaryCard key={item.key} title={item.title} count={item.count} />
        ))}
      </div>

      {/* 최근 요청 목록: StatusTag 재사용 */}
      <div className="recent-list">
        <h2 className="recent-list__title">최근 요청</h2>
        <ul>
          {recentRequests.map(req => (
            <li key={req.id} className="recent-list__item">
              <span>{req.title}</span>
              <StatusTag status={req.status} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default DashboardPage;
```

핵심 포인트:
- `import PageTitle from '@/components/common/PageTitle';` — Day 1에서 설정한 **`@` 별칭** 덕분에 `../../components/...` 같은 지저분한 상대경로 없이 `src` 기준 절대경로로 가져옵니다.
- 같은 폴더의 `SummaryCard`는 상대경로 `./SummaryCard`로 가져옵니다.
- `{/* ... */}` — JSX 안의 주석은 이 형태로 씁니다.
- `summary.map(...)`과 `recentRequests.map(...)` 각각 `key`를 부여했습니다.

### Step 6. App.jsx 교체

Day 1의 첫 화면 대신 대시보드를 렌더링하도록 바꿉니다. 아직 라우터가 없으므로 `App`이 `DashboardPage`를 직접 렌더링합니다(라우팅은 Day 8).

**`src/App.jsx`** (전체 교체)

```jsx
import React from 'react';
import DashboardPage from '@/features/dashboard/DashboardPage';

function App() {
  return (
    <div className="app-shell">
      <DashboardPage />
    </div>
  );
}

export default App;
```

### Step 7. 스타일 추가

`src/styles/global.css`에 아래 스타일을 **추가**합니다. (Day 1에서 만든 기존 내용은 두고, 아래를 이어 붙이면 됩니다. `.app-hello`는 이제 안 쓰므로 지워도 됩니다.)

```css
/* ===== Day 2: 대시보드 레이아웃 ===== */
.app-shell {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px;
}

/* PageTitle */
.page-title {
  margin-bottom: 24px;
}
.page-title__text {
  font-size: 24px;
  font-weight: 700;
}
.page-title__subtitle {
  margin-top: 4px;
  color: #888;
  font-size: 14px;
}

/* SummaryCard */
.summary-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
}
.summary-card {
  flex: 1;
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.summary-card__title {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}
.summary-card__count {
  font-size: 28px;
  font-weight: 700;
  color: #1890ff;
}
.summary-card__unit {
  font-size: 14px;
  font-weight: 400;
  color: #999;
  margin-left: 4px;
}

/* 최근 요청 목록 */
.recent-list {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.recent-list__title {
  font-size: 16px;
  margin-bottom: 12px;
}
.recent-list__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  list-style: none;
}
.recent-list__item:last-child {
  border-bottom: none;
}

/* StatusTag */
.status-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  color: #fff;
}
```

### Step 8. 실행 확인

개발 서버가 켜져 있다면 저장하는 순간 자동 갱신됩니다. 꺼져 있다면:

```bash
npm start
```

`http://localhost:3000`에서 다음이 보이면 성공입니다.

- 상단에 "대시보드" 제목과 부제
- 그 아래 요약 카드 3개(신규 요청 8건 / 처리중 5건 / 완료 23건)가 가로로 나란히
- 그 아래 "최근 요청" 목록 3줄, 각 줄 오른쪽에 색깔 있는 상태 뱃지(요청됨/처리중/완료)

`DashboardPage.jsx`의 `summary` 숫자나 `recentRequests` 항목을 바꿔 저장하면 화면이 즉시 바뀝니다. props로 값이 흘러 화면이 만들어지는 과정을 직접 확인해 보세요.

---

## 4. 개념 심화

### 4.1 props는 왜 읽기 전용인가

Day 2의 데이터는 정적이지만, 실무에서는 이 값이 계속 바뀝니다(Day 3의 state, Day 6의 API). React는 "데이터가 바뀌면 그 데이터를 props로 받은 컴포넌트만 다시 그린다"는 모델로 동작합니다. 자식이 props를 마음대로 바꾸면 데이터의 출처가 흐려져 이 추적이 불가능해집니다. 그래서 **props는 항상 위에서 내려주고, 자식은 읽기만** 합니다.

### 4.2 왜 리스트에 key가 필요한가

`.map()`으로 여러 엘리먼트를 그릴 때, React는 이전 목록과 새 목록을 비교해 바뀐 부분만 갱신합니다. `key`는 "어떤 항목이 그대로이고 어떤 게 새로 생겼는지"를 알려주는 이름표입니다. key가 없거나 인덱스를 쓰면, 항목의 순서가 바뀌거나 중간이 삭제될 때 엉뚱한 항목이 갱신될 수 있습니다. **고유하고 안정적인 값(주로 데이터의 id)** 을 key로 쓰세요.

### 4.3 컴포넌트를 잘게 나누는 이유

`DashboardPage` 하나에 모든 마크업을 넣을 수도 있었지만, `PageTitle`·`SummaryCard`·`StatusTag`로 나눴습니다. 이렇게 하면:
- **재사용**: `StatusTag`는 나중에 요청 목록(Day 12)·상세(Day 13)에서 그대로 씁니다.
- **가독성**: 각 컴포넌트가 한 가지 일만 하므로 읽기 쉽습니다(SRP, 단일 책임).
- **수정 범위 최소화**: 상태 색을 바꾸려면 `StatusTag`만 고치면 됩니다.

---

## 5. 자주 나는 오류와 해결

### 5.1 `Adjacent JSX elements must be wrapped in an enclosing tag`

- **원인**: 형제 엘리먼트를 하나의 부모로 감싸지 않고 반환.
- **해결**: `<div>` 또는 Fragment(`<>...</>`)로 감싸기(1.1 규칙 1).

### 5.2 컴포넌트가 화면에 안 나오고 `<pagetitle />` 처럼 그대로 보임

- **원인**: 컴포넌트 이름을 소문자로 시작함. React가 HTML 태그로 인식합니다.
- **해결**: 컴포넌트 이름은 반드시 대문자로 시작(`PageTitle`).

### 5.3 `Module not found: Can't resolve '@/components/...'`

- **원인**: Day 1의 webpack `resolve.alias`(`@` → `src`) 설정이 없거나, dev-server를 재시작하지 않음.
- **해결**: `webpack.config.js`의 `resolve.alias`에 `'@': path.resolve(__dirname, 'src')`가 있는지 확인. 없었다면 추가 후 **dev-server 재시작**. 정 안 되면 상대경로(`../../components/common/PageTitle`)로 대체 가능.

### 5.4 `Each child in a list should have a unique "key" prop` 경고

- **원인**: `.map()`으로 렌더링하는 최상위 엘리먼트에 `key`를 안 줌.
- **해결**: `.map()`이 반환하는 엘리먼트에 고유 `key`를 부여(`key={item.id}`).

### 5.5 인라인 스타일이 적용 안 됨 / 오류

- **원인**: `style="background: red"`처럼 문자열로 주거나, CSS 속성을 케밥케이스로 씀.
- **해결**: JSX 인라인 스타일은 객체 + camelCase. `style={{ backgroundColor: 'red' }}`.

---

## 6. 체크포인트 (스스로 답해 보기)

### Q1. JSX에서 `class` 대신 무엇을 쓰는가? 왜인가?

`className`. `class`가 JavaScript의 예약어이기 때문입니다. JSX는 결국 JS로 변환되므로 예약어와 충돌을 피합니다.

### Q2. Props의 "단방향 데이터 흐름"이란?

데이터가 부모 → 자식 방향으로만 흐르고, 자식은 받은 props를 읽기 전용으로만 사용하는 규칙입니다. 자식이 데이터를 바꾸려면 부모가 내려준 콜백 함수를 호출해야 합니다.

### Q3. `.map()`으로 목록을 그릴 때 `key`가 필요한 이유는?

React가 목록의 각 항목을 구별해, 변경·추가·삭제 시 바뀐 부분만 정확하고 효율적으로 갱신하기 위해서입니다. 인덱스보다 고유 id가 안전합니다.

### Q4. 공통(common) 컴포넌트와 기능(feature) 컴포넌트를 나누는 기준은?

특정 화면·도메인에 종속되지 않고 어디서든 재사용되면 common(예: `StatusTag`), 특정 기능 화면에 속하면 feature(예: `dashboard/SummaryCard`)에 둡니다.

### Q5. `children` prop은 언제 쓰는가?

컴포넌트 태그 사이에 넣은 내용을 자식에게 전달할 때 씁니다. 카드·박스·레이아웃처럼 안에 임의의 내용을 담는 그릇 컴포넌트에 유용합니다.

---

## 7. Day 2 완료 체크리스트

- [ ] `components/common/`, `features/dashboard/` 폴더를 만들었다.
- [ ] `PageTitle`을 작성하고 `subtitle` 조건부 렌더링을 이해했다.
- [ ] `StatusTag`를 작성하고 상태값 → 라벨/색 매핑과 폴백 처리를 이해했다.
- [ ] `SummaryCard`를 작성하고 prop 기본값(`unit = '건'`)을 이해했다.
- [ ] `DashboardPage`에서 정적 데이터를 `.map()` + `key`로 렌더링했다.
- [ ] `App.jsx`가 `DashboardPage`를 렌더링하도록 바꿨다.
- [ ] 브라우저에 요약 카드 3개와 최근 요청 목록(상태 뱃지 포함)이 보인다.
- [ ] props 구조 분해, 단방향 흐름, `className`, `{}` 표현식을 설명할 수 있다.
- [ ] 6장 체크포인트 5문항에 스스로 답할 수 있다.

---

## 8. 다음 단계 (Day 3 예고)

Day 3에서는 오늘 만든 정적 화면에 **state(상태)와 이벤트**를 입힙니다. `useState`로 검색어·상태 필터를 관리하고, 입력·선택 이벤트에 따라 목록이 실시간으로 필터링되도록 만듭니다. 이때 **불변성(immutability)** — 배열/객체를 직접 수정하지 않고 새로 만들어 교체하는 원칙 — 을 함께 익힙니다. Day 2에서 하드코딩했던 데이터가 "화면 위에서 살아 움직이기" 시작하는 단계입니다.
