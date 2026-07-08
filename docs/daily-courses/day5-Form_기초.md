# Day 5 — Form 기초

> WorkFlow Admin Console 2주 코스의 다섯째 날입니다.  
> Day 4에서 만든 요청 목록에 **신규 업무 요청 등록 폼**을 붙입니다.  
> 이 문서 하나만 따라 하면 antd v4 `Form`으로 제목·요청자·부서·우선순위·내용을 입력받아 **검증(validation)** 하고, 등록하면 목록에 즉시 반영되는 화면을 완성합니다.

---

## 0. 이 문서를 마치면

- 입력 폼을 처리하는 두 방식(직접 `useState` 제어 vs antd `Form`)의 차이를 이해합니다.
- antd v4 `Form`의 기본 패턴(`Form.useForm()`, `Form.Item name`, `onFinish`)을 사용할 수 있습니다.
- `rules`로 필수 입력·최소 길이 등 검증을 걸고, 실패 시 에러 메시지를 표시할 수 있습니다.
- 폼 제출(submit) 흐름 — 검증 통과 시에만 `onFinish`가 값(`values`)을 넘겨주는 흐름 — 을 이해합니다.
- 등록한 요청을 **불변 방식으로 목록에 추가**(Day 3)하고, `Modal`(Day 4) 안에서 폼을 다룹니다.
- antd v3와 v4의 Form API 차이를 눈으로 비교해, "버전 확인이 왜 중요한지"를 코드로 체감합니다.

### 앞선 Day와의 연결

- **Day 3**: 제어 컴포넌트(`value` + `onChange`), 불변 배열 추가(`[...]`) — 오늘 폼과 등록 처리의 토대.
- **Day 4**: `Modal`(제어형), antd `Input`/`Select`, `message` 등 — 오늘 폼을 담는 그릇과 부품.
- 오늘 만드는 `RequestForm`은 재사용 컴포넌트라, **Day 8**에서 라우팅이 생기면 `/requests/new` 전용 페이지로도 그대로 옮겨 씁니다.

### Day 5에서 다루지 않는 것 (혼동 방지)

- **API로 서버에 저장** → Day 6. 오늘은 등록값을 **화면의 목록 state에만** 반영합니다.
- **Redux 전역 상태** → Day 9. 오늘 목록 state는 여전히 `RequestListPage`의 지역 상태입니다.
- **수정(편집) 폼 / 상세 라우트** → Day 13. 오늘은 "신규 등록"만 다룹니다.

### 최종 산출물 폴더 구조 (Day 5 기준)

```txt
workflow-admin-console/
  src/
    features/
      requests/
        RequestForm.jsx        (신규 - antd v4 Form)
        RequestListPage.jsx     (신규 요청 버튼 + 등록 Modal 추가)
        RequestSearchBar.jsx    (변경 없음)
    styles/
      global.css                (page-head 스타일 추가)
```

---

## 1. 핵심 개념 먼저 이해하기

### 1.1 폼이 커지면 제어 컴포넌트만으로는 벅차다

Day 3에서 배운 제어 컴포넌트를 떠올려 봅시다. 입력값 하나를 다루려면 state 하나와 onChange 하나가 필요했습니다.

```jsx
const [title, setTitle] = useState('');
<input value={title} onChange={e => setTitle(e.target.value)} />
```

그런데 폼에 필드가 5개(제목·요청자·부서·우선순위·내용)면 어떻게 될까요?

- `useState` 5개
- `onChange` 5개
- 각 필드의 **검증 상태**(에러 메시지, 통과 여부) 관리
- 제출 시 전체 검증, 실패 필드 표시, 초기화…

이 모든 것을 손으로 짜면 보일러플레이트가 폭발합니다. **antd `Form`은 바로 이 반복을 대신 처리**해 줍니다.

### 1.2 antd v4 Form의 기본 구조

antd v4 `Form`은 "필드 값과 검증을 Form이 알아서 관리"합니다. 우리는 **어떤 필드가 있고, 어떤 규칙인지**만 선언합니다.

```jsx
import { Form, Input, Button } from 'antd';

function Demo() {
  const [form] = Form.useForm();          // ① 폼 인스턴스 생성

  const handleFinish = values => {         // ④ 검증 통과 시 값 수신
    console.log(values);                   //    { title: '...', ... }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleFinish}> {/* ② */}
      <Form.Item
        name="title"                        // ③ 이 필드 값의 key
        label="제목"
        rules={[{ required: true, message: '제목을 입력하세요.' }]}
      >
        <Input />                            {/* Form이 value/onChange를 자동 주입 */}
      </Form.Item>

      <Button type="primary" htmlType="submit">등록</Button>
    </Form>
  );
}
```

핵심 4가지:

1. **`Form.useForm()`** — 폼을 제어하는 인스턴스(`form`)를 만듭니다. 초기화·값 읽기/쓰기 등에 사용.
2. **`<Form form={form} onFinish={...}>`** — 폼 컨테이너. `form`을 연결하고, 제출 시 실행할 함수를 `onFinish`에 지정.
3. **`<Form.Item name="title" rules={[...]}>`** — 필드 하나. `name`이 값의 key가 되고, `rules`로 검증합니다. **자식 입력 요소(`<Input/>` 등)에는 `value`/`onChange`를 직접 주지 않습니다** — Form이 자동으로 연결(제어)합니다.
4. **`onFinish(values)`** — 모든 규칙을 통과하면, 필드 값을 모은 객체 `values`를 넘겨 호출됩니다.

> 즉 Day 4에서는 `Select`에 직접 `value`/`onChange`를 줬지만, **`Form.Item` 안에 넣으면 그럴 필요가 없습니다.** Form이 대신 제어합니다. (밖에서 또 제어하면 충돌합니다 — 5장 참고.)

### 1.3 validation rules

`Form.Item`의 `rules` 배열에 검증 규칙을 나열합니다. 자주 쓰는 규칙:

- `{ required: true, message: '...' }` — 필수 입력
- `{ min: 10, message: '...' }` / `{ max: 200, message: '...' }` — 문자열 최소/최대 길이
- `{ type: 'email', message: '...' }` — 형식(email, url, number 등)
- `{ pattern: /^[0-9]+$/, message: '...' }` — 정규식
- **커스텀 검증**:
  ```jsx
  rules={[
    {
      validator: (_, value) =>
        value && value.includes('금지어')
          ? Promise.reject(new Error('금지어를 포함할 수 없습니다.'))
          : Promise.resolve(),
    },
  ]}
  ```

여러 규칙을 함께 걸 수 있고, 위에서부터 순서대로 평가됩니다.

```jsx
rules={[
  { required: true, message: '내용을 입력하세요.' },
  { min: 10, message: '내용은 10자 이상 입력하세요.' },
]}
```

### 1.4 제출(submit) 흐름 — onFinish vs onFinishFailed

`htmlType="submit"` 버튼을 누르면(또는 폼 안에서 Enter):

1. Form이 **모든 `Form.Item`의 `rules`를 검증**합니다.
2. **전부 통과** → `onFinish(values)` 호출. `values`는 각 `Form.Item`의 `name`을 key로 모은 객체.
3. **하나라도 실패** → 실패한 필드 아래 **빨간 에러 메시지**가 뜨고, `onFinishFailed`가 호출됩니다(지정했다면).

즉 우리는 "검증이 끝난 깨끗한 값"만 `onFinish`에서 받습니다. 검증 로직을 직접 짤 필요가 없습니다.

### 1.5 form 인스턴스로 폼 조작하기

`Form.useForm()`으로 받은 `form`으로 폼을 코드에서 제어합니다.

- `form.resetFields()` — 모든 필드를 초기값으로 되돌림(등록 후 비우기).
- `form.setFieldsValue({ title: '...' })` — 특정 필드 값 설정(수정 폼에서 기존 값 채우기 — Day 13).
- `form.getFieldsValue()` — 현재 값 읽기.
- `form.validateFields()` — 수동 검증(버튼이 Form 밖에 있을 때 등).
- **`initialValues`** — `<Form initialValues={{ priority: 'MEDIUM' }}>`로 초기값 지정.

### 1.6 v3 vs v4 — 구형 코드를 읽기 위해

이 코스는 **v4로 작성**하지만, 실제 오래된 프로젝트에는 v3 폼이 남아 있을 수 있습니다. 읽을 수 있어야 하므로 차이를 봅니다.

**antd v4 (우리가 쓰는 방식)**

```jsx
<Form onFinish={handleSubmit} layout="vertical">
  <Form.Item name="title" label="제목"
    rules={[{ required: true, message: '제목을 입력하세요.' }]}>
    <Input />
  </Form.Item>
</Form>
```

**antd v3 (읽기용 — 작성하지 말 것)**

```jsx
const RequestForm = ({ form }) => {
  const { getFieldDecorator } = form;
  return (
    <Form>
      <Form.Item label="제목">
        {getFieldDecorator('title', {
          rules: [{ required: true, message: '제목을 입력하세요.' }],
        })(<Input />)}
      </Form.Item>
    </Form>
  );
};
export default Form.create()(RequestForm); // HOC로 폼 주입
```

차이 요약:
- **v3**: `Form.create()` HOC로 감싸고, `getFieldDecorator('name', { rules })(<Input/>)`로 필드를 "장식"합니다. 값은 `props.form`으로 접근.
- **v4**: `Form.useForm()` 훅 + `<Form.Item name rules>` + `onFinish`. HOC/데코레이터가 사라져 훨씬 직관적입니다.

> 만약 프로젝트가 v3인데 v4 문서만 보고 `name`/`onFinish`를 쓰면 아무것도 동작하지 않습니다. **버전 확인이 먼저**입니다(Day 4에서 강조한 그대로).

---

## 2. 사전 준비

Day 4까지 완료되어 있어야 합니다(antd v4 설치, 레이아웃, Table, 상세 Modal 동작). 개발 서버를 켜 둡니다.

```bash
npm start
```

antd·`@ant-design/icons`는 Day 4에서 이미 설치했으므로 추가 설치는 없습니다.

---

## 3. 단계별 실습 (그대로 따라 하기)

### Step 1. RequestForm 만들기 (antd v4 Form)

신규 요청을 입력받는 재사용 폼입니다. 검증을 통과한 값만 부모에게 `onSubmit(values)`로 넘깁니다. 폼 자체는 목록을 모르며, "값을 모아 넘기는 일"만 합니다(관심사 분리).

**`src/features/requests/RequestForm.jsx`** (신규)

```jsx
import React from 'react';
import { Form, Input, Select, Button } from 'antd';

const { TextArea } = Input;

// 우선순위: 값은 영문 상수, 화면 라벨은 한글
const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
];

function RequestForm({ onSubmit, onCancel }) {
  const [form] = Form.useForm();

  // 검증을 통과하면 호출됨. values에는 각 Form.Item의 name 값이 담긴다.
  const handleFinish = values => {
    onSubmit(values);      // 부모(RequestListPage)가 목록에 반영
    form.resetFields();    // 폼 비우기
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ priority: 'MEDIUM' }}  // 우선순위 기본값
      onFinish={handleFinish}
    >
      <Form.Item
        name="title"
        label="제목"
        rules={[{ required: true, message: '제목을 입력하세요.' }]}
      >
        <Input placeholder="예) 계정 권한 신청" />
      </Form.Item>

      <Form.Item
        name="requester"
        label="요청자"
        rules={[{ required: true, message: '요청자를 입력하세요.' }]}
      >
        <Input placeholder="예) 홍길동" />
      </Form.Item>

      <Form.Item
        name="department"
        label="부서"
        rules={[{ required: true, message: '부서를 입력하세요.' }]}
      >
        <Input placeholder="예) 개발팀" />
      </Form.Item>

      <Form.Item name="priority" label="우선순위">
        {/* Form.Item 안이므로 Select에 value/onChange를 직접 주지 않는다 */}
        <Select options={PRIORITY_OPTIONS} />
      </Form.Item>

      <Form.Item
        name="content"
        label="내용"
        rules={[
          { required: true, message: '내용을 입력하세요.' },
          { min: 10, message: '내용은 10자 이상 입력하세요.' },
        ]}
      >
        <TextArea rows={4} placeholder="요청 상세 내용을 입력하세요." />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
        <Button onClick={onCancel} style={{ marginRight: 8 }}>취소</Button>
        <Button type="primary" htmlType="submit">등록</Button>
      </Form.Item>
    </Form>
  );
}

export default RequestForm;
```

핵심 포인트:
- `Form.Item` 안의 `Input`/`Select`/`TextArea`에는 `value`/`onChange`를 **주지 않습니다.** Form이 `name`을 근거로 자동 제어합니다.
- `initialValues={{ priority: 'MEDIUM' }}` — 열자마자 우선순위가 "보통"으로 채워집니다.
- `htmlType="submit"` 버튼이 폼 **안**에 있어야 제출이 걸립니다.
- 검증 실패 시 `onFinish`는 호출되지 않고, 각 필드 아래 메시지가 자동 표시됩니다.

### Step 2. RequestListPage에 "신규 요청" 버튼과 등록 Modal 추가

Day 4의 `RequestListPage`를 확장합니다. 우선순위 컬럼/데이터를 추가하고, "신규 요청" 버튼으로 폼 Modal을 엽니다. 등록은 Day 3의 불변 추가로 처리합니다.

**`src/features/requests/RequestListPage.jsx`** (전체 교체)

```jsx
import React, { useState } from 'react';
import { Table, Button, Modal, Space, Descriptions, message } from 'antd';
import PageTitle from '@/components/common/PageTitle';
import StatusTag from '@/components/common/StatusTag';
import RequestSearchBar from './RequestSearchBar';
import RequestForm from './RequestForm';

// 우선순위 값 → 한글 라벨
const PRIORITY_LABEL = { HIGH: '높음', MEDIUM: '보통', LOW: '낮음' };

const INITIAL_REQUESTS = [
  { id: 1, title: '계정 권한 신청', requester: '홍길동', department: '개발팀', priority: 'HIGH', status: 'REQUESTED', content: '운영 시스템 접근 권한이 필요합니다.' },
  { id: 2, title: '장비 교체 요청', requester: '김철수', department: '인프라팀', priority: 'MEDIUM', status: 'IN_PROGRESS', content: '노트북 배터리 불량으로 교체가 필요합니다.' },
  { id: 3, title: '휴가 시스템 오류 접수', requester: '이영희', department: '인사팀', priority: 'HIGH', status: 'DONE', content: '휴가 신청 화면이 로딩되지 않습니다.' },
  { id: 4, title: 'VPN 접속 계정 요청', requester: '박민수', department: '영업팀', priority: 'LOW', status: 'REQUESTED', content: '재택근무용 VPN 계정을 신청합니다.' },
  { id: 5, title: '사내 메신저 권한 요청', requester: '최지은', department: '디자인팀', priority: 'MEDIUM', status: 'REJECTED', content: '외부 협력사 채널 접근 권한 요청.' },
];

function RequestListPage() {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState(null);     // 상세 모달 대상
  const [createOpen, setCreateOpen] = useState(false); // 등록 모달 열림 여부

  const filtered = requests.filter(req => {
    const matchKeyword = req.title.includes(keyword.trim());
    const matchStatus = status === 'ALL' || req.status === status;
    return matchKeyword && matchStatus;
  });

  const handleDelete = record => {
    Modal.confirm({
      title: '요청 삭제',
      content: `"${record.title}" 요청을 삭제할까요?`,
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: () => setRequests(prev => prev.filter(r => r.id !== record.id)),
    });
  };

  // 신규 등록: Form이 검증을 통과시킨 values를 받아 새 요청으로 추가
  const handleCreate = values => {
    const nextId = Math.max(0, ...requests.map(r => r.id)) + 1;
    const newReq = {
      id: nextId,
      status: 'REQUESTED', // 신규는 항상 '요청됨'으로 시작
      ...values,           // title, requester, department, priority, content
    };
    setRequests(prev => [newReq, ...prev]); // 불변 추가 (Day 3)
    setCreateOpen(false);
    message.success('업무 요청이 등록되었습니다.');
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
          <Button size="small" onClick={() => setSelected(record)}>상세</Button>
          <Button size="small" danger onClick={() => handleDelete(record)}>삭제</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-head">
        <PageTitle title="업무 요청 목록" subtitle="검색과 상태 필터로 요청을 좁혀 보세요." />
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          신규 요청
        </Button>
      </div>

      <RequestSearchBar
        keyword={keyword}
        status={status}
        onKeywordChange={setKeyword}
        onStatusChange={setStatus}
      />

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        pagination={{ pageSize: 5 }}
      />

      {/* 상세 보기 (Day 4) */}
      <Modal
        title="요청 상세"
        visible={!!selected}
        onCancel={() => setSelected(null)}
        footer={<Button onClick={() => setSelected(null)}>닫기</Button>}
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="제목">{selected.title}</Descriptions.Item>
            <Descriptions.Item label="요청자">{selected.requester}</Descriptions.Item>
            <Descriptions.Item label="부서">{selected.department}</Descriptions.Item>
            <Descriptions.Item label="우선순위">
              {PRIORITY_LABEL[selected.priority] || selected.priority}
            </Descriptions.Item>
            <Descriptions.Item label="상태"><StatusTag status={selected.status} /></Descriptions.Item>
            <Descriptions.Item label="내용">{selected.content}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* 신규 등록 폼 (Day 5) */}
      <Modal
        title="신규 업무 요청"
        visible={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}        // 버튼은 RequestForm 안에 있으므로 Modal 기본 푸터 제거
        destroyOnClose        // 닫을 때 폼을 언마운트해 다음에 깨끗한 상태로 열림
      >
        <RequestForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </div>
  );
}

export default RequestListPage;
```

핵심 포인트:
- **`footer={null}`** — Modal 기본 확인/취소 버튼을 없앱니다. 등록/취소 버튼은 `RequestForm` 안에 있기 때문입니다.
- **`destroyOnClose`** — 모달을 닫으면 폼이 언마운트됩니다. 다시 열면 초기값으로 새로 시작해, 이전 입력이 남지 않습니다.
- `handleCreate`는 검증이 끝난 `values`를 받아 `id`·`status`만 얹어 **불변 추가**합니다. 폼은 목록을 모르고, 목록 페이지는 검증을 모릅니다 — 책임이 깔끔하게 나뉩니다.
- `message.success(...)` — 등록 완료 피드백(Day 4의 antd `message`).

### Step 3. 스타일 추가

`src/styles/global.css`에 제목과 버튼을 한 줄에 배치하는 스타일을 추가합니다.

```css
/* 페이지 상단: 타이틀 + 우측 액션 버튼 */
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
```

### Step 4. 실행 확인

개발 서버가 켜져 있으면 저장 즉시 반영됩니다. 사이드바에서 **업무 요청** 화면으로 이동한 뒤 확인하세요.

- 우측 상단 **신규 요청** 버튼 클릭 → 등록 폼 Modal 오픈(우선순위는 "보통"으로 채워져 있음)
- **빈 채로 등록** 클릭 → 필수 필드마다 빨간 에러 메시지, `onFinish`는 호출되지 않음
- **내용에 5자만 입력** → "10자 이상" 메시지 표시(다중 규칙 동작 확인)
- 모든 필드를 올바로 채우고 **등록** → Modal이 닫히고, 목록 **맨 위**에 새 요청이 "요청됨" 상태로 추가됨 + 성공 메시지
- 새로 등록한 항목의 **상세**를 열어 입력값(우선순위 한글 라벨 포함)이 그대로 보이는지 확인
- 다시 **신규 요청**을 열면 이전 입력이 남지 않고 깨끗함(`destroyOnClose`)

---

## 4. 개념 심화

### 4.1 왜 폼과 목록의 책임을 나눴나

`RequestForm`은 "값을 모아 검증해 넘기는 일"만, `RequestListPage`는 "넘어온 값을 목록에 반영하는 일"만 합니다. 이렇게 나누면:
- 폼을 **다른 화면에서 재사용**하기 쉽습니다(Day 8의 `/requests/new` 라우트, Day 13의 수정 폼).
- 각 컴포넌트가 한 가지 이유로만 바뀝니다(단일 책임). 예컨대 검증 규칙이 바뀌어도 목록 코드는 그대로입니다.

### 4.2 antd Form은 "제어를 대신 해주는" 것

Day 3에서 손으로 하던 `value`/`onChange`/에러 상태 관리를, Form이 `name` 하나로 대신합니다. 즉 antd Form은 Day 3 제어 컴포넌트의 **상위 추상화**일 뿐, 마법이 아닙니다. 그래서 `Form.Item` 밖에서 또 제어하려 들면(직접 `value` 주입) 충돌합니다.

### 4.3 지금은 목록 state에만, 곧 서버로

오늘 등록값은 브라우저 메모리의 목록 state에만 들어가므로 **새로고침하면 사라집니다**. Day 6에서 axios로 `POST` 요청을 보내 json-server에 저장하고, 목록을 서버에서 다시 불러오도록 바꿉니다. 오늘의 `handleCreate`가 그 자리에 API 호출을 끼워 넣는 지점이 됩니다.

---

## 5. 자주 나는 오류와 해결

### 5.1 등록 버튼을 눌러도 `onFinish`가 안 불림

- **원인**: 버튼에 `htmlType="submit"`이 없거나, 버튼이 `<Form>` **밖**에 있음.
- **해결**: 제출 버튼은 `<Form>` 안에 두고 `htmlType="submit"` 지정. (밖에 둬야 하면 `form.validateFields()`로 수동 제출.)

### 5.2 `values`에 특정 필드가 안 들어옴

- **원인**: 그 `Form.Item`에 `name`이 없음. `name`이 있어야 Form이 값을 수집합니다.
- **해결**: 값이 필요한 모든 필드에 `name` 지정.

### 5.3 콘솔에 "제어/비제어 전환" 경고 또는 입력이 이상함

- **원인**: `Form.Item` 안의 입력 요소에 `value`/`onChange`를 직접 줌(Form의 자동 제어와 충돌).
- **해결**: `Form.Item` 안에서는 `<Input/>`만 두고 제어는 Form에 맡김. 초기값은 `initialValues`로.

### 5.4 등록 후에도 폼에 이전 값이 남아 있음

- **원인**: 폼을 초기화하지 않음.
- **해결**: 제출 성공 시 `form.resetFields()` 호출, 그리고/또는 Modal에 `destroyOnClose` 지정.

### 5.5 우선순위 초기값이 안 채워짐

- **원인**: `initialValues`를 안 줬거나, 마운트 이후에 값을 바꾸려 함.
- **해결**: `<Form initialValues={{ priority: 'MEDIUM' }}>`. 이미 렌더된 뒤 바꾸려면 `form.setFieldsValue(...)`.

### 5.6 v3 프로젝트에서 v4 문법이 안 먹힘

- **원인**: 버전 불일치. v3는 `getFieldDecorator`/`Form.create()` 방식.
- **해결**: `package.json`으로 버전 확인 후 그 버전 문법 사용(1.6).

---

## 6. 체크포인트 (스스로 답해 보기)

### Q1. antd `Form`이 필드마다 `useState`를 두지 않아도 되는 이유는?

Form이 각 `Form.Item`의 `name`을 근거로 값과 검증 상태를 내부적으로 관리하기 때문입니다. 우리는 필드와 규칙만 선언하면 됩니다.

### Q2. `onFinish`는 언제 호출되며 무엇을 받는가?

제출 시 모든 `rules` 검증을 통과했을 때만 호출되며, 각 `Form.Item`의 `name`을 key로 모은 값 객체(`values`)를 받습니다. 하나라도 실패하면 호출되지 않고 에러 메시지가 표시됩니다.

### Q3. `Form.Item`의 `name`은 무슨 역할인가?

그 필드를 식별하는 key입니다. Form이 이 이름으로 값을 수집·검증하고, `values`/`initialValues`/`setFieldsValue`에서도 이 key를 씁니다. `name`이 없으면 값이 수집되지 않습니다.

### Q4. `required` 외에 어떤 검증 규칙을 걸 수 있나?

`min`/`max`(길이), `type`(email/url 등 형식), `pattern`(정규식), `validator`(커스텀 함수) 등을 배열로 여러 개 조합할 수 있습니다.

### Q5. antd v3와 v4 Form의 가장 큰 차이는?

v3는 `Form.create()` HOC + `getFieldDecorator('name', { rules })(<Input/>)`로 필드를 등록하고, v4는 `Form.useForm()` + `<Form.Item name rules>` + `onFinish`를 씁니다. API가 달라 버전을 먼저 확인해야 합니다.

---

## 7. Day 5 완료 체크리스트

- [ ] `RequestForm`을 antd v4 `Form`(`Form.useForm`, `Form.Item name`, `onFinish`)으로 작성했다.
- [ ] 제목·요청자·부서·내용에 `required` 검증, 내용에 `min` 검증을 걸었다.
- [ ] `Form.Item` 안의 입력 요소에 `value`/`onChange`를 직접 주지 않았다.
- [ ] 우선순위에 `initialValues` 기본값("보통")을 지정했다.
- [ ] "신규 요청" 버튼으로 등록 Modal을 열고 `footer={null}`/`destroyOnClose`를 적용했다.
- [ ] 검증 통과 시 `handleCreate`가 불변 방식으로 목록에 추가한다.
- [ ] 등록 후 목록 반영·성공 메시지·폼 초기화가 동작한다.
- [ ] v3와 v4 Form 차이를 설명할 수 있다.
- [ ] 6장 체크포인트 5문항에 스스로 답할 수 있다.

---

## 8. 다음 단계 (Day 6 예고)

Day 6에서는 지금까지 하드코딩·메모리로만 다루던 데이터를 **실제 API**와 연결합니다. `json-server`로 mock API를 띄우고, `axios` 인스턴스(`api/client.js`)로 요청 목록·상세를 조회하며, `useEffect`로 화면 진입 시 데이터를 불러옵니다. loading/error 상태를 함께 관리하고, 오늘 만든 등록 폼의 `handleCreate`는 `POST` 요청으로 바뀝니다. "메모리에서 서버로" 넘어가는 단계입니다. (Day 1에서 webpack에 넣어 둔 `/api` 프록시와 `pathRewrite` 설정이 이때 진가를 발휘합니다.)
