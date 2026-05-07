import React, { useState, useRef, useEffect } from 'react'
import { Plus, X, Check, LogOut } from 'lucide-react'
import { supabase } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface Task {
  id: string
  text: string
  completed: boolean
  user_id: string
  created_at: string
}

const TaskWidget = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskText, setNewTaskText] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const widgetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      
      setPosition({
        x: deltaX,
        y: deltaY
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
    }
  }, [isDragging, dragStart])

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = widgetRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
    setIsDragging(true)
    e.preventDefault()
  }

  const fetchTasks = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('created_at', { ascending: true })
      .limit(3)

    if (error) {
      console.error('Error fetching tasks:', error)
      return
    }

    setTasks(data || [])
  }

  const addTask = async () => {
    if (!user || !newTaskText.trim()) return

    if (tasks.length >= 3) {
      toast.error('Maximum 3 tasks allowed', {
        description: 'Complete existing tasks to add new ones.'
      })
      return
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        text: newTaskText.trim(),
        user_id: user.id,
        completed: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding task:', error)
      toast.error('Failed to add task')
      return
    }

    setTasks([...tasks, data])
    setNewTaskText('')
    setIsAdding(false)
    toast.success('Task added')
  }

  const toggleTask = async (taskId: string, completed: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed })
      .eq('id', taskId)

    if (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
      return
    }

    setTasks(tasks.filter(task => task.id !== taskId))
    if (completed) {
      toast.success('Task completed')
    }
  }

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
      return
    }

    setTasks(tasks.filter(task => task.id !== taskId))
  }

  // Fetch tasks when user changes
  React.useEffect(() => {
    if (user) {
      fetchTasks()
    } else {
      setTasks([])
    }
  }, [user])

  if (!user) return null

  return (
    <div 
      ref={widgetRef}
      className={`fixed top-6 right-6 z-50 animate-fade-in ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isDragging ? 'none' : 'transform 0.2s ease-out'
      }}
      onMouseDown={handleMouseDown}
    >
            
      <div className="hidden lg:block glass rounded-2xl p-4 min-w-[280px] max-w-[320px] space-y-3 select-none">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] tracking-[0.35em] text-muted-foreground uppercase font-medium">
            Tasks
          </h3>
          {tasks.length < 3 && !isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-6 h-6 rounded-full glass flex items-center justify-center hover:bg-white/[0.08] transition-colors"
            >
              <Plus className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {isAdding && (
          <div className="space-y-2 animate-fade-in">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addTask()
                } else if (e.key === 'Escape') {
                  setIsAdding(false)
                  setNewTaskText('')
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Enter task..."
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.04] text-xs text-foreground placeholder:text-muted-foreground/40 focus-visible:border-white/20 focus-visible:ring-0 outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={addTask}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex-1 rounded-lg bg-white px-3 py-1.5 text-[10px] font-medium tracking-[0.3em] text-black transition-colors hover:bg-white/90"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAdding(false)
                  setNewTaskText('')
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] tracking-[0.3em] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 p-2 rounded-lg glass hover:bg-white/[0.04] transition-colors"
            >
              <button
                onClick={() => toggleTask(task.id, !task.completed)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded-full border border-white/20 flex items-center justify-center hover:border-white/40 transition-colors"
              >
                {task.completed && <Check className="w-2 h-2 text-foreground" />}
              </button>
              <span className="flex-1 text-xs text-foreground truncate">
                {task.text}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/[0.08] transition-colors"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ))}
          {tasks.length === 0 && !isAdding && (
            <p className="text-[10px] text-muted-foreground/50 text-center py-2">
              No active tasks
            </p>
          )}
        </div>

        {tasks.length > 0 && (
          <p className="text-[9px] text-muted-foreground/40 text-center">
            {tasks.length}/3 tasks
          </p>
        )}
      </div>
    </div>
  )
}

export default TaskWidget
