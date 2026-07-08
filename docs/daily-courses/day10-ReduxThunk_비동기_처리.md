# Day 10 — redux-thunk 비동기 처리

> WorkFlow Admin Console 2주 코스의 열째 날입니다.  
> Day 9에서 컴포넌트에 남겨 두었던 **API 조회·loading·error를 Redux 안으로** 옮깁니다.  
> 이 문서 하나만 따라 하면 `redux-thunk`로 비동기 action을 만들고, `START → SUCCESS → FAILURE` 패턴으로 목록/상세/등록/삭제를 처리하며, loading/error까지 store에서 관리하는 것까지 완성합니다.

---

## 0. 이 문서를 마치면

- 비동기 API 호출을 **Redux action(thunk)** 으로 관리하는 방식을 이해합니다.
- `redux-thunk` 미들웨어를 store에 적용하고, dispatch에 **함수(thunk)** 를 보낼 수 있습니다.
- `FETCH_*_START` / `FETCH_*_SUCCESS` / `FETCH_*_FAILURE` 3-액션 패턴으로 조회 흐름을 표현합니다.
- loading/error 상태를 **컴포넌트가 아니라 store에서** 관리합니다.
- 목록 조회·상세 조회·등록·삭제·상태 변경(승인/반려) thunk를 만듭니다.

### 앞선 Day와의 연결

- **Day 6**: `useEffect` + 컴포넌트 지역 loading/error → 오늘 그 로직이 **thunk + reducer**로 이동합니다.
- **Day 9**: 동기 Redux(store/connect/selector) + `setRequests`로 목록만 저장 → 오늘 **비동기 thunk**로 조회 자체를 Redux가 담당합니다.
- **Day 9의 `api/*.js`·`connect`·selector 구조**를 그대로 재사용합니다. 바뀌는 건 "누가 API를 호출하고 loading/error를 들고 있느냐"입니다.

### Day 10에서 다루지 않는 것 (혼동 방지)

- **승인/반려 버튼 UI, 담당자 변경** → Day 13. 오늘은 상태 변경 **thunk(액션)까지만** 만들고, 화면 연결은 Day 13에서 합니다.
- **서버 사이드 페이징/정렬** → Day 12.
- **Redux Toolkit(createAsyncThunk)** → 이 코스는 classic Redux + thunk입니다(구형 프로젝트 적응 목표).

### 최종 산출물 폴더 구조 (Day 10 기준)

```txt
workflow-admin-console/
  src/
    store/
      configureStore.js       (thunk 미들웨어 적용)
    api/
      requestApi.js           (updateRequest 추가)
    features/
      requests/
        actions.js            (thunk 액션 추가로 교체)
        reducer.js            (loading/error/current 처리로 교체)
        selectors.js          (상태 selector 추가로 교체)
        RequestListPage.jsx   (thunk 사용으로 교체)
        RequestDetailPage.jsx (thunk 사용으로 교체)
        RequestCreatePage.jsx (thunk 사용으로 교체)
```

> `auth` 모듈은 그대로입니다. 오늘은 `requests` 도메인만 비동기화합니다.

---

## 1. 핵심 개념 먼저 이해하기

### 1.1 Day 9의 아쉬움 — 비동기가 컴포넌트에 흩어져 있다

Day 9에서 목록 조회는 이렇게 생겼습니다.

```jsx
// RequestListPage 안 (Day 9)
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const loadRequests = async () => {
  setLoading(true);
  try { setRequests(await requestApi.fetchRequests()); }
  catch { setError('...'); }
  finally { setLoading(false); }
};
```

문제는 이 로직이 **컴포넌트에 묶여** 있다는 점입니다. 같은 조회를 다른 화면에서도 하려면 복붙해야 하고, loading/error는 화면마다 따로 관리됩니다. "조회"는 사실 **앱 전체의 관심사**인데 특정 컴포넌트가 떠안고 있습니다.

### 1.2 thunk란 무엇인가

기본 Redux에서 `dispatch`에는 **action 객체**만 보낼 수 있습니다(`dispatch({ type: ... })`). 그런데 API 호출처럼 "시간이 걸리고, 도중에 여러 번 dispatch해야 하는" 일은 객체 하나로 표현할 수 없습니다.

**redux-thunk**는 미들웨어로, `dispatch`에 **함수**를 보낼 수 있게 해 줍니다. 이 함수(=thunk)는 실행될 때 `(dispatch, getState)`를 받아, 그 안에서 **비동기 작업을 하고 원하는 시점에 dispatch**할 수 있습니다.

```js
export function fetchRequests() {
  // 객체가 아니라 "함수"를 반환한다 → 이게 thunk
  return async function (dispatch, getState) {
    dispatch({ type: FETCH_REQUESTS_START });      // 시작 알림
    try {
      const data = await requestApi.fetchRequests(); // 비동기
      dispatch({ type: FETCH_REQUESTS_SUCCESS, payload: data }); // 성공
    } catch (error) {
      dispatch({ type: FETCH_REQUESTS_FAILURE, error: '...' });  // 실패
    }
  };
}
```

컴포넌트는 그냥 `dispatch(fetchRequests())` **한 줄**만 부르면 됩니다.

### 1.3 미들웨어와 applyMiddleware

미들웨어는 "dispatch된 action이 reducer에 도달하기 전에 가로채는 중간 단계"입니다. redux-thunk는 "action이 함수면 실행하고, 객체면 그대로 통과"시킵니다. store를 만들 때 `applyMiddleware(thunk)`로 끼웁니다.

```js
createStore(rootReducer, applyMiddleware(thunk));
```

### 1.4 request / success / failure 3-액션 패턴

비동기 조회는 세 순간이 있습니다(Day 6의 loading/error/success가 action이 된 것).

- **START**: 로딩 시작. reducer가 `loading=true`, `error=null`.
- **SUCCESS**: 데이터 도착. reducer가 `loading=false`, `data=payload`.
- **FAILURE**: 실패. reducer가 `loading=false`, `error=메시지`.

reducer가 이 세 action을 처리하면, **loading/error/data가 store에** 담깁니다. 컴포넌트는 selector로 읽기만 합니다.

### 1.5 컴포넌트는 dispatch 한 줄, 상태는 selector로

thunk를 쓰면 컴포넌트가 급격히 단순해집니다.

```jsx
useEffect(() => { fetchRequests(); }, [fetchRequests]); // dispatch(thunk)
// loading/error/데이터는 store에서 selector로 읽음
```

- **관심사 분리**: "어떻게 가져오는가"는 thunk가, "어떻게 보여주는가"는 컴포넌트가.
- **재사용**: 어느 컴포넌트든 `dispatch(fetchRequests())`로 같은 로직 사용.
- **일관성**: loading/error 규칙이 reducer 한 곳에.

### 1.6 thunk에서 다른 thunk 호출하기

thunk 안에서 `dispatch(다른thunk())`가 됩니다. 등록/삭제 후 "목록 새로고침"을 이렇게 처리합니다.

```js
export function deleteRequest(id) {
  return async function (dispatch) {
    await requestApi.deleteRequest(id);
    dispatch(fetchRequests()); // 삭제 후 최신 목록 재조회
  };
}
```

---

## 2. 설치

```bash
npm install redux-thunk
```

확인:

```bash
npm ls redux-thunk
```

---

## 3. 단계별 실습 (그대로 따라 하기)

### Step 1. store에 thunk 미들웨어 적용

Day 9의 `configureStore`에 미들웨어를 끼우고, DevTools와 함께 씁니다.

**`src/store/configureStore.js`** (전체 교체)

```js
import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import rootReducer from './rootReducer';

// DevTools가 있으면 그 compose를, 없으면 기본 compose를 사용
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default function configureStore() {
  const store = createStore(
    rootReducer,
    composeEnhancers(applyMiddleware(thunk)) // ← thunk 미들웨어 적용
  );

  // 로그인 사용자 localStorage 동기화 (Day 9)
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

### Step 2. requestApi에 상태 변경(PATCH) 추가

승인/반려·담당자 변경은 부분 수정이므로 `PATCH`를 씁니다(Day 13에서 사용). Day 6의 `requestApi.js`에 함수를 추가합니다.

**`src/api/requestApi.js`** — 아래 함수를 추가

```js
// 부분 수정 (상태 변경, 담당자 변경 등)
export function updateRequest(id, partial) {
  return client.patch(`/requests/${id}`, partial).then(res => res.data);
}
```

### Step 3. requests actions — thunk로 교체

Day 9의 `setRequests`를 없애고(이제 `FETCH_REQUESTS_SUCCESS`가 대신함), 조회/등록/삭제/상태변경 thunk를 추가합니다. 필터 동기 action(`setRequestFilter`)은 유지합니다.

**`src/features/requests/actions.js`** (전체 교체)

```js
import * as requestApi from '@/api/requestApi';

// ===== action types =====
export const SET_REQUEST_FILTER = 'requests/SET_REQUEST_FILTER';

export const FETCH_REQUESTS_START = 'requests/FETCH_REQUESTS_START';
export const FETCH_REQUESTS_SUCCESS = 'requests/FETCH_REQUESTS_SUCCESS';
export const FETCH_REQUESTS_FAILURE = 'requests/FETCH_REQUESTS_FAILURE';

export const FETCH_REQUEST_START = 'requests/FETCH_REQUEST_START';
export const FETCH_REQUEST_SUCCESS = 'requests/FETCH_REQUEST_SUCCESS';
export const FETCH_REQUEST_FAILURE = 'requests/FETCH_REQUEST_FAILURE';

// ===== 동기 action creator =====
export function setRequestFilter(filter) {
  return { type: SET_REQUEST_FILTER, payload: filter };
}

// ===== thunk: 목록 조회 =====
export function fetchRequests() {
  return async function (dispatch) {
    dispatch({ type: FETCH_REQUESTS_START });
    try {
      const data = await requestApi.fetchRequests();
      dispatch({ type: FETCH_REQUESTS_SUCCESS, payload: data });
    } catch (error) {
      dispatch({
        type: FETCH_REQUESTS_FAILURE,
        error: '요청 목록을 불러오지 못했습니다. mock 서버(:4000)를 확인하세요.',
      });
    }
  };
}

// ===== thunk: 상세 조회 =====
export function fetchRequest(id) {
  return async function (dispatch) {
    dispatch({ type: FETCH_REQUEST_START });
    try {
      const data = await requestApi.fetchRequest(id);
      dispatch({ type: FETCH_REQUEST_SUCCESS, payload: data });
    } catch (error) {
      dispatch({ type: FETCH_REQUEST_FAILURE, error: '상세 정보를 불러오지 못했습니다.' });
    }
  };
}

// ===== thunk: 등록 (성공 후 목록 갱신) =====
export function createRequest(payload) {
  return async function (dispatch) {
    await requestApi.createRequest(payload); // 실패하면 이 thunk의 promise가 reject됨
    dispatch(fetchRequests());
  };
}

// ===== thunk: 삭제 (성공 후 목록 갱신) =====
export function deleteRequest(id) {
  return async function (dispatch) {
    await requestApi.deleteRequest(id);
    dispatch(fetchRequests());
  };
}

// ===== thunk: 상태 변경 (승인/반려) — Day 13에서 화면에 연결 =====
export function changeRequestStatus(id, status, historyMessage) {
  return async function (dispatch, getState) {
    // 현재 상세의 history에 새 이력을 붙여 전체를 PATCH (json-server는 배열 append를 안 해줌)
    const current = getState().requests.current;
    const prevHistory = current && current.id === Number(id) ? current.history || [] : [];
    const history = [
      ...prevHistory,
      { message: historyMessage, createdAt: new Date().toISOString() },
    ];
    await requestApi.updateRequest(id, { status, history });
    dispatch(fetchRequest(id)); // 상세 갱신
    dispatch(fetchRequests());  // 목록 갱신
  };
}

export function approveRequest(id) {
  return changeRequestStatus(id, 'APPROVED', '승인되었습니다.');
}

export function rejectRequest(id) {
  return changeRequestStatus(id, 'REJECTED', '반려되었습니다.');
}
```

### Step 4. requests reducer — loading/error/current 처리

목록(`items`)·상세(`current`)와 각각의 loading/error를 store에 둡니다.

**`src/features/requests/reducer.js`** (전체 교체)

```js
import {
  SET_REQUEST_FILTER,
  FETCH_REQUESTS_START,
  FETCH_REQUESTS_SUCCESS,
  FETCH_REQUESTS_FAILURE,
  FETCH_REQUEST_START,
  FETCH_REQUEST_SUCCESS,
  FETCH_REQUEST_FAILURE,
} from './actions';

const initialState = {
  items: [],
  listLoading: false,
  listError: null,

  current: null,
  detailLoading: false,
  detailError: null,

  filter: { keyword: '', status: 'ALL' },
};

export default function requestReducer(state = initialState, action) {
  switch (action.type) {
    case SET_REQUEST_FILTER:
      return { ...state, filter: action.payload };

    // 목록 조회
    case FETCH_REQUESTS_START:
      return { ...state, listLoading: true, listError: null };
    case FETCH_REQUESTS_SUCCESS:
      return { ...state, listLoading: false, items: action.payload };
    case FETCH_REQUESTS_FAILURE:
      return { ...state, listLoading: false, listError: action.error };

    // 상세 조회
    case FETCH_REQUEST_START:
      return { ...state, detailLoading: true, detailError: null, current: null };
    case FETCH_REQUEST_SUCCESS:
      return { ...state, detailLoading: false, current: action.payload };
    case FETCH_REQUEST_FAILURE:
      return { ...state, detailLoading: false, detailError: action.error };

    default:
      return state;
  }
}
```

### Step 5. requests selectors — 상태 selector 추가

**`src/features/requests/selectors.js`** (전체 교체)

```js
export const selectRequestFilter = state => state.requests.filter;

export const selectListLoading = state => state.requests.listLoading;
export const selectListError = state => state.requests.listError;

export const selectCurrentRequest = state => state.requests.current;
export const selectDetailLoading = state => state.requests.detailLoading;
export const selectDetailError = state => state.requests.detailError;

// 파생 selector: 필터가 적용된 목록 (Day 9와 동일)
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

### Step 6. RequestListPage — thunk 사용으로 교체

지역 loading/error state와 `requestApi` 직접 호출을 걷어내고, thunk를 dispatch하고 store를 읽습니다. 컴포넌트가 눈에 띄게 짧아집니다.

**`src/features/requests/RequestListPage.jsx`** (전체 교체)

```jsx
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { connect } from 'react-redux';
import { Table, Button, Modal, Space, message, Spin } from 'antd';
import PageTitle from '@/components/common/PageTitle';
import StatusTag from '@/components/common/StatusTag';
import ErrorBox from '@/components/common/ErrorBox';
import RequestSearchBar from './RequestSearchBar';
import { fetchRequests, deleteRequest, setRequestFilter } from './actions';
import {
  selectFilteredRequests,
  selectRequestFilter,
  selectListLoading,
  selectListError,
} from './selectors';
import { PRIORITY_LABEL } from './constants';

function RequestListPage({
  filteredRequests,
  filter,
  loading,
  error,
  fetchRequests,
  deleteRequest,
  setRequestFilter,
}) {
  const history = useHistory();

  // 마운트 시 목록 조회 (thunk 한 줄)
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]); // connect가 준 dispatch 함수는 참조가 고정되어 1회만 실행

  const handleKeywordChange = keyword => setRequestFilter({ ...filter, keyword });
  const handleStatusChange = status => setRequestFilter({ ...filter, status });

  const handleDelete = record => {
    Modal.confirm({
      title: '요청 삭제',
      content: `"${record.title}" 요청을 삭제할까요?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () =>
        deleteRequest(record.id)
          .then(() => message.success('삭제되었습니다.'))
          .catch(() => message.error('삭제에 실패했습니다.')),
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
    return <ErrorBox message="불러오기 실패" description={error} onRetry={fetchRequests} />;
  }

  return (
    <div>
      <div className="page-head">
        <PageTitle title="업무 요청 목록" subtitle="검색과 상태 필터로 요청을 좁혀 보세요." />
        <Button type="primary" onClick={() => history.push('/requests/new')}>신규 요청</Button>
      </div>

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
  loading: selectListLoading(state),
  error: selectListError(state),
});

const mapDispatchToProps = { fetchRequests, deleteRequest, setRequestFilter };

export default connect(mapStateToProps, mapDispatchToProps)(RequestListPage);
```

> `useEffect(..., [fetchRequests])`가 무한 루프가 아닌 이유: `connect`의 `mapDispatchToProps`(객체 축약형)가 만들어 주는 dispatch 함수는 **렌더마다 참조가 바뀌지 않기** 때문에 effect가 1회만 실행됩니다.

### Step 7. RequestDetailPage — thunk 사용으로 교체

Day 8의 지역 조회 로직을 걷어내고 `fetchRequest` thunk와 store를 씁니다.

**`src/features/requests/RequestDetailPage.jsx`** (전체 교체)

```jsx
import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { Descriptions, Timeline, Button } from 'antd';
import PageTitle from '@/components/common/PageTitle';
import StatusTag from '@/components/common/StatusTag';
import LoadingBox from '@/components/common/LoadingBox';
import ErrorBox from '@/components/common/ErrorBox';
import { fetchRequest } from './actions';
import {
  selectCurrentRequest,
  selectDetailLoading,
  selectDetailError,
} from './selectors';
import { PRIORITY_LABEL } from './constants';

function RequestDetailPage({ current, loading, error, fetchRequest }) {
  const { id } = useParams();

  useEffect(() => {
    fetchRequest(id);
  }, [id, fetchRequest]); // URL의 id가 바뀌면 재조회

  if (loading) return <LoadingBox />;
  if (error) return <ErrorBox message={error} />;
  if (!current) return null;

  return (
    <div>
      <PageTitle title="요청 상세" subtitle={`#${current.id}`} />

      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="제목">{current.title}</Descriptions.Item>
        <Descriptions.Item label="요청자">{current.requester}</Descriptions.Item>
        <Descriptions.Item label="부서">{current.department}</Descriptions.Item>
        <Descriptions.Item label="우선순위">
          {PRIORITY_LABEL[current.priority] || current.priority}
        </Descriptions.Item>
        <Descriptions.Item label="상태"><StatusTag status={current.status} /></Descriptions.Item>
        <Descriptions.Item label="내용">{current.content}</Descriptions.Item>
      </Descriptions>

      <h4 style={{ margin: '16px 0 8px' }}>처리 이력</h4>
      <Timeline>
        {(current.history || []).map((h, index) => (
          <Timeline.Item key={index}>
            {h.message} <span style={{ color: '#999' }}>({h.createdAt})</span>
          </Timeline.Item>
        ))}
      </Timeline>

      <div style={{ marginTop: 16 }}>
        <Link to="/requests"><Button>목록으로</Button></Link>
      </div>
    </div>
  );
}

const mapStateToProps = state => ({
  current: selectCurrentRequest(state),
  loading: selectDetailLoading(state),
  error: selectDetailError(state),
});

const mapDispatchToProps = { fetchRequest };

export default connect(mapStateToProps, mapDispatchToProps)(RequestDetailPage);
```

### Step 8. RequestCreatePage — thunk 사용으로 교체

등록도 `createRequest` thunk로. 성공 후 thunk가 목록을 새로고침하고, 컴포넌트는 이동/메시지만 처리합니다.

**`src/features/requests/RequestCreatePage.jsx`** (전체 교체)

```jsx
import React from 'react';
import { useHistory } from 'react-router-dom';
import { connect } from 'react-redux';
import { message } from 'antd';
import PageTitle from '@/components/common/PageTitle';
import RequestForm from './RequestForm';
import { createRequest } from './actions';

function RequestCreatePage({ createRequest }) {
  const history = useHistory();

  const handleCreate = values => {
    const payload = {
      ...values,
      status: 'REQUESTED',
      createdAt: new Date().toISOString().slice(0, 10),
      history: [
        { message: '요청이 등록되었습니다.', createdAt: new Date().toISOString() },
      ],
    };

    createRequest(payload)
      .then(() => {
        message.success('업무 요청이 등록되었습니다.');
        history.push('/requests');
      })
      .catch(() => message.error('등록에 실패했습니다.'));
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <PageTitle title="신규 업무 요청" subtitle="필수 항목을 입력해 요청을 등록하세요." />
      <RequestForm
        onSubmit={handleCreate}
        onCancel={() => history.push('/requests')}
      />
    </div>
  );
}

const mapDispatchToProps = { createRequest };

export default connect(null, mapDispatchToProps)(RequestCreatePage);
```

### Step 9. 실행 확인

**두 터미널**(`npm run mock`, `npm start`)을 켜고 로그인 후 확인합니다.

- 업무 요청 목록 진입 → `FETCH_REQUESTS_START` → 스피너 → `FETCH_REQUESTS_SUCCESS` → 목록. (DevTools에서 action 흐름 확인)
- 상세 진입 → `FETCH_REQUEST_START/SUCCESS` → 상세 + 처리 이력.
- 등록 → `createRequest` thunk → 성공 후 목록 자동 갱신 + 이동.
- 삭제 → `deleteRequest` thunk → 목록 자동 갱신.
- **에러 확인**: mock 서버를 끄고 목록 새로고침 → `FETCH_REQUESTS_FAILURE` → ErrorBox + 다시 시도. 서버를 켜고 다시 시도하면 복구.
- loading/error가 이제 **컴포넌트가 아니라 store**에 있는 것을 DevTools state 트리에서 확인(`requests.listLoading` 등).

> **참고**: 승인/반려 thunk(`approveRequest`/`rejectRequest`)는 만들어 뒀지만, 버튼은 아직 없습니다. Day 13에서 상세 화면에 연결합니다.

---

## 4. 개념 심화

### 4.1 왜 loading/error를 store로 올렸나

Day 6~9에서는 화면마다 loading/error를 따로 들었습니다. 이제 조회 로직과 그 상태가 **reducer 한 곳**에 있어, 어떤 화면이 목록을 그리든 같은 `listLoading`/`listError`를 씁니다. 규칙이 하나가 되면 버그가 줄고, 새 화면을 붙이기도 쉽습니다.

### 4.2 thunk는 "언제/무엇을 dispatch할지 결정하는 함수"

thunk의 본질은 비동기가 아니라 **"dispatch를 지연·조건·반복할 수 있는 함수"** 입니다. 그래서 `getState()`로 현재 상태를 보고 dispatch를 건너뛰거나, 여러 action을 순서대로 dispatch하거나(`START`→`SUCCESS`), 다른 thunk를 부를 수 있습니다(등록 후 목록 새로고침). 비동기는 그중 가장 흔한 활용일 뿐입니다.

### 4.3 등록/삭제는 왜 자체 loading을 안 만들었나

목록·상세 조회는 화면 전체가 그 결과에 의존하므로 loading/error를 store에 뒀습니다. 반면 등록/삭제는 "한 번의 동작 + 결과 메시지"라 컴포넌트에서 `then/catch`로 처리하고, 성공 시 `fetchRequests()`로 목록을 새로 받는 것으로 충분합니다. **모든 것을 Redux에 넣을 필요는 없습니다**(Day 9의 원칙과 동일).

### 4.4 상세 조회의 경쟁 상태는?

Day 6에서는 `ignore` 플래그로 막았지만, 지금은 상세가 store의 단일 `current`라 마지막에 도착한 `SUCCESS`가 반영됩니다. 목록 → 상세처럼 빠른 연속 조회가 드문 이 화면에서는 실무상 문제되지 않습니다. 매우 엄밀히 하려면 thunk에 요청 식별자를 실어 최신 요청만 반영하는 기법이 있으나, 이 코스 범위 밖입니다.

---

## 5. 자주 나는 오류와 해결

### 5.1 `Actions must be plain objects. Use custom middleware for async actions.`

- **원인**: `dispatch(fetchRequests())`인데 thunk 미들웨어가 적용 안 됨(함수 dispatch 불가).
- **해결**: `configureStore`에 `applyMiddleware(thunk)` 확인(Step 1). `redux-thunk` 설치 확인.

### 5.2 목록이 안 뜨고 로딩만 계속됨

- **원인**: `FETCH_REQUESTS_SUCCESS`를 reducer가 처리하지 않거나, `payload` 키 불일치.
- **해결**: reducer의 case와 action의 `payload` 이름 대조(Step 3, 4).

### 5.3 `useEffect`가 매 렌더마다 조회를 반복

- **원인**: 의존성에 매번 새로 만들어지는 함수/객체를 넣음.
- **해결**: `connect`의 `mapDispatchToProps` 객체 축약형이 주는 안정적 함수를 의존성에 사용(Step 6 주석).

### 5.4 등록/삭제 후 목록이 안 바뀜

- **원인**: thunk에서 성공 후 `dispatch(fetchRequests())`를 빠뜨림.
- **해결**: `createRequest`/`deleteRequest` thunk 끝에 `dispatch(fetchRequests())` 확인(Step 3).

### 5.5 상태 변경 시 처리 이력이 사라짐

- **원인**: `PATCH`로 `history`를 안 보내거나 빈 배열을 보냄(json-server는 배열 append를 안 해줌).
- **해결**: 기존 `history`에 새 항목을 붙인 **전체 배열**을 PATCH(`changeRequestStatus`의 방식).

### 5.6 `getState()`가 필요한데 thunk 두 번째 인자를 안 받음

- **원인**: `return async function (dispatch) {...}`처럼 `getState`를 매개변수에 안 넣음.
- **해결**: `return async function (dispatch, getState) {...}`.

---

## 6. 체크포인트 (스스로 답해 보기)

### Q1. thunk란 무엇이며 왜 필요한가?

기본 dispatch에는 action 객체만 보낼 수 있어 비동기·다단계 dispatch를 표현할 수 없습니다. redux-thunk는 dispatch에 함수를 보낼 수 있게 해, 그 함수 안에서 비동기 작업 후 원하는 시점에 여러 action을 dispatch하게 해 줍니다.

### Q2. `FETCH_*_START/SUCCESS/FAILURE` 패턴이 관리하는 것은?

조회의 세 순간을 action으로 나눠, reducer가 loading(START)·데이터(SUCCESS)·error(FAILURE)를 store에 담게 합니다. 컴포넌트는 이를 selector로 읽습니다.

### Q3. 미들웨어(redux-thunk)는 store에 어떻게 적용하나?

`createStore(rootReducer, applyMiddleware(thunk))`로 끼웁니다. 미들웨어는 dispatch된 것이 reducer에 닿기 전에 가로채, thunk(함수)면 실행하고 객체면 통과시킵니다.

### Q4. thunk를 도입하니 컴포넌트가 어떻게 달라졌나?

지역 loading/error state와 직접 API 호출이 사라지고, `dispatch(thunk())` 한 줄 + selector 읽기로 단순해졌습니다. 조회 로직과 상태가 Redux에 모여 재사용·일관성이 좋아졌습니다.

### Q5. 등록/삭제 thunk가 성공 후 하는 일은?

`dispatch(fetchRequests())`로 최신 목록을 다시 조회해 화면을 서버와 동기화합니다(Day 6의 "재조회" 방식이 thunk 안으로 이동).

---

## 7. Day 10 완료 체크리스트

- [ ] `redux-thunk`를 설치하고 `configureStore`에 `applyMiddleware(thunk)`를 적용했다.
- [ ] `requestApi`에 `updateRequest`(PATCH)를 추가했다.
- [ ] `fetchRequests`/`fetchRequest`/`createRequest`/`deleteRequest`/`changeRequestStatus` thunk를 만들었다.
- [ ] reducer가 목록·상세의 loading/error/data를 관리한다.
- [ ] `RequestListPage`/`RequestDetailPage`/`RequestCreatePage`가 thunk를 dispatch하고 store를 selector로 읽는다.
- [ ] 컴포넌트에서 지역 loading/error state와 직접 API 호출이 사라졌다.
- [ ] 에러 시 store 기반 ErrorBox가 뜨고, 다시 시도로 복구된다.
- [ ] (준비) 승인/반려 thunk를 만들어 Day 13 연결을 대비했다.
- [ ] 6장 체크포인트 5문항에 스스로 답할 수 있다.

---

## 8. 다음 단계 (Day 11 예고)

Day 11에서는 **feature 기반 구조로 리팩터링**합니다. 지금까지 만든 파일들을 도메인(`features/auth`, `features/requests`, `features/dashboard`)과 공통 영역(`components/common`, `components/layout`, `api`, `store`, `routes`)으로 정돈하며, "어디에 무엇이 있어야 하는지"의 감각을 잡습니다. 대부분 이미 그 구조를 따르고 있으니, Day 11은 남은 정리(배럴 export, import 경로 점검, 모듈 경계 확인)와 함께 **대규모 프로젝트 구조를 읽는 눈**을 기르는 데 집중합니다. 오늘 완성한 Redux 모듈(`actions`/`reducer`/`selectors`)이 그 구조의 핵심 단위가 됩니다.
