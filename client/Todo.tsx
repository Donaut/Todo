import { useState } from "react";

export interface Todo {
  id: string;
  content: string;
  checked: boolean;
}

export function Todo(props: { todo: Todo; onChange: (todo: Todo) => void; onDelete: (id: string) => void }) {
  const { todo, onChange, onDelete } = props;

  return (
    <div key={todo.id} className="d-flex align-items-center">
      <input type="checkbox" checked={todo.checked} onChange={(e) => onChange({ ...todo, checked: e.target.checked })} />
      <span style={{ marginLeft: "10px" }}>{todo.content}</span>
      <button type="button" style={{ marginLeft: "auto" }} className="btn btn-link" onClick={() => onDelete(todo.id)}>
        Delete
      </button>
    </div>
  );
}

export function TodoList(props: { todos: Todo[]; onChange: (todo: Todo) => void; onDelete: (id: string) => void }) {
  const { todos, onChange, onDelete } = props;
  return (
    <div className="">
      {todos.map((todo) => (
        <Todo key={todo.id} todo={todo} onChange={onChange} onDelete={onDelete} />
      ))}
    </div>
  );
}

export function TodoApp({ todos, onChange, onDelete, onAdd, hasMore, loadMore }: { todos: Todo[], onChange: (todo: Todo) => void, onDelete: (id: string) => void, onAdd: (content: string) => void, hasMore: boolean, loadMore: () => void  }) {
  const [content, setContent] = useState('');

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="card" style={{ width: "24rem", height: "30rem" }}>
        <div className="card-header">Todo</div>
        <div className="card-body overflow-auto" id="scrollableDiv">
          <TodoList todos={todos} onChange={onChange} onDelete={onDelete} />
          {
            hasMore ? <button className="btn btn-success" onClick={loadMore} type="button" id="button-addon2">+</button>
                    : null
          }
        </div>
        <div className="card-body d-block mt-auto" style={{ flex: "none" }}>
          <div className="input-group mb-3">
            <input type="text" className="form-control" value={content} onChange={(e) => {setContent(e.target.value)}} placeholder="Todo conent" aria-label="Todo content" aria-describedby="button-addon2"/>
            <button className="btn btn-success" disabled={content.length <= 0} onClick={() => onAdd(content)} type="button" id="button-addon2">+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Login({ login }: { login: () => void }) {
  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="card mx-auto mt-n1" style={{ width: "24rem" }}>
        <div className="card-header"></div>
        <div className="card-body">
          <h5 className="card-title">Login</h5>
          <p className="card-text">To get started you need to login.</p>
          <button onClick={login} type="button" className="btn btn-primary">
            Let's go!
          </button>
        </div>
      </div>
    </div>
  );
}
