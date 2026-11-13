import { INTERVIEW_EVENT_TYPE, type Application } from '@todo/shared';
import { useApp } from '../../app/AppContext';
import { newEventSpan } from '../calendar/calendarModel';

/** "Add interview" and "Add to-do" for an application, and the Applications calendar they go on: shared by an application's page and its card on the board. */
export function useApplicationShortcuts() {
  const { calendars, eventTypes, openDialog } = useApp();
  const appsCalendar = calendars.find((c) => c.name.toLowerCase() === 'applications');
  const interviewTypeId = eventTypes.find((t) => t.name.toLowerCase() === INTERVIEW_EVENT_TYPE.toLowerCase())?.id ?? null;
  return {
    appsCalendar,
    addInterview: (a: Application) =>
      openDialog({ kind: 'event', mode: 'new', defaults: { ...newEventSpan(null, new Date()), title: `${a.company} interview`, typeId: interviewTypeId, applicationId: a.id, calendarId: appsCalendar?.id ?? null } }),
    addTodo: (a: Application) => openDialog({ kind: 'task', mode: 'new', defaults: { applicationId: a.id, calendarId: appsCalendar?.id ?? null } }),
  };
}
