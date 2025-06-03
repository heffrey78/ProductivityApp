import { Task } from './database';

class WebStorageManager {
  private tasks: Task[] = [];
  private nextId = 1;

  async initializeDatabase(): Promise<void> {
    try {
      const stored = localStorage.getItem('productivity_tasks');
      if (stored) {
        this.tasks = JSON.parse(stored);
        this.nextId = Math.max(...this.tasks.map(t => t.id || 0), 0) + 1;
      }
      console.log('Web storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize web storage:', error);
      throw error;
    }
  }

  private saveToStorage(): void {
    localStorage.setItem('productivity_tasks', JSON.stringify(this.tasks));
  }

  async getAllTasks(): Promise<Task[]> {
    return [...this.tasks].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createTask(title: string, description?: string): Promise<Task> {
    const now = new Date().toISOString();
    const task: Task = {
      id: this.nextId++,
      title,
      description,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.push(task);
    this.saveToStorage();
    return task;
  }

  async updateTask(id: number, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
    const taskIndex = this.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const now = new Date().toISOString();
    this.tasks[taskIndex] = {
      ...this.tasks[taskIndex],
      ...updates,
      updatedAt: now,
    };
    this.saveToStorage();
  }

  async deleteTask(id: number): Promise<void> {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveToStorage();
  }

  async toggleTaskComplete(id: number): Promise<void> {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      await this.updateTask(id, { completed: !task.completed });
    }
  }
}

export const webStorageManager = new WebStorageManager();