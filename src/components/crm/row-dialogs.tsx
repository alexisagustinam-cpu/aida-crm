'use client'

import { MeetingDialog, TaskDialog } from './forms'

// Botones "Editar" de filas que se renderizan en el servidor.
type Option = { id: string; name: string }
export function TaskEditButton(props: { task: NonNullable<Parameters<typeof TaskDialog>[0]['task']>; clients: Option[]; projects: Option[] }) {
  return <TaskDialog {...props} trigger="Editar" triggerClassName="icon-action" />
}
export function MeetingEditButton(props: { meeting: NonNullable<Parameters<typeof MeetingDialog>[0]['meeting']>; clients: Option[] }) {
  return <MeetingDialog {...props} trigger="Editar" triggerClassName="icon-action" />
}
