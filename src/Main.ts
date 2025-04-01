import { Application, Router } from "https://deno.land/x/oak@v17.1.4/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { fetchCalendar } from 'Schedule/connection.ts';

const url12week: string = "https://cloud.timeedit.net/howest/web/student/ri65016QQf7Z59Q9fw4ounQ25t7Z0Z6u7YoycZvQQY7ZdYZX21jQ53C2Q22827t4m280k4725ojB10mj80767l63mo3k9AEC9Z7E0EA0493AC.ics";
const url1week: string = "https://cloud.timeedit.net/howest/web/student/ri65110tQv7ZQQQ9Y940QZm25o77wZd02uouZXZQfY7njY5y79k6j6Bl85Q0m2B61j92349842oC207ZF022Ft599kAm24D06D5A07E.ics";

const router = new Router();
const app = new Application();

router.get("/calendar", async (context) => {
    const calendar = await fetchCalendar(url1week);
    context.response.status = 200;
    context.response.body = calendar;
});
  
router.get("/calendar/12weeks", async (context) => {
    const calendar = await fetchCalendar(url12week);
    context.response.status = 200;
    context.response.body = calendar;
});

router.get("/calendar/:uid", async (context) => {
    const uid : string = context.params.uid;
    if (uid) {
        const calendar = await fetchCalendar(url12week);        
        for (const classData of calendar) {            
            if (classData.UID === uid) {
                context.response.status = 200;
                context.response.body = classData;
                return;
            }
        }

        context.response.status = 404;
        context.response.body = { error: "Class not found" };

    } else {
        context.response.status = 400;
        context.response.body = { error: "Invalid class ID" };
    }
});

router.get("/calendar/day/:day", async (context) => {
    const day : string = context.params.day;
    console.log(day);
    
    if (day) {
        const classesOfDay = [];
        const calendar = await fetchCalendar(url12week);
        for (const classData of calendar) {
            if(classData.STARTDATE === day) {
                classesOfDay.push(classData);
            }
        }
        
        if (classesOfDay.length > 0) {
            context.response.status = 200;
            context.response.body = classesOfDay;
        } else {
            context.response.status = 404;
            context.response.body = { error: "No classes found for this day" };
        }
    } else {
        context.response.status = 400;
        context.response.body = { error: "Invalid class Date" };
    }
});

router.get("/courses", async (context) => {
    const courses: string[] = [];
    const calendar = await fetchCalendar(url12week);
    for (const classData of calendar) {
        if (!courses.includes(classData.COURSE)) {
            courses.push(classData.COURSE);
        }
    }
    for (let i = 0; i < courses.length; i++) {
        if (courses[i]?.startsWith("Lesonderwerp") 
                || courses[i]?.startsWith("Andere")
                || courses[i]?.startsWith("Opleidingsraad")
        ){
            courses.splice(i, 1);
            i--;
        }
    }
    if(courses.length === 0) {
        context.response.status = 404;
        context.response.body = { error: "No courses found" };
        return;
    }

    context.response.status = 200;
    context.response.body = courses;
});

router.get("/courses/:course", async (context) => {
    const course : string = context.params.course;
    if (course) {
        const classesOfCourse = [];
        const calendar = await fetchCalendar(url12week);
        for (const classData of calendar) {
            if(classData.COURSE === course) {
                classesOfCourse.push(classData);
            }
        }
        
        if (classesOfCourse.length > 0) {
            context.response.status = 200;
            context.response.body = classesOfCourse;
        } else {
            context.response.status = 404;
            context.response.body = { error: "No classes found for this course" };
        }
    } else {
        context.response.status = 400;
        context.response.body = { error: "Invalid course name" };
    }
});


router.get("/openapi.yaml", (ctx) => {
    ctx.response.type = "text/yaml";
    ctx.response.body = `
openapi: 3.1.0
info:
  title: Class Schedule API
  version: 1.0.0
  description: API for fetching class schedules
paths:
  /calendar:
    get:
      summary: Get weekly schedule
      responses:
        200:
          description: Success
  /calendar/12weeks:
    get:
      summary: Get 12-week schedule
      responses:
        200:
          description: Success
  /calendar/{uid}:
    get:
      summary: Get class by UID
      parameters:
        - name: uid
          in: path
          required: true
          description: UID of the class
          schema:
            type: string
      responses:
        200:
          description: Success
        404:
          description: Class not found
  /calendar/day/{day}:
    get:
      summary: Get classes for a specific day
      parameters:
        - name: day
          in: path
          required: true
          description: Day to fetch classes for
          schema:
            type: string
      responses:
        200:
          description: Success
        404:
          description: No classes found for this day
  /courses:
    get:
      summary: Get all courses
      responses:
        200:
          description: Success
        404:
          description: No courses found
  /courses/{course}:
    get:
      summary: Get classes for a specific course
      parameters:
        - name: course
          in: path
          required: true
          description: Course to fetch classes for
          schema:
            type: string
      responses:
        200:
          description: Success
        404:
          description: No classes found for this course
    `;
});

router.get("/", (ctx) => {
    ctx.response.type = "text/html";
    ctx.response.body = `
      <!DOCTYPE html>
      <html>
        <head>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui.css">
        </head>
        <body>
          <div id="swagger-ui"></div>
            <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist/swagger-ui-bundle.js"></script>
          <script>
            SwaggerUIBundle({
              url: '/openapi.yaml',
              dom_id: '#swagger-ui'
            });
          </script>
        </body>
      </html>
    `;
  });
  

app.use(oakCors({
    origin: "*",
    methods: ["GET"]
}));

app.use(router.routes());
app.use(router.allowedMethods());

app.use((context) => {
    context.response.status = 404;
    context.response.body = { error: "Not Found" };
});

console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 });