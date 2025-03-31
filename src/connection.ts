export interface EventLayout {
    UID: string;
    COURSE: string;
    COURSETYPE: string[];
    STARTDATE: string;
    STARTTIME: string;
    ENDDATE: string;
    ENDTIME: string;
    LECTURER: string[];
    LOCATION: string;
}


export async function fetchCalendar(url: string): Promise<EventLayout[]> {
    const response = await fetch(url);
    const data = await response.text();
    
    const events = data.split("BEGIN:VEVENT").slice(1); // Skip the first non-event part
    return events.map(parseEvent);
}


function parseEvent(event: string): EventLayout {
    const layout: EventLayout = {
        UID: "",
        COURSE: "",
        COURSETYPE: [],
        STARTDATE: "",
        STARTTIME: "",
        ENDDATE: "",
        ENDTIME: "",
        LECTURER: [],
        LOCATION: "",
    };

    const lines = preprocessEventLines(event);

    lines.forEach((line) => {               
        if (line.startsWith("SUMMARY:")) {
            const { course, courseType } = parseSummary(line);
            layout.COURSE = course;
            layout.COURSETYPE = courseType;
        } else if (line.startsWith("DTSTART:")) {
            const { date, time } = parseDateTime(line.replace("DTSTART:", "").trim());
            layout.STARTDATE = date;
            layout.STARTTIME = time;
        } else if (line.startsWith("DTEND:")) {
            const { date, time } = parseDateTime(line.replace("DTEND:", "").trim());
            layout.ENDDATE = date;
            layout.ENDTIME = time;
        } else if (line.startsWith("LOCATION:")) {
            layout.LOCATION = line.replace("LOCATION:", "").trim();
        } else if (line.startsWith("DESCRIPTION:")) {
            layout.LECTURER = parseLecturers(line);
        } else if (line.startsWith("UID")){
            layout.UID = line.replace("UID:", "").replace("@timeedit.com", "").replaceAll("-", "").trim(); // Remove the domain part
        }
    });

    return layout;
}

function preprocessEventLines(event: string): string[] {
    return event
        .split("\r\n")
        .reduce((acc: string[], line: string) => {
            if (line.startsWith(" ") || line.startsWith("\t")) {
                acc[acc.length - 1] += line.trim(); // Join multi-line values
            } else {
                acc.push(line);
            }
            return acc;
        }, []);
}

function parseSummary(line: string): { course: string; courseType: string[] } {
    const summary = line
        .replace("SUMMARY:", "")
        .replace(/\\,/g, ",") // Replace escaped commas
        .replace(/\\n/g, " ") // Replace escaped newlines
        .trim();

    const [course = "", ...courseTypeParts] = summary.split(", ");

    if(!courseTypeParts[0]) courseTypeParts[0] = "Andere";


    return {
        course: course.trim(),
        courseType: courseTypeParts.join(",").split(",").map((type) => type.trim()),
    };
}

function parseDateTime(dateTime: string): { date: string; time: string } {
    const date = `${dateTime.substring(6, 8)}-${dateTime.substring(4, 6)}-${dateTime.substring(0, 4)}`;
    const time = parseTimeToBelgiumTime(dateTime);
    return { date, time };
}

function parseTimeToBelgiumTime(date: string): string {
    const year = parseInt(date.substring(0, 4), 10);
    const month = parseInt(date.substring(4, 6), 10) - 1; // Month is zero-based
    const day = parseInt(date.substring(6, 8), 10);
    const hour = parseInt(date.substring(9, 11), 10);
    const minute = parseInt(date.substring(11, 13), 10);

    const utcDate = new Date(Date.UTC(year, month, day, hour, minute));

    const options: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23", // Use 24-hour format
        timeZone: "Europe/Brussels",
    };

    return new Intl.DateTimeFormat("nl-BE", options).format(utcDate);
}

function parseLecturers(line: string): string[] {
    const description = line
        .replace("DESCRIPTION:", "")
        .replace(/\\,/g, ",") // Replace escaped commas
        .replace(/\\n/g, " ") // Replace escaped newlines
        .trim();

    const lecturerMatches = description.match(/Lector: ([^\\]+)/g);
    if (!lecturerMatches) return [];

    return lecturerMatches.map((lecturer, index) =>
        index === 0
            ? lecturer.replaceAll("Lector: ", "").replace(/ID \d+/, "").trim() // Clean the first lecturer
            : lecturer.trim()
    );
}