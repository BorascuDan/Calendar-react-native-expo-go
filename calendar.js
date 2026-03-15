import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

async function getDefaultCalendar() {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') throw new Error("Calendar permission not granted");

    if (Platform.OS === 'ios') {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      return defaultCalendar?.id ?? null;
    }

    if (Platform.OS === 'android') {
      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );

      const calendar = calendars.find(
        (cal) => cal.allowsModifications
      );

      return calendar?.id ?? null;
    }

  } catch (error) {
    console.error("Calendar error:", error);
    return null;
  }
}

export function createDefaultCalendarEvent(calendarId, eventDetails) {
  if (!calendarId) throw new Error("Callendar id missing");
  return Calendar.createEventAsync(calendarId, eventDetails)
}


function buildEventDetails({ date, start_time, title, description: notes, location = "Bucharest", timeZone = "Europe/Bucharest" }) {
  const startDateTimeString = `${date}T${start_time}:00`
  const startDate = new Date(startDateTimeString);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  return {
    title,
    startDate,
    endDate,
    notes,
    location,
    timeZone,
  };
}

export async function addDayToCalendar(dayDetails) {
  const { date, items } = dayDetails;

  try {
    const calendarId = await getDefaultCalendar();
    if (!calendarId) throw new Error(`Calendar id error: ${calendarId}`);

    const eventSet = await getExistingEventsSet(calendarId, date);

    const events = await Promise.all(
      items.reduce(
        (availableEvents, event) => {
          const eventDetails = buildEventDetails({ date, ...event })
          const key = buildEventKey({
            title: eventDetails?.title ?? "",
            location: eventDetails?.location ?? "",
            startDate: eventDetails?.startDate ?? "",
          });

          if (eventSet.has(key)) return availableEvents;
          eventSet.add(key);

          availableEvents.push(createDefaultCalendarEvent(calendarId, eventDetails));
          return availableEvents;
        }, []
      )
    )

    if (events.some(event => typeof event !== 'string')) {
      throw new Error("One or more events were not added");
    }
  } catch (error) {
    console.error('Added day to calendar error: ', error);
  }
}

async function getExistingEventsSet(calendarId, date) {
  const startOfDay = new Date(`${date}T00:00:00`);
  const endOfDay = new Date(`${date}T23:59:59`);

  const events = await Calendar.getEventsAsync(
    [calendarId],
    startOfDay,
    endOfDay
  );

  const eventSet = new Set();

  for (const event of events) {
    const key = buildEventKey({
      title: event?.title ?? "",
      location: event?.location ?? "",
      startDate: new Date(event.startDate) ?? "",
    });

    eventSet.add(key);
  }

  return eventSet;
}

function buildEventKey({ title, location, startDate }) {
  return `${title}|${location}|${startDate.getTime()}`;
}
