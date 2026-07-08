# Day 9 — Redux 기본 구조

> WorkFlow Admin Console 2주 코스의 아홉째 날입니다.  
> Day 8에서 임시로 통과시키던 로그인과, 페이지마다 흩어져 있던 필터 상태를 **Redux 전역 store**로 끌어올립니다.  
> 이 문서 하나만 따라 하면 store/action/reducer/selector를 만들고, classic `connect` 패턴으로 로그인 사용자·요청 목록·필터 상태를 전역 관리하며, `PrivateRoute`로 접근을 제어하는 것까지 완성합니다.

---

## 0. 이 문서를 마치면

- Redux의 단방향 데이터 흐름(View → dispatch(action) → reducer → new state → View)을 이해합니다.
- `store`/`action`/`reducer`/`dispatch`/`selector`의 역할과 관계를 설명할 수 있습니다.
- `Provider`로 store를 앱에 주입하고, **`connect`/`mapStateToProps`/`mapDispatchToProps`** 로 컴포넌트를 store에 연결합니다.
- 로그인 사용자·요청 목록·필터 상태를 전역 store에 저장하고, 새로고침해도 로그인이 유지되게 합니다.
- `PrivateRoute`로 로그인하지 않은 접근을 `/login`으로 돌려보냅니다.

### 앞선 Day와의 연결

- **Day 3**: 불변성(spread) — reducer가 새 state를 만들 때 그대로 씁니다.
- **Day 6**: `api/*.js`(axios) 계층 — 로그인/목록 조회에 재사용합니다.
- **Day 7**: `constants.js`로 상수를 분리한 습관 — Redux 모듈(`actions.js`/`reducer.js`/`selectors.js`) 구조로 확장됩니다.
- **Day 8**: 라우팅 골격과 "레이아웃 라우트" 경계 — 그 경계에 **`PrivateRoute`** 를 얹습니다. 임시 로그인이 **진짜 상태 기반 로그인**으로 바뀝니다.

### Day 9에서 다루지 않는 것 (혼동 방지)

- **비동기 action(redux-thunk)** → Day 10. 오늘은 **동기 action**만 쓰고, API 조회는 Day 6처럼 **컴포넌트 안에서** 한 뒤 결과를 `dispatch`로 store에 저장합니다.
- **loading/error까지 Redux로** → Day 10. 오늘 loading/error는 아직 컴포넌트 지역 상태입니다.
- **비밀번호 검증/보안 로그인** → 학습 범위 밖. mock에서는 아이디 존재 여부만 확인합니다.

### 최종 산출물 폴더 구조 (Day 9 기준)

```txt
workflow-admin-console/
  src/
    store/
      configureStore.js   (신규 - store 생성)
      rootReducer.js      (신규 - reducer 결합)
    api/
      authApi.js          (신규 - 사용자 조회)
    routes/
      PrivateRoute.jsx    (신규 - 인증 게이트)
    features/
      auth/
        actions.js        (신규)
        reducer.js        (신규)
        selectors.js      (신규)
        LoginPage.jsx     (진짜 로그인 + connect)
      requests/
        actions.js        (신규 - redux)
        reducer.js        (신규 - redux)
        selectors.js      (신규 - redux)
        RequestListPage.jsx (connect로 필터/목록 전역화)
    components/layout/
      HeaderBar.jsx        (사용자 표시 + 로그아웃)
    App.jsx                (Provider + PrivateRoute)
```

---

## 1. 핵심 개념 먼저 이해하기

### 1.1 왜 전역 상태인가

Day 8까지 상태는 각 컴포넌트가 소유했습니다. 하지만 어떤 데이터는 **여러 화면이 공유**해야 합니다.

- **로그인 사용자**: 헤더(이름 표시), PrivateRoute(접근 제어), 여러 페이지에서 필요.
- **필터 상태**: 목록에서 검색어를 입력하고 상세로 갔다 오면, 필터가 초기화됩니다(Day 8의 아쉬움).

이런 값을 컴포넌트마다 들고 다니거나 props로 여러 단계 내려보내면(**prop drilling**) 관리가 어렵습니다. **Redux는 앱 전체가 공유하는 하나의 상태 저장소(store)** 를 두어 이 문제를 해결합니다.

### 1.2 Redux 단방향 데이터 흐름

Redux는 상태를 바꾸는 방법을 딱 하나로 강제합니다.

```txt
[View] --dispatch(action)--> [Reducer] --반환--> [새 State] --구독--> [View 갱신]
```

- 화면에서 **action을 dispatch**하고,
- **reducer**가 `(현재 state, action) → 새 state`를 계산하고,
- store가 새 state를 갖고 **연결된 컴포넌트를 다시 렌더**합니다.

state를 직접 바꾸는 길은 없습니다. **반드시 action → reducer**를 거칩니다. 그래서 "언제, 무엇이, 왜 바뀌었는지" 추적이 쉽습니다(Redux DevTools로 확인 가능).

### 1.3 용어 정리

- **Store**: 앱의 전체 상태를 담는 하나의 객체 + 관리 기능(`getState`, `dispatch`, `subscribe`).
- **Action**: "무슨 일이 일어났는가"를 나타내는 순수 객체. `{ type: 'auth/LOGIN', payload: user }`. `type`은 필수.
- **Action creator**: action 객체를 만들어 주는 함수. `login(user)` → action.
- **Reducer**: `(state, action) => newState`. **순수 함수**여야 하고(부수 효과 없음), 불변으로 새 state를 반환.
- **Dispatch**: action을 store로 보내는 것. `dispatch(login(user))`.
- **Selector**: store에서 필요한 값을 꺼내는 함수. `state => state.auth.user`.

### 1.4 reducer는 순수 함수 + 불변 (Day 3의 재등장)

reducer는 **입력이 같으면 출력도 같아야** 하고, 기존 state를 **직접 수정하면 안 됩니다**. Day 3에서 배운 불변 업데이트를 그대로 씁니다.

```js
function reducer(state = initialState, action) {
  switch (action.type) {
    case SET_REQUEST_FILTER:
      return { ...state, filter: action.payload }; // 새 객체로 교체 (직접 수정 금지)
    default:
      return state; // 모르는 action은 현재 state 그대로
  }
}
```

- `default`에서 **반드시 기존 state를 반환**합니다(combineReducers가 모든 reducer에 모든 action을 보내기 때문).
- API 호출·localStorage 쓰기 같은 **부수 효과를 reducer에 넣지 않습니다**(순수성 유지). 그런 일은 action creator나 store 구독, 미들웨어에서 합니다.

### 1.5 store 만들기 — combineReducers, configureStore, Provider

- **`combineReducers`**: 도메인별 reducer를 하나로 합칩니다. `{ auth, requests }` → `state.auth`, `state.requests`.
- **`createStore`**: 합친 reducer로 store를 만듭니다.
- **`Provider`**: 만든 store를 React 트리에 주입합니다. 이 안쪽 어디서든 store에 접근할 수 있습니다.

### 1.6 컴포넌트를 store에 연결 — connect (핵심)

구형 프로젝트에서 가장 많이 보는 패턴입니다. `connect(mapStateToProps, mapDispatchToProps)(컴포넌트)`.

- **`mapStateToProps(state)`**: store의 값을 컴포넌트 **props로** 매핑.
  ```js
  const mapStateToProps = state => ({ user: state.auth.user });
  ```
- **`mapDispatchToProps`**: dispatch할 action creator를 props 함수로 매핑. **객체 축약형**이 편합니다.
  ```js
  const mapDispatchToProps = { login, logout }; // props.login(user) 호출 시 자동 dispatch
  ```
- 연결:
  ```js
  export default connect(mapStateToProps, mapDispatchToProps)(HeaderBar);
  ```

이제 컴포넌트는 `this.props.user`(또는 함수형에서 `props.user`)로 상태를 읽고, `props.login(user)`로 상태를 바꿉니다. **컴포넌트는 store의 존재를 자세히 몰라도 됩니다.**

### 1.7 hooks 대안 (참고)

modern React에서는 `connect` 대신 hooks를 쓰기도 합니다.

```jsx
import { useSelector, useDispatch } from 'react-redux';
const user = useSelector(state => state.auth.user);
const dispatch = useDispatch();
dispatch(login(user));
```

> 이 코스는 **구형 프로젝트 적응**이 목표라 `connect`를 주로 익힙니다(실무 레거시 코드가 대부분 이 형태). hooks는 "더 간결한 대안"으로 알아 두면 됩니다. 둘은 한 프로젝트에서 섞여 쓰이기도 합니다.

### 1.8 selector를 따로 두는 이유

`state.requests.items`처럼 store 구조를 컴포넌트가 직접 아는 대신, `selectRequestItems(state)` 같은 selector를 거칩니다. store 구조가 바뀌어도 selector만 고치면 되고, **파생 값(필터링된 목록)** 계산도 selector에 모을 수 있습니다(Day 3의 파생 값이 여기로 이동).

### 1.9 로그인 지속과 PrivateRoute

- **지속**: 로그인 사용자를 `localStorage`에 동기화해 새로고침해도 유지합니다(reducer는 순수하게 두고, store 구독으로 저장 — 1.4 원칙 준수).
- **PrivateRoute**: "로그인했으면 화면을 보여주고, 아니면 `/login`으로 리다이렉트"하는 커스텀 Route. Day 8에서 자리만 잡아 둔 그 경계에 들어갑니다.

---

## 2. 설치

```bash
npm install redux react-redux
```

확인:

```bash
npm ls redux react-redux
```

> (선택) 브라우저에 **Redux DevTools** 확장을 설치하면 action 흐름과 state 변화를 눈으로 볼 수 있습니다. 아래 `configureStore`가 확장을 자동 연결합니다.

---

## 3. 단계별 실습 (그대로 따라 하기)

### Step 1. auth Redux 모듈

**`src/features/auth/actions.js`** (신규)

```js
// action type 상수 (문자열 오타 방지 + DevTools 표시용)
export const LOGIN = 'auth/LOGIN';
export const LOGOUT = 'auth/LOGOUT';

// action creator
export function login(user) {
  return { type: LOGIN, payload: user };
}

export function logout() {
  return { type: LOGOUT };
}
```

**`src/features/auth/reducer.js`** (신규)

```js
import { LOGIN, LOGOUT } from './actions';

// 새로고침 시에도 로그인 유지: 초기 state를 localStorage에서 복원
function loadUser() {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

const initialState = {
  user: loadUser(),
};

// reducer는 순수 함수: 부수 효과 없이 새 state만 반환
export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case LOGIN:
      return { ...state, user: action.payload };
    case LOGOUT:
      return { ...state, user: null };
    default:
      return state;
  }
}
```

**`src/features/auth/selectors.js`** (신규)

```js
export const selectUser = state => state.auth.user;
export const selectIsAuthenticated = state => Boolean(state.auth.user);
```

### Step 2. requests Redux 모듈

목록(`items`)과 필터(`keyword`/`status`)를 store로 옮깁니다. (Day 7에서 만든 `constants.js`는 UI 상수라 그대로 두고, action type은 스펙 예시처럼 `actions.js`에 둡니다.)

**`src/features/requests/actions.js`** (신규)

```js
export const SET_REQUESTS = 'requests/SET_REQUESTS';
export const SET_REQUEST_FILTER = 'requests/SET_REQUEST_FILTER';

export function setRequests(items) {
  return { type: SET_REQUESTS, payload: items };
}

export function setRequestFilter(filter) {
  return { type: SET_REQUEST_FILTER, payload: filter };
}
```

**`src/features/requests/reducer.js`** (신규)

```js
import { SET_REQUESTS, SET_REQUEST_FILTER } from './actions';

const initialState = {
  items: [],
  filter: { keyword: '', status: 'ALL' },
};

export default function requestReducer(state = initialState, action) {
  switch (action.type) {
    case SET_REQUESTS:
      return { ...state, items: action.payload };
    case SET_REQUEST_FILTER:
      return { ...state, filter: action.payload };
    default:
      return state;
  }
}
```

**`src/features/requests/selectors.js`** (신규)

```js
export const selectRequestItems = state => state.requests.items;
export const selectRequestFilter = state => state.requests.filter;

// 파생 selector: 필터가 적용된 목록 (Day 3의 파생 값이 selector로 이동)
export const selectFilteredRequests = state => {
  const { items, filter } = state.requests;
  const keyword = filter.keyword.trim();
  return items.filter(req => {
    const matchKeyword = req.title.includes(keyword);
    const matchStatus = filter.status === 'ALL' || req.status === filter.status;
    return matchKeyword && matchStatus;
  });
};
```

### Step 3. reducer 결합과 store 생성

**`src/store/rootReducer.js`** (신규)

```js
import { combineReducers } from 'redux';
import authReducer from '@/features/auth/reducer';
import requestReducer from '@/features/requests/reducer';

// state.auth, state.requests 로 접근하게 된다
const rootReducer = combineReducers({
  auth: authReducer,
  requests: requestReducer,
});

export default rootReducer;
```

**`src/store/configureStore.js`** (신규)

```js
import { createStore } from 'redux';
import rootReducer from './rootReducer';

// Redux DevTools 확장이 있으면 연결 (없으면 undefined → 무시)
const devtools =
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__();

export default function configureStore() {
  const store = createStore(rootReducer, devtools);

  // 로그인 사용자 변화를 localStorage에 동기화 (reducer는 순수하게, 부수 효과는 여기서)
  store.subscribe(() => {
    const { user } = store.getState().auth;
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('auth_user');
    }
  });

  return store;
}
```

> **Day 10 미리보기**: 여기 `createStore(rootReducer, devtools)`가 Day 10에서 `applyMiddleware(thunk)`를 더한 형태로 바뀝니다(비동기 action을 위해).

### Step 4. 사용자 조회 API

**`src/api/authApi.js`** (신규)

```js
import client from './client';

// json-server의 /users 조회 (Day 6에서 만든 client 재사용)
export function fetchUsers() {
  return client.get('/users').then(res => res.data);
}
```

### Step 5. PrivateRoute

로그인 여부를 store에서 읽어(`connect`), 안 했으면 `/login`으로 보냅니다.

**`src/routes/PrivateRoute.jsx`** (신규)

```jsx
import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import { selectIsAuthenticated } from '@/features/auth/selectors';

function PrivateRoute({ isAuthenticated, children, ...rest }) {
  return (
    <Route
      {...rest}
      render={({ location }) =>
        isAuthenticated ? (
          children
        ) : (
          // 로그인 후 원래 가려던 곳으로 돌아올 수 있도록 from 정보 전달
          <Redirect to={{ pathname: '/login', state: { from: location } }} />
        )
      }
    />
  );
}

const mapStateToProps = state => ({
  isAuthenticated: selectIsAuthenticated(state),
});

export default connect(mapStateToProps)(PrivateRoute);
```

### Step 6. LoginPage — 진짜 로그인 (connect로 dispatch)

Day 8의 임시 로그인을, 사용자 조회 후 store에 저장하는 실제 로그인으로 바꿉니다.

**`src/features/auth/LoginPage.jsx`** (전체 교체)

```jsx
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { connect } from 'react-redux';
import { Form, Input, Button, Card, message } from 'antd';
import { login } from './actions';
import * as authApi from '@/api/authApi';

function LoginPage({ login }) {
  const history = useHistory();
  const [loading, setLoading] = useState(false);

  const handleFinish = async values => {
    setLoading(true);
    try {
      const users = await authApi.fetchUsers();
      const user = users.find(u => u.username === values.username);
      if (!user) {
        message.error('존재하지 않는 사용자입니다. (mock: admin)');
        return;
      }
      login(user);                    // Redux store에 저장 → subscribe가 localStorage 동기화
      message.success(`${user.name}님, 환영합니다.`);
      history.push('/dashboard');
    } catch (e) {
      message.error('로그인 처리 중 오류가 발생했습니다. mock 서버(:4000)를 확인하세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <Card title="WorkFlow Admin Console" style={{ width: 360 }}>
        <Form layout="vertical" onFinish={handleFinish} initialValues={{ username: 'admin' }}>
          <Form.Item
            name="username"
            label="아이디"
            rules={[{ required: true, message: '아이디를 입력하세요.' }]}
          >
            <Input placeholder="admin" />
          </Form.Item>
          <Form.Item
            name="password"
            label="비밀번호"
            rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}
          >
            <Input.Password placeholder="비밀번호 (mock에서는 검증하지 않음)" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            로그인
          </Button>
        </Form>
      </Card>
    </div>
  );
}

// 객체 축약형: props.login(user) 호출 시 자동으로 dispatch(login(user))
const mapDispatchToProps = { login };

export default connect(null, mapDispatchToProps)(LoginPage);
```

> `admin`으로 로그인합니다(mock `db.json`의 users). 비밀번호는 무엇을 넣어도 됩니다(mock 단계).

### Step 7. HeaderBar — 사용자 표시 + 로그아웃

store를 **읽고**(`mapStateToProps`) **바꾸는**(`mapDispatchToProps`) 예제를 헤더에서 완성합니다.

**`src/components/layout/HeaderBar.jsx`** (전체 교체)

```jsx
import React from 'react';
import { Layout, Button, Space } from 'antd';
import { connect } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { selectUser } from '@/features/auth/selectors';
import { logout } from '@/features/auth/actions';

const { Header } = Layout;

function HeaderBar({ user, logout }) {
  const history = useHistory();

  const handleLogout = () => {
    logout();                 // store에서 사용자 제거 → PrivateRoute가 접근 차단
    history.push('/login');
  };

  return (
    <Header
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span className="header-title">WorkFlow Admin Console</span>
      <Space>
        {user && <span>{user.name}님</span>}
        <Button size="small" onClick={handleLogout}>로그아웃</Button>
      </Space>
    </Header>
  );
}

const mapStateToProps = state => ({ user: selectUser(state) });
const mapDispatchToProps = { logout };

export default connect(mapStateToProps, mapDispatchToProps)(HeaderBar);
```

### Step 8. RequestListPage — 필터/목록을 store로 (connect)

목록과 필터를 store에서 읽고(파생 selector), 검색바 콜백은 `setRequestFilter`를 dispatch합니다. 조회는 아직 컴포넌트에서 하되, 결과를 `setRequests`로 store에 넣습니다.

**`src/features/requests/RequestListPage.jsx`** (전체 교체)

```jsx
import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { connect } from 'react-redux';
import { Table, Button, Modal, Space, message, Spin } from 'antd';
import PageTitle from '@/components/common/PageTitle';
import StatusTag from '@/components/common/StatusTag';
import ErrorBox from '@/components/common/ErrorBox';
import RequestSearchBar from './RequestSearchBar';
import * as requestApi from '@/api/requestApi';
import { setRequests, setRequestFilter } from './actions';
import { selectFilteredRequests, selectRequestFilter } from './selectors';
import { PRIORITY_LABEL } from './constants';

function RequestListPage({ filteredRequests, filter, setRequests, setRequestFilter }) {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestApi.fetchRequests();
      setRequests(data); // store에 저장
    } catch (e) {
      setError('요청 목록을 불러오지 못했습니다. mock 서버(:4000)가 실행 중인지 확인하세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // 필터의 일부만 갱신 (기존 filter를 펼친 뒤 덮어쓰기 — 불변)
  const handleKeywordChange = keyword => setRequestFilter({ ...filter, keyword });
  const handleStatusChange = status => setRequestFilter({ ...filter, status });

  const handleDelete = record => {
    Modal.confirm({
      title: '요청 삭제',
      content: `"${record.title}" 요청을 삭제할까요?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          await requestApi.deleteRequest(record.id);
          message.success('삭제되었습니다.');
          loadRequests();
        } catch (e) {
          message.error('삭제에 실패했습니다.');
        }
      },
    });
  };

  const columns = [
    { title: '제목', dataIndex: 'title', key: 'title' },
    { title: '요청자', dataIndex: 'requester', key: 'requester' },
    { title: '부서', dataIndex: 'department', key: 'department' },
    {
      title: '우선순위',
      dataIndex: 'priority',
      key: 'priority',
      render: value => PRIORITY_LABEL[value] || value,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: value => <StatusTag status={value} />,
    },
    {
      title: '작업',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => history.push(`/requests/${record.id}`)}>상세</Button>
          <Button size="small" danger onClick={() => handleDelete(record)}>삭제</Button>
        </Space>
      ),
    },
  ];

  if (error) {
    return <ErrorBox message="불러오기 실패" description={error} onRetry={loadRequests} />;
  }

  return (
    <div>
      <div className="page-head">
        <PageTitle title="업무 요청 목록" subtitle="검색과 상태 필터로 요청을 좁혀 보세요." />
        <Button type="primary" onClick={() => history.push('/requests/new')}>신규 요청</Button>
      </div>

      {/* 필터 값은 store에서, 변경은 dispatch로 */}
      <RequestSearchBar
        keyword={filter.keyword}
        status={filter.status}
        onKeywordChange={handleKeywordChange}
        onStatusChange={handleStatusChange}
      />

      <Spin spinning={loading}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredRequests}
          pagination={{ pageSize: 5 }}
        />
      </Spin>
    </div>
  );
}

const mapStateToProps = state => ({
  filteredRequests: selectFilteredRequests(state),
  filter: selectRequestFilter(state),
});

const mapDispatchToProps = { setRequests, setRequestFilter };

export default connect(mapStateToProps, mapDispatchToProps)(RequestListPage);
```

> `RequestSearchBar`는 여전히 표시 전용이라 **수정하지 않습니다.** 값과 콜백의 출처만 지역 state에서 store로 바뀌었을 뿐입니다.

### Step 9. App.jsx — Provider와 PrivateRoute 연결

store를 `Provider`로 주입하고, Day 8에서 자리만 잡아 둔 레이아웃 경계를 `PrivateRoute`로 바꿉니다.

**`src/App.jsx`** (전체 교체)

```jsx
import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import configureStore from '@/store/configureStore';
import AppLayout from '@/components/layout/AppLayout';
import AppRouter from '@/routes/AppRouter';
import LoginPage from '@/features/auth/LoginPage';
import PrivateRoute from '@/routes/PrivateRoute';

const store = configureStore();

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Switch>
          {/* 로그인은 누구나 접근 */}
          <Route exact path="/login" component={LoginPage} />

          {/* 그 외는 로그인해야 접근 (Day 8의 경계가 PrivateRoute로) */}
          <PrivateRoute path="/">
            <AppLayout>
              <AppRouter />
            </AppLayout>
          </PrivateRoute>
        </Switch>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
```

### Step 10. 실행 확인

**두 터미널**(`npm run mock`, `npm start`)을 켜고 확인합니다.

- 로그인하지 않은 상태에서 `http://localhost:3000/dashboard` 접속 → **`/login`으로 리다이렉트**(PrivateRoute).
- 아이디 `admin`으로 로그인 → 대시보드로 이동, 헤더 우측에 **"관리자님"** + 로그아웃 버튼.
- **새로고침** → 로그인 유지(localStorage 복원). 대시보드가 그대로.
- 업무 요청 목록에서 검색어 입력 → **상세로 갔다가 목록으로 돌아와도 필터가 유지됨**(전역 상태의 효과).
- **로그아웃** → `/login`으로 이동. 이후 `/requests` 직접 접근 시 다시 로그인 화면.
- (DevTools 설치 시) Redux DevTools에서 `auth/LOGIN`, `requests/SET_REQUESTS`, `requests/SET_REQUEST_FILTER` action이 흐르는 것을 확인.

---

## 4. 개념 심화

### 4.1 무엇을 전역에 둘 것인가

모든 상태를 Redux에 넣지 않습니다. **여러 화면이 공유하거나, 화면을 넘나들며 유지돼야 하는 것**만 전역으로 둡니다(로그인 사용자, 요청 목록, 필터). 반면 **그 화면에서만 잠깐 쓰는 상태**(모달 열림, 이번 조회의 loading/error)는 지역 state로 두는 게 낫습니다. 오늘 loading/error를 아직 지역에 둔 이유가 이것이며, Day 10에서 "조회 자체가 전역 관심사"가 되면 Redux로 옮깁니다.

### 4.2 connect의 두 인자 다시 보기

- `mapStateToProps`가 **읽기**(store → props), `mapDispatchToProps`가 **쓰기**(action → dispatch)입니다.
- 둘 다 필요 없으면 `null`을 넘깁니다(`connect(null, mapDispatch)` — LoginPage처럼 dispatch만 필요할 때).
- `mapStateToProps`가 바뀐 값을 반환하면 컴포넌트가 다시 렌더됩니다. 그래서 **selector로 필요한 값만** 뽑는 것이 성능에 좋습니다.

### 4.3 순수 reducer + 부수 효과 분리

localStorage 저장을 reducer가 아니라 `store.subscribe`에서 했습니다. reducer를 순수하게 유지하면 테스트가 쉽고(입력→출력만 확인), DevTools의 시간여행 디버깅도 정확해집니다. "상태 계산"과 "바깥 세계에 쓰기"를 나누는 것이 Redux 설계의 핵심입니다.

---

## 5. 자주 나는 오류와 해결

### 5.1 `Could not find "store" in the context`

- **원인**: `Provider`로 감싸지 않았거나, `connect`된 컴포넌트가 `Provider` 밖에 있음.
- **해결**: 최상위를 `<Provider store={store}>`로 감쌈(Step 9).

### 5.2 dispatch했는데 화면이 안 바뀜

- **원인**: reducer에서 기존 state를 직접 수정했거나, 새 객체를 반환하지 않음.
- **해결**: `{ ...state, ... }`로 새 객체 반환. `default`에서 기존 state 반환 확인(1.4).

### 5.3 `mapDispatchToProps`의 함수를 불러도 dispatch가 안 됨

- **원인**: action creator를 그냥 호출만 하고 dispatch하지 않음(연결 누락).
- **해결**: 객체 축약형 `const mapDispatchToProps = { login }`으로 연결하면 `props.login(...)`이 자동 dispatch됨.

### 5.4 로그인 후 새로고침하면 로그아웃됨

- **원인**: localStorage 동기화/복원 누락.
- **해결**: `configureStore`의 `subscribe` 저장과 `reducer`의 `loadUser()` 복원 확인(Step 1, 3).

### 5.5 필터를 바꾸면 다른 필터 값이 사라짐

- **원인**: `setRequestFilter({ keyword })`처럼 일부만 담아 filter 전체를 덮어씀.
- **해결**: `setRequestFilter({ ...filter, keyword })`로 기존 값을 펼친 뒤 일부만 교체.

### 5.6 `state.requests is undefined`

- **원인**: `combineReducers`에 reducer를 안 넣었거나 key 불일치.
- **해결**: `rootReducer`에 `requests: requestReducer` 확인. selector의 `state.requests` 경로와 일치.

---

## 6. 체크포인트 (스스로 답해 보기)

### Q1. Redux의 단방향 데이터 흐름을 설명하라.

View에서 action을 dispatch → reducer가 `(state, action) → 새 state` 계산 → store가 새 state로 연결된 컴포넌트를 다시 렌더. state는 반드시 action→reducer를 거쳐야 바뀝니다.

### Q2. reducer가 지켜야 할 규칙은?

순수 함수여야 하고(부수 효과 없음), 기존 state를 직접 수정하지 않고 불변으로 새 state를 반환하며, 모르는 action에는 기존 state를 그대로 반환해야 합니다.

### Q3. `mapStateToProps`와 `mapDispatchToProps`의 역할은?

`mapStateToProps`는 store의 값을 컴포넌트 props로 매핑(읽기), `mapDispatchToProps`는 action creator를 dispatch하는 props 함수로 매핑(쓰기)합니다.

### Q4. 필터 상태를 Redux로 옮기니 무엇이 좋아졌나?

목록에서 상세로 갔다 돌아와도 필터가 유지됩니다. 여러 화면이 같은 상태를 공유하며, 컴포넌트가 언마운트돼도 값이 store에 남습니다.

### Q5. localStorage 저장을 reducer가 아니라 `store.subscribe`에서 한 이유는?

reducer를 순수하게 유지하기 위해서입니다. 부수 효과(바깥 세계에 쓰기)를 reducer에서 분리하면 테스트와 디버깅이 쉬워집니다.

---

## 7. Day 9 완료 체크리스트

- [ ] `redux`, `react-redux`를 설치했다.
- [ ] `auth`/`requests` Redux 모듈(actions/reducer/selectors)을 만들었다.
- [ ] `rootReducer`(combineReducers)와 `configureStore`를 만들고 `Provider`로 주입했다.
- [ ] `connect`로 `LoginPage`(dispatch)·`HeaderBar`(state+dispatch)·`RequestListPage`(state+dispatch)를 연결했다.
- [ ] 로그인 사용자·요청 목록·필터를 store에 저장한다.
- [ ] 새로고침해도 로그인이 유지된다(localStorage).
- [ ] `PrivateRoute`가 비로그인 접근을 `/login`으로 돌려보낸다.
- [ ] 상세로 갔다 와도 목록 필터가 유지된다.
- [ ] 6장 체크포인트 5문항에 스스로 답할 수 있다.

---

## 8. 다음 단계 (Day 10 예고)

Day 10에서는 **redux-thunk**를 도입해 비동기 로직을 Redux 안으로 옮깁니다. 지금은 `RequestListPage`가 직접 `requestApi.fetchRequests()`를 호출하고 loading/error를 지역 state로 들고 있지만, Day 10에서는 `dispatch(fetchRequests())` 한 줄로 끝냅니다. thunk 액션이 `FETCH_REQUESTS_START` → `SUCCESS` → `FAILURE`를 순서대로 dispatch하고, loading/error까지 **store에서** 관리합니다. 오늘 만든 `api/*.js` 계층을 thunk가 그대로 호출하며, 오늘의 동기 action 위에 "비동기 흐름"이 얹히는 단계입니다.
