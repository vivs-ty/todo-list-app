import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getTasks, createTask, updateTask, deleteTask } from '../services/api';

const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const CATEGORY_OPTIONS = ['general', 'work', 'study', 'personal', 'health'];
const DAILY_SPARKS = [
  'Small progress compounds into major outcomes.',
  'If it takes less than two minutes, do it now.',
  'A clear list is a quiet mind.',
  'Protect your focus like it is your best asset.',
];

const defaultTaskForm = {
  title: '',
  description: '',
  priority: 'medium',
  category: 'general',
};

const normalizeTask = (task) => ({
  id: String(task.id),
  title: task.title || 'Untitled task',
  description: task.description || '',
  completed: Boolean(task.completed),
  priority: task.priority || 'medium',
  category: task.category || 'general',
  createdAt: task.createdAt || new Date().toISOString(),
});

const normalizeTaskList = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeTask);
  }
  if (Array.isArray(payload?.tasks)) {
    return payload.tasks.map(normalizeTask);
  }
  if (Array.isArray(payload?.data)) {
    return payload.data.map(normalizeTask);
  }
  return [];
};

const getErrorMessage = (error, fallbackMessage) => {
  if (error.response?.data?.detail) {
    return String(error.response.data.detail);
  }
  if (error.message) {
    return error.message;
  }
  return fallbackMessage;
};

const Tasks = ({ onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingTaskId, setEditingTaskId] = useState('');
  const [editingDraft, setEditingDraft] = useState(defaultTaskForm);
  const [sparkIndex, setSparkIndex] = useState(0);

  const loadTasks = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getTasks();
      setTasks(normalizeTaskList(response.data));
      setErrorMessage('');
    } catch (error) {
      if (error.response?.status === 401 && onLogout) {
        onLogout();
        return;
      }
      setErrorMessage(getErrorMessage(error, 'Could not load tasks.'));
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    const open = total - completed;
    const highPriority = tasks.filter(
      (task) => task.priority === 'high' && !task.completed
    ).length;

    return { total, completed, open, highPriority };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (statusFilter === 'open' && task.completed) {
          return false;
        }
        if (statusFilter === 'done' && !task.completed) {
          return false;
        }
        if (!searchTerm.trim()) {
          return true;
        }

        const query = searchTerm.trim().toLowerCase();
        return (
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.category.toLowerCase().includes(query)
        );
      })
      .sort((leftTask, rightTask) => {
        return new Date(rightTask.createdAt) - new Date(leftTask.createdAt);
      });
  }, [tasks, statusFilter, searchTerm]);

  const updateTaskForm = (event) => {
    const { name, value } = event.target;
    setTaskForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      setErrorMessage('Task title cannot be empty.');
      return;
    }

    setIsSaving(true);

    const draftTask = {
      ...taskForm,
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await createTask(draftTask);
      const createdTask = normalizeTask({
        ...draftTask,
        ...(response.data || {}),
      });

      setTasks((previousTasks) => [createdTask, ...previousTasks]);
      setTaskForm(defaultTaskForm);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Could not create task.'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTaskCompletion = async (task) => {
    const originalTask = task;
    const updatedTask = {
      ...task,
      completed: !task.completed,
    };

    setTasks((previousTasks) =>
      previousTasks.map((currentTask) =>
        currentTask.id === task.id ? updatedTask : currentTask
      )
    );

    try {
      await updateTask(task.id, updatedTask);
      setErrorMessage('');
    } catch (error) {
      setTasks((previousTasks) =>
        previousTasks.map((currentTask) =>
          currentTask.id === task.id ? originalTask : currentTask
        )
      );
      setErrorMessage(getErrorMessage(error, 'Could not update task status.'));
    }
  };

  const startEditingTask = (task) => {
    setEditingTaskId(task.id);
    setEditingDraft({
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category,
    });
  };

  const cancelEditing = () => {
    setEditingTaskId('');
    setEditingDraft(defaultTaskForm);
  };

  const saveEditedTask = async (task) => {
    if (!editingDraft.title.trim()) {
      setErrorMessage('Edited task title cannot be empty.');
      return;
    }

    const updatedTask = {
      ...task,
      ...editingDraft,
      title: editingDraft.title.trim(),
      description: editingDraft.description.trim(),
    };

    setTasks((previousTasks) =>
      previousTasks.map((currentTask) =>
        currentTask.id === task.id ? updatedTask : currentTask
      )
    );

    try {
      await updateTask(task.id, updatedTask);
      cancelEditing();
      setErrorMessage('');
    } catch (error) {
      setTasks((previousTasks) =>
        previousTasks.map((currentTask) =>
          currentTask.id === task.id ? task : currentTask
        )
      );
      setErrorMessage(getErrorMessage(error, 'Could not save task edits.'));
    }
  };

  const removeTask = async (taskId) => {
    const previousTasks = tasks;

    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));

    try {
      await deleteTask(taskId);
      setErrorMessage('');
    } catch (error) {
      setTasks(previousTasks);
      setErrorMessage(getErrorMessage(error, 'Could not delete task.'));
    }
  };

  const cycleSpark = () => {
    setSparkIndex((previousIndex) => (previousIndex + 1) % DAILY_SPARKS.length);
  };

  return (
    <div className="tasks-layout">
      <section className="composer-card">
        <div className="section-title-row">
          <h2>Task Composer</h2>
          <button className="chip-button" type="button" onClick={cycleSpark}>
            New spark
          </button>
        </div>
        <p className="spark-text">{DAILY_SPARKS[sparkIndex]}</p>

        <form className="task-form" onSubmit={handleCreateTask}>
          <label htmlFor="taskTitle">Title</label>
          <input
            id="taskTitle"
            name="title"
            value={taskForm.title}
            onChange={updateTaskForm}
            placeholder="Prepare sprint demo"
            maxLength={120}
          />

          <label htmlFor="taskDescription">Description</label>
          <textarea
            id="taskDescription"
            name="description"
            value={taskForm.description}
            onChange={updateTaskForm}
            rows={3}
            placeholder="Add details, blockers, or links"
            maxLength={320}
          />

          <div className="task-form-grid">
            <div>
              <label htmlFor="taskPriority">Priority</label>
              <select
                id="taskPriority"
                name="priority"
                value={taskForm.priority}
                onChange={updateTaskForm}
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option value={priority} key={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="taskCategory">Category</label>
              <select
                id="taskCategory"
                name="category"
                value={taskForm.category}
                onChange={updateTaskForm}
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Add task'}
          </button>
        </form>
      </section>

      <section className="board-card">
        <div className="section-title-row">
          <h2>Mission Board</h2>
          <button className="chip-button" type="button" onClick={loadTasks}>
            Refresh
          </button>
        </div>

        <div className="board-controls">
          <input
            aria-label="Search tasks"
            placeholder="Search by title, category, description"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <div className="status-filter-group" role="group" aria-label="Task status filter">
            <button
              className={statusFilter === 'all' ? 'filter-button active' : 'filter-button'}
              type="button"
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={statusFilter === 'open' ? 'filter-button active' : 'filter-button'}
              type="button"
              onClick={() => setStatusFilter('open')}
            >
              Open
            </button>
            <button
              className={statusFilter === 'done' ? 'filter-button active' : 'filter-button'}
              type="button"
              onClick={() => setStatusFilter('done')}
            >
              Done
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <article>
            <p>Total</p>
            <strong>{stats.total}</strong>
          </article>
          <article>
            <p>Open</p>
            <strong>{stats.open}</strong>
          </article>
          <article>
            <p>Done</p>
            <strong>{stats.completed}</strong>
          </article>
          <article>
            <p>High priority</p>
            <strong>{stats.highPriority}</strong>
          </article>
        </div>

        {errorMessage ? <p className="status-error">{errorMessage}</p> : null}

        {loading ? <p className="status-info">Loading tasks...</p> : null}

        {!loading && visibleTasks.length === 0 ? (
          <p className="status-info">No tasks yet. Add one to start your flow.</p>
        ) : null}

        <div className="task-list">
          {visibleTasks.map((task) => {
            const isEditing = task.id === editingTaskId;

            return (
              <article
                className={task.completed ? 'task-card is-complete' : 'task-card'}
                key={task.id}
              >
                {isEditing ? (
                  <div className="task-edit-grid">
                    <input
                      value={editingDraft.title}
                      onChange={(event) =>
                        setEditingDraft((previous) => ({
                          ...previous,
                          title: event.target.value,
                        }))
                      }
                    />
                    <textarea
                      rows={2}
                      value={editingDraft.description}
                      onChange={(event) =>
                        setEditingDraft((previous) => ({
                          ...previous,
                          description: event.target.value,
                        }))
                      }
                    />
                    <div className="task-form-grid">
                      <select
                        value={editingDraft.priority}
                        onChange={(event) =>
                          setEditingDraft((previous) => ({
                            ...previous,
                            priority: event.target.value,
                          }))
                        }
                      >
                        {PRIORITY_OPTIONS.map((priority) => (
                          <option value={priority} key={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>

                      <select
                        value={editingDraft.category}
                        onChange={(event) =>
                          setEditingDraft((previous) => ({
                            ...previous,
                            category: event.target.value,
                          }))
                        }
                      >
                        {CATEGORY_OPTIONS.map((category) => (
                          <option value={category} key={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="task-actions">
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => saveEditedTask(task)}
                      >
                        Save
                      </button>
                      <button className="ghost-button" type="button" onClick={cancelEditing}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="task-headline">
                      <h3>{task.title}</h3>
                      <button
                        className={task.completed ? 'complete-button done' : 'complete-button'}
                        type="button"
                        onClick={() => toggleTaskCompletion(task)}
                      >
                        {task.completed ? 'Done' : 'Mark done'}
                      </button>
                    </div>
                    {task.description ? <p className="task-desc">{task.description}</p> : null}
                    <div className="task-meta">
                      <span className={`pill priority-${task.priority}`}>{task.priority}</span>
                      <span className="pill pill-muted">{task.category}</span>
                    </div>
                    <div className="task-actions">
                      <button className="ghost-button" type="button" onClick={() => startEditingTask(task)}>
                        Edit
                      </button>
                      <button className="ghost-button danger" type="button" onClick={() => removeTask(task.id)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Tasks;
