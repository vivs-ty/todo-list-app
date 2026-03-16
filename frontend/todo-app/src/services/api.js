import axios from 'axios';

const AUTH_API_URL =
  process.env.REACT_APP_AUTH_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:8001';
const TASK_API_URL =
  process.env.REACT_APP_TASK_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:8002';
const TASK_CACHE_KEY = 'todo-app.cached-tasks.v1';

const readTaskCache = () => {
  try {
    const cache = localStorage.getItem(TASK_CACHE_KEY);
    if (!cache) {
      return [];
    }

    const parsed = JSON.parse(cache);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeTaskCache = (tasks) => {
  localStorage.setItem(TASK_CACHE_KEY, JSON.stringify(tasks));
};

const upsertCachedTask = (task) => {
  const taskId = String(task.id);
  const current = readTaskCache();
  const next = current.filter((item) => String(item.id) !== taskId);
  writeTaskCache([task, ...next]);
};

const removeCachedTask = (taskId) => {
  const next = readTaskCache().filter((item) => String(item.id) !== String(taskId));
  writeTaskCache(next);
};

const createLocalId = () => `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const pickTaskList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.tasks)) {
    return payload.tasks;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return null;
};

const sanitizeTaskPayload = (taskData) => ({
  title: taskData.title || '',
  description: taskData.description || '',
  completed: Boolean(taskData.completed),
});

const requestWithPathFallback = async (client, method, firstPath, secondPath, body) => {
  try {
    if (body !== undefined) {
      return await client[method](firstPath, body);
    }
    return await client[method](firstPath);
  } catch (error) {
    if (!secondPath || error.response?.status !== 404) {
      throw error;
    }

    if (body !== undefined) {
      return client[method](secondPath, body);
    }
    return client[method](secondPath);
  }
};

const authApi = axios.create({
  baseURL: AUTH_API_URL,
});

const taskApi = axios.create({
  baseURL: TASK_API_URL,
});

const withAuthHeader = (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

authApi.interceptors.request.use(withAuthHeader);
taskApi.interceptors.request.use(withAuthHeader);

export const registerUser = (userData) =>
  requestWithPathFallback(authApi, 'post', '/register', '/register/', userData);

export const loginUser = (userData) =>
  requestWithPathFallback(authApi, 'post', '/login', '/login/', userData);

export const getTasks = async () => {
  try {
    const response = await requestWithPathFallback(taskApi, 'get', '/tasks', '/tasks/');
    const taskList = pickTaskList(response.data);

    if (taskList) {
      writeTaskCache(taskList);
      return { data: taskList };
    }

    return { data: readTaskCache() };
  } catch {
    return { data: readTaskCache() };
  }
};

export const createTask = async (taskData) => {
  const payload = sanitizeTaskPayload(taskData);

  try {
    const response = await requestWithPathFallback(
      taskApi,
      'post',
      '/tasks',
      '/tasks/',
      payload
    );
    const createdTask = {
      ...taskData,
      ...(response.data || {}),
      id: response.data?.id || createLocalId(),
    };
    upsertCachedTask(createdTask);
    return { data: createdTask };
  } catch {
    const localTask = {
      ...taskData,
      id: createLocalId(),
    };
    upsertCachedTask(localTask);
    return { data: localTask };
  }
};

export const updateTask = async (taskId, taskData) => {
  const payload = sanitizeTaskPayload(taskData);

  try {
    const response = await requestWithPathFallback(
      taskApi,
      'put',
      `/tasks/${taskId}`,
      `/tasks/${taskId}/`,
      payload
    );
    const updatedTask = {
      ...taskData,
      ...(response.data || {}),
      id: taskId,
    };
    upsertCachedTask(updatedTask);
    return { data: updatedTask };
  } catch {
    const fallbackTask = {
      ...taskData,
      id: taskId,
    };
    upsertCachedTask(fallbackTask);
    return { data: fallbackTask };
  }
};

export const deleteTask = async (taskId) => {
  try {
    const response = await requestWithPathFallback(
      taskApi,
      'delete',
      `/tasks/${taskId}`,
      `/tasks/${taskId}/`
    );
    removeCachedTask(taskId);
    return response;
  } catch {
    removeCachedTask(taskId);
    return { data: { message: 'Deleted from local cache.' } };
  }
};

export default taskApi;
