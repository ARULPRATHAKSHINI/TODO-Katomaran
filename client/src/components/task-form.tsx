// frontend/components/task-form.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTaskSchema } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { z } from "zod";

// Define the schema for the form.
const taskFormSchema = insertTaskSchema
  .omit({ ownerId: true }) // Omit ownerId as backend adds it
  .extend({
    // For dueDate, we expect a string from the form input.
    // If it's an empty string, transform it to null.
    // Otherwise, parse it as a Date object.
    dueDate: z.string() // Input type is string
      .optional()
      .nullable() // Allow null from empty input
      .transform((val) => {
        if (!val) return null; // If empty string or undefined, return null
        const date = new Date(val);
        return isNaN(date.getTime()) ? null : date; // Ensure valid Date, otherwise null
      }),
  });

// Infer the TypeScript type from the form schema.
type TaskFormData = z.infer<typeof taskFormSchema>;

// This type represents the data that the form *receives* as default values.
// It's crucial for react-hook-form's `defaultValues` prop.
interface TaskFormProps {
  onSubmit: (data: TaskFormData) => void;
  isLoading?: boolean;
  canEdit?: boolean; // Added this prop
  defaultValues?: Partial<TaskFormData>; // defaultValues must conform to TaskFormData
}

export default function TaskForm({ onSubmit, isLoading = false, defaultValues, canEdit = true }: TaskFormProps) {

  // Initialize react-hook-form.
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: null,
      priority: "medium",
      status: "pending",
      dueDate: null,
      ...defaultValues, // Overwrite with any provided defaultValues
    },
  });

  const handleSubmit = (data: TaskFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Task Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter task title..."
                  {...field}
                  disabled={!canEdit} // Apply disabled prop here
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter task description..."
                  rows={4}
                  className="resize-none"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={!canEdit} // Apply disabled prop here
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canEdit}> {/* Apply disabled prop here */}
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value instanceof Date
                      ? field.value.toISOString().split('T')[0]
                      : field.value || ''}
                    onChange={field.onChange}
                    disabled={!canEdit} // Apply disabled prop here
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!canEdit}> {/* Apply disabled prop here */}
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !canEdit}> {/* Disable submit button if not editable */}
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {defaultValues ? "Update Task" : "Create Task"}
          </Button>
        </div>
      </form>
    </Form>
  );
}