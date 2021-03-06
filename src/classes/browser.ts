import { chromium, Browser, Page, BrowserContext } from "playwright";
import { CronJob } from "cron";
import loadedLastIndex from "@data/lastIndex.json";
import fs from "fs";

/**saves last opened lesson's index */
const saveCurrentIndex = (index: number) => {
  fs.open(__dirname + "/../data/lastIndex.json", "w", (_, file) => {
    fs.writeFileSync(file, JSON.stringify(index));
    fs.close(file, () => {});
  });
};

import { config } from "@data/config";

let sa = chromium.launch();

interface lesson {
  name: string;
}

//TODO CURRENT TIME UNDEFINED
class Engine {
  lessons: Array<Page>;
  engine: Browser;
  context: BrowserContext;
  set2X: boolean;
  simultaniousLessonCount: number;
  pages: Array<Page>;
  currentLessonIndex: number;
  loadLastIndex: boolean;
  headless: boolean;

  constructor() {
    this.pages = [];
    this.lessons = [];
    this.currentLessonIndex = 1; /**this number determines the lesson script will first start with */
    this.set2X = true; /**when true sets video playback rate to 2X */
    this.simultaniousLessonCount = 6;
    this.loadLastIndex = true;
    this.headless = false;
    if (this.loadLastIndex) {
      this.currentLessonIndex = loadedLastIndex;
    }
  }

  async newpage() {
    await this.pages[0].click(
      `:nth-match([class="view"], ${this.currentLessonIndex})`
    );
    this.currentLessonIndex++;
    saveCurrentIndex(this.currentLessonIndex + 1);
  }

  async build() {
    this.engine = await chromium.launch({ headless: this.headless });
    this.context = await this.engine.newContext();
    this.pages.push(await this.context.newPage());
    await this.pages[0].goto(config.url);
    await this.pages[0].waitForTimeout(1000);
    this.context.on("page", async (page) => {
      const url: string = page.url();
      //this page is perculus
      if (url.indexOf("perculus") > -1) {
        await this.lessonhandler(page);
      } else if (url.indexOf("microsoft") > -1) {
        await page.close();
        this.newpage();
      }
    });

    return this;
  }

  async login() {
    await this.pages[0].fill('[id="UserName"]', config.username);
    await this.pages[0].click('[id="btnLoginName"]');
    await this.pages[0].fill('[id="Password"]', config.password);
    await this.pages[0].click('[id="btnLoginPass"]');
  }

  async listLessons() {
    await this.pages[0].click("text=KL??N??K B??L??MLERE G??R????");
    await this.pages[0].click(
      '[class="coursename"] >> text=KL??N??K B??L??MLERE G??R????'
    );
    await this.pages[0].click('[id="list"]', { timeout: 200000 });
    for (let idx = 0; idx < this.simultaniousLessonCount; idx++) {
      await this.pages[0].click(
        `:nth-match([class="view"], ${this.currentLessonIndex})`
      );
      this.currentLessonIndex++;
      saveCurrentIndex(this.currentLessonIndex);
    }
  }

  async lessonhandler(page: Page) {
    page
      .click(`[class="btn btn-primary pointer "] >> text=tamam `, {
        timeout: 0,
      })
      .catch(() => {});

    let duration;

    const checkTime = new CronJob("*/5 * * * * *", async () => {
      const currentTime = await page
        .innerText(`[id="rec-current"]`, { timeout: 4999 })
        .catch((error) => {
          console.log(error);
        });
      console.log("time: " + currentTime + "/" + duration);
      if (duration === currentTime) {
        page.close();
        this.newpage();
        checkTime.stop();
      }
    });

    const getDuration = new CronJob("* * * * * *", async () => {
      const _duration = await page
        .innerText(`[id="rec-total"]`, { timeout: 999 })
        .catch(() => {
          return "00:00";
        });
      if (_duration !== "00:00") {
        duration = _duration;
        if (this.set2X) {
          page.selectOption(`[class="playbackrate"]`, { value: "2" });
        }
        checkTime.start();

        getDuration.stop();
      }
    });
    getDuration.start();
    page
      .innerText("text=Bu oturum hi?? ger??ekle??medi (e??itmen yok).")
      .then(() => {
        console.log("ge??ersiz ders");

        page.close();
        this.newpage();
        return;
      })
      .catch(() => {});
    page
      .innerText("text=Aktif oturum i??eri??i bulunmuyor.")
      .then(() => {
        console.log("ge??ersiz ders");

        page.close();
        this.newpage();
        return;
      })
      .catch(() => {});
  }
}

export { Engine };
