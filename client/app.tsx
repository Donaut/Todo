import { useEffect, useState } from "react";
import { Login, Todo, TodoApp } from "./Todo";
import Keycloak from "keycloak-js";

//TODO: API URL VIA ENVIRONMENT
const keycloakurl = import.meta.env.VITE_KEYCLOAK_URL;
const realm = import.meta.env.VITE_REALM;
const clientid = import.meta.env.VITE_CLIENTID;

const keycloak = new Keycloak({
  url: keycloakurl,
  clientId: clientid,
  realm: realm,
});

const keycloakPromise = keycloak.init({ onLoad: "check-sso" });

export default function App() {

  const [isAuthenticated, setAuth] = useState(keycloak.authenticated);
  const [todos, setTodos] = useState(new Array<Todo>())
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    keycloakPromise
      .then(success => {
        setAuth(success);
        if(!success) return;
        fetchTodos({ page: page });
      })
  }, [])

  const fetchTodos = ({ page = 0 }) => fetch(`./api/todo?skip=${page}`, {
      method: 'GET',
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        'Authorization': 'Bearer ' + keycloak.token,
      },
    }).then(async res => {
    if(!res.ok) return console.error(`Failed to fetch todos. Server response: ${res.status}`, res);
    const resultTodos = await res.json() as Todo[];
    setHasMore(resultTodos.length == 50)
    setTodos([ ...todos, ...resultTodos ])
  })
  
  function onAdd(content: string) {
    fetch('./api/todo', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        'Authorization': 'Bearer ' + keycloak.token,
      },
      body: JSON.stringify({
        content: content
      })
    })
    .then(async res => {
      if(!res.ok) return console.error(`Failed to add todo. Server response: ${res.status}`, res);
      const body = await res.json() as { id: string };
      setTodos([ { id: body.id, content: content, checked: false }, ...todos ])
    })
  }

  function onChange(todo: Todo) {
    fetch('./api/todo/', {
      method: 'PUT',
      headers: {
        "Content-Type": "application/json",
        'Authorization': 'Bearer ' + keycloak.token,
      },
      body: JSON.stringify({
        id: todo.id,
        content: todo.content,
        checked: todo.checked
      })
    })
    .then(async res => {
      if(!res.ok) return console.error(`Failed to change todo. Server response: ${res.status}`, res);
      setTodos(todos.map(x => x.id === todo.id ? { id: todo.id, content: todo.content, checked: todo.checked } : x ))
    })
  }

  function onDelete(id: string) {
    fetch(`./api/todo/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + keycloak.token,
      },
    })
    .then(async res => {
      if(!res.ok) return console.error(`Failed to delete a todo. Server response: ${res.status}`, res);
      setTodos(todos.filter(todo => todo.id !== id))
    })
  }

  function loadMore() {
    fetchTodos({ page: page + 1 }).then(() => setPage(page + 1));
  }

  function login() {
    keycloak.login().then(() => setAuth(keycloak.authenticated || false))
  }

  if(isAuthenticated)
    return(<TodoApp todos={todos} onAdd={onAdd} onChange={onChange} onDelete={onDelete} hasMore={hasMore} loadMore={loadMore}></TodoApp>)
  else if(!isAuthenticated)
    return(<Login login={login}></Login>);
  else return(null);
}
